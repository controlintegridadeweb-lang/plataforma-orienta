import { ReportsShell } from "@/components/relatorios/reports-shell";
import { layout } from "@/lib/design-system";

export default function AnalistaRelatoriosPage() {
  return (
    <div className={layout.pageStack}>
      <ReportsShell mode="analyst" />
    </div>
  );
}
