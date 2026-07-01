'use client'

import { useEffect, useState } from 'react'

type Role = 'owner' | 'employee' | null

export function useRole(): Role {
  const [role, setRole] = useState<Role>(null)
  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(d => setRole(d.role ?? 'employee'))
      .catch(() => setRole('employee'))
  }, [])
  return role
}
