import { NextResponse } from 'next/server'
import { getOrgClient } from '@/lib/supabase/org'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { supabase, org_id, error: authError } = await getOrgClient()
  if (authError) return authError

  const [{ data: transactions }, { data: clients }, { data: projects }] = await Promise.all([
    supabase!.from('transactions').select('*').eq('organization_id', org_id).order('date', { ascending: true }),
    supabase!.from('clients').select('*').eq('organization_id', org_id),
    supabase!.from('projects').select('*').eq('organization_id', org_id),
  ])

  const txns = transactions ?? []
  const cls = clients ?? []
  const projs = projects ?? []

  // Monthly trend — last 7 months
  const monthlyData = Array.from({ length: 7 }, (_, i) => {
    const d = subMonths(new Date(), 6 - i)
    const key = format(d, 'yyyy-MM')
    const label = format(d, 'MMM')
    const monthStart = format(startOfMonth(d), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(d), 'yyyy-MM-dd')

    const monthTxns = txns.filter(t => t.date >= monthStart && t.date <= monthEnd)
    const income = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expenses = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

    return { key, label, income, expenses, profit: income - expenses }
  })

  // Service revenue breakdown
  const serviceMap: Record<string, number> = {}
  cls.forEach(c => {
    const label = {
      brandscaling: 'Brandscaling',
      'ai-freelancing': 'AI Freelancing',
      'ai-consultation': 'AI Consultation',
      'website-dashboard': 'Web / Dashboard',
      other: 'Other',
    }[c.service_type as string] ?? c.service_type
    serviceMap[label] = (serviceMap[label] ?? 0) + Number(c.monthly_value)
  })
  const serviceRevenue = Object.entries(serviceMap).map(([name, value]) => ({ name, value }))

  // Client acquisition sources
  const sourceMap: Record<string, number> = {}
  cls.forEach(c => {
    const src = c.acquisition_source ?? 'other'
    const label = {
      referral: 'Referral',
      'social-media': 'Social Media',
      'cold-outreach': 'Cold Outreach',
      website: 'Website',
      other: 'Other',
    }[src as string] ?? src
    sourceMap[label] = (sourceMap[label] ?? 0) + 1
  })
  const acquisitionSources = Object.entries(sourceMap).map(([name, count]) => ({ name, count }))

  // Client status counts
  const statusMap: Record<string, number> = {}
  cls.forEach(c => { statusMap[c.status] = (statusMap[c.status] ?? 0) + 1 })
  const clientStatus = Object.entries(statusMap).map(([name, value]) => ({
    name: { lead: 'Leads', active: 'Active', completed: 'Completed', churned: 'Churned' }[name] ?? name,
    value,
  }))

  // Project pipeline by status
  const projectStatusMap: Record<string, { count: number; value: number }> = {}
  projs.forEach(p => {
    const s = p.status as string
    if (!projectStatusMap[s]) projectStatusMap[s] = { count: 0, value: 0 }
    projectStatusMap[s].count++
    projectStatusMap[s].value += Number(p.value)
  })
  const projectPipeline = Object.entries(projectStatusMap).map(([status, { count, value }]) => ({
    name: { planning: 'Planning', 'in-progress': 'In Progress', review: 'Review', completed: 'Completed', paused: 'Paused' }[status] ?? status,
    count,
    value,
  }))

  // Top clients by monthly value
  const topClients = [...cls]
    .sort((a, b) => Number(b.monthly_value) - Number(a.monthly_value))
    .slice(0, 5)
    .map(c => ({
      name: c.name,
      value: Number(c.monthly_value),
      service: c.service_type,
    }))

  // Expense category breakdown
  const expenseCatMap: Record<string, number> = {}
  txns.filter(t => t.type === 'expense').forEach(t => {
    expenseCatMap[t.category] = (expenseCatMap[t.category] ?? 0) + Number(t.amount)
  })
  const expensesByCategory = Object.entries(expenseCatMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  return NextResponse.json({
    monthlyData,
    serviceRevenue,
    acquisitionSources,
    clientStatus,
    projectPipeline,
    topClients,
    expensesByCategory,
  })
}
