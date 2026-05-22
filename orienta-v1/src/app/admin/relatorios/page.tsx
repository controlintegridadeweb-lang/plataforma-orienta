import { ReportsShell } from "@/components/relatorios/reports-shell";
import { layout } from "@/lib/design-system";

export default function AdminRelatoriosPage() {
  return (
    <div className={layout.pageStack}>
      <ReportsShell mode="admin" />
    </div>
  );
}
