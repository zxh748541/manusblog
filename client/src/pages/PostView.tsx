import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Copy, Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";

const md = new MarkdownIt({
  html: true,
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }
    return "";
  },
});

// 演示文章数据
const DEMO_POSTS = [
  {
    id: 101,
    title: "演示文章：欢迎体验新版首页",
    content: "你现在看到的是演示数据，可以直接体验阅读、编辑入口和删除交互。",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    slug: "demo-welcome",
  },
  {
    id: 102,
    title: "演示文章：登录后可编辑",
    content: "点击\"切换为已登录\"，你会看到编辑和删除按钮立即出现。",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    slug: "demo-auth-edit",
  },
];

export default function PostView() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/post/:slug");
  const slug = params?.slug || "";

  // 检查是否是演示模式的文章
  const isDemoPost = slug?.startsWith("demo-");
  const demoPost = isDemoPost ? DEMO_POSTS.find((p) => p.slug === slug) : null;

  const { data: post, isLoading, error } = trpc.posts.getBySlug.useQuery(
    { slug },
    { enabled: !!slug && !isDemoPost }
  );

  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share && displayPost) {
      navigator.share({
        title: displayPost.title,
        url: window.location.href,
      });
    }
  };

  // 使用演示文章或真实文章
  const displayPost = (demoPost || post) as any;
  const isLoaded = isDemoPost || !isLoading;
  const hasError = isDemoPost ? false : error;

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-600">加载中...</p>
      </div>
    );
  }

  if (hasError || !displayPost) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <p className="text-slate-600 mb-4">文章未找到</p>
        <Button
          onClick={() => setLocation("/")}
          className="bg-slate-900 text-white hover:bg-slate-800"
        >
          返回首页
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 sticky top-0 z-10 bg-white">
        <div className="container max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              className="text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    复制链接
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="flex items-center gap-2"
              >
                <Share2 size={16} />
                分享
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <article className="container max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            {displayPost.title}
          </h1>
          <p className="text-slate-500 text-sm">
            发布于 {new Date(displayPost.createdAt).toLocaleDateString("zh-CN")}
            {displayPost.updatedAt !== displayPost.createdAt && (
              <>
                {" "}
                · 更新于 {new Date(displayPost.updatedAt).toLocaleDateString("zh-CN")}
              </>
            )}
          </p>
        </header>

        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: md.render(displayPost.content) }}
        />
      </article>

      {/* Footer */}
      <div className="border-t border-slate-200 mt-12">
        <div className="container max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-slate-600 text-sm">
            <p>
              这是一篇通过{" "}
              <a
                href="/"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                ManusBlog
              </a>{" "}
              发布的文章
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
