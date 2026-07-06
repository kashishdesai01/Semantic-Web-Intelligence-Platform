import { toast as sonnerToast } from "sonner";

/**
 * Thin wrapper over sonner so pages share one toast API instead of the
 * hand-rolled per-page toast state. Returns stable helpers.
 */
export function useToast() {
  return {
    success: (message: string) => sonnerToast.success(message),
    error: (message: string) => sonnerToast.error(message),
    info: (message: string) => sonnerToast.message(message),
  };
}

export const toast = {
  success: (message: string) => sonnerToast.success(message),
  error: (message: string) => sonnerToast.error(message),
  info: (message: string) => sonnerToast.message(message),
};
