"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

interface UseDataFetchOptions<T> {
  url: string;
  enabled?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  retries?: number;
  timeout?: number;
  showErrorToast?: boolean;
  errorMessage?: string;
}

interface UseDataFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isRefetching: boolean;
}

/**
 * Hook for reliable data fetching with session awareness
 */
export function useDataFetch<T>({
  url,
  enabled = true,
  refetchInterval,
  onSuccess,
  onError,
  retries = 2,
  timeout = 15000,
  showErrorToast = true,
  errorMessage = "Errore nel caricamento dei dati",
}: UseDataFetchOptions<T>): UseDataFetchResult<T> {
  const { status: sessionStatus } = useSession();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async (isRefetch = false) => {
    // Don't fetch if not enabled or session is still loading
    if (!enabled || sessionStatus === "loading") {
      return;
    }

    // Don't fetch if not authenticated
    if (sessionStatus === "unauthenticated") {
      setLoading(false);
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    if (isRefetch) {
      setIsRefetching(true);
    } else {
      setLoading(true);
    }
    setError(null);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const timeoutId = setTimeout(() => {
          abortControllerRef.current?.abort();
        }, timeout);

        const response = await fetch(url, {
          signal: abortControllerRef.current.signal,
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        clearTimeout(timeoutId);

        if (!mountedRef.current) return;

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (!mountedRef.current) return;

        setData(result);
        setError(null);
        onSuccess?.(result);
        
        setLoading(false);
        setIsRefetching(false);
        return;

      } catch (err) {
        lastError = err as Error;

        // Don't retry on abort
        if ((err as Error).name === "AbortError") {
          if (!mountedRef.current) return;
          setLoading(false);
          setIsRefetching(false);
          return;
        }

        // Wait before retrying
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    // All retries failed
    if (!mountedRef.current) return;

    setError(lastError);
    setLoading(false);
    setIsRefetching(false);

    if (showErrorToast && lastError) {
      toast.error(errorMessage);
    }

    onError?.(lastError!);
  }, [url, enabled, sessionStatus, retries, timeout, showErrorToast, errorMessage, onSuccess, onError]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    fetchData();

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // Refetch interval
  useEffect(() => {
    if (!refetchInterval || !enabled || sessionStatus !== "authenticated") {
      return;
    }

    const intervalId = setInterval(() => {
      fetchData(true);
    }, refetchInterval);

    return () => clearInterval(intervalId);
  }, [refetchInterval, enabled, sessionStatus, fetchData]);

  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    isRefetching,
  };
}

/**
 * Hook for fetching multiple URLs in parallel
 */
export function useMultiDataFetch<T extends Record<string, unknown>>(
  urls: Record<keyof T, string>,
  options: Omit<UseDataFetchOptions<T>, "url"> = {}
): {
  data: Partial<T>;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const { status: sessionStatus } = useSession();
  const [data, setData] = useState<Partial<T>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const {
    enabled = true,
    retries = 2,
    timeout = 15000,
    showErrorToast = true,
    errorMessage = "Errore nel caricamento dei dati",
  } = options;

  const fetchAll = useCallback(async () => {
    if (!enabled || sessionStatus !== "authenticated") {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const entries = Object.entries(urls) as [keyof T, string][];
      
      const results = await Promise.all(
        entries.map(async ([key, url]) => {
          for (let attempt = 0; attempt <= retries; attempt++) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), timeout);
              
              const response = await fetch(url, { signal: controller.signal });
              clearTimeout(timeoutId);
              
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }
              
              const data = await response.json();
              return [key, data] as [keyof T, T[keyof T]];
            } catch (err) {
              if (attempt === retries) throw err;
              await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            }
          }
          throw new Error("Max retries reached");
        })
      );

      const newData = Object.fromEntries(results) as Partial<T>;
      setData(newData);
      setLoading(false);
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      if (showErrorToast) {
        toast.error(errorMessage);
      }
    }
  }, [urls, enabled, sessionStatus, retries, timeout, showErrorToast, errorMessage]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    data,
    loading,
    error,
    refetch: fetchAll,
  };
}
