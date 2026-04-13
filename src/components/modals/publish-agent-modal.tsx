"use client";

import { useState } from "react";
import { X, ChevronDown, Copy, Check } from "lucide-react";
import { useFlowStore } from "@/store/flow-store";
import { AGENT_CATEGORIES } from "@/data/agent-registry";
import type { PublishAgentFormValues, AgentCategory } from "@/types";
import { cn } from "@/lib/utils";

const DEFAULT_FORM: PublishAgentFormValues = {
    name: "",
    sponsor: "",
    category: "core",
    description: "",
    endpointUrl: "",
};

export default function PublishAgentModal() {
    const { isPublishModalOpen, setPublishModalOpen, addAgentToCanvas } = useFlowStore();
    const [form, setForm] = useState<PublishAgentFormValues>(DEFAULT_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [published, setPublished] = useState<{ id: string; endpoint: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    if (!isPublishModalOpen) return null;

    const handleClose = () => {
        setPublishModalOpen(false);
        setForm(DEFAULT_FORM);
        setPublished(null);
        setError(null);
        setCopied(false);
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.name.trim() || !form.description.trim()) {
            setError("Name and description are required.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // POST to the real local agent registry
            const response = await fetch("/api/agents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name.trim(),
                    sponsor: form.sponsor.trim() || "Community",
                    category: form.category,
                    description: form.description.trim(),
                    endpointUrl: form.endpointUrl.trim() || undefined,
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error ?? `Server error ${response.status}`);
            }

            const { agent } = await response.json();

            // Add to canvas immediately
            addAgentToCanvas(agent);

            // Notify sidebar to refresh community agents list
            window.dispatchEvent(new CustomEvent("agentflow:agent-published"));

            setPublished({
                id: agent.id,
                endpoint: `${window.location.origin}/api/agents/${agent.id}`,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to publish agent.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60" onClick={handleClose} />

            {/* Modal */}
            <div className="relative bg-[#27272a] border border-zinc-700 rounded-lg w-[440px] max-w-[95vw] shadow-xl">
                {/* Header */}
                <div className="flex items-center px-5 py-3.5 border-b border-zinc-700">
                    <span className="text-[14px] font-semibold text-zinc-100">Publish Agent</span>
                    <div className="flex-1" />
                    <button
                        onClick={handleClose}
                        className="text-zinc-500 hover:text-zinc-300 p-1 rounded transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {published ? (
                    /* Success state */
                    <div className="px-5 py-6">
                        <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
                            <div className="w-4 h-4 bg-emerald-500 rounded-full" />
                        </div>
                        <h3 className="text-[14px] font-medium text-zinc-100 text-center mb-1">Agent Published</h3>
                        <p className="text-[12px] text-zinc-500 text-center mb-5">
                            <span className="text-zinc-300 font-medium">{form.name}</span> is live and added to your canvas.
                            Other agents and flows can call it at:
                        </p>
                        <div className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 flex items-center gap-2 mb-2">
                            <code className="text-[11px] text-blue-400 flex-1 truncate">{published.endpoint}</code>
                            <button
                                onClick={() => handleCopy(published.endpoint)}
                                className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
                                title="Copy endpoint"
                            >
                                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                            </button>
                        </div>
                        <p className="text-[10px] text-zinc-600 text-center mb-5">
                            Accepts AMP 1.0 POST or flat JSON params. Check the Community section in the sidebar.
                        </p>
                        <div className="flex justify-center">
                            <button
                                onClick={handleClose}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-medium rounded transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Form */
                    <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] text-zinc-400 mb-1">
                                    Agent Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="My Custom Agent"
                                    className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-[12px] rounded px-2.5 py-1.5 outline-none focus:border-blue-500 transition-colors"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] text-zinc-400 mb-1">Sponsor / Protocol</label>
                                <input
                                    type="text"
                                    value={form.sponsor}
                                    onChange={(e) => setForm((f) => ({ ...f, sponsor: e.target.value }))}
                                    placeholder="Protocol name"
                                    className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-[12px] rounded px-2.5 py-1.5 outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] text-zinc-400 mb-1">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                placeholder="What does this agent do?"
                                rows={2}
                                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-[12px] rounded px-2.5 py-1.5 outline-none focus:border-blue-500 transition-colors resize-none"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] text-zinc-400 mb-1">Category</label>
                                <div className="relative">
                                    <select
                                        value={form.category}
                                        onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as AgentCategory }))}
                                        className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-[12px] rounded px-2.5 py-1.5 appearance-none outline-none focus:border-blue-500 transition-colors"
                                    >
                                        {AGENT_CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
                                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] text-zinc-400 mb-1">Endpoint URL</label>
                                <input
                                    type="text"
                                    value={form.endpointUrl}
                                    onChange={(e) => setForm((f) => ({ ...f, endpointUrl: e.target.value }))}
                                    placeholder="https://… (optional)"
                                    className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-[12px] rounded px-2.5 py-1.5 outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="text-[10px] text-zinc-600 bg-zinc-800/50 rounded px-3 py-2">
                            Your agent will be published to the Community section and become callable via
                            <span className="text-zinc-500"> /api/agents/&#123;id&#125;</span> — accessible to any flow on this platform.
                        </div>

                        {error && (
                            <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
                                {error}
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-1">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-4 py-1.5 text-[12px] text-zinc-400 hover:text-zinc-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={cn(
                                    "px-4 py-1.5 text-[12px] font-medium rounded transition-colors",
                                    isSubmitting
                                        ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                                        : "bg-blue-600 hover:bg-blue-500 text-white"
                                )}
                            >
                                {isSubmitting ? "Publishing…" : "Publish Agent"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
