import * as React from "react";

type PageEmptyProps = {
  icon: React.ReactNode;
  title: string;
  copy: string;
  action?: React.ReactNode;
};

export function PageEmpty({ icon, title, copy, action }: PageEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface px-6 py-10 text-center">
      <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-elevated text-muted-foreground">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground">{copy}</p>
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
