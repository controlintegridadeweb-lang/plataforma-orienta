import { describe, expect, it, vi } from "vitest";
import { LibraryService, LibraryValidationError } from "./service";
import type { LibraryAxis } from "./types";

type RepoStub = {
  findAxis: ReturnType<typeof vi.fn>;
  findSection: ReturnType<typeof vi.fn>;
  findMetric: ReturnType<typeof vi.fn>;
  findRecommendation: ReturnType<typeof vi.fn>;
  findAction: ReturnType<typeof vi.fn>;
  updateItemStatus: ReturnType<typeof vi.fn>;
  findLatestVersion: ReturnType<typeof vi.fn>;
  closeVersion: ReturnType<typeof vi.fn>;
  insertItemVersion: ReturnType<typeof vi.fn>;
  listVersions: ReturnType<typeof vi.fn>;
};

function makeAxis(overrides: Partial<LibraryAxis> = {}): LibraryAxis {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    code: "GOV",
    name: "Governanca",
    description: null,
    ordem: 0,
    status: "draft",
    versionMajor: 0,
    versionMinor: 1,
    versionPatch: 0,
    version: "0.1.0",
    vigenteDe: null,
    vigenteAte: null,
    tags: [],
    createdBy: null,
    updatedBy: null,
    approvedBy: null,
    approvedAt: null,
    deprecatedBy: null,
    deprecatedAt: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

function buildService(initial: LibraryAxis, laterState?: Partial<LibraryAxis>) {
  const final = { ...initial, ...(laterState ?? {}) };
  const findAxis = vi
    .fn()
    .mockResolvedValueOnce(initial)
    .mockResolvedValue(final);
  const repo: RepoStub = {
    findAxis,
    findSection: vi.fn().mockResolvedValue(null),
    findMetric: vi.fn().mockResolvedValue(null),
    findRecommendation: vi.fn().mockResolvedValue(null),
    findAction: vi.fn().mockResolvedValue(null),
    updateItemStatus: vi.fn().mockResolvedValue(undefined),
    findLatestVersion: vi.fn().mockResolvedValue(null),
    closeVersion: vi.fn().mockResolvedValue(undefined),
    insertItemVersion: vi.fn().mockResolvedValue({
      id: "ver-1",
      itemType: "axis",
      itemId: initial.id,
      version: "0.1.0",
      versionMajor: 0,
      versionMinor: 1,
      versionPatch: 0,
      payload: {},
      hash: "hash",
      vigenteDe: "2025-01-02T00:00:00Z",
      vigenteAte: null,
      previousVersionId: null,
      publishedBy: null,
      publishedAt: "2025-01-02T00:00:00Z",
      deprecatedBy: null,
      deprecatedAt: null,
      createdAt: "2025-01-02T00:00:00Z",
    }),
    listVersions: vi.fn().mockResolvedValue([]),
  };
  const service = new LibraryService(repo as unknown as never);
  return { service, repo };
}

describe("LibraryService transitions", () => {
  it("submits a draft axis to review", async () => {
    const axis = makeAxis({ status: "draft" });
    const { service, repo } = buildService(axis, { status: "in_review" });
    const result = await service.submitForReview("axes", axis.id, {
      userId: "user-1",
    });
    expect(result.status).toBe("in_review");
    expect(repo.updateItemStatus).toHaveBeenCalled();
  });

  it("publishes a draft directly and records a version", async () => {
    const axis = makeAxis({ status: "draft" });
    const { service, repo } = buildService(axis, {
      status: "published",
      approvedBy: "user-1",
    });
    const result = await service.publish("axes", axis.id, { userId: "user-1" });
    expect(result.status).toBe("published");
    expect(repo.insertItemVersion).toHaveBeenCalled();
  });

  it("publishes from in_review and records a version", async () => {
    const axis = makeAxis({ status: "in_review" });
    const { service, repo } = buildService(axis, {
      status: "published",
      approvedBy: "user-1",
    });
    const result = await service.publish("axes", axis.id, { userId: "user-1" });
    expect(result.status).toBe("published");
    expect(repo.insertItemVersion).toHaveBeenCalled();
  });

  it("rejects invalid transition (archived -> published)", async () => {
    const axis = makeAxis({ status: "archived" });
    const { service } = buildService(axis);
    await expect(
      service.publish("axes", axis.id, { userId: "user-1" }),
    ).rejects.toBeInstanceOf(LibraryValidationError);
  });

  it("requires justification to deprecate", async () => {
    const axis = makeAxis({ status: "published" });
    const { service } = buildService(axis);
    await expect(
      service.deprecate("axes", axis.id, { userId: "user-1" }),
    ).rejects.toBeInstanceOf(LibraryValidationError);
  });
});

describe("LibraryService auto defaults on create", () => {
  it("auto-generates code and ordem for axis when missing", async () => {
    const createdAxis = {
      id: "22222222-2222-4222-8222-222222222222",
      code: "GOVERNAN",
      name: "Governanca",
      description: null,
      ordem: 5,
      status: "draft",
      versionMajor: 0,
      versionMinor: 1,
      versionPatch: 0,
      version: "0.1.0",
      vigenteDe: null,
      vigenteAte: null,
      tags: [],
      createdBy: null,
      updatedBy: null,
      approvedBy: null,
      approvedAt: null,
      deprecatedBy: null,
      deprecatedAt: null,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    };

    const createAxis = vi.fn().mockResolvedValue(createdAxis);
    const nextOrdemForAxes = vi.fn().mockResolvedValue(5);
    const isCodeTaken = vi.fn().mockResolvedValue(false);

    const repo = {
      createAxis,
      nextOrdemForAxes,
      isCodeTaken,
    };

    const service = new LibraryService(repo as unknown as never);
    const result = await service.create(
      "axes",
      { name: "Governanca" },
      { userId: "user-99" },
    );

    expect(nextOrdemForAxes).toHaveBeenCalledTimes(1);
    expect(isCodeTaken).toHaveBeenCalledWith("library_axes", "GOVERNAN");
    expect(createAxis).toHaveBeenCalledTimes(1);
    const [inputArg] = createAxis.mock.calls[0];
    expect(inputArg.code).toBe("GOVERNAN");
    expect(inputArg.ordem).toBe(5);
    expect(result.id).toBe(createdAxis.id);
  });

  it("suffixes generated code when base is already taken", async () => {
    const createAxis = vi.fn().mockResolvedValue({
      id: "x",
      code: "GOVERNAN-001",
      name: "Governanca",
      description: null,
      ordem: 0,
      status: "draft",
      versionMajor: 0,
      versionMinor: 1,
      versionPatch: 0,
      version: "0.1.0",
      vigenteDe: null,
      vigenteAte: null,
      tags: [],
      createdBy: null,
      updatedBy: null,
      approvedBy: null,
      approvedAt: null,
      deprecatedBy: null,
      deprecatedAt: null,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    });
    const nextOrdemForAxes = vi.fn().mockResolvedValue(0);
    const isCodeTaken = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false);

    const repo = { createAxis, nextOrdemForAxes, isCodeTaken };
    const service = new LibraryService(repo as unknown as never);
    await service.create("axes", { name: "Governanca" });

    expect(isCodeTaken).toHaveBeenCalledTimes(2);
    const [inputArg] = createAxis.mock.calls[0];
    expect(inputArg.code).toBe("GOVERNAN-001");
  });
});
