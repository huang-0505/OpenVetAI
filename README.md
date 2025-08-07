# Data Ingestion Portal

A modern, role‑aware document ingestion system for AI training pipelines. Built with Next.js App Router, Supabase, Clerk, Tailwind, and shadcn/ui. It supports secure uploads, automated labeling, duplicate detection, an admin review workflow, and a comprehensive data quality dashboard (admin‑only).
<img width="1301" height="692" alt="image" src="https://github.com/user-attachments/assets/a1e01daa-dbd6-4ced-80f2-0220e4038091" />


## Table of Contents

- Features
- Tech Stack
- Quick Start
  - Prerequisites
  - Environment Variables
  - Install and Run
- Database Setup
- How It Works
  - Upload Flow
  - Automated Labeling
  - Duplicate Detection
  - Admin Review
  - Data Quality Scoring
  - Role‑Based Access (Admin vs. User)
- Configuration
- Deployment
- Customization
- Roadmap
- Troubleshooting
- License

---

## Features

- Secure file uploads with progress and error handling
- Automated labeling for document types such as journal, textbook, blog, clinical guideline, etc.
- Advanced duplicate detection (filename, fuzzy name, and content similarity)
- Admin review workflow: approve or reject pending files
- Admin‑only Data Quality dashboard with metrics and recommendations
- User‑friendly labels editor with AI‑suggested categories
- Clerk authentication and admin gating via environment variable
- Supabase storage for processed documents and metadata

## Tech Stack

- Next.js (App Router, RSC, TypeScript)
- Tailwind CSS + shadcn/ui
- Supabase (Postgres + JS client)
- Clerk (authentication)
- Lucide Icons

Optionally, you can integrate the AI SDK to call LLMs for richer extraction or labeling workflows. [^1]

---

## Quick Start

### Prerequisites

- Node.js 18+ (or Bun 1.1+)
- A Supabase project (Database + anon key)
- A Clerk application (Publishable and Secret keys)
- A Vercel account (recommended for deployment)

### Environment Variables

Create a `.env.local` file in the project root and populate the following:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_************************
CLERK_SECRET_KEY=sk_test_************************

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# Admin controls
NEXT_PUBLIC_ADMIN_EMAIL=admin@example.com
```

Notes:
- The admin is determined at runtime by comparing the signed‑in user's email to `NEXT_PUBLIC_ADMIN_EMAIL`.
- Keep your Clerk secret safe; never commit `.env.local`.

### Install and Run

```bash
# install dependencies
npm install
# or
pnpm install
# or
bun install

# start dev server
npm run dev
# open http://localhost:3000
```

Sign in with Clerk. If your email matches `NEXT_PUBLIC_ADMIN_EMAIL`, you'll see admin features.

---

## Database Setup

This app expects a `processed_data` table in your Supabase database. If your repo includes the SQL in the `scripts/` directory, run those; otherwise, here is a minimal schema you can apply in the Supabase SQL Editor:

```sql
create table if not exists public.processed_data (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'document',
  source text not null default 'file-upload',
  original_content text not null,
  processed_content jsonb not null,
  extracted_data jsonb not null,
  labels text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  user_id text,
  uploaded_by text,
  quality_score int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_processed_data_status on public.processed_data (status);
create index if not exists idx_processed_data_name on public.processed_data (lower(name));
```

Recommended: enable RLS and add policies to allow reads only to admins and the uploading user. Adjust to your security needs.

---

## How It Works

### Upload Flow

1. User drags & drops or selects files.
2. The app reads the file contents (client‑side text read for .txt; PDF/DOC parsing can be added).
3. Duplicate detection runs against existing database rows (see below).
4. Automated labeling runs and merges with any user‑supplied labels.
5. An AI processing step generates a summary, key points, and metadata placeholder.
6. The record is inserted into `processed_data` with status `pending`.

Files appear in Admin Review immediately for admins. Non‑admins do not see file status or quality dashboards.

### Automated Labeling

The module `lib/auto-labeling.ts`:
- Scans filename and content for domain‑specific keywords.
- Computes confidence per category (journal, research paper, case study, textbook, clinical guideline, blog post, news article, wiki, and veterinary specializations).
- Selects high‑confidence labels and a primary `documentType`.
- Computes a quality score based on content length, label diversity, academic indicators, and structure.

You can extend the keyword patterns to match your domain, or swap in an LLM call via the AI SDK for improved classification. [^1]

### Duplicate Detection

The module `lib/duplicate-detection.ts` uses a layered approach:
- Exact filename match (fast path)
- Fuzzy filename comparison (normalized, punctuation‑insensitive)
- Content similarity using a Jaccard overlap of word sets on the first N KB of text
- Phrase‑level comparison for structural similarity

If a duplicate is detected, the upload is blocked and the user sees an error banner.

### Admin Review

The Admin Review tab lists all `pending` files. Admins can:
- Inspect metadata, summary, key points, labels, and content preview
- Approve (status → `approved`) or reject (status → `rejected`)

All status changes are persisted to Supabase and immediately reflected in the UI.

### Data Quality Scoring

The Data Quality dashboard (admin‑only) aggregates:
- Quality distributions (Excellent/Good/Fair/Poor)
- Label coverage
- Type and source distributions
- Recent uploads and duplicate risk
- Readiness score combining content quality, label coverage, and approvals

It also surfaces actionable recommendations to improve dataset quality.

### Role‑Based Access (Admin vs. User)

- Regular users: Upload experience only. They cannot see File Status or Data Quality tabs.
- Admin users (email == `NEXT_PUBLIC_ADMIN_EMAIL`): See Admin Review, File Status, and Data Quality.

---

## Configuration

- Admin email: set `NEXT_PUBLIC_ADMIN_EMAIL`
- Label patterns: edit `lib/auto-labeling.ts`
- Duplicate thresholds: edit `lib/duplicate-detection.ts` (e.g., content sample size, similarity cutoffs)
- UI theme: Tailwind classes and shadcn/ui components
- File type support: update the `accept` attribute in the file input and add parsers for PDF/DOC as needed

---

## Deployment

Vercel is recommended:
1. Push this repository to GitHub
2. Import the project in Vercel
3. Add the environment variables in Vercel Project Settings
4. Deploy

Supabase and Clerk should be set to production projects/instances. Verify that RLS and policies meet your security needs.

---

## Customization

- Replace the placeholder AI processing with your own extraction pipeline
- Add PDF and Word parsing via a server route or edge function
- Integrate vector search or embeddings for semantic deduplication
- Add audit logs for approvals/rejections
- Extend labels with domain‑specific ontologies

For LLM‑powered steps (summarization, labeling, extraction), you can wire in the AI SDK and your preferred model provider. [^1]

---


## Troubleshooting

- "I don't see admin features": ensure your signed‑in email matches `NEXT_PUBLIC_ADMIN_EMAIL`
- "Duplicate detected unexpectedly": relax thresholds in `lib/duplicate-detection.ts`
- "No data quality metrics": you need approved documents to populate certain charts
- "Supabase errors": verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## License

MIT — see `LICENSE` file if provided.

---

## Acknowledgements

- Next.js, Tailwind, shadcn/ui, Supabase, Clerk
- Optional AI flows powered by the AI SDK (see docs). [^1]
```

[^1]: https://sdk.vercel.ai
