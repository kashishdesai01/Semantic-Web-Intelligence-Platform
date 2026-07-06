import React from "react";

type ToastProps = {
  message: string;
  kind?: "success" | "error";
  onClose?: () => void;
};

export default function Toast({ message, kind = "success", onClose }: ToastProps) {
  return (
    <div className={`toast ${kind}`} role="status" aria-live="polite">
      <span>{message}</span>
      {onClose ? (
        <button className="btn ghost" onClick={onClose} aria-label="Dismiss">
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
