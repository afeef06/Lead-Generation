'use client'

import { usePathname } from 'next/navigation'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Portal and auth pages get full-width, no-sidebar layout
  const noSidebar = pathname.startsWith('/portal/') || pathname.startsWith('/login') || pathname.startsWith('/auth')
  return (
    <main className={`flex-1 min-h-screen overflow-y-auto bg-[#0A0A0A] ${noSidebar ? '' : 'ml-60'}`}>
      {children}
    </main>
  )
}
