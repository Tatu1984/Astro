import { Sidebar, type NavItem } from "@/frontend/components/portal/Sidebar";
import {
  LayoutDashboard, ListOrdered, Headphones, Users,
  FileText, DollarSign, Calendar, Star, User,
} from "lucide-react";

const NAV: NavItem[] = [
  { href: "/astrologer",            label: "Dashboard",    icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/astrologer/queue",      label: "Queue",        icon: <ListOrdered className="h-4 w-4" /> },
  { href: "/astrologer/session",    label: "Live Session", icon: <Headphones className="h-4 w-4" /> },
  { href: "/astrologer/clients",    label: "Clients",      icon: <Users className="h-4 w-4" /> },
  { href: "/astrologer/templates",  label: "Templates",    icon: <FileText className="h-4 w-4" /> },
  { href: "/astrologer/earnings",   label: "Earnings",     icon: <DollarSign className="h-4 w-4" /> },
  { href: "/astrologer/schedule",   label: "Schedule",     icon: <Calendar className="h-4 w-4" /> },
  { href: "/astrologer/reviews",    label: "Reviews",      icon: <Star className="h-4 w-4" /> },
  { href: "/astrologer/profile",    label: "Profile",      icon: <User className="h-4 w-4" /> },
];

export default function AstrologerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-[var(--color-bg)] text-[var(--color-ink)]">
      <Sidebar brand="Astro" badge="PRO" items={NAV} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
