import { useState, useEffect, useCallback, useRef } from "react";

interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  isRefetching: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAsyncData<T>(fetcher: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);
  // Holds a cancel fn for the current in-flight fetch — prevents stale results
  const cancelRef = useRef<() => void>(() => {});

  const fetch = useCallback(() => {
    // Cancel any previous in-flight fetch so it won't overwrite newer results
    cancelRef.current();

    let cancelled = false;
    cancelRef.current = () => { cancelled = true; };

    // Only show full loading state on initial load, not refetches
    if (hasLoadedOnce.current) {
      setIsRefetching(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    fetcher()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        hasLoadedOnce.current = true;
        setIsLoading(false);
        setIsRefetching(false);
      })
      .catch((err) => {
        if (cancelled) return;
        // On refetch error, keep old data visible
        if (!hasLoadedOnce.current) {
          setError(err?.message || "Error loading data");
        }
        setIsLoading(false);
        setIsRefetching(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    fetch();
    // Cancel on unmount or before next fetch
    return () => { cancelRef.current(); };
  }, [fetch]);

  return { data, isLoading, isRefetching, error, refetch: fetch };
}
