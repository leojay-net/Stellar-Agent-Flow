"use client";

// ============================================================
// AgentFlow — Main Application Page
// ============================================================

import { ReactFlowProvider } from "@xyflow/react";
import RegistrySidebar from "@/components/registry/registry-sidebar";
import FlowCanvas from "@/components/canvas/flow-canvas";
import InspectorPanel from "@/components/inspector/inspector-panel";
import ActivityPanel from "@/components/canvas/activity-panel";
import Toolbar from "@/components/canvas/toolbar";
import ExecutionLog from "@/components/canvas/execution-log";
import PublishAgentModal from "@/components/modals/publish-agent-modal";
import PipelineTriggerModal from "@/components/canvas/pipeline-trigger-modal";
import ChatPanel from "@/components/canvas/chat-panel";

export default function HomePage() {
  return (
    <ReactFlowProvider>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-white">
        <Toolbar />
        <div className="flex flex-1 overflow-hidden">
          <RegistrySidebar />
          <main className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <FlowCanvas />
            </div>
            <ExecutionLog />
          </main>
          <InspectorPanel />
          <ActivityPanel />
        </div>
        <PublishAgentModal />
        <PipelineTriggerModal />
        <ChatPanel />
      </div>
    </ReactFlowProvider>
  );
}
