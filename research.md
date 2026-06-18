# R&R Lead Intelligence Platform — Research & Product Plan

## Product Summary

**One-liner:** A framework-first lead intelligence system that takes 
R&R Collective from Google Maps discovery to signed contract in one 
unified workflow.

**Target user:** R&R Collective internally (then boutique agencies 
and growth collectives doing manual prospecting)

**Core problem:** Manual Google Maps + spreadsheet prospecting creates 
a bottleneck that makes client acquisition unpredictable and 
unscalable.

**Differentiation:** Unlike Apollo (expensive, generic) or Clay 
(powerful but $700+/mo and requires RevOps), R&R's tool scores every 
lead against R&R's 5 proprietary consulting frameworks — telling the 
strategist not just who to contact, but exactly which service they 
need and why.

**Verdict:** 🟢 26/30 — Strong signal, proceed with conviction

---

## Phase 1 — Problem Validation

**Core problem:** R&R Collective cannot acquire clients predictably 
because their entire lead generation workflow is manual, fragmented, 
and unscalable — running on Google Maps tab-switching and spreadsheet 
copy-paste.

- Real pain? Yes. Manual prospecting is the #1 bottleneck to growth 
  for agencies at this stage.
- Are they paying to solve it today? With time, not money. 
  That is the unlock.
- Vitamin or painkiller? Painkiller. Without consistent lead flow, 
  there is no agency.

### Market Sizing

| Tier | Estimate | Basis |
|---|---|---|
| TAM | $6–10B | Global lead generation software market (2026) |
| SAM | ~$2B | Agencies, growth collectives, boutique consultancies globally |
| SOM | $500K–$2M ARR | Realistic 1–3 year capture targeting agencies like R&R |

### Why Now

- AI has made data enrichment cheap — what Apollo charges $99/month 
  for can now be replicated with $5 in API calls
- Free infrastructure tier (Vercel + Supabase) means zero hosting 
  cost for an internal tool
- Agencies increasingly want white-label tools as a revenue line
- Google Maps remains the most-used prospecting source for agency 
  lead gen — no tool integrates it cleanly

---

## Phase 2 — Competitive Intelligence

| Competitor | Core Offering | Strengths | Weaknesses | Pricing |
|---|---|---|---|---|
| Apollo.io | 275M contact database + email sequencing | Massive database, fast filters, all-in-one | 65–70% data accuracy, poor support, expensive at scale | $49–99/user/mo |
| Clay.com | Waterfall enrichment + AI research | Maximum data flexibility | $149–800+/mo, steep learning curve, credits spiral | $149–800/mo |
| Hunter.io | Email finder | Best-in-class email accuracy | Email-only — no prospecting, no pipeline, no workflow | $34–149/mo |
| Instantly.ai | Cold email sequencing | High deliverability, simple UX | Zero prospecting layer | $37–97/mo |
| Uplead | B2B database | High accuracy guarantee | US-focused, expensive, no Google Maps integration | $99–299/mo |

### Competitive Gaps

1. No tool is built for agency-specific workflows — every tool assumes 
   a SaaS sales motion, not consulting/service acquisition
2. No tool scores leads against a consulting framework — they all 
   return contacts, not strategic fit signals
3. Nothing good exists in the free-to-$50/month range for a full 
   workflow (discovery → qualify → track)
4. Google Maps as a lead source is completely underserved — how most 
   agency founders actually prospect, yet no tool integrates it

### Differentiation Statement

Unlike Apollo (generic B2B database) or Clay (complex enrichment 
requiring RevOps expertise), R&R's platform is the only lead 
intelligence tool that scores every prospect against a specific 
consulting framework — telling the strategist not just who to contact, 
but which R&R service they need and exactly why.

---

## Phase 3 — Viability Verdict

| Dimension | Score | Notes |
|---|---|---|
| Problem Severity | 5/5 | Manual prospecting is universally painful |
| Market Size | 5/5 | $6–10B market growing at 10–15% CAGR |
| Competitive Openness | 4/5 | Real gaps exist — framework scoring is uncontested |
| Technical Feasibility | 4/5 | Fully achievable solo, no exotic tech required |
| Monetization Clarity | 4/5 | Clear path: internal → white-label → SaaS tiers |
| Timing | 4/5 | AI APIs + free infra + rising agency demand = right window |
| **Overall** | **26/30** | |

### Top 3 Risks

1. **Google Maps API data quality** — data can be thin for 
   micro-businesses. Mitigate by building a Serper.dev fallback 
   from day one and validating data quality in week 1.

2. **Email deliverability** — cold emails hitting spam destroys the 
   product's core value. Mitigate by setting up a dedicated sending 
   domain with DKIM/SPF via Resend from day one.

3. **Internal-to-SaaS DB design failure** — building for one user 
   then adding multi-tenancy later requires a painful rebuild. 
   Mitigate by designing Supabase RLS policies for organization_id 
   from day one.

---

## Phase 4 — Product Blueprint

### R&R's 5 Frameworks (the scoring engine)

Every lead is scored against exactly one of these frameworks.
The framework match is the most important output the tool produces.

1. **Brand Positioning** — company has product-market fit but weak 
   differentiation, no premium positioning, unclear messaging
2. **Client Acquisition** — no systematic outreach, relies on 
   referrals, no inbound funnel, inconsistent pipeline
3. **Growth Infrastructure** — revenue plateaued, no retention system, 
   high CAC, no KPI framework, marketing is ad hoc
4. **Scaling Roadmap** — growing fast but operationally chaotic, 
   no SOPs, hiring without structure, margins compressing
5. **Venture Development** — strong operator with capital or concept 
   looking to co-build a new venture

### AI Scoring Prompt (Claude Haiku)

System: You are a strategic analyst for R&R Collective, a growth 
consultancy. Given a company profile, identify which of R&R's 5 
frameworks this company most needs, score the fit 0.0–10.0, and 
write one sentence of reasoning. Respond only in JSON.

User: Company: {name}. Industry: {industry}. 
Website signals: {signals}. Description: {description}.

Response format:
{
  "framework": "brand_positioning | client_acquisition | 
                growth_infrastructure | scaling_roadmap | 
                venture_development",
  "score": 8.4,
  "reasoning": "One sentence explaining why this company 
                needs this framework right now."
}

### MVP Feature Set (RICE Prioritization)

| Feature | RICE Score | In MVP? |
|---|---|---|
| Lead Discovery (Google Maps API by niche + city) | 18.0 | ✅ |
| Framework Scoring (Claude Haiku scores each lead) | 16.2 | ✅ |
| Pipeline Board (Kanban: Discovered → Qualified → Outreach → Closed) | 24.0 | ✅ |
| Lead Enrichment (email, website, social links) | 12.6 | ✅ |
| Email Outreach Sequences | 8.4 | ❌ Phase 2 |
| White-label mode + Stripe billing | — | ❌ Phase 2 |

### Critical User Journey

1. **Discovery** — define niche + geography → tool queries Google 
   Maps → returns 50+ businesses
2. **Scoring** — Claude Haiku scores each lead against R&R's 5 
   frameworks, returns framework match + score + one-line reasoning
3. **Triage** — leads sorted by framework score, top leads move 
   to pipeline
4. **Pipeline** — qualified leads tracked through stages with notes 
   and next action
5. **Outreach (Phase 2)** — email sent directly from pipeline record

### UX Principles

1. **Framework-first** — every lead surfaces which R&R service it 
   needs before anything else. The framework match is the first 
   thing a strategist sees, not the company name.
2. **Surface signal, suppress noise** — leads always sorted by 
   framework score; the best ones are never buried
3. **Zero tab-switching** — Google Maps discovery to pipeline note 
   in one interface
4. **Sharp tool, not dashboard** — clean, fast, minimal. Not HubSpot.
5. **Pipeline as single source of truth** — one home per lead from 
   first discovery to closed deal

---

## Phase 5 — Technical Architecture

### Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js 15 (App Router) + Tailwind CSS | Full-stack in one framework, free on Vercel, TypeScript-first |
| Database + Auth | Supabase (free tier) | PostgreSQL + built-in auth + RLS for multi-tenancy from day one |
| Hosting | Vercel (free tier) | Zero infra cost for internal tool |
| Lead Discovery | Google Places API | $200/month free credit covers ~40k requests |
| Discovery Fallback | Serper.dev (2,500 free searches/month) | Backup when Google Places data is thin |
| Email Enrichment | Hunter.io API (free: 25/month) + pattern inference | Hunter for known domains, pattern inference as primary |
| Email Sending | Resend (free: 3k emails/month) | Phase 2 — excellent deliverability, trivial DKIM/SPF |
| AI Scoring | Claude Haiku API (Anthropic) | Framework scoring — pay-per-use, ~$1–5/month at R&R's volume |

### Database Schema

```sql
-- Multi-tenancy from day one
organizations (id, name, created_at)

-- All leads scoped to an org
-- Scored against R&R's 5 frameworks, not generic ICP criteria
leads (
  id, organization_id, name, address, phone,
  website, email, stage,
  framework_match,     -- 'brand_positioning' | 'client_acquisition' |
                       -- 'growth_infrastructure' | 'scaling_roadmap' |
                       -- 'venture_development'
  framework_score,     -- 0.0 to 10.0
  framework_reasoning, -- one sentence from Claude Haiku
  source, notes, created_at, updated_at
)

-- Outreach history (Phase 2)
outreach_logs (
  id, lead_id, organization_id,
  type, subject, body, sent_at,
  opened_at, clicked_at
)
```

### System Design

[Browser / Next.js UI]

↓

[Next.js API Routes] ← server-side only (API keys never client-side)

↓              ↓               ↓              ↓

[Google Places API] [Hunter.io API] [Claude Haiku] [Resend API]

↓

[Supabase PostgreSQL]

### Technical Risk Flags

1. **Google Maps rate limits** — spike with a test script in week 1 
   counting credits per 50-lead search before building any UI
2. **Hunter free tier (25/month)** — build email pattern inference 
   as primary, Hunter as fallback
3. **Supabase free tier** — 500MB, 50k rows. Fine for internal use. 
   Upgrade to Pro ($25/month) when going multi-tenant.

---

## Phase 6 — Execution Roadmap

### Phase 0 — Validation Sprint (Week 1)

Build one Next.js page:
- Input: niche keyword + city
- Process: Call Google Places API server-side
- Output: Table of businesses with name, address, phone, website, 
  framework score from Claude Haiku

No database. No auth. No pipeline. Prove the core loop works.

**Success test:** Find 20 real potential R&R clients in one search, 
each with a framework match and score, in under 10 minutes.

### Phase 1 — MVP (Weeks 2–6)

| Week | Milestone |
|---|---|
| Week 2 | Supabase schema + auth, save discovered leads to DB |
| Week 3 | Framework scoring — Claude Haiku integration, score display |
| Week 4 | Pipeline board — Kanban, drag-and-drop stages, notes |
| Week 5 | Enrichment — Hunter API, email pattern inference, website signals |
| Week 6 | Internal dogfooding — 3 real R&R prospect searches, fix friction |

**Done looks like:** R&R runs a discovery search, leads are framework-
scored and in pipeline within 10 minutes, no spreadsheet touched.

### Phase 2 — Growth (Post-MVP)

- Email outreach sequences via Resend
- AI-personalized cold email using framework reasoning as context
- LinkedIn enrichment
- Analytics: conversion by framework, avg time-to-close
- Multi-tenant white-label mode
- Stripe billing ($49 / $149 / $299 tiers)

### Go-to-Market

- **Month 1–3:** Internal only — use for R&R's own client acquisition
- **Month 4–6:** First 10 external users from R&R's network, 
  free in exchange for feedback
- **Month 7+:** Paid tiers, agency reseller program

**Key metric:** Time from opening the tool to having a framework-
scored lead in pipeline. Target: under 10 minutes.

---

## Sources

- Apollo.io Complaints: Real User Issues & Pain Points — bigideasdb.com
- Clay vs Apollo Comparison 2026 — uplead.com
- Lead Generation Software Market Size 2026–2032 — 360iresearch.com
- Is Clay Legit or Overhyped? — resources.reachstream.com
- Best Automated Lead Generation Software 2026 — prospeo.io