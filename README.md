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
- **[Upstash Workflow & QStash](https://upstash.com/)**: Serverless workflow and message queue for managing asynchronous tasks like AI-powered title generation.

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

## 🏗️ Architecture Overview

This project follows a serverless architecture pattern:

1. **Frontend**: Next.js 15 App Router for server components and client interactions
2. **API Layer**: tRPC with TanStack Query for type-safe API endpoints and data management
3. **Authentication**: Clerk for user management and auth flows
4. **Database**: Neon serverless Postgres with Drizzle ORM for data modeling
5. **Video Processing**: Mux for video transcoding, delivery, and streaming
6. **File Uploads**: Uploadthing for handling custom thumbnail uploads
7. **AI Integration**: OpenAI for generating video titles from subtitle content
8. **Background Processing**: Upstash Workflow for handling long-running AI tasks asynchronously

## 🔧 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Mux account
- Clerk account
- Uploadthing account
- Neon Postgres database
- OpenAI API key
- Upstash account (for QStash and Workflow)

### Environment Variables

Create a `.env.local` file with the following:

```env
# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Mux
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret
MUX_WEBHOOK_SECRET=your_mux_webhook_secret

# Uploadthing
UPLOADTHING_SECRET=your_uploadthing_secret
UPLOADTHING_APP_ID=your_uploadthing_app_id

# Database
DATABASE_URL=your_neon_database_url

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Upstash
QSTASH_TOKEN=your_qstash_token
QSTASH_CURRENT_SIGNING_KEY=your_qstash_current_signing_key
QSTASH_NEXT_SIGNING_KEY=your_qstash_next_signing_key
UPSTASH_WORKFLOW_URL=your_public_app_url
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

## 📂 Project Structure

```
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/              # API routes
│   │   │   └── videos/       # Video-related API endpoints
│   │   │       └── workflows/# Upstash Workflow endpoints
│   ├── components/           # Shared React components
│   ├── lib/                  # Utility functions
│   │   ├── openai.ts         # OpenAI client configuration
│   │   ├── mux-subtitle.ts   # Subtitle processing utilities
│   │   └── workflow.ts       # Upstash Workflow client
│   ├── trpc/                 # tRPC configuration and setup
│   ├── db/                   # Drizzle configuration and schema
│   ├── modules/              # Feature modules
│   │   ├── videos/           # Video-related features
│   │   │   ├── components/   # UI components for videos
│   │   │   └── server/       # tRPC procedures for videos
│   │   ├── users/            # User-related features
│   │   │   ├── components/   # UI components for users
│   │   │   └── server/       # tRPC procedures for users
│   │   └── ...               # Other feature modules
│   └── types/                # TypeScript type definitions
├── public/                   # Static assets
├── drizzle/                  # Drizzle migrations
└── .env.local                # Environment variables
```

## 🧪 Why This Tech Stack?

This serverless tech stack offers several advantages:

- **Scalability**: Automatically scales with user demand
- **Cost-Efficiency**: Pay only for what you use
- **Performance**: Optimized for fast loading and video delivery
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

## 📚 Useful Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Mux API Reference](https://docs.mux.com/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Clerk Documentation](https://clerk.com/docs)
- [tRPC Documentation](https://trpc.io/docs)
- [Neon Documentation](https://neon.tech/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Upstash Workflow Documentation](https://upstash.com/docs/workflow/basics/context)

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
