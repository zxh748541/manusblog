import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { BookOpen, Edit2, LogIn, LogOut, Plus, Trash2, User2 } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "wouter";

export default function PostList() {
  const [, setLocation] = useLocation();
  const { data: posts, isLoading, refetch } = trpc.posts.list.useQuery();
  const {
    data: currentUser,
    isLoading: isUserLoading,
    refetch: refetchUser,
  } = trpc.auth.me.useQuery();

  const deleteMutation = trpc.posts.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await refetchUser();
    },
  });

  const postCount = posts?.length ?? 0;
  const latestUpdateText = useMemo(() => {
    if (!posts || posts.length === 0) return "暂无文章";
    return new Date(posts[0].updatedAt).toLocaleDateString("zh-CN");
  }, [posts]);

  const goLogin = () => {
    window.location.href = getLoginUrl();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="container max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">ManusBlog</h1>
              <p className="text-slate-600 mt-2">更清爽的写作台，专注内容发布</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {isUserLoading ? (
                <span className="text-sm text-slate-500">用户信息加载中...</span>
              ) : currentUser ? (
                <>
                  <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700">
                    <User2 size={16} />
                    <span>{currentUser.name || currentUser.email || "已登录用户"}</span>
                  </div>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut size={16} />
                    退出登录
                  </Button>
                </>
              ) : (
                <Button onClick={goLogin} className="flex items-center gap-2">
                  <LogIn size={16} />
                  登录
                </Button>
              )}

              <Button
                onClick={() => (currentUser ? setLocation("/editor") : goLogin())}
                className="bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-2"
              >
                <Plus size={20} />
                {currentUser ? "写新文章" : "登录后写文章"}
              </Button>
            </div>
          </div>

          <p className="text-sm text-slate-500 mt-4">
            {currentUser
              ? "已登录：你可以使用每篇文章右下角的「编辑文章」按钮进行修改。"
              : "当前为访客模式：可阅读文章；登录后可创建、编辑和删除文章。"}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">文章总数</p>
              <p className="text-2xl font-semibold text-slate-900 mt-1">{postCount}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">最近更新</p>
              <p className="text-2xl font-semibold text-slate-900 mt-1">{latestUpdateText}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">加载中...</p>
          </div>
        ) : !posts || posts.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-slate-300 bg-white">
            <BookOpen className="mx-auto text-slate-400 mb-3" />
            <p className="text-slate-600 mb-4">还没有文章，开始创作吧！</p>
            <Button
              onClick={() => (currentUser ? setLocation("/editor") : goLogin())}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              创建第一篇文章
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="p-5 border border-slate-200 rounded-xl bg-white hover:shadow-sm transition-shadow"
              >
                <div
                  className="cursor-pointer"
                  onClick={() => setLocation(`/post/${post.slug}`)}
                >
                  <h3 className="text-lg font-semibold text-slate-900 line-clamp-1">
                    {post.title || "无标题"}
                  </h3>
                  <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                    {post.content || "（暂无内容）"}
                  </p>
                </div>
                <p className="text-xs text-slate-500 mt-4">
                  最后修改: {new Date(post.updatedAt).toLocaleDateString("zh-CN")}
                </p>
                <div className="flex items-center justify-between mt-4">
                  <Button variant="outline" size="sm" onClick={() => setLocation(`/post/${post.slug}`)}>
                    阅读
                  </Button>

                  {currentUser && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/editor/${post.id}`)}
                      >
                        编辑文章
                      </Button>
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
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
