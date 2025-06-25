'use client';

import React, { Component } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('Error caught by error boundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
  }

  // Additional handling for unhandled promise rejections and other global errors
  componentDidMount(): void {
    // Handle window errors that aren't caught by React's error boundary
    this.errorHandler = (event: ErrorEvent) => {
      console.error('Global error caught by error boundary:', event);
      this.setState({
        hasError: true,
        error: event.error
      });
    };

    // Handle unhandled promise rejections
    this.rejectionHandler = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection caught:', event.reason);
      this.setState({
        hasError: true,
        error: event.reason instanceof Error ? event.reason : new Error(String(event.reason))
      });
    };

    window.addEventListener('error', this.errorHandler);
    window.addEventListener('unhandledrejection', this.rejectionHandler);
  }

  componentWillUnmount(): void {
    // Clean up event listeners
    window.removeEventListener('error', this.errorHandler);
    window.removeEventListener('unhandledrejection', this.rejectionHandler);
  }

  // Reset error state
  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) return <>{fallback}</>;
      
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
          <div className="bg-red-50 dark:bg-red-950/50 p-6 rounded-lg border border-red-200 dark:border-red-800 max-w-lg w-full">
            <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-700 dark:text-red-300 mb-2">
              Something went wrong
            </h2>
            <div className="text-sm text-gray-700 dark:text-gray-300 mb-4 max-h-32 overflow-auto">
              {error?.message || 'An unexpected error occurred'}
            </div>
            <Button 
              onClick={this.resetError}
              variant="destructive"
              className="mt-2"
            >
              Try again
            </Button>
          </div>
        </div>
      );
    }

    return <>{children}</>;
  }

  // TypeScript type declarations for event handlers
  private errorHandler!: (event: ErrorEvent) => void;
  private rejectionHandler!: (event: PromiseRejectionEvent) => void;
} 