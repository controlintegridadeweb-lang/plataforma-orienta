"use client";



import { useEffect, useState } from "react";

import { FileText } from "lucide-react";

import { EntityHistoryTimeline } from "@/components/workflow/entity-history-timeline";

import {

  fetchAdminRecPlanTimelineEvents,

  type AdminRecPlanTimelineEvent,

} from "@/components/workflow/admin-rec-plan-timeline-shared";



type Props = {

  recommendationId: string;

  planId: string | null;

  generationDate?: string | null;

};



export function AdminRecommendationTimeline({

  recommendationId,

  planId,

  generationDate,

}: Props) {

  const [events, setEvents] = useState<AdminRecPlanTimelineEvent[] | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);



  useEffect(() => {

    let cancelled = false;

    async function load() {

      setLoading(true);

      setError(null);

      try {

        const merged = await fetchAdminRecPlanTimelineEvents({

          recommendationId,

          planId,

          generation: generationDate

            ? {

                ts: generationDate,

                description: "Criada pelo motor FAMI a partir das respostas e evidências.",

              }

            : null,

        });

        if (!cancelled) setEvents(merged);

      } catch (e: unknown) {

        if (!cancelled)

          setError(e instanceof Error ? e.message : "Falha ao carregar histórico.");

      } finally {

        if (!cancelled) setLoading(false);

      }

    }

    void load();

    return () => {

      cancelled = true;

    };

  }, [recommendationId, planId, generationDate]);



  if (loading) {

    return <p className="text-xs text-slate-500">Carregando histórico…</p>;

  }

  if (error) {

    return <p className="text-xs text-rose-600">{error}</p>;

  }

  if (!events || events.length === 0) {

    return (

      <p className="text-xs text-slate-500">

        <FileText className="mr-1 inline h-3 w-3" aria-hidden />

        Sem eventos registrados ainda.

      </p>

    );

  }



  return <EntityHistoryTimeline events={events} />;

}

