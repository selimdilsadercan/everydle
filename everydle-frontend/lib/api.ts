import Client, { Environment, Local } from "@/lib/client";

// Environment configuration
// Use ENV_TYPE to differentiate between staging and production
// NODE_ENV is always 'production' for both environments since we use production builds
const envType =
  process.env.ENV_TYPE || process.env.NEXT_PUBLIC_ENV_TYPE || "staging";

const defaultBaseURL = Environment(envType);

/**
 * Creates a server-side client for API calls without authentication
 * @param baseURL - Custom base URL (optional)
 */
export function createServerClient(baseURL?: string) {
  const targetURL = baseURL || defaultBaseURL;
  console.log("🔧 [API Client] Creating client with:", {
    envType,
    targetURL,
    isCustomURL: !!baseURL,
  });
  return new Client(targetURL);
}

/**
 * Creates a client for local development
 */
export function createLocalClient() {
  return new Client(Local);
}

/**
 * Creates a client for staging environment
 */
export function createStagingClient() {
  return new Client(Environment("staging"));
}

/**
 * Creates a client for production environment
 */
export function createProductionClient() {
  return new Client(Environment("production"));
}
