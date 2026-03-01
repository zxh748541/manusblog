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
  }),
});

export type AppRouter = typeof appRouter;
