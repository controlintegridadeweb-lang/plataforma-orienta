-- Indices opcionais para listagem/agregacao da fila de evidencias em escala.
create index if not exists evidences_response_submitted_idx on public.evidences (response_id, submitted_at desc);
create index if not exists evidence_validations_evidence_validated_idx on public.evidence_validations (evidence_id, validated_at desc);
