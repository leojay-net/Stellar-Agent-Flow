import { describe, expect, it } from "vitest";
import { TYPES_MODULE_RUNTIME_MARKER } from "@/types";

describe("types module", () => {
    it("exports runtime marker", () => {
        expect(TYPES_MODULE_RUNTIME_MARKER).toBe("agentflow-types");
    });
});
