import Link from "next/link";
import { AuthGlassCard } from "@/components/auth/auth-glass-card";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export default function UpdatePasswordPage() {
  return (
    <AuthSplitLayout>
      <AuthGlassCard>
        <header className="mb-10 space-y-3">
          <p className="text-base font-medium text-slate-700">Plataforma Orienta</p>
          <h1 className="text-balance text-3xl font-semibold tracking-normal text-slate-900 sm:text-4xl">
            Nova senha
          </h1>
          <p className="text-kicker-md leading-relaxed text-slate-600">
            Defina uma senha forte e guarde em local seguro. Em seguida, volte ao login para entrar com o novo
            acesso.
          </p>
        </header>
        <UpdatePasswordForm />
        <p className="mt-10 text-center text-base text-slate-600">
          <Link
            href="/"
            className="font-medium text-brand-800 underline decoration-brand-800/30 underline-offset-1 transition hover:text-brand-900 hover:decoration-brand-900/50 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
          >
            Voltar para o login
          </Link>
        </p>
      </AuthGlassCard>
    </AuthSplitLayout>
  );
}
