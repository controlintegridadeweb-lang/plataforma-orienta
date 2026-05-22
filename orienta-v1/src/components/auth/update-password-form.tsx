"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  AUTH_INPUT_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
  authAlertClass,
} from "@/components/auth/auth-field-classes";
import { LoadingButton } from "@/components/ui/loading";

export function UpdatePasswordForm() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const code = currentUrl.searchParams.get("code");
    if (!code) return;

    supabase.auth.exchangeCodeForSession(code).catch(() => {
      setStatus("error");
      setMessage("Link de recuperacao invalido ou expirado.");
    });
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("idle");
    setMessage("");

    if (password.length < 8) {
      setStatus("error");
      setMessage("A senha deve ter no minimo 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("As senhas nao conferem.");
      return;
    }

    setPending(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (error) {
      setStatus("error");
      setMessage("Nao foi possivel redefinir a senha.");
      return;
    }

    setStatus("success");
    setMessage("Senha atualizada com sucesso. Volte ao login para entrar.");
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="password" className={AUTH_LABEL_CLASS}>
          Nova senha
        </label>
        <p className="text-sm leading-relaxed text-slate-500">Mínimo de 8 caracteres.</p>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          placeholder="••••••••"
          className={AUTH_INPUT_CLASS}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className={AUTH_LABEL_CLASS}>
          Confirmar nova senha
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          placeholder="••••••••"
          className={AUTH_INPUT_CLASS}
        />
      </div>

      {status !== "idle" && message ? (
        <div role="alert" className={`flex gap-3 ${authAlertClass(status === "success" ? "success" : "error")}`}>
          {status === "success" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
          )}
          <span>{message}</span>
        </div>
      ) : null}

      <LoadingButton
        type="submit"
        pending={pending}
        pendingLabel="Atualizando…"
        spinnerSize="lg"
        className={AUTH_PRIMARY_BUTTON_CLASS}
      >
        Salvar nova senha
      </LoadingButton>
    </form>
  );
}
