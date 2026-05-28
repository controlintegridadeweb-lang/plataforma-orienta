"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { loginAction, type AuthFormState } from "@/app/auth/actions";
import { AuthGlassCard } from "@/components/auth/auth-glass-card";
import {
  AUTH_INPUT_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
  authAlertClass,
} from "@/components/auth/auth-field-classes";
import { LoadingButton } from "@/components/ui/loading";
import type { LoginOrganizationOption } from "@/lib/organizations/login-options";

const defaultAuthFormState: AuthFormState = { status: "idle" };

export function LoginForm({ organizations }: { organizations: LoginOrganizationOption[] }) {
  const [state, formAction, pending] = useActionState(loginAction, defaultAuthFormState);
  const showOrgSelect = organizations.length > 0;

  return (
    <AuthGlassCard>
      <header className="mb-10 space-y-3">
        <p className="text-base font-medium text-slate-700">Plataforma Orienta</p>
        <h1 className="text-balance text-[clamp(1.5rem,4.5vw+0.6rem,1.875rem)] font-semibold tracking-normal text-slate-900 sm:text-4xl">
          Entrar na conta
        </h1>
        <p className="max-w-lg text-pretty text-kicker-md leading-relaxed text-slate-600">
          Informe o e-mail e a senha fornecidos pelo administrador.
          {showOrgSelect ? (
            <>
              {" "}
              Se você estiver vinculado a uma organização, selecione-a antes de continuar.
            </>
          ) : null}
        </p>
      </header>

      <form action={formAction} className="space-y-6">
        {showOrgSelect ? (
          <div className="space-y-2">
            <label htmlFor="organizationId" className={AUTH_LABEL_CLASS}>
              Organização
            </label>
            <select
              id="organizationId"
              name="organizationId"
              required
              defaultValue=""
              className={`${AUTH_INPUT_CLASS} appearance-none bg-[length:1.25rem] bg-[right_1rem_center] bg-no-repeat pr-11`}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
              }}
              aria-label="Organização"
            >
              <option value="" disabled>
                Selecione a organização…
              </option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="space-y-2">
          <label htmlFor="email" className={AUTH_LABEL_CLASS}>
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="nome@exemplo.org"
            className={AUTH_INPUT_CLASS}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className={AUTH_LABEL_CLASS}>
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Digite sua senha"
            className={AUTH_INPUT_CLASS}
          />
        </div>

        <div className="flex justify-end pt-1">
          <Link
            href="/auth/forgot-password"
            className="text-base font-medium text-brand-800 underline decoration-brand-800/30 underline-offset-1 transition hover:text-brand-900 hover:decoration-brand-900/50 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
          >
            Esqueci minha senha
          </Link>
        </div>

        {state.status === "error" && state.message ? (
          <div className={`flex gap-3 ${authAlertClass("error")}`} role="alert">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" aria-hidden />
            <span>{state.message}</span>
          </div>
        ) : null}

        {state.status === "success" && state.message ? (
          <div className={`flex gap-3 ${authAlertClass("success")}`} role="status">
            <span>{state.message}</span>
          </div>
        ) : null}

        <LoadingButton
          type="submit"
          pending={pending}
          pendingLabel="Entrando…"
          spinnerSize="lg"
          className={`${AUTH_PRIMARY_BUTTON_CLASS} mt-2`}
        >
          Entrar na plataforma
        </LoadingButton>
      </form>
    </AuthGlassCard>
  );
}
