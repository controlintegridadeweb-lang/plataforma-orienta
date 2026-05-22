import { RespondentReportsShell } from "@/components/respondente-relatorios/respondent-reports-shell";
import { layout } from "@/lib/design-system";

export default function RespondenteRelatoriosPage() {
  return (
    <div className={layout.pageStack}>
      <RespondentReportsShell />
    </div>
  );
}
