"""Generate software architecture diagram for Astrology App SoW."""
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

fig, ax = plt.subplots(figsize=(20, 13))
ax.set_xlim(0, 20)
ax.set_ylim(0, 13)
ax.axis('off')

PALETTE = {
    "client":   "#1f3a93",
    "edge":     "#2c3e50",
    "frontend": "#27ae60",
    "api":      "#e67e22",
    "service":  "#c0392b",
    "ai":       "#8e44ad",
    "data":     "#16a085",
    "infra":    "#7f8c8d",
}

def box(x, y, w, h, label, color, fontsize=10, weight="bold", text_color="white"):
    patch = FancyBboxPatch((x, y), w, h,
                           boxstyle="round,pad=0.04,rounding_size=0.18",
                           linewidth=1.5,
                           edgecolor="black",
                           facecolor=color)
    ax.add_patch(patch)
    ax.text(x + w/2, y + h/2, label,
            ha="center", va="center",
            fontsize=fontsize, fontweight=weight, color=text_color, wrap=True)

def section(x, y, w, h, label, color):
    patch = FancyBboxPatch((x, y), w, h,
                           boxstyle="round,pad=0.06,rounding_size=0.20",
                           linewidth=1.2, linestyle="--",
                           edgecolor=color, facecolor="white", alpha=0.35)
    ax.add_patch(patch)
    ax.text(x + 0.18, y + h - 0.32, label,
            ha="left", va="top",
            fontsize=11, fontweight="bold", color=color)

def arrow(x1, y1, x2, y2, color="#34495e", style="-|>", lw=1.6, label=None):
    a = FancyArrowPatch((x1, y1), (x2, y2),
                        arrowstyle=style, color=color,
                        mutation_scale=14, linewidth=lw)
    ax.add_patch(a)
    if label:
        ax.text((x1+x2)/2, (y1+y2)/2 + 0.12, label,
                ha="center", va="bottom", fontsize=8.5,
                color=color, fontstyle="italic")

# Title
ax.text(10, 12.55, "Astrology App — Software Architecture",
        ha="center", fontsize=20, fontweight="bold", color="#2c3e50")
ax.text(10, 12.18, "Next.js 16 (Web + API) · React Native (Mobile) · Modular Astrology + AI Backend",
        ha="center", fontsize=11.5, color="#555", fontstyle="italic")

# === Layer 1: Clients ===
section(0.3, 10.2, 19.4, 1.55, "1. Client Layer", PALETTE["client"])
box(0.8,  10.55, 4.2, 0.95, "Next.js 16 Web\n(React 19, App Router, RSC, PWA)", PALETTE["client"], 9.5)
box(5.4,  10.55, 4.2, 0.95, "React Native Mobile\n(iOS / Android, Expo)",        PALETTE["client"], 9.5)
box(10.0, 10.55, 4.2, 0.95, "Wearables\n(Apple Watch / Wear OS Widgets)",        PALETTE["client"], 9.5)
box(14.6, 10.55, 4.8, 0.95, "Push & Web Sockets\n(FCM / APNs / WS Notifications)", PALETTE["client"], 9.5)

# === Layer 2: Edge / CDN / Auth ===
section(0.3, 8.55, 19.4, 1.4, "2. Edge / Gateway Layer", PALETTE["edge"])
box(0.8,  8.85, 4.2, 0.85, "Vercel Edge / CDN\nTLS, Caching, Rate Limit", PALETTE["edge"], 9.5)
box(5.4,  8.85, 4.2, 0.85, "Auth Gateway\nNextAuth + JWT + OAuth",        PALETTE["edge"], 9.5)
box(10.0, 8.85, 4.2, 0.85, "API Gateway\n/api/* Route Handlers",          PALETTE["edge"], 9.5)
box(14.6, 8.85, 4.8, 0.85, "WAF / Bot Protection\nCloudflare + Captcha",   PALETTE["edge"], 9.5)

# === Layer 3: Frontend & Mobile shared logic ===
section(0.3, 6.85, 9.4, 1.55, "3. Presentation Logic", PALETTE["frontend"])
box(0.8, 7.20, 4.0, 0.95, "Web UI Modules\nCharts · Reports · Feed",         PALETTE["frontend"], 9.5)
box(5.0, 7.20, 4.4, 0.95, "Mobile UI Modules\nDaily · Compatibility · Chat", PALETTE["frontend"], 9.5)

# === Layer 3b: API / Backend ===
section(9.9, 6.85, 9.8, 1.55, "4. Backend (Next.js Route Handlers + Services)", PALETTE["api"])
box(10.2, 7.20, 3.0, 0.95, "Auth Service",           PALETTE["api"], 9.5)
box(13.4, 7.20, 3.0, 0.95, "User / Profile Service", PALETTE["api"], 9.5)
box(16.6, 7.20, 3.0, 0.95, "Notification Service",   PALETTE["api"], 9.5)

# === Layer 4: Domain Services ===
section(0.3, 5.10, 19.4, 1.55, "5. Astrology Domain Services", PALETTE["service"])
box(0.8,  5.45, 3.5, 0.95, "Chart Engine\nWestern + Vedic + Divisional", PALETTE["service"], 9)
box(4.5,  5.45, 3.5, 0.95, "Predictions Engine\nDashas · Transits · Returns", PALETTE["service"], 9)
box(8.2,  5.45, 3.5, 0.95, "Compatibility Engine\nSynastry · Ashtakoot · Composite", PALETTE["service"], 9)
box(11.9, 5.45, 3.5, 0.95, "Muhurta / Calendar\nElectional · Hora · Panchang", PALETTE["service"], 9)
box(15.6, 5.45, 3.8, 0.95, "Reports Generator\nLong-form · PDF · Branded", PALETTE["service"], 9)

# === Layer 5: AI Layer ===
section(0.3, 3.40, 11.5, 1.55, "6. AI / LLM Orchestration", PALETTE["ai"])
box(0.8, 3.75, 3.4, 0.95, "Prompt Builder\nChart-JSON → Prompt", PALETTE["ai"], 9)
box(4.4, 3.75, 3.4, 0.95, "LLM Router\nGemini / Groq / Claude", PALETTE["ai"], 9)
box(8.0, 3.75, 3.6, 0.95, "Vector Store\npgvector for RAG / glossary", PALETTE["ai"], 9)

# === Layer 5b: Astrology Compute (Python micro) ===
section(11.9, 3.40, 7.8, 1.55, "7. Astrology Compute Microservice", PALETTE["service"])
box(12.2, 3.75, 3.4, 0.95, "Python FastAPI\nKerykeion · Flatlib", PALETTE["service"], 9)
box(15.8, 3.75, 3.7, 0.95, "Swiss Ephemeris\nJyotisha · pyswisseph", PALETTE["service"], 9)

# === Layer 6: Data ===
section(0.3, 1.65, 19.4, 1.55, "8. Data Layer", PALETTE["data"])
box(0.8,  2.00, 3.4, 0.95, "PostgreSQL\n(NeonDB · Prisma 7)",  PALETTE["data"], 9)
box(4.4,  2.00, 3.4, 0.95, "Redis\nQueue · Cache · Rate Limit", PALETTE["data"], 9)
box(8.0,  2.00, 3.4, 0.95, "S3 / R2\nCharts · PDFs · Media",   PALETTE["data"], 9)
box(11.6, 2.00, 3.4, 0.95, "pgvector\nEmbeddings · RAG",        PALETTE["data"], 9)
box(15.2, 2.00, 4.2, 0.95, "Analytics Warehouse\nBigQuery / Clickhouse", PALETTE["data"], 9)

# === Layer 7: Infra / Ops ===
section(0.3, 0.10, 19.4, 1.30, "9. Observability & DevOps", PALETTE["infra"])
box(0.8,  0.35, 3.4, 0.85, "GitHub Actions CI/CD",   PALETTE["infra"], 9)
box(4.4,  0.35, 3.4, 0.85, "Sentry · Error Tracking", PALETTE["infra"], 9)
box(8.0,  0.35, 3.4, 0.85, "OpenTelemetry · Logs",    PALETTE["infra"], 9)
box(11.6, 0.35, 3.4, 0.85, "PostHog · Product Analytics", PALETTE["infra"], 9)
box(15.2, 0.35, 4.2, 0.85, "Stripe / RevenueCat (Billing)", PALETTE["infra"], 9)

# Connecting arrows (vertical layer flow)
for x in (3.0, 7.5, 12.0, 16.5):
    arrow(x, 10.55, x, 9.78, PALETTE["edge"])
    arrow(x, 8.85, x, 8.45, PALETTE["api"])
    arrow(x, 6.85, x, 6.45, PALETTE["service"])
    arrow(x, 5.10, x, 4.78, PALETTE["ai"])
    arrow(x, 3.40, x, 3.05, PALETTE["data"])

# Cross-link: domain services -> Python microservice
arrow(8.2, 5.45, 14.0, 4.72, "#8e44ad", lw=1.4, label="ephemeris call")
# Cross-link: AI router -> vector store
arrow(7.8, 4.25, 8.0, 4.25, PALETTE["ai"])
# Cross-link: services -> data
arrow(2.5, 5.45, 2.5, 2.95, "#16a085", lw=1.0)

plt.tight_layout()
out = "/Users/sudipto/Desktop/projects/astro/docs/sow/diagrams/software_architecture.jpg"
plt.savefig(out, dpi=160, format="jpg", bbox_inches="tight", facecolor="white")
print("WROTE", out)
