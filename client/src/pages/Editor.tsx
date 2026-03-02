import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Share2, Copy, Check, Eye, Edit3, Image, Palette, Type, Save } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";

// 启用 HTML 标签渲染
const md = new MarkdownIt({
  html: true, // 启用 HTML 标签支持
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }
    return "";
  },
});

const AUTOSAVE_KEY = "manusblog_autosave";
const AUTOSAVE_INTERVAL = 5000; // 5 seconds

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
  const [isPreviewMode, setIsPreviewMode] = useState(postId ? true : false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#ef4444");
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showFontSize, setShowFontSize] = useState(false);
  const [selectedFontSize, setSelectedFontSize] = useState("16");
  const [showFontFamily, setShowFontFamily] = useState(false);
  const [selectedFontFamily, setSelectedFontFamily] = useState("sans-serif");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "unsaved">("unsaved");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const createMutation = trpc.posts.create.useMutation();
  const updateMutation = trpc.posts.update.useMutation();
  const uploadImageMutation = trpc.posts.uploadImage.useMutation();
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
    } else {
      // Load autosave draft if creating new post
      const savedDraft = localStorage.getItem(AUTOSAVE_KEY);
      if (savedDraft) {
        try {
          const { title: savedTitle, content: savedContent } = JSON.parse(savedDraft);
          setTitle(savedTitle || "");
          setContent(savedContent || "");
        } catch (e) {
          console.error("Failed to load autosave draft:", e);
        }
      }
    }
  }, [postId, allPosts]);

  // Update preview when content changes
  useEffect(() => {
    setPreview(md.render(content));
  }, [content]);

  // Auto-save functionality
  useEffect(() => {
    if (postId) return; // Don't autosave when editing existing posts

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set unsaved status
    setAutoSaveStatus("unsaved");

    // Set new timer
    autoSaveTimerRef.current = setTimeout(() => {
      if (title || content) {
        try {
          localStorage.setItem(
            AUTOSAVE_KEY,
            JSON.stringify({ title, content, timestamp: Date.now() })
          );
          setAutoSaveStatus("saved");
          // Reset status after 2 seconds
          setTimeout(() => setAutoSaveStatus("unsaved"), 2000);
        } catch (e) {
          console.error("Failed to autosave:", e);
        }
      }
    }, AUTOSAVE_INTERVAL);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [title, content, postId]);

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
        await utils.posts.list.invalidate();
        alert("文章已更新");
      } else {
        const newPost = await createMutation.mutateAsync({
          title,
          content,
        });
        await utils.posts.list.invalidate();
        // Clear autosave after successful publish
        localStorage.removeItem(AUTOSAVE_KEY);
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

  const insertFontSize = (size: string) => {
    const fontSizeMarkdown = `<span style="font-size: ${size}px">文字</span>`;
    insertMarkdown(fontSizeMarkdown);
    setShowFontSize(false);
  };

  const insertFontFamily = (font: string) => {
    const fontFamilyMarkdown = `<span style="font-family: ${font}">文字</span>`;
    insertMarkdown(fontFamilyMarkdown);
    setShowFontFamily(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 创建本地预览 URL
    const localUrl = URL.createObjectURL(file);
    setImageUrl(localUrl);
    setUploadedFile(file);
  };

  const insertImage = async () => {
    if (!uploadedFile) {
      alert("请选择图片");
      return;
    }

    setIsUploadingImage(true);
    try {
      // 将文件转换为 base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64String = event.target?.result as string;
        const base64 = base64String.split(",")[1];
        if (!base64) {
          alert("图片转换失败");
          setIsUploadingImage(false);
          return;
        }

        try {
          // 调用后端 API 上传图片
          const result = await uploadImageMutation.mutateAsync({
            base64,
            filename: uploadedFile.name,
          });

          if (result.success) {
            // 使用云端 URL 插入 Markdown
            const imageMarkdown = `![${imageAlt || "图片"}](${result.url})`;
            insertMarkdown(imageMarkdown);
            setShowImageUpload(false);
            setImageUrl("");
            setImageAlt("");
            setUploadedFile(null);
            alert("图片上传成功！");
          }
        } catch (error) {
          console.error("Upload error:", error);
          alert("图片上传失败，请重试");
        } finally {
          setIsUploadingImage(false);
        }
      };
      reader.readAsDataURL(uploadedFile);
    } catch (error) {
      console.error("Error:", error);
      alert("处理图片失败");
      setIsUploadingImage(false);
    }
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

  const fontSizes = ["12", "14", "16", "18", "20", "24", "28", "32"];

  const fontFamilies = [
    { name: "默认", value: "sans-serif" },
    { name: "宋体", value: "SimSun, serif" },
    { name: "微软雅黑", value: "Microsoft YaHei, sans-serif" },
    { name: "等宽字体", value: "monospace" },
    { name: "Georgia", value: "Georgia, serif" },
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

              {/* 字体大小、字体、颜色、图片按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFontSize(!showFontSize)}
                className="text-xs flex items-center gap-1"
                title="字体大小"
              >
                <Type size={16} />
                大小
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFontFamily(!showFontFamily)}
                className="text-xs flex items-center gap-1"
                title="字体"
              >
                <Type size={16} />
                字体
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
            </div>

            <div className="flex items-center gap-2">
              {!postId && (
                <div className="text-xs text-slate-600 flex items-center gap-1">
                  <Save size={14} />
                  {autoSaveStatus === "saved" && "已保存"}
                  {autoSaveStatus === "saving" && "保存中..."}
                  {autoSaveStatus === "unsaved" && "未保存"}
                </div>
              )}
              <Button
                onClick={handlePublish}
                disabled={isSaving}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                {isSaving ? "发布中..." : "发布"}
              </Button>
            </div>
          </div>

          {/* 字体大小选择器 */}
          {showFontSize && (
            <div className="mt-4 p-4 bg-slate-50 rounded border border-slate-200">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-sm font-medium text-slate-700">选择字体大小：</label>
                {fontSizes.map((size) => (
                  <Button
                    key={size}
                    variant="outline"
                    size="sm"
                    onClick={() => insertFontSize(size)}
                    className="text-xs"
                  >
                    {size}px
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* 字体选择器 */}
          {showFontFamily && (
            <div className="mt-4 p-4 bg-slate-50 rounded border border-slate-200">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-sm font-medium text-slate-700">选择字体：</label>
                {fontFamilies.map((font) => (
                  <Button
                    key={font.value}
                    variant="outline"
                    size="sm"
                    onClick={() => insertFontFamily(font.value)}
                    className="text-xs"
                    style={{ fontFamily: font.value }}
                  >
                    {font.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* 颜色选择器 */}
          {showColorPicker && (
            <div className="mt-4 p-4 bg-slate-50 rounded border border-slate-200">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
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
                  disabled={!imageUrl || isUploadingImage}
                  className="bg-slate-900 text-white hover:bg-slate-800 text-sm"
                >
                  {isUploadingImage ? "上传中..." : "插入"}
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
            <div className="h-full flex items-start justify-center">
              <div className="w-full max-w-2xl px-6 py-8 prose prose-sm max-w-none">
                <div
                  dangerouslySetInnerHTML={{ __html: preview }}
                  className="text-slate-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* Split View */}
        {!isPreviewMode && (
          <div className="flex-1 overflow-auto bg-slate-50">
            <div className="h-full flex items-start justify-center">
              <div className="w-full max-w-2xl px-6 py-8 prose prose-sm max-w-none">
                <div
                  dangerouslySetInnerHTML={{ __html: preview }}
                  className="text-slate-900"
                />
              </div>
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
