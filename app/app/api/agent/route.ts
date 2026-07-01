import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getOrgClient } from '@/lib/supabase/org'
import type { SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function buildSystemPrompt(supabase: SupabaseClient, org_id: string): Promise<string> {
  // Fetch live business data to give the agent real context
  const [clientsRes, transRes, projectsRes, invoicesRes, leadsRes, employeesRes] = await Promise.all([
    supabase.from('clients').select('name, service_type, status, monthly_value, email').eq('organization_id', org_id).order('created_at', { ascending: false }).limit(30),
    supabase.from('transactions').select('type, amount, category, description, date').eq('organization_id', org_id).order('date', { ascending: false }).limit(30),
    supabase.from('projects').select('name, status, value, service_type, client_id').eq('organization_id', org_id).limit(20),
    supabase.from('invoices').select('invoice_number, amount, status, client_name, due_date').eq('organization_id', org_id).limit(20),
    supabase.from('crm_leads').select('company_name, contact_person, outreach_status, lead_temperature, employee_name, follow_up_date, deal_status, contract_value, close_probability, next_action, is_signed').eq('organization_id', org_id).order('created_at', { ascending: false }).limit(50),
    supabase.from('employees').select('name, role, commission_rate, active').eq('organization_id', org_id).eq('active', true),
  ])

  const clients      = clientsRes.data     ?? []
  const transactions = transRes.data       ?? []
  const projects     = projectsRes.data    ?? []
  const invoices     = invoicesRes.data    ?? []
  const leads        = leadsRes.data       ?? []
  const employees    = employeesRes.data   ?? []

  const activeClients  = clients.filter(c => c.status === 'active')
  const leadClients    = clients.filter(c => c.status === 'lead')
  const mrr            = activeClients.reduce((s, c) => s + Number(c.monthly_value), 0)
  const totalRevenue   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpenses  = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const unpaidInvoices = invoices.filter(i => ['sent', 'overdue'].includes(i.status))
  const overdueTotal   = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.amount), 0)

  // CRM stats
  const today          = new Date().toISOString().split('T')[0]
  const hotLeads       = leads.filter(l => l.lead_temperature === 'hot')
  const signedLeads    = leads.filter(l => l.is_signed)
  const pipelineValue  = leads.filter(l => !l.is_signed).reduce((s, l) => s + Number(l.contract_value ?? 0), 0)
  const closedRevenue  = signedLeads.reduce((s, l) => s + Number(l.contract_value ?? 0), 0)
  const overdueFollowUps = leads.filter(l =>
    l.follow_up_date && l.follow_up_date < today &&
    !['closed_won', 'closed_lost'].includes(l.deal_status ?? '')
  )
  const highPriorityLeads = leads.filter(l =>
    (l.lead_temperature === 'hot' || Number(l.close_probability) >= 70) && !l.is_signed
  )

  return `You are an expert AI business assistant for an AI automation agency called "R&R Collective". You have real-time access to the owner's business data and help them run their agency more efficiently.

═══════════════════════════════════════
LIVE BUSINESS SNAPSHOT
═══════════════════════════════════════
Monthly Recurring Revenue (MRR):  $${mrr.toLocaleString()}
Total Revenue (all-time):         $${totalRevenue.toLocaleString()}
Total Expenses (all-time):        $${totalExpenses.toLocaleString()}
Net Profit:                       $${(totalRevenue - totalExpenses).toLocaleString()}
Active Clients:                   ${activeClients.length}
Leads in Pipeline:                ${leadClients.length}
Active Projects:                  ${projects.filter(p => p.status === 'in-progress').length}
Overdue Invoices:                 $${overdueTotal.toLocaleString()} outstanding

═══════════════════════════════════════
CRM / LEAD PIPELINE
═══════════════════════════════════════
Total Tracked Leads:  ${leads.length}
Hot Leads:            ${hotLeads.length}
High-Priority Leads:  ${highPriorityLeads.length} (hot or 70%+ close probability)
Pipeline Value:       $${pipelineValue.toLocaleString()} (unsigned leads)
Closed Revenue (CRM): $${closedRevenue.toLocaleString()}
Signed Clients:       ${signedLeads.length}
Overdue Follow-ups:   ${overdueFollowUps.length}

HIGH-PRIORITY LEADS (follow up immediately):
${highPriorityLeads.slice(0, 8).map(l =>
  `• ${l.company_name} | ${l.contact_person ?? 'No contact'} | ${l.outreach_status} | ${l.lead_temperature?.toUpperCase()} | ${l.close_probability ?? 0}% close | Assigned: ${l.employee_name ?? 'Unassigned'}${l.next_action ? ` | Next: ${l.next_action}` : ''}`
).join('\n') || 'None yet'}

OVERDUE FOLLOW-UPS (action required today):
${overdueFollowUps.slice(0, 5).map(l =>
  `• ${l.company_name} | Due: ${l.follow_up_date} | ${l.outreach_status} | Assigned: ${l.employee_name ?? 'Unassigned'}${l.next_action ? ` | Next: ${l.next_action}` : ''}`
).join('\n') || 'None overdue'}

ALL ACTIVE LEADS (most recent):
${leads.filter(l => !['closed_won', 'closed_lost'].includes(l.deal_status ?? '')).slice(0, 15).map(l =>
  `• ${l.company_name} | ${l.outreach_status} | ${l.lead_temperature ?? 'unknown'} | $${Number(l.contract_value ?? 0).toLocaleString()} | ${l.close_probability ?? 0}% | ${l.employee_name ?? 'Unassigned'}`
).join('\n') || 'No active leads'}

═══════════════════════════════════════
TEAM (${employees.length} active members)
═══════════════════════════════════════
${employees.map(e =>
  `• ${e.name} | ${e.role} | ${e.commission_rate ?? 0}% commission`
).join('\n') || 'No team members yet'}

═══════════════════════════════════════
CLIENT ROSTER
═══════════════════════════════════════
${clients.slice(0, 15).map(c =>
  `• ${c.name} | ${c.service_type} | ${c.status} | $${Number(c.monthly_value).toLocaleString()}/mo${c.email ? ` | ${c.email}` : ''}`
).join('\n') || 'No clients yet'}

═══════════════════════════════════════
ACTIVE PROJECTS
═══════════════════════════════════════
${projects.filter(p => p.status === 'in-progress').map(p =>
  `• ${p.name} | ${p.service_type} | $${Number(p.value).toLocaleString()}`
).join('\n') || 'No active projects'}

═══════════════════════════════════════
OUTSTANDING INVOICES
═══════════════════════════════════════
${unpaidInvoices.map(i =>
  `• ${i.invoice_number} | ${i.client_name ?? 'Unknown'} | $${Number(i.amount).toLocaleString()} | ${i.status.toUpperCase()}${i.due_date ? ` | Due: ${i.due_date}` : ''}`
).join('\n') || 'None outstanding'}

═══════════════════════════════════════
SERVICES OFFERED
═══════════════════════════════════════
• Brandscaling: Brand strategy, content, positioning, social media growth
• AI Freelancing: Custom AI tools and automation built for clients
• AI Consultation: Strategy sessions, AI roadmapping, implementation plans
• Website / Dashboard: Web development, data dashboards, admin panels

═══════════════════════════════════════
YOUR CAPABILITIES
═══════════════════════════════════════
1. Draft professional emails to clients (proposals, follow-ups, onboarding, etc.)
2. Write project proposals and scope-of-work documents
3. Create pricing strategies and package recommendations
4. Generate invoice follow-up messages
5. Suggest upsell strategies based on current clients
6. Provide financial analysis and growth advice
7. Help prioritize tasks and plan workload
8. Draft cold outreach scripts and templates
9. Create onboarding checklists for new clients
10. Answer any business strategy questions
11. Summarize CRM pipeline progress and identify highest-value opportunities
12. Remind about overdue follow-ups and rank leads by priority
13. Analyze employee performance based on lead data
14. Generate weekly/monthly sales reports from live lead data

Always be professional, concise, and actionable. Use markdown formatting. Reference specific names and real numbers from the live data when relevant. When drafting emails, format them properly with subject line, greeting, body, and sign-off.`
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, org_id, error: authError } = await getOrgClient()
    if (authError) return authError

    const { messages } = await req.json()

    const systemPrompt = await buildSystemPrompt(supabase!, org_id)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ reply: text })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
