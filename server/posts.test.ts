import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * 创建无认证的公开上下文（无登录用户）
 */
function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Posts Router - Public Access (No Login Required)", () => {
  describe("posts.create - 无登录创建文章", () => {
    it("应该成功创建新文章（无需登录）", async () => {
      const caller = appRouter.createCaller(createPublicContext());

      const result = await caller.posts.create({
        title: "我的第一篇文章",
        content: "# 欢迎\n\n这是一篇测试文章。",
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe("我的第一篇文章");
      expect(result.content).toBe("# 欢迎\n\n这是一篇测试文章。");
      expect(result.slug).toBeDefined();
      // slug 由 nanoid 生成，包含标题 + nanoid 后缀
      expect(result.slug).toMatch(/^[a-zA-Z0-9_-]+$/);
      expect(result.userId).toBe(1); // 默认用户 ID
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it("应该为每篇文章生成唯一的 slug", async () => {
      const caller = appRouter.createCaller(createPublicContext());

      const result1 = await caller.posts.create({
        title: "测试文章",
        content: "内容 1",
      });

      const result2 = await caller.posts.create({
        title: "测试文章",
        content: "内容 2",
      });

      expect(result1.slug).not.toBe(result2.slug);
      // 两个 slug 都应该是有效格式
      expect(result1.slug).toMatch(/^[a-zA-Z0-9_-]+$/);
      expect(result2.slug).toMatch(/^[a-zA-Z0-9_-]+$/);
    });

    it("应该拒绝空标题", async () => {
      const caller = appRouter.createCaller(createPublicContext());

      try {
        await caller.posts.create({
          title: "",
          content: "内容",
        });
        expect.fail("应该抛出错误");
      } catch (error: any) {
        expect(error.message).toContain("Title is required");
      }
    });

    it("应该接受空内容", async () => {
      const caller = appRouter.createCaller(createPublicContext());

      const result = await caller.posts.create({
        title: "标题",
        content: "",
      });

      expect(result.title).toBe("标题");
      expect(result.content).toBe("");
    });
  });

  describe("posts.list - 获取所有文章", () => {
    it("应该返回所有已发布的文章（无需登录）", async () => {
      const caller = appRouter.createCaller(createPublicContext());

      // 创建几篇文章
      const post1 = await caller.posts.create({
        title: "公开文章 1",
        content: "内容 1",
      });

      const post2 = await caller.posts.create({
        title: "公开文章 2",
        content: "内容 2",
      });

      const result = await caller.posts.list();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);

      // 检查返回的文章包含我们创建的
      const titles = result.map((p) => p.title);
      expect(titles).toContain("公开文章 1");
      expect(titles).toContain("公开文章 2");
    });

    it("应该按最新修改时间排序", async () => {
      const caller = appRouter.createCaller(createPublicContext());

      const post1 = await caller.posts.create({
        title: "旧文章",
        content: "内容",
      });

      // 等待一小段时间
      await new Promise((resolve) => setTimeout(resolve, 100));

      const post2 = await caller.posts.create({
        title: "新文章",
        content: "内容",
      });

      const result = await caller.posts.list();

      // 新文章应该在前面
      const newPostIndex = result.findIndex((p) => p.id === post2.id);
      const oldPostIndex = result.findIndex((p) => p.id === post1.id);

      expect(newPostIndex).toBeLessThan(oldPostIndex);
    });
  });

  describe("posts.getBySlug - 获取公开文章", () => {
    it("应该通过 slug 获取文章（无需登录）", async () => {
      const caller = appRouter.createCaller(createPublicContext());

      const created = await caller.posts.create({
        title: "公开文章",
        content: "这是一篇公开文章",
      });

      const result = await caller.posts.getBySlug({
        slug: created.slug,
      });

      expect(result).toBeDefined();
      expect(result?.title).toBe("公开文章");
      expect(result?.content).toBe("这是一篇公开文章");
      expect(result?.slug).toBe(created.slug);
    });

    it("应该返回 undefined 对于不存在的 slug", async () => {
      const caller = appRouter.createCaller(createPublicContext());

      const result = await caller.posts.getBySlug({
        slug: "不存在的-slug-12345",
      });

      expect(result).toBeUndefined();
    });
  });

  describe("posts.update - 无登录更新文章", () => {
    it("应该成功更新文章标题和内容", async () => {
      const caller = appRouter.createCaller(createPublicContext());

      const created = await caller.posts.create({
        title: "原始标题",
        content: "原始内容",
      });

      // 等待确保时间戳不同
      await new Promise((resolve) => setTimeout(resolve, 100));

      const updated = await caller.posts.update({
        id: created.id,
        title: "更新后的标题",
        content: "更新后的内容",
      });

      expect(updated.id).toBe(created.id);
      expect(updated.title).toBe("更新后的标题");
      expect(updated.content).toBe("更新后的内容");
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        created.updatedAt.getTime()
      );
    });

    it("应该只更新提供的字段", async () => {
      const caller = appRouter.createCaller(createPublicContext());

      const created = await caller.posts.create({
        title: "原始标题",
        content: "原始内容",
      });

      const updated = await caller.posts.update({
        id: created.id,
        title: "新标题",
      });

      expect(updated.title).toBe("新标题");
      expect(updated.content).toBe("原始内容"); // 内容应该保持不变
    });

    it("应该更新 updatedAt 时间戳", async () => {
      const caller = appRouter.createCaller(createPublicContext());

      const created = await caller.posts.create({
        title: "文章",
        content: "内容",
      });

      const originalUpdatedAt = created.updatedAt.getTime();

      // 等待一小段时间
      await new Promise((resolve) => setTimeout(resolve, 100));

      const updated = await caller.posts.update({
        id: created.id,
        title: "更新的文章",
      });

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt);
    });
  });

  describe("posts.delete - 无登录删除文章", () => {
    it("应该成功删除文章", async () => {
      const caller = appRouter.createCaller(createPublicContext());

      const created = await caller.posts.create({
        title: "要删除的文章",
        content: "内容",
      });

      const result = await caller.posts.delete({
        id: created.id,
      });

      expect(result.success).toBe(true);

      // 验证文章已被删除
      const deleted = await caller.posts.getBySlug({
        slug: created.slug,
      });

      expect(deleted).toBeUndefined();
    });

    it("应该返回成功状态即使文章不存在", async () => {
      const caller = appRouter.createCaller(createPublicContext());

      const result = await caller.posts.delete({
        id: 99999,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("完整工作流 - 创建、编辑、删除", () => {
    it("应该完成完整的发布工作流（无需登录）", async () => {
      const caller = appRouter.createCaller(createPublicContext());

      // 1. 创建文章
      const created = await caller.posts.create({
        title: "我的博客",
        content: "# 欢迎\n\n这是我的第一篇博客。",
      });

      expect(created.id).toBeDefined();
      expect(created.slug).toBeDefined();

      // 2. 通过 slug 获取公开文章
      const fetched = await caller.posts.getBySlug({
        slug: created.slug,
      });

      expect(fetched).toBeDefined();
      expect(fetched?.title).toBe("我的博客");

      // 3. 编辑文章
      const updated = await caller.posts.update({
        id: created.id,
        content: "# 欢迎\n\n这是我更新后的博客。",
      });

      expect(updated.content).toContain("更新后");

      // 4. 验证更新
      const refetched = await caller.posts.getBySlug({
        slug: created.slug,
      });

      expect(refetched?.content).toContain("更新后");

      // 5. 删除文章
      const deleted = await caller.posts.delete({
        id: created.id,
      });

      expect(deleted.success).toBe(true);

      // 6. 验证文章已删除
      const notFound = await caller.posts.getBySlug({
        slug: created.slug,
      });

      expect(notFound).toBeUndefined();
    });

    it("应该支持多个用户同时发布文章（所有用户共享 ID）", async () => {
      const caller = appRouter.createCaller(createPublicContext());

      // 模拟多个用户发布文章
      const post1 = await caller.posts.create({
        title: "用户 1 的文章",
        content: "内容 1",
      });

      const post2 = await caller.posts.create({
        title: "用户 2 的文章",
        content: "内容 2",
      });

      const post3 = await caller.posts.create({
        title: "用户 3 的文章",
        content: "内容 3",
      });

      // 获取所有文章
      const allPosts = await caller.posts.list();

      expect(allPosts.length).toBeGreaterThanOrEqual(3);

      const titles = allPosts.map((p) => p.title);
      expect(titles).toContain("用户 1 的文章");
      expect(titles).toContain("用户 2 的文章");
      expect(titles).toContain("用户 3 的文章");

      // 所有文章应该有相同的 userId（都是 1）
      const userIds = [post1.userId, post2.userId, post3.userId];
      expect(userIds).toEqual([1, 1, 1]);
    });

    it("应该支持 Markdown 内容", async () => {
      const caller = appRouter.createCaller(createPublicContext());

      const markdownContent = `# 标题
## 副标题
**加粗文本**
*斜体文本*
- 列表项 1
- 列表项 2
\`\`\`
代码块
\`\`\`
`;

      const created = await caller.posts.create({
        title: "Markdown 测试",
        content: markdownContent,
      });

      const fetched = await caller.posts.getBySlug({
        slug: created.slug,
      });

      expect(fetched?.content).toBe(markdownContent);
    });
  });
});
