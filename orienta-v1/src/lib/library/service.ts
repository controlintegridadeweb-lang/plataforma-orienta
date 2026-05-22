import { createHash } from "crypto";
import { LibraryRepository, type LibraryActorContext } from "./repository";
import {
  libraryCatalogInputSchemaByEntity,
  type LibraryCatalogInputByEntity,
} from "./schemas";
import { logInfo } from "@/lib/observability/logger";
import { getLibraryAudit, type LibraryAuditEvent } from "./audit";
import {
  LIBRARY_ITEM_TYPE_BY_ENTITY,
  type LibraryCatalogEntity,
  type LibraryCatalogItem,
  type LibraryCatalogSnapshot,
  type LibraryItemStatus,
  type LibraryItemType,
  type LibrarySnapshot,
} from "./types";

export type ValidationIssue = { path: string; message: string };

export type LibraryServiceContext = LibraryActorContext;

const TABLE_BY_ENTITY: Record<
  LibraryCatalogEntity,
  | "library_axes"
  | "library_sections"
  | "library_recommendations"
  | "library_actions"
> = {
  axes: "library_axes",
  sections: "library_sections",
  recommendations: "library_recommendations",
  actions: "library_actions",
};

const CODE_PREFIX_BY_ENTITY: Record<LibraryCatalogEntity, string> = {
  axes: "EIX",
  sections: "SEC",
  recommendations: "REC",
  actions: "PLA",
};

const LIBRARY_TABLE_BY_ENTITY: Record<
  LibraryCatalogEntity,
  | "library_axes"
  | "library_sections"
  | "library_recommendations"
  | "library_actions"
> = {
  axes: "library_axes",
  sections: "library_sections",
  recommendations: "library_recommendations",
  actions: "library_actions",
};

function slugifyForCode(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  return normalized.slice(0, 8);
}

function padNumber(value: number, width = 3): string {
  return value.toString().padStart(width, "0");
}

export class LibraryValidationError extends Error {
  issues: ValidationIssue[];
  constructor(issues: ValidationIssue[]) {
    super("Dados invalidos para a biblioteca geral.");
    this.name = "LibraryValidationError";
    this.issues = issues;
  }
}

export class LibraryConflictError extends Error {
  constructor(message = "Registro conflita com um existente (codigo duplicado ou referencia invalida).") {
    super(message);
    this.name = "LibraryConflictError";
  }
}

function flattenIssues(error: unknown): ValidationIssue[] {
  if (
    error &&
    typeof error === "object" &&
    "issues" in error &&
    Array.isArray((error as { issues: unknown }).issues)
  ) {
    return (error as { issues: Array<{ path: (string | number)[]; message: string }> }).issues.map(
      (issue) => ({
        path: issue.path.join(".") || "_",
        message: issue.message,
      }),
    );
  }
  return [{ path: "_", message: "Dados invalidos." }];
}

function parseCatalog<E extends LibraryCatalogEntity>(
  entity: E,
  payload: unknown,
): LibraryCatalogInputByEntity[E] {
  const schema = libraryCatalogInputSchemaByEntity[entity];
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new LibraryValidationError(flattenIssues(result.error));
  }
  return result.data as LibraryCatalogInputByEntity[E];
}

function interpretSupabaseError(error: unknown): never {
  const code = (error as { code?: string } | null)?.code;
  const message = (error as { message?: string } | null)?.message ?? "Erro inesperado no banco.";
  if (code === "23505") {
    throw new LibraryConflictError("Codigo ja cadastrado para este tipo de item.");
  }
  if (code === "23503") {
    throw new LibraryConflictError("Referencia invalida: o eixo selecionado nao existe.");
  }
  if (code === "23514") {
    throw new LibraryValidationError([
      { path: "_", message: "Valor fora do intervalo permitido." },
    ]);
  }
  throw new Error(message);
}

function deterministicHash(payload: Record<string, unknown>): string {
  const keys = Object.keys(payload).sort();
  const normalized: Record<string, unknown> = {};
  for (const key of keys) {
    normalized[key] = payload[key];
  }
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

type TransitionOptions = {
  justification?: string | null;
  reviewerUserId?: string | null;
};

const VALID_TRANSITIONS: Record<LibraryItemStatus, LibraryItemStatus[]> = {
  draft: ["in_review", "published", "archived"],
  in_review: ["draft", "published"],
  published: ["deprecated"],
  deprecated: ["archived"],
  archived: [],
};

function assertTransition(from: LibraryItemStatus, to: LibraryItemStatus) {
  if (!VALID_TRANSITIONS[from].includes(to)) {
    throw new LibraryValidationError([
      {
        path: "status",
        message: `Transicao invalida: ${from} -> ${to}.`,
      },
    ]);
  }
}

export class LibraryService {
  private repo: LibraryRepository;

  constructor(repo?: LibraryRepository) {
    this.repo = repo ?? new LibraryRepository();
  }

  /** Biblioteca Geral (admin): eixos, secoes e planos de acao (modelo). */
  snapshotCatalog(): Promise<LibraryCatalogSnapshot> {
    return this.repo.snapshotCatalog();
  }

  /** Snapshot completo incluindo tabelas legado `library_recommendations` / `library_actions`. */
  snapshot(): Promise<LibrarySnapshot> {
    return this.repo.snapshot();
  }

  private async resolveAutoCode<E extends LibraryCatalogEntity>(
    entity: E,
    input: LibraryCatalogInputByEntity[E],
  ): Promise<string> {
    const table = LIBRARY_TABLE_BY_ENTITY[entity];
    let base: string;

    if (entity === "axes") {
      const axisInput = input as LibraryCatalogInputByEntity["axes"];
      base = slugifyForCode(axisInput.name) || CODE_PREFIX_BY_ENTITY.axes;
    } else if (entity === "sections") {
      const sectionInput = input as LibraryCatalogInputByEntity["sections"];
      const axis = await this.repo.findAxis(sectionInput.axisId);
      const axisPrefix = axis?.code ? axis.code.toUpperCase() : CODE_PREFIX_BY_ENTITY.sections;
      base = axisPrefix;
    } else if (entity === "recommendations") {
      const recInput = input as LibraryCatalogInputByEntity["recommendations"];
      base = slugifyForCode(recInput.title) || CODE_PREFIX_BY_ENTITY.recommendations;
    } else {
      const actionInput = input as LibraryCatalogInputByEntity["actions"];
      base = slugifyForCode(actionInput.title) || CODE_PREFIX_BY_ENTITY.actions;
    }

    const directCandidate = base;
    if (entity !== "sections" && !(await this.repo.isCodeTaken(table, directCandidate))) {
      return directCandidate;
    }

    for (let i = 1; i < 1000; i += 1) {
      const candidate = `${base}-${padNumber(i)}`;
      const taken = await this.repo.isCodeTaken(table, candidate);
      if (!taken) return candidate;
    }

    return `${base}-${Date.now()}`;
  }

  private async resolveAutoOrdem<E extends LibraryCatalogEntity>(
    entity: E,
    input: LibraryCatalogInputByEntity[E],
  ): Promise<number | undefined> {
    if (entity === "axes") {
      return this.repo.nextOrdemForAxes();
    }
    if (entity === "sections") {
      const sectionInput = input as LibraryCatalogInputByEntity["sections"];
      return this.repo.nextOrdemForSectionsByAxis(sectionInput.axisId);
    }
    return undefined;
  }

  private async applyAutoDefaults<E extends LibraryCatalogEntity>(
    entity: E,
    input: LibraryCatalogInputByEntity[E],
  ): Promise<LibraryCatalogInputByEntity[E]> {
    const filled: Record<string, unknown> = { ...(input as unknown as Record<string, unknown>) };

    if (!filled.code || typeof filled.code !== "string" || filled.code.trim().length === 0) {
      filled.code = await this.resolveAutoCode(entity, input);
    }

    if ((entity === "axes" || entity === "sections") && (filled.ordem === undefined || filled.ordem === null)) {
      filled.ordem = await this.resolveAutoOrdem(entity, input);
    }

    return filled as unknown as LibraryCatalogInputByEntity[E];
  }

  async create<E extends LibraryCatalogEntity>(
    entity: E,
    payload: unknown,
    context: LibraryServiceContext = {},
  ): Promise<LibraryCatalogItem> {
    const parsedInput = parseCatalog(entity, payload);
    const input = await this.applyAutoDefaults(entity, parsedInput);
    try {
      let item: LibraryCatalogItem;
      switch (entity) {
        case "axes":
          item = await this.repo.createAxis(input as LibraryCatalogInputByEntity["axes"], context);
          break;
        case "sections":
          item = await this.repo.createSection(
            input as LibraryCatalogInputByEntity["sections"],
            context,
          );
          break;
        case "recommendations":
          item = await this.repo.createRecommendation(
            input as LibraryCatalogInputByEntity["recommendations"],
            context,
          );
          break;
        case "actions":
          item = await this.repo.createAction(
            input as LibraryCatalogInputByEntity["actions"],
            context,
          );
          break;
        default:
          throw new Error(`Entidade nao suportada: ${entity}`);
      }
      logInfo("library.item.created", {
        entity,
        itemId: item.id,
        actorUserId: context.userId ?? null,
      });
      void getLibraryAudit().record({
        action: "created",
        entity,
        itemType: LIBRARY_ITEM_TYPE_BY_ENTITY[entity],
        itemId: item.id,
        actorUserId: context.userId ?? null,
        toStatus: item.status,
        toVersion: item.version,
      } satisfies LibraryAuditEvent);
      return item;
    } catch (error) {
      if (error instanceof LibraryValidationError || error instanceof LibraryConflictError) {
        throw error;
      }
      interpretSupabaseError(error);
    }
  }

  async update<E extends LibraryCatalogEntity>(
    entity: E,
    id: string,
    payload: unknown,
    context: LibraryServiceContext = {},
  ): Promise<LibraryCatalogItem> {
    const parsedInput = parseCatalog(entity, payload);
    const current = await this.loadItem(entity, id);
    const preserved: Record<string, unknown> = {
      ...(parsedInput as unknown as Record<string, unknown>),
    };

    if (!preserved.code || typeof preserved.code !== "string" || preserved.code.trim().length === 0) {
      preserved.code = current.code;
    } else if (preserved.code !== current.code) {
      preserved.code = current.code;
    }

    if ((entity === "axes" || entity === "sections") && (preserved.ordem === undefined || preserved.ordem === null)) {
      preserved.ordem = (current as { ordem: number }).ordem ?? 0;
    }

    const input = preserved as unknown as LibraryCatalogInputByEntity[E];
    try {
      let item: LibraryCatalogItem;
      switch (entity) {
        case "axes":
          item = await this.repo.updateAxis(id, input as LibraryCatalogInputByEntity["axes"], context);
          break;
        case "sections":
          item = await this.repo.updateSection(
            id,
            input as LibraryCatalogInputByEntity["sections"],
            context,
          );
          break;
        case "recommendations":
          item = await this.repo.updateRecommendation(
            id,
            input as LibraryCatalogInputByEntity["recommendations"],
            context,
          );
          break;
        case "actions":
          item = await this.repo.updateAction(
            id,
            input as LibraryCatalogInputByEntity["actions"],
            context,
          );
          break;
        default:
          throw new Error(`Entidade nao suportada: ${entity}`);
      }
      logInfo("library.item.updated", {
        entity,
        itemId: item.id,
        actorUserId: context.userId ?? null,
      });
      return item;
    } catch (error) {
      if (error instanceof LibraryValidationError || error instanceof LibraryConflictError) {
        throw error;
      }
      interpretSupabaseError(error);
    }
  }

  async remove(
    entity: LibraryCatalogEntity,
    id: string,
    context: LibraryServiceContext = {},
  ): Promise<void> {
    try {
      switch (entity) {
        case "axes":
          await this.repo.deleteAxis(id);
          break;
        case "sections":
          await this.repo.deleteSection(id);
          break;
        case "recommendations":
          await this.repo.deleteRecommendation(id);
          break;
        case "actions":
          await this.repo.deleteAction(id);
          break;
      }
      logInfo("library.item.deleted", {
        entity,
        itemId: id,
        actorUserId: context.userId ?? null,
      });
    } catch (error) {
      interpretSupabaseError(error);
    }
  }

  private async loadItem(entity: LibraryCatalogEntity, id: string): Promise<LibraryCatalogItem> {
    let item: LibraryCatalogItem | null = null;
    switch (entity) {
      case "axes":
        item = await this.repo.findAxis(id);
        break;
      case "sections":
        item = await this.repo.findSection(id);
        break;
      case "recommendations":
        item = await this.repo.findRecommendation(id);
        break;
      case "actions":
        item = await this.repo.findAction(id);
        break;
    }
    if (!item) {
      throw new LibraryValidationError([
        { path: "id", message: "Item nao encontrado." },
      ]);
    }
    return item;
  }

  async submitForReview(
    entity: LibraryCatalogEntity,
    id: string,
    context: LibraryServiceContext & { justification?: string | null } = {},
  ): Promise<LibraryCatalogItem> {
    const item = await this.loadItem(entity, id);
    assertTransition(item.status, "in_review");
    await this.repo.updateItemStatus(TABLE_BY_ENTITY[entity] as never, id, {
      status: "in_review",
      updated_by: context.userId ?? null,
    });
    logInfo("library.item.submitted_to_review", {
      entity,
      itemId: id,
      actorUserId: context.userId ?? null,
      justification: context.justification ?? null,
    });
    void getLibraryAudit().record({
      action: "submitted_to_review",
      entity,
      itemType: LIBRARY_ITEM_TYPE_BY_ENTITY[entity],
      itemId: id,
      actorUserId: context.userId ?? null,
      fromStatus: item.status,
      toStatus: "in_review",
      justification: context.justification ?? null,
    });
    return this.loadItem(entity, id);
  }

  async returnReview(
    entity: LibraryCatalogEntity,
    id: string,
    context: LibraryServiceContext & { justification?: string | null } = {},
  ): Promise<LibraryCatalogItem> {
    const item = await this.loadItem(entity, id);
    assertTransition(item.status, "draft");
    await this.repo.updateItemStatus(TABLE_BY_ENTITY[entity] as never, id, {
      status: "draft",
      updated_by: context.userId ?? null,
    });
    logInfo("library.item.review_returned", {
      entity,
      itemId: id,
      actorUserId: context.userId ?? null,
      justification: context.justification ?? null,
    });
    void getLibraryAudit().record({
      action: "review_returned",
      entity,
      itemType: LIBRARY_ITEM_TYPE_BY_ENTITY[entity],
      itemId: id,
      actorUserId: context.userId ?? null,
      fromStatus: item.status,
      toStatus: "draft",
      justification: context.justification ?? null,
    });
    return this.loadItem(entity, id);
  }

  async publish(
    entity: LibraryCatalogEntity,
    id: string,
    context: LibraryServiceContext & TransitionOptions = {},
  ): Promise<LibraryCatalogItem> {
    const current = await this.loadItem(entity, id);
    assertTransition(current.status, "published");

    const justification = context.justification?.trim() ?? null;
    const now = new Date().toISOString();
    await this.repo.updateItemStatus(TABLE_BY_ENTITY[entity] as never, id, {
      status: "published",
      approved_by: context.reviewerUserId ?? context.userId ?? null,
      approved_at: now,
      vigente_de: now,
      updated_by: context.userId ?? null,
    });

    const published = await this.loadItem(entity, id);
    const itemType = LIBRARY_ITEM_TYPE_BY_ENTITY[entity];
    const payload = published as unknown as Record<string, unknown>;
    const hash = deterministicHash(payload);

    const previous = await this.repo.findLatestVersion(itemType, id);
    if (previous) {
      await this.repo.closeVersion(previous.id, context.userId ?? null);
    }

    await this.repo.insertItemVersion({
      itemType,
      itemId: id,
      version: published.version,
      versionMajor: published.versionMajor,
      versionMinor: published.versionMinor,
      versionPatch: published.versionPatch,
      payload,
      hash,
      vigenteDe: now,
      previousVersionId: previous?.id ?? null,
      publishedBy: context.userId ?? null,
    });

    logInfo("library.item.published", {
      entity,
      itemId: id,
      version: published.version,
      actorUserId: context.userId ?? null,
      justification: context.justification,
    });
    void getLibraryAudit().record({
      action: "published",
      entity,
      itemType,
      itemId: id,
      actorUserId: context.userId ?? null,
      fromStatus: current.status,
      toStatus: "published",
      fromVersion: previous ? previous.version : null,
      toVersion: published.version,
      justification,
      hash,
    });
    return published;
  }

  async deprecate(
    entity: LibraryCatalogEntity,
    id: string,
    context: LibraryServiceContext & TransitionOptions = {},
  ): Promise<LibraryCatalogItem> {
    const item = await this.loadItem(entity, id);
    assertTransition(item.status, "deprecated");
    if (!context.justification || context.justification.trim().length < 5) {
      throw new LibraryValidationError([
        { path: "justification", message: "Justificativa de depreciacao obrigatoria." },
      ]);
    }
    const now = new Date().toISOString();
    await this.repo.updateItemStatus(TABLE_BY_ENTITY[entity] as never, id, {
      status: "deprecated",
      deprecated_by: context.userId ?? null,
      deprecated_at: now,
      vigente_ate: now,
      updated_by: context.userId ?? null,
    });
    logInfo("library.item.deprecated", {
      entity,
      itemId: id,
      actorUserId: context.userId ?? null,
      justification: context.justification,
    });
    void getLibraryAudit().record({
      action: "deprecated",
      entity,
      itemType: LIBRARY_ITEM_TYPE_BY_ENTITY[entity],
      itemId: id,
      actorUserId: context.userId ?? null,
      fromStatus: item.status,
      toStatus: "deprecated",
      fromVersion: item.version,
      toVersion: item.version,
      justification: context.justification,
    });
    return this.loadItem(entity, id);
  }

  async archive(
    entity: LibraryCatalogEntity,
    id: string,
    context: LibraryServiceContext & { justification?: string | null } = {},
  ): Promise<LibraryCatalogItem> {
    const item = await this.loadItem(entity, id);
    assertTransition(item.status, "archived");
    await this.repo.updateItemStatus(TABLE_BY_ENTITY[entity] as never, id, {
      status: "archived",
      updated_by: context.userId ?? null,
    });
    logInfo("library.item.archived", {
      entity,
      itemId: id,
      actorUserId: context.userId ?? null,
      justification: context.justification ?? null,
    });
    void getLibraryAudit().record({
      action: "archived",
      entity,
      itemType: LIBRARY_ITEM_TYPE_BY_ENTITY[entity],
      itemId: id,
      actorUserId: context.userId ?? null,
      fromStatus: item.status,
      toStatus: "archived",
      justification: context.justification ?? null,
    });
    return this.loadItem(entity, id);
  }

  async listVersions(entity: LibraryCatalogEntity, id: string) {
    const itemType: LibraryItemType = LIBRARY_ITEM_TYPE_BY_ENTITY[entity];
    return this.repo.listVersions(itemType, id);
  }
}
