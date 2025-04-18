/* eslint-disable */
// src/index.ts - Entry point lengkap untuk Cloudflare Workers
import { Env } from "@cloudflare/workers-types";
import workflowHandler from "./app/api/videos/workflows/workflows";
import trpcHandler from "./app/api/trpc/[trpc]/route-workers";
import uploadThingHandler from "./app/api/uploadthing/route-workers";
import { clerkClient } from "./lib/clerk-workers";

export default {
  // Handler utama untuk semua request ke worker
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // Injeksi environment variables ke global context untuk library yang membutuhkannya
    // (ini diperlukan karena beberapa library mengharapkan process.env yang tidak ada di Workers)
    if (typeof globalThis.process === "undefined") {
      // @ts-ignore
      globalThis.process = { env: {} };
    }

    // Map environment variables dari Cloudflare ke format yang diharapkan libraries
    // @ts-ignore
    globalThis.process.env.CLERK_SECRET_KEY = env.CLERK_SECRET_KEY;
    // @ts-ignore
    globalThis.process.env.UPLOADTHING_SECRET = env.UPLOADTHING_SECRET;
    // @ts-ignore
    globalThis.process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
    // Tambahkan environment variables lain yang diperlukan

    const url = new URL(request.url);
    const path = url.pathname;

    // Rute untuk CORS preflight requests
    if (request.method === "OPTIONS") {
      return handleCors(request);
    }

    // Rute untuk tRPC API
    if (path.startsWith("/api/trpc")) {
      // Tambahkan CORS headers ke response
      const response = await trpcHandler.fetch(request);
      return addCorsHeaders(response);
    }

    // Rute untuk workflow
    if (path.startsWith("/api/workflows")) {
      // Extract workflow name from path (e.g., /api/workflows/title)
      const workflowPath = path.replace("/api/workflows/", "");

      // Modify request to match expected workflow path
      const newRequest = new Request(
        new URL(workflowPath, request.url).toString(),
        request
      );

      const response = await workflowHandler.fetch(newRequest, env, ctx);
      return addCorsHeaders(response);
    }

    // Rute untuk UploadThing
    if (path.startsWith("/api/uploadthing")) {
      const response = await uploadThingHandler.fetch(request, env, ctx);
      return addCorsHeaders(response);
    }

    // Default response untuk path yang tidak dikenali
    return new Response("Not found", { status: 404 });
  },
};

// Helper untuk menangani CORS preflight requests
function handleCors(request: Request): Response {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, x-video-id, x-middleware-rewrite",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// Helper untuk menambahkan CORS headers ke response
function addCorsHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  newHeaders.set("Access-Control-Allow-Origin", "*");
  newHeaders.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  newHeaders.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-video-id, x-middleware-rewrite"
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
