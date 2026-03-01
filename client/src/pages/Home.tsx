import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface Post {
  id: number;
  title: string;
  content: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  userId: number;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"list" | "editor">("list");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 获取所有文章
  const { data: allPosts, refetch } = trpc.posts.list.useQuery();

  useEffect(() => {
    if (allPosts) {
      setPosts(allPosts);
    }
  }, [allPosts]);

  // 更新预览
  useEffect(() => {
    setPreview(parseMarkdown(content));
  }, [content]);

  const parseMarkdown = (md: string) => {
    let html = md;
    // 简单的 Markdown 转换
    html = html.replace(/^### (.*?)$/gm, "<h3 class='text-lg font-bold mt-4'>$1</h3>");
    html = html.replace(/^## (.*?)$/gm, "<h2 class='text-xl font-bold mt-4'>$1</h2>");
    html = html.replace(/^# (.*?)$/gm, "<h1 class='text-2xl font-bold mt-4'>$1</h1>");
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
    html = html.replace(/`(.*?)`/g, "<code class='bg-gray-100 px-1 rounded'>$1</code>");
    html = html.replace(/\n/g, "<br />");
    return html;
  };

  // 创建文章
  const createMutation = trpc.posts.create.useMutation({
    onSuccess: (newPost) => {
      setShareLink(`${window.location.origin}/post/${newPost.slug}`);
      setTitle("");
      setContent("");
      setEditingId(null);
      setActiveTab("list");
      refetch();
    },
  });

  // 更新文章
  const updateMutation = trpc.posts.update.useMutation({
    onSuccess: () => {
      setTitle("");
      setContent("");
      setEditingId(null);
      setActiveTab("list");
      refetch();
    },
  });

  // 删除文章
  const deleteMutation = trpc.posts.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handlePublish = async () => {
    if (!title.trim()) {
      alert("请输入文章标题");
      return;
    }

    setIsLoading(true);
    try {
      if (editingId) {
        // 更新文章
        await updateMutation.mutateAsync({
          id: editingId,
          title,
          content,
        });
      } else {
        // 创建新文章
        await createMutation.mutateAsync({
          title,
          content,
        });
      }
    } catch (error) {
      console.error("Failed to publish post:", error);
      alert("发布失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这篇文章吗？")) return;

    try {
      await deleteMutation.mutateAsync({ id });
    } catch (error) {
      console.error("Failed to delete post:", error);
      alert("删除失败，请重试");
    }
  };

  const handleEdit = (post: Post) => {
    setTitle(post.title);
    setContent(post.content);
    setEditingId(post.id);
    setActiveTab("editor");
  };

  const handleNewPost = () => {
    setTitle("");
    setContent("");
    setEditingId(null);
    setActiveTab("editor");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">ManusBlog</h1>
            <p className="text-gray-500 text-sm mt-1">极简博客发布工具</p>
          </div>
          <Button
            onClick={handleNewPost}
            className="bg-black text-white hover:bg-gray-800"
          >
            <Plus className="w-4 h-4 mr-2" />
            新文章
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* 分享弹窗 */}
        {shareLink && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">文章已发布！</h2>
              <p className="text-gray-600 mb-4">
                您可以分享这个链接让朋友查看您的文章：
              </p>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded bg-gray-50"
                />
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(shareLink);
                    alert("已复制到剪贴板");
                  }}
                  variant="outline"
                >
                  复制
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const text = `我在 ManusBlog 上发布了新文章：${shareLink}`;
                    navigator.share?.({
                      title: "ManusBlog",
                      text,
                      url: shareLink,
                    });
                  }}
                  className="flex-1 bg-blue-500 text-white hover:bg-blue-600"
                >
                  分享
                </Button>
                <Button
                  onClick={() => setShareLink(null)}
                  variant="outline"
                  className="flex-1"
                >
                  完成
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 标签页 */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("list")}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === "list"
                ? "text-black border-b-2 border-black"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            文章列表
          </button>
          <button
            onClick={() => setActiveTab("editor")}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === "editor"
                ? "text-black border-b-2 border-black"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {editingId ? "编辑文章" : "新建文章"}
          </button>
        </div>

        {/* 文章列表 */}
        {activeTab === "list" && (
          <div className="space-y-3">
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">还没有文章</p>
                <Button
                  onClick={handleNewPost}
                  className="bg-black text-white hover:bg-gray-800"
                >
                  创建第一篇文章
                </Button>
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="border border-gray-200 rounded p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{post.title}</h3>
                      <p className="text-gray-500 text-sm mt-1">
                        最后修改：{new Date(post.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleEdit(post)}
                        variant="ghost"
                        size="sm"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(post.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 编辑器 */}
        {activeTab === "editor" && (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="输入文章标题..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-2xl font-bold border-b border-gray-200 pb-3 focus:outline-none"
            />

            <div className="grid grid-cols-2 gap-4 h-96">
              {/* 编辑器 */}
              <textarea
                placeholder="使用 Markdown 格式写作..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="border border-gray-200 rounded p-4 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 resize-none"
              />

              {/* 预览 */}
              <div className="border border-gray-200 rounded p-4 bg-gray-50 overflow-auto">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: preview }}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => setActiveTab("list")}
                variant="outline"
              >
                取消
              </Button>
              <Button
                onClick={handlePublish}
                disabled={isLoading}
                className="bg-black text-white hover:bg-gray-800"
              >
                {isLoading ? "发布中..." : "发布"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
