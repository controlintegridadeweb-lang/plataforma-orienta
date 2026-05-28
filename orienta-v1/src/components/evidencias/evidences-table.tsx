"use client";

import type { EvidenceListItem } from "@/lib/evidences/admin-service";
import { formSurface } from "@/lib/layout/form-surface";
import { Checkbox } from "@/components/ui/checkbox";
import { EvidenceRow } from "./evidence-row";

type Props = {
  items: EvidenceListItem[];
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAllPage: () => void;
  allPageSelected: boolean;
  onOpenDetail: (item: EvidenceListItem) => void;
};

export function EvidencesTable({
  items,
  selected,
  onToggleSelect,
  onToggleAllPage,
  allPageSelected,
  onOpenDetail,
}: Props) {
  return (
    <div className={`hidden md:block ${formSurface.table.wrapper}`}>
      <table className={`${formSurface.table.table} table-fixed`}>
        <caption className="sr-only">
          Lista de evidencias submetidas, com selecao para exportacao e acao de detalhes.
        </caption>
        <colgroup>
          <col className="w-10" />
          <col className="w-11/100" />
          <col className="w-11/50" />
          <col className="w-13/100" />
          <col className="w-38" />
          <col className="w-42" />
          <col className="min-w-48" />
          <col className="w-28" />
        </colgroup>
        <thead className={formSurface.table.head}>
          <tr className="hover:bg-transparent">
            <th
              scope="col"
              className={`${formSurface.table.headCell} w-10 align-middle pl-4 sm:pl-5`}
            >
              <Checkbox
                id="ev-select-all"
                checked={allPageSelected && items.length > 0}
                onChange={onToggleAllPage}
                aria-label="Selecionar todas nesta pagina"
              />
            </th>
            <th scope="col" className={formSurface.table.headCell}>
              Formulario
            </th>
            <th scope="col" className={formSurface.table.headCell}>
              Pergunta
            </th>
            <th scope="col" className={formSurface.table.headCell}>
              Organizacao
            </th>
            <th scope="col" className={formSurface.table.headCell}>
              Enviada em
            </th>
            <th scope="col" className={formSurface.table.headCell}>
              Status
            </th>
            <th scope="col" className={formSurface.table.headCell}>
              Evidencia
            </th>
            <th
              scope="col"
              className={`${formSurface.table.headCell} align-middle pr-4 text-right sm:pr-5`}
            >
              Acoes
            </th>
          </tr>
        </thead>
        <tbody className={formSurface.table.body}>
          {items.map((item, index) => (
            <EvidenceRow
              key={item.id}
              item={item}
              zebraEven={index % 2 === 0}
              selected={selected.has(item.id)}
              onToggleSelect={onToggleSelect}
              onOpen={() => onOpenDetail(item)}
              selectId={`ev-sel-${item.id}`}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
