import { Sidebar, type NavItem } from "@/frontend/components/portal/Sidebar";
import {
  Sun, CircleDot, TrendingUp, MessageCircle, Heart,
  Calendar, ScrollText, Users, User, CreditCard,
} from "lucide-react";

const NAV: NavItem[] = [
  { href: "/user",                label: "Today",        icon: <Sun className="h-4 w-4" /> },
  { href: "/user/chart",          label: "Chart",        icon: <CircleDot className="h-4 w-4" /> },
  { href: "/user/predictions",    label: "Predictions",  icon: <TrendingUp className="h-4 w-4" /> },
  { href: "/user/chat",           label: "AI Chat",      icon: <MessageCircle className="h-4 w-4" /> },
  { href: "/user/compatibility",  label: "Compatibility",icon: <Heart className="h-4 w-4" /> },
  { href: "/user/calendar",       label: "Calendar",     icon: <Calendar className="h-4 w-4" /> },
  { href: "/user/reports",        label: "Reports",      icon: <ScrollText className="h-4 w-4" /> },
  { href: "/user/community",      label: "Community",    icon: <Users className="h-4 w-4" /> },
  { href: "/user/profile",        label: "Profile",      icon: <User className="h-4 w-4" /> },
  { href: "/user/billing",        label: "Billing",      icon: <CreditCard className="h-4 w-4" /> },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-[var(--color-bg)] text-[var(--color-ink)]">
      <Sidebar brand="Astro" items={NAV} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
