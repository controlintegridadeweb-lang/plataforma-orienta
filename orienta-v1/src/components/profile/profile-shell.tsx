import type { ReactNode } from "react";
import { PageCardShell } from "@/components/ui/page-card-shell";

type Props = {
  title: string;
  description: string;
  roleLabel?: string;
  children: ReactNode;
};

export function ProfileShell({ title, description, roleLabel, children }: Props) {
  return (
    <PageCardShell
      title={title}
      description={description}
      illustration
      badge={
        roleLabel ? (
          <p>
            <span className="inline-flex items-center rounded-md border border-brand-200/80 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
              {roleLabel}
            </span>
          </p>
        ) : undefined
      }
    >
      {children}
    </PageCardShell>
  );
}
