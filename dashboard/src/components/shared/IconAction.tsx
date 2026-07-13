import * as React from "react";
import { cn } from "@/lib/utils";

type IconActionProps = {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
};

export function IconAction({ label, onClick, destructive, children }: IconActionProps) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground",
        destructive && "hover:text-destructive"
      )}
    >
      {children}
    </button>
  );
}
