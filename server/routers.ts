import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getUserPosts,
  getPostBySlug,
  createPost,
  updatePost,
  deletePost,
  getAllPosts,
} from "./db";
import { nanoid } from "nanoid";
import { storagePut } from "./storage";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  posts: router({
    /**
     * Get all posts (public access - no login required)
     */
    list: publicProcedure.query(() => getAllPosts()),

    /**
     * Get a single post by slug (public access)
     */
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(({ input }) => getPostBySlug(input.slug)),

    /**
     * Create a new post (public access - no login required)
     * Uses a default user ID for anonymous posts
     */
    create: publicProcedure
      .input(
        z.object({
          title: z.string().min(1, "Title is required"),
          content: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        // Generate a unique slug from title + random suffix
        const slug = `${input.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")}-${nanoid(6)}`;

        return createPost({
          userId: 1, // Default user ID for anonymous posts
          title: input.title,
          content: input.content,
          slug,
        });
      }),

    /**
     * Update an existing post (public access)
     */
    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1, "Title is required").optional(),
          content: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return updatePost(input.id, {
          title: input.title,
          content: input.content,
        });
      }),

    /**
     * Delete a post (public access)
     */
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deletePost(input.id);
        return { success: true };
      }),

    /**
     * Upload image to cloud storage (public access)
     */
    uploadImage: publicProcedure
      .input(
        z.object({
          base64: z.string(),
          filename: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          // Convert base64 to buffer
          const buffer = Buffer.from(input.base64, "base64");

          // Determine MIME type from filename
          const ext = input.filename.split(".").pop()?.toLowerCase() || "png";
          const mimeTypes: Record<string, string> = {
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            png: "image/png",
            gif: "image/gif",
            webp: "image/webp",
          };
          const mimeType = mimeTypes[ext] || "image/png";

          // Generate unique filename
          const timestamp = Date.now();
          const randomId = nanoid(8);
          const uniqueFilename = `images/${timestamp}-${randomId}.${ext}`;

          // Upload to S3
          const { url } = await storagePut(uniqueFilename, buffer, mimeType);

          return {
            success: true,
            url,
            filename: uniqueFilename,
          };
        } catch (error) {
          console.error("Image upload failed:", error);
          throw new Error("Failed to upload image");
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
