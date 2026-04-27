"""Mobile (User) wireframe — 8 phone screens in a 4×2 grid (React Native / Expo)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _wf import *
import numpy as np

OUT = "/Users/sudipto/Desktop/projects/astro/docs/design/wireframes/05_mobile_user.jpg"
fig, ax = setup_axes((24, 22), (0, 24), (0, 22), bg="#ffffff")
title_block(ax, 0.5, 21.3,
            "05 · Mobile App — User (React Native / Expo)",
            "8 core screens · bottom-tab nav · astro-themed dark default · iOS + Android")
legend_block(ax, 18.0, 21.3)

PHONE_W, PHONE_H = 4.0, 8.6
GAP_X, GAP_Y = 1.4, 2.0
LEFT, BOTTOM = 0.5, 1.4

def screen(col, row, num, name, drawer):
    fx = LEFT + col * (PHONE_W + GAP_X)
    fy = BOTTOM + (1 - row) * (PHONE_H + GAP_Y)
    ix, iy, iw, ih = phone_frame(ax, fx, fy, PHONE_W, PHONE_H)
    drawer(ix, iy, iw, ih)
    caption(ax, fx, fy, PHONE_W, PHONE_H, num, name, "USER · MOBILE")

def status_bar(ix, iy, iw, ih):
    label(ax, ix + 0.20, iy + ih - 0.30, "9:41", size=7, color="white", weight="bold", dark=True)
    label(ax, ix + iw - 0.20, iy + ih - 0.30, "● ● ●", size=6, color="white", ha="right", dark=True)

def bottom_tabs(ix, iy, iw, ih, active=0):
    panel(ax, ix + 0.10, iy + 0.10, iw - 0.20, 0.65, "#170f2c", radius=0.12)
    tabs = [("◐","Today"), ("◯","Chart"), ("☼","Predict"), ("✦","Chat"), ("☾","More")]
    for i, (g, t) in enumerate(tabs):
        x = ix + 0.20 + i * (iw - 0.40) / 5
        c = PAL["gold"] if i == active else PAL["muted"]
        label(ax, x + (iw - 0.40) / 10, iy + 0.55, g, size=10, color=c, ha="center", dark=True)
        label(ax, x + (iw - 0.40) / 10, iy + 0.25, t, size=5.5, color=c, weight="bold", ha="center", dark=True)

# === 1. Onboarding (birth data) ===
def s1(ix, iy, iw, ih):
    status_bar(ix, iy, iw, ih)
    label(ax, ix + 0.20, iy + ih - 0.85, "Step 2 of 3", size=6.5, color=PAL["muted"], dark=True)
    panel(ax, ix + 0.20, iy + ih - 0.95, iw - 0.40, 0.06, "#332b56", radius=0.03)
    panel(ax, ix + 0.20, iy + ih - 0.95, (iw - 0.40) * 0.66, 0.06, PAL["gold"], radius=0.03)
    label(ax, ix + 0.20, iy + ih - 1.50, "Tell us when", size=11, weight="bold", color="white", dark=True)
    label(ax, ix + 0.20, iy + ih - 1.80, "and where you were born", size=11, weight="bold", color="white", dark=True)
    label(ax, ix + 0.20, iy + ih - 2.15, "Used to compute your chart precisely.",
          size=6.5, color="#cfc6f5", italic=True, dark=True)
    fields = [("Full name", "Maya Sharma"),
              ("Birth date", "14 / 07 / 1995"),
              ("Birth time", "04 : 32  AM"),
              ("Birth place", "Mumbai, India"),
              ("Time zone", "Asia/Kolkata · auto")]
    for i, (k, v) in enumerate(fields):
        y = iy + ih - 2.85 - i * 0.75
        label(ax, ix + 0.20, y + 0.10, k, size=6.5, color=PAL["gold"], dark=True)
        panel(ax, ix + 0.20, y - 0.42, iw - 0.40, 0.45, "#231a3d", radius=0.10)
        label(ax, ix + 0.30, y - 0.20, v, size=7.5, color="white", dark=True)
    label(ax, ix + 0.20, iy + 1.60, "□ I don't know my exact time", size=7, color="#cfc6f5", dark=True)
    panel(ax, ix + 0.20, iy + 0.95, iw - 0.40, 0.55, PAL["gold"], radius=0.18)
    label(ax, ix + iw / 2, iy + 1.22, "Reveal my chart →", size=9, weight="bold", color="#1a1530", ha="center", dark=False)
    chip(ax, ix + 0.20, iy + 0.55, "shadcn-form-rn (Form, Input, DatePicker)", PAL["violet"])
    chip(ax, ix + 0.20, iy + 0.25, "reactbits:ClickSpark on CTA", PAL["gold"])

# === 2. Today (Daily horoscope) ===
def s2(ix, iy, iw, ih):
    status_bar(ix, iy, iw, ih)
    label(ax, ix + 0.20, iy + ih - 0.85, "Hi Maya,", size=8, color="#cfc6f5", dark=True)
    label(ax, ix + 0.20, iy + ih - 1.20, "Sunday, 26 Apr", size=11, weight="bold", color="white", dark=True)
    avatar(ax, ix + iw - 0.40, iy + ih - 1.10, r=0.22)
    # hero card (today)
    card(ax, ix + 0.20, iy + ih - 4.60, iw - 0.40, 3.20, accent=PAL["gold"])
    chart_wheel(ax, ix + iw / 2, iy + ih - 3.30, 1.05)
    label(ax, ix + iw / 2, iy + ih - 4.30, "Moon trine your Sun", size=9, weight="bold", color="white", ha="center", dark=True)
    label(ax, ix + iw / 2, iy + ih - 4.50, "Score 78 · favourable", size=6.5, color=PAL["gold"], ha="center", dark=True)
    chip(ax, ix + 0.30, iy + ih - 4.80, "reactbits:Aurora bg + ShinyText", PAL["gold"])
    # mini cards row
    for i, (g, t, v, c) in enumerate([("♥","Love","82",PAL["rose"]), ("$","Money","65",PAL["aqua"]), ("✦","Luck","91",PAL["gold"])]):
        bx = ix + 0.20 + i * ((iw - 0.40) / 3 + 0.0); bw = (iw - 0.40) / 3 - 0.10
        card(ax, bx, iy + ih - 5.85, bw, 1.0, accent=c)
        label(ax, bx + 0.15, iy + ih - 5.05, g, size=10, color=c, weight="bold", dark=True)
        label(ax, bx + 0.15, iy + ih - 5.35, t, size=6.5, color="#cfc6f5", dark=True)
        label(ax, bx + 0.15, iy + ih - 5.65, v, size=11, weight="bold", color="white", dark=True)
    # transit card
    card(ax, ix + 0.20, iy + 1.10, iw - 0.40, 1.55)
    label(ax, ix + 0.30, iy + 2.40, "Next big transit", size=7, color=PAL["muted"], dark=True)
    label(ax, ix + 0.30, iy + 2.10, "Jupiter conj Sun", size=9, weight="bold", color=PAL["gold"], dark=True)
    label(ax, ix + 0.30, iy + 1.80, "in 16 days · 12 May 2026", size=7, color="#cfc6f5", dark=True)
    sparkline(ax, ix + 0.30, iy + 1.20, iw - 0.60, 0.40, color=PAL["aqua"], seed=4)
    chip(ax, ix + 0.20, iy + 0.85, "reactbits:CountUp + MagicBento", PAL["gold"])
    bottom_tabs(ix, iy, iw, ih, active=0)

# === 3. Chart screen ===
def s3(ix, iy, iw, ih):
    status_bar(ix, iy, iw, ih)
    label(ax, ix + 0.20, iy + ih - 0.85, "Maya · Vedic", size=10, weight="bold", color="white", dark=True)
    label(ax, ix + iw - 0.20, iy + ih - 0.85, "⇄", size=11, color=PAL["gold"], ha="right", dark=True)
    # tabs
    for i, t in enumerate(["D1", "D9", "D10", "Trans"]):
        x = ix + 0.20 + i * (iw - 0.40) / 4
        if i == 0:
            panel(ax, x, iy + ih - 1.40, (iw - 0.40) / 4 - 0.05, 0.30, PAL["violet"], radius=0.06)
        label(ax, x + ((iw - 0.40) / 4 - 0.05) / 2, iy + ih - 1.25, t, size=7,
              weight="bold" if i == 0 else "normal", color="white", ha="center", dark=True)
    chip(ax, ix + 0.20, iy + ih - 1.70, "shadcn-rn:Tabs", PAL["violet"])
    # chart wheel large
    chart_wheel(ax, ix + iw / 2, iy + ih - 4.20, 1.55)
    chip(ax, ix + 0.20, iy + ih - 6.00, "custom: react-native-svg ChartWheel + Reanimated 3", "#5a4d8c")
    # info strip
    card(ax, ix + 0.20, iy + 2.10, iw - 0.40, 1.6)
    label(ax, ix + 0.30, iy + 3.45, "Asc · Cancer 12°", size=8, weight="bold", color="white", dark=True)
    label(ax, ix + 0.30, iy + 3.15, "Sun · Cancer 22° · 1H", size=7, color="#cfc6f5", dark=True)
    label(ax, ix + 0.30, iy + 2.85, "Moon · Pisces 04° · 9H · Revati", size=7, color="#cfc6f5", dark=True)
    label(ax, ix + 0.30, iy + 2.55, "Mercury · Cancer 28° · 1H", size=7, color="#cfc6f5", dark=True)
    label(ax, ix + 0.30, iy + 2.25, "+ 6 more planets", size=7, color=PAL["gold"], dark=True)
    chip(ax, ix + 0.20, iy + 1.85, "shadcn-rn:Sheet (planet detail)", PAL["violet"])
    # CTA
    panel(ax, ix + 0.20, iy + 1.05, iw - 0.40, 0.55, PAL["gold"], radius=0.18)
    label(ax, ix + iw / 2, iy + 1.32, "AI · Explain my chart", size=9, weight="bold", color="#1a1530", ha="center", dark=False)
    bottom_tabs(ix, iy, iw, ih, active=1)

# === 4. Predictions tabs ===
def s4(ix, iy, iw, ih):
    status_bar(ix, iy, iw, ih)
    label(ax, ix + 0.20, iy + ih - 0.85, "Predictions", size=11, weight="bold", color="white", dark=True)
    for i, t in enumerate(["Daily", "Weekly", "Monthly", "Yearly"]):
        x = ix + 0.20 + i * (iw - 0.40) / 4
        if i == 1:
            panel(ax, x, iy + ih - 1.45, (iw - 0.40) / 4 - 0.05, 0.30, PAL["violet"], radius=0.06)
        label(ax, x + ((iw - 0.40) / 4 - 0.05) / 2, iy + ih - 1.30, t, size=6.5,
              weight="bold" if i == 1 else "normal", color="white", ha="center", dark=True)
    # week timeline
    card(ax, ix + 0.20, iy + ih - 4.20, iw - 0.40, 2.55, accent=PAL["gold"])
    label(ax, ix + 0.30, iy + ih - 1.95, "Week of 26 Apr – 2 May", size=8, weight="bold", color="white", dark=True)
    days = ["S","M","T","W","T","F","S"]
    scores = [0.6, 0.8, 0.4, 0.9, 0.7, 0.5, 0.85]
    for i, (d, s) in enumerate(zip(days, scores)):
        x = ix + 0.40 + i * (iw - 0.80) / 6
        bar(ax, x - 0.10, iy + ih - 3.85, 0.20, s * 1.10, PAL["aqua"])
        label(ax, x, iy + ih - 4.10, d, size=7, color="white", ha="center", dark=True)
    chip(ax, ix + 0.20, iy + ih - 4.40, "reactbits:VariableProximity (heading)", PAL["gold"])
    # narrative
    card(ax, ix + 0.20, iy + 1.85, iw - 0.40, 3.5)
    label(ax, ix + 0.30, iy + 5.10, "Highlights", size=8, weight="bold", color=PAL["gold"], dark=True)
    for i in range(8):
        panel(ax, ix + 0.30, iy + 4.70 - i * 0.32, iw - 0.60 - (i % 3) * 0.4, 0.16, "#332b56", radius=0.04)
    chip(ax, ix + 0.20, iy + 1.55, "reactbits:DecryptedText (reveal text)", PAL["gold"])
    # actions
    panel(ax, ix + 0.20, iy + 0.95, iw - 0.40, 0.55, PAL["violet"], radius=0.18)
    label(ax, ix + iw / 2, iy + 1.22, "Share this week ↗", size=9, weight="bold", color="white", ha="center", dark=True)
    bottom_tabs(ix, iy, iw, ih, active=2)

# === 5. AI Chat ===
def s5(ix, iy, iw, ih):
    status_bar(ix, iy, iw, ih)
    label(ax, ix + 0.20, iy + ih - 0.85, "Chat with your chart", size=10, weight="bold", color="white", dark=True)
    label(ax, ix + 0.20, iy + ih - 1.05, "Vedic · Maya", size=6.5, color=PAL["muted"], dark=True)
    msgs = [("ai", "Hi Maya ✦ ask me anything about your chart."),
            ("user","What career suits me in 2027?"),
            ("ai", "With Saturn-Mercury dasha + Jup conj Sun in May 2027..."),
            ("user","Should I switch jobs?"),
            ("ai", "Strong window: 12 May – 30 Jul 2027. Here's why...")]
    y = iy + ih - 1.50
    for r, m in msgs:
        is_user = r == "user"
        bw = (iw - 0.50) * (0.62 if is_user else 0.78)
        bx = ix + (iw - bw - 0.20 if is_user else 0.20)
        bg = PAL["violet"] if is_user else "#332b56"
        panel(ax, bx, y - 0.65, bw, 0.55, bg, radius=0.16)
        for i, ln in enumerate([m[:32], m[32:]] if len(m) > 32 else [m]):
            label(ax, bx + 0.12, y - 0.25 - i * 0.20, ln, size=6.5, color="white", dark=True)
        y -= 0.85
    chip(ax, ix + 0.20, iy + 1.95, "reactbits:TextType (AI streaming)", PAL["gold"])
    # quick chips
    panel(ax, ix + 0.20, iy + 1.20, iw - 0.40, 0.55, "#170f2c", radius=0.12)
    for i, t in enumerate(["When marry?", "Best year?", "Health?"]):
        x = ix + 0.30 + i * (iw - 0.60) / 3
        panel(ax, x, iy + 1.30, (iw - 0.60) / 3 - 0.10, 0.35, "#332b56", radius=0.10)
        label(ax, x + ((iw - 0.60) / 3 - 0.10) / 2, iy + 1.47, t, size=6.5, color="white", ha="center", dark=True)
    chip(ax, ix + 0.20, iy + 0.95, "shadcn-rn:Toggle quick prompts", PAL["violet"])
    # input
    panel(ax, ix + 0.20, iy + 0.40, iw - 0.95, 0.50, "#231a3d", radius=0.16)
    label(ax, ix + 0.30, iy + 0.65, "Ask anything…", size=7, color=PAL["muted"], dark=True)
    panel(ax, ix + iw - 0.70, iy + 0.40, 0.50, 0.50, PAL["gold"], radius=0.16)
    label(ax, ix + iw - 0.45, iy + 0.65, "▶", size=9, color="#1a1530", ha="center", dark=False)

# === 6. Compatibility ===
def s6(ix, iy, iw, ih):
    status_bar(ix, iy, iw, ih)
    label(ax, ix + 0.20, iy + ih - 0.85, "Compatibility", size=10, weight="bold", color="white", dark=True)
    # picker row
    for i, (n, c) in enumerate([("Maya", PAL["violet"]), ("Arjun", PAL["gold"])]):
        x = ix + 0.20 + i * ((iw - 0.40) / 2 + 0.05)
        avatar(ax, x + 0.30, iy + ih - 1.55, r=0.22, color=c)
        label(ax, x + 0.65, iy + ih - 1.45, n, size=8, weight="bold", color="white", dark=True)
        label(ax, x + 0.65, iy + ih - 1.70, "Cancer · 1995", size=6, color="#cfc6f5", dark=True)
    label(ax, ix + iw / 2, iy + ih - 1.55, "♥", size=12, color=PAL["rose"], ha="center", dark=True)
    # score ring
    card(ax, ix + 0.20, iy + ih - 4.85, iw - 0.40, 2.95, accent=PAL["gold"])
    cx, cy_ = ix + iw / 2, iy + ih - 3.40
    ax.add_patch(plt.Circle((cx, cy_), 0.85, facecolor="none", edgecolor="#332b56", linewidth=10))
    angles = np.linspace(np.pi / 2, np.pi / 2 - 2 * np.pi * 0.84, 100)
    arc_x = cx + 0.85 * np.cos(angles); arc_y = cy_ + 0.85 * np.sin(angles)
    ax.plot(arc_x, arc_y, color=PAL["gold"], linewidth=10)
    label(ax, cx, cy_ + 0.10, "84", size=20, weight="bold", color="white", ha="center", dark=True)
    label(ax, cx, cy_ - 0.20, "/ 100", size=7, color=PAL["muted"], ha="center", dark=True)
    label(ax, cx, iy + ih - 4.50, "Strong romantic match", size=8, weight="bold", color=PAL["gold"], ha="center", dark=True)
    chip(ax, ix + 0.20, iy + ih - 5.05, "reactbits:CountUp · ProgressRing", PAL["gold"])
    # ashtakoot mini
    card(ax, ix + 0.20, iy + 1.85, iw - 0.40, 1.95)
    label(ax, ix + 0.30, iy + 3.55, "Vedic · Ashtakoot 28/36", size=8, weight="bold", color="white", dark=True)
    for i in range(8):
        bx = ix + 0.30 + (i % 4) * (iw - 0.80) / 4
        by = iy + 3.05 - (i // 4) * 0.45
        v = [1, 2, 2, 3, 4, 5, 6, 5][i]; mx = [1, 2, 3, 4, 5, 6, 7, 8][i]
        label(ax, bx + 0.05, by + 0.10, ["Var","Vas","Tar","Yon","GMt","Gan","Bhk","Nad"][i],
              size=6, color=PAL["gold"], dark=True)
        bar(ax, bx, by - 0.10, ((iw - 0.80) / 4 - 0.10) * (v / mx), 0.10, PAL["violet"])
    chip(ax, ix + 0.20, iy + 1.55, "shadcn-rn:Progress · Tooltip", PAL["violet"])
    panel(ax, ix + 0.20, iy + 0.95, iw - 0.40, 0.55, PAL["violet"], radius=0.18)
    label(ax, ix + iw / 2, iy + 1.22, "See full report →", size=9, weight="bold", color="white", ha="center", dark=True)

# === 7. Profile / Settings ===
def s7(ix, iy, iw, ih):
    status_bar(ix, iy, iw, ih)
    label(ax, ix + 0.20, iy + ih - 0.85, "Profile", size=10, weight="bold", color="white", dark=True)
    # avatar block
    avatar(ax, ix + iw / 2, iy + ih - 2.10, r=0.50)
    label(ax, ix + iw / 2, iy + ih - 2.85, "Maya Sharma", size=10, weight="bold", color="white", ha="center", dark=True)
    label(ax, ix + iw / 2, iy + ih - 3.10, "Plus · since Mar 2026", size=6.5, color=PAL["muted"], ha="center", dark=True)
    chip(ax, ix + 0.20, iy + ih - 3.40, "reactbits:TiltedCard avatar", PAL["gold"])
    # menu list
    items = [("Saved profiles (5/50)", "👥"),
             ("Subscription", "✦"),
             ("Notifications", "🔔"),
             ("Theme", "🌙"),
             ("Language · EN/HI", "ⓁⒶ"),
             ("Privacy & data", "🔒"),
             ("Export charts (JSON/PDF)", "⤓"),
             ("Help & support", "?"),
             ("Sign out", "→")]
    for i, (t, g) in enumerate(items):
        y = iy + ih - 3.85 - i * 0.42
        panel(ax, ix + 0.20, y - 0.18, iw - 0.40, 0.35, "#231a3d", radius=0.08)
        label(ax, ix + 0.35, y, g, size=7.5, color=PAL["gold"], dark=True)
        label(ax, ix + 0.75, y, t, size=7, color="white", dark=True)
        label(ax, ix + iw - 0.30, y, "›", size=8, color=PAL["muted"], ha="right", dark=True)
    chip(ax, ix + 0.20, iy + 0.95, "shadcn-rn:Sheet · Switch · Select", PAL["violet"])
    bottom_tabs(ix, iy, iw, ih, active=4)

# === 8. Calendar / Muhurta ===
def s8(ix, iy, iw, ih):
    status_bar(ix, iy, iw, ih)
    label(ax, ix + 0.20, iy + ih - 0.85, "April 2026", size=10, weight="bold", color="white", dark=True)
    label(ax, ix + iw - 0.20, iy + ih - 0.85, "+", size=12, color=PAL["gold"], ha="right", dark=True)
    # weekday header
    for i, d in enumerate(["S","M","T","W","T","F","S"]):
        x = ix + 0.30 + i * (iw - 0.60) / 6
        label(ax, x, iy + ih - 1.30, d, size=6.5, color=PAL["muted"], ha="center", dark=True)
    # mini month grid
    for r in range(5):
        for c in range(7):
            x = ix + 0.30 + c * (iw - 0.60) / 6 - 0.20
            y = iy + ih - 1.65 - r * 0.45
            day = r * 7 + c + 1
            if 1 <= day <= 30:
                color = "#332b56"
                if day == 26: color = PAL["gold"]
                if day in (12, 18): color = PAL["aqua"]
                if day in (5,):     color = PAL["rose"]
                panel(ax, x, y - 0.18, 0.40, 0.36, color, radius=0.06)
                tc = "#1a1530" if color != "#332b56" else "white"
                label(ax, x + 0.20, y, str(day), size=6.5, weight="bold", color=tc, ha="center", dark=False)
    chip(ax, ix + 0.20, iy + ih - 4.20, "shadcn-rn:Calendar · custom suitability dot", PAL["violet"])
    # selected day card
    card(ax, ix + 0.20, iy + 2.30, iw - 0.40, 2.10, accent=PAL["gold"])
    label(ax, ix + 0.30, iy + 4.10, "26 Apr · Sunday", size=8, weight="bold", color=PAL["gold"], dark=True)
    label(ax, ix + 0.30, iy + 3.75, "Tithi · Trayodashi", size=7, color="#cfc6f5", dark=True)
    label(ax, ix + 0.30, iy + 3.45, "Nakshatra · Pushya", size=7, color="#cfc6f5", dark=True)
    label(ax, ix + 0.30, iy + 3.15, "Best window · 09:42 – 11:18", size=7, color=PAL["aqua"], dark=True)
    label(ax, ix + 0.30, iy + 2.85, "Avoid · 14:00 – 15:30 Rahu kaal", size=7, color=PAL["rose"], dark=True)
    label(ax, ix + 0.30, iy + 2.55, "Suitability · 78 / 100", size=7, color=PAL["gold"], weight="bold", dark=True)
    chip(ax, ix + 0.20, iy + 2.05, "reactbits:ShinyText (Muhurta tag)", PAL["gold"])
    # alerts list
    label(ax, ix + 0.20, iy + 1.75, "Upcoming alerts", size=7, weight="bold", color="white", dark=True)
    for i, (t, d) in enumerate([("Eclipse · 12 May", "set reminder"),
                                ("Mars stations RX · 30 May", "set reminder")]):
        y = iy + 1.40 - i * 0.40
        panel(ax, ix + 0.20, y - 0.15, iw - 0.40, 0.32, "#231a3d", radius=0.06)
        label(ax, ix + 0.30, y, t, size=6.5, color="white", dark=True)
        label(ax, ix + iw - 0.30, y, d, size=6, color=PAL["gold"], ha="right", dark=True)
    chip(ax, ix + 0.20, iy + 0.50, "expo-notifications · shadcn-rn:Toast", PAL["violet"])

screen(0, 0, "1", "Onboarding · Birth data", s1)
screen(1, 0, "2", "Today",                   s2)
screen(2, 0, "3", "Chart",                   s3)
screen(3, 0, "4", "Predictions",             s4)
screen(0, 1, "5", "AI Chat",                 s5)
screen(1, 1, "6", "Compatibility",           s6)
screen(2, 1, "7", "Profile",                 s7)
screen(3, 1, "8", "Calendar · Muhurta",      s8)

plt.tight_layout()
plt.savefig(OUT, dpi=140, format="jpg", bbox_inches="tight", facecolor="white")
print("WROTE", OUT)
