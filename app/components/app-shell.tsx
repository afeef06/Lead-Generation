'use client'

import { useState } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Sidebar } from './sidebar'
import { ServiceWorkerRegistration } from './service-worker-registration'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname   = usePathname()
  const noSidebar  = pathname.startsWith('/portal/') ||
                     pathname.startsWith('/login') ||
                     pathname.startsWith('/auth')

  return (
    <>
      <ServiceWorkerRegistration />

      {!noSidebar && (
        <>
          {/* Mobile top bar */}
          <header className="md:hidden fixed top-0 inset-x-0 h-14 z-50 bg-sidebar border-b border-sidebar-border flex items-center px-4 gap-3">
            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="p-1.5 -ml-1.5 rounded-lg text-lo hover:text-mid hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="w-6 h-6 rounded-lg overflow-hidden ring-1 ring-white/10 flex-shrink-0">
              <Image src="/rr-logo.png" alt="R&R Collective" width={24} height={24} className="w-full h-full object-cover" />
            </div>
            <span className="text-hi text-sm font-semibold tracking-tight">R&R Collective</span>
          </header>

          {/* Backdrop */}
          {open && (
            <div
              className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
          )}

          <Sidebar isOpen={open} onClose={() => setOpen(false)} />
        </>
      )}

      <main
        className={`min-h-dvh overflow-y-auto bg-background ${
          noSidebar ? '' : 'md:ml-60 pt-14 md:pt-0'
        }`}
      >
        {children}
      </main>
    </>
  )
}
