import { NextRequest, NextResponse } from "next/server";

// Backward-compatible path. This route now resolves Stellar federation addresses.
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const names = searchParams.get("names")?.split(",").map((n) => n.trim()).filter(Boolean) || [];

    if (names.length === 0) {
        return NextResponse.json({ success: false, error: "No federation addresses provided" }, { status: 400 });
    }

    const data = await Promise.all(
        names.map(async (name) => {
            if (!name.includes("*")) {
                return {
                    address: name,
                    accountId: null,
                    resolved: false,
                    error: "Expected federation format user*domain.com",
                };
            }

            const [user, domain] = name.split("*");
            if (!user || !domain) {
                return {
                    address: name,
                    accountId: null,
                    resolved: false,
                    error: "Invalid federation format",
                };
            }

            try {
                const tomlRes = await fetch(`https://${domain}/.well-known/stellar.toml`);
                if (!tomlRes.ok) {
                    throw new Error("stellar.toml unavailable");
                }
                const toml = await tomlRes.text();
                const match = toml.match(/^FEDERATION_SERVER\s*=\s*"([^"]+)"/m);
                if (!match) {
                    throw new Error("FEDERATION_SERVER missing");
                }

                const fedServer = match[1];
                const fedRes = await fetch(`${fedServer}?q=${encodeURIComponent(name)}&type=name`);
                if (!fedRes.ok) {
                    throw new Error(`federation server returned ${fedRes.status}`);
                }
                const payload = (await fedRes.json()) as { account_id?: string };

                return {
                    address: name,
                    accountId: payload.account_id || null,
                    resolved: Boolean(payload.account_id),
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : "resolution failed";
                return {
                    address: name,
                    accountId: null,
                    resolved: false,
                    error: message,
                };
            }
        })
    );

    return NextResponse.json({ success: true, data });
}
