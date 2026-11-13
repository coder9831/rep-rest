import type { ReactNode } from "react";
export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
        {sub && <p className="mt-2 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
