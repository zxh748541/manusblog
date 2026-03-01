import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Share2, Copy, Check } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";

const md = new MarkdownIt({
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }
    return "";
  },
});

export default function Editor() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/editor/:id");
  const postId = params?.id ? parseInt(params.id) : null;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createMutation = trpc.posts.create.useMutation();
  const updateMutation = trpc.posts.update.useMutation();

  // Update preview when content changes
  useEffect(() => {
    setPreview(md.render(content));
  }, [content]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handlePublish();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [title, content]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-slate-600">请先登录</p>
          <Button
            onClick={() => setLocation("/")}
            className="mt-4 bg-slate-900 text-white hover:bg-slate-800"
          >
            返回
          </Button>
        </div>
      </div>
    );
  }

  const handlePublish = async () => {
    if (!title.trim()) {
      alert("请输入文章标题");
      return;
    }

    setIsSaving(true);
    try {
      if (postId) {
        await updateMutation.mutateAsync({
          id: postId,
          title,
          content,
        });
      } else {
        const newPost = await createMutation.mutateAsync({
          title,
          content,
        });
        setShareLink(
          `${window.location.origin}/post/${newPost.slug}`
        );
      }
    } catch (error) {
      alert("发布失败，请重试");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const insertMarkdown = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || "文本";
    const newContent =
      content.substring(0, start) +
      before +
      selectedText +
      after +
      content.substring(end);

    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 0);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              className="text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft size={20} />
            </Button>

            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => insertMarkdown("# ")}
                className="text-xs"
                title="标题 (H1)"
              >
                H1
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => insertMarkdown("## ")}
                className="text-xs"
                title="标题 (H2)"
              >
                H2
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => insertMarkdown("**", "**")}
                className="text-xs font-bold"
                title="加粗"
              >
                B
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => insertMarkdown("*", "*")}
                className="text-xs italic"
                title="斜体"
              >
                I
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => insertMarkdown("- ")}
                className="text-xs"
                title="列表"
              >
                列表
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => insertMarkdown("```\n", "\n```")}
                className="text-xs font-mono"
                title="代码块"
              >
                Code
              </Button>
            </div>

            <Button
              onClick={handlePublish}
              disabled={isSaving}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              {isSaving ? "发布中..." : "发布"}
            </Button>
          </div>
        </div>
      </div>

      {/* Title Input */}
      <div className="border-b border-slate-200 bg-white">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <input
            type="text"
            placeholder="输入文章标题..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-3xl font-bold text-slate-900 placeholder-slate-400 outline-none"
          />
        </div>
      </div>

      {/* Editor & Preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className="flex-1 border-r border-slate-200 flex flex-col overflow-hidden">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="用 Markdown 格式写作..."
            className="flex-1 w-full p-6 text-base text-slate-900 placeholder-slate-400 outline-none resize-none font-mono"
          />
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto bg-slate-50">
          <div className="p-6 prose prose-sm">
            <div
              dangerouslySetInnerHTML={{ __html: preview }}
              className="text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {shareLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              文章已发布！
            </h2>
            <p className="text-slate-600 mb-4">
              您可以分享这个链接让朋友查看您的文章：
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 px-3 py-2 border border-slate-200 rounded text-sm text-slate-900 bg-slate-50"
              />
              <Button
                onClick={handleCopyLink}
                className="bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check size={18} />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    复制
                  </>
                )}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  // Open share dialog
                  if (navigator.share) {
                    navigator.share({
                      title,
                      url: shareLink,
                    });
                  }
                }}
                className="flex-1 bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Share2 size={18} />
                分享
              </Button>
              <Button
                onClick={() => {
                  setShareLink("");
                  setLocation("/");
                }}
                variant="outline"
                className="flex-1"
              >
                完成
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
