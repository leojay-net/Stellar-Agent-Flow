// ============================================================
// AgentFlow — Utility helpers
// ============================================================

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

export function generateId(prefix = "node"): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 11)}`;
}

export function formatTimestamp(date: Date): string {
    return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
}

export function formatUsdAmount(amount: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
    }).format(amount);
}

export function buildTopologicalOrder(
    nodeIds: string[],
    edges: { source: string; target: string }[]
): string[] {
    const inDegreeMap: Record<string, number> = {};
    const adjacencyList: Record<string, string[]> = {};

    nodeIds.forEach((id) => {
        inDegreeMap[id] = 0;
        adjacencyList[id] = [];
    });

    edges.forEach((edge) => {
        if (adjacencyList[edge.source]) {
            adjacencyList[edge.source].push(edge.target);
        }
        if (inDegreeMap[edge.target] !== undefined) {
            inDegreeMap[edge.target]++;
        }
    });

    const queue: string[] = nodeIds.filter((id) => inDegreeMap[id] === 0);
    const orderedResult: string[] = [];

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        orderedResult.push(currentId);

        adjacencyList[currentId]?.forEach((neighborId) => {
            inDegreeMap[neighborId]--;
            if (inDegreeMap[neighborId] === 0) {
                queue.push(neighborId);
            }
        });
    }

    return orderedResult;
}

export function sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
