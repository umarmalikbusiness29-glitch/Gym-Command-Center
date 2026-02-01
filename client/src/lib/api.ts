/**
 * API Configuration
 * Updates the base URL depending on environment
 */

// Get API base URL from environment or default to relative URLs
const API_BASE = import.meta.env.VITE_API_URL || '';

export function getApiUrl(path: string): string {
  // If we have a full base URL (from environment), use it
  if (API_BASE) {
    return `${API_BASE}${path}`;
  }
  // Otherwise use relative URLs (works for same-origin requests)
  return path;
}

export { API_BASE };
