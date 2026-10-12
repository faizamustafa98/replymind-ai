# ReplyMind AI

**AI-assisted unified inbox for small businesses.**

> Built as a team project during my summer internship at Folio3. Full-stack: Next.js frontend + FastAPI backend.

## Overview

ReplyMind is a human-in-the-loop customer messaging platform for small businesses (1-15 people) that can't afford enterprise helpdesk tools. It brings messages from **WhatsApp Business**, **Email**, and a **website chat widget** into one real-time dashboard.

For every incoming message, an AI pipeline drafts a context-aware reply using the business's own uploaded documents (FAQs, menus, price lists, policies) via **Retrieval-Augmented Generation (RAG)**. The owner reviews the draft and can send it as-is, edit it, or write from scratch. The AI assists, it never replies on its own unless the owner explicitly enables auto-reply.

## The Problem

- Customer messages are scattered across platforms with no unified view
- Slow manual replies cause customers to drop off
- Enterprise tools (Zendesk, Intercom) are priced for teams, not solo owners
- Pure AI chatbots are fast but risky: one wrong reply can damage a business's reputation

ReplyMind sits in the gap: the speed of AI with the judgment of the owner.

## Features

- Unified inbox across WhatsApp Business, Email, and website chat
- RAG pipeline that grounds AI drafts in the business's own documents
- Three-action reply flow: send as-is / edit first / write from scratch
- Shareable chat link for businesses without a website
- Per-customer conversation history for contextual replies
- Opt-in confidence-based auto-reply (off by default)
- Analytics dashboard: message volume, AI acceptance rate, response time
- Multi-tenant architecture with Row Level Security
- Subscription billing with Free, Pro, and Business tiers

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, Tailwind CSS, shadcn/ui |
| Backend API | FastAPI (Python) |
| Database & Auth | Supabase (Postgres, Auth, Realtime, RLS) |
| Vector Search | pgvector |
| AI / RAG | Google Gemini embeddings + LLM-generated drafts |
| Channels | WhatsApp Cloud API, Gmail / Email, Website chat |
| Testing | Playwright (frontend e2e), pytest (backend) |
| Hosting | Netlify (frontend) |

## Architecture

1. Inbound messages from any channel reach a FastAPI webhook receiver, which stores the raw message in Supabase.
2. The RAG pipeline classifies the message, retrieves relevant document chunks via pgvector similarity search, and generates a draft reply.
3. The draft is saved back to Supabase and shown to the owner in real time.
4. The owner's send / edit / ignore action is logged for analytics.
5. Row Level Security at the database layer ensures each business can only access its own data.

## Project Structure

```
replymind-ai/
├── frontend/   # Next.js app (dashboard, inbox, onboarding, landing page)
└── backend/    # FastAPI app (routes, services, repositories, RAG pipeline)
```

## Getting Started

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```


## Pricing Model (Product Design)

| Plan | Price | Includes |
|---|---|---|
| Free | $0/month | 50 conversations/month, website chat only, 1 document |
| Pro | $29/month | Unlimited conversations, all 3 channels, 10 docs, auto-reply, history |
| Business | $79/month | Everything in Pro + multi-staff and Instagram (planned) |

## Team

Team F: Muhammad Ahmad Yar Khan, Emaim Mohsin, Faiza Mustafa, Zayyam Siddiqui
