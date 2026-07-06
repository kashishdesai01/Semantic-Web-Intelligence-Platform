"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

/**
 * Encapsulates the loading/error/data triad repeated across pages.
 * Runs `fn` immediately by default; call the returned `run` to refetch
 * (e.g. from a Retry button). Skips state updates after unmount.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  options: { immediate?: boolean } = {}
) {
  const { immediate = true } = options;
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const fnRef = useRef(fn);
  fnRef.current = fn;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      if (mounted.current) setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      if (mounted.current)
        setState((s) => ({ ...s, loading: false, error: message }));
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (immediate) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setData = useCallback((updater: T | ((prev: T | null) => T)) => {
    setState((s) => ({
      ...s,
      data:
        typeof updater === "function"
          ? (updater as (prev: T | null) => T)(s.data)
          : updater,
    }));
  }, []);

  return { ...state, run, setData };
}
