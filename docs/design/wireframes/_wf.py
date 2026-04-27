"""Wireframe drawing helpers — shared by all persona generators.

Astro Theme Palette
-------------------
- bg_dark / surface_dark for the night/astro skin
- bg_light / surface_light for daylight/admin tone
- gold (highlight), violet (primary), aqua (secondary), rose (alert)
"""
from __future__ import annotations
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle
from matplotlib.lines import Line2D
import numpy as np
import random

PAL = {
    "bg_dark":      "#0e0a1f",
    "surface_dark": "#1a1530",
    "card_dark":    "#231a3d",
    "bg_light":     "#f7f5fb",
    "surface_light":"#ffffff",
    "card_light":   "#f0ecfa",
    "ink_dark":     "#e9e3ff",
    "ink_light":    "#1a1530",
    "muted":        "#7e72a6",
    "gold":         "#f4c95d",
    "violet":       "#7c5cff",
    "aqua":         "#3ad6c2",
    "rose":         "#ff6b8a",
    "stroke":       "#3a2f6b",
}

def add_starfield(ax, x0, y0, w, h, density=0.0035, seed=7):
    rng = random.Random(seed)
    n = int(w * h * 100 * density)
    xs = [x0 + rng.random() * w for _ in range(n)]
    ys = [y0 + rng.random() * h for _ in range(n)]
    sizes = [rng.random() * 6 + 1 for _ in range(n)]
    ax.scatter(xs, ys, s=sizes, c="white", alpha=0.55, linewidths=0)

def panel(ax, x, y, w, h, color, edge=None, alpha=1.0, radius=0.18):
    p = FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f"round,pad=0.02,rounding_size={radius}",
        linewidth=1.0,
        edgecolor=edge or "none",
        facecolor=color, alpha=alpha,
    )
    ax.add_patch(p)

def card(ax, x, y, w, h, dark=True, accent=None, alpha=1.0):
    bg = PAL["card_dark"] if dark else PAL["card_light"]
    panel(ax, x, y, w, h, bg, edge=PAL["stroke"] if dark else "#d8d2eb", alpha=alpha)
    if accent:
        # left accent stripe
        panel(ax, x, y + 0.06, 0.06, h - 0.12, accent, alpha=0.95, radius=0.05)

def label(ax, x, y, text, *, size=9.0, color=None, weight="normal",
          ha="left", va="center", italic=False, dark=True):
    style = "italic" if italic else "normal"
    c = color or (PAL["ink_dark"] if dark else PAL["ink_light"])
    ax.text(x, y, text, fontsize=size, color=c, fontweight=weight,
            ha=ha, va=va, fontstyle=style)

def chip(ax, x, y, text, color, *, dark=True, size=7.0):
    """Component callout chip: 'shadcn:Card' / 'reactbits:Aurora'."""
    txt = ax.text(x, y, text, fontsize=size, color="white", fontweight="bold",
                  ha="left", va="center")
    txt.set_bbox(dict(facecolor=color, edgecolor="none", boxstyle="round,pad=0.22"))

def line(ax, x1, y1, x2, y2, color=None, lw=0.8, dashed=False, dark=True):
    c = color or (PAL["stroke"] if dark else "#d8d2eb")
    ls = (0, (3, 3)) if dashed else "-"
    ax.add_line(Line2D([x1, x2], [y1, y2], color=c, linewidth=lw, linestyle=ls))

def hline(ax, x1, x2, y, **kw):
    line(ax, x1, y, x2, y, **kw)

def vline(ax, x, y1, y2, **kw):
    line(ax, x, y1, x, y2, **kw)

def avatar(ax, x, y, r=0.18, color=None, dark=True):
    c = color or PAL["violet"]
    ax.add_patch(plt.Circle((x, y), r, color=c, alpha=0.9))
    ax.add_patch(plt.Circle((x, y), r, edgecolor="white", facecolor="none", linewidth=0.7))

def bar(ax, x, y, w, h, color):
    ax.add_patch(Rectangle((x, y), w, h, facecolor=color, edgecolor="none"))

def sparkline(ax, x, y, w, h, color=None, points=24, seed=1):
    rng = random.Random(seed)
    xs = np.linspace(x, x + w, points)
    base = rng.random() * h * 0.5
    ys = [y + base + rng.random() * h * 0.5 for _ in range(points)]
    # smooth pseudo curve
    for i in range(1, len(ys)):
        ys[i] = (ys[i-1] * 0.6 + ys[i] * 0.4)
    ax.plot(xs, ys, color=color or PAL["aqua"], linewidth=1.6)

def chart_wheel(ax, cx, cy, r, *, dark=True, label_inside=True):
    """Stylised astrology chart wheel (12 houses)."""
    outer = plt.Circle((cx, cy), r, facecolor="none", edgecolor=PAL["gold"], linewidth=1.5)
    inner = plt.Circle((cx, cy), r * 0.62, facecolor="none", edgecolor=PAL["gold"], linewidth=1.0)
    core  = plt.Circle((cx, cy), r * 0.30, facecolor=PAL["gold"], edgecolor="none", alpha=0.18)
    ax.add_patch(outer); ax.add_patch(inner); ax.add_patch(core)
    for i in range(12):
        a = np.deg2rad(i * 30)
        x1, y1 = cx + np.cos(a) * r * 0.30, cy + np.sin(a) * r * 0.30
        x2, y2 = cx + np.cos(a) * r,        cy + np.sin(a) * r
        ax.add_line(Line2D([x1, x2], [y1, y2], color=PAL["gold"], linewidth=0.7, alpha=0.7))
    # planet glyphs (dots) at random offsets
    glyphs = ["☉", "☽", "☿", "♀", "♂", "♃", "♄", "♅", "♆"]
    rng = random.Random(99)
    for g in glyphs:
        a = rng.random() * 2 * np.pi
        rr = r * (0.45 + rng.random() * 0.18)
        gx, gy = cx + np.cos(a) * rr, cy + np.sin(a) * rr
        ax.text(gx, gy, g, fontsize=10, color=PAL["gold"],
                ha="center", va="center", fontweight="bold")
    if label_inside:
        ax.text(cx, cy, "♈", fontsize=15, color=PAL["gold"],
                ha="center", va="center", alpha=0.6)

def phone_frame(ax, x, y, w, h, dark=True):
    """Render a phone outline. Returns inner (x, y, w, h) usable area."""
    surface = PAL["bg_dark"] if dark else PAL["bg_light"]
    panel(ax, x, y, w, h, "#000000", radius=0.45)
    inner_pad = 0.10
    ix, iy, iw, ih = x + inner_pad, y + inner_pad, w - inner_pad * 2, h - inner_pad * 2
    panel(ax, ix, iy, iw, ih, surface, radius=0.30)
    if dark:
        add_starfield(ax, ix, iy, iw, ih, density=0.002, seed=int((x + y) * 13))
    # notch
    panel(ax, x + w / 2 - 0.55, y + h - 0.20, 1.1, 0.18, "#000000", radius=0.06)
    return ix, iy, iw, ih

def web_frame(ax, x, y, w, h, dark=True, title="Astrology App"):
    """Render a browser/window chrome for a web screen. Returns inner area."""
    surface = PAL["bg_dark"] if dark else PAL["bg_light"]
    panel(ax, x, y, w, h, "#0a0716" if dark else "#e7e2f3", radius=0.20)
    pad = 0.12
    ix, iy, iw, ih = x + pad, y + pad, w - pad * 2, h - pad * 2
    panel(ax, ix, iy, iw, ih, surface, radius=0.18)
    # browser bar
    bar_h = 0.35
    panel(ax, ix, iy + ih - bar_h, iw, bar_h, "#170f2c" if dark else "#dcd5ec", radius=0.10)
    for i, c in enumerate(["#ff6b6b", "#fbbf24", "#34d399"]):
        ax.add_patch(plt.Circle((ix + 0.20 + i * 0.20, iy + ih - bar_h / 2), 0.07, color=c))
    label(ax, ix + iw / 2, iy + ih - bar_h / 2, title,
          size=8, color=PAL["muted"], ha="center")
    if dark:
        add_starfield(ax, ix, iy, iw, ih - bar_h, density=0.0014, seed=int((x + y) * 7))
    return ix, iy, iw, ih - bar_h

def caption(ax, x, y, w, h, num, name, persona):
    """Bottom caption box for a screen frame."""
    label(ax, x, y - 0.25, f"{num}. {name}", size=11, weight="bold", dark=False,
          color="#1a1530")
    label(ax, x, y - 0.50, persona, size=8.5, dark=False, color="#5a4d8c", italic=True)

def setup_axes(figsize, xlim, ylim, bg=None):
    fig, ax = plt.subplots(figsize=figsize)
    ax.set_xlim(*xlim); ax.set_ylim(*ylim); ax.axis("off")
    if bg:
        ax.set_facecolor(bg)
        fig.patch.set_facecolor(bg)
    return fig, ax

def title_block(ax, x, y, title, subtitle, color="#1a1530", *, size=20):
    label(ax, x, y, title, size=size, weight="bold", color=color, dark=False)
    label(ax, x, y - 0.40, subtitle, size=11, italic=True, color="#5a4d8c", dark=False)

def legend_block(ax, x, y, dark=False):
    """Component-source legend: shadcn vs reactbits chips."""
    label(ax, x, y, "Component sources:", size=10, weight="bold",
          dark=False, color="#1a1530")
    chip(ax, x, y - 0.30, "shadcn/ui", PAL["violet"], size=8)
    chip(ax, x + 1.4, y - 0.30, "reactbits.dev", PAL["gold"], size=8)
    chip(ax, x + 3.0, y - 0.30, "custom", "#5a4d8c", size=8)
