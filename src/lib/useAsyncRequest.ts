'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { ApiError } from './api';

interface UseAsyncRequestOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  showSuccessToast?: boolean;
  successMessage?: string;
}

export function useAsyncRequest<T = any>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncRequestOptions<T> = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const {
    onSuccess,
    onError,
    showSuccessToast = false,
    successMessage = 'Operation completed successfully',
  } = options;

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      try {
        setIsLoading(true);
        setError(null);
        
        const result = await asyncFunction(...args);
        
        setData(result);
        
        if (onSuccess) {
          onSuccess(result);
        }
        
        if (showSuccessToast) {
          toast.success(successMessage);
        }
        
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        
        // Handle specific error cases
        if (!(err instanceof ApiError)) {
          // Only show toast for errors not already handled by the API module
          toast.error(error.message || 'An error occurred');
        }
        
        if (onError) {
          onError(error);
        }
        
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [asyncFunction, onSuccess, onError, showSuccessToast, successMessage]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    execute,
    reset,
    data,
    error,
    isLoading,
  };
} 