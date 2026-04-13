"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Square, Download, Upload, Trash2, LayoutTemplate, PlusCircle, MessageSquare, Activity } from "lucide-react";
import { requestAccess, signMessage, getNetwork } from "@stellar/freighter-api";
import { useFlowStore } from "@/store/flow-store";
import { useActivityStore } from "@/store/activity-store";
import { cn } from "@/lib/utils";

type WalletKitSdk = {
    StellarWalletsKit: {
        init: (params: { modules: unknown[] }) => void;
        authModal: () => Promise<{ address: string }>;
        signMessage: (message: string, opts?: { address?: string; networkPassphrase?: string }) => Promise<{ signedMessage?: Uint8Array | string | null }>;
    };
    defaultModules: () => unknown[];
};

export default function Toolbar() {
    const {
        flowName,
        flowStatus,
        nodes,
        setFlowName,
        stopFlow,
        exportFlow,
        clearCanvas,
        loadDemoFlow,
        setPublishModalOpen,
        toggleLog,
        isLogVisible,
        setPipelineTriggerOpen,
        isChatOpen,
        setChatOpen,
        connectedAddress,
        setConnectedAddress,
        authSessionToken,
        authExpiresAt,
        setAuthSession,
        hydrateClientSession,
    } = useFlowStore();

    const [walletBusy, setWalletBusy] = useState(false);
    const [authBusy, setAuthBusy] = useState(false);
    const [walletError, setWalletError] = useState<string | null>(null);
    const [walletProvider, setWalletProvider] = useState<string>("manual");
    const walletKitReadyRef = useRef(false);

    const { isActivityOpen, toggleActivity, transactions } = useActivityStore();
    const pendingTxCount = transactions.filter((t) => t.phase === "pending" || t.phase === "awaiting_signature").length;

    const isRunning = flowStatus === "running";

    useEffect(() => {
        hydrateClientSession();
    }, [hydrateClientSession]);

    // On mount only: validate any session token that was hydrated from localStorage.
    // We do NOT re-run this when authSessionToken changes, because a freshly-obtained
    // token (from signInWithStellar) is already valid — re-verifying it immediately
    // would race against the server-side store and clear the session erroneously.
    const didMountVerify = useRef(false);
    useEffect(() => {
        if (didMountVerify.current) return;
        didMountVerify.current = true;
        const verify = async () => {
            if (!authSessionToken) return;
            const res = await fetch("/api/auth/stellar/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionToken: authSessionToken, publicKey: connectedAddress }),
            });
            if (!res.ok) {
                setAuthSession(null);
            }
        };
        verify().catch(() => setAuthSession(null));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally empty — run once on mount to validate any hydrated session

    const getWalletKit = async (): Promise<WalletKitSdk> => {
        const sdkMod = await import("@creit.tech/stellar-wallets-kit/sdk");
        const modulesMod = await import("@creit.tech/stellar-wallets-kit/modules/utils");

        const StellarWalletsKit = (sdkMod as { StellarWalletsKit: WalletKitSdk["StellarWalletsKit"] }).StellarWalletsKit;
        const defaultModules = (modulesMod as { defaultModules: WalletKitSdk["defaultModules"] }).defaultModules;

        if (!walletKitReadyRef.current) {
            StellarWalletsKit.init({ modules: defaultModules() });
            walletKitReadyRef.current = true;
        }

        return { StellarWalletsKit, defaultModules };
    };

    const bytesToBase64 = (bytes: Uint8Array) => {
        let binary = "";
        for (let i = 0; i < bytes.length; i += 1) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    };

    const connectFreighter = async () => {
        setWalletError(null);
        setWalletBusy(true);
        try {
            const access = await requestAccess();
            if (access.error || !access.address) {
                throw new Error(access.error?.message || "Failed to connect Freighter wallet");
            }
            setConnectedAddress(access.address);
            setWalletProvider("freighter");
            // Auto sign-in right after connecting
            setTimeout(() => signInWithStellarFor(access.address, "freighter"), 50);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Wallet connection failed";
            setWalletError(message);
        } finally {
            setWalletBusy(false);
        }
    };

    const connectWalletKit = async () => {
        setWalletError(null);
        setWalletBusy(true);
        try {
            const { StellarWalletsKit } = await getWalletKit();
            const result = await StellarWalletsKit.authModal();
            if (!result.address) {
                throw new Error("Wallet kit did not return an address");
            }
            setConnectedAddress(result.address);
            setWalletProvider("wallet-kit");
            // Auto sign-in right after connecting
            setTimeout(() => signInWithStellarFor(result.address, "wallet-kit"), 50);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Wallet kit connection failed";
            setWalletError(message);
        } finally {
            setWalletBusy(false);
        }
    };

    const signWithConnectedWallet = async (message: string) => {
        if (!connectedAddress) {
            throw new Error("Connect wallet first");
        }

        // Try wallet-kit signature first if used, then fallback to Freighter directly.
        if (walletProvider === "wallet-kit") {
            try {
                const { StellarWalletsKit } = await getWalletKit();
                const signRes = await StellarWalletsKit.signMessage(message, { address: connectedAddress });
                if (signRes?.signedMessage) {
                    return typeof signRes.signedMessage === "string"
                        ? signRes.signedMessage
                        : bytesToBase64(new Uint8Array(signRes.signedMessage));
                }
            } catch {
                // Continue to Freighter fallback.
            }
        }

        const signRes = await signMessage(message, { address: connectedAddress });
        if (signRes.error || !signRes.signedMessage) {
            throw new Error(signRes.error?.message || "Wallet did not return a signature");
        }
        return typeof signRes.signedMessage === "string"
            ? signRes.signedMessage
            : bytesToBase64(new Uint8Array(signRes.signedMessage));
    };

    // Core sign-in logic — accepts explicit address+provider so it can be called
    // immediately after wallet connect (before React state has updated).
    const signInWithStellarFor = async (address: string, provider: string) => {
        setWalletError(null);
        setAuthBusy(true);
        try {
            const challengeRes = await fetch("/api/auth/stellar/challenge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ publicKey: address }),
            });
            const challengePayload = await challengeRes.json();
            if (!challengeRes.ok || !challengePayload.success) {
                throw new Error(challengePayload.error || "Failed to create auth challenge");
            }

            // Sign with the wallet — provider is explicit here (not from stale state)
            let signature: string;

            // Detect the network Freighter is on so we pass the matching passphrase.
            // Without this, Freighter (on testnet) refuses to sign a "mainnet" request.
            let freighterNetworkPassphrase: string | undefined;
            try {
                const net = await getNetwork();
                freighterNetworkPassphrase = net.networkPassphrase ?? undefined;
            } catch { /* non-fatal */ }

            if (provider === "wallet-kit") {
                try {
                    const { StellarWalletsKit } = await getWalletKit();
                    const signRes = await StellarWalletsKit.signMessage(challengePayload.message, { address, networkPassphrase: freighterNetworkPassphrase });
                    if (!signRes?.signedMessage) throw new Error("No signature returned");
                    signature = typeof signRes.signedMessage === "string"
                        ? signRes.signedMessage
                        : bytesToBase64(new Uint8Array(signRes.signedMessage));
                } catch {
                    // Fallback to Freighter direct
                    const signRes = await signMessage(challengePayload.message, { address, networkPassphrase: freighterNetworkPassphrase });
                    if (signRes.error || !signRes.signedMessage) throw new Error(signRes.error?.message || "Wallet did not return a signature");
                    signature = typeof signRes.signedMessage === "string"
                        ? signRes.signedMessage
                        : bytesToBase64(new Uint8Array(signRes.signedMessage));
                }
            } else {
                const signRes = await signMessage(challengePayload.message, { address, networkPassphrase: freighterNetworkPassphrase });
                if (signRes.error || !signRes.signedMessage) throw new Error(signRes.error?.message || "Wallet did not return a signature");
                signature = typeof signRes.signedMessage === "string"
                    ? signRes.signedMessage
                    : bytesToBase64(new Uint8Array(signRes.signedMessage));
            }

            const verifyRes = await fetch("/api/auth/stellar/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ publicKey: address, nonce: challengePayload.nonce, message: challengePayload.message, signature }),
            });
            const verifyPayload = await verifyRes.json();
            if (!verifyRes.ok || !verifyPayload.success) {
                throw new Error(verifyPayload.error || "Signature verification failed");
            }

            setAuthSession({ token: verifyPayload.sessionToken, expiresAt: verifyPayload.expiresAt });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Stellar sign-in failed";
            setWalletError(message);
            setAuthSession(null);
        } finally {
            setAuthBusy(false);
        }
    };

    const signInWithStellar = () => {
        if (!connectedAddress) { setWalletError("Connect wallet first"); return; }
        signInWithStellarFor(connectedAddress, walletProvider);
    };

    return (
        <div className="h-12 bg-[#27272a] border-b border-zinc-800 flex items-center px-4 gap-3 flex-shrink-0">
            {/* Brand */}
            <span className="text-[13px] font-semibold text-zinc-100 mr-2 whitespace-nowrap">
                AgentFlow
            </span>
            <div className="w-px h-5 bg-zinc-700" />

            {/* Flow name */}
            <input
                type="text"
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                className="bg-transparent text-[13px] text-zinc-300 border-none outline-none w-40 placeholder:text-zinc-600"
                placeholder="Flow name…"
            />

            <div className="flex-1" />

            {/* Node count badge */}
            <span className="text-[11px] text-zinc-500 hidden sm:inline">
                {nodes.length} node{nodes.length !== 1 ? "s" : ""}
            </span>

            <div className="w-px h-5 bg-zinc-700 hidden sm:block" />

            {/* Load demo */}
            <button
                onClick={loadDemoFlow}
                title="Load demo flow"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded transition-colors"
            >
                <LayoutTemplate size={13} />
                <span className="hidden sm:inline">Demo</span>
            </button>

            {/* Clear canvas */}
            <button
                onClick={clearCanvas}
                title="Clear canvas"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded transition-colors"
            >
                <Trash2 size={13} />
            </button>

            {/* Import */}
            <label className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded transition-colors cursor-pointer" title="Import flow AMP JSON">
                <Upload size={13} />
                <span className="hidden sm:inline">Import</span>
                <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (re) => {
                                const content = re.target?.result as string;
                                useFlowStore.getState().importFlow(content);
                            };
                            reader.readAsText(file);
                        }
                        e.target.value = ""; // reset
                    }}
                />
            </label>

            {/* Export */}
            <button
                onClick={exportFlow}
                title="Export flow as AMP JSON"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded transition-colors"
            >
                <Download size={13} />
                <span className="hidden sm:inline">Export</span>
            </button>

            <div className="w-px h-5 bg-zinc-700" />

            {/* Publish agent */}
            <button
                onClick={() => setPublishModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded transition-colors"
            >
                <PlusCircle size={13} />
                <span className="hidden sm:inline">Publish Agent</span>
            </button>

            {/* Log toggle */}
            <button
                onClick={toggleLog}
                className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] rounded transition-colors",
                    isLogVisible
                        ? "text-blue-400 bg-blue-500/10"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
                )}
            >
                Logs
            </button>

            {/* Chat toggle */}
            <button
                onClick={() => setChatOpen(!isChatOpen)}
                className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] rounded transition-colors",
                    isChatOpen
                        ? "text-violet-400 bg-violet-500/10"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
                )}
            >
                <MessageSquare size={13} />
                <span className="hidden sm:inline">Chat</span>
            </button>

            {/* Activity toggle */}
            <button
                onClick={toggleActivity}
                className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] rounded transition-colors relative",
                    isActivityOpen
                        ? "text-emerald-400 bg-emerald-500/10"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
                )}
            >
                <Activity size={13} />
                <span className="hidden sm:inline">Activity</span>
                {pendingTxCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                        {pendingTxCount}
                    </span>
                )}
            </button>

            <div className="w-px h-5 bg-zinc-700" />

            {/* Stellar account + auth */}
            <div className="flex items-center gap-2">
                <input
                    value={connectedAddress ?? ""}
                    onChange={(e) => setConnectedAddress(e.target.value.trim() || null)}
                    placeholder="Stellar account (G...)"
                    className="w-44 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-blue-500"
                />
                <button
                    onClick={connectWalletKit}
                    disabled={walletBusy}
                    className="px-2 py-1 text-[11px] rounded border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-60"
                >
                    {walletBusy ? "Connecting..." : "Wallets"}
                </button>
                <button
                    onClick={connectFreighter}
                    disabled={walletBusy}
                    className="px-2 py-1 text-[11px] rounded border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-60"
                >
                    {walletBusy ? "Connecting..." : "Freighter"}
                </button>
                <button
                    onClick={signInWithStellar}
                    disabled={authBusy || !connectedAddress}
                    className={cn(
                        "px-2 py-1 text-[11px] rounded border disabled:opacity-60",
                        authSessionToken
                            ? "border-emerald-700 bg-emerald-900/20 text-emerald-300"
                            : "border-blue-700 bg-blue-900/20 text-blue-300"
                    )}
                >
                    {authBusy ? "Signing..." : authSessionToken ? "Signed In" : "Sign In"}
                </button>
            </div>

            {walletError && (
                <div className="text-[10px] text-red-400 max-w-56 truncate" title={walletError ?? undefined}>
                    {walletError}
                </div>
            )}
            {!walletError && authExpiresAt && (
                <div className="hidden lg:block text-[10px] text-zinc-500 max-w-56 truncate">
                    Session: {new Date(authExpiresAt!).toLocaleTimeString()}
                </div>
            )}

            <div className="w-px h-5 bg-zinc-700" />

            {/* Run / Stop */}
            {isRunning ? (
                <button
                    onClick={stopFlow}
                    className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
                >
                    <Square size={12} />
                    Stop
                </button>
            ) : (
                <button
                    onClick={() => setPipelineTriggerOpen(true)}
                    disabled={nodes.length === 0}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium rounded transition-colors",
                        nodes.length === 0
                            ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-500 text-white"
                    )}
                >
                    <Play size={12} />
                    Run Flow
                </button>
            )}

            {/* Status indicator */}
            <div className="flex items-center gap-1.5 ml-1">
                <div
                    className={cn(
                        "w-2 h-2 rounded-full",
                        flowStatus === "idle" && "bg-zinc-600",
                        flowStatus === "running" && "bg-blue-500 animate-pulse",
                        flowStatus === "completed" && "bg-emerald-500",
                        flowStatus === "error" && "bg-red-500"
                    )}
                />
                <span className="text-[11px] text-zinc-500 capitalize hidden sm:inline">{flowStatus}</span>
            </div>
        </div>
    );
}
