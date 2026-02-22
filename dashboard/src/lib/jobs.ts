export async function pollJob<T>(
  apiFetch: <R>(path: string, options?: RequestInit) => Promise<R>,
  jobId: string | number,
  onDone: (result: T) => void,
  onError: (message: string) => void
) {
  let attempts = 0;
  const maxAttempts = 30;

  const tick = async () => {
    attempts += 1;
    if (attempts > maxAttempts) {
      onError("Job timed out.");
      return;
    }
    try {
      const res = await apiFetch<{
        status: string;
        result?: T;
        error?: string;
      }>(`/api/jobs/${jobId}`);
      if (res.status === "completed" && res.result) {
        onDone(res.result);
        return;
      }
      if (res.status === "failed") {
        onError(res.error || "Job failed");
        return;
      }
    } catch (err: any) {
      onError(err.message || "Job failed");
      return;
    }
    setTimeout(tick, 1000);
  };

  setTimeout(tick, 800);
}
