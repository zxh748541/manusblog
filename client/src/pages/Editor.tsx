import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Share2, Copy, Check, Eye, Edit3, Image, Palette } from "lucide-react";
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
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/editor/:id");
  const postId = params?.id ? parseInt(params.id) : null;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(postId ? true : false); // 编辑时默认预览，新建时默认编辑
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#ef4444");
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createMutation = trpc.posts.create.useMutation();
  const updateMutation = trpc.posts.update.useMutation();
  const { data: allPosts } = trpc.posts.list.useQuery();
  const utils = trpc.useUtils();

  // Load existing post if editing
  useEffect(() => {
    if (postId && allPosts) {
      const post = allPosts.find((p) => p.id === postId);
      if (post) {
        setTitle(post.title);
        setContent(post.content);
      }
    }
  }, [postId, allPosts]);

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
        // 更新列表缓存
        await utils.posts.list.invalidate();
        alert("文章已更新");
      } else {
        const newPost = await createMutation.mutateAsync({
          title,
          content,
        });
        // 更新列表缓存
        await utils.posts.list.invalidate();
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

  const insertColor = () => {
    const colorMarkdown = `<span style="color: ${selectedColor}">文字</span>`;
    insertMarkdown(colorMarkdown);
    setShowColorPicker(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 创建本地预览 URL
    const localUrl = URL.createObjectURL(file);
    setImageUrl(localUrl);
  };

  const insertImage = () => {
    if (!imageUrl) {
      alert("请选择图片");
      return;
    }
    const imageMarkdown = `![${imageAlt || "图片"}](${imageUrl})`;
    insertMarkdown(imageMarkdown);
    setShowImageUpload(false);
    setImageUrl("");
    setImageAlt("");
  };

  const colorPresets = [
    "#ef4444", // 红色
    "#f97316", // 橙色
    "#eab308", // 黄色
    "#22c55e", // 绿色
    "#06b6d4", // 青色
    "#3b82f6", // 蓝色
    "#8b5cf6", // 紫色
    "#ec4899", // 粉色
    "#000000", // 黑色
    "#6b7280", // 灰色
  ];

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
              {/* 切换按钮 */}
              <Button
                variant={isPreviewMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPreviewMode(true)}
                className="text-xs flex items-center gap-1"
                title="切换到预览模式"
              >
                <Eye size={16} />
                预览
              </Button>
              <Button
                variant={!isPreviewMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPreviewMode(false)}
                className="text-xs flex items-center gap-1"
                title="切换到编辑模式"
              >
                <Edit3 size={16} />
                编辑
              </Button>

              <div className="w-px h-6 bg-slate-200" />

              {/* 格式化工具 */}
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

              <div className="w-px h-6 bg-slate-200" />

              {/* 图片和颜色按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImageUpload(!showImageUpload)}
                className="text-xs flex items-center gap-1"
                title="插入图片"
              >
                <Image size={16} />
                图片
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="text-xs flex items-center gap-1"
                title="字体颜色"
              >
                <Palette size={16} />
                颜色
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

          {/* 颜色选择器 */}
          {showColorPicker && (
            <div className="mt-4 p-4 bg-slate-50 rounded border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <label className="text-sm font-medium text-slate-700">选择颜色：</label>
                <div className="flex gap-2 flex-wrap">
                  {colorPresets.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 rounded border-2 transition ${
                        selectedColor === color
                          ? "border-slate-900"
                          : "border-slate-300"
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700">自定义：</label>
                <input
                  type="text"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  placeholder="#ef4444"
                  className="px-3 py-2 border border-slate-200 rounded text-sm"
                />
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <Button
                  onClick={insertColor}
                  className="bg-slate-900 text-white hover:bg-slate-800 text-sm"
                >
                  插入
                </Button>
              </div>
            </div>
          )}

          {/* 图片上传 */}
          {showImageUpload && (
            <div className="mt-4 p-4 bg-slate-50 rounded border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="text-sm"
                >
                  选择图片
                </Button>
                {imageUrl && <span className="text-sm text-slate-600">已选择图片</span>}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700">图片描述：</label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="图片的描述文字"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded text-sm"
                />
                <Button
                  onClick={insertImage}
                  disabled={!imageUrl}
                  className="bg-slate-900 text-white hover:bg-slate-800 text-sm"
                >
                  插入
                </Button>
              </div>
              {imageUrl && (
                <div className="mt-3 p-2 bg-white rounded border border-slate-200">
                  <img
                    src={imageUrl}
                    alt="预览"
                    className="max-w-xs max-h-40 rounded"
                  />
                </div>
              )}
            </div>
          )}
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
        {!isPreviewMode && (
          <div className="flex-1 border-r border-slate-200 flex flex-col overflow-hidden">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="用 Markdown 格式写作..."
              className="flex-1 w-full p-6 text-base text-slate-900 placeholder-slate-400 outline-none resize-none font-mono"
            />
          </div>
        )}

        {/* Preview */}
        {isPreviewMode && (
          <div className="flex-1 overflow-auto bg-slate-50">
            <div className="p-6 prose prose-sm max-w-none">
              <div
                dangerouslySetInnerHTML={{ __html: preview }}
                className="text-slate-900"
              />
            </div>
          </div>
        )}

        {/* Split View */}
        {!isPreviewMode && (
          <div className="flex-1 overflow-auto bg-slate-50">
            <div className="p-6 prose prose-sm max-w-none">
              <div
                dangerouslySetInnerHTML={{ __html: preview }}
                className="text-slate-900"
              />
            </div>
          </div>
        )}
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
