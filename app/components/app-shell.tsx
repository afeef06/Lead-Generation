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
          <header className="md:hidden fixed top-0 inset-x-0 h-14 z-50 bg-[#080808] border-b border-[#1A1A1A] flex items-center px-4 gap-3">
            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="p-1.5 -ml-1.5 rounded-lg text-lo hover:text-mid hover:bg-[#141414] transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Image src="/rr-logo.png" alt="R&R Collective" width={24} height={24} className="rounded-lg" />
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
        className={`min-h-dvh overflow-y-auto bg-[#0A0A0A] ${
          noSidebar ? '' : 'md:ml-60 pt-14 md:pt-0'
        }`}
      >
        {children}
      </main>
    </>
  )
}
