from PIL import Image, ImageDraw, ImageFont
import math


def create_og_image():
    W, H = 1200, 630
    img = Image.new("RGBA", (W, H), (15, 23, 42, 255))
    d = ImageDraw.Draw(img)

    # Subtle grid
    grid_color = (129, 140, 248, 10)
    for i in range(1, 6):
        x = int(W * i / 6)
        d.line([(x, 0), (x, H)], fill=grid_color, width=1)
    for i in range(1, 5):
        y = int(H * i / 5)
        d.line([(0, y), (W, y)], fill=grid_color, width=1)

    # Radial spotlight (simulate with concentric circles)
    for r in range(300, 0, -3):
        alpha = int(20 * (1 - r / 300))
        c = (99, 102, 241, alpha)
        cx, cy = 300, 300
        d.ellipse([(cx - r, cy - r), (cx + r, cy + r)], fill=c)

    # --- Flow diagram on left side ---
    node_bg = (30, 41, 59)
    node_border = (129, 140, 248)
    cyan_border = (34, 211, 238)
    edge_color = (167, 139, 250, 140)
    dot_color = (167, 139, 250, 200)

    ox, oy = 80, 100  # offset

    # Node 1 (input)
    d.rounded_rectangle(
        [(ox, oy + 40), (ox + 90, oy + 90)],
        radius=12,
        fill=node_bg,
        outline=node_border,
        width=2,
    )
    d.ellipse([(ox + 20, oy + 55), (ox + 36, oy + 71)], outline=node_border, width=2)
    for dx, dy in [(54, 52), (60, 58), (54, 64)]:
        d.ellipse(
            [(ox + dx - 2, oy + dy - 2), (ox + dx + 2, oy + dy + 2)], fill=node_border
        )

    # Edge 1→2
    d.line([(ox + 90, oy + 65), (ox + 140, oy + 65)], fill=edge_color, width=2)
    d.ellipse([(ox + 113, oy + 62), (ox + 119, oy + 68)], fill=dot_color)

    # Node 2 (orchestrator - bigger)
    d.rounded_rectangle(
        [(ox + 140, oy + 20), (ox + 250, oy + 110)],
        radius=14,
        fill=node_bg,
        outline=node_border,
        width=3,
    )
    hx, hy = ox + 195, oy + 56
    hr = 16
    hex_pts = [
        (hx + hr * math.cos(math.radians(a)), hy + hr * math.sin(math.radians(a)))
        for a in range(0, 360, 60)
    ]
    d.polygon(hex_pts, outline=node_border)
    d.ellipse([(hx - 5, hy - 5), (hx + 5, hy + 5)], fill=node_border)
    for a in range(0, 360, 60):
        sx = hx + hr * math.cos(math.radians(a))
        sy = hy + hr * math.sin(math.radians(a))
        ex = hx + (hr + 6) * math.cos(math.radians(a))
        ey = hy + (hr + 6) * math.sin(math.radians(a))
        d.line([(sx, sy), (ex, ey)], fill=dot_color, width=1)

    # Edges from orchestrator to outputs
    d.line([(ox + 250, oy + 45), (ox + 310, oy + 25)], fill=edge_color, width=2)
    d.ellipse([(ox + 278, oy + 32), (ox + 284, oy + 38)], fill=dot_color)
    d.line(
        [(ox + 250, oy + 65), (ox + 310, oy + 65)], fill=(34, 211, 238, 100), width=2
    )
    d.line([(ox + 250, oy + 85), (ox + 310, oy + 105)], fill=edge_color, width=2)
    d.ellipse([(ox + 278, oy + 92), (ox + 284, oy + 98)], fill=dot_color)

    # Node 3a
    d.rounded_rectangle(
        [(ox + 310, oy), (ox + 390, oy + 45)],
        radius=10,
        fill=node_bg,
        outline=cyan_border,
        width=2,
    )
    d.line(
        [(ox + 330, oy + 14), (ox + 322, oy + 22), (ox + 330, oy + 30)],
        fill=cyan_border,
        width=2,
    )
    d.line(
        [(ox + 354, oy + 14), (ox + 362, oy + 22), (ox + 354, oy + 30)],
        fill=cyan_border,
        width=2,
    )

    # Node 3b
    d.rounded_rectangle(
        [(ox + 310, oy + 50), (ox + 390, oy + 95)],
        radius=10,
        fill=node_bg,
        outline=node_border,
        width=2,
    )
    d.rounded_rectangle(
        [(ox + 330, oy + 64), (ox + 350, oy + 78)],
        radius=3,
        outline=node_border,
        width=2,
    )
    d.ellipse([(ox + 344, oy + 68), (ox + 350, oy + 74)], fill=(99, 102, 241))

    # Node 3c
    d.rounded_rectangle(
        [(ox + 310, oy + 100), (ox + 390, oy + 145)],
        radius=10,
        fill=node_bg,
        outline=cyan_border,
        width=2,
    )
    bars_data = [
        (330, 126, 5, 12),
        (338, 122, 5, 16),
        (346, 118, 5, 20),
        (354, 124, 5, 14),
    ]
    for bx, by, bw, bh in bars_data:
        d.rectangle(
            [(ox + bx, oy + by), (ox + bx + bw, oy + by + bh)], fill=cyan_border
        )

    # Ghost nodes (faded)
    d.rounded_rectangle(
        [(ox, oy), (ox + 60, oy + 30)],
        radius=8,
        fill=node_bg,
        outline=(71, 85, 105, 128),
        width=1,
    )
    d.line([(ox + 60, oy + 15), (ox + 78, oy + 40)], fill=(71, 85, 105, 100), width=1)

    d.rounded_rectangle(
        [(ox + 60, oy + 140), (ox + 130, oy + 175)],
        radius=8,
        fill=node_bg,
        outline=(71, 85, 105, 128),
        width=1,
    )
    d.line(
        [(ox + 130, oy + 157), (ox + 170, oy + 110)], fill=(71, 85, 105, 100), width=1
    )

    # --- Right side: Text ---
    # "AgentFlow" title
    try:
        title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 72)
        sub_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
        detail_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16)
        tag_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 13)
        bottom_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 13)
    except:
        title_font = ImageFont.load_default()
        sub_font = title_font
        detail_font = title_font
        tag_font = title_font
        bottom_font = title_font

    tx = 560
    d.text((tx, 120), "Agent", fill=(255, 255, 255), font=title_font)
    d.text((tx, 195), "Flow", fill=(129, 140, 248), font=title_font)

    # Accent line
    d.line([(tx, 290), (tx + 140, 290)], fill=(129, 140, 248), width=3)

    # Subtitle
    d.text(
        (tx, 310), "Web3 Multi-Agent Orchestrator", fill=(148, 163, 184), font=sub_font
    )

    # Detail
    d.text(
        (tx, 355),
        "43 agents  ·  23 protocols  ·  Zero code",
        fill=(100, 116, 139),
        font=detail_font,
    )

    # Tag pills
    tags = [
        ("DeFi", node_border),
        ("NFT", node_border),
        ("Identity", cyan_border),
        ("Governance", cyan_border),
        ("Analytics", node_border),
    ]
    tag_x = tx
    for tag_text, tag_color in tags:
        tw = len(tag_text) * 8 + 20
        d.rounded_rectangle(
            [(tag_x, 400), (tag_x + tw, 428)],
            radius=14,
            fill=node_bg,
            outline=tag_color,
            width=1,
        )
        d.text((tag_x + 10, 407), tag_text, fill=tag_color, font=tag_font)
        tag_x += tw + 10

    # Bottom bar
    d.rectangle([(0, 590), (W, H)], fill=(15, 23, 42, 153))
    d.text(
        (480, 605), "THE SYNTHESIS HACKATHON 2026", fill=(71, 85, 105), font=bottom_font
    )

    return img


og = create_og_image()
og.save("public/og-image.png", "PNG")
print(f"og-image.png created ({og.size[0]}x{og.size[1]})")
