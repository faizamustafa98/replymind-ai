# ReplyMind — AI-Assisted Unified Inbox for Small Businesses

## Overview

ReplyMind is a human-in-the-loop, AI-assisted customer messaging platform 
built for small businesses (1–15 people) that cannot afford enterprise 
helpdesk tools. It consolidates inbound messages from WhatsApp Business, 
Email, and a Website chat widget into a single real-time dashboard. For 
every incoming message, an AI pipeline generates a context-aware draft 
reply using the business's own uploaded documents — FAQs, menus, price 
lists, and policies — via Retrieval-Augmented Generation (RAG). The 
business owner reviews the draft and chooses to send as-is, edit, or 
write from scratch. The AI assists — it never replies autonomously unless 
the owner explicitly enables high-confidence auto-reply.

## Problem Statement

Small business owners managing customer communication across WhatsApp, 
email, and web chat face three compounding problems: messages are scattered 
across platforms with no unified view; manual replies are slow, causing 
customer drop-off to competitors; and enterprise tools like Zendesk and 
Intercom ($74–$150+/agent/month) are priced and designed for teams, not 
solo operators. Pure AI chatbots solve speed but introduce trust risk — 
one wrong automated reply can permanently damage a business's reputation. 
ReplyMind sits in the gap: the speed of AI, with the judgment of the owner.

## Core Features

- Unified inbox across WhatsApp Business API, Email (SendGrid), and 
  Website chat widget (WebSocket)
- RAG pipeline: AI drafts replies grounded in the business's own uploaded 
  documents using OpenAI GPT-4o-mini + text-embedding-3-small
- Three-action reply flow: Send as-is / Edit first / Write from scratch
- Shareable chat link for businesses without a website (drop in Instagram 
  bio or WhatsApp status)
- Per-customer conversation history for contextual follow-up replies
- Confidence-based auto-reply toggle (opt-in, off by default)
- Analytics dashboard: message volume, AI acceptance rate, response time
- Multi-tenant architecture with Row Level Security — each business sees 
  only its own data
- Stripe-powered subscription billing with Free, Pro, and Business tiers

## Tech Stack

| Layer       | Technology                                      |
|-------------|-------------------------------------------------|
| Frontend    | Next.js 14 + Tailwind CSS + shadcn/ui           |
| Backend     | Supabase (Auth, DB, Realtime, RLS, REST APIs)   |
| Webhooks & AI Pipeline | FastAPI (Python)                   |
| Database    | Supabase Postgres + pgvector                    |
| AI / RAG    | OpenAI GPT-4o-mini + text-embedding-3-small     |
| Channels    | Meta Cloud API · SendGrid · WebSocket           |
| Payments    | Stripe Billing + Customer Portal                |
| Hosting     | Vercel (frontend) + Supabase (backend)          |

## Architecture

Inbound messages from any channel hit a FastAPI webhook receiver, which 
writes the raw message to Supabase. The RAG pipeline classifies the 
message, retrieves relevant document chunks via pgvector similarity search, 
and generates a draft reply using GPT-4o-mini. The draft is written back 
to Supabase and surfaced to the owner in real-time via Supabase Realtime. 
The owner's send/edit/ignore action is logged for analytics and model 
confidence tracking. Row Level Security at the database layer guarantees 
tenant data isolation — no application-level guard can be misconfigured 
to leak one business's data to another.

## Scope — What This Project Covers

✅ WhatsApp Business API (Meta Cloud API) inbound message handling  
✅ Email inbound handling via SendGrid inbound parse  
✅ Website chat widget with WebSocket real-time delivery  
✅ RAG pipeline with business-uploaded documents  
✅ Human-in-the-loop reply workflow (send / edit / ignore)  
✅ Confidence-based opt-in auto-reply  
✅ Per-customer conversation history  
✅ Analytics dashboard (volume, AI acceptance rate, response time)  
✅ Stripe subscription billing (Free / Pro / Business tiers)  
✅ Multi-tenant Row Level Security  
✅ Shareable chat link for businesses without a website  

## Out of Scope (MVP)

❌ Instagram DM integration (planned post-MVP — database is channel-agnostic)  
❌ Multi-staff / multi-agent login (database fields reserved, future Business tier)  
❌ Outbound broadcast / WhatsApp newsletters  
❌ CRM features (purchase history, sales pipeline)  
❌ Voice note transcription  
❌ Third-party integrations (Zapier, Shopify, HubSpot)  
❌ SMS or phone call handling  

## Pricing

| Plan       | Price        | Includes                                                  |
|------------|--------------|-----------------------------------------------------------|
| Free       | $0/month     | 50 conversations/month, Website only, 1 document          |
| Pro        | $29/month    | Unlimited conversations, all 3 channels, 10 docs, auto-reply, history |
| Business   | $79/month    | All Pro + multi-staff (future), full analytics, Instagram (future) |

## Project Status

Active development — 7-week sprint.  
Week 1: Architecture, DB schema, WhatsApp verification  
Weeks 2–3: Email + Website channels, RAG pipeline  
Week 4: WhatsApp live integration, real-time inbox, auto-reply toggle  
Week 5: Multi-tenancy, RLS audit, channel settings  
Week 6: Beta with real pilot business  
Week 7: Analytics, Stripe billing, demo polish  

## Team

Team F — Muhammad Ahmad Yar Khan · Emaim Mohsin · Faiza Mustafa · Zayyam Siddiqui
