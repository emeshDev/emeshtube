import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "../../../../db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const SIGNING_SECRET = process.env.CLERK_SIGNING_SECRET;

  if (!SIGNING_SECRET) {
    throw new Error(
      "Error: Please add SIGNING_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  // Create new Svix instance with secret
  const wh = new Webhook(SIGNING_SECRET);

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error: Missing Svix headers", {
      status: 400,
    });
  }

  // Get body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  let evt: WebhookEvent;

  // Verify payload with headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error: Could not verify webhook:", err);
    return new Response("Error: Verification error", {
      status: 400,
    });
  }

  // Get event type
  const eventType = evt.type;
  console.log(`Processing webhook event: ${eventType}`);

  // Handle user.created event
  if (eventType === "user.created") {
    try {
      const { data } = evt;

      // Validate required data
      if (!data.id) {
        console.error("Missing user ID in user.created event");
        return new Response("Missing User ID", { status: 400 });
      }

      // Extract and validate email
      let email = "";
      if (data.email_addresses && data.email_addresses.length > 0) {
        email = data.email_addresses[0].email_address;
      }

      // Determine user name
      const first_name = data.first_name || email.split("@")[0] || "User";
      const last_name = data.last_name || "";

      // Use default image URL if none provided
      const imageUrl =
        data.image_url ||
        "https://ui-avatars.com/api/?name=" +
          encodeURIComponent(`${first_name} ${last_name}`);

      console.log(
        `Creating user: ${data.id}, Name: ${first_name} ${last_name}`
      );

      const result = await db.insert(users).values({
        clerkId: data.id,
        name: `${first_name} ${last_name}`,
        imageUrl: imageUrl,
      });

      console.log("User created successfully:", result);
    } catch (error) {
      console.error("Error creating user:", error);
      return new Response("Error creating user", { status: 500 });
    }
  }

  // Handle user.deleted event
  if (eventType === "user.deleted") {
    try {
      const { data } = evt;

      if (!data.id) {
        console.error("Missing user ID in user.deleted event");
        return new Response("Missing User ID", { status: 400 });
      }

      console.log(`Deleting user with ID: ${data.id}`);

      const result = await db.delete(users).where(eq(users.clerkId, data.id));
      console.log("User deleted successfully:", result);
    } catch (error) {
      console.error("Error deleting user:", error);
      return new Response("Error deleting user", { status: 500 });
    }
  }

  // Handle user.updated event
  if (eventType === "user.updated") {
    try {
      const { data } = evt;

      // Validate required data
      if (!data.id) {
        console.error("Missing user ID in user.updated event");
        return new Response("Missing User ID", { status: 400 });
      }

      // Extract and validate email
      let email = "";
      if (data.email_addresses && data.email_addresses.length > 0) {
        email = data.email_addresses[0].email_address;
      }

      // Determine user name
      const first_name = data.first_name || email.split("@")[0] || "User";
      const last_name = data.last_name || "";

      // Use default image URL if none provided
      const imageUrl =
        data.image_url ||
        "https://ui-avatars.com/api/?name=" +
          encodeURIComponent(`${first_name} ${last_name}`);

      console.log(
        `Updating user: ${data.id}, Name: ${first_name} ${last_name}`
      );

      const result = await db
        .update(users)
        .set({
          name: `${first_name} ${last_name}`,
          imageUrl: imageUrl,
        })
        .where(eq(users.clerkId, data.id));

      console.log("User updated successfully:", result);
    } catch (error) {
      console.error("Error updating user:", error);
      return new Response("Error updating user", { status: 500 });
    }
  }

  return new Response("Webhook received", { status: 200 });
}
