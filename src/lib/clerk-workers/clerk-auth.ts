// src/lib/clerk-auth.ts
import { createClerkClient } from "@clerk/backend";

// Inisialisasi Clerk client
export const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY || "",
});

/**
 * Mengautentikasi request menggunakan Clerk
 * @param request Request dari Cloudflare Workers atau Next.js
 * @returns Auth object dengan userId dan session data
 */
export async function authenticateRequest(request: Request) {
  try {
    // Teruskan request langsung ke clerkClient.authenticateRequest
    const requestState = await clerkClient.authenticateRequest(request);

    // Convert to Auth object
    return requestState.toAuth();
  } catch (error) {
    console.error("Error authenticating request:", error);
    return null;
  }
}

/**
 * Mendapatkan userId dari request yang diautentikasi
 * @param request Request dari Cloudflare Workers atau Next.js
 * @returns userId jika user terautentikasi, null jika tidak
 */
export async function getUserId(request: Request): Promise<string | null> {
  const auth = await authenticateRequest(request);
  return auth?.userId || null;
}
