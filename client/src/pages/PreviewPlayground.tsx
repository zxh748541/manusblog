import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";

type DemoPost = {
  id: number;
  title: string;
  content: string;
  updatedAt: string;
  slug: string;
};

const demoPosts: DemoPost[] = [
  {
    id: 1,
    title: "欢迎来到 ManusBlog",
    content: "这是一个可交互的预览页面，你可以直接点按钮体验登录态和编辑入口。",
    updatedAt: new Date().toISOString(),
    slug: "welcome-manusblog",
  },
  {
    id: 2,
    title: "第二篇示例文章",
    content: "这里展示卡片视图、阅读入口、编辑入口和删除按钮的交互逻辑。",
    updatedAt: new Date(Date.now() - 86_400_000).toISOString(),
    slug: "second-demo-post",
  },
];

export default function PreviewPlayground() {
  const [, setLocation] = useLocation();
  const [, paramsA] = useRoute("/preview/:token");
  const [, paramsB] = useRoute("/preview/:token/");
  const token = paramsA?.token || paramsB?.token || "default";

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [posts, setPosts] = useState<DemoPost[]>(demoPosts);

  const latestUpdateText = useMemo(() => {
    if (posts.length === 0) return "暂无文章";
    return new Date(posts[0].updatedAt).toLocaleDateString("zh-CN");
  }, [posts]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="container max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">ManusBlog 交互预览</h1>
              <p className="text-slate-600 mt-2">此页专门用于让你直接操作查看改动效果</p>
              <p className="text-xs text-slate-500 mt-2">预览标识: {token}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setLocation("/")}>返回真实首页</Button>
              <Button variant="outline" onClick={() => setLocation(`/preview/${Date.now()}`)}>生成新的预览 URL</Button>
              <Button onClick={() => setIsLoggedIn(v => !v)}>{isLoggedIn ? "切换为访客" : "切换为已登录"}</Button>
            </div>
          </div>

          <p className="text-sm text-slate-500 mt-4">
            当前模式：{isLoggedIn ? "已登录（可见编辑/删除按钮）" : "访客（仅阅读）"}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">文章总数</p>
              <p className="text-2xl font-semibold text-slate-900 mt-1">{posts.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">最近更新</p>
              <p className="text-2xl font-semibold text-slate-900 mt-1">{latestUpdateText}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map(post => (
            <div key={post.id} className="p-5 border border-slate-200 rounded-xl bg-white hover:shadow-sm transition-shadow">
              <h3 className="text-lg font-semibold text-slate-900 line-clamp-1">{post.title}</h3>
              <p className="text-sm text-slate-500 mt-2 line-clamp-2">{post.content}</p>
              <p className="text-xs text-slate-500 mt-4">最后修改: {new Date(post.updatedAt).toLocaleDateString("zh-CN")}</p>

              <div className="flex items-center justify-between mt-4">
                <Button variant="outline" size="sm" onClick={() => alert(`模拟阅读：/post/${post.slug}`)}>
                  阅读
                </Button>

                {isLoggedIn && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => alert(`模拟编辑：/editor/${post.id}`)}>
                      编辑文章
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setPosts(prev => prev.filter(p => p.id !== post.id))}
                    >
                      删除
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
