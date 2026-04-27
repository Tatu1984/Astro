"""Generate data-flow diagram for Astrology App SoW."""
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

fig, ax = plt.subplots(figsize=(20, 13))
ax.set_xlim(0, 20)
ax.set_ylim(0, 13)
ax.axis("off")

C = {
    "user":    "#1f3a93",
    "client":  "#2980b9",
    "edge":    "#34495e",
    "api":     "#e67e22",
    "compute": "#c0392b",
    "ai":      "#8e44ad",
    "store":   "#16a085",
    "ext":     "#7f8c8d",
    "out":     "#27ae60",
}

def box(x, y, w, h, label, color, fontsize=9.5):
    p = FancyBboxPatch((x, y), w, h,
                       boxstyle="round,pad=0.04,rounding_size=0.18",
                       linewidth=1.3, edgecolor="black", facecolor=color)
    ax.add_patch(p)
    ax.text(x + w/2, y + h/2, label,
            ha="center", va="center",
            fontsize=fontsize, fontweight="bold", color="white")

def arrow(x1, y1, x2, y2, label=None, color="#2c3e50", style="-|>", lw=1.6, label_offset=(0, 0.16)):
    a = FancyArrowPatch((x1, y1), (x2, y2),
                        arrowstyle=style, color=color,
                        mutation_scale=14, linewidth=lw,
                        connectionstyle="arc3,rad=0")
    ax.add_patch(a)
    if label:
        mx, my = (x1+x2)/2 + label_offset[0], (y1+y2)/2 + label_offset[1]
        ax.text(mx, my, label, ha="center", va="bottom",
                fontsize=8.2, color=color, fontstyle="italic",
                bbox=dict(facecolor="white", edgecolor="none", pad=1.2, alpha=0.9))

# Title
ax.text(10, 12.55, "Astrology App — Data Flow Diagram",
        ha="center", fontsize=20, fontweight="bold", color="#2c3e50")
ax.text(10, 12.18, "Birth-data capture → Chart compute → AI interpretation → Personalised insights",
        ha="center", fontsize=11.5, color="#555", fontstyle="italic")

# Row 1: Actors / Inputs
box(0.5,  10.6, 3.4, 0.9, "User\n(Web / Mobile)", C["user"])
box(4.4,  10.6, 3.4, 0.9, "Birth Data Form\n(date, time, place)", C["client"])
box(8.3,  10.6, 3.4, 0.9, "Geocoding API\n(lat/long, timezone)", C["ext"])
box(12.2, 10.6, 3.4, 0.9, "Push / FCM\n(transit alerts)", C["ext"])
box(16.1, 10.6, 3.4, 0.9, "Payments\n(Stripe / RevenueCat)", C["ext"])

# Row 2: Edge / API gateway
box(0.5,  9.0, 3.4, 0.9, "Auth Layer\n(JWT / OAuth)", C["edge"])
box(4.4,  9.0, 3.4, 0.9, "Validation\n(Zod Schema)", C["edge"])
box(8.3,  9.0, 3.4, 0.9, "Rate Limit\n(Redis)", C["edge"])
box(12.2, 9.0, 3.4, 0.9, "API Gateway\n/api/* handlers", C["edge"])
box(16.1, 9.0, 3.4, 0.9, "Audit Log\n(Postgres)", C["edge"])

# Row 3: Domain services
box(0.5,  7.4, 4.0, 1.0, "Profile Service\nstore charts, prefs", C["api"])
box(5.0,  7.4, 4.6, 1.0, "Chart Service\nKerykeion + Swiss Ephemeris", C["compute"])
box(10.1, 7.4, 4.6, 1.0, "Predictions Service\nDashas · Transits · Returns", C["compute"])
box(15.2, 7.4, 4.3, 1.0, "Compatibility Service\nSynastry / Ashtakoot", C["compute"])

# Row 4: AI orchestration
box(0.5,  5.7, 4.0, 1.0, "Prompt Builder\nChart JSON → Prompt", C["ai"])
box(5.0,  5.7, 4.6, 1.0, "LLM Router\nGemini · Groq · Claude", C["ai"])
box(10.1, 5.7, 4.6, 1.0, "RAG Retriever\npgvector glossary + tradition", C["ai"])
box(15.2, 5.7, 4.3, 1.0, "Safety / Disclaimers\nguardrails + filters", C["ai"])

# Row 5: Data stores
box(0.5,  4.0, 4.0, 1.0, "PostgreSQL (NeonDB)\nusers, charts, reports", C["store"])
box(5.0,  4.0, 4.6, 1.0, "Redis\ncache · queue · throttle", C["store"])
box(10.1, 4.0, 4.6, 1.0, "S3 / R2\nPDFs · chart images", C["store"])
box(15.2, 4.0, 4.3, 1.0, "pgvector\nembeddings · RAG corpus", C["store"])

# Row 6: Outputs
box(0.5,  2.3, 4.0, 1.0, "Personalised Reading\n(natal, daily, yearly)", C["out"])
box(5.0,  2.3, 4.6, 1.0, "Compatibility Score\n+ relationship report", C["out"])
box(10.1, 2.3, 4.6, 1.0, "Forecast Timeline\n(transits + dashas)", C["out"])
box(15.2, 2.3, 4.3, 1.0, "Shareable Cards\n+ PDF Report", C["out"])

# Row 7: Delivery channels
box(0.5,  0.6, 4.0, 1.0, "In-App UI\nWeb + RN", C["client"])
box(5.0,  0.6, 4.6, 1.0, "Push Notifications\nFCM / APNs", C["client"])
box(10.1, 0.6, 4.6, 1.0, "Email Digest\nWeekly horoscope", C["client"])
box(15.2, 0.6, 4.3, 1.0, "Social Share\nIG / WA / X", C["client"])

# Vertical flow arrows (input -> edge -> services -> AI -> stores -> outputs -> channels)
flow_xs = [2.2, 6.7, 12.4, 17.3]
ys_pairs = [
    (10.6, 9.9),  # input -> edge
    (9.0,  8.4),  # edge -> services
    (7.4,  6.7),  # services -> AI
    (5.7,  5.0),  # AI -> stores
    (4.0,  3.3),  # stores -> outputs
    (2.3,  1.6),  # outputs -> channels
]
labels = [
    "1. signup / submit chart",
    "2. validated request",
    "3. compute chart",
    "4. enrich with AI",
    "5. persist + retrieve",
    "6. deliver insight",
]
for idx, (yt, yb) in enumerate(ys_pairs):
    for xi, x in enumerate(flow_xs):
        lab = labels[idx] if xi == 0 else None
        arrow(x, yt, x, yb, label=lab, color=C["edge"])

# Cross flows
arrow(7.8, 11.05, 6.1, 9.95, color=C["ext"], label="reverse geocode")
arrow(13.9, 11.05, 13.9, 9.95, color=C["ext"], label="device token")
arrow(17.8, 11.05, 17.8, 9.95, color=C["ext"], label="webhook")
arrow(7.3, 7.9, 7.3, 6.7, color=C["ai"], label="chart JSON → AI")
arrow(12.4, 7.9, 12.4, 6.7, color=C["ai"], label="dashas → AI")
arrow(7.3, 5.2, 7.3, 5.0, color=C["store"])
arrow(12.4, 5.2, 12.4, 5.0, color=C["store"])

plt.tight_layout()
out = "/Users/sudipto/Desktop/projects/astro/docs/sow/diagrams/data_flow_diagram.jpg"
plt.savefig(out, dpi=160, format="jpg", bbox_inches="tight", facecolor="white")
print("WROTE", out)
