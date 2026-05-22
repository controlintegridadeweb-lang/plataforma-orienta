"use client";

import { useState, useTransition } from "react";
import type { AppRole } from "@/lib/auth/current-user";
import { roleLabels } from "@/lib/config/navigation";
import type { OrganizationOption } from "@/lib/organizations/options";
import type { ListedUserRow } from "@/lib/admin/users-service";
import { LoadingButton } from "@/components/ui/loading";
import { describeError, isNextRedirectError, notify } from "@/lib/notify";
import { removeUserAction, resetPasswordAction, saveUserProfileAction } from "./actions";
import { formSurface } from "@/lib/form-surface";

const cellClass = "px-3 py-3 align-top text-sm";
const headerCellClass =
  "px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500";

const fieldClass = `max-w-[240px] min-w-0 ${formSurface.input}`;

const saveButtonClass =
  "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClass =
  "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

const dangerButtonClass =
  "rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60";

const EDITABLE_ROLES: AppRole[] = ["analyst", "respondent"];

export function UserRowGridHeader() {
  return (
    <div className="grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_1.6fr] items-center bg-slate-50/80">
      <div className={headerCellClass}>Nome</div>
      <div className={headerCellClass}>E-mail</div>
      <div className={headerCellClass}>Organização</div>
      <div className={headerCellClass}>Perfil</div>
      <div className={headerCellClass}>Criado em</div>
      <div className={`${headerCellClass} text-right`}>Ações</div>
    </div>
  );
}

export function ReadonlyAdminRow({
  user,
  orgName,
}: {
  user: ListedUserRow;
  orgName: string | null;
}) {
  return (
    <div className="grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_1.6fr] items-start border-t border-slate-100 transition-colors hover:bg-slate-50/80">
      <div className={`${cellClass} font-medium text-slate-900`}>{user.fullName ?? "—"}</div>
      <div className={`${cellClass} text-slate-600`}>{user.email ?? "—"}</div>
      <div className={`${cellClass} text-slate-700`}>{orgName ?? "—"}</div>
      <div className={`${cellClass} text-slate-700`}>{roleLabels[user.role]}</div>
      <div className={`${cellClass} whitespace-nowrap text-slate-600`}>
        {new Date(user.createdAt).toLocaleDateString("pt-BR")}
      </div>
      <div className={`${cellClass} text-right`}>
        <div className="flex flex-col items-end gap-1 text-xs text-slate-400">
          <span>Somente leitura</span>
          <span aria-hidden>—</span>
        </div>
      </div>
    </div>
  );
}

export function EditableUserRow({
  user,
  organizations,
}: {
  user: ListedUserRow;
  organizations: OrganizationOption[];
}) {
  const [fullName, setFullName] = useState(user.fullName ?? "");
  const [organizationId, setOrganizationId] = useState(user.organizationId ?? "");
  const [role, setRole] = useState<AppRole>(user.role);
  const [isSaving, startSave] = useTransition();
  const [isResetting, startReset] = useTransition();
  const [isRemoving, startRemove] = useTransition();

  const anyPending = isSaving || isResetting || isRemoving;
  const canRemove = EDITABLE_ROLES.includes(user.role);

  function buildBaseFormData() {
    const fd = new FormData();
    fd.set("userId", user.userId);
    return fd;
  }

  function handleSave() {
    if (anyPending) return;
    if (!organizationId) {
      notify.warning("Selecione uma organização antes de salvar.");
      return;
    }
    const fd = buildBaseFormData();
    fd.set("fullName", fullName.trim());
    fd.set("role", role);
    fd.set("organizationId", organizationId);

    startSave(async () => {
      try {
        await saveUserProfileAction(fd);
        notify.success("Alterações salvas.");
      } catch (error) {
        if (isNextRedirectError(error)) throw error;
        notify.error(describeError(error, "Falha ao salvar."));
      }
    });
  }

  function handleReset() {
    if (anyPending) return;
    startReset(async () => {
      try {
        await resetPasswordAction(buildBaseFormData());
      } catch (error) {
        if (isNextRedirectError(error)) throw error;
        notify.error(describeError(error, "Falha ao gerar link."));
      }
    });
  }

  function handleRemove() {
    if (anyPending) return;
    if (!canRemove) return;
    const ok = window.confirm(
      `Remover ${user.email ?? "este usuário"}? Esta ação é irreversível.`,
    );
    if (!ok) return;
    startRemove(async () => {
      try {
        await removeUserAction(buildBaseFormData());
      } catch (error) {
        if (isNextRedirectError(error)) throw error;
        notify.error(describeError(error, "Falha ao remover."));
      }
    });
  }

  return (
    <div className="grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_1.6fr] items-start border-t border-slate-100 transition-colors hover:bg-slate-50/80">
      <div className={cellClass}>
        <input
          name="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nome completo"
          className={fieldClass}
          disabled={anyPending}
          aria-label="Nome completo"
        />
      </div>

      <div className={`${cellClass} text-slate-600`}>{user.email ?? "—"}</div>

      <div className={cellClass}>
        <select
          name="organizationId"
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
          className={fieldClass}
          disabled={anyPending}
          required
          aria-label="Organização"
        >
          <option value="" disabled>
            Selecione…
          </option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      <div className={cellClass}>
        <select
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as AppRole)}
          className={fieldClass}
          disabled={anyPending}
          aria-label="Perfil"
        >
          <option value="analyst">{roleLabels.analyst}</option>
          <option value="respondent">{roleLabels.respondent}</option>
        </select>
      </div>

      <div className={`${cellClass} whitespace-nowrap text-slate-600`}>
        {new Date(user.createdAt).toLocaleDateString("pt-BR")}
      </div>

      <div className={`${cellClass} text-right`}>
        <div className="flex flex-col items-end gap-2">
          <LoadingButton
            onClick={handleSave}
            disabled={anyPending && !isSaving}
            pending={isSaving}
            pendingLabel="Salvando…"
            className={saveButtonClass}
          >
            Salvar
          </LoadingButton>
          <LoadingButton
            onClick={handleReset}
            disabled={anyPending && !isResetting}
            pending={isResetting}
            pendingLabel="Gerando link…"
            className={secondaryButtonClass}
          >
            Resetar senha
          </LoadingButton>
          {canRemove ? (
            <LoadingButton
              onClick={handleRemove}
              disabled={anyPending && !isRemoving}
              pending={isRemoving}
              pendingLabel="Removendo…"
              className={dangerButtonClass}
            >
              Remover
            </LoadingButton>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </div>
      </div>
    </div>
  );
}
