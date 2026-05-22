import Link from "next/link";
import { PageCardShell } from "@/components/ui/page-card-shell";
import { ProfileContentLayout } from "@/components/profile/profile-content-layout";
import { NewFormCard } from "@/components/formulario/new-form-card";

export default function AdminNewFormPage() {
  return (
    <PageCardShell
      title="Novo formulário"
      description="Crie um novo formulário em rascunho. Você poderá adicionar perguntas em seguida."
      illustration
      headerPrefix={
        <Link
          href="/admin/formularios"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 transition hover:text-brand-800"
        >
          Voltar para a lista
        </Link>
      }
    >
      <ProfileContentLayout>
        <NewFormCard />
      </ProfileContentLayout>
    </PageCardShell>
  );
}
