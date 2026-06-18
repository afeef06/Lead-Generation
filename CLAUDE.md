# R&R Lead Intelligence Platform

## Project Overview

Internal lead generation platform for R&R Collective. Replaces the current Google Maps + spreadsheet manual prospecting workflow with a unified, ICP-first system covering discovery, scoring, enrichment, and pipeline tracking. Built to be used internally first, then productized and sold to other agencies.

## Key Documents

@research.md

## Product Context

**Stage:** Pre-build. Validation sprint starts with a single Next.js page proving Google Places API data quality.

**Core workflow being replaced:**
1. Manual Google Maps search by niche + city
2. Copy business details into spreadsheet
3. No scoring, no enrichment, no pipeline tracking

**What we're building:**
1. Lead discovery via Google Places API (niche + city input → list of businesses)
2. ICP scoring (0–100 score per lead against defined criteria)
3. Lead enrichment (email via Hunter.io, website, social links)
4. Pipeline board (Kanban: Discovered → Qualified → Outreach → Closed)
5. Phase 2: Email outreach sequences, AI personalization, white-label multi-tenant mode

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend + Backend | Next.js 15 (App Router, TypeScript) |
| Database + Auth | Supabase (PostgreSQL, RLS, free tier) |
| Hosting | Vercel (free tier) |
| UI Components | shadcn/ui + Tailwind CSS |
| Lead Discovery | Google Places API (New) + Serper.dev |
| Email Enrichment | Hunter.io API + email pattern inference |
| Email Sending | Resend |
| AI (Phase 2) | Claude API (Anthropic) |

## Architecture Decisions

- **Multi-tenancy from day one:** All tables include `organization_id`. Supabase RLS policies scope every query to the authenticated user's org. R&R is org #1. Adding future clients requires no schema changes.
- **API keys server-side only:** All third-party API calls (Google, Hunter, Serper, Resend) happen in Next.js API routes — never exposed to the client.
- **No separate backend server:** Next.js API routes handle all server-side logic. Reduces infra complexity and cost to zero for internal use.

## Critical Constraints

- **Budget:** Free tier only until revenue justifies upgrades. Supabase free (500MB, 50k rows), Vercel free, Google Places $200/month credit, Resend 3k emails/month free.
- **Team:** Solo developer (founder).
- **Week 1 blocker:** Validate Google Places API data quality before writing any database schema. If data is thin for target niches, evaluate Outscraper ($0.001/result) as fallback.

## Execution Order

1. Week 1 — Validation: Single page, Google Places API, prove data quality
2. Week 2 — Foundation: Supabase schema + auth + lead storage
3. Week 3 — Scoring: ICP criteria model + scoring logic
4. Week 4 — Pipeline: Kanban board + drag-to-stage
5. Week 5 — Enrichment: Hunter API + email pattern inference
6. Week 6 — Polish: Internal dogfooding on real R&R prospects

## ICP for R&R's Own Prospecting

When building the scoring model, R&R's ideal client criteria:
- Brand/business with existing revenue (not pre-revenue)
- Has a digital presence but under-optimized (website exists, weak positioning)
- Operating in e-commerce, lifestyle, media, or professional services
- Founder-led or small leadership team (decisions move fast)
- Showing signals of wanting to scale (hiring, expanding, active on social)

## Future Productization Path

Internal → White-label (R&R clients use it under R&R brand) → SaaS (open to other agencies)

Pricing when ready:
- Solo: $49/month (1 user, 500 leads/month)
- Agency: $149/month (5 users, 2,000 leads/month)
- Collective: $299/month (unlimited users, white-label, 10k leads/month)
