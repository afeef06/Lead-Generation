'use client'

import { useState } from 'react'
import {
  BookOpen, Tag, Calendar, ClipboardList, Mic2, Building2,
  DollarSign, TrendingUp, Users, Globe,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface GoalSet   { period: string; color: string; bg: string; border: string; items: string[] }
interface Script    { title: string; color: string; script: string }
interface StepItem  { num: number; title: string; body: string; tips?: string[] }
interface PriceRow  { service: string; price: string; note?: string }
interface NicheNote { niche: string; note: string; color: string }

// ─── Pricing (shared across all roles) ───────────────────────────────────────
const ONE_TIME: PriceRow[] = [
  { service: 'Landing Page (1-page, mobile-ready, contact form)',             price: '$800',          note: 'Good entry point for home services & contractors' },
  { service: 'Business Website (5–8 pages, SEO setup, contact form)',         price: '$1,500',        note: 'Standard for most local businesses' },
  { service: 'Website + Online Booking / Scheduling System',                  price: '$2,500',        note: 'Best seller for med spas & dental' },
  { service: 'Custom Dashboard / Business Management Panel',                  price: '$4,000',        note: 'For businesses that need internal tools' },
  { service: 'AI Chatbot for Website (lead capture + FAQ)',                   price: '$1,200',        note: 'Add-on or standalone' },
  { service: 'AI Automation Setup — Basic (1–2 automations)',                 price: '$1,500',        note: 'Follow-up sequence or booking reminders' },
  { service: 'AI Automation Setup — Full (lead mgmt + follow-up suite)',      price: '$2,500',        note: 'Most popular for law firms & contractors' },
  { service: 'Advanced AI System (multi-automation + integrations)',          price: '$5,000–$8,000', note: 'Enterprise-level for larger businesses' },
  { service: 'Brand Identity Package (logo, colors, fonts, brand guide)',     price: '$1,000',        note: 'Required before brandscaling starts' },
  { service: 'Full Brandscaling Package (brand + content strategy + templates)', price: '$2,200',     note: 'Pairs with monthly retainer' },
  { service: 'AI Strategy Session (90 min + roadmap document)',               price: '$400',          note: 'Great door-opener — low commitment' },
]

const RETAINERS: PriceRow[] = [
  { service: 'Website Hosting + Maintenance',                               price: '$200/mo',    note: 'Always upsell after every website build' },
  { service: 'Website + Monthly Updates + Basic SEO',                       price: '$400/mo',    note: 'Standard maintenance retainer' },
  { service: 'AI Automation Monitoring + Optimization',                     price: '$750/mo',    note: 'Keep automations running and improving' },
  { service: 'Social Media Content (4 posts/week)',                         price: '$800/mo',    note: 'Instagram + Facebook for local businesses' },
  { service: 'Full Brandscaling (strategy + content + 20 posts/mo)',        price: '$1,500/mo',  note: 'Long-term brand growth retainer' },
  { service: 'Ongoing AI Consultation + Strategy Support',                  price: '$1,000/mo',  note: 'For businesses implementing AI internally' },
  { service: 'Full-Service Retainer (site + automation + content)',         price: '$2,000/mo',  note: 'Highest value — lock in for 3-month minimum' },
]

const NICHE_NOTES: NicheNote[] = [
  { niche: 'Personal Injury Law Firms',      color: '#8B0000', note: 'Highest budgets. One-time $3,000–$8,000+, retainers $1,000–$2,000+/mo. Pitch speed-to-lead AI (they lose cases to faster competitors). Always aim for full AI automation.' },
  { niche: 'Med Spas & Aesthetic Clinics',   color: '#7C3AED', note: 'Strong budgets. One-time $2,000–$5,000, retainers $800–$1,500/mo. Focus on booking automation + rebooking campaigns. Owners are ROI-driven.' },
  { niche: 'Dental & Orthodontic Practices', color: '#10B981', note: 'Reliable buyers. One-time $1,500–$3,500, retainers $400–$900/mo. Lead with appointment reminders + patient reactivation. Front desk pain is the hook.' },
  { niche: 'General Contractors',            color: '#6B5850', note: 'Project mindset. One-time $1,500–$3,000. Harder to sell retainers — focus on website + lead follow-up automation. Show ROI in jobs closed.' },
  { niche: 'Home Services',                  color: '#C07030', note: 'Price-sensitive. Start at $800–$1,500 to get in the door, then upsell. Frame it as cost per extra job: "If we get you 2 extra roofing jobs, this pays for itself."' },
]

// ─── Sales Rep Playbook ───────────────────────────────────────────────────────
const SALES_GOALS: GoalSet[] = [
  {
    period: 'Daily', color: '#10B981', bg: '#0E2A1E', border: '#10B981',
    items: [
      'Log 5+ new leads into your portal before reaching out',
      'Make 10+ outreach attempts (calls first, then DMs, then emails)',
      'Follow up with every lead you haven\'t heard from in 48+ hours',
      'Update the status on every lead you spoke to today',
      'Set a follow-up date for every single active lead',
    ],
  },
  {
    period: 'Weekly', color: '#A50000', bg: '#1A0808', border: '#A50000',
    items: [
      'Book 3+ discovery calls or meetings',
      'Add 25+ new leads to the pipeline',
      'Move 5+ leads from Contacted → Responded or further',
      'Ensure every active lead has a follow-up date set',
      'Clear all overdue follow-ups — zero by Friday',
    ],
  },
  {
    period: 'Monthly', color: '#8B0000', bg: '#170A0A', border: '#8B0000',
    items: [
      'Close 2+ signed clients',
      'Build $10,000+ in active pipeline value',
      'Book 10+ total meetings',
      'Keep overdue follow-ups under 5 at any given time',
      'Log at least 100 new leads across the month',
    ],
  },
]

const SALES_PROCESS: StepItem[] = [
  {
    num: 1, title: 'Pick one niche for the session',
    body: 'Rotate through all 5 niches throughout the week. Working one niche at a time keeps your pitch sharp and your context strong. Don\'t jump between niches mid-session.',
  },
  {
    num: 2, title: 'Build your lead list (10+ businesses)',
    body: 'Use all three sources for each session:\n• Google Maps: search "[niche] near [your city]" → work through every result\n• Instagram: search niche hashtags + city hashtags (e.g. #DallasRoofing, #PlanoMedSpa)\n• Facebook: search "[niche] [city]" and check local business groups',
    tips: ['High review count (20+) = established business with real budget', 'Recent Google posts or Instagram activity = owner is engaged and reachable', 'Look for businesses that run ads — they already believe in marketing spend'],
  },
  {
    num: 3, title: 'Qualify each business quickly (2 min max)',
    body: 'You\'re looking for signs the business is real, active, and has budget:\n• 4+ Google reviews (they exist and have customers)\n• Active on social media in the last 30 days\n• Website or Google Business profile looks like they\'re investing in their brand\n• Located in a decent area (zip code can tell you a lot)',
    tips: ['Skip businesses with fewer than 3 reviews — too small', 'If they have 100+ reviews and a solid web presence, they\'re a warm lead even before contact'],
  },
  {
    num: 4, title: 'Collect their contact info',
    body: 'For every qualified business, gather:\n• Phone number (Google Maps listing — always has it)\n• Email address (their website contact page or footer)\n• Instagram handle (linked from Google or direct search)\n• Owner name if visible (Google listing, website "About" page, or LinkedIn)',
  },
  {
    num: 5, title: 'Log them in your portal FIRST',
    body: 'Before you pick up the phone or send a single DM — log the lead. Set status to "Not Contacted," add their info, set temperature based on your first impression, and write any notes you have on them.',
    tips: ['This is non-negotiable — if it\'s not logged it doesn\'t exist', 'A lead you called but didn\'t log is a lead you\'ll forget to follow up on'],
  },
  {
    num: 6, title: 'Execute outreach in order',
    body: 'Always try in this sequence:\n1. Cold call (highest response + conversion rate)\n2. DM on Instagram or Facebook (if no answer after 1-2 calls)\n3. Email (slowest — use as backup or for professional-feeling niches like law firms)',
    tips: ['Best times to call: Tue–Thu 9–11am or 2–4pm', 'Avoid Mondays and Fridays', 'Leave a voicemail on the first missed call — it warms them up for the follow-up call'],
  },
  {
    num: 7, title: 'Update status immediately after every attempt',
    body: 'Right after every outreach action, update the lead in your portal:\n• Left voicemail → Contacted\n• Sent DM → Contacted\n• Had a conversation → Responded\n• They agreed to a call → Meeting Booked\n• Sent a proposal → Proposal Sent',
  },
  {
    num: 8, title: 'Set your next action before moving on',
    body: 'Every lead must have a follow-up date. No exceptions. If they said "call me Thursday" — set Thursday. If you left a voicemail — set tomorrow. If they\'re cold — set 3 days from now. Write what happened in the Notes field.',
    tips: ['If a lead has no follow-up date, it\'s a dead lead', 'Follow up at least 5 times before marking a lead cold — most closes happen on the 3rd–5th contact'],
  },
]

const SALES_SCRIPTS: Script[] = [
  {
    title: 'Cold Call',
    color: '#10B981',
    script: `When they pick up:\n"Hey [Name], this is [Your Name] — sorry for the random call. I'll be super quick. We help [niche] businesses automate their follow-ups and lead management using AI so they're not doing it all manually. Is that something you'd be open to hearing more about?"\n\nIf yes:\n"Perfect. It's honestly a 15-minute conversation — I'll show you exactly what it looks like for a business like yours and you can decide from there. What does your schedule look like this week?"\n\nIf they say "call me back / send me an email":\n"Absolutely — what's the best email? And just so I don't catch you off guard again, what's a better time to reach you?"\n\nIf they say no:\n"Totally fair. Out of curiosity — is it more that the timing's off, or is automation not something you'd consider? I want to make sure if I ever reach back out it's actually relevant."\n\nVoicemail:\n"Hey [Name], this is [Your Name]. Sorry I missed you — quick message. We help [niche] businesses automate their follow-ups and client management using AI. If that's worth a quick conversation, call me back at [number] or I'll try you again in a couple days. Thanks."`,
  },
  {
    title: 'Cold DM (Instagram / Facebook)',
    color: '#A50000',
    script: `Hey [Name] 👋 I came across [Business] and really liked what you're doing.\n\nWe help [niche] businesses automate their follow-ups, lead gen, and client management using AI — so you're not doing it all manually.\n\nWould you be open to a quick 15-min call to see if it's a fit? No pressure at all.`,
  },
  {
    title: 'Cold Email',
    color: '#8B0000',
    script: `Subject: Quick question about [Business Name]\n\nHi [Name],\n\nI help [niche] businesses save time and close more clients using AI automation — instant lead responses, automated follow-ups, and booking systems that run 24/7.\n\nMost clients see results within the first 30 days.\n\nWould you be open to a quick 15-minute call this week?\n\n[Your Name]`,
  },
  {
    title: 'Follow-Up (No Response)',
    color: '#C07030',
    script: `Hey [Name], just following up on my last message. I know things get busy — totally get it.\n\nWe're working with a few [niche] businesses right now and seeing some solid results. Worth a quick 15-min chat?`,
  },
  {
    title: 'Objection: "Too Busy"',
    color: '#10B981',
    script: `Totally understand — that's actually exactly why I reached out. Most of our clients say the same thing before we help them automate those time-consuming tasks.\n\nIt only takes 15 minutes and I'll show you exactly what it would look like for [Business]. Want to find a time?`,
  },
  {
    title: 'Objection: "Not Interested"',
    color: '#707070',
    script: `No worries at all. Out of curiosity — is it more that the timing isn't right, or is automation not something you'd consider for [Business]?\n\nI'd love to understand so I can reach back out when it actually makes sense.`,
  },
]

// ─── Web Specialist Playbook ──────────────────────────────────────────────────
const WEB_GOALS: GoalSet[] = [
  {
    period: 'Daily', color: '#10B981', bg: '#0E2A1E', border: '#10B981',
    items: [
      'Research and audit 5+ business websites across the target niches',
      'Log 3+ qualified leads into your portal with full notes',
      'Check in on every active project — update status or notes',
      'Respond to all client messages within 2 hours',
      'Have 3 fully documented hot/warm leads ready by end of day',
    ],
  },
  {
    period: 'Weekly', color: '#A50000', bg: '#1A0808', border: '#A50000',
    items: [
      'Identify 15+ businesses with no website or a broken/outdated one',
      'Prepare 2+ written website audit summaries for hot leads',
      'Deliver progress updates to every active web client',
      'Submit at least 1 project proposal',
      'Have a full slate of leads ready for the sales team to contact',
    ],
  },
  {
    period: 'Monthly', color: '#8B0000', bg: '#170A0A', border: '#8B0000',
    items: [
      'Close 1+ new website or dashboard project',
      'Deliver 1+ completed project on time and on spec',
      'Build $5,000+ in documented pipeline value',
      'Collect 1+ client testimonial or before/after case study',
      'Audit 20+ business websites across all 5 target niches',
    ],
  },
]

const WEB_PROCESS: StepItem[] = [
  {
    num: 1, title: 'Choose your niche for the session',
    body: 'Rotate through all 5 niches across the week. Do one niche per session so you build context and your audit notes stay sharp. Monday = Home Services, Tuesday = Med Spas, etc.',
  },
  {
    num: 2, title: 'Open Google Maps → search the niche',
    body: 'Search "[niche] near [city]" — for example "roofing company near Dallas" or "med spa near Plano." Click through every result in the list.',
    tips: ['Look at the map pins too — some businesses don\'t show in the list', 'Try multiple search variations: "HVAC contractor", "air conditioning repair", etc.'],
  },
  {
    num: 3, title: 'Check for a website',
    body: 'In the Google Maps listing, look for a website link. If there is NO website listed → this is automatically a Hot lead. Log it immediately.',
    tips: ['No website = top priority every time', 'Some businesses list a Facebook page as their "website" — that still counts as no real website'],
  },
  {
    num: 4, title: 'Audit their website (if they have one)',
    body: 'Open it on your phone and check every one of these:\n• Does it load within 3 seconds?\n• Does it display properly on mobile (text not tiny, no broken layout)?\n• Is there a clear booking form, call button, or contact page?\n• Is the design modern or does it look like it was built in 2012?\n• Is there a copyright year at the bottom? (old year = abandoned site)\n• Can a new visitor understand what they do within 5 seconds?',
    tips: ['Fail on 2+ of these = Warm or Hot lead', 'Fail on 4+ = Hot lead with a strong pitch angle'],
  },
  {
    num: 5, title: 'Collect their contact info',
    body: 'From the Google Maps listing: business name, phone number, address. From their website: email address (usually on the contact page or footer), owner name if listed. From Instagram/Facebook if linked: handle, owner name sometimes in bio.',
  },
  {
    num: 6, title: 'Log everything in your portal',
    body: 'Create the lead entry BEFORE moving on. Fill in:\n• Company name + industry\n• Contact person (owner name if found)\n• Phone + email + any social handles\n• Temperature (Hot / Warm / Cold)\n• Estimated contract value (use pricing guide)\n• Notes: exactly what is wrong and what you would build',
    tips: ['The more detail in your notes, the easier it is to close', 'Example note: "No website. 47 Google reviews. Roofing contractor. Would need 5-page site + lead form + Google integration. Est $1,500-$2,500."'],
  },
  {
    num: 7, title: 'Prepare a mini audit for your hottest leads',
    body: 'For every lead you mark Hot: screenshot their current site (or note "no website"), write 3 bullet points on exactly what you\'d fix or build, and estimate the project scope. This becomes the pitch material when they\'re contacted.',
  },
  {
    num: 8, title: 'End-of-day: review your portal',
    body: 'Before finishing: make sure every lead you researched is logged, every hot lead has detailed notes, and your next-action field is filled in. Aim for 3+ hot/warm leads with full notes every single day.',
  },
]

const WEB_SCRIPTS: Script[] = [
  {
    title: 'Cold DM — Website Audit Approach',
    color: '#A50000',
    script: `Hey [Name] 👋 I was just checking out [Business]'s website and noticed a few things that might be hurting your leads — things like [no online booking / slow load time / not mobile-friendly / no clear call to action].\n\nWe build modern websites and AI-powered client management systems for [niche] businesses that actually convert visitors into paying clients.\n\nWould you be open to a free 10-min audit call where I walk you through exactly what I'd change?`,
  },
  {
    title: 'Cold Email — Website Audit',
    color: '#8B0000',
    script: `Subject: I checked out [Business Name]'s website\n\nHi [Name],\n\nI took a look at [Business]'s website and noticed it might be leaving money on the table — [specific observation: no online booking, not mobile-friendly, slow load time, no clear CTA].\n\nWe build fast, modern websites and client management systems specifically for [niche] businesses. Most clients see more online inquiries within the first 30 days.\n\nWould you be open to a free 10-minute call where I share exactly what I'd change for [Business]?\n\n[Your Name]`,
  },
  {
    title: 'Discovery Call Script',
    color: '#C07030',
    script: `Opening:\n"Thanks for jumping on — I took a look at your website before the call so I have some specific things to walk you through. Quick question first: are you currently getting leads from your website, or is most of your business from referrals?"\n\nIf referrals:\n"That's great — it also means you're leaving online leads on the table every day. Let me show you what I found and what we'd do differently."\n\nIf getting some online leads:\n"Good — so you already know it works. The question is how much more it could be doing. Let me walk you through a few things I'd change."\n\nClosing the call:\n"Based on everything we covered, I'd put together a proposal — ballpark [price range from pricing guide] depending on the full scope. Want me to send that over this week?"`,
  },
  {
    title: 'Follow-Up (No Response)',
    color: '#707070',
    script: `Hey [Name], just following up on the website audit I mentioned. I put together a quick overview of what I'd change for [Business] — takes 10 minutes to walk through.\n\nWant me to send it over or hop on a quick call? Happy to work around your schedule.`,
  },
  {
    title: 'Objection: "We Already Have a Website"',
    color: '#7C3AED',
    script: `"Totally — I actually looked at it before reaching out. [Specific thing you found]. The question isn't whether you have a website, it's whether it's actively working for you.\n\nA lot of [niche] businesses are surprised when we show them how many leads their current site is losing. Worth a 10-minute look?"`,
  },
]

// ─── Target Niches ────────────────────────────────────────────────────────────
const NICHES = [
  {
    num: '01', name: 'Home Services', sub: 'Roofing · HVAC · Plumbing · Landscaping',
    pain: 'Missed calls, slow follow-up, jobs falling through the cracks',
    hook: '"We automate your lead follow-up, quote reminders, and review requests — so you close more jobs without hiring more staff."',
    find: 'Google Maps, Yelp, Facebook groups, Nextdoor, local Facebook ads',
    color: '#C07030',
  },
  {
    num: '02', name: 'Med Spas & Aesthetic Clinics', sub: 'Botox · Fillers · Laser · Body Contouring',
    pain: 'Manual booking, no automated rebooking or retention system',
    hook: '"We automate your entire client journey — from first inquiry to rebooking — so your staff can focus on treatments, not admin work."',
    find: 'Instagram, Google Maps, RealSelf, Allergan/Galderma partner lists',
    color: '#7C3AED',
  },
  {
    num: '03', name: 'General Contractors & Remodelers', sub: 'Kitchen · Bath · Additions · Full Home Remodels',
    pain: 'Slow lead response, no follow-up system, losing jobs to faster competitors',
    hook: '"We build AI systems that respond to new leads instantly and follow up automatically so you never lose a job to slow response again."',
    find: 'Houzz, Angi, Google Maps, LinkedIn, local Facebook groups',
    color: '#6B5850',
  },
  {
    num: '04', name: 'Personal Injury Law Firms', sub: 'Auto Accidents · Slip & Fall · Workers Comp',
    pain: 'Potential clients going to competitors due to slow intake and follow-up',
    hook: '"We set up AI intake systems that respond to injury inquiries within seconds and follow up until they\'re ready to sign."',
    find: 'Google Ads leads, Avvo, Martindale-Hubbell, LinkedIn, local bar directories',
    color: '#8B0000',
  },
  {
    num: '05', name: 'Dental & Orthodontic Practices', sub: 'General Dentistry · Invisalign · Implants · Cosmetic',
    pain: 'Overwhelmed front desk, appointment no-shows, inactive patient list sitting unused',
    hook: '"We automate your appointment reminders, confirmation texts, and patient recall campaigns — so you fill more chairs without adding staff."',
    find: 'Google Maps, Instagram, Yelp, ZocDoc, dental association directories',
    color: '#10B981',
  },
]

// ─── Sub-tab renderer for a playbook role ────────────────────────────────────
type SubTab = 'goals' | 'process' | 'scripts'

function PlaybookRole({
  goals, process, scripts,
}: {
  goals: GoalSet[]
  process: StepItem[]
  scripts: Script[]
}) {
  const [sub, setSub] = useState<SubTab>('goals')

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex border-b border-[#1A1A1A] mb-6">
        {([
          { key: 'goals',   label: 'Goals',   Icon: Calendar      },
          { key: 'process', label: 'Process', Icon: ClipboardList },
          { key: 'scripts', label: 'Scripts', Icon: Mic2          },
        ] as const).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setSub(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
              sub === key
                ? 'text-[#C8C8C8] border-[#8B0000]'
                : 'text-[#404040] border-transparent hover:text-[#707070]'
            }`}
          >
            <Icon className="h-3 w-3" />{label}
          </button>
        ))}
      </div>

      {/* Goals */}
      {sub === 'goals' && (
        <div className="space-y-4">
          {goals.map(({ period, color, bg, border, items }) => (
            <div key={period} className="rounded-xl p-4" style={{ background: bg, border: `1px solid ${border}22` }}>
              <p className="text-xs font-semibold mb-3" style={{ color }}>{period}</p>
              <ul className="space-y-2">
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px] text-[#A0A0A0]">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Process */}
      {sub === 'process' && (
        <div className="space-y-3">
          {process.map(({ num, title, body, tips }) => (
            <div key={num} className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl p-4">
              <div className="flex items-start gap-3 mb-2">
                <span className="w-6 h-6 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-[10px] font-bold text-[#8B0000] flex-shrink-0 mt-0.5">{num}</span>
                <p className="text-[#E8E8E8] text-sm font-semibold leading-tight">{title}</p>
              </div>
              <p className="text-[13px] text-[#909090] leading-relaxed whitespace-pre-line pl-9">{body}</p>
              {tips && tips.length > 0 && (
                <div className="mt-3 pl-9 space-y-1.5">
                  {tips.map((tip, i) => (
                    <p key={i} className="text-xs text-[#8B0000] flex items-start gap-1.5">
                      <span className="mt-0.5 flex-shrink-0">→</span>{tip}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Scripts */}
      {sub === 'scripts' && (
        <div className="space-y-4">
          {scripts.map(({ title, color, script }) => (
            <div key={title} className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl p-4">
              <p className="text-xs font-semibold mb-3" style={{ color }}>{title}</p>
              <p className="text-[13px] text-[#909090] leading-relaxed whitespace-pre-line">{script}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
type MainTab = 'pricing' | 'sales' | 'web' | 'niches'

export default function PlaybookPage() {
  const [tab, setTab] = useState<MainTab>('pricing')

  return (
    <div className="p-4 md:p-8 max-w-4xl">

      {/* Header */}
      <div className="mb-8">
        <p className="text-lo text-[9px] font-semibold uppercase tracking-[0.22em] mb-1.5">Business</p>
        <h1 className="text-hi text-2xl font-semibold tracking-tight">Playbook & Pricing</h1>
        <p className="text-lo text-xs mt-1">Full pricing guide, outreach scripts, and step-by-step playbooks for every role.</p>
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 mb-8 bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-1">
        {([
          { key: 'pricing', label: 'Pricing',             Icon: Tag       },
          { key: 'sales',   label: 'Sales Rep Playbook',  Icon: TrendingUp },
          { key: 'web',     label: 'Web Specialist',      Icon: Globe     },
          { key: 'niches',  label: 'Target Niches',       Icon: Building2 },
        ] as const).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
              tab === key
                ? 'bg-[#1C1C1C] text-[#E8E8E8] shadow-sm'
                : 'text-[#404040] hover:text-[#707070]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Pricing tab ─────────────────────────────────────────────────────── */}
      {tab === 'pricing' && (
        <div className="space-y-8">

          {/* Quick summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Entry Point',      value: '$400',       sub: 'AI Strategy Session', color: '#A50000',  Icon: DollarSign  },
              { label: 'Avg Project',      value: '$2,000',     sub: 'One-time builds',     color: '#8B0000',  Icon: TrendingUp  },
              { label: 'Best Retainer',    value: '$2,000/mo',  sub: 'Full-service package', color: '#10B981', Icon: BookOpen    },
              { label: 'Top Niche',        value: 'Law Firms',  sub: '$8,000+ potential',   color: '#7C3AED',  Icon: Users       },
            ].map(({ label, value, sub, color, Icon }) => (
              <div key={label} className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-4">
                <Icon className="h-4 w-4 mb-2" style={{ color }} />
                <p className="text-[#E8E8E8] text-base font-semibold tabular-nums">{value}</p>
                <p className="text-[#606060] text-[10px] uppercase tracking-wider mt-0.5">{label}</p>
                <p className="text-[#404040] text-[10px] mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {/* One-time */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A50000]" />
              <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#A50000]">One-Time Projects</p>
            </div>
            <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl overflow-hidden">
              {ONE_TIME.map(({ service, price, note }, i) => (
                <div
                  key={service}
                  className={`px-5 py-3.5 flex items-start justify-between gap-6 hover:bg-[#111111] transition-colors ${
                    i < ONE_TIME.length - 1 ? 'border-b border-[#141414]' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-[13px] text-[#C8C8C8] leading-snug">{service}</p>
                    {note && <p className="text-[11px] text-[#454545] mt-0.5">{note}</p>}
                  </div>
                  <span className="text-[#A50000] text-sm font-semibold tabular-nums whitespace-nowrap flex-shrink-0">{price}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Retainers */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#10B981]">Monthly Retainers</p>
            </div>
            <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl overflow-hidden">
              {RETAINERS.map(({ service, price, note }, i) => (
                <div
                  key={service}
                  className={`px-5 py-3.5 flex items-start justify-between gap-6 hover:bg-[#111111] transition-colors ${
                    i < RETAINERS.length - 1 ? 'border-b border-[#141414]' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-[13px] text-[#C8C8C8] leading-snug">{service}</p>
                    {note && <p className="text-[11px] text-[#454545] mt-0.5">{note}</p>}
                  </div>
                  <span className="text-[#10B981] text-sm font-semibold tabular-nums whitespace-nowrap flex-shrink-0">{price}</span>
                </div>
              ))}
            </div>
          </div>

          {/* What each niche pays */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B0000]" />
              <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#8B0000]">What Each Niche Typically Pays</p>
            </div>
            <div className="space-y-2">
              {NICHE_NOTES.map(({ niche, note, color }) => (
                <div key={niche} className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-4">
                  <p className="text-sm font-semibold mb-1.5" style={{ color }}>{niche}</p>
                  <p className="text-[13px] text-[#707070] leading-relaxed">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Sales Rep tab ────────────────────────────────────────────────────── */}
      {tab === 'sales' && (
        <div>
          <div className="mb-6 bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-5">
            <p className="text-[#E8E8E8] text-sm font-semibold mb-1">Sales Representative Playbook</p>
            <p className="text-[#505050] text-xs leading-relaxed">
              For reps who prospect, cold call, send DMs, and book discovery calls. Focus: volume outreach → meetings booked → proposals sent → closes.
            </p>
          </div>
          <PlaybookRole goals={SALES_GOALS} process={SALES_PROCESS} scripts={SALES_SCRIPTS} />
        </div>
      )}

      {/* ── Web Specialist tab ───────────────────────────────────────────────── */}
      {tab === 'web' && (
        <div>
          <div className="mb-6 bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-5">
            <p className="text-[#E8E8E8] text-sm font-semibold mb-1">Web Specialist / Acquisition Playbook</p>
            <p className="text-[#505050] text-xs leading-relaxed">
              For specialists who audit business websites, identify leads with poor or missing web presence, and pitch website builds + AI upgrades. Focus: audit → qualify → document → hand off for close.
            </p>
          </div>
          <PlaybookRole goals={WEB_GOALS} process={WEB_PROCESS} scripts={WEB_SCRIPTS} />
        </div>
      )}

      {/* ── Niches tab ───────────────────────────────────────────────────────── */}
      {tab === 'niches' && (
        <div className="space-y-3">
          {NICHES.map(({ num, name, sub, pain, hook, find, color }) => (
            <div key={num} className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-bold tabular-nums" style={{ color }}>{num}</span>
                <div>
                  <p className="text-[#E8E8E8] text-sm font-semibold leading-none">{name}</p>
                  <p className="text-[#404040] text-[11px] mt-0.5">{sub}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-[#353535] mb-1.5">Pain Point</p>
                  <p className="text-[13px] text-[#808080] leading-relaxed">{pain}</p>
                </div>
                <div className="h-px bg-[#141414]" />
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-[#353535] mb-1.5">Your Hook</p>
                  <p className="text-[13px] italic leading-relaxed" style={{ color }}>{hook}</p>
                </div>
                <div className="h-px bg-[#141414]" />
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-[#353535] mb-1.5">Where to Find Them</p>
                  <p className="text-[13px] text-[#606060] leading-relaxed">{find}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
