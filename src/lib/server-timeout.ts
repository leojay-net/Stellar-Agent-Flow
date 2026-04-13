// ============================================================
// Server Timeout Utility
//
// Auto-detects Vercel plan limits and caps fetch timeouts
// to prevent runaway requests.
//
// Vercel Fluid Compute (enabled by default on ALL plans):
//   Hobby     : maxDuration up to 300s (5 min)
//   Pro       : maxDuration up to 800s (13 min)
//   Enterprise: maxDuration up to 800s (13 min)
//
// Our routes set maxDuration = 60, so we cap internal
// fetches at 55s to leave room for response serialisation.
//
// Override with env var:
//   FUNCTION_TIMEOUT_MS=55000  (default)
// ============================================================

const DEFAULT_WALL_MS = 55000; // 5s buffer before our 60s maxDuration

/**
 * Maximum time (ms) a fetch call inside a serverless function
 * should be allowed before we abort it ourselves — giving us
 * time to return a clean JSON error instead of a hard kill.
 */
export function getServerTimeout(): number {
    const custom = process.env.FUNCTION_TIMEOUT_MS;
    if (custom) return parseInt(custom, 10);
    return DEFAULT_WALL_MS;
}

/**
 * Cap a preferred timeout to fit within the function wall clock.
 * e.g. clampTimeout(30000) → 30000 (unchanged — fits within 55s wall)
 */
export function clampTimeout(preferredMs: number): number {
    const wall = getServerTimeout();
    return Math.max(Math.min(preferredMs, wall), 1000);
}

/**
 * Human-readable timeout error message for the UI.
 */
export function timeoutErrorMessage(agentId: string): string {
    return (
        `Agent "${agentId}" timed out. ` +
        `This operation requires longer execution time. ` +
        `If this persists, check the upstream API status.`
    );
}
