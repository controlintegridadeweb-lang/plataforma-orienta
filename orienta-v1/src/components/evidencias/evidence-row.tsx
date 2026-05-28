"use client";

import { ExternalLink } from "lucide-react";
import type { EvidenceListItem } from "@/lib/evidences/admin-service";
import { normalizeWorkbenchText } from "@/lib/evidences/normalize-workbench-text";
import { typography } from "@/lib/design-system";
import { formSurface } from "@/lib/form-surface";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "./status-badge";

type Props = {
  item: EvidenceListItem;
  zebraEven: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: () => void;
  selectId: string;
};

export function EvidenceRow({
  item,
  zebraEven,
  selected,
  onToggleSelect,
  onOpen,
  selectId,
}: Props) {
  const titleText = normalizeWorkbenchText(item.title);
  const zebraClass = zebraEven ? "bg-white" : "bg-slate-50/55";

  return (
    <tr className={`${formSurface.table.row} ${zebraClass} hover:bg-slate-50/90`}>
      <td className={`${formSurface.table.cell} w-10 pl-4 sm:pl-5`}>
        <Checkbox
          id={selectId}
          checked={selected}
          onChange={() => onToggleSelect(item.id)}
          aria-label={`Selecionar evidencia ${titleText}`}
        />
      </td>
      <td className={`${formSurface.table.cell} min-w-0 text-slate-800`}>
        <p className="truncate font-medium text-slate-900" title={item.formName}>
          {item.formName}
        </p>
        <p className={`${typography.meta} tabular-nums`} title={`Versao ${item.formVersion}`}>
          v{item.formVersion}
        </p>
      </td>
      <td className={`${formSurface.table.cell} min-w-0`}>
        <p className="line-clamp-2 text-sm text-slate-800" title={item.questionPrompt}>
          {item.questionPrompt}
        </p>
      </td>
      <td className={`${formSurface.table.cell} min-w-0`}>
        <p className="truncate text-sm font-medium text-slate-900" title={item.organizationName}>
          {item.organizationName}
        </p>
      </td>
      <td className={`${formSurface.table.cell} whitespace-nowrap text-xs tabular-nums text-slate-600`}>
        {new Date(item.submittedAt).toLocaleDateString("pt-BR")}
        <span className={`block text-2xs font-normal text-slate-400`}>
          {new Date(item.submittedAt).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </td>
      <td className={`${formSurface.table.cell} align-middle`}>
        <div className="flex min-h-8 items-center">
          <StatusBadge status={item.currentStatus} />
        </div>
      </td>
      <td className={`${formSurface.table.cell} min-w-0`}>
        <p className="line-clamp-2 text-sm font-medium text-slate-900" title={titleText || undefined}>
          {titleText}
        </p>
        <div className="mt-1 flex min-h-5 flex-wrap items-center gap-2 text-micro">
          {item.externalLink ? (
            <a
              href={item.externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1 truncate text-sky-700 hover:underline"
              title={item.externalLink}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden /> Link
            </a>
          ) : item.storagePath ? (
            <span className="truncate text-slate-500" title={item.storagePath}>
              arquivo
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </div>
      </td>
      <td className={`${formSurface.table.cell} pr-4 text-right sm:pr-5`}>
        <button
          type="button"
          onClick={onOpen}
          className={formSurface.secondaryButtonSm}
        >
          Detalhes
        </button>
      </td>
    </tr>
  );
}
