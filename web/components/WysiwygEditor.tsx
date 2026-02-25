"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { useCallback, useEffect, useRef, useState } from "react";

// 원본 HTML 속성을 보존하는 커스텀 테이블 확장
const CustomTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
      border: {
        default: null,
        parseHTML: (element) => element.getAttribute("border"),
        renderHTML: (attributes) => {
          if (!attributes.border) return {};
          return { border: attributes.border };
        },
      },
      cellpadding: {
        default: null,
        parseHTML: (element) => element.getAttribute("cellpadding"),
        renderHTML: (attributes) => {
          if (!attributes.cellpadding) return {};
          return { cellpadding: attributes.cellpadding };
        },
      },
      cellspacing: {
        default: null,
        parseHTML: (element) => element.getAttribute("cellspacing"),
        renderHTML: (attributes) => {
          if (!attributes.cellspacing) return {};
          return { cellspacing: attributes.cellspacing };
        },
      },
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width"),
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
    };
  },
});

const CustomTableRow = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
    };
  },
});

const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width"),
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
      colspan: {
        default: null,
        parseHTML: (element) => element.getAttribute("colspan"),
        renderHTML: (attributes) => {
          if (!attributes.colspan) return {};
          return { colspan: attributes.colspan };
        },
      },
      rowspan: {
        default: null,
        parseHTML: (element) => element.getAttribute("rowspan"),
        renderHTML: (attributes) => {
          if (!attributes.rowspan) return {};
          return { rowspan: attributes.rowspan };
        },
      },
      valign: {
        default: null,
        parseHTML: (element) => element.getAttribute("valign"),
        renderHTML: (attributes) => {
          if (!attributes.valign) return {};
          return { valign: attributes.valign };
        },
      },
      align: {
        default: null,
        parseHTML: (element) => element.getAttribute("align"),
        renderHTML: (attributes) => {
          if (!attributes.align) return {};
          return { align: attributes.align };
        },
      },
      bgcolor: {
        default: null,
        parseHTML: (element) => element.getAttribute("bgcolor"),
        renderHTML: (attributes) => {
          if (!attributes.bgcolor) return {};
          return { bgcolor: attributes.bgcolor };
        },
      },
    };
  },
});

const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width"),
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
      colspan: {
        default: null,
        parseHTML: (element) => element.getAttribute("colspan"),
        renderHTML: (attributes) => {
          if (!attributes.colspan) return {};
          return { colspan: attributes.colspan };
        },
      },
      rowspan: {
        default: null,
        parseHTML: (element) => element.getAttribute("rowspan"),
        renderHTML: (attributes) => {
          if (!attributes.rowspan) return {};
          return { rowspan: attributes.rowspan };
        },
      },
    };
  },
});

type WysiwygEditorProps = {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onImageUpload?: () => void;
};

// 툴바 버튼 컴포넌트
function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded-lg transition ${
        isActive
          ? "bg-slate-900 text-white"
          : "text-slate-600 hover:bg-slate-100"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

// 툴바 구분선
function ToolbarDivider() {
  return <div className="w-px h-6 bg-slate-200 mx-1" />;
}

// 메인 툴바
function Toolbar({
  editor,
  onImageUpload,
  isHtmlMode,
  onToggleHtmlMode,
}: {
  editor: Editor | null;
  onImageUpload?: () => void;
  isHtmlMode: boolean;
  onToggleHtmlMode: () => void;
}) {
  const addYoutubeVideo = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("YouTube URL을 입력하세요:");
    if (url) {
      editor.commands.setYoutubeVideo({ src: url });
    }
  }, [editor]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("링크 URL을 입력하세요:", previousUrl);

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImageUrl = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("이미지 URL을 입력하세요:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor && !isHtmlMode) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-200 bg-slate-50 rounded-t-xl">
      {/* WYSIWYG 모드일 때만 편집 버튼 표시 */}
      {!isHtmlMode && editor && (
        <>
          {/* 텍스트 스타일 */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            title="굵게 (Ctrl+B)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            title="기울임 (Ctrl+I)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4m-2 0l-4 16m0 0h4" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive("underline")}
            title="밑줄 (Ctrl+U)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v7a5 5 0 0010 0V4M5 20h14" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive("strike")}
            title="취소선"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v4m0 4v8M4 12h16" />
            </svg>
          </ToolbarButton>

          <ToolbarDivider />

          {/* 제목 */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive("heading", { level: 1 })}
            title="제목 1 (H1)"
          >
            <span className="text-sm font-bold">H1</span>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive("heading", { level: 2 })}
            title="제목 2 (H2)"
          >
            <span className="text-sm font-bold">H2</span>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive("heading", { level: 3 })}
            title="제목 3 (H3)"
          >
            <span className="text-sm font-bold">H3</span>
          </ToolbarButton>

          <ToolbarDivider />

          {/* 리스트 */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            title="글머리 기호"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              <circle cx="2" cy="6" r="1" fill="currentColor" />
              <circle cx="2" cy="12" r="1" fill="currentColor" />
              <circle cx="2" cy="18" r="1" fill="currentColor" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            title="번호 매기기"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h13M7 12h13M7 18h13" />
              <text x="1" y="8" fontSize="6" fill="currentColor">1</text>
              <text x="1" y="14" fontSize="6" fill="currentColor">2</text>
              <text x="1" y="20" fontSize="6" fill="currentColor">3</text>
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive("blockquote")}
            title="인용구"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
            </svg>
          </ToolbarButton>

          <ToolbarDivider />

          {/* 정렬 */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            isActive={editor.isActive({ textAlign: "left" })}
            title="왼쪽 정렬"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h14" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            isActive={editor.isActive({ textAlign: "center" })}
            title="가운데 정렬"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M5 18h14" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            isActive={editor.isActive({ textAlign: "right" })}
            title="오른쪽 정렬"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M6 18h14" />
            </svg>
          </ToolbarButton>

          <ToolbarDivider />

          {/* 링크 & 미디어 */}
          <ToolbarButton
            onClick={addLink}
            isActive={editor.isActive("link")}
            title="링크 추가"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </ToolbarButton>

          {onImageUpload && (
            <ToolbarButton onClick={onImageUpload} title="이미지 업로드">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </ToolbarButton>
          )}

          <ToolbarButton onClick={addImageUrl} title="이미지 URL">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
            </svg>
          </ToolbarButton>

          <ToolbarButton onClick={addYoutubeVideo} title="YouTube 영상">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </ToolbarButton>

          <ToolbarDivider />

          {/* 실행 취소 / 다시 실행 */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="실행 취소 (Ctrl+Z)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="다시 실행 (Ctrl+Y)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
            </svg>
          </ToolbarButton>

          <ToolbarDivider />
        </>
      )}

      {/* HTML 모드 라벨 */}
      {isHtmlMode && (
        <span className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded">
          HTML 소스 편집 모드
        </span>
      )}

      {/* HTML 소스 보기 토글 */}
      <ToolbarButton
        onClick={onToggleHtmlMode}
        isActive={isHtmlMode}
        title={isHtmlMode ? "에디터 보기" : "HTML 소스 보기"}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </ToolbarButton>
    </div>
  );
}

// 복잡한 HTML인지 감지 (테이블 중첩, 인라인 스타일 많음 등)
function isComplexHtml(html: string): boolean {
  if (!html) return false;

  // 테이블이 포함된 경우
  const hasTable = /<table[\s>]/i.test(html);

  // 인라인 스타일이 많은 경우
  const styleCount = (html.match(/style\s*=/gi) || []).length;

  // 중첩 테이블 감지
  const tableCount = (html.match(/<table[\s>]/gi) || []).length;

  // 복잡한 HTML로 판단하는 조건
  return hasTable && (styleCount > 5 || tableCount > 1);
}

export function WysiwygEditor({
  content,
  onChange,
  placeholder = "내용을 입력하세요...",
  onImageUpload,
}: WysiwygEditorProps) {
  // 복잡한 HTML이면 자동으로 HTML 모드로 시작
  const [isHtmlMode, setIsHtmlMode] = useState(() => isComplexHtml(content));
  const [htmlSource, setHtmlSource] = useState(content);

  // 내부 업데이트인지 외부 업데이트인지 추적
  const isInternalUpdate = useRef(false);
  const initialContentSet = useRef(false);

  const editor = useEditor({
    immediatelyRender: false, // SSR 하이드레이션 오류 방지
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        link: false,
        underline: false,
      }),
      Underline,
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg max-w-full h-auto my-4",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline hover:text-blue-800",
        },
      }),
      Youtube.configure({
        width: 640,
        height: 360,
        HTMLAttributes: {
          class: "rounded-lg my-4 mx-auto",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      // 커스텀 테이블 확장 사용 - 원본 HTML 속성 보존
      CustomTable.configure({
        resizable: false, // 리사이즈 비활성화하여 원본 스타일 유지
      }),
      CustomTableRow,
      CustomTableHeader,
      CustomTableCell,
    ],
    content: isHtmlMode ? "" : (content || ""), // HTML 모드면 빈 콘텐츠로 시작
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none min-h-[300px] p-4 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true;
      onChange(editor.getHTML());
    },
    onCreate: ({ editor }) => {
      // HTML 모드일 경우 에디터에 콘텐츠 설정하지 않음
      if (isHtmlMode) {
        initialContentSet.current = true;
        return;
      }

      // 에디터가 생성되면 초기 콘텐츠 설정
      if (content && !initialContentSet.current) {
        try {
          editor.commands.setContent(content);
          initialContentSet.current = true;
        } catch (error) {
          console.error("초기 콘텐츠 설정 중 오류:", error);
          // 에러 발생 시 HTML 모드로 전환
          setIsHtmlMode(true);
        }
      }
    },
  });

  // 외부에서 content가 변경되면 에디터 내용 업데이트
  useEffect(() => {
    if (!editor) return;

    // HTML 모드인 경우 에디터 업데이트 무시
    if (isHtmlMode) return;

    // 내부 업데이트(타이핑)인 경우 무시
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    // 에디터가 준비되었고 content가 변경된 경우
    const currentContent = editor.getHTML();
    const isEmpty = currentContent === "<p></p>" || currentContent === "";

    // 콘텐츠가 비어있거나 외부에서 새로운 콘텐츠가 들어온 경우
    if (content && (isEmpty || content !== currentContent)) {
      try {
        editor.commands.setContent(content);
      } catch (error) {
        console.error("콘텐츠 업데이트 중 오류:", error);
        // 에러 발생 시 HTML 모드로 전환
        setIsHtmlMode(true);
        setHtmlSource(content);
      }
    }
  }, [content, editor, isHtmlMode]);

  // 이미지 삽입 함수를 외부에서 호출 가능하도록 설정
  const insertImage = useCallback(
    (url: string) => {
      if (editor) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    },
    [editor]
  );

  // window 객체에 insertImage 함수 노출 (미디어 업로드 후 삽입용)
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as typeof window & { insertEditorImage?: (url: string) => void }).insertEditorImage = insertImage;
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as typeof window & { insertEditorImage?: (url: string) => void }).insertEditorImage;
      }
    };
  }, [insertImage]);

  // content prop이 변경되면 htmlSource도 업데이트
  useEffect(() => {
    setHtmlSource(content);
  }, [content]);

  // HTML 모드 토글
  const handleToggleHtmlMode = useCallback(() => {
    if (isHtmlMode) {
      // HTML 모드에서 에디터 모드로 전환: HTML 소스를 에디터에 적용
      if (editor) {
        try {
          editor.commands.setContent(htmlSource);
          onChange(htmlSource);
          setIsHtmlMode(false);
        } catch (error) {
          console.error("HTML을 에디터에 적용하는 중 오류 발생:", error);
          alert("이 HTML은 WYSIWYG 에디터에서 지원하지 않는 형식입니다. HTML 소스 모드에서 편집해주세요.");
          // HTML 모드 유지
        }
      }
    } else {
      // 에디터 모드에서 HTML 모드로 전환: 현재 에디터 내용을 HTML 소스로
      if (editor) {
        setHtmlSource(editor.getHTML());
      }
      setIsHtmlMode(true);
    }
  }, [isHtmlMode, htmlSource, editor, onChange]);

  // HTML 소스 변경 핸들러
  const handleHtmlSourceChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newHtml = e.target.value;
    setHtmlSource(newHtml);
    onChange(newHtml);
  }, [onChange]);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <Toolbar
        editor={editor}
        onImageUpload={onImageUpload}
        isHtmlMode={isHtmlMode}
        onToggleHtmlMode={handleToggleHtmlMode}
      />
      {isHtmlMode ? (
        <textarea
          value={htmlSource}
          onChange={handleHtmlSourceChange}
          className="w-full min-h-[300px] p-4 font-mono text-sm text-slate-800 bg-slate-50 focus:outline-none resize-none"
          placeholder="HTML 코드를 입력하세요..."
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}

// 에디터 스타일 (글로벌 CSS에 추가해야 함)
export const editorStyles = `
  .ProseMirror {
    min-height: 300px;
    padding: 1rem;
  }

  .ProseMirror:focus {
    outline: none;
  }

  .ProseMirror p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    color: #9ca3af;
    pointer-events: none;
    height: 0;
  }

  .ProseMirror h1 {
    font-size: 2rem;
    font-weight: 700;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
  }

  .ProseMirror h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-top: 1.25rem;
    margin-bottom: 0.5rem;
  }

  .ProseMirror h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }

  .ProseMirror p {
    margin-bottom: 0.75rem;
    line-height: 1.75;
  }

  .ProseMirror ul,
  .ProseMirror ol {
    padding-left: 1.5rem;
    margin-bottom: 0.75rem;
  }

  .ProseMirror li {
    margin-bottom: 0.25rem;
  }

  .ProseMirror blockquote {
    border-left: 4px solid #e2e8f0;
    padding-left: 1rem;
    font-style: italic;
    color: #64748b;
    margin: 1rem 0;
  }

  .ProseMirror img {
    max-width: 100%;
    height: auto;
    border-radius: 0.5rem;
    margin: 1rem 0;
  }

  .ProseMirror iframe {
    max-width: 100%;
    border-radius: 0.5rem;
    margin: 1rem auto;
    display: block;
  }

  .ProseMirror a {
    color: #2563eb;
    text-decoration: underline;
  }

  .ProseMirror a:hover {
    color: #1d4ed8;
  }

  .ProseMirror hr {
    border: none;
    border-top: 2px solid #e2e8f0;
    margin: 1.5rem 0;
  }

  .ProseMirror code {
    background-color: #f1f5f9;
    border-radius: 0.25rem;
    padding: 0.125rem 0.25rem;
    font-family: monospace;
    font-size: 0.875rem;
  }

  .ProseMirror pre {
    background-color: #1e293b;
    color: #e2e8f0;
    border-radius: 0.5rem;
    padding: 1rem;
    overflow-x: auto;
    margin: 1rem 0;
  }

  .ProseMirror pre code {
    background: none;
    padding: 0;
    color: inherit;
  }

  /* 테이블 스타일 */
  .ProseMirror table {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
    overflow: hidden;
    table-layout: fixed;
  }

  .ProseMirror table td,
  .ProseMirror table th {
    border: 1px solid #e2e8f0;
    padding: 0.5rem 0.75rem;
    vertical-align: top;
    box-sizing: border-box;
    position: relative;
  }

  .ProseMirror table th {
    background-color: #f8fafc;
    font-weight: 600;
    text-align: left;
  }

  .ProseMirror table .selectedCell:after {
    z-index: 2;
    position: absolute;
    content: "";
    left: 0; right: 0; top: 0; bottom: 0;
    background: rgba(59, 130, 246, 0.2);
    pointer-events: none;
  }

  .ProseMirror table .column-resize-handle {
    position: absolute;
    right: -2px;
    top: 0;
    bottom: -2px;
    width: 4px;
    background-color: #3b82f6;
    pointer-events: none;
  }

  .ProseMirror.resize-cursor {
    cursor: col-resize;
  }
`;
