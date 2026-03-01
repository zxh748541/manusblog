import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { useState } from "react";

export default function PostList() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { data: posts, isLoading, refetch } = trpc.posts.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const deleteMutation = trpc.posts.delete.useMutation({
    onSuccess: () => refetch(),
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            ManusBlog
          </h1>
          <p className="text-slate-600 mb-6">
            一个极简的个人博客发布工具
          </p>
          <Button
            onClick={() => setLocation("/login")}
            className="bg-slate-900 text-white hover:bg-slate-800"
          >
            登录开始写作
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-slate-200">
        <div className="container max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                ManusBlog
              </h1>
              <p className="text-slate-600 mt-2">
                欢迎, {user?.name || "创作者"}
              </p>
            </div>
            <Button
              onClick={() => setLocation("/editor")}
              className="bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-2"
            >
              <Plus size={20} />
              新文章
            </Button>
          </div>
        </div>
      </div>

      {/* Posts List */}
      <div className="container max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">加载中...</p>
          </div>
        ) : !posts || posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600 mb-4">还没有文章，开始创作吧！</p>
            <Button
              onClick={() => setLocation("/editor")}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              创建第一篇文章
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => setLocation(`/editor/${post.id}`)}
                >
                  <h3 className="text-lg font-semibold text-slate-900">
                    {post.title || "无标题"}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    最后修改: {new Date(post.updatedAt).toLocaleDateString("zh-CN")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation(`/editor/${post.id}`)}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    <Edit2 size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("确定要删除这篇文章吗？")) {
                        deleteMutation.mutate({ id: post.id });
                      }
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
