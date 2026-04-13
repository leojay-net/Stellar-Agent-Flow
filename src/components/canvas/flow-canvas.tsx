"use client";

import { useCallback } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
    useReactFlow,
    type NodeTypes,
    type OnConnectEnd,
} from "@xyflow/react";
import { useFlowStore } from "@/store/flow-store";
import AgentNode from "./agent-node";
import type { CanvasNodeData, AgentDefinition } from "@/types";
import type { Node } from "@xyflow/react";

const NODE_TYPES: NodeTypes = {
    agentNode: AgentNode,
};

function EmptyCanvasState({ onLoadDemo }: { onLoadDemo: () => void }) {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            <div className="pointer-events-auto flex flex-col items-center gap-4 max-w-xs text-center">
                {/* Grid icon */}
                <div className="w-14 h-14 rounded-xl border border-zinc-700 bg-zinc-800/60 flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="1.5">
                        <rect x="3" y="3" width="8" height="8" rx="1.5" />
                        <rect x="13" y="3" width="8" height="8" rx="1.5" />
                        <rect x="3" y="13" width="8" height="8" rx="1.5" />
                        <rect x="13" y="13" width="8" height="8" rx="1.5" />
                    </svg>
                </div>
                <div>
                    <p className="text-[14px] font-medium text-zinc-300 mb-1">Start building your flow</p>
                    <p className="text-[12px] text-zinc-600 leading-relaxed">
                        Drag agents from the sidebar onto the canvas, connect them, then hit&nbsp;
                        <span className="text-zinc-400 font-medium">Run Flow</span>.
                    </p>
                </div>
                <button
                    onClick={onLoadDemo}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-[12px] rounded-md transition-colors"
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="7" x="3" y="3" rx="1" /><rect width="9" height="7" x="3" y="14" rx="1" /><rect width="5" height="7" x="16" y="14" rx="1" /></svg>
                    Load demo flow
                </button>
            </div>
        </div>
    );
}

export default function FlowCanvas() {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        selectNode,
        addAgentToCanvas,
        loadDemoFlow,
    } = useFlowStore();

    const { screenToFlowPosition } = useReactFlow();

    const handleDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

    const handleDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            // Prefer the full serialised agent (handles both built-in & community agents)
            const agentJson = event.dataTransfer.getData("agent");
            if (!agentJson) return;
            try {
                const agent = JSON.parse(agentJson) as AgentDefinition;
                const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
                addAgentToCanvas(agent, position);
            } catch {
                // ignore malformed drag data
            }
        },
        [screenToFlowPosition, addAgentToCanvas]
    );

    const handleNodeClick = useCallback(
        (_: React.MouseEvent, node: Node<CanvasNodeData>) => {
            selectNode(node.id);
        },
        [selectNode]
    );

    const handlePaneClick = useCallback(() => {
        selectNode(null);
    }, [selectNode]);

    const handleConnectEnd: OnConnectEnd = useCallback(() => {
        // no-op: connections are handled by onConnect
    }, []);

    return (
        <div
            className="flex-1 h-full bg-[#18181b] relative"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {nodes.length === 0 && <EmptyCanvasState onLoadDemo={loadDemoFlow} />}
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectEnd={handleConnectEnd}
                onNodeClick={handleNodeClick}
                onPaneClick={handlePaneClick}
                nodeTypes={NODE_TYPES}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.3}
                maxZoom={2}
                defaultEdgeOptions={{
                    type: "smoothstep",
                    style: { stroke: "#52525b", strokeWidth: 1.5 },
                }}
                proOptions={{ hideAttribution: true }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="#3f3f46"
                />
                <Controls showInteractive={false} />
                <MiniMap
                    nodeColor="#52525b"
                    maskColor="rgba(24,24,27,0.6)"
                />
            </ReactFlow>
        </div>
    );
}
