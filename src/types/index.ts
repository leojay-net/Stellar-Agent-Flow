// ============================================================
// AgentFlow — Core Type Definitions
// ============================================================

export type AgentCategory =
    | "core"
    | "defi"
    | "ai"
    | "oracle"
    | "identity"
    | "auth"
    | "trust"
    | "chain"
    | "governance"
    | "payments"
    | "nft";

export type NodeExecutionStatus = "idle" | "running" | "success" | "error";
export type FlowExecutionStatus = "idle" | "running" | "completed" | "error";

export interface AgentParameter {
    name: string;
    label: string;
    defaultValue: string;
    description: string;
    type: "text" | "number" | "boolean" | "select" | "textarea";
    options?: string[];
    required?: boolean;
}

export interface AgentDefinition {
    id: string;
    name: string;
    description: string;
    category: AgentCategory;
    sponsor: string;
    version: string;
    iconKey: string;
    parameters: AgentParameter[];
    tags: string[];
    endpointUrl?: string;
    isCustom?: boolean;
}

export interface CanvasNodeData extends Record<string, unknown> {
    agentId: string;
    agentName: string;
    category: AgentCategory;
    iconKey: string;
    sponsor: string;
    parameterValues: Record<string, string>;
    executionStatus: NodeExecutionStatus;
    executionResult?: Record<string, unknown>;
    label: string;
}

export interface AmpMessage {
    ampVersion: "1.0";
    flowId: string;
    step: number;
    fromAgent: { id: string; displayName?: string };
    toAgent: { id: string; displayName?: string };
    payload: Record<string, unknown>;
    timestamp: string;
}

export interface ExecutionLogEntry {
    id: string;
    timestamp: Date;
    agentName: string;
    message: string;
    level: "info" | "success" | "error" | "warn";
    ampMessage?: AmpMessage;
    data?: Record<string, unknown>;
}

export interface NegotiationMessage {
    role: "user" | "assistant";
    agentId: string;
    agentName: string;
    content: string;
    timestamp: Date;
}

export interface NegotiationSession {
    sessionId: string;
    participants: string[];
    messages: NegotiationMessage[];
    status: "active" | "resolved" | "failed";
    resolution?: string;
}

export interface PublishAgentFormValues {
    name: string;
    sponsor: string;
    category: AgentCategory;
    description: string;
    endpointUrl: string;
}

export interface PriceFeedResult {
    pair: string;
    price: number;
    updatedAt: string;
    source: "chainlink" | "fallback";
}

export interface FederationResolutionResult {
    address: string;
    accountId: string | null;
    resolved: boolean;
}

export interface OnchainPolicyCheckState {
    status: "idle" | "loading" | "success" | "error";
    mode?: string | null;
    source?: string;
    cacheKey?: string;
    error?: string;
    checkedAt?: string;
}

// Runtime marker to keep this module visible to coverage tooling.
export const TYPES_MODULE_RUNTIME_MARKER = "agentflow-types";
