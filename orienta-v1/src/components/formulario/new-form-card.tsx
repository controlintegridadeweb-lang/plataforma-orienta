"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FilePlus, Loader2 } from "lucide-react";
import { PanelSection } from "@/components/ui/panel-section";
import { createForm } from "@/lib/forms/client";
import { formSurface } from "@/lib/form-surface";

const fieldClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand/25";

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
    <PanelSection
      title="Dados do formulário"
      description="Defina o nome de exibição. Você ajusta perguntas e publicação nas etapas seguintes."
      icon={FilePlus}
      variant="card"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-form-name" className="text-sm font-medium text-slate-800">
            Nome do formulário
          </label>
          <p className="mb-1.5 text-xs text-slate-500">
            Nome de exibição. Você ajusta perguntas e publicação nas etapas seguintes.
          </p>
          <input
            id="new-form-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Avaliação de Integridade 2026"
            maxLength={200}
            autoFocus
            className={fieldClassName}
          />
        </div>

        {error ? <div className={formSurface.messageError}>{error}</div> : null}

        <p className="text-xs text-slate-500">
          O formulário é criado em rascunho (v1). Depois você adiciona as perguntas e configura os vínculos antes de
          publicar.
        </p>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <button
            type="submit"
            disabled={busy}
            className={`${formSurface.primaryButton} min-h-10 rounded-xl px-5`}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Criando…
              </>
            ) : (
              "Criar formulário"
            )}
          </button>
          <Link href={cancelHref} className={formSurface.secondaryButtonSm}>
            Cancelar
          </Link>
        </div>
      </form>
    </PanelSection>
  );
}
