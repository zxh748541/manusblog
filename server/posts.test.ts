import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("posts router", () => {
  describe("create", () => {
    it("should create a post with title and content", async () => {
      const ctx = createAuthContext(10001);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.posts.create({
        title: "My First Post",
        content: "# Hello World\n\nThis is my first post.",
      });

      expect(result).toBeDefined();
      expect(result.title).toBe("My First Post");
      expect(result.content).toBe("# Hello World\n\nThis is my first post.");
      expect(result.userId).toBe(ctx.user.id);
      expect(result.slug).toBeDefined();
      expect(result.slug).toContain("my-first-post");
    });

    it("should generate unique slugs for posts with same title", async () => {
      const ctx = createAuthContext(10002);
      const caller = appRouter.createCaller(ctx);

      const post1 = await caller.posts.create({
        title: "Test Post",
        content: "Content 1",
      });

      const post2 = await caller.posts.create({
        title: "Test Post",
        content: "Content 2",
      });

      expect(post1.slug).not.toBe(post2.slug);
      expect(post1.slug).toContain("test-post");
      expect(post2.slug).toContain("test-post");
    });

    it("should fail if title is empty", async () => {
      const ctx = createAuthContext(10003);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.posts.create({
          title: "",
          content: "Some content",
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toContain("Title is required");
      }
    });
  });

  describe("list", () => {
    it("should return empty list for new user", async () => {
      const ctx = createAuthContext(10004);
      const caller = appRouter.createCaller(ctx);

      const posts = await caller.posts.list();
      expect(posts).toEqual([]);
    });

    it("should return user's posts ordered by most recent", async () => {
      const ctx = createAuthContext(10005);
      const caller = appRouter.createCaller(ctx);

      const post1 = await caller.posts.create({
        title: "First Post",
        content: "Content 1",
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const post2 = await caller.posts.create({
        title: "Second Post",
        content: "Content 2",
      });

      const posts = await caller.posts.list();

      expect(posts.length).toBe(2);
      expect(posts[0].id).toBe(post2.id);
      expect(posts[1].id).toBe(post1.id);
    });
  });

  describe("getBySlug", () => {
    it("should retrieve a post by slug", async () => {
      const ctx = createAuthContext(10006);
      const caller = appRouter.createCaller(ctx);

      const created = await caller.posts.create({
        title: "Public Post",
        content: "This is public",
      });

      const retrieved = await caller.posts.getBySlug({
        slug: created.slug,
      });

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.title).toBe("Public Post");
    });

    it("should return undefined for non-existent slug", async () => {
      const caller = appRouter.createCaller(createAuthContext(10007));

      const result = await caller.posts.getBySlug({
        slug: "non-existent-post-xyz",
      });

      expect(result).toBeUndefined();
    });
  });

  describe("delete", () => {
    it("should delete a post", async () => {
      const ctx = createAuthContext(10008);
      const caller = appRouter.createCaller(ctx);

      const post = await caller.posts.create({
        title: "To Delete",
        content: "This will be deleted",
      });

      const result = await caller.posts.delete({ id: post.id });
      expect(result.success).toBe(true);

      const posts = await caller.posts.list();
      expect(posts.find((p) => p.id === post.id)).toBeUndefined();
    });
  });

  describe("update", () => {
    it("should update a post's title and content", async () => {
      const ctx = createAuthContext(10009);
      const caller = appRouter.createCaller(ctx);

      const post = await caller.posts.create({
        title: "Original Title",
        content: "Original content",
      });

      const updated = await caller.posts.update({
        id: post.id,
        title: "Updated Title",
        content: "Updated content",
      });

      expect(updated.title).toBe("Updated Title");
      expect(updated.content).toBe("Updated content");
    });
  });
});
