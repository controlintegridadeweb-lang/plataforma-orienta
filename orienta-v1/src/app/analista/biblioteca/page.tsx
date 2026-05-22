import { BibliotecaShell } from "@/components/biblioteca/biblioteca-shell";
import { SectionHeader } from "@/components/ui/section-header";
import { layout } from "@/lib/design-system";
import { formSurface } from "@/lib/form-surface";
import { LibraryService } from "@/lib/library/service";
import { logWarn } from "@/lib/observability/logger";
import type { LibraryCatalogSnapshot } from "@/lib/library/types";

const EMPTY_SNAPSHOT: LibraryCatalogSnapshot = {
  axes: [],
  sections: [],
  recommendations: [],
  actions: [],
};

async function loadSnapshot(): Promise<{ snapshot: LibraryCatalogSnapshot; error: string | null }> {
  try {
    const service = new LibraryService();
    const snapshot = await service.snapshotCatalog();
    return { snapshot, error: null };
  } catch (error) {
    logWarn("Failed to load biblioteca snapshot", error, {
      route: "/analista/biblioteca",
    });
    return {
      snapshot: EMPTY_SNAPSHOT,
      error:
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar a biblioteca geral.",
    };
  }
}

export default async function AnalistaBibliotecaPage() {
  const { snapshot, error } = await loadSnapshot();

  return (
    <div className={layout.pageStack}>
      <SectionHeader
        kicker="Catálogo corporativo"
        title="Biblioteca Geral"
        description="Modelos reutilizáveis. O texto por cenário fica em Formulários → Vínculos."
      />
      {error ? <div className={formSurface.messageError}>{error}</div> : null}
      <BibliotecaShell initial={snapshot} />
    </div>
  );
}
