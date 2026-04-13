import { describe, expect, it } from "vitest";
import { buildTopologicalOrder, formatTimestamp, generateId } from "@/lib/utils";

describe("utils", () => {
    it("builds topological order from DAG", () => {
        const order = buildTopologicalOrder(
            ["a", "b", "c", "d"],
            [
                { source: "a", target: "b" },
                { source: "a", target: "c" },
                { source: "c", target: "d" },
            ]
        );

        expect(order[0]).toBe("a");
        expect(order.indexOf("a")).toBeLessThan(order.indexOf("b"));
        expect(order.indexOf("a")).toBeLessThan(order.indexOf("c"));
        expect(order.indexOf("c")).toBeLessThan(order.indexOf("d"));
    });

    it("generates IDs with prefix", () => {
        const id = generateId("flow");
        expect(id.startsWith("flow_")).toBe(true);
        expect(id.length).toBeGreaterThan(8);
    });

    it("formats timestamp in HH:mm:ss", () => {
        const value = formatTimestamp(new Date("2026-01-01T01:02:03.000Z"));
        expect(value).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
});
