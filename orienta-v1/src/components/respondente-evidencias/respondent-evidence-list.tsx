"use client";

import type { RespondentEvidenceItem } from "@/lib/evidences/respondent-service";
import { formSurface } from "@/lib/layout/form-surface";
import { RespondentEvidenceCard } from "./respondent-evidence-card";

type Props = {
  items: RespondentEvidenceItem[];
  onOpenDetail: (item: RespondentEvidenceItem) => void;
};

export function RespondentEvidenceList({ items, onOpenDetail }: Props) {
  return (
    <section
      className="space-y-3"
      aria-labelledby="respondent-evidence-list-heading"
    >
      <h3
        id="respondent-evidence-list-heading"
        className={formSurface.sectionKicker}
      >
        Histórico da listagem
      </h3>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <RespondentEvidenceCard item={item} onOpenDetail={onOpenDetail} />
          </li>
        ))}
      </ul>
    </section>
  );
}
