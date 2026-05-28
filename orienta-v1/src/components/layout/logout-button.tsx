"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/auth/actions";
import { Spinner } from "@/components/ui/loading";
import { formSurface } from "@/lib/form-surface";

export function LogoutButton({ className }: { className?: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={() => {
        startTransition(() => {
          logoutAction();
        });
      }}
    >
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        title="Sair"
        className={
          className ??
          `${formSurface.secondaryButtonSm} w-full justify-center sm:w-auto sm:justify-start`
        }
      >
        {pending ? (
          <Spinner className="shrink-0" />
        ) : (
          <LogOut className="size-4.5 shrink-0" aria-hidden />
        )}
        <span className="sb-label">{pending ? "Saindo..." : "Sair"}</span>
      </button>
    </form>
  );
}
