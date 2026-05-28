import { Info } from "lucide-react";

/** Explica quando a pontuação FAMI oficial fica disponível para o respondente. */
export function RespondentFamiScoreNotice() {
  return (
    <div
      className="flex gap-3 rounded-xl border border-sky-200/90 bg-sky-50/80 px-4 py-3.5 text-sm text-sky-950"
      role="note"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden />
      <div className="space-y-1">
        <p className="font-semibold text-sky-900">Quando a pontuação aparece?</p>
        <p className="leading-relaxed text-sky-900/90">
          Enquanto o formulário estiver aberto, respostas e evidências atualizam as{" "}
          <strong className="font-semibold">recomendações</strong>. A{" "}
          <strong className="font-semibold">pontuação FAMI oficial</strong> é calculada quando a
          administração <strong className="font-semibold">encerra o ciclo</strong> do formulário.
        </p>
      </div>
    </div>
  );
}
