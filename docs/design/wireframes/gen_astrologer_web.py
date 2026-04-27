"""Astrologer web portal wireframe — 4 screens (2x2)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _wf import *

OUT = "/Users/sudipto/Desktop/projects/astro/docs/design/wireframes/03_astrologer_web.jpg"
fig, ax = setup_axes((24, 22), (0, 24), (0, 22), bg="#ffffff")
title_block(ax, 0.5, 21.3,
            "03 · Astrologer Web Portal",
            "Operations workspace · live consultation · earnings · client charts")
legend_block(ax, 18.0, 21.3)

NAV = ["Dashboard", "Queue", "Live Session", "Clients", "Templates", "Earnings", "Schedule", "Reviews", "Profile"]
COLS, ROWS = 2, 2
FRAME_W, FRAME_H = 11.4, 9.0
GAP_X, GAP_Y = 0.6, 1.7
LEFT, BOTTOM = 0.4, 1.4

def sidebar(ix, iy, ih, active):
    sw = 1.6
    panel(ax, ix, iy, sw, ih, "#170f2c", radius=0.10)
    label(ax, ix + 0.2, iy + ih - 0.30, "✦ Astro · Pro", size=10, weight="bold", color=PAL["gold"], dark=True)
    for i, n in enumerate(NAV):
        y = iy + ih - 0.85 - i * 0.50
        if i == active:
            panel(ax, ix + 0.10, y - 0.20, sw - 0.20, 0.40, PAL["violet"], radius=0.10)
        label(ax, ix + 0.30, y, n, size=8, weight="bold" if i == active else "normal",
              color="white", dark=True)
    return sw

def screen(col, row, num, name, drawer, route):
    fx = LEFT + col * (FRAME_W + GAP_X)
    fy = BOTTOM + (ROWS - 1 - row) * (FRAME_H + GAP_Y)
    ix, iy, iw, ih = web_frame(ax, fx, fy, FRAME_W, FRAME_H, title=f"app.astro.app/astrologer/{route}")
    drawer(ix, iy, iw, ih)
    caption(ax, fx + 0.12, fy, FRAME_W, FRAME_H, num, name, "ASTROLOGER")

# === 1. Dashboard ===
def s1(ix, iy, iw, ih):
    sw = sidebar(ix, iy, ih, 0)
    cx0 = ix + sw + 0.10; cw = iw - sw - 0.20
    panel(ax, cx0, iy + ih - 0.55, cw, 0.45, PAL["card_dark"], radius=0.08)
    label(ax, cx0 + 0.15, iy + ih - 0.32, "Welcome back, Pandit Verma", size=10, weight="bold", color="white", dark=True)
    avatar(ax, cx0 + cw - 0.30, iy + ih - 0.32, r=0.16, color=PAL["gold"])
    panel(ax, cx0 + cw - 1.85, iy + ih - 0.42, 1.45, 0.30, "#3ad6c2", radius=0.15)
    label(ax, cx0 + cw - 1.13, iy + ih - 0.27, "● Online", size=7.5, weight="bold", color="#0a3a30", ha="center", dark=False)
    chip(ax, cx0 + cw - 4.4, iy + ih - 0.32, "shadcn:Switch (status)", PAL["violet"])
    # KPI row
    for i, (t, v, sub, c) in enumerate([("Today's earnings", "₹4,820", "+18% vs yesterday", PAL["aqua"]),
                                          ("Active session", "01", "Maya · 12 min", PAL["gold"]),
                                          ("Queue", "07", "Avg wait 4 min", PAL["violet"]),
                                          ("Avg rating", "4.92", "287 reviews", PAL["rose"])]):
        bx = cx0 + 0.15 + i * (cw / 4 - 0.05); bw = cw / 4 - 0.20
        card(ax, bx, iy + ih - 2.10, bw, 1.30, accent=c)
        label(ax, bx + 0.20, iy + ih - 0.95, t, size=8, color=PAL["muted"], dark=True)
        label(ax, bx + 0.20, iy + ih - 1.40, v, size=16, weight="bold", color="white", dark=True)
        label(ax, bx + 0.20, iy + ih - 1.85, sub, size=7, color="#cfc6f5", dark=True)
    chip(ax, cx0 + 0.15, iy + ih - 2.30, "reactbits:CountUp · MagicBento", PAL["gold"])
    # earnings chart
    card(ax, cx0, iy + 0.5, cw * 0.60, ih - 3.20)
    label(ax, cx0 + 0.20, iy + ih - 2.70, "Earnings · last 30 days", size=9, weight="bold", color=PAL["gold"], dark=True)
    sparkline(ax, cx0 + 0.30, iy + 1.0, cw * 0.60 - 0.60, 3.0, color=PAL["aqua"], points=30, seed=2)
    chip(ax, cx0, iy + 0.20, "shadcn:Chart (recharts) · DateRangePicker", PAL["violet"])
    # right column — queue + reviews
    rx = cx0 + cw * 0.62; rw = cw - cw * 0.62 - 0.05
    card(ax, rx, iy + ih - 6.0, rw, 3.50)
    label(ax, rx + 0.20, iy + ih - 2.70, "Live queue", size=9, weight="bold", color=PAL["gold"], dark=True)
    for i in range(5):
        y = iy + ih - 3.20 - i * 0.55
        avatar(ax, rx + 0.30, y, r=0.13, color=PAL["violet"])
        label(ax, rx + 0.55, y + 0.05, ["Maya S.", "Arjun M.", "Priya K.", "Rohan T.", "Neha P."][i], size=7.5, color="white", dark=True)
        label(ax, rx + 0.55, y - 0.20, ["Career · 30m","Marriage · 15m","Health · 60m","General · 30m","Career · 30m"][i],
              size=6.5, color="#cfc6f5", dark=True)
        panel(ax, rx + rw - 0.95, y - 0.13, 0.80, 0.30, PAL["gold"], radius=0.10)
        label(ax, rx + rw - 0.55, y + 0.02, "Accept", size=7, weight="bold", color="#1a1530", ha="center", dark=False)
    chip(ax, rx, iy + ih - 6.20, "shadcn:Table · Sheet · Toast", PAL["violet"])
    # reviews
    card(ax, rx, iy + 0.5, rw, 1.80)
    label(ax, rx + 0.20, iy + 2.00, "Latest review", size=9, weight="bold", color=PAL["gold"], dark=True)
    label(ax, rx + 0.20, iy + 1.65, "★★★★★ 'Spot on with my career..'", size=7.5, color="white", dark=True)
    label(ax, rx + 0.20, iy + 1.40, "— Rohan, 2h ago", size=7, color="#cfc6f5", italic=True, dark=True)
    chip(ax, rx, iy + 0.30, "shadcn:Card · Skeleton (loading)", PAL["violet"])

# === 2. Live Session ===
def s2(ix, iy, iw, ih):
    sw = sidebar(ix, iy, ih, 2)
    cx0 = ix + sw + 0.10; cw = iw - sw - 0.20
    panel(ax, cx0, iy + ih - 0.55, cw, 0.45, PAL["card_dark"], radius=0.08)
    label(ax, cx0 + 0.15, iy + ih - 0.32, "Session · Maya × Pandit Verma · 12:34", size=9.5, weight="bold", color="white", dark=True)
    panel(ax, cx0 + cw - 1.45, iy + ih - 0.42, 1.30, 0.30, PAL["rose"], radius=0.15)
    label(ax, cx0 + cw - 0.80, iy + ih - 0.27, "End session", size=7.5, weight="bold", color="white", ha="center", dark=True)
    chip(ax, cx0 + cw - 3.45, iy + ih - 0.32, "shadcn:AlertDialog (end)", PAL["violet"])
    # left: client chart + bio
    lw = cw * 0.40
    card(ax, cx0, iy + 0.50, lw, ih - 1.20, accent=PAL["gold"])
    chart_wheel(ax, cx0 + lw / 2, iy + ih * 0.62, 1.50)
    label(ax, cx0 + 0.20, iy + 1.60, "Maya Sharma · 30 · Mumbai", size=9, weight="bold", color="white", dark=True)
    label(ax, cx0 + 0.20, iy + 1.30, "Born 14 Jul 1995 · 04:32 IST", size=7.5, color="#cfc6f5", dark=True)
    label(ax, cx0 + 0.20, iy + 1.00, "Topic · Career change", size=7.5, color=PAL["gold"], dark=True)
    label(ax, cx0 + 0.20, iy + 0.70, "Plan · Pro · 30 min · ₹600", size=7.5, color="#cfc6f5", dark=True)
    chip(ax, cx0, iy + 0.20, "custom: ChartWheel · Tabs (D1/D9/D10)", "#5a4d8c")
    # right: chat thread + voice toggle
    rx = cx0 + lw + 0.10; rw = cw - lw - 0.10
    panel(ax, rx, iy + 0.50, rw, ih - 1.20, color=PAL["card_dark"])
    # voice/video controls
    panel(ax, rx + 0.15, iy + ih - 1.30, rw - 0.30, 0.55, "#170f2c", radius=0.12)
    for i, t in enumerate(["🎙 Voice", "📷 Video", "📎 Share notes", "✨ AI assist"]):
        panel(ax, rx + 0.30 + i * 1.5, iy + ih - 1.20, 1.35, 0.35, PAL["violet"] if i == 0 else "#332b56", radius=0.10)
        label(ax, rx + 0.97 + i * 1.5, iy + ih - 1.02, t, size=7.5, weight="bold", color="white", ha="center", dark=True)
    chip(ax, rx + 0.15, iy + ih - 1.55, "shadcn:Toggle · Tooltip", PAL["violet"])
    # chat
    msgs = [
        ("user","I'm thinking of switching from finance to product."),
        ("astro","Looking at your D10 (career chart), Saturn-Mercury dasha favours analytical roles..."),
        ("user","When should I make the move?"),
        ("astro","Window opens 12 May 2026 with Jupiter conj your Sun. Hold until then."),
        ("user","Any remedies?"),
    ]
    y = iy + ih - 2.0
    for r, m in msgs:
        is_user = r == "user"
        bw = rw * 0.55
        bx = rx + (rw - bw - 0.20 if not is_user else 0.20)
        bg = "#332b56" if is_user else PAL["gold"]
        c  = "white" if is_user else "#1a1530"
        panel(ax, bx, y - 0.85, bw, 0.78, bg, radius=0.18)
        for i, ln in enumerate([m[:46], m[46:]] if len(m) > 46 else [m]):
            label(ax, bx + 0.20, y - 0.35 - i * 0.28, ln, size=7.5, color=c, dark=(is_user))
        y -= 1.05
    # AI assist sidebar
    panel(ax, rx + 0.15, iy + 0.65, rw - 0.30, 0.50, PAL["aqua"], radius=0.10, alpha=0.20)
    label(ax, rx + 0.30, iy + 0.85, "💡 AI suggests: Mention 12th-house Mercury for tech-product fit", size=7.5, color=PAL["aqua"], italic=True, dark=True)
    chip(ax, rx + 0.15, iy + 0.30, "reactbits:DecryptedText (AI hint)", PAL["gold"])

# === 3. Clients list ===
def s3(ix, iy, iw, ih):
    sw = sidebar(ix, iy, ih, 3)
    cx0 = ix + sw + 0.10; cw = iw - sw - 0.20
    panel(ax, cx0, iy + ih - 0.55, cw, 0.45, PAL["card_dark"], radius=0.08)
    label(ax, cx0 + 0.15, iy + ih - 0.32, "Clients (148)", size=9.5, weight="bold", color="white", dark=True)
    # search + filters
    panel(ax, cx0 + 1.50, iy + ih - 0.45, 3.0, 0.30, "#170f2c", radius=0.10)
    label(ax, cx0 + 1.65, iy + ih - 0.30, "🔍 Search by name / topic", size=7, color=PAL["muted"], dark=True)
    for i, t in enumerate(["All", "Marriage", "Career", "Health", "Repeat"]):
        panel(ax, cx0 + 5.0 + i * 1.0, iy + ih - 0.45, 0.85, 0.30, PAL["violet"] if i == 0 else "#332b56", radius=0.10)
        label(ax, cx0 + 5.42 + i * 1.0, iy + ih - 0.30, t, size=7, color="white", ha="center", dark=True)
    chip(ax, cx0 + 5.0, iy + ih - 0.75, "shadcn:Command · ToggleGroup", PAL["violet"])
    # data table
    card(ax, cx0, iy + 0.5, cw, ih - 1.20)
    cols = ["Client", "Topic", "Last session", "Sessions", "Spend", "Rating", ""]
    cwidths = [2.0, 1.6, 1.5, 1.0, 1.0, 0.9, 0.6]
    cum = 0.20
    for i, h in enumerate(cols):
        label(ax, cx0 + cum, iy + ih - 1.55, h, size=7.5, weight="bold", color=PAL["gold"], dark=True)
        cum += cwidths[i]
    for r in range(8):
        y = iy + ih - 2.0 - r * 0.55
        if r % 2 == 0:
            panel(ax, cx0 + 0.10, y - 0.20, cw - 0.20, 0.40, "#221b3d", radius=0.05)
        names = ["Maya Sharma","Arjun M.","Riya K.","Rohan T.","Neha P.","Vikram J.","Kavita R.","Aditya G."]
        topic = ["Career","Marriage","Health","Career","Spiritual","Marriage","Career","General"]
        last  = ["2h ago","yesterday","2d ago","1w ago","2w ago","1m ago","1m ago","6w ago"]
        sess  = ["6","3","1","12","2","4","8","1"]
        spend = ["₹4.8k","₹2.1k","₹600","₹9.0k","₹1.2k","₹3.0k","₹6.0k","₹600"]
        rating= ["4.9","4.8","5.0","5.0","4.7","4.9","5.0","4.8"]
        avatar(ax, cx0 + 0.30, y, r=0.10, color=PAL["violet"])
        label(ax, cx0 + 0.55, y, names[r], size=7.5, color="white", dark=True)
        cum = 0.20 + cwidths[0]
        for i, v in enumerate([topic[r], last[r], sess[r], spend[r], rating[r]]):
            label(ax, cx0 + cum, y, v, size=7, color="#cfc6f5", dark=True)
            cum += cwidths[i + 1]
        label(ax, cx0 + cw - 0.30, y, "⋯", size=10, color="white", ha="right", dark=True)
    chip(ax, cx0, iy + 0.20, "shadcn:DataTable · Pagination · DropdownMenu", PAL["violet"])

# === 4. Earnings ===
def s4(ix, iy, iw, ih):
    sw = sidebar(ix, iy, ih, 5)
    cx0 = ix + sw + 0.10; cw = iw - sw - 0.20
    panel(ax, cx0, iy + ih - 0.55, cw, 0.45, PAL["card_dark"], radius=0.08)
    label(ax, cx0 + 0.15, iy + ih - 0.32, "Earnings & Payouts", size=9.5, weight="bold", color="white", dark=True)
    # KPIs
    for i, (t, v, c) in enumerate([("Lifetime", "₹4,82,140", PAL["gold"]),
                                    ("This month", "₹38,420", PAL["aqua"]),
                                    ("Pending payout", "₹12,640", PAL["violet"]),
                                    ("Next payout", "30 Apr 2026", PAL["rose"])]):
        bx = cx0 + 0.15 + i * (cw / 4 - 0.05); bw = cw / 4 - 0.20
        card(ax, bx, iy + ih - 2.0, bw, 1.20, accent=c)
        label(ax, bx + 0.20, iy + ih - 0.95, t, size=8, color=PAL["muted"], dark=True)
        label(ax, bx + 0.20, iy + ih - 1.45, v, size=14, weight="bold", color="white", dark=True)
    chip(ax, cx0 + 0.15, iy + ih - 2.20, "reactbits:CountUp", PAL["gold"])
    # bar chart
    card(ax, cx0, iy + 3.4, cw * 0.62, ih - 5.6)
    label(ax, cx0 + 0.20, iy + ih - 2.70, "Monthly earnings", size=9, weight="bold", color=PAL["gold"], dark=True)
    rng_vals = [1.6, 2.1, 1.8, 2.6, 2.0, 2.4, 2.9, 3.1, 2.8, 3.3, 2.9, 3.2]
    base_y = iy + 3.6
    for i, v in enumerate(rng_vals):
        bar(ax, cx0 + 0.40 + i * 0.50, base_y, 0.38, v / 1.5, PAL["violet"])
        label(ax, cx0 + 0.59 + i * 0.50, base_y - 0.30, ["J","F","M","A","M","J","J","A","S","O","N","D"][i],
              size=7, color=PAL["muted"], ha="center", dark=True)
    chip(ax, cx0, iy + 3.20, "shadcn:Chart (recharts BarChart)", PAL["violet"])
    # right top-up + payout settings
    rx = cx0 + cw * 0.63; rw = cw - cw * 0.63 - 0.03
    card(ax, rx, iy + 3.4, rw, ih - 5.6)
    label(ax, rx + 0.15, iy + ih - 2.70, "Payout method", size=9, weight="bold", color=PAL["gold"], dark=True)
    label(ax, rx + 0.15, iy + ih - 3.10, "🏦 HDFC Bank · ****1234", size=8, color="white", dark=True)
    label(ax, rx + 0.15, iy + ih - 3.40, "Schedule · Weekly (Wed)", size=8, color="white", dark=True)
    panel(ax, rx + 0.15, iy + ih - 4.20, rw - 0.30, 0.50, "#332b56", radius=0.10)
    label(ax, rx + 0.30, iy + ih - 3.95, "Update bank details →", size=8, color="white", dark=True)
    chip(ax, rx, iy + 3.20, "shadcn:Sheet · Form · Input", PAL["violet"])
    # transactions table bottom
    card(ax, cx0, iy + 0.5, cw, 2.7)
    label(ax, cx0 + 0.20, iy + 3.0, "Recent transactions", size=9, weight="bold", color=PAL["gold"], dark=True)
    for r in range(4):
        y = iy + 2.55 - r * 0.50
        label(ax, cx0 + 0.20, y, ["26 Apr 14:32","26 Apr 13:12","26 Apr 11:08","25 Apr 19:44"][r], size=7, color="#cfc6f5", dark=True)
        label(ax, cx0 + 1.80, y, ["Session · Maya S.","Tip · Rohan T.","Session · Neha P.","Session · Arjun M."][r], size=7, color="white", dark=True)
        label(ax, cx0 + 5.40, y, ["+₹600","+₹150","+₹1,200","+₹600"][r], size=7, color=PAL["aqua"], weight="bold", dark=True)
        label(ax, cx0 + cw - 0.30, y, ["paid","paid","paid","pending"][r], size=7, color=PAL["muted"], ha="right", dark=True)
    chip(ax, cx0, iy + 0.20, "shadcn:Table · Badge", PAL["violet"])

screen(0, 0, "1", "Astrologer Dashboard",  s1, "dashboard")
screen(1, 0, "2", "Live Consultation",     s2, "session/abc123")
screen(0, 1, "3", "Clients",               s3, "clients")
screen(1, 1, "4", "Earnings",              s4, "earnings")

plt.tight_layout()
plt.savefig(OUT, dpi=140, format="jpg", bbox_inches="tight", facecolor="white")
print("WROTE", OUT)
