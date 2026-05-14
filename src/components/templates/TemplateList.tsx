"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TEMPLATE_CATEGORIES } from "@/lib/templates/templateDefaults";
import { extractVariablesFromTemplate, TEMPLATE_VARIABLES } from "@/lib/templates/templateEngine";
import { EmptyState } from "@/components/ui/empty-state";

export interface TemplateListItem {
  id: string;
  name: string;
  subject: string | null;
  body: string;
  category: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateListProps {
  templates: TemplateListItem[];
  onSelect: (id: string) => void;
  selectedId?: string;
  search: string;
  onSearchChange: (search: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
}

function getVariablesBadgeCount(subject: string | null, body: string): number {
  return extractVariablesFromTemplate(subject, body).length;
}

function getCategoryLabel(category: string | null): string {
  if (!category) return "Custom";
  const found = TEMPLATE_CATEGORIES.find((c) => c.value === category);
  return found ? found.label : category;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function TemplateList({
  templates,
  onSelect,
  selectedId,
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
}: TemplateListProps) {
  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search templates..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryFilterChange(e.target.value)}
          aria-label="Filter by category"
          className="rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {TEMPLATE_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          message={search || categoryFilter ? "No templates match your filters" : "No templates yet"}
          description={
            search || categoryFilter
              ? "Try adjusting your search or filters."
              : "Create your first email template to get started."
          }
        />
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template.id)}
              className={cn(
                "w-full text-left rounded-lg border p-4 transition-colors",
                selectedId === template.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {highlightMatch(template.name, search)}
                    </h3>
                    {template.isDefault && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Default
                      </span>
                    )}
                  </div>
                  {template.subject && (
                    <p className="mt-1 text-xs text-gray-500 truncate">
                      {highlightMatch(template.subject, search)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  {template.category && (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                      {getCategoryLabel(template.category)}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {getVariablesBadgeCount(template.subject, template.body)} variables
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
