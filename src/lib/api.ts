import { toast } from 'sonner';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  status: number;
  data?: any;
  
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Enhanced fetch with error handling
 */
export async function fetchWithErrorHandling(
  url: string, 
  options?: RequestInit
): Promise<any> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data?.message || `Error: ${response.status} ${response.statusText}`;
      throw new ApiError(errorMessage, response.status, data);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      // Already formatted error
      console.error('API request failed:', error);
      toast.error(error.message);
      throw error;
    } else if (error instanceof TypeError && error.message.includes('fetch')) {
      // Network error
      const networkError = new ApiError(
        'Network error: Please check your connection', 
        0
      );
      console.error('Network request failed:', error);
      toast.error(networkError.message);
      throw networkError;
    } else {
      // Other errors
      const unknownError = new ApiError(
        'An unexpected error occurred', 
        500,
        { originalError: String(error) }
      );
      console.error('Unknown error during API request:', error);
      toast.error(unknownError.message);
      throw unknownError;
    }
  }
}

/**
 * API client with error handling
 */
export const api = {
  get: (url: string, options?: RequestInit) => 
    fetchWithErrorHandling(url, { ...options, method: 'GET' }),
    
  post: (url: string, data?: any, options?: RequestInit) => 
    fetchWithErrorHandling(url, { 
      ...options, 
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined 
    }),
    
  put: (url: string, data?: any, options?: RequestInit) => 
    fetchWithErrorHandling(url, { 
      ...options, 
      method: 'PUT', 
      body: data ? JSON.stringify(data) : undefined 
    }),
    
  delete: (url: string, options?: RequestInit) => 
    fetchWithErrorHandling(url, { ...options, method: 'DELETE' }),
}; 