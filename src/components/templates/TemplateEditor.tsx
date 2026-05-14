"use client";

import { useState, useCallback, useRef } from "react";
import { TEMPLATE_VARIABLES } from "@/lib/templates/templateEngine";
import { TEMPLATE_CATEGORIES } from "@/lib/templates/templateDefaults";

interface TemplateEditorProps {
  initialData?: {
    name: string;
    subject: string;
    body: string;
    category: string;
  };
  onSave: (data: { name: string; subject: string; body: string; category: string }) => void;
  onCancel: () => void;
  saving?: boolean;
}

export function TemplateEditor({ initialData, onSave, onCancel, saving }: TemplateEditorProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [subject, setSubject] = useState(initialData?.subject ?? "");
  const [body, setBody] = useState(initialData?.body ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "");
  const [showVariableMenu, setShowVariableMenu] = useState(false);
  const [activeField, setActiveField] = useState<"subject" | "body">("body");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = useCallback(
    (variableKey: string) => {
      const varText = `{{${variableKey}}}`;

      if (activeField === "subject") {
        setSubject((prev) => prev + varText);
      } else {
        const textarea = bodyRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const newBody = body.slice(0, start) + varText + body.slice(end);
          setBody(newBody);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + varText.length, start + varText.length);
          }, 0);
        } else {
          setBody((prev) => prev + varText);
        }
      }
      setShowVariableMenu(false);
    },
    [activeField, body]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, subject, body, category });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="template-name" className="block text-sm font-medium text-gray-700 mb-1">
          Template Name
        </label>
        <input
          id="template-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="e.g., Sponsor Outreach Email"
        />
      </div>

      <div>
        <label htmlFor="template-category" className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          id="template-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select a category</option>
          {TEMPLATE_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="template-subject" className="block text-sm font-medium text-gray-700 mb-1">
          Subject Line
        </label>
        <div className="flex gap-2">
          <input
            id="template-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onFocus={() => setActiveField("subject")}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g., Sponsorship Opportunity with {{creator_show}}"
          />
          <button
            type="button"
            onClick={() => {
              setActiveField("subject");
              setShowVariableMenu(!showVariableMenu);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            title="Insert variable"
          >
            {"{{ }}"}
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="template-body" className="block text-sm font-medium text-gray-700">
            Email Body (HTML)
          </label>
          <button
            type="button"
            onClick={() => {
              setActiveField("body");
              setShowVariableMenu(!showVariableMenu);
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Insert Variable
          </button>
        </div>
        {showVariableMenu && (
          <div className="mb-2 rounded-md border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-500 mb-2">Available Variables</p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  className="inline-flex items-center rounded bg-white px-2 py-1 text-xs font-medium text-gray-700 border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  title={v.description}
                >
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
          </div>
        )}
        <textarea
          ref={bodyRef}
          id="template-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={() => setActiveField("body")}
          rows={16}
          required
          className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Write your email HTML here. Use {{variable_name}} to insert dynamic values."
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="inline-flex items-center rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save Template"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
