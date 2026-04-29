import { Sidebar, type NavItem } from "@/frontend/components/portal/Sidebar";
import {
  Activity, Users, Stars, Shield, CreditCard, Cpu,
  Flag, Beaker, ScrollText, Settings, Calendar, Wallet, IdCard,
} from "lucide-react";

const NAV: NavItem[] = [
  { href: "/admin",                label: "Overview",      icon: <Activity className="h-4 w-4" /> },
  { href: "/admin/users",          label: "Users",         icon: <Users className="h-4 w-4" /> },
  { href: "/admin/astrologers",    label: "Astrologers",   icon: <Stars className="h-4 w-4" /> },
  { href: "/admin/kyc",            label: "KYC inbox",     icon: <IdCard className="h-4 w-4" /> },
  { href: "/admin/bookings",       label: "Bookings",      icon: <Calendar className="h-4 w-4" /> },
  { href: "/admin/payouts",        label: "Payouts",       icon: <Wallet className="h-4 w-4" /> },
  { href: "/admin/moderation",     label: "Moderation",    icon: <Shield className="h-4 w-4" /> },
  { href: "/admin/subscriptions",  label: "Subscriptions", icon: <CreditCard className="h-4 w-4" /> },
  { href: "/admin/llm",            label: "LLM Cost",      icon: <Cpu className="h-4 w-4" /> },
  { href: "/admin/flags",          label: "Feature Flags", icon: <Flag className="h-4 w-4" /> },
  { href: "/admin/experiments",    label: "A/B Tests",     icon: <Beaker className="h-4 w-4" /> },
  { href: "/admin/audit",          label: "Audit Log",     icon: <ScrollText className="h-4 w-4" /> },
  { href: "/admin/settings",       label: "Settings",      icon: <Settings className="h-4 w-4" /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="skin-light flex min-h-dvh bg-[var(--color-bg-light)] text-[var(--color-ink-light)]">
      <Sidebar brand="Astro · Admin" items={NAV} light />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
