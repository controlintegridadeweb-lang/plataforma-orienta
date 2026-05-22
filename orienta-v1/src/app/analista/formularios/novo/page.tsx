import Link from "next/link";
import { PageCardShell } from "@/components/ui/page-card-shell";
import { ProfileContentLayout } from "@/components/profile/profile-content-layout";
import { NewFormCard } from "@/components/formulario/new-form-card";

export default function AnalistaNewFormPage() {
  return (
    <PageCardShell
      title="Novo formulário"
      description="Crie um formulário em rascunho — o mesmo fluxo do administrador. Depois adicione perguntas, vínculos e publique."
      illustration
      headerPrefix={
        <Link
          href="/analista/formularios"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 transition hover:text-brand-800"
        >
          Voltar para a lista
        </Link>
      }
    >
      <ProfileContentLayout>
        <NewFormCard cancelHref="/analista/formularios" afterCreatePath="/analista/formularios" />
      </ProfileContentLayout>
    </PageCardShell>
  );
}
