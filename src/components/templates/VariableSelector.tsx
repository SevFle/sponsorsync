"use client";

import { TEMPLATE_VARIABLES } from "@/lib/templates/templateEngine";

interface VariableSelectorProps {
  onInsert: (variableKey: string) => void;
  activeField?: "subject" | "body";
}

export function VariableSelector({ onInsert, activeField = "body" }: VariableSelectorProps) {
  return (
    <div className="rounded-md border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-3 py-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Variables
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Click to insert into {activeField === "subject" ? "subject line" : "email body"}
        </p>
      </div>
      <div className="p-2 max-h-64 overflow-y-auto">
        <div className="space-y-1">
          {TEMPLATE_VARIABLES.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => onInsert(v.key)}
              className="w-full text-left rounded px-2.5 py-1.5 text-sm hover:bg-blue-50 transition-colors group"
              title={v.description}
            >
              <span className="font-mono text-blue-600 group-hover:text-blue-800">
                {`{{${v.key}}}`}
              </span>
              {v.required && (
                <span className="ml-1.5 text-[10px] text-red-400">*</span>
              )}
              <span className="ml-2 text-gray-400 text-xs">{v.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
