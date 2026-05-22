import { NewFormCard } from "@/components/formulario/new-form-card";
import { NewFormShell } from "@/components/formulario/new-form-shell";

export default function AdminNewFormPage() {
  return (
    <NewFormShell backHref="/admin/formularios">
      <NewFormCard />
    </NewFormShell>
  );
}
