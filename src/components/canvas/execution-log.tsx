"use client";

import { useRef, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { useFlowStore } from "@/store/flow-store";
import { cn } from "@/lib/utils";
import { formatTimestamp } from "@/lib/utils";

const LEVEL_STYLES: Record<string, { bar: string; text: string; label: string }> = {
    info: { bar: "bg-zinc-600", text: "text-zinc-300", label: "INFO" },
    success: { bar: "bg-emerald-500", text: "text-emerald-300", label: "DONE" },
    error: { bar: "bg-red-500", text: "text-red-300", label: "ERR" },
    warn: { bar: "bg-amber-500", text: "text-amber-300", label: "WARN" },
};

export default function ExecutionLog() {
    const { executionLog, isLogVisible, toggleLog, clearLog } = useFlowStore();
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isLogVisible) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [executionLog, isLogVisible]);

    if (!isLogVisible) return null;

    return (
        <div className="h-56 bg-[#18181b] border-t border-zinc-800 flex flex-col flex-shrink-0">
            {/* Header */}
            <div className="flex items-center px-4 py-2 border-b border-zinc-800 flex-shrink-0">
                <span className="text-[12px] font-medium text-zinc-300">Execution Log</span>
                <span className="ml-2 text-[10px] text-zinc-600 bg-zinc-800 rounded px-1.5 py-0.5">
                    {executionLog.length} entries
                </span>
                <div className="flex-1" />
                <button
                    onClick={clearLog}
                    className="text-zinc-600 hover:text-zinc-400 p-1 rounded transition-colors mr-1"
                    title="Clear log"
                >
                    <Trash2 size={12} />
                </button>
                <button
                    onClick={toggleLog}
                    className="text-zinc-600 hover:text-zinc-400 p-1 rounded transition-colors"
                    title="Close log"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Log entries */}
            <div className="flex-1 overflow-y-auto font-mono text-[11px]">
                {executionLog.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-zinc-700">
                        No log entries yet. Run a flow to see output.
                    </div>
                ) : (
                    executionLog.map((entry) => {
                        const styles = LEVEL_STYLES[entry.level] ?? LEVEL_STYLES.info;
                        return (
                            <div
                                key={entry.id}
                                className="flex items-start gap-0 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                            >
                                {/* Level bar */}
                                <div className={cn("w-0.5 self-stretch flex-shrink-0", styles.bar)} />
                                {/* Timestamp */}
                                <span className="text-zinc-700 px-2 py-1.5 whitespace-nowrap flex-shrink-0 pt-[7px]">
                                    {formatTimestamp(entry.timestamp)}
                                </span>
                                {/* Level badge */}
                                <span className={cn("px-1.5 py-1.5 font-semibold flex-shrink-0 w-12 text-center pt-[7px]", styles.text)}>
                                    {styles.label}
                                </span>
                                {/* Agent name */}
                                <span className="text-zinc-500 py-1.5 pr-2 whitespace-nowrap flex-shrink-0 pt-[7px] max-w-[120px] truncate">
                                    {entry.agentName}
                                </span>
                                {/* Message */}
                                <span className={cn("py-1.5 pr-3 flex-1 pt-[7px] break-all", styles.text)}>
                                    {entry.message}
                                </span>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}
