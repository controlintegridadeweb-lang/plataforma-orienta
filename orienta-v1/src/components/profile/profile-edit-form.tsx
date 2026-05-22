"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Building2, CheckCircle2, KeyRound, Mail, User } from "lucide-react";
import { Spinner } from "@/components/ui/loading";
import { PanelSection } from "@/components/ui/panel-section";
import { ProfileContentLayout } from "@/components/profile/profile-content-layout";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { CurrentUser } from "@/lib/auth/current-user";
import { formSurface } from "@/lib/form-surface";

const fieldClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand/25";

export function ProfileEditForm({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [fullName, setFullName] = useState(user.fullName ?? "");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/respondent/profile", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      profile?: { fullName: string | null; preferences?: Record<string, unknown> };
    };
    setSaving(false);
    if (!res.ok) {
      setMessage({ type: "error", text: data.error ?? "Não foi possível salvar. Tente de novo." });
      return;
    }
    if (data.profile) {
      setFullName(data.profile.fullName ?? "");
    }
    setMessage({ type: "success", text: "Alterações salvas com sucesso." });
    router.refresh();
  }

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    const email = user.email;
    if (!email) {
      setPasswordMessage({
        type: "error",
        text: "Não foi possível identificar o e-mail da conta. Contate o administrador.",
      });
      return;
    }

    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "A nova senha deve ter no mínimo 8 caracteres." });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordMessage({ type: "error", text: "As senhas novas não conferem." });
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordMessage({ type: "error", text: "A nova senha deve ser diferente da atual." });
      return;
    }

    setSavingPassword(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (signInError) {
      setSavingPassword(false);
      setPasswordMessage({ type: "error", text: "Senha atual incorreta." });
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (updateError) {
      setPasswordMessage({
        type: "error",
        text: "Não foi possível atualizar a senha. Tente de novo.",
      });
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setPasswordMessage({ type: "success", text: "Senha atualizada com sucesso." });
    router.refresh();
  }

  return (
    <ProfileContentLayout>
      <PanelSection
        title="Dados da conta"
        description="O nome aparece no menu lateral. E-mail e organização vêm do cadastro administrativo."
        icon={User}
        variant="card"
      >
        <form onSubmit={onSubmit} className="space-y-6">
          {message ? (
            <div
              role="alert"
              className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50/90 text-emerald-950"
                  : "border-rose-200 bg-rose-50 text-rose-900"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
              ) : null}
              <span>{message.text}</span>
            </div>
          ) : null}

          <dl className="space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Mail className="h-3.5 w-3.5" aria-hidden />
                E-mail
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{user.email ?? "—"}</dd>
              <p className="mt-1 text-xs text-slate-500">
                Para alterar o e-mail, fale com o administrador da plataforma.
              </p>
            </div>

            {user.organizationName || user.organizationId ? (
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Building2 className="h-3.5 w-3.5" aria-hidden />
                  Organização
                </dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">
                  {user.organizationName ?? "—"}
                </dd>
              </div>
            ) : null}
          </dl>

          <div>
            <label htmlFor="fullName" className="text-sm font-medium text-slate-800">
              Nome completo
            </label>
            <p className="mb-1.5 text-xs text-slate-500">Como deseja ser identificado na plataforma.</p>
            <input
              id="fullName"
              name="fullName"
              className={fieldClassName}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={500}
              placeholder="Seu nome completo"
              autoComplete="name"
            />
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="submit"
              className={`${formSurface.primaryButton} min-h-10 min-w-[7.5rem] rounded-xl px-5`}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Spinner size="md" />
                  Salvando…
                </>
              ) : (
                "Salvar alterações"
              )}
            </button>
          </div>
        </form>
      </PanelSection>

      {user.email ? (
        <PanelSection
          title="Senha de acesso"
          description="Atualize sua senha. Se não lembrar a senha atual, use a recuperação por e-mail."
          icon={KeyRound}
          variant="card"
        >
          <form onSubmit={onPasswordSubmit} className="space-y-4">
            {passwordMessage ? (
              <div
                role="alert"
                className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                  passwordMessage.type === "success"
                    ? "border-emerald-200 bg-emerald-50/90 text-emerald-950"
                    : "border-rose-200 bg-rose-50 text-rose-900"
                }`}
              >
                {passwordMessage.type === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
                ) : null}
                <span>{passwordMessage.text}</span>
              </div>
            ) : null}

            <div>
              <label htmlFor="currentPassword" className="text-sm font-medium text-slate-800">
                Senha atual
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
                className={`mt-1.5 ${fieldClassName}`}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="text-sm font-medium text-slate-800">
                Nova senha
              </label>
              <p className="mb-1.5 text-xs text-slate-500">Mínimo de 8 caracteres.</p>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className={fieldClassName}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="confirmNewPassword" className="text-sm font-medium text-slate-800">
                Confirmar nova senha
              </label>
              <input
                id="confirmNewPassword"
                name="confirmNewPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className={`mt-1.5 ${fieldClassName}`}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                className={`${formSurface.primaryButton} min-h-10 min-w-[7.5rem] rounded-xl px-5`}
                disabled={savingPassword}
              >
                {savingPassword ? (
                  <>
                    <Spinner size="md" />
                    Atualizando…
                  </>
                ) : (
                  "Atualizar senha"
                )}
              </button>
              <Link
                href="/auth/forgot-password"
                className="text-center text-sm font-medium text-emerald-800 underline decoration-emerald-200 underline-offset-2 transition hover:decoration-emerald-500 sm:text-left"
              >
                Esqueci minha senha
              </Link>
            </div>
          </form>
        </PanelSection>
      ) : null}
    </ProfileContentLayout>
  );
}
