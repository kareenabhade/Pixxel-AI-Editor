"use client";

import { useQuery, useMutation } from "convex/react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { FunctionReference } from "convex/server";

// ---------------------------
// ✅ useConvexQuery Hook
// ---------------------------
export function useConvexQuery<TQuery extends FunctionReference<any>>(
  query: TQuery,
  ...args: any
) {
  const result = useQuery(query, ...args);

  const [data, setData] = useState<ReturnType<typeof useQuery<TQuery>>>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (result === undefined) {
      setIsLoading(true);
    } else {
      try {
        setData(result);
        setError(null);
      } catch (err: unknown) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        toast.error(errorObj.message);
      } finally {
        setIsLoading(false);
      }
    }
  }, [result]);

  return {
    data,
    isLoading,
    error,
  };
}

// ---------------------------
// ✅ useConvexMutation Hook
// ---------------------------
export function useConvexMutation<TMutation extends FunctionReference<any>>(
  mutation: TMutation
) {
  const mutationFn = useMutation(mutation);
  const [data, setData] = useState<any>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (
    ...args: Parameters<typeof mutationFn>
  ): Promise<ReturnType<typeof mutationFn>> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await mutationFn(...args);
      setData(response);
      return response;
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      toast.error(errorObj.message);
      throw errorObj;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, data, isLoading, error };
}
