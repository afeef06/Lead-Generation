'use client'

import type React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, DollarSign, Briefcase,
  Bot, BarChart3, FileText, CheckSquare,
  Settings, GitBranch, LogOut, Target, Users2, MessageSquare, BookOpen,
  Search,
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { useRole } from '@/lib/hooks/use-role'

const LEAD_INTEL_PATHS = ['/discover', '/my-leads', '/find', '/pipeline', '/outreach', '/conversion', '/costs']

type NavItem = { href: string; label: string; icon: React.ElementType; ownerOnly: boolean; activePaths?: string[] }
type NavGroup = { label: string; items: NavItem[] }

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, ownerOnly: false },
      { href: '/analytics', label: 'Analytics', icon: BarChart3,       ownerOnly: true  },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/discover', label: 'Lead Intelligence', icon: Search, ownerOnly: false, activePaths: LEAD_INTEL_PATHS },
    ],
  },
  {
    label: 'Business',
    items: [
      { href: '/clients',  label: 'Clients',   icon: Users,     ownerOnly: false },
      { href: '/leads',    label: 'CRM Leads', icon: Target,    ownerOnly: false },
      { href: '/team',     label: 'Team',      icon: Users2,    ownerOnly: true  },
      { href: '/playbook', label: 'Playbook',  icon: BookOpen,  ownerOnly: false },
      { href: '/pipeline', label: 'Pipeline',  icon: GitBranch, ownerOnly: false },
      { href: '/projects', label: 'Projects',  icon: Briefcase, ownerOnly: false },
      { href: '/invoices', label: 'Invoices',  icon: FileText,  ownerOnly: true  },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/finance', label: 'Finance', icon: DollarSign,  ownerOnly: true  },
      { href: '/tasks',   label: 'Tasks',   icon: CheckSquare, ownerOnly: false },
    ],
  },
  {
    label: 'AI System',
    items: [
      { href: '/agent',    label: 'AI Agent', icon: Bot,           ownerOnly: false },
      { href: '/messages', label: 'Messages', icon: MessageSquare, ownerOnly: false },
      { href: '/settings', label: 'Settings', icon: Settings,      ownerOnly: true  },
    ],
  },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const role     = useRole()
  const isOwner  = role === 'owner'

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder_key'
  )

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className={`fixed left-0 top-0 h-full w-60 bg-sidebar border-r border-sidebar-border flex flex-col z-50 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>

      {/* Logo */}
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-inset ring-white/10 shadow-[0_0_16px_-4px_var(--accent-glow)]">
            <Image src="/rr-logo.png" alt="R&R Collective" width={32} height={32} className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-hi text-[13px] font-semibold tracking-tight leading-none">R&R Collective</p>
            <p className="text-lo text-[9px] tracking-[0.18em] uppercase mt-1">Business Hub</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
        {navGroups.map(({ label, items }) => {
          const visible = items.filter(i => isOwner || !i.ownerOnly)
          if (visible.length === 0) return null
          return (
          <div key={label}>
            <p className="text-lo text-[9px] font-semibold uppercase tracking-[0.22em] px-3 mb-2">{label}</p>
            <div className="space-y-0.5">
              {visible.map(({ href, label: itemLabel, icon: Icon, activePaths }) => {
                const active = activePaths
                  ? activePaths.some((p: string) => pathname === p)
                  : pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={`relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 group cursor-pointer ${
                      active
                        ? 'bg-white/[0.06] text-hi ring-1 ring-inset ring-white/[0.06]'
                        : 'text-lo hover:text-mid hover:bg-white/[0.04]'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-signal rounded-r-full" />
                    )}
                    <Icon className={`h-3.5 w-3.5 flex-shrink-0 transition-colors ${
                      active ? 'text-signal' : 'text-lo group-hover:text-mid'
                    }`} />
                    <span>{itemLabel}</span>
                  </Link>
                )
              })}
            </div>
          </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border space-y-2">
        {/* System status */}
        <div className="flex items-center gap-2.5 px-3">
          <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-up opacity-50" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-up" />
          </span>
          <p className="text-lo text-[10px] tracking-wide">AI System Online</p>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-lo hover:text-mid hover:bg-white/[0.04] transition-all duration-150 group cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5 flex-shrink-0 text-lo group-hover:text-mid transition-colors" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
