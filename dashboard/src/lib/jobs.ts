import { apiFetch } from "@/lib/api";

/**
 * Polls /api/jobs/:jobId every second until it completes, fails, or times out.
 * Returns a cancel function — call it on component unmount to stop polling.
 */
export function pollJob<T>(
  _apiFetch: unknown, // kept for API compatibility, apiFetch is imported directly
  jobId: string | number,
  onDone: (result: T) => void,
  onError: (message: string) => void
): () => void {
  let cancelled = false;
  let timerId: ReturnType<typeof setTimeout>;
  // Capped exponential backoff so a slow job doesn't spam the server.
  let delay = 800;
  const maxDelay = 5000;
  const deadline = Date.now() + 60_000; // give up after ~60s

  const tick = async () => {
    if (cancelled) return;
    if (Date.now() > deadline) {
      onError("Job timed out.");
      return;
    }
    try {
      const res = await apiFetch<{
        status: string;
        result?: T;
        error?: string;
      }>(`/api/jobs/${jobId}`);
      if (cancelled) return;
      if (res.status === "completed" && res.result) {
        onDone(res.result);
        return;
      }
      if (res.status === "failed") {
        onError(res.error || "Job failed");
        return;
      }
    } catch (err: any) {
      if (!cancelled) onError(err.message || "Job failed");
      return;
    }
    delay = Math.min(delay * 1.5, maxDelay);
    timerId = setTimeout(tick, delay);
  };

  timerId = setTimeout(tick, delay);

  // Return cancel function for use in useEffect cleanup
  return () => {
    cancelled = true;
    clearTimeout(timerId);
  };
}
