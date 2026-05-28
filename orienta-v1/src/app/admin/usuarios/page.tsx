import { Users } from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { requireRole } from "@/lib/auth/current-user";
import { listUsersForAdmin } from "@/lib/admin/users-service";
import { getOrganizationOptions } from "@/lib/organizations/options";
import { firstSearchParam } from "@/lib/admin/search-params";
import { layout } from "@/lib/design-system";
import { formSurface } from "@/lib/form-surface";
import { EditableUserRow, ReadonlyAdminRow, UserRowGridHeader } from "./user-row";

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const recoveryLink = firstSearchParam(sp, "recovery") ?? "";
  const recoveryNotice = firstSearchParam(sp, "recoveryNotice") ?? "";

  const [users, organizations] = await Promise.all([listUsersForAdmin(), getOrganizationOptions()]);
  const orgNameById = new Map(organizations.map((o) => [o.id, o.name]));

  return (
    <div className={`mx-auto max-w-6xl ${layout.panelStack}`}>
      <SectionHeader
        title="Usuários"
        description="Consulte perfis, papéis e organização vinculada. Novos acessos são criados pelo fluxo de cadastro ou administração do Supabase Auth — esta tela não envia convites. Você pode editar respondentes, gerar link de recuperação de senha ou removê-los."
      />

      {recoveryLink ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          <p className="font-semibold">Link de recuperação de senha</p>
          <p className="mt-1 break-all font-mono text-xs">{recoveryLink}</p>
          <p className="mt-2 text-xs text-sky-900">
            Copie e envie manualmente ao usuário se o e-mail automático não estiver configurado (SMTP).
          </p>
        </div>
      ) : null}

      {recoveryNotice === "no_link" ? (
        <div className={formSurface.messageWarning}>
          Não foi possível gerar link de recuperação (verifique e-mail da conta ou permissões).
        </div>
      ) : null}

      {organizations.length === 0 ? (
        <div className={formSurface.messageWarning}>
          Nenhuma organização cadastrada — o seletor abaixo ficará vazio. Verifique se a migration de seed
          de organizações foi aplicada (<code>supabase/migrations/0015_organizations_rnh_seed.sql</code>).
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100">
        <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50/90 to-white px-6 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <Users className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900">Cadastro de usuários</h2>
              <p className="text-sm text-slate-600">
                Lista de contas com acesso à plataforma. Administradores aparecem só para consulta — edição
                restrita a respondentes.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8 sm:py-7">
          {users.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500">
              Nenhum usuário cadastrado.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <div className="min-w-240">
                <UserRowGridHeader />
                {users.map((u) =>
                  u.role === "admin" ? (
                    <ReadonlyAdminRow
                      key={u.userId}
                      user={u}
                      orgName={u.organizationId ? (orgNameById.get(u.organizationId) ?? null) : null}
                    />
                  ) : (
                    <EditableUserRow key={u.userId} user={u} organizations={organizations} />
                  ),
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
