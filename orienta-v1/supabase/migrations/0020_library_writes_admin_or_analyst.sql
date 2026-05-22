-- Estende as policies de escrita da Biblioteca Geral e do binding de formularios para
-- aceitar tanto 'admin' quanto 'analyst', alinhando com a decisao de roles & permissions
-- ('analyst' = operacao ponta a ponta, exceto governanca de usuarios/exclusao definitiva).
--
-- Mantem-se admin-only:
--   - library_effectiveness_snapshots (snapshots oficiais)
--   - recommendation_exceptions decide admin (decisao de excecoes)

-- ============================================================
-- 0002_biblioteca_geral.sql
-- ============================================================

drop policy if exists "library_axes write admin" on library_axes;
create policy "library_axes write admin or analyst"
on library_axes for all
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
)
with check (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
);

drop policy if exists "library_sections write admin" on library_sections;
create policy "library_sections write admin or analyst"
on library_sections for all
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
)
with check (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
);

drop policy if exists "library_metrics write admin" on library_metrics;
create policy "library_metrics write admin or analyst"
on library_metrics for all
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
)
with check (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
);

drop policy if exists "library_recommendations write admin" on library_recommendations;
create policy "library_recommendations write admin or analyst"
on library_recommendations for all
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
)
with check (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
);

drop policy if exists "library_actions write admin" on library_actions;
create policy "library_actions write admin or analyst"
on library_actions for all
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
)
with check (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
);

-- ============================================================
-- 0003_biblioteca_geral_extensao.sql
-- ============================================================

drop policy if exists "library_recommendation_actions write admin" on library_recommendation_actions;
create policy "library_recommendation_actions write admin or analyst"
on library_recommendation_actions for all
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
)
with check (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
);

drop policy if exists "library_item_versions insert admin" on library_item_versions;
create policy "library_item_versions insert admin or analyst"
on library_item_versions for insert
to authenticated
with check (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
);

drop policy if exists "library_vocabulary_tags write admin" on library_vocabulary_tags;
create policy "library_vocabulary_tags write admin or analyst"
on library_vocabulary_tags for all
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
)
with check (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
);

-- ============================================================
-- 0004_question_library_binding.sql
-- ============================================================

drop policy if exists "question_library_binding write admin" on question_library_binding;
create policy "question_library_binding write admin or analyst"
on question_library_binding for all
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
)
with check (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
);

drop policy if exists "form_question_library_snapshot insert admin" on form_question_library_snapshot;
create policy "form_question_library_snapshot insert admin or analyst"
on form_question_library_snapshot for insert
to authenticated
with check (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
);
