"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import {
    Cpu, Shuffle, Flame, BrainCircuit, ShieldHalf, Sigma,
    Orbit, PlugZap, Dna, Activity, Dices, Gauge, Telescope,
    CircuitBoard, Hash, CandlestickChart, Sliders, GitCommitHorizontal,
    Vault, Radar, Route, Hexagon, Binary, Fuel, Milestone, Triangle,
    Target, Blocks, Aperture, Swords, Satellite, Wrench, GlobeLock,
    Variable, Magnet, Biohazard, RadioTower, TrendingUpDown,
    Box,
    type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CanvasNodeData } from "@/types";
import { CATEGORY_COLORS } from "@/data/agent-registry";

type IconComponent = React.FC<LucideProps>;

const ICON_MAP: Record<string, IconComponent> = {
    Cpu, Shuffle, Flame, BrainCircuit, ShieldHalf, Sigma,
    Orbit, PlugZap, Dna, Activity, Dices, Gauge, Telescope,
    CircuitBoard, Hash, CandlestickChart, Sliders, GitCommitHorizontal,
    Vault, Radar, Route, Hexagon, Binary, Fuel, Milestone, Triangle,
    Target, Blocks, Aperture, Swords, Satellite, Wrench, GlobeLock,
    Variable, Magnet, Biohazard, RadioTower, TrendingUpDown,
} as Record<string, IconComponent>;

const STATUS_BORDER: Record<string, string> = {
    idle: "border-zinc-700",
    running: "border-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.3)]",
    success: "border-emerald-500",
    error: "border-red-500",
};

const STATUS_DOT: Record<string, string> = {
    idle: "bg-zinc-600",
    running: "bg-blue-500 animate-pulse",
    success: "bg-emerald-500",
    error: "bg-red-500",
};

type AgentFlowNode = Node<CanvasNodeData>;

function AgentNode({ data, selected }: NodeProps<AgentFlowNode>) {
    const IconComponent = (ICON_MAP[data.iconKey as string] ?? Box) as IconComponent;
    const categoryColor = CATEGORY_COLORS[(data.category as string)] ?? "#3b82f6";
    const execStatus = (data.executionStatus as string) ?? "idle";
    const borderStyle = STATUS_BORDER[execStatus] ?? STATUS_BORDER.idle;
    const dotStyle = STATUS_DOT[execStatus] ?? STATUS_DOT.idle;
    const isSuperAgent = data.agentId === "super-agent-composer";

    // Detect transaction-ready results for visual badge
    const execResult = data.executionResult as Record<string, unknown> | undefined;
    const hasTxReady = execResult?.status === "tx_ready" && !!execResult?.transaction;
    const hasTxSubmitted = execResult?.status === "submitted_via_bankr";
    const hasCalldata = !!execResult?.calldata && execResult?.status !== "tx_ready";

    return (
        <div
            data-testid={`canvas-node-${data.agentId as string}`}
            className={cn(
                "bg-[#27272a] border rounded-md w-[200px] cursor-pointer select-none",
                "transition-all duration-150",
                borderStyle,
                selected && "ring-1 ring-blue-400 ring-offset-0",
                isSuperAgent && "w-[220px] bg-[#1c1c2e]",
                hasTxReady && "ring-1 ring-emerald-500/50 ring-offset-0"
            )}
        >
            {/* Super Agent glow bar */}
            {isSuperAgent ? (
                <div className="h-[3px] rounded-t-md w-full bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400" />
            ) : (
                <div className="h-[3px] rounded-t-md w-full" style={{ backgroundColor: categoryColor }} />
            )}

            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-700">
                <div
                    className="flex items-center justify-center w-6 h-6 rounded flex-shrink-0"
                    style={{ backgroundColor: isSuperAgent ? "rgba(139,92,246,0.2)" : `${categoryColor}20` }}
                >
                    <IconComponent size={13} color={isSuperAgent ? "#8b5cf6" : categoryColor} />
                </div>
                <span className="text-[12px] font-medium text-zinc-100 truncate flex-1">
                    {data.agentName as string}
                </span>
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", dotStyle)} />
            </div>

            {/* Sponsor tag + Super Agent badge */}
            <div className="px-3 py-1.5 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wide">
                    {data.sponsor as string}
                </span>
                {isSuperAgent && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 uppercase tracking-wider">
                        Super
                    </span>
                )}
            </div>

            {/* Transaction status badge */}
            {hasTxReady && (
                <div className="px-3 pb-1.5">
                    <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-700/30 rounded px-1.5 py-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] text-emerald-400 font-medium">TX READY — Click to Sign</span>
                    </div>
                </div>
            )}
            {hasTxSubmitted && (
                <div className="px-3 pb-1.5">
                    <div className="flex items-center gap-1 bg-blue-500/10 border border-blue-700/30 rounded px-1.5 py-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="text-[9px] text-blue-400 font-medium">Submitted via Bankr</span>
                    </div>
                </div>
            )}
            {hasCalldata && !hasTxSubmitted && (
                <div className="px-3 pb-1.5">
                    <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-700/30 rounded px-1.5 py-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span className="text-[9px] text-amber-400 font-medium">Calldata Ready</span>
                    </div>
                </div>
            )}

            {/* Connection handles */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-2.5 !h-2.5 !bg-zinc-600 !border-zinc-500 !border hover:!bg-blue-400 transition-colors"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="!w-2.5 !h-2.5 !bg-zinc-600 !border-zinc-500 !border hover:!bg-blue-400 transition-colors"
            />
        </div>
    );
}

export default memo(AgentNode);
