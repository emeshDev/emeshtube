import { videos } from "@/db/schema";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Create schema for selecting videos
export const selectVideoSchema = createSelectSchema(videos);

// Create schema for inserting videos
export const insertVideoSchema = createInsertSchema(videos);

// Create a custom update schema for the form
export const updateVideoSchema = createSelectSchema(videos, {
  // Override specific fields to customize validation
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  visibility: z.enum(["private", "public"]),
  // Can add more custom validations as needed
}).pick({
  id: true,
  title: true,
  description: true,
  categoryId: true,
  visibility: true,
});

// For custom thumbnail update
export const updateThumbnailSchema = createSelectSchema(videos).pick({
  id: true,
  thumbnailUrl: true,
});

// Type definitions for the schemas
export type SelectVideoSchema = z.infer<typeof selectVideoSchema>;
export type InsertVideoSchema = z.infer<typeof insertVideoSchema>;
export type UpdateVideoSchema = z.infer<typeof updateVideoSchema>;
export type UpdateThumbnailSchema = z.infer<typeof updateThumbnailSchema>;
