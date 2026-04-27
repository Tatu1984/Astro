"""Landing-page wireframe (public marketing site)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _wf import *

OUT = "/Users/sudipto/Desktop/projects/astro/docs/design/wireframes/01_landing.jpg"

fig, ax = setup_axes((20, 26), (0, 20), (0, 26), bg="#ffffff")

title_block(ax, 0.5, 25.4,
            "01 · Landing Page (Public)",
            "Single long-scroll page · astro-themed dark hero · light theme below the fold")
legend_block(ax, 14.2, 25.4)

# === Hero (dark, starfield + chart wheel + CTA) ===
hero_y, hero_h = 17.0, 7.6
panel(ax, 0.5, hero_y, 19.0, hero_h, PAL["bg_dark"], radius=0.30)
add_starfield(ax, 0.5, hero_y, 19.0, hero_h, density=0.0040, seed=42)

# nav
panel(ax, 0.7, hero_y + hero_h - 0.85, 18.6, 0.65, "#170f2c", radius=0.18)
label(ax, 1.0, hero_y + hero_h - 0.55, "✦ Astro", size=12, weight="bold", color=PAL["gold"], dark=True)
for i, n in enumerate(["Features", "How it works", "Pricing", "Astrologers", "Login"]):
    label(ax, 7.0 + i * 1.9, hero_y + hero_h - 0.55, n, size=9, color="#cfc6f5", dark=True)
panel(ax, 17.4, hero_y + hero_h - 0.78, 1.7, 0.50, PAL["gold"], radius=0.18)
label(ax, 18.25, hero_y + hero_h - 0.53, "Get started", size=8.5, weight="bold", color="#1a1530", ha="center", dark=False)
chip(ax, 17.4, hero_y + hero_h - 0.20, "reactbits:StarBorder", PAL["gold"])

# left: headline + CTA
label(ax, 1.2, hero_y + 5.4, "Your stars,", size=42, weight="bold", color=PAL["gold"], dark=True)
label(ax, 1.2, hero_y + 4.4, "personally decoded.", size=42, weight="bold", color="white", dark=True)
label(ax, 1.2, hero_y + 3.5, "Western + Vedic charts. Daily transits. AI chat with",
      size=11, color="#cfc6f5", dark=True)
label(ax, 1.2, hero_y + 3.1, "your own birth chart. Free to start.",
      size=11, color="#cfc6f5", dark=True)
panel(ax, 1.2, hero_y + 1.7, 2.8, 0.85, PAL["gold"], radius=0.20)
label(ax, 2.6, hero_y + 2.12, "Reveal my chart →", size=10, weight="bold", color="#1a1530", ha="center", dark=False)
panel(ax, 4.3, hero_y + 1.7, 2.6, 0.85, "#231a3d", radius=0.20, alpha=0.6)
label(ax, 5.6, hero_y + 2.12, "▶ Watch demo", size=10, color="white", ha="center", dark=True)
chip(ax, 1.2, hero_y + 1.45, "reactbits:ClickSpark", PAL["gold"])
chip(ax, 4.3, hero_y + 1.45, "shadcn:Button", PAL["violet"])

label(ax, 1.2, hero_y + 1.0,  "★ ★ ★ ★ ★  4.9 from 12k+ readings", size=9, color=PAL["gold"], dark=True)
label(ax, 1.2, hero_y + 0.55, "Free tier · No card required · iOS · Android · Web",
      size=8.5, color="#998fc7", italic=True, dark=True)

# right: chart wheel + animated text
chart_wheel(ax, 14.7, hero_y + 4.0, 2.6)
chip(ax, 14.7 - 1.6, hero_y + 1.1, "reactbits:Aurora background", PAL["gold"])
chip(ax, 14.7 - 1.6, hero_y + 0.6, "reactbits:VariableProximity headline", PAL["gold"])
chip(ax, 1.2, hero_y + 5.0, "reactbits:ShinyText", PAL["gold"])

# === Trust bar ===
panel(ax, 0.5, 16.1, 19.0, 0.7, "#1a1530", radius=0.10)
for i, t in enumerate(["TechCrunch", "Co-Star alt", "AstroForum", "Vogue India", "ProductHunt #1"]):
    label(ax, 1.5 + i * 3.7, 16.45, t, size=9, color="#cfc6f5", dark=True, weight="bold")

# === Features section (light) ===
ftop = 14.8
label(ax, 10.0, 15.6, "Everything in one chart-driven app",
      size=18, weight="bold", color="#1a1530", ha="center", dark=False)
label(ax, 10.0, 15.2, "From natal chart to dashas, daily horoscope to AI chat — all grounded in real astronomy.",
      size=10, italic=True, color="#5a4d8c", ha="center", dark=False)

feats = [
    ("Birth Chart Wheel",       "Interactive, zoomable.\nWestern + Vedic, North/South styles."),
    ("Daily / Weekly / Yearly", "Personalised via real-time transits & Vedic dashas."),
    ("AI Chat with your Chart", "Ask anything. Grounded in deterministic chart math."),
    ("Compatibility",           "Synastry, Composite, Ashtakoot Milan, Manglik check."),
    ("Muhurta Finder",          "Pick the right hour for any plan."),
    ("Long-form Reports",       "Career, love, health, education — exportable PDF."),
]
for i, (t, d) in enumerate(feats):
    col = i % 3; row = i // 3
    bx = 0.6 + col * 6.4
    by = 11.6 - row * 2.5
    card(ax, bx, by, 6.1, 2.2, dark=False, accent=PAL["violet"])
    panel(ax, bx + 0.25, by + 1.55, 0.55, 0.55, PAL["gold"], radius=0.12, alpha=0.55)
    label(ax, bx + 1.0, by + 1.78, t, size=11, weight="bold", color="#1a1530", dark=False)
    for li, line_t in enumerate(d.split("\n")):
        label(ax, bx + 0.30, by + 1.10 - li * 0.35, line_t, size=9, color="#5a4d8c", dark=False)

chip(ax, 0.6, 14.0, "reactbits:MagicBento (feature grid)", PAL["gold"])
chip(ax, 5.5, 14.0, "shadcn:Card", PAL["violet"])

# === How it works (3 steps) ===
hy = 8.4
label(ax, 10.0, 8.85, "Three steps to your reading", size=16, weight="bold", color="#1a1530", ha="center", dark=False)
steps = [("01", "Sign up", "Email, phone OTP, Google or Apple"),
         ("02", "Add birth data", "Date, time, place — auto geocoded"),
         ("03", "Reveal", "Chart + AI reading in seconds")]
for i, (n, t, d) in enumerate(steps):
    bx = 1.0 + i * 6.3
    card(ax, bx, hy - 1.7, 5.8, 1.5, dark=False)
    panel(ax, bx + 0.25, hy - 0.7, 0.85, 0.85, PAL["gold"], radius=0.18, alpha=0.55)
    label(ax, bx + 0.67, hy - 0.27, n, size=14, weight="bold", color="#1a1530", ha="center", dark=False)
    label(ax, bx + 1.30, hy - 0.27, t, size=12, weight="bold", color="#1a1530", dark=False)
    label(ax, bx + 1.30, hy - 0.6, d, size=8.5, color="#5a4d8c", dark=False)
chip(ax, 1.0, hy - 1.95, "reactbits:CountUp + DecryptedText (steps)", PAL["gold"])

# === Pricing ===
py = 5.6
label(ax, 10.0, 6.0, "Pricing", size=16, weight="bold", color="#1a1530", ha="center", dark=False)
plans = [("Free",    "$0",   ["1 chart", "Daily horoscope", "Basic AI chat (10/day)"], False),
         ("Plus",    "$6/mo",["5 charts", "All horoscopes", "Unlimited AI chat", "Compatibility"], True),
         ("Pro",     "$14/mo",["Unlimited charts", "Long-form reports", "Astrologer chat", "Priority"], False)]
for i, (n, p, feat, hi) in enumerate(plans):
    bx = 1.5 + i * 5.7
    card(ax, bx, py - 3.3, 5.2, 3.2, dark=False, accent=PAL["gold"] if hi else PAL["violet"])
    if hi:
        panel(ax, bx + 3.4, py - 0.20, 1.6, 0.40, PAL["gold"], radius=0.18)
        label(ax, bx + 4.2, py - 0.0, "Most popular", size=7.5, weight="bold", color="#1a1530", ha="center", dark=False)
    label(ax, bx + 0.3, py - 0.4, n, size=14, weight="bold", color="#1a1530", dark=False)
    label(ax, bx + 0.3, py - 0.85, p, size=22, weight="bold", color=PAL["violet"], dark=False)
    for j, f in enumerate(feat):
        label(ax, bx + 0.3, py - 1.5 - j * 0.32, "✓ " + f, size=9, color="#5a4d8c", dark=False)
    panel(ax, bx + 0.3, py - 3.05, 4.6, 0.50, PAL["violet"] if hi else "#d8d2eb", radius=0.18)
    label(ax, bx + 2.6, py - 2.80, "Choose", size=9, weight="bold",
          color="white" if hi else "#1a1530", ha="center", dark=False)
chip(ax, 1.5, 1.95, "shadcn:Tabs (Monthly / Annual toggle)", PAL["violet"])
chip(ax, 6.0, 1.95, "reactbits:TiltedCard on hover", PAL["gold"])

# === Footer ===
panel(ax, 0.5, 0.4, 19.0, 1.2, "#1a1530", radius=0.12)
label(ax, 1.0, 1.20, "✦ Astro", size=11, weight="bold", color=PAL["gold"], dark=True)
label(ax, 1.0, 0.80, "© 2026 · Privacy · Terms · Contact",
      size=8.5, color="#998fc7", dark=True)
for i, n in enumerate(["Twitter", "Instagram", "Discord", "App Store", "Play Store"]):
    label(ax, 9.0 + i * 1.9, 1.00, n, size=8.5, color="#cfc6f5", dark=True)

plt.tight_layout()
plt.savefig(OUT, dpi=140, format="jpg", bbox_inches="tight", facecolor="white")
print("WROTE", OUT)
