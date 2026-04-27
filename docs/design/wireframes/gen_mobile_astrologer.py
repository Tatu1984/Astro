"""Mobile (Astrologer) wireframe — 4 phone screens."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _wf import *
import numpy as np

OUT = "/Users/sudipto/Desktop/projects/astro/docs/design/wireframes/06_mobile_astrologer.jpg"
fig, ax = setup_axes((22, 13), (0, 22), (0, 13), bg="#ffffff")
title_block(ax, 0.5, 12.4,
            "06 · Mobile App — Astrologer (React Native / Expo)",
            "On-the-go consultation · accept queue · live chat with chart context")
legend_block(ax, 16.2, 12.4)

PHONE_W, PHONE_H = 4.0, 8.6
GAP_X = 1.1
LEFT, BOTTOM = 0.5, 1.4

def phone(col, num, name, drawer):
    fx = LEFT + col * (PHONE_W + GAP_X)
    fy = BOTTOM
    ix, iy, iw, ih = phone_frame(ax, fx, fy, PHONE_W, PHONE_H)
    drawer(ix, iy, iw, ih)
    caption(ax, fx, fy, PHONE_W, PHONE_H, num, name, "ASTROLOGER · MOBILE")

def status_bar(ix, iy, iw, ih):
    label(ax, ix + 0.20, iy + ih - 0.30, "9:41", size=7, color="white", weight="bold", dark=True)
    label(ax, ix + iw - 0.20, iy + ih - 0.30, "● ● ●", size=6, color="white", ha="right", dark=True)

def bottom_tabs(ix, iy, iw, ih, active):
    panel(ax, ix + 0.10, iy + 0.10, iw - 0.20, 0.65, "#170f2c", radius=0.12)
    tabs = [("◐","Queue"), ("✦","Session"), ("☼","Earnings"), ("☾","Schedule"), ("⚙","Profile")]
    for i, (g, t) in enumerate(tabs):
        x = ix + 0.20 + i * (iw - 0.40) / 5
        c = PAL["gold"] if i == active else PAL["muted"]
        label(ax, x + (iw - 0.40) / 10, iy + 0.55, g, size=10, color=c, ha="center", dark=True)
        label(ax, x + (iw - 0.40) / 10, iy + 0.25, t, size=5.5, color=c, weight="bold", ha="center", dark=True)

# === 1. Queue ===
def s1(ix, iy, iw, ih):
    status_bar(ix, iy, iw, ih)
    label(ax, ix + 0.20, iy + ih - 0.85, "Queue", size=10, weight="bold", color="white", dark=True)
    # online toggle
    panel(ax, ix + iw - 1.40, iy + ih - 1.00, 1.20, 0.40, PAL["aqua"], radius=0.18)
    ax.add_patch(plt.Circle((ix + iw - 0.40, iy + ih - 0.80), 0.13, color="white"))
    label(ax, ix + iw - 1.10, iy + ih - 0.78, "Online", size=7, weight="bold", color="#0a3a30", dark=False)
    chip(ax, ix + 0.20, iy + ih - 1.30, "shadcn-rn:Switch", PAL["violet"])
    # filters
    for i, t in enumerate(["All", "Marriage", "Career", "Tarot"]):
        x = ix + 0.20 + i * (iw - 0.40) / 4
        panel(ax, x, iy + ih - 1.85, (iw - 0.40) / 4 - 0.05, 0.30,
              PAL["violet"] if i == 0 else "#332b56", radius=0.10)
        label(ax, x + ((iw - 0.40) / 4 - 0.05) / 2, iy + ih - 1.70, t,
              size=6.5, weight="bold" if i == 0 else "normal",
              color="white", ha="center", dark=True)
    # queue cards
    for r in range(5):
        y = iy + ih - 2.30 - r * 0.95
        if r == 0:
            card(ax, ix + 0.20, y - 0.85, iw - 0.40, 0.85, accent=PAL["gold"])
        else:
            card(ax, ix + 0.20, y - 0.85, iw - 0.40, 0.85)
        avatar(ax, ix + 0.50, y - 0.42, r=0.20, color=PAL["violet"])
        names = ["Maya S.","Arjun M.","Priya K.","Rohan T.","Neha P."]
        topics = ["Career change · 30 min","Marriage timing · 15 min","Health · 60 min","General · 30 min","Career · 30 min"]
        wait = ["just now","2 min","5 min","8 min","12 min"]
        plans = ["Plus","Free","Pro","Plus","Free"]
        label(ax, ix + 0.85, y - 0.30, names[r], size=8, weight="bold", color="white", dark=True)
        label(ax, ix + 0.85, y - 0.55, topics[r], size=6, color="#cfc6f5", dark=True)
        label(ax, ix + iw - 0.30, y - 0.30, wait[r], size=6, color=PAL["gold"], ha="right", dark=True)
        label(ax, ix + iw - 0.30, y - 0.55, plans[r], size=6, color=PAL["muted"], ha="right", dark=True)
        if r == 0:
            panel(ax, ix + 0.85, y - 0.83, iw - 0.65 - 0.50, 0.20, PAL["gold"], radius=0.08)
            label(ax, ix + iw / 2, y - 0.74, "Accept · Start session", size=7, weight="bold", color="#1a1530", ha="center", dark=False)
    chip(ax, ix + 0.20, iy + 1.0, "shadcn-rn:Card · Sheet · Toast", PAL["violet"])
    bottom_tabs(ix, iy, iw, ih, active=0)

# === 2. Live session ===
def s2(ix, iy, iw, ih):
    status_bar(ix, iy, iw, ih)
    label(ax, ix + 0.20, iy + ih - 0.85, "Maya · 12:34", size=10, weight="bold", color="white", dark=True)
    panel(ax, ix + iw - 1.30, iy + ih - 1.00, 1.10, 0.40, PAL["rose"], radius=0.12)
    label(ax, ix + iw - 0.75, iy + ih - 0.78, "End", size=8, weight="bold", color="white", ha="center", dark=True)
    # client mini-chart strip
    card(ax, ix + 0.20, iy + ih - 2.85, iw - 0.40, 1.55, accent=PAL["gold"])
    chart_wheel(ax, ix + 0.85, iy + ih - 2.05, 0.55)
    label(ax, ix + 1.55, iy + ih - 1.55, "Maya Sharma · 30", size=8, weight="bold", color="white", dark=True)
    label(ax, ix + 1.55, iy + ih - 1.80, "Career change · 30 min", size=6.5, color=PAL["gold"], dark=True)
    label(ax, ix + 1.55, iy + ih - 2.05, "Sat / Mer dasha", size=6.5, color="#cfc6f5", dark=True)
    label(ax, ix + 1.55, iy + ih - 2.30, "Asc Cancer · Sun Cancer", size=6.5, color="#cfc6f5", dark=True)
    label(ax, ix + 1.55, iy + ih - 2.55, "View full chart →", size=6.5, color=PAL["gold"], dark=True)
    chip(ax, ix + 0.20, iy + ih - 3.10, "shadcn-rn:Sheet (full chart)", PAL["violet"])
    # chat
    msgs = [("u","Switch from finance to product?"),
            ("a","Saturn-Mercury favours analytical roles. D10 Mer..."),
            ("u","When?"),
            ("a","12 May — Jupiter conj Sun.")]
    y = iy + ih - 3.45
    for r, m in msgs:
        is_u = r == "u"
        bw = (iw - 0.50) * 0.74
        bx = ix + (iw - bw - 0.20 if not is_u else 0.20)
        bg = "#332b56" if is_u else PAL["gold"]
        c  = "white" if is_u else "#1a1530"
        panel(ax, bx, y - 0.50, bw, 0.42, bg, radius=0.14)
        label(ax, bx + 0.12, y - 0.22, m[:40], size=6.5, color=c, dark=is_u)
        y -= 0.65
    # AI hint
    panel(ax, ix + 0.20, iy + 1.65, iw - 0.40, 0.50, "#1a3530", radius=0.10)
    label(ax, ix + 0.30, iy + 1.90, "💡 AI: 12H Mercury · tech-product fit", size=6.5, color=PAL["aqua"], italic=True, dark=True)
    chip(ax, ix + 0.20, iy + 1.40, "reactbits:DecryptedText hint", PAL["gold"])
    # mode toggles
    panel(ax, ix + 0.20, iy + 0.95, iw - 0.40, 0.45, "#170f2c", radius=0.12)
    for i, t in enumerate(["💬", "🎙", "📷", "📎"]):
        x = ix + 0.20 + i * (iw - 0.40) / 4
        if i == 0:
            panel(ax, x + 0.05, iy + 1.00, (iw - 0.40) / 4 - 0.10, 0.35, PAL["violet"], radius=0.08)
        label(ax, x + (iw - 0.40) / 8, iy + 1.18, t, size=10, color="white", ha="center", dark=True)
    chip(ax, ix + 0.20, iy + 0.55, "shadcn-rn:ToggleGroup", PAL["violet"])

# === 3. Earnings (mobile) ===
def s3(ix, iy, iw, ih):
    status_bar(ix, iy, iw, ih)
    label(ax, ix + 0.20, iy + ih - 0.85, "Earnings", size=10, weight="bold", color="white", dark=True)
    label(ax, ix + iw - 0.20, iy + ih - 0.85, "30d ▾", size=7, color=PAL["gold"], ha="right", dark=True)
    # big number
    card(ax, ix + 0.20, iy + ih - 3.50, iw - 0.40, 2.40, accent=PAL["gold"])
    label(ax, ix + iw / 2, iy + ih - 1.55, "₹38,420", size=22, weight="bold", color="white", ha="center", dark=True)
    label(ax, ix + iw / 2, iy + ih - 2.00, "this month · +18% vs last", size=7, color=PAL["aqua"], ha="center", dark=True)
    sparkline(ax, ix + 0.40, iy + ih - 3.40, iw - 0.80, 0.70, color=PAL["aqua"], points=30, seed=2)
    chip(ax, ix + 0.20, iy + ih - 3.75, "reactbits:CountUp", PAL["gold"])
    # mini KPIs
    for i, (t, v) in enumerate([("Sessions", "47"), ("Tips", "₹2,160"), ("Avg ★", "4.92")]):
        bx = ix + 0.20 + i * ((iw - 0.40) / 3); bw = (iw - 0.40) / 3 - 0.10
        card(ax, bx, iy + ih - 4.95, bw, 1.30)
        label(ax, bx + 0.15, iy + ih - 4.10, t, size=6.5, color=PAL["muted"], dark=True)
        label(ax, bx + 0.15, iy + ih - 4.55, v, size=11, weight="bold", color="white", dark=True)
    chip(ax, ix + 0.20, iy + ih - 5.15, "shadcn-rn:Card", PAL["violet"])
    # transactions list
    label(ax, ix + 0.20, iy + 2.90, "Recent", size=8, weight="bold", color=PAL["gold"], dark=True)
    for r in range(5):
        y = iy + 2.50 - r * 0.40
        panel(ax, ix + 0.20, y - 0.16, iw - 0.40, 0.32, "#231a3d", radius=0.06)
        label(ax, ix + 0.30, y, ["Maya S.","Tip · Rohan","Neha P.","Vikram J.","Priya K."][r],
              size=7, color="white", dark=True)
        label(ax, ix + iw - 0.30, y, ["+₹600","+₹150","+₹1,200","+₹600","+₹600"][r],
              size=7, weight="bold", color=PAL["aqua"], ha="right", dark=True)
    chip(ax, ix + 0.20, iy + 0.95, "shadcn-rn:Table · Skeleton", PAL["violet"])
    bottom_tabs(ix, iy, iw, ih, active=2)

# === 4. Schedule ===
def s4(ix, iy, iw, ih):
    status_bar(ix, iy, iw, ih)
    label(ax, ix + 0.20, iy + ih - 0.85, "Schedule", size=10, weight="bold", color="white", dark=True)
    label(ax, ix + iw - 0.20, iy + ih - 0.85, "+", size=12, color=PAL["gold"], ha="right", dark=True)
    # week strip
    days = ["Sun 26", "Mon 27", "Tue 28", "Wed 29", "Thu 30"]
    for i, d in enumerate(days):
        x = ix + 0.20 + i * (iw - 0.40) / 5
        bw = (iw - 0.40) / 5 - 0.05
        col = PAL["violet"] if i == 0 else "#332b56"
        panel(ax, x, iy + ih - 1.85, bw, 0.65, col, radius=0.10)
        label(ax, x + bw / 2, iy + ih - 1.50, d.split()[0], size=6, color="white", ha="center", dark=True)
        label(ax, x + bw / 2, iy + ih - 1.75, d.split()[1], size=8, weight="bold", color="white", ha="center", dark=True)
    chip(ax, ix + 0.20, iy + ih - 2.15, "shadcn-rn:Calendar · Tabs", PAL["violet"])
    # time slots
    slots = [("08:00", "Free", "#332b56"),
             ("09:30", "Maya · Career · 30m", PAL["gold"]),
             ("10:30", "Free", "#332b56"),
             ("11:00", "Arjun · Marriage · 60m", PAL["aqua"]),
             ("12:30", "Lunch break", PAL["muted"]),
             ("13:30", "Free", "#332b56"),
             ("14:00", "Group · Family compat · 45m", PAL["violet"]),
             ("15:00", "Priya · Health · 30m", PAL["rose"])]
    for i, (t, txt, c) in enumerate(slots):
        y = iy + ih - 2.55 - i * 0.50
        label(ax, ix + 0.30, y, t, size=6.5, color=PAL["muted"], dark=True)
        panel(ax, ix + 1.05, y - 0.18, iw - 1.25, 0.36, c if c != "#332b56" else "#231a3d", radius=0.08)
        if c != "#332b56":
            panel(ax, ix + 1.05, y - 0.18, 0.06, 0.36, c, radius=0.04)
        label(ax, ix + 1.20, y, txt, size=7, color="white" if c != "#332b56" else PAL["muted"], dark=True)
    chip(ax, ix + 0.20, iy + 0.95, "shadcn-rn:Sheet · Form (slot edit)", PAL["violet"])
    bottom_tabs(ix, iy, iw, ih, active=3)

phone(0, "1", "Live Queue",     s1)
phone(1, "2", "Live Session",   s2)
phone(2, "3", "Earnings",       s3)
phone(3, "4", "Schedule",       s4)

plt.tight_layout()
plt.savefig(OUT, dpi=140, format="jpg", bbox_inches="tight", facecolor="white")
print("WROTE", OUT)
