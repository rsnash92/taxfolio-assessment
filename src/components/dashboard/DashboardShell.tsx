'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  ArrowLeftRight,
  FileText,
  Calendar,
  Users,
  CreditCard,
  Settings,
  Menu,
  X,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

import { AiNudgeBanner } from './AiNudgeBanner';
import { MtdQuarterCards } from './MtdQuarterCards';
import { RecentTransactions } from './RecentTransactions';
import { YearToDateSummary } from './YearToDateSummary';
import { AiInsightsPanel } from './AiInsightsPanel';
import { UpcomingDeadlines } from './UpcomingDeadlines';
import { AskButton } from '@/components/ask-taxfolio';

interface DashboardShellProps {
  userName?: string;
  userEmail?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  anchor?: string;
  external?: boolean; // opens in same tab but links to main app
  disabled?: boolean;
}

// Main app base URL — links to app.taxfolio.io in production, same origin in dev
const APP_BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://app.taxfolio.io';

// Match the original taxfolio sidebar nav items — Transactions is the only addition
const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { id: 'personal-tax', label: 'Personal Tax', icon: FileText, href: `${APP_BASE}/personal-tax`, external: true },
  { id: 'mtd', label: 'Making Tax Digital', icon: Calendar, href: `${APP_BASE}/mtd`, external: true },
  {
    id: 'transactions',
    label: 'Transactions',
    icon: ArrowLeftRight,
    anchor: '#transactions',
    // TODO: Future /dashboard/transactions page with full filtering, search, pagination
  },
  { id: 'referrals', label: 'Referrals', icon: Users, href: `${APP_BASE}/referrals`, external: true },
  { id: 'billing', label: 'Billing', icon: CreditCard, href: `${APP_BASE}/settings/billing`, external: true },
  { id: 'settings', label: 'Settings', icon: Settings, href: `${APP_BASE}/settings`, external: true },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(name?: string, email?: string): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) return email[0].toUpperCase();
  return 'U';
}

export function DashboardShell({ userName, userEmail }: DashboardShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');
  const router = useRouter();
  const supabase = createClient();

  const displayName = userName || userEmail?.split('@')[0] || 'there';
  const initials = getInitials(userName, userEmail);

  const handleSignOut = async () => {
    localStorage.removeItem('wizard-data');
    localStorage.removeItem('wizard-step');
    localStorage.removeItem('wizard-business-id');
    localStorage.removeItem('wizard-property-id');
    localStorage.removeItem('taxfolio-chat-messages');

    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleNavClick = (item: NavItem) => {
    if (item.disabled) return;

    if (item.anchor) {
      const el = document.querySelector(item.anchor);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      setActiveNav(item.id);
      setIsMobileMenuOpen(false);
      return;
    }

    if (item.href) {
      setActiveNav(item.id);
      setIsMobileMenuOpen(false);
      // External links go to main app via window.location
      if (item.external) {
        window.location.href = item.href;
      } else {
        router.push(item.href);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-[#0f172a] to-[#1e293b] lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Image src="/taxfolio-light.png" alt="TaxFolio" width={100} height={25} className="h-5 w-auto" />
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Mobile sidebar drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/50 z-50 lg:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-gradient-to-b from-[#0f172a] to-[#1e293b] z-50 shadow-xl lg:hidden"
              >
                <div className="flex items-center justify-between px-6 pt-6 pb-4">
                  <Image src="/taxfolio-light.png" alt="TaxFolio" width={100} height={25} className="h-5 w-auto" />
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <SidebarNav
                  items={NAV_ITEMS}
                  activeNav={activeNav}
                  onNavClick={handleNavClick}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Desktop Sidebar — matches original taxfolio dark gradient */}
        <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:top-0 lg:bottom-0 bg-gradient-to-b from-[#0f172a] to-[#1e293b]">
          {/* Logo */}
          <div className="px-6 pt-8 pb-6">
            <div className="px-5">
              <Image src="/taxfolio-light.png" alt="TaxFolio" width={120} height={28} className="h-7 w-auto" />
            </div>
          </div>

          {/* Nav */}
          <SidebarNav items={NAV_ITEMS} activeNav={activeNav} onNavClick={handleNavClick} />

          {/* User profile at bottom */}
          <div className="mt-auto p-4">
            <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5 transition-colors">
              <div className="w-9 h-9 rounded-full bg-[#00e3ec]/20 flex items-center justify-center text-xs font-semibold text-[#00e3ec]">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {userName || 'User'}
                </p>
                <p className="text-xs text-gray-400 truncate">{userEmail || ''}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:pl-72">
          {/* Desktop header */}
          <div className="hidden lg:block px-8 pt-8 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                  {getGreeting()}, {displayName}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Tax Year 2026/27
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 ml-2 align-middle" />
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-[#00e3ec]/30 text-[#00a8b0] hover:bg-[#00e3ec]/5 hover:text-[#00a8b0]"
                onClick={() => {
                  const askBtn = document.querySelector('[data-slot="ask-taxfolio-trigger"]') as HTMLButtonElement;
                  if (askBtn) askBtn.click();
                }}
              >
                <Sparkles className="h-4 w-4" />
                Ask TaxFolio AI
              </Button>
            </div>
          </div>

          {/* Dashboard content */}
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left column — main content */}
              <div className="flex-1 space-y-6 min-w-0">
                <AiNudgeBanner />
                <MtdQuarterCards />
                <RecentTransactions />
              </div>

              {/* Right column — sidebar cards */}
              <div className="w-full lg:w-80 space-y-6 shrink-0">
                <YearToDateSummary />
                <AiInsightsPanel />
                <UpcomingDeadlines />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Floating AI chat button (reuses existing component) */}
      <AskButton />
    </div>
  );
}

function SidebarNav({
  items,
  activeNav,
  onNavClick,
}: {
  items: NavItem[];
  activeNav: string;
  onNavClick: (item: NavItem) => void;
}) {
  return (
    <nav className="flex-1 space-y-2 px-6">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeNav === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onNavClick(item)}
            disabled={item.disabled}
            title={item.disabled ? 'Coming soon' : undefined}
            className={cn(
              'w-full flex items-center gap-3 rounded-xl px-5 py-3 text-base font-medium transition-colors',
              item.disabled
                ? 'opacity-40 cursor-not-allowed text-gray-500'
                : isActive
                ? 'border-l-2 border-[#00e3ec] bg-white/10 text-white'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="flex-1 text-left">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
