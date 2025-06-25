import { NextRequest, NextResponse } from 'next/server';

type ApiHandlerFn = (
  req: NextRequest,
  context: { params: Record<string, string> }
) => Promise<NextResponse> | NextResponse;

interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
}

/**
 * Wraps API route handlers with error handling
 */
export function withErrorHandler(handler: ApiHandlerFn): ApiHandlerFn {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (error) {
      console.error('API route error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      const errorResponse: ErrorResponse = {
        error: error instanceof Error ? error.name : 'UnknownError',
        message: errorMessage,
      };
      
      // Add details for development environment
      if (process.env.NODE_ENV === 'development' && error instanceof Error) {
        errorResponse.details = {
          stack: error.stack,
        };
      }
      
      if (error instanceof Error && error.name === 'ValidationError') {
        return NextResponse.json(errorResponse, { status: 400 });
      }
      
      if (error instanceof Error && error.name === 'NotFoundError') {
        return NextResponse.json(errorResponse, { status: 404 });
      }
      
      if (error instanceof Error && error.name === 'UnauthorizedError') {
        return NextResponse.json(errorResponse, { status: 401 });
      }
      
      if (error instanceof Error && error.name === 'ForbiddenError') {
        return NextResponse.json(errorResponse, { status: 403 });
      }
      
      // Default to 500 Internal Server Error
      return NextResponse.json(errorResponse, { status: 500 });
    }
  };
}

/**
 * Error classes for API routes
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
} 