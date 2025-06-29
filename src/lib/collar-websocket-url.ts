/**
 * 🔄 VERCEL PROXY: WebSocket URL Builder for Same-Origin Connections
 * 
 * This solves mixed-content issues by:
 * - Always connecting to same origin (/ws endpoint)
 * - Vercel proxies to actual collar WebSocket
 * - No CORS or mixed-content security blocks
 * - Works in both dev (ws://) and prod (wss://) automatically
 */

/**
 * Build WebSocket URL using same-origin proxy
 * This always connects to /ws on the current domain
 * Vercel handles the proxy to actual collar
 */
export function getCollarWebSocketUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side: return placeholder
    return 'ws://localhost:3000/ws';
  }
  
  // Client-side: use same origin with /ws endpoint
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  
  const wsUrl = `${protocol}//${host}/ws`;
  
  console.log(`🔄 CollarWebSocket: Using proxy URL: ${wsUrl}`);
  console.log(`📡 This proxies to collar via Vercel configuration`);
  
  return wsUrl;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getCollarWebSocketUrl() instead
 */
export function buildWebSocketUrl(ip?: string): string {
  console.warn('⚠️ buildWebSocketUrl() is deprecated. Using proxy URL instead of direct IP connection.');
  return getCollarWebSocketUrl();
}

/**
 * Check if we're using the proxy approach
 */
export function isUsingProxy(): boolean {
  return true; // Always true with Vercel proxy setup
}

/**
 * Get connection info for debugging
 */
export function getConnectionInfo() {
  return {
    proxyUrl: getCollarWebSocketUrl(),
    usingProxy: isUsingProxy(),
    protocol: typeof window !== 'undefined' ? window.location.protocol : 'unknown',
    host: typeof window !== 'undefined' ? window.location.host : 'unknown'
  };
} 