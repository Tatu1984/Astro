import Link from "next/link";
import { Aurora, StarField } from "@/frontend/components/effects/Aurora";
import { ChartWheel } from "@/frontend/components/astro/ChartWheel";
import { Button } from "@/frontend/components/ui/Button";
import { Card } from "@/frontend/components/ui/Card";
import { Badge } from "@/frontend/components/ui/Badge";
import {
  Sparkles,
  Compass,
  HeartHandshake,
  CalendarClock,
  ScrollText,
  MessageCircle,
  Star,
  Check,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  { icon: Compass,       title: "Birth Chart Wheel",       body: "Interactive, zoomable. Western + Vedic, North/South styles." },
  { icon: CalendarClock, title: "Daily / Weekly / Yearly", body: "Personalised via real-time transits & Vedic dashas." },
  { icon: MessageCircle, title: "AI Chat with your Chart", body: "Ask anything. Grounded in deterministic chart math." },
  { icon: HeartHandshake,title: "Compatibility",           body: "Synastry, Composite, Ashtakoot Milan, Manglik check." },
  { icon: Sparkles,      title: "Muhurta Finder",          body: "Pick the right hour for any plan." },
  { icon: ScrollText,    title: "Long-form Reports",       body: "Career, love, health, education — exportable PDF." },
];

const PLANS = [
  { name: "Free", price: "$0", note: "Forever",   feats: ["1 chart", "Daily horoscope", "Basic AI chat (10/day)"], hi: false },
  { name: "Plus", price: "$6",  note: "/month",   feats: ["5 charts", "All horoscopes", "Unlimited AI chat", "Compatibility"], hi: true  },
  { name: "Pro",  price: "$14", note: "/month",   feats: ["Unlimited charts", "Long-form reports", "Astrologer chat", "Priority"], hi: false },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-[var(--color-border)]">
        <Aurora />
        <StarField />

        {/* nav */}
        <header className="relative z-10 max-w-7xl mx-auto flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--color-brand-gold)]" />
            <span className="font-semibold text-lg tracking-tight">Astro</span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm text-white/75">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#how"      className="hover:text-white">How it works</a>
            <a href="#pricing"  className="hover:text-white">Pricing</a>
            <Link href="/user" className="hover:text-white">User portal</Link>
            <Link href="/astrologer" className="hover:text-white">Astrologer</Link>
            <Link href="/admin" className="hover:text-white">Admin</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/user" className="text-sm text-white/75 hover:text-white">Login</Link>
            <Link href="/user">
              <Button variant="gold" size="sm" pill>Get started</Button>
            </Link>
          </div>
        </header>

        {/* hero content */}
        <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center px-6 pt-12 pb-24">
          <div>
            <Badge tone="gold" className="mb-5">✦ 4.9 from 12,000+ readings</Badge>
            <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              <span className="shiny">Your stars,</span>
              <br />
              <span className="text-white">personally decoded.</span>
            </h1>
            <p className="mt-5 text-lg text-white/70 max-w-md">
              Western + Vedic charts. Daily transits. AI chat with your own birth chart. Free to start.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/user">
                <Button variant="gold" size="lg" pill className="font-semibold">
                  Reveal my chart <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" pill>▶ Watch demo</Button>
            </div>
            <p className="mt-5 text-xs text-white/50 italic">
              Free tier · No card required · iOS · Android · Web
            </p>
          </div>

          <div className="relative h-[420px]">
            <div className="absolute inset-0 grid place-items-center">
              <div className="relative">
                <div className="absolute -inset-10 rounded-full bg-[var(--color-brand-gold)]/15 blur-3xl" />
                <ChartWheel size={360} spinning className="relative z-10" />
              </div>
            </div>
          </div>
        </div>

        {/* trust strip */}
        <div className="relative z-10 border-t border-[var(--color-border)] bg-black/30">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-around gap-x-10 gap-y-3 px-6 py-4 text-xs uppercase tracking-widest text-white/45">
            <span>TechCrunch</span><span>Vogue India</span><span>ProductHunt #1</span>
            <span>AstroForum</span><span>Co-Star alt</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center">
          Everything in one chart-driven app
        </h2>
        <p className="text-center text-white/60 mt-3 max-w-2xl mx-auto">
          From natal chart to dashas, daily horoscope to AI chat — all grounded in real astronomy.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <Card key={title} accent="violet" className="tilt">
              <div className="h-10 w-10 rounded-md bg-[var(--color-brand-gold)]/15 ring-1 ring-[var(--color-brand-gold)]/30 grid place-items-center mb-4">
                <Icon className="h-5 w-5 text-[var(--color-brand-gold)]" />
              </div>
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="text-sm text-white/60 mt-1.5 leading-relaxed">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="max-w-7xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-semibold tracking-tight text-center">
          Three steps to your reading
        </h2>
        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {[
            { n: "01", t: "Sign up",        d: "Email, phone OTP, Google or Apple" },
            { n: "02", t: "Add birth data", d: "Date, time, place — auto geocoded" },
            { n: "03", t: "Reveal",         d: "Chart + AI reading in seconds" },
          ].map((s) => (
            <Card key={s.n} className="flex items-center gap-4">
              <div className="h-12 w-12 shrink-0 rounded-md bg-[var(--color-brand-gold)]/20 ring-1 ring-[var(--color-brand-gold)]/40 grid place-items-center font-bold text-[var(--color-brand-gold)]">
                {s.n}
              </div>
              <div>
                <div className="font-semibold text-white">{s.t}</div>
                <div className="text-sm text-white/60">{s.d}</div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-semibold tracking-tight text-center">Pricing</h2>
        <p className="text-center text-white/60 mt-2">Start free. Upgrade when you're hooked.</p>

        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {PLANS.map((p) => (
            <Card
              key={p.name}
              accent={p.hi ? "gold" : "violet"}
              className={p.hi ? "tilt ring-1 ring-[var(--color-brand-gold)]/40" : "tilt"}
            >
              {p.hi && (
                <Badge tone="gold" className="absolute -top-2 right-5">
                  <Star className="h-3 w-3 fill-current" /> Most popular
                </Badge>
              )}
              <div className="text-sm text-white/60">{p.name}</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-4xl font-semibold text-[var(--color-brand-violet)]">{p.price}</span>
                <span className="text-sm text-white/50">{p.note}</span>
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                {p.feats.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-white/75">
                    <Check className="h-4 w-4 text-[var(--color-brand-aqua)]" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/user" className="block mt-6">
                <Button variant={p.hi ? "primary" : "outline"} className="w-full">Choose</Button>
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[var(--color-border)] bg-black/30">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--color-brand-gold)]" />
            <span className="text-sm text-white/70">© 2026 Astro · Privacy · Terms</span>
          </div>
          <div className="flex gap-5 text-sm text-white/55">
            <a href="#">Twitter</a><a href="#">Instagram</a><a href="#">Discord</a>
            <a href="#">App Store</a><a href="#">Play Store</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
