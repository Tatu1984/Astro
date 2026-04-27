"""User web portal wireframe — 6 screens in a 3×2 grid.

Screens
-------
1. Dashboard (today)
2. Chart Workspace (interactive wheel + tabs)
3. Predictions (D/W/M/Y)
4. AI Chat with Chart
5. Compatibility (Synastry)
6. Profile + Subscription
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _wf import *

OUT = "/Users/sudipto/Desktop/projects/astro/docs/design/wireframes/02_user_web.jpg"

fig, ax = setup_axes((24, 28), (0, 24), (0, 28), bg="#ffffff")
title_block(ax, 0.5, 27.3,
            "02 · User Web Portal (Next.js 16)",
            "Six core screens · sidebar shell · astro-themed dark surface")
legend_block(ax, 18.0, 27.3)

# Grid: 3 cols × 2 rows of web frames. Each frame ~7.4 wide × 11 tall.
COLS, ROWS = 3, 2
FRAME_W, FRAME_H = 7.4, 11.6
GAP_X, GAP_Y = 0.4, 1.7
LEFT, BOTTOM = 0.5, 1.5

def draw_sidebar(ix, iy, ih, items, active_idx, *, dark=True):
    """Draw a left sidebar inside an inner area. Returns (sx, sw) consumed."""
    sw = 1.40
    panel(ax, ix, iy, sw, ih, "#170f2c" if dark else "#ece6fa", radius=0.10)
    label(ax, ix + 0.18, iy + ih - 0.30, "✦", size=11, color=PAL["gold"], dark=dark)
    label(ax, ix + 0.40, iy + ih - 0.30, "Astro", size=9, weight="bold",
          color="white" if dark else "#1a1530", dark=dark)
    for i, it in enumerate(items):
        y = iy + ih - 0.85 - i * 0.45
        if i == active_idx:
            panel(ax, ix + 0.10, y - 0.18, sw - 0.20, 0.36, PAL["violet"], radius=0.08)
        label(ax, ix + 0.30, y, it,
              size=7.5,
              color="white" if (dark or i == active_idx) else "#1a1530",
              weight="bold" if i == active_idx else "normal",
              dark=dark)
    return sw

def screen(col, row, num, name, drawer):
    fx = LEFT + col * (FRAME_W + GAP_X)
    fy = BOTTOM + (ROWS - 1 - row) * (FRAME_H + GAP_Y)
    ix, iy, iw, ih = web_frame(ax, fx, fy, FRAME_W, FRAME_H, title=f"app.astro.app/{name.lower().replace(' ', '-')}")
    drawer(ix, iy, iw, ih)
    caption(ax, fx + 0.12, fy, FRAME_W, FRAME_H, num, name, "USER")

NAV = ["Today", "Charts", "Predictions", "AI Chat", "Compatibility", "Calendar", "Reports", "Community", "Profile", "Billing"]

# === 1. Dashboard ===
def s1(ix, iy, iw, ih):
    sw = draw_sidebar(ix, iy, ih, NAV, active_idx=0)
    cx0 = ix + sw + 0.10; cw = iw - sw - 0.20
    # top bar
    panel(ax, cx0, iy + ih - 0.55, cw, 0.45, PAL["card_dark"], radius=0.08)
    label(ax, cx0 + 0.15, iy + ih - 0.32, "Good morning, Maya", size=9.5, weight="bold", color="white", dark=True)
    avatar(ax, cx0 + cw - 0.30, iy + ih - 0.32, r=0.16)
    chip(ax, cx0 + cw - 1.40, iy + ih - 0.32, "shadcn:Avatar", PAL["violet"])
    # hero card with chart wheel preview
    card(ax, cx0, iy + ih - 4.30, cw * 0.55, 3.55, accent=PAL["gold"])
    chart_wheel(ax, cx0 + 1.20, iy + ih - 2.60, 1.05)
    label(ax, cx0 + 2.60, iy + ih - 1.40, "Today, 26 Apr", size=7.5, color=PAL["muted"], dark=True)
    label(ax, cx0 + 2.60, iy + ih - 1.75, "Moon trine your Sun", size=10, weight="bold", color="white", dark=True)
    label(ax, cx0 + 2.60, iy + ih - 2.10, "A flowing day for", size=8.5, color="#cfc6f5", dark=True)
    label(ax, cx0 + 2.60, iy + ih - 2.35, "communication & creative work.", size=8.5, color="#cfc6f5", dark=True)
    panel(ax, cx0 + 2.60, iy + ih - 3.50, 1.5, 0.40, PAL["gold"], radius=0.10)
    label(ax, cx0 + 3.35, iy + ih - 3.30, "Read full →", size=7.5, weight="bold", color="#1a1530", ha="center", dark=False)
    chip(ax, cx0 + 0.10, iy + ih - 4.45, "reactbits:SpotlightCard", PAL["gold"])
    # right column tiles: dashas, transit, streak
    rx = cx0 + cw * 0.57; rw = cw - cw * 0.57 - 0.05
    for i, (t, sub) in enumerate([("Vimshottari Dasha", "Saturn / Mercury — 4y left"),
                                   ("Next big transit", "Jupiter conj Sun · 12 May"),
                                   ("Reading streak", "23 days · keep going!")]):
        card(ax, rx, iy + ih - 1.60 - i * 1.10, rw, 1.0, accent=PAL["violet"])
        label(ax, rx + 0.18, iy + ih - 1.05 - i * 1.10, t, size=8.5, weight="bold", color="white", dark=True)
        label(ax, rx + 0.18, iy + ih - 1.40 - i * 1.10, sub, size=7.5, color="#cfc6f5", dark=True)
    chip(ax, rx, iy + ih - 4.85, "reactbits:MagicBento (tiles)", PAL["gold"])
    # tabs row + horoscope cards
    panel(ax, cx0, iy + ih - 5.15, cw, 0.40, PAL["card_dark"], radius=0.08)
    for i, t in enumerate(["Daily", "Weekly", "Monthly", "Yearly"]):
        if i == 0:
            panel(ax, cx0 + 0.10 + i * 1.0, iy + ih - 5.10, 0.95, 0.30, PAL["violet"], radius=0.06)
        label(ax, cx0 + 0.55 + i * 1.0, iy + ih - 4.95, t, size=7.5,
              weight="bold" if i == 0 else "normal",
              color="white" if i == 0 else "#cfc6f5", ha="center", dark=True)
    chip(ax, cx0, iy + ih - 5.45, "shadcn:Tabs", PAL["violet"])
    # 3 horoscope mini-cards
    for i, t in enumerate(["Career", "Love", "Health"]):
        bx = cx0 + i * (cw / 3 + 0.0); bw = cw / 3 - 0.10
        card(ax, bx, iy + 0.4, bw, 4.3)
        label(ax, bx + 0.20, iy + 4.30, t, size=10, weight="bold", color=PAL["gold"], dark=True)
        for j in range(6):
            panel(ax, bx + 0.20, iy + 3.85 - j * 0.35, bw - 0.40, 0.20, "#332b56", radius=0.04)
        sparkline(ax, bx + 0.20, iy + 0.6, bw - 0.40, 0.6, color=PAL["aqua"], seed=i)
    chip(ax, cx0, iy + 0.05, "shadcn:Card · ScrollArea", PAL["violet"])

# === 2. Chart Workspace ===
def s2(ix, iy, iw, ih):
    sw = draw_sidebar(ix, iy, ih, NAV, active_idx=1)
    cx0 = ix + sw + 0.10; cw = iw - sw - 0.20
    panel(ax, cx0, iy + ih - 0.55, cw, 0.45, PAL["card_dark"], radius=0.08)
    label(ax, cx0 + 0.15, iy + ih - 0.32, "Maya · Natal · Vedic", size=9, weight="bold", color="white", dark=True)
    chip(ax, cx0 + 2.40, iy + ih - 0.32, "shadcn:Combobox profile", PAL["violet"])
    chip(ax, cx0 + 4.35, iy + ih - 0.32, "shadcn:Select House", PAL["violet"])
    # wheel area
    card(ax, cx0, iy + 4.2, cw * 0.62, ih - 5.0, accent=PAL["gold"])
    chart_wheel(ax, cx0 + cw * 0.31, iy + ih * 0.55, 1.95)
    chip(ax, cx0 + 0.10, iy + 4.05, "custom: SVG ChartWheel + D3 zoom", "#5a4d8c")
    # tabs above wheel
    for i, t in enumerate(["D1 Rasi", "D9 Navamsa", "D10", "D12", "D60", "Transits"]):
        panel(ax, cx0 + 0.20 + i * 0.85, iy + ih - 1.20, 0.80, 0.30,
              PAL["violet"] if i == 0 else PAL["card_dark"], radius=0.06)
        label(ax, cx0 + 0.60 + i * 0.85, iy + ih - 1.05, t, size=6.5, weight="bold",
              color="white", ha="center", dark=True)
    # right panel — planets / aspects
    rx = cx0 + cw * 0.63; rw = cw - cw * 0.63 - 0.03
    card(ax, rx, iy + ih - 5.3, rw, 4.7)
    label(ax, rx + 0.15, iy + ih - 0.95, "Planets", size=9, weight="bold", color=PAL["gold"], dark=True)
    for i in range(8):
        y = iy + ih - 1.25 - i * 0.42
        avatar(ax, rx + 0.30, y, r=0.10, color=PAL["violet"])
        label(ax, rx + 0.55, y, ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Rahu"][i], size=7.5, color="white", dark=True)
        label(ax, rx + rw - 0.15, y, ["Aries 12°","Cancer 04°","Pisces 28°","Taurus 09°","Leo 17°","Sag 22°","Aqua 03°","Gem 14°"][i],
              size=7, color="#cfc6f5", ha="right", dark=True)
    chip(ax, rx, iy + ih - 5.5, "shadcn:Table virtual scroll", PAL["violet"])
    # bottom: aspect grid + dashas
    card(ax, cx0, iy + 0.4, cw * 0.62, 3.6)
    label(ax, cx0 + 0.20, iy + 3.65, "Aspect grid", size=9, weight="bold", color=PAL["gold"], dark=True)
    for r in range(8):
        for c in range(8):
            color = ["#5b8def","#3ad6c2","#f4c95d","#ff6b8a","#7c5cff"][(r+c)%5]
            panel(ax, cx0 + 0.30 + c * 0.40, iy + 0.6 + r * 0.36, 0.34, 0.30, color, radius=0.04, alpha=0.65)
    chip(ax, cx0, iy + 0.10, "custom: AspectGrid heatmap", "#5a4d8c")
    card(ax, rx, iy + 0.4, rw, 3.6)
    label(ax, rx + 0.15, iy + 3.65, "Vimshottari Dasha", size=9, weight="bold", color=PAL["gold"], dark=True)
    for i in range(6):
        bar(ax, rx + 0.20, iy + 3.20 - i * 0.45, [1.6, 0.9, 1.2, 1.4, 0.7, 1.0][i], 0.30, PAL["violet"])
        label(ax, rx + 0.20, iy + 3.35 - i * 0.45, ["Sat 19y","Mer 17y","Ket 7y","Ven 20y","Sun 6y","Moo 10y"][i], size=7, color="white", dark=True)
    chip(ax, rx, iy + 0.10, "shadcn:Progress + Tooltip", PAL["violet"])

# === 3. Predictions ===
def s3(ix, iy, iw, ih):
    sw = draw_sidebar(ix, iy, ih, NAV, active_idx=2)
    cx0 = ix + sw + 0.10; cw = iw - sw - 0.20
    panel(ax, cx0, iy + ih - 0.55, cw, 0.45, PAL["card_dark"], radius=0.08)
    label(ax, cx0 + 0.15, iy + ih - 0.32, "Predictions · Yearly", size=9, weight="bold", color="white", dark=True)
    # tab bar
    for i, t in enumerate(["Daily", "Weekly", "Monthly", "Yearly", "Transits", "Dashas"]):
        if i == 3:
            panel(ax, cx0 + 0.10 + i * 0.92, iy + ih - 1.10, 0.85, 0.34, PAL["violet"], radius=0.06)
        label(ax, cx0 + 0.52 + i * 0.92, iy + ih - 0.93, t, size=7.5,
              weight="bold" if i == 3 else "normal",
              color="white" if i == 3 else "#cfc6f5", ha="center", dark=True)
    chip(ax, cx0, iy + ih - 1.40, "shadcn:Tabs · Calendar · DateRangePicker", PAL["violet"])
    # timeline
    card(ax, cx0, iy + 5.0, cw, ih - 6.7)
    label(ax, cx0 + 0.20, iy + ih - 1.85, "Year 2026 timeline", size=10, weight="bold", color=PAL["gold"], dark=True)
    # months ruler
    months = ["J","F","M","A","M","J","J","A","S","O","N","D"]
    rx = cx0 + 0.30; rw = cw - 0.60
    for i, m in enumerate(months):
        x = rx + (i / 11) * rw
        line(ax, x, iy + ih - 2.70, x, iy + 5.1, color="#3a2f6b", lw=0.5)
        label(ax, x, iy + 4.85, m, size=7, color=PAL["muted"], ha="center", dark=True)
    # bands
    bands = [("Jupiter conj Sun", 0.32, 0.42, PAL["gold"]),
             ("Saturn return prep", 0.55, 0.78, PAL["violet"]),
             ("Mars retrograde",   0.10, 0.25, PAL["rose"]),
             ("Eclipse window",    0.83, 0.92, PAL["aqua"])]
    for i, (t, a, b, c) in enumerate(bands):
        y = iy + ih - 3.20 - i * 0.55
        bar(ax, rx + a * rw, y, (b - a) * rw, 0.34, c)
        label(ax, rx + a * rw + 0.10, y + 0.17, t, size=7, weight="bold", color="#1a1530", dark=False)
    chip(ax, cx0, iy + 4.85, "custom: TransitTimeline (D3)", "#5a4d8c")
    # AI long-form preview
    card(ax, cx0, iy + 0.4, cw * 0.60, 4.45)
    label(ax, cx0 + 0.20, iy + 4.55, "AI summary · 2026", size=9, weight="bold", color=PAL["gold"], dark=True)
    for i in range(11):
        panel(ax, cx0 + 0.20, iy + 4.20 - i * 0.35, cw * 0.60 - 0.40 - (i % 3) * 0.4, 0.16, "#332b56", radius=0.04)
    chip(ax, cx0, iy + 0.10, "reactbits:DecryptedText (reveal)", PAL["gold"])
    # cost / token meter
    card(ax, cx0 + cw * 0.61, iy + 0.4, cw * 0.38, 4.45, accent=PAL["aqua"])
    label(ax, cx0 + cw * 0.61 + 0.20, iy + 4.55, "Provider · Gemini 2.5 Pro", size=9, weight="bold", color=PAL["gold"], dark=True)
    label(ax, cx0 + cw * 0.61 + 0.20, iy + 4.10, "Tokens used   8,210 / 50k", size=8, color="white", dark=True)
    bar(ax, cx0 + cw * 0.61 + 0.20, iy + 3.80, (cw * 0.38 - 0.40) * 0.16, 0.18, PAL["violet"])
    label(ax, cx0 + cw * 0.61 + 0.20, iy + 3.35, "Read offline  ✓", size=8, color="white", dark=True)
    label(ax, cx0 + cw * 0.61 + 0.20, iy + 3.00, "Export PDF   📄", size=8, color="white", dark=True)
    chip(ax, cx0 + cw * 0.61, iy + 0.10, "shadcn:Progress · Switch", PAL["violet"])

# === 4. AI Chat with Chart ===
def s4(ix, iy, iw, ih):
    sw = draw_sidebar(ix, iy, ih, NAV, active_idx=3)
    cx0 = ix + sw + 0.10; cw = iw - sw - 0.20
    panel(ax, cx0, iy + ih - 0.55, cw, 0.45, PAL["card_dark"], radius=0.08)
    label(ax, cx0 + 0.15, iy + ih - 0.32, "AI Chat · grounded in your chart", size=9, weight="bold", color="white", dark=True)
    chip(ax, cx0 + 3.2, iy + ih - 0.32, "shadcn:Tooltip 'sources'", PAL["violet"])
    # left: chart context panel
    lw = cw * 0.30
    card(ax, cx0, iy + 0.4, lw, ih - 1.20, accent=PAL["gold"])
    label(ax, cx0 + 0.2, iy + ih - 1.15, "Chart context", size=9, weight="bold", color=PAL["gold"], dark=True)
    chart_wheel(ax, cx0 + lw / 2, iy + ih - 3.10, 0.95)
    for i, t in enumerate(["Profile · Maya", "System · Vedic", "Houses · Whole sign", "Dasha · Sat/Mer", "Transits · live"]):
        label(ax, cx0 + 0.25, iy + ih - 4.30 - i * 0.40, t, size=7.5, color="#cfc6f5", dark=True)
    chip(ax, cx0, iy + 0.10, "reactbits:TiltedCard", PAL["gold"])
    # right: chat thread
    rx = cx0 + lw + 0.10; rw = cw - lw - 0.10
    panel(ax, rx, iy + 0.4, rw, ih - 1.20, color=PAL["card_dark"])
    msgs = [
        ("user",  "What career suits me in 2027?"),
        ("ai",    "With Saturn transiting your 10th and Jupiter on your Sun..."),
        ("user",  "Is mid-2027 a good time to switch?"),
        ("ai",    "May–July 2027 is your strongest window. Here's why..."),
    ]
    y = iy + ih - 1.6
    for r, m in msgs:
        is_user = r == "user"
        bw = rw * (0.55 if not is_user else 0.45)
        bx = rx + (rw - bw - 0.20 if is_user else 0.20)
        bg = PAL["violet"] if is_user else "#332b56"
        panel(ax, bx, y - 0.95, bw, 0.85, bg, radius=0.18)
        for i, line_t in enumerate([m[:42], m[42:]] if len(m) > 42 else [m]):
            label(ax, bx + 0.20, y - 0.40 - i * 0.30, line_t, size=8.5, color="white", dark=True)
        if not is_user:
            chip(ax, bx + bw - 1.2, y - 0.10, "reactbits:TextType", PAL["gold"])
        y -= 1.20
    # input
    panel(ax, rx + 0.15, iy + 0.6, rw - 0.30, 0.55, "#170f2c", radius=0.18)
    label(ax, rx + 0.35, iy + 0.87, "Ask anything about your chart…", size=8, color=PAL["muted"], dark=True)
    panel(ax, rx + rw - 1.10, iy + 0.65, 0.85, 0.45, PAL["gold"], radius=0.12)
    label(ax, rx + rw - 0.67, iy + 0.87, "Send ▶", size=7.5, weight="bold", color="#1a1530", ha="center", dark=False)
    chip(ax, rx + 0.15, iy + 0.30, "shadcn:Textarea + Button + Form", PAL["violet"])

# === 5. Compatibility ===
def s5(ix, iy, iw, ih):
    sw = draw_sidebar(ix, iy, ih, NAV, active_idx=4)
    cx0 = ix + sw + 0.10; cw = iw - sw - 0.20
    panel(ax, cx0, iy + ih - 0.55, cw, 0.45, PAL["card_dark"], radius=0.08)
    label(ax, cx0 + 0.15, iy + ih - 0.32, "Compatibility · Maya × Arjun", size=9, weight="bold", color="white", dark=True)
    chip(ax, cx0 + 3.5, iy + ih - 0.32, "shadcn:Combobox × 2", PAL["violet"])
    # overlay wheel
    card(ax, cx0, iy + 4.2, cw * 0.55, ih - 5.0, accent=PAL["gold"])
    chart_wheel(ax, cx0 + cw * 0.27, iy + ih * 0.55, 1.85)
    # second wheel offset for synastry overlay illusion
    chart_wheel(ax, cx0 + cw * 0.27 + 0.10, iy + ih * 0.55 - 0.10, 1.45, label_inside=False)
    chip(ax, cx0 + 0.10, iy + 4.05, "custom: Synastry overlay (SVG)", "#5a4d8c")
    # right: scores
    rx = cx0 + cw * 0.56; rw = cw - cw * 0.56 - 0.03
    card(ax, rx, iy + ih - 4.40, rw, 3.85, accent=PAL["gold"])
    label(ax, rx + 0.20, iy + ih - 1.10, "Match score", size=9, weight="bold", color=PAL["gold"], dark=True)
    label(ax, rx + 0.20, iy + ih - 1.95, "84 / 100", size=28, weight="bold", color="white", dark=True)
    label(ax, rx + 0.20, iy + ih - 2.40, "Western · 78  ·  Vedic Ashtakoot · 28/36", size=8, color="#cfc6f5", dark=True)
    label(ax, rx + 0.20, iy + ih - 2.80, "Manglik check · clear  ✓", size=8, color=PAL["aqua"], dark=True)
    chip(ax, rx + 0.15, iy + ih - 4.55, "reactbits:CountUp + ProgressRing", PAL["gold"])
    # ashtakoot breakdown bars
    card(ax, rx, iy + 0.4, rw, 4.20)
    label(ax, rx + 0.20, iy + 4.30, "Ashtakoot breakdown", size=9, weight="bold", color=PAL["gold"], dark=True)
    for i, (t, v, mx) in enumerate([("Varna",1,1),("Vashya",2,2),("Tara",2,3),("Yoni",3,4),
                                     ("Graha Maitri",4,5),("Gana",5,6),("Bhakoot",6,7),("Nadi",5,8)]):
        y = iy + 3.85 - i * 0.42
        label(ax, rx + 0.20, y, t, size=7.5, color="white", dark=True)
        bar(ax, rx + 1.30, y - 0.10, (rw - 1.50) * (v / mx), 0.20, PAL["violet"])
        label(ax, rx + rw - 0.20, y, f"{v}/{mx}", size=7, color="#cfc6f5", ha="right", dark=True)
    chip(ax, rx, iy + 0.10, "shadcn:Progress · Tooltip", PAL["violet"])
    # bottom narrative
    card(ax, cx0, iy + 0.4, cw * 0.55, 3.6)
    label(ax, cx0 + 0.20, iy + 3.65, "Strengths & challenges", size=9, weight="bold", color=PAL["gold"], dark=True)
    for i in range(8):
        panel(ax, cx0 + 0.20, iy + 3.25 - i * 0.34, cw * 0.55 - 0.40 - (i % 3) * 0.5, 0.16, "#332b56", radius=0.04)
    chip(ax, cx0, iy + 0.10, "shadcn:Accordion · Markdown", PAL["violet"])

# === 6. Profile + Subscription ===
def s6(ix, iy, iw, ih):
    sw = draw_sidebar(ix, iy, ih, NAV, active_idx=8)
    cx0 = ix + sw + 0.10; cw = iw - sw - 0.20
    panel(ax, cx0, iy + ih - 0.55, cw, 0.45, PAL["card_dark"], radius=0.08)
    label(ax, cx0 + 0.15, iy + ih - 0.32, "Profile & Settings", size=9, weight="bold", color="white", dark=True)
    # left: profile card
    lw = cw * 0.40
    card(ax, cx0, iy + ih - 5.20, lw, 4.40, accent=PAL["gold"])
    avatar(ax, cx0 + 0.85, iy + ih - 1.80, r=0.50)
    label(ax, cx0 + 1.50, iy + ih - 1.65, "Maya Sharma", size=11, weight="bold", color="white", dark=True)
    label(ax, cx0 + 1.50, iy + ih - 2.00, "Vedic + Western · EN/HI", size=8, color="#cfc6f5", dark=True)
    for i, (k, v) in enumerate([("Born", "14 Jul 1995 · 04:32"),
                                 ("Place", "Mumbai, India"),
                                 ("Lat/Long", "19.0760, 72.8777"),
                                 ("Timezone", "Asia/Kolkata"),
                                 ("System pref", "Both")]):
        label(ax, cx0 + 0.20, iy + ih - 2.95 - i * 0.40, k, size=7.5, color=PAL["muted"], dark=True)
        label(ax, cx0 + 1.30, iy + ih - 2.95 - i * 0.40, v, size=8, color="white", dark=True)
    chip(ax, cx0, iy + ih - 5.40, "shadcn:Form · Avatar · Input", PAL["violet"])
    # right: profiles list + subscription
    rx = cx0 + lw + 0.10; rw = cw - lw - 0.10
    card(ax, rx, iy + ih - 3.60, rw, 2.80)
    label(ax, rx + 0.20, iy + ih - 1.10, "Saved profiles (5/50)", size=9, weight="bold", color=PAL["gold"], dark=True)
    for i, n in enumerate(["Maya (self)", "Arjun (partner)", "Mom", "Riya (child)", "+ Add new"]):
        y = iy + ih - 1.55 - i * 0.42
        avatar(ax, rx + 0.30, y, r=0.13, color=PAL["violet"] if i < 4 else PAL["gold"])
        label(ax, rx + 0.55, y, n, size=8, color="white", dark=True)
        label(ax, rx + rw - 0.30, y, "⋯", size=10, color="white", ha="right", dark=True)
    chip(ax, rx, iy + ih - 3.80, "shadcn:DataTable · DropdownMenu", PAL["violet"])
    # subscription card
    card(ax, rx, iy + 3.6, rw, 2.5, accent=PAL["aqua"])
    label(ax, rx + 0.20, iy + 5.80, "Subscription · Plus", size=10, weight="bold", color=PAL["gold"], dark=True)
    label(ax, rx + 0.20, iy + 5.40, "$6/mo · renews 14 May 2026", size=8, color="#cfc6f5", dark=True)
    panel(ax, rx + 0.20, iy + 4.50, rw - 0.40, 0.40, "#332b56", radius=0.10)
    label(ax, rx + 0.30, iy + 4.70, "Manage in Stripe portal →", size=8, color="white", dark=True)
    panel(ax, rx + 0.20, iy + 3.95, rw - 0.40, 0.40, "#332b56", radius=0.10)
    label(ax, rx + 0.30, iy + 4.15, "Upgrade to Pro", size=8, color="white", dark=True)
    chip(ax, rx, iy + 3.40, "shadcn:Card · Sheet", PAL["violet"])
    # privacy controls
    card(ax, cx0, iy + 0.4, cw, 3.0)
    label(ax, cx0 + 0.20, iy + 3.0, "Privacy & data", size=9, weight="bold", color=PAL["gold"], dark=True)
    for i, (t, d, on) in enumerate([("Default chart visibility", "Private", True),
                                     ("Marketing emails", "Off", False),
                                     ("Export my data", "JSON / PDF", True),
                                     ("Delete account", "Soft-delete + 30d purge", False)]):
        y = iy + 2.55 - i * 0.55
        label(ax, cx0 + 0.20, y, t, size=8, weight="bold", color="white", dark=True)
        label(ax, cx0 + 0.20, y - 0.25, d, size=7, color="#cfc6f5", dark=True)
        # switch
        panel(ax, cx0 + cw - 1.10, y - 0.10, 0.85, 0.30, PAL["violet"] if on else "#332b56", radius=0.15)
        ax.add_patch(plt.Circle((cx0 + cw - (0.30 if on else 0.95), y + 0.05), 0.10, color="white"))
    chip(ax, cx0, iy + 0.10, "shadcn:Switch · AlertDialog", PAL["violet"])

# Render screens
screen(0, 0, "1", "Today (Dashboard)",       s1)
screen(1, 0, "2", "Chart Workspace",         s2)
screen(2, 0, "3", "Predictions",             s3)
screen(0, 1, "4", "AI Chat with Chart",      s4)
screen(1, 1, "5", "Compatibility (Synastry)",s5)
screen(2, 1, "6", "Profile + Subscription",  s6)

plt.tight_layout()
plt.savefig(OUT, dpi=140, format="jpg", bbox_inches="tight", facecolor="white")
print("WROTE", OUT)
