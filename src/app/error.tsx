'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center">
      <div className="bg-red-50 dark:bg-red-950/50 p-8 rounded-lg border border-red-200 dark:border-red-800 max-w-lg w-full">
        <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-red-700 dark:text-red-300 mb-4">
          Something went wrong
        </h2>
        <div className="text-sm text-gray-700 dark:text-gray-300 mb-6">
          {error.message || 'An unexpected error occurred'}
          {error.digest && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Error ID: {error.digest}
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
          >
            Go to home
          </Button>
          <Button
            onClick={reset}
            variant="destructive"
          >
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
} 