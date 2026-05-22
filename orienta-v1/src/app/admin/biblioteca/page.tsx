import { BibliotecaShell } from "@/components/biblioteca/biblioteca-shell";
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
      route: "/admin/biblioteca",
    });
    return {
      snapshot: EMPTY_SNAPSHOT,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a biblioteca geral.",
    };
  }
}

export default async function AdminBibliotecaPage() {
  const { snapshot, error } = await loadSnapshot();

  return <BibliotecaShell initial={snapshot} layout="admin" error={error} />;
}
