import { NewFormCard } from "@/components/formulario/new-form-card";
import { NewFormShell } from "@/components/formulario/new-form-shell";

export default function AnalistaNewFormPage() {
  return (
    <NewFormShell backHref="/analista/formularios">
      <NewFormCard
        cancelHref="/analista/formularios"
        afterCreatePath="/analista/formularios"
      />
    </NewFormShell>
  );
}
