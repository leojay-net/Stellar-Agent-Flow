"use client";

import { useState, useCallback, useEffect } from "react";
import {
    Cpu, Shuffle, Flame, BrainCircuit, ShieldHalf, Sigma,
    Orbit, PlugZap, Dna, Activity, Dices, Gauge, Telescope,
    CircuitBoard, Hash, CandlestickChart, Sliders, GitCommitHorizontal,
    Vault, Radar, Route, Hexagon, Binary, Fuel, Milestone, Triangle,
    Target, Blocks, Aperture, Swords, Satellite, Wrench, GlobeLock,
    Variable, Magnet, Biohazard, RadioTower, TrendingUpDown,
    Box, Search, ChevronRight, Users, RefreshCw,
} from "lucide-react";
import { useFlowStore } from "@/store/flow-store";
import { AGENT_REGISTRY, AGENT_CATEGORIES, CATEGORY_COLORS } from "@/data/agent-registry";
import type { AgentDefinition } from "@/types";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
    Cpu, Shuffle, Flame, BrainCircuit, ShieldHalf, Sigma,
    Orbit, PlugZap, Dna, Activity, Dices, Gauge, Telescope,
    CircuitBoard, Hash, CandlestickChart, Sliders, GitCommitHorizontal,
    Vault, Radar, Route, Hexagon, Binary, Fuel, Milestone, Triangle,
    Target, Blocks, Aperture, Swords, Satellite, Wrench, GlobeLock,
    Variable, Magnet, Biohazard, RadioTower, TrendingUpDown,
};

function AgentCard({
    agent,
    onAdd,
    showBadge,
}: {
    agent: AgentDefinition;
    onAdd: (agent: AgentDefinition) => void;
    showBadge?: boolean;
}) {
    const IconComponent = ICON_MAP[agent.iconKey] ?? Box;
    const categoryColor = CATEGORY_COLORS[agent.category] ?? "#3b82f6";

    return (
        <div
            data-testid={`registry-agent-${agent.id}`}
            className="group flex items-center gap-2.5 px-3 py-2.5 hover:bg-zinc-700/50 cursor-pointer border-b border-zinc-800/60 transition-colors"
            onClick={() => onAdd(agent)}
            draggable
            onDragStart={(e) => {
                // Serialise the full agent so the canvas can reconstruct it
                // (works for both built-in and user-published community agents)
                e.dataTransfer.setData("agent", JSON.stringify(agent));
                e.dataTransfer.effectAllowed = "move";
            }}
        >
            <div
                className="flex items-center justify-center w-7 h-7 rounded flex-shrink-0"
                style={{ backgroundColor: `${categoryColor}15` }}
            >
                <IconComponent size={14} style={{ color: categoryColor }} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 min-w-0">
                    <div className="text-[12px] font-medium text-zinc-200 truncate">{agent.name}</div>
                    {showBadge && (
                        <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-600/30 flex-shrink-0">
                            Community
                        </span>
                    )}
                </div>
                <div className="text-[10px] text-zinc-500 truncate">{agent.sponsor}</div>
            </div>
            <ChevronRight
                size={12}
                className="text-zinc-700 group-hover:text-zinc-400 transition-colors flex-shrink-0"
            />
        </div>
    );
}

export default function RegistrySidebar() {
    const { addAgentToCanvas } = useFlowStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [communityAgents, setCommunityAgents] = useState<AgentDefinition[]>([]);
    const [loadingCommunity, setLoadingCommunity] = useState(false);

    const fetchCommunityAgents = useCallback(async () => {
        setLoadingCommunity(true);
        try {
            const res = await fetch("/api/agents");
            if (res.ok) {
                const data = await res.json();
                setCommunityAgents(data.agents ?? []);
            }
        } catch {
            // silently fail — community agents are optional
        } finally {
            setLoadingCommunity(false);
        }
    }, []);

    useEffect(() => {
        fetchCommunityAgents();
    }, [fetchCommunityAgents]);

    // Expose a refresh trigger so publish modal can call it
    useEffect(() => {
        const handler = () => fetchCommunityAgents();
        window.addEventListener("agentflow:agent-published", handler);
        return () => window.removeEventListener("agentflow:agent-published", handler);
    }, [fetchCommunityAgents]);

    const filterFn = useCallback(
        (agent: AgentDefinition) => {
            const matchesSearch =
                searchQuery === "" ||
                agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                agent.sponsor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                agent.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesCategory = activeCategory === "all" || agent.category === activeCategory;
            return matchesSearch && matchesCategory;
        },
        [searchQuery, activeCategory]
    );

    const filteredBuiltin = AGENT_REGISTRY.filter(filterFn);
    const filteredCommunity = communityAgents.filter(filterFn);

    const handleAddAgent = useCallback(
        (agent: AgentDefinition) => addAgentToCanvas(agent),
        [addAgentToCanvas]
    );

    return (
        <div className="w-56 bg-[#27272a] border-r border-zinc-800 flex flex-col flex-shrink-0">
            {/* Header */}
            <div className="px-3 py-3 border-b border-zinc-800 flex-shrink-0">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Agents
                </span>
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b border-zinc-800 flex-shrink-0">
                <div className="flex items-center gap-2 bg-zinc-800 rounded px-2 py-1.5">
                    <Search size={12} className="text-zinc-500 flex-shrink-0" />
                    <input
                        data-testid="registry-search-input"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search agents…"
                        className="bg-transparent text-[12px] text-zinc-300 outline-none w-full placeholder:text-zinc-600"
                    />
                </div>
            </div>

            {/* Category tabs */}
            <div className="flex overflow-x-auto gap-1 px-2 py-1.5 border-b border-zinc-800 flex-shrink-0 scrollbar-hide">
                {AGENT_CATEGORIES.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={cn(
                            "px-2 py-0.5 text-[10px] rounded whitespace-nowrap transition-colors flex-shrink-0",
                            activeCategory === cat.id
                                ? "bg-blue-600 text-white"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700"
                        )}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Agent list — scrollable */}
            <div className="flex-1 overflow-y-auto">
                {/* Built-in agents */}
                {filteredBuiltin.length > 0 && (
                    <>
                        <div className="px-3 py-1.5 text-[9px] font-semibold text-zinc-600 uppercase tracking-wider bg-zinc-800/30">
                            Platform
                        </div>
                        {filteredBuiltin.map((agent) => (
                            <AgentCard key={agent.id} agent={agent} onAdd={handleAddAgent} />
                        ))}
                    </>
                )}

                {/* Community agents */}
                <div className="px-3 py-1.5 flex items-center justify-between bg-zinc-800/30">
                    <div className="flex items-center gap-1.5">
                        <Users size={9} className="text-zinc-600" />
                        <span className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wider">
                            Community
                        </span>
                        {communityAgents.length > 0 && (
                            <span className="text-[9px] text-zinc-700">({communityAgents.length})</span>
                        )}
                    </div>
                    <button
                        onClick={fetchCommunityAgents}
                        disabled={loadingCommunity}
                        className="text-zinc-700 hover:text-zinc-400 transition-colors"
                        title="Refresh community agents"
                    >
                        <RefreshCw size={9} className={cn(loadingCommunity && "animate-spin")} />
                    </button>
                </div>

                {loadingCommunity ? (
                    <div className="px-3 py-3 text-[11px] text-zinc-700 text-center">Loading…</div>
                ) : filteredCommunity.length > 0 ? (
                    filteredCommunity.map((agent) => (
                        <AgentCard key={agent.id} agent={agent} onAdd={handleAddAgent} showBadge />
                    ))
                ) : (
                    <div className="px-3 py-4 text-[11px] text-zinc-700 text-center leading-relaxed">
                        No community agents yet.
                        <br />
                        Be the first to publish one.
                    </div>
                )}

                {filteredBuiltin.length === 0 && filteredCommunity.length === 0 && searchQuery && (
                    <div className="flex flex-col items-center justify-center h-16 text-zinc-700 text-[12px] text-center px-4">
                        No agents match your search.
                    </div>
                )}
            </div>

            {/* Footer hint */}
            <div className="px-3 py-2 border-t border-zinc-800 flex-shrink-0">
                <span className="text-[10px] text-zinc-700">Click or drag to canvas</span>
            </div>
        </div>
    );
}

