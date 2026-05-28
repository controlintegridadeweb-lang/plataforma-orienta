"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Spinner } from "@/components/ui/loading";
import { createForm } from "@/lib/forms/client";
import { formSurface } from "@/lib/layout/form-surface";

type NewFormCardProps = {
  cancelHref?: string;
  afterCreatePath?: string;
};

export function NewFormCard({
  cancelHref = "/admin/formularios",
  afterCreatePath = "/admin/formularios",
}: NewFormCardProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Informe um nome.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = await createForm({ name: name.trim() });
      router.push(`${afterCreatePath}/${form.id}/perguntas`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao criar.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="max-w-3xl space-y-5">
        <div className={formSurface.fieldGroup}>
          <label htmlFor="new-form-name" className={formSurface.label}>
            Nome do formulário
          </label>
          <input
            id="new-form-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Avaliação de Integridade 2026"
            maxLength={200}
            autoFocus
            className={formSurface.input}
          />
          <p className="text-sm text-slate-500">
            Nome de exibição visível para respondentes e relatórios. Você pode renomear enquanto o
            modelo estiver em rascunho.
          </p>
        </div>

        {error ? <div className={formSurface.messageError}>{error}</div> : null}

        <p className={formSurface.messageNeutral}>
          O formulário é criado em <strong className="font-medium text-slate-800">rascunho (v1)</strong>.
          Depois você adiciona as perguntas e configura os vínculos antes de publicar.
        </p>
      </div>

      <footer className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="order-2 text-xs text-slate-500 sm:order-1 sm:max-w-md">
          Ao criar, você será direcionado para a etapa de perguntas do modelo.
        </p>
        <div className="order-1 flex flex-wrap items-center gap-3 sm:order-2">
          <button type="submit" disabled={busy} className={formSurface.primaryButton}>
            {busy ? (
              <>
                <Spinner size="md" />
                Criando…
              </>
            ) : (
              "Criar formulário"
            )}
          </button>
          <Link href={cancelHref} className={formSurface.secondaryButton}>
            Cancelar
          </Link>
        </div>
      </footer>
    </form>
  );
}
