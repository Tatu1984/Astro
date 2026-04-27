"""Admin web portal wireframe — 4 screens (2x2). Light theme — operations-first."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _wf import *

OUT = "/Users/sudipto/Desktop/projects/astro/docs/design/wireframes/04_admin_web.jpg"
fig, ax = setup_axes((24, 22), (0, 24), (0, 22), bg="#ffffff")
title_block(ax, 0.5, 21.3,
            "04 · Admin Web Portal",
            "Light operations theme · users · moderation · LLM cost · feature flags")
legend_block(ax, 18.0, 21.3)

NAV = ["Overview", "Users", "Astrologers", "Moderation", "Subscriptions", "LLM Cost", "Feature Flags", "A/B Tests", "Audit Log", "Settings"]

COLS, ROWS = 2, 2
FRAME_W, FRAME_H = 11.4, 9.0
GAP_X, GAP_Y = 0.6, 1.7
LEFT, BOTTOM = 0.4, 1.4

def sidebar_light(ix, iy, ih, active):
    sw = 1.7
    panel(ax, ix, iy, sw, ih, "#f0ecfa", radius=0.10)
    label(ax, ix + 0.2, iy + ih - 0.30, "✦ Astro · Admin", size=10, weight="bold", color="#1a1530", dark=False)
    for i, n in enumerate(NAV):
        y = iy + ih - 0.85 - i * 0.50
        if i == active:
            panel(ax, ix + 0.10, y - 0.20, sw - 0.20, 0.40, PAL["violet"], radius=0.10)
        label(ax, ix + 0.30, y, n, size=8,
              weight="bold" if i == active else "normal",
              color="white" if i == active else "#1a1530", dark=False)
    return sw

def screen(col, row, num, name, drawer, route):
    fx = LEFT + col * (FRAME_W + GAP_X)
    fy = BOTTOM + (ROWS - 1 - row) * (FRAME_H + GAP_Y)
    ix, iy, iw, ih = web_frame(ax, fx, fy, FRAME_W, FRAME_H, dark=False, title=f"admin.astro.app/{route}")
    drawer(ix, iy, iw, ih)
    caption(ax, fx + 0.12, fy, FRAME_W, FRAME_H, num, name, "ADMIN")

# === 1. Overview Dashboard ===
def s1(ix, iy, iw, ih):
    sw = sidebar_light(ix, iy, ih, 0)
    cx0 = ix + sw + 0.10; cw = iw - sw - 0.20
    panel(ax, cx0, iy + ih - 0.55, cw, 0.45, "#ffffff", radius=0.08)
    label(ax, cx0 + 0.15, iy + ih - 0.32, "Operations Overview · last 7 days", size=10, weight="bold", color="#1a1530", dark=False)
    chip(ax, cx0 + 4.50, iy + ih - 0.32, "shadcn:DateRangePicker", PAL["violet"])
    # KPI row
    for i, (t, v, sub, c) in enumerate([("DAU",        "12,840", "+6.2% wow", PAL["aqua"]),
                                          ("MAU",        "184,210","+11.4% mom", PAL["violet"]),
                                          ("MRR",        "$48,210","+9.1% mom", PAL["gold"]),
                                          ("LLM cost",   "$1,420", "−4% wow",   PAL["rose"]),
                                          ("Crash-free", "99.83%", "iOS+Android",PAL["aqua"])]):
        bx = cx0 + 0.15 + i * (cw / 5 - 0.05); bw = cw / 5 - 0.20
        panel(ax, bx, iy + ih - 2.10, bw, 1.30, "#ffffff", edge="#d8d2eb", radius=0.10)
        panel(ax, bx, iy + ih - 2.10, 0.06, 1.30, c, radius=0.05)
        label(ax, bx + 0.20, iy + ih - 0.95, t, size=8, color="#5a4d8c", dark=False)
        label(ax, bx + 0.20, iy + ih - 1.40, v, size=14, weight="bold", color="#1a1530", dark=False)
        label(ax, bx + 0.20, iy + ih - 1.85, sub, size=7, color="#5a4d8c", dark=False)
    chip(ax, cx0 + 0.15, iy + ih - 2.30, "reactbits:CountUp · MagicBento", PAL["gold"])
    # main charts row
    panel(ax, cx0, iy + 3.4, cw * 0.62, ih - 5.6, "#ffffff", edge="#d8d2eb", radius=0.10)
    label(ax, cx0 + 0.20, iy + ih - 2.70, "DAU / MAU · 90 days", size=9, weight="bold", color="#1a1530", dark=False)
    sparkline(ax, cx0 + 0.30, iy + 3.6, cw * 0.62 - 0.60, 3.0, color=PAL["violet"], points=60, seed=3)
    sparkline(ax, cx0 + 0.30, iy + 3.6, cw * 0.62 - 0.60, 3.0, color=PAL["aqua"], points=60, seed=14)
    chip(ax, cx0, iy + 3.20, "shadcn:Chart (recharts AreaChart)", PAL["violet"])
    # right: revenue funnel
    rx = cx0 + cw * 0.63; rw = cw - cw * 0.63 - 0.03
    panel(ax, rx, iy + 3.4, rw, ih - 5.6, "#ffffff", edge="#d8d2eb", radius=0.10)
    label(ax, rx + 0.15, iy + ih - 2.70, "Conversion funnel", size=9, weight="bold", color="#1a1530", dark=False)
    funnel = [("Visit",   1.00, PAL["violet"]),
              ("Sign-up", 0.62, PAL["aqua"]),
              ("Profile", 0.41, PAL["gold"]),
              ("Plus",    0.18, PAL["rose"]),
              ("Pro",     0.06, "#5a4d8c")]
    for i, (t, v, c) in enumerate(funnel):
        y = iy + ih - 3.20 - i * 0.55
        bar(ax, rx + 0.20, y - 0.18, (rw - 0.40) * v, 0.30, c)
        label(ax, rx + 0.30, y, t, size=8, weight="bold", color="white", dark=True)
        label(ax, rx + rw - 0.20, y, f"{int(v * 100)}%", size=7.5, color="#1a1530", ha="right", dark=False)
    chip(ax, rx, iy + 3.20, "custom: Funnel + reactbits:VariableProximity", PAL["gold"])
    # bottom alerts
    panel(ax, cx0, iy + 0.5, cw, 2.7, "#ffffff", edge="#d8d2eb", radius=0.10)
    label(ax, cx0 + 0.20, iy + 3.0, "Active alerts", size=9, weight="bold", color="#1a1530", dark=False)
    alerts = [("LLM error rate", "Gemini 2.5 Pro · 2.4% errors last 1h",     PAL["rose"]),
              ("Queue depth",    "Astrologer queue avg wait 7m · target 4m", PAL["gold"]),
              ("Payment webhook","Stripe webhook latency p95 1.4s",         PAL["aqua"])]
    for i, (t, d, c) in enumerate(alerts):
        y = iy + 2.55 - i * 0.55
        ax.add_patch(plt.Circle((cx0 + 0.30, y + 0.08), 0.10, color=c))
        label(ax, cx0 + 0.55, y + 0.10, t, size=8, weight="bold", color="#1a1530", dark=False)
        label(ax, cx0 + 0.55, y - 0.20, d, size=7, color="#5a4d8c", dark=False)
        panel(ax, cx0 + cw - 1.10, y - 0.13, 0.85, 0.30, "#f0ecfa", radius=0.10)
        label(ax, cx0 + cw - 0.67, y + 0.02, "Investigate", size=7, weight="bold", color="#1a1530", ha="center", dark=False)
    chip(ax, cx0, iy + 0.20, "shadcn:Alert · Toast · Badge", PAL["violet"])

# === 2. Users management ===
def s2(ix, iy, iw, ih):
    sw = sidebar_light(ix, iy, ih, 1)
    cx0 = ix + sw + 0.10; cw = iw - sw - 0.20
    panel(ax, cx0, iy + ih - 0.55, cw, 0.45, "#ffffff", radius=0.08)
    label(ax, cx0 + 0.15, iy + ih - 0.32, "Users · 184,210", size=10, weight="bold", color="#1a1530", dark=False)
    panel(ax, cx0 + 1.80, iy + ih - 0.45, 3.0, 0.30, "#f0ecfa", radius=0.10)
    label(ax, cx0 + 1.95, iy + ih - 0.30, "🔍 Search by email / id", size=7, color="#5a4d8c", dark=False)
    for i, t in enumerate(["All", "Plus", "Pro", "Trial", "Suspended"]):
        panel(ax, cx0 + 5.10 + i * 1.0, iy + ih - 0.45, 0.85, 0.30, PAL["violet"] if i == 0 else "#f0ecfa", radius=0.10)
        label(ax, cx0 + 5.52 + i * 1.0, iy + ih - 0.30, t, size=7,
              color="white" if i == 0 else "#1a1530", ha="center", dark=False)
    chip(ax, cx0 + 5.10, iy + ih - 0.75, "shadcn:Command · ToggleGroup", PAL["violet"])
    # data table
    panel(ax, cx0, iy + 0.5, cw, ih - 1.20, "#ffffff", edge="#d8d2eb", radius=0.10)
    cols = ["", "User", "Plan", "Charts", "MRR", "Last seen", "Country", "Risk", ""]
    cwidths = [0.45, 2.4, 0.9, 0.8, 0.9, 1.2, 1.0, 0.8, 0.6]
    cum = 0.20
    for i, h in enumerate(cols):
        label(ax, cx0 + cum, iy + ih - 1.55, h, size=7.5, weight="bold", color="#5a4d8c", dark=False)
        cum += cwidths[i]
    for r in range(8):
        y = iy + ih - 2.0 - r * 0.55
        if r % 2 == 0:
            panel(ax, cx0 + 0.10, y - 0.20, cw - 0.20, 0.40, "#f0ecfa", radius=0.05)
        # checkbox
        panel(ax, cx0 + 0.30, y - 0.12, 0.22, 0.22, "#ffffff", edge="#5a4d8c", radius=0.04)
        emails = ["maya@example.com","arjun.m@gmail.com","priya.k@yahoo.com","rohan@outlook.com",
                  "neha.p@example.com","vikram@example.in","kavita.r@protonmail.com","aditya@example.com"]
        plans = ["Plus","Pro","Free","Pro","Plus","Plus","Free","Free"]
        charts= ["3","8","1","12","4","2","1","0"]
        mrrs  = ["$6","$14","$0","$14","$6","$6","$0","$0"]
        seen  = ["2m ago","yesterday","3d ago","just now","1h ago","2w ago","1m ago","6w ago"]
        ctry  = ["IN","IN","IN","US","IN","IN","UK","CA"]
        risks = ["low","low","low","low","mid","low","low","low"]
        cum = 0.20 + cwidths[0]
        for i, v in enumerate([emails[r], plans[r], charts[r], mrrs[r], seen[r], ctry[r], risks[r]]):
            color = "#1a1530" if i != 6 else (PAL["rose"] if v != "low" else "#5a4d8c")
            label(ax, cx0 + cum, y, v, size=7, color=color, dark=False)
            cum += cwidths[i + 1]
        label(ax, cx0 + cw - 0.30, y, "⋯", size=10, color="#1a1530", ha="right", dark=False)
    # bulk actions
    panel(ax, cx0 + 0.20, iy + 0.65, cw - 0.40, 0.50, "#f0ecfa", radius=0.10)
    label(ax, cx0 + 0.40, iy + 0.90, "0 selected · ", size=8, color="#5a4d8c", dark=False)
    for i, t in enumerate(["Email all", "Suspend", "Refund", "Export CSV"]):
        panel(ax, cx0 + 1.50 + i * 1.4, iy + 0.70, 1.30, 0.40, "#ffffff", edge="#d8d2eb", radius=0.10)
        label(ax, cx0 + 2.15 + i * 1.4, iy + 0.90, t, size=7.5, color="#1a1530", ha="center", dark=False)
    chip(ax, cx0, iy + 0.20, "shadcn:DataTable · Checkbox · DropdownMenu · Sheet", PAL["violet"])

# === 3. Moderation queue ===
def s3(ix, iy, iw, ih):
    sw = sidebar_light(ix, iy, ih, 3)
    cx0 = ix + sw + 0.10; cw = iw - sw - 0.20
    panel(ax, cx0, iy + ih - 0.55, cw, 0.45, "#ffffff", radius=0.08)
    label(ax, cx0 + 0.15, iy + ih - 0.32, "Moderation queue · 14 pending", size=10, weight="bold", color="#1a1530", dark=False)
    # filters
    for i, t in enumerate(["Posts", "Comments", "Profiles", "Reports", "Astrologer apps"]):
        panel(ax, cx0 + 4.20 + i * 1.4, iy + ih - 0.45, 1.30, 0.30, PAL["violet"] if i == 0 else "#f0ecfa", radius=0.10)
        label(ax, cx0 + 4.85 + i * 1.4, iy + ih - 0.30, t, size=7,
              color="white" if i == 0 else "#1a1530", ha="center", dark=False)
    chip(ax, cx0 + 4.20, iy + ih - 0.75, "shadcn:Tabs", PAL["violet"])
    # left: queue list
    lw = cw * 0.42
    panel(ax, cx0, iy + 0.5, lw, ih - 1.20, "#ffffff", edge="#d8d2eb", radius=0.10)
    label(ax, cx0 + 0.20, iy + ih - 1.50, "Queue", size=9, weight="bold", color="#1a1530", dark=False)
    for r in range(7):
        y = iy + ih - 2.0 - r * 0.7
        if r == 0:
            panel(ax, cx0 + 0.10, y - 0.30, lw - 0.20, 0.60, "#f0ecfa", radius=0.06)
        avatar(ax, cx0 + 0.30, y, r=0.13, color=PAL["violet"])
        label(ax, cx0 + 0.55, y + 0.18, ["@maya_s","@arjun.m","@anonymous_27","@priya.k","@vikram_j","@neha.p","@rohan_t"][r],
              size=7.5, weight="bold", color="#1a1530", dark=False)
        label(ax, cx0 + 0.55, y - 0.08, ["3 reports · 'misleading remedies'","spam suspicion","NSFW image","off-topic","off-topic","spam suspicion","3 reports"][r],
              size=6.5, color="#5a4d8c", dark=False)
        label(ax, cx0 + lw - 0.30, y, ["high","mid","high","low","low","mid","mid"][r], size=7, color=PAL["rose"], ha="right", dark=False)
    chip(ax, cx0, iy + 0.20, "shadcn:Table · Badge", PAL["violet"])
    # right: detail viewer
    rx = cx0 + lw + 0.10; rw = cw - lw - 0.10
    panel(ax, rx, iy + 0.5, rw, ih - 1.20, "#ffffff", edge="#d8d2eb", radius=0.10)
    label(ax, rx + 0.20, iy + ih - 1.50, "Post · 9821 · @maya_s · 3 reports", size=9, weight="bold", color="#1a1530", dark=False)
    panel(ax, rx + 0.20, iy + ih - 4.20, rw - 0.40, 2.40, "#f7f5fb", radius=0.08)
    label(ax, rx + 0.40, iy + ih - 2.20, "Wear yellow sapphire to fix career.", size=10, weight="bold", color="#1a1530", dark=False)
    for j in range(5):
        panel(ax, rx + 0.40, iy + ih - 2.65 - j * 0.30, rw - 0.80 - (j % 2) * 0.5, 0.16, "#e6deff", radius=0.04)
    chip(ax, rx + 0.20, iy + ih - 4.45, "shadcn:Card · ScrollArea", PAL["violet"])
    # reasons
    label(ax, rx + 0.20, iy + ih - 4.90, "Report reasons", size=8, weight="bold", color="#1a1530", dark=False)
    for i, (t, c) in enumerate([("misleading","3 users"),("medical claim","2 users"),("low quality","1 user")]):
        y = iy + ih - 5.30 - i * 0.40
        panel(ax, rx + 0.20, y - 0.13, rw - 0.40, 0.30, "#f0ecfa", radius=0.06)
        label(ax, rx + 0.30, y, t, size=7.5, color="#1a1530", dark=False)
        label(ax, rx + rw - 0.30, y, c, size=7, color="#5a4d8c", ha="right", dark=False)
    # actions
    label(ax, rx + 0.20, iy + 1.70, "Actions", size=8, weight="bold", color="#1a1530", dark=False)
    actions = [("Approve", PAL["aqua"]), ("Add disclaimer", PAL["gold"]), ("Hide", PAL["muted"]), ("Suspend user", PAL["rose"])]
    for i, (t, c) in enumerate(actions):
        bx = rx + 0.20 + i * (rw / 4 - 0.05); bw = rw / 4 - 0.20
        panel(ax, bx, iy + 0.95, bw, 0.45, c, radius=0.10)
        label(ax, bx + bw / 2, iy + 1.18, t, size=7.5, weight="bold", color="white" if c != PAL["gold"] else "#1a1530", ha="center", dark=False)
    chip(ax, rx + 0.20, iy + 0.65, "shadcn:Button · AlertDialog · Toast", PAL["violet"])

# === 4. LLM Cost dashboard ===
def s4(ix, iy, iw, ih):
    sw = sidebar_light(ix, iy, ih, 5)
    cx0 = ix + sw + 0.10; cw = iw - sw - 0.20
    panel(ax, cx0, iy + ih - 0.55, cw, 0.45, "#ffffff", radius=0.08)
    label(ax, cx0 + 0.15, iy + ih - 0.32, "LLM Cost · last 30 days", size=10, weight="bold", color="#1a1530", dark=False)
    # KPIs
    for i, (t, v, c) in enumerate([("Spend",       "$5,820", PAL["gold"]),
                                    ("Tokens",      "182M",   PAL["violet"]),
                                    ("Avg ms p95",  "1,420",  PAL["aqua"]),
                                    ("Error rate",  "0.41%",  PAL["rose"]),
                                    ("Cost / user", "$0.038", "#5a4d8c")]):
        bx = cx0 + 0.15 + i * (cw / 5 - 0.05); bw = cw / 5 - 0.20
        panel(ax, bx, iy + ih - 2.10, bw, 1.30, "#ffffff", edge="#d8d2eb", radius=0.10)
        panel(ax, bx, iy + ih - 2.10, 0.06, 1.30, c, radius=0.05)
        label(ax, bx + 0.20, iy + ih - 0.95, t, size=8, color="#5a4d8c", dark=False)
        label(ax, bx + 0.20, iy + ih - 1.45, v, size=14, weight="bold", color="#1a1530", dark=False)
    chip(ax, cx0 + 0.15, iy + ih - 2.30, "reactbits:CountUp", PAL["gold"])
    # provider stack chart
    panel(ax, cx0, iy + 3.4, cw * 0.62, ih - 5.6, "#ffffff", edge="#d8d2eb", radius=0.10)
    label(ax, cx0 + 0.20, iy + ih - 2.70, "Cost by provider · stacked", size=9, weight="bold", color="#1a1530", dark=False)
    bars = list(range(14))
    for i in bars:
        x = cx0 + 0.40 + i * 0.42
        gem = 1.2 + (i % 5) * 0.15
        groq = 0.8 + ((i + 1) % 4) * 0.10
        clau = 0.5 + (i % 3) * 0.10
        bar(ax, x, iy + 3.6,           0.32, gem,  PAL["violet"])
        bar(ax, x, iy + 3.6 + gem,     0.32, groq, PAL["aqua"])
        bar(ax, x, iy + 3.6 + gem+groq,0.32, clau, PAL["gold"])
    # legend
    for i, (t, c) in enumerate([("Gemini",PAL["violet"]),("Groq",PAL["aqua"]),("Claude",PAL["gold"])]):
        bx = cx0 + 0.40 + i * 1.4
        panel(ax, bx, iy + 6.95, 0.18, 0.18, c, radius=0.04)
        label(ax, bx + 0.30, iy + 7.05, t, size=7.5, color="#1a1530", dark=False)
    chip(ax, cx0, iy + 3.20, "shadcn:Chart (stacked BarChart)", PAL["violet"])
    # right: route breakdown
    rx = cx0 + cw * 0.63; rw = cw - cw * 0.63 - 0.03
    panel(ax, rx, iy + 3.4, rw, ih - 5.6, "#ffffff", edge="#d8d2eb", radius=0.10)
    label(ax, rx + 0.15, iy + ih - 2.70, "Top routes by cost", size=9, weight="bold", color="#1a1530", dark=False)
    routes = [
        ("/api/predictions/yearly",  1.00, "$2,140"),
        ("/api/ai-chat",             0.78, "$1,690"),
        ("/api/predictions/daily",   0.55, "$1,180"),
        ("/api/reports/career",      0.31, "$  680"),
        ("/api/compatibility",       0.12, "$  140"),
    ]
    for i, (t, v, cost) in enumerate(routes):
        y = iy + ih - 3.20 - i * 0.55
        bar(ax, rx + 0.20, y - 0.18, (rw - 1.20) * v, 0.30, PAL["violet"])
        label(ax, rx + 0.30, y, t, size=7.5, weight="bold", color="white", dark=True)
        label(ax, rx + rw - 0.20, y, cost, size=7.5, color="#1a1530", ha="right", dark=False)
    chip(ax, rx, iy + 3.20, "shadcn:Progress · Tooltip", PAL["violet"])
    # bottom: provider switcher
    panel(ax, cx0, iy + 0.5, cw, 2.7, "#ffffff", edge="#d8d2eb", radius=0.10)
    label(ax, cx0 + 0.20, iy + 3.0, "Routing config (LLM router)", size=9, weight="bold", color="#1a1530", dark=False)
    rules = [
        ("daily horoscope",  "Gemini 2.5 Flash · cache 24h", "ON",  PAL["aqua"]),
        ("ai chat",          "Claude 4 Sonnet · stream",      "ON",  PAL["aqua"]),
        ("yearly report",    "Claude 4 Opus · async queue",   "ON",  PAL["aqua"]),
        ("compatibility",    "Groq Llama 3.3 70B",            "OFF", PAL["rose"]),
    ]
    for i, (t, d, st, c) in enumerate(rules):
        y = iy + 2.55 - i * 0.55
        label(ax, cx0 + 0.20, y, t, size=8, weight="bold", color="#1a1530", dark=False)
        label(ax, cx0 + 2.50, y, d, size=7.5, color="#5a4d8c", dark=False)
        panel(ax, cx0 + cw - 1.10, y - 0.13, 0.85, 0.30, c, radius=0.15)
        label(ax, cx0 + cw - 0.67, y + 0.02, st, size=7, weight="bold", color="white", ha="center", dark=False)
    chip(ax, cx0, iy + 0.20, "shadcn:Switch · Form · Code editor", PAL["violet"])

screen(0, 0, "1", "Operations Overview",   s1, "overview")
screen(1, 0, "2", "Users",                 s2, "users")
screen(0, 1, "3", "Moderation",            s3, "moderation")
screen(1, 1, "4", "LLM Cost & Routing",    s4, "llm")

plt.tight_layout()
plt.savefig(OUT, dpi=140, format="jpg", bbox_inches="tight", facecolor="white")
print("WROTE", OUT)
