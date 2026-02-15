# treehacks2026
# BusinessBuddy

All-in-one app for service-based small businesses!
Built for TreeHacks 2026.  

Creator: aw03

---

## Overview

BusinessBuddy is a business management platform designed for service-based small businesses such as hairstylists, braiders, nail techs, barbers, electricians, and other appointment and service-driven entrepreneurs.

Many of these businesses struggle with:

- Decentralized booking (DMs, texts, spreadsheets)
- Poor inventory tracking
- Limited insight into profitability
- Manual scheduling and client management
- No analytics on service trends or operational costs

BusinessBuddy centralizes scheduling, inventory tracking, and AI-powered business insights into one platform.

---

## Core Features

### Scheduling & Appointments
- Create and manage services
- Log appointments
- Track booking trends
- Monitor revenue

### Inventory Tracking (AI support)
- Chat informally to describe what materials were used. ex "i used around half of the jar of red nail polish"
- Estimate product usage
- Track supply depletion
- Improve restocking decisions

### AI Business Insights
- Summarize trends in appointments
- Identify most profitable services
- Highlight peak and slow periods
- Suggest pricing or operational adjustments

### Analytics Dashboard
- Revenue trends
- Service popularity
- Operational summaries

---

## Tech Stack

### Frontend
- Next.js

### Backend
- Next.js API routes
- Node.js

### Database
- PostgreSQL
- Prisma ORM

### AI & APIs
- Claude Agent SDK (Anthropic) for analytics and summarization
- Poke API for trend summarization/chatbot features

### Deployment
- Vercel

---

## Dependencies

- next
- react
- react-dom
- typescript
- tailwindcss
- prisma
- @prisma/client
- pg
- @anthropic-ai/sdk
- dotenv

Environment variables:

DATABASE_URL=
ANTHROPIC_API_KEY=

---

## Setup

1. Clone the repository

git clone <repo-url>  
cd beauty-biz-app  

2. Install dependencies

npm install  

3. Configure environment variables in `.env`

4. Run database migrations

npx prisma migrate dev  

5. Start the development server

npm run dev  

---

## Hackathon Context

This project was built during TreeHacks 2026 as a fast MVP to explore how AI can empower small service-based businesses with operational intelligence typically reserved for larger companies.

---

## Future Improvements

- Payment integration (Stripe)
- SMS reminders
- Predictive demand forecasting
- Expense tracking
- Native mobile app
