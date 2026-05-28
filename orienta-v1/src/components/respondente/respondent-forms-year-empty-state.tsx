import { ClipboardList } from "lucide-react";
import { formSurface } from "@/lib/layout/form-surface";

type Props = {
  year: number;
  loading?: boolean;
};

export function RespondentFormsYearEmptyState({ year, loading = false }: Props) {
  return (
    <div className={formSurface.empty.container}>
      <span className={formSurface.empty.iconWrap}>
        <ClipboardList className="h-5 w-5" aria-hidden />
      </span>
      <p className={formSurface.empty.title}>
        {loading ? "Carregando formulários…" : `Nenhum formulário no ano ${year}`}
      </p>
      <p className={formSurface.empty.description}>
        {loading
          ? "Buscando progresso do período selecionado."
          : "Neste ano não há formulários com atividade registrada nem formulários novos publicados no período. Tente outro ano no filtro acima."}
      </p>
    </div>
  );
}
