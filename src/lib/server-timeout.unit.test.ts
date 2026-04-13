import { describe, expect, it } from "vitest";
import { clampTimeout, getServerTimeout, timeoutErrorMessage } from "@/lib/server-timeout";

describe("server-timeout", () => {
    it("uses default timeout when env is missing", () => {
        expect(getServerTimeout()).toBe(55000);
    });

    it("respects FUNCTION_TIMEOUT_MS override", () => {
        process.env.FUNCTION_TIMEOUT_MS = "42000";
        expect(getServerTimeout()).toBe(42000);
    });

    it("clamps preferred timeout to function wall limits", () => {
        process.env.FUNCTION_TIMEOUT_MS = "12000";
        expect(clampTimeout(30000)).toBe(12000);
        expect(clampTimeout(500)).toBe(1000);
        expect(clampTimeout(5000)).toBe(5000);
    });

    it("returns a readable timeout error message", () => {
        const msg = timeoutErrorMessage("stellar-horizon-reader");
        expect(msg).toContain("stellar-horizon-reader");
        expect(msg.toLowerCase()).toContain("timed out");
    });
});
