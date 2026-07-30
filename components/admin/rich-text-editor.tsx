'use client';

import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link2,
  Undo2,
  Redo2,
  RemoveFormatting,
  Heading2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TEXT_COLORS = [
  { label: 'Default', value: '' },
  { label: 'Slate', value: '#334155' },
  { label: 'Sky', value: '#0284c7' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Rose', value: '#e11d48' },
  { label: 'Violet', value: '#7c3aed' },
  { label: 'Navy', value: '#1a2238' },
  { label: 'Gold', value: '#9A7B2F' },
] as const;

const EDITOR_CONTENT_CLASS = cn(
  'rte-content max-w-none px-3.5 py-3 focus:outline-none',
  'text-[15px] leading-7 text-slate-700',
  '[&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5',
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
  '[&_h2]:my-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900',
  '[&_h3]:my-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-900',
  '[&_a]:text-sky-700 [&_a]:underline',
  '[&_strong]:font-semibold [&_em]:italic [&_u]:underline'
);

export function isRichTextEmpty(html: string | null | undefined): boolean {
  if (!html) return true;
  const text = html
    .replace(/<br\s*\/?>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .trim();
  return text.length === 0;
}

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
  id?: string;
};

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors',
        'hover:bg-sky-50 hover:text-sky-800 disabled:pointer-events-none disabled:opacity-40',
        active && 'bg-sky-100 text-sky-800'
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write your message…',
  minHeight = 160,
  className,
  id,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          style: 'color:#0284c7;text-decoration:underline;',
        },
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        id: id || '',
        class: EDITOR_CONTENT_CLASS,
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || '';
    if (isRichTextEmpty(current) && isRichTextEmpty(next)) return;
    if (current === next) return;
    editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, value]);

  if (!editor) {
    return (
      <div
        className={cn('rounded-2xl border border-slate-200 bg-slate-50/40', className)}
        style={{ minHeight: minHeight + 48 }}
      />
    );
  }

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', previous || 'https://');
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100/50 focus-within:ring-2 focus-within:ring-sky-200',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200/80 bg-slate-50/80 px-2 py-1.5">
        <ToolbarButton
          title="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-slate-200" />

        <ToolbarButton
          title="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Insert link" active={editor.isActive('link')} onClick={setLink}>
          <Link2 className="h-3.5 w-3.5" />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-slate-200" />

        <div className="flex items-center gap-1 px-1">
          <span className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">
            Color
          </span>
          <div className="flex items-center gap-1">
            {TEXT_COLORS.map((color) => (
              <button
                key={color.label}
                type="button"
                title={color.label}
                aria-label={`Text color ${color.label}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (!color.value) {
                    editor.chain().focus().unsetColor().run();
                    return;
                  }
                  editor.chain().focus().setColor(color.value).run();
                }}
                className={cn(
                  'h-5 w-5 rounded-full border border-white shadow-sm ring-1 ring-slate-200 transition-transform hover:scale-110',
                  !color.value && 'bg-[conic-gradient(from_90deg,#94a3b8,#e2e8f0,#94a3b8)]',
                  color.value &&
                    editor.isActive('textStyle', { color: color.value }) &&
                    'ring-2 ring-sky-400 ring-offset-1',
                  !color.value &&
                    !editor.getAttributes('textStyle').color &&
                    'ring-2 ring-sky-400 ring-offset-1'
                )}
                style={color.value ? { backgroundColor: color.value } : undefined}
              />
            ))}
          </div>
        </div>

        <span className="mx-1 h-5 w-px bg-slate-200" />

        <ToolbarButton
          title="Clear formatting"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        >
          <RemoveFormatting className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Redo"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      <div className="relative bg-slate-50/30">
        {editor.isEmpty ? (
          <p className="pointer-events-none absolute top-3 left-3.5 text-sm text-slate-400">
            {placeholder}
          </p>
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

/** Render admin-authored HTML in the reading pane. */
export function RichHtml({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  if (isRichTextEmpty(html)) return null;
  return (
    <div
      className={cn(EDITOR_CONTENT_CLASS, 'px-0 py-0', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
