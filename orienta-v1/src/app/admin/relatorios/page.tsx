import { ReportsShell } from "@/components/relatorios/reports-shell";
import { layout } from "@/lib/layout/design-system";

export default function AdminRelatoriosPage() {
  return (
    <div className={layout.pageStack}>
      <ReportsShell />
    </div>
  );
}
