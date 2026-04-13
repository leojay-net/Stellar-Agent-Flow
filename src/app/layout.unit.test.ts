import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import RootLayout, { metadata } from "@/app/layout";

describe("app layout", () => {
    it("exports stellar metadata", () => {
        expect(metadata.title).toContain("Stellar");
        expect(metadata.openGraph?.siteName).toBe("AgentFlow");
        expect(metadata.twitter?.card).toBe("summary_large_image");
    });

    it("renders html and body wrappers", () => {
        const html = renderToStaticMarkup(
            React.createElement(
                RootLayout,
                { children: React.createElement("div", null, "child") },
            ),
        );

        expect(html).toContain("<html");
        expect(html).toContain("lang=\"en\"");
        expect(html).toContain("antialiased");
        expect(html).toContain("child");
    });
});
