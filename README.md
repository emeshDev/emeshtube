# 🎬 YouTube Clone

A modern, serverless YouTube clone built with cutting-edge technologies. This project demonstrates how to create a full-featured video streaming platform using a serverless architecture.

## 🚀 Tech Stack

### Core Framework

- **[Next.js 15](https://nextjs.org/)**: The React framework for building modern web applications with server-side rendering, static site generation, and the new App Router.

### Video Processing & Streaming

- **[Mux](https://mux.com/)**: A powerful API-first platform for video streaming, processing, and analytics.
- **[Uploadthing](https://uploadthing.com/)**: Modern file uploading solution for handling custom video thumbnails.

### Database

- **[Neon](https://neon.tech/)**: Serverless Postgres database with automatic scaling and branching capabilities.
- **[Drizzle ORM](https://orm.drizzle.team/)**: TypeScript-first ORM optimized for type safety and developer experience.

### Authentication

- **[Clerk](https://clerk.com/)**: Complete user management and authentication solution with support for multiple sign-in methods.

### API Layer

- **[tRPC](https://trpc.io/)**: End-to-end typesafe APIs made easy, eliminating the need for traditional REST or GraphQL.
- **[TanStack Query](https://tanstack.com/query/latest)** (formerly React Query): Data fetching and state management for tRPC calls.

### AI & Background Processing

- **[OpenAI](https://openai.com/)**: Leveraging GPT models to automatically generate SEO-friendly video titles from video transcripts.
- **[Upstash QStash](https://upstash.com/qstash)**: Serverless message queue and scheduler for handling asynchronous tasks and scheduled cache invalidation.

### Real-time Updates & Caching

- **[Pusher](https://pusher.com/)**: Real-time event broadcasting for instant UI updates.
- **[Upstash Redis](https://upstash.com/redis)**: Serverless Redis for efficient caching of trending videos and other data.

## ✨ Features

- 📹 Video uploading, processing, and streaming
- 🔍 Video discovery and search
- 👤 User profiles and channels
- 💬 Comments and interactions
- 👍 Likes and subscriptions
- 📱 Responsive design for all devices
- 🔐 Secure authentication and authorization
- 🤖 AI-powered title generation from video subtitles
- ⚙️ Asynchronous background processing for long-running tasks
- 📊 Trending videos with automatic cache invalidation
- 🔄 Real-time UI updates when videos are deleted

## 🏗️ Architecture Overview

This project follows a serverless architecture pattern:

1. **Frontend**: Next.js 15 App Router for server components and client interactions
2. **API Layer**: tRPC with TanStack Query for type-safe API endpoints and data management
3. **Authentication**: Clerk for user management and auth flows
4. **Database**: Neon serverless Postgres with Drizzle ORM for data modeling
5. **Video Processing**: Mux for video transcoding, delivery, and streaming
6. **File Uploads**: Uploadthing for handling custom thumbnail uploads
7. **AI Integration**: OpenAI for generating video titles from subtitle content
8. **Background Processing**: QStash for handling asynchronous tasks and scheduled cache invalidation
9. **Real-time Updates**: Pusher for broadcasting events to connected clients
10. **Caching**: Upstash Redis for high-performance caching of trending videos

## 🔧 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Mux account
- Clerk account
- Uploadthing account
- Neon Postgres database
- OpenAI API key
- Upstash account (for QStash and Redis)
- Pusher account

### Environment Variables

Create a `.env.local` file with the following:

```env
# Base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
INTERNAL_API_KEY=your_internal_api_key

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
CLERK_SIGNING_SECRET=your_clerk_signing_secret

# Database
DATABASE_URL=your_neon_database_url

# Upstash Redis
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

# Mux
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret
MUX_WEBHOOK_SECRET=your_mux_webhook_secret

# Uploadthing
UPLOADTHING_TOKEN=your_uploadthing_token

# QStash
QSTASH_URL=your_qstash_url
QSTASH_TOKEN=your_qstash_token
QSTASH_CURRENT_SIGNING_KEY=your_qstash_current_signing_key
QSTASH_NEXT_SIGNING_KEY=your_qstash_next_signing_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Pusher
PUSHER_APP_ID=your_pusher_app_id
PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
PUSHER_CLUSTER=your_pusher_cluster
NEXT_PUBLIC_PUSHER_KEY=your_public_pusher_key
NEXT_PUBLIC_PUSHER_CLUSTER=your_public_pusher_cluster
```

### Installation

```bash
# Install dependencies
npm install

# Setup database with Drizzle
npm run db:push

# Run development server
npm run dev
```

### Setting Up QSTASH Scheduler

The application uses QStash to schedule automatic cache invalidation for trending videos. To set up the scheduler:

1. Make sure all environment variables related to QStash are properly configured:

**QSTASH_TOKEN**
**QSTASH_CURRENT_SIGNING_KEY**
**QSTASH_NEXT_SIGNING_KEY**

2. Start your development server:

```bash
npm run dev
```

3. Initialize the schedules by making a POST request to the trending schedules endpoint:

```bash
# Using curl
curl -X POST http://localhost:3000/api/admin/trending-schedules \
  -H "x-api-key: your_internal_api_key"
```

# Or use an API client like Postman or Insomnia

Verify that the schedules were created:

```bash
# Using curl
curl http://localhost:3000/api/admin/trending-schedules \
 -H "Authorization: Bearer your_clerk_jwt_token"
```

# Or navigate to /admin/trending-schedules in the application (if you have an admin UI)

_The scheduler will create three schedules:_

- Daily cache invalidation: Runs every day at 00:05 (5 minutes past midnight)
- Weekly cache invalidation: Runs every Monday at 00:10
- All ranges cache invalidation: Runs every 6 hours

**These schedules will automatically clear trending video caches to ensure that trending data stays fresh.**

## 📂 Project Structure

```
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/              # API routes
│   │   │   ├── webhooks/     # Webhook endpoints for Mux and QStash
│   │   │   └── admin/        # Admin API endpoints
│   ├── components/           # Shared React components
│   ├── lib/                  # Utility functions
│   │   ├── redis.ts          # Redis client configuration
│   │   ├── scheduler.ts      # QStash scheduler setup
│   │   └── mux.ts            # Mux client configuration
│   ├── trpc/                 # tRPC configuration and setup
│   ├── db/                   # Drizzle configuration and schema
│   ├── modules/              # Feature modules
│   │   ├── videos/           # Video-related features
│   │   ├── trending/         # Trending videos features
│   │   ├── users/            # User-related features
│   │   └── ...               # Other feature modules
│   ├── hooks/                # Custom React hooks
│   │   └── usePusher.ts      # Hook for Pusher real-time updates
│   └── types/                # TypeScript type definitions
├── public/                   # Static assets
├── drizzle/                  # Drizzle migrations
└── .env.local                # Environment variables
```

## 🧪 Why This Tech Stack?

This serverless tech stack offers several advantages:

- **Scalability**: Automatically scales with user demand
- **Cost-Efficiency**: Pay only for what you use
- **Performance**: Optimized for fast loading and video delivery, Optimized for fast loading and video delivery with Redis caching
- **Developer Experience**: Strong typing and modern tools for rapid development
- **Maintenance**: Reduced DevOps overhead with managed services
- **AI Integration**: Intelligent features powered by state-of-the-art language models
- **Asynchronous Processing**: Background workloads handled efficiently with Upstash Workflow

## 🤖 AI Features

### Automatic Title Generation

The platform automatically extracts subtitles from uploaded videos and uses OpenAI's language models to generate catchy, SEO-friendly titles based on the video content. This process:

1. Extracts video subtitles from Mux auto-generated captions
2. Processes and stores subtitle text in the database
3. Uses Upstash Workflow to handle the asynchronous AI title generation
4. Leverages OpenAI GPT models to create engaging titles
5. Updates the video title automatically

This feature showcases how AI can enhance content creation and reduce manual work for creators.

## 🤖 Key Features Implementation

**Trending Videos Caching and Invalidation**
The platform implements an efficient trending videos system with:

1. Redis-based caching of trending video data for different time ranges (daily, weekly, monthly, all-time)
2. Automatic cache invalidation on a schedule via QStash
3. Immediate cache invalidation when videos are deleted
4. Rate-limiting to prevent abuse of invalidation endpoints

**Real-time UI Updates**
The application provides real-time updates when videos are deleted:

1. Server-side Pusher events are triggered on video deletion
2. Client-side usePusher hook listens for these events
3. UI components automatically filter out deleted videos without requiring page refresh

**Video Processing and Streaming**
The platform uses Mux for reliable video processing:

1. Secure direct uploads to Mux
2. Webhook processing for video asset status updates
3. Automatic deletion of related data when videos are removed
4. Custom thumbnail support via Uploadthing

## 📚 Useful Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Mux API Reference](https://docs.mux.com/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Clerk Documentation](https://clerk.com/docs)
- [tRPC Documentation](https://trpc.io/docs)
- [Neon Documentation](https://neon.tech/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Upstash Redis Documentation](https://upstash.com/docs/redis/overall/getstarted)
- [Upstash Qstash Documentation](https://upstash.com/docs/qstash/overall/getstarted)
- [Upstash Workflow Documentation](https://upstash.com/docs/workflow/basics/context)
- [Pusher Documentation](https://pusher.com/docs/)

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
