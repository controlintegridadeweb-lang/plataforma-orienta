"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  EvidenceValidationEntry,
  EvidencesListResult,
} from "@/lib/evidences/admin-service";
import { listEvidences, type ListEvidencesFilters } from "@/lib/evidences/client";

type ListParams = ListEvidencesFilters & { offset: number };

export function useEvidencesList(params: ListParams) {
  const [result, setResult] = useState<EvidencesListResult | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listEvidences({
        formId: params.formId,
        organizationId: params.organizationId,
        status: params.status,
        search: params.search,
        from: params.from,
        to: params.to,
        limit: params.limit,
        offset: params.offset,
      });
      setResult(res);
    } finally {
      setLoading(false);
    }
  }, [
    params.formId,
    params.organizationId,
    params.status,
    params.search,
    params.from,
    params.to,
    params.limit,
    params.offset,
  ]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const updateAfterValidation = useCallback(
    (evidenceId: string, entry: EvidenceValidationEntry) => {
      setResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((it) =>
            it.id === evidenceId
              ? {
                  ...it,
                  currentStatus: entry.status,
                  lastValidatedAt: entry.validatedAt,
                  lastJustification: entry.justification,
                  history: [entry, ...it.history],
                }
              : it,
          ),
        };
      });
    },
    [],
  );

  return { result, loading, refetch: fetchList, updateAfterValidation };
}
