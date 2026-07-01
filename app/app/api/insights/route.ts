import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getOrgClient } from '@/lib/supabase/org'
import { format, subMonths } from 'date-fns'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET() {
  try {
    const { supabase, org_id, error: authError } = await getOrgClient()
    if (authError) return authError

    const thisMonth = format(new Date(), 'yyyy-MM')
    const lastMonth = format(subMonths(new Date(), 1), 'yyyy-MM')

    const [{ data: transactions }, { data: clients }, { data: projects }] = await Promise.all([
      supabase!.from('transactions').select('*').eq('organization_id', org_id).gte('date', format(subMonths(new Date(), 2), 'yyyy-MM-dd')),
      supabase!.from('clients').select('*').eq('organization_id', org_id),
      supabase!.from('projects').select('*').eq('organization_id', org_id),
    ])

    const txns = transactions ?? []
    const cls = clients ?? []
    const projs = projects ?? []

    const thisMonthIncome = txns.filter(t => t.type === 'income' && t.date?.startsWith(thisMonth)).reduce((s, t) => s + Number(t.amount), 0)
    const lastMonthIncome = txns.filter(t => t.type === 'income' && t.date?.startsWith(lastMonth)).reduce((s, t) => s + Number(t.amount), 0)
    const thisMonthExpenses = txns.filter(t => t.type === 'expense' && t.date?.startsWith(thisMonth)).reduce((s, t) => s + Number(t.amount), 0)
    const activeClients = cls.filter(c => c.status === 'active').length
    const leadClients = cls.filter(c => c.status === 'lead').length
    const activeProjects = projs.filter(p => p.status === 'in-progress').length

    const businessContext = `
Business snapshot for ${format(new Date(), 'MMMM yyyy')}:
- This month income: $${thisMonthIncome.toLocaleString()}
- Last month income: $${lastMonthIncome.toLocaleString()}
- This month expenses: $${thisMonthExpenses.toLocaleString()}
- Net profit this month: $${(thisMonthIncome - thisMonthExpenses).toLocaleString()}
- Active clients: ${activeClients}
- Open leads: ${leadClients}
- Active projects: ${activeProjects}
- Total clients: ${cls.length}
`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: 'You are a sharp business analyst for a multi-service AI agency. Give 3 brief, specific, actionable insights based on the metrics. Each insight is 1-2 sentences max. No fluff. Format as 3 numbered points.',
      messages: [{ role: 'user', content: businessContext }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ insights: text, generatedAt: new Date().toISOString() })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
