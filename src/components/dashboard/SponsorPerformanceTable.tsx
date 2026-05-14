"use client";

import { useState } from "react";

export interface SponsorPerformanceRow {
  sponsorId: string;
  sponsorName: string;
  dealCount: number;
  totalValue: number;
  paidAmount: number;
  pendingAmount: number;
  deliverableCount: number;
  verifiedCount: number;
}

interface SponsorPerformanceTableProps {
  data: SponsorPerformanceRow[];
}

type SortField = "sponsorName" | "totalValue" | "paidAmount" | "dealCount" | "verifiedCount";

export function SponsorPerformanceTable({ data }: SponsorPerformanceTableProps) {
  const [sortField, setSortField] = useState<SortField>("totalValue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const sorted = [...data].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === "asc"
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);

  function toggleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(0);
  }

  function SortHeader({ field, children }: { field: SortField; children: React.ReactNode }) {
    return (
      <th
        className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 hover:text-gray-700"
        onClick={() => toggleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {children}
          {sortField === field && (
            <span className="text-blue-500">{sortDir === "asc" ? "↑" : "↓"}</span>
          )}
        </span>
      </th>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-500">No sponsor performance data</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <SortHeader field="sponsorName">Sponsor</SortHeader>
              <SortHeader field="dealCount">Deals</SortHeader>
              <SortHeader field="totalValue">Total Value</SortHeader>
              <SortHeader field="paidAmount">Paid</SortHeader>
              <SortHeader field="verifiedCount">Verified</SortHeader>
            </tr>
          </thead>
          <tbody>
            {paginated.map((row) => (
              <tr key={row.sponsorId} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{row.sponsorName}</td>
                <td className="px-4 py-3 text-gray-600">{row.dealCount}</td>
                <td className="px-4 py-3 text-gray-600">
                  ${(row.totalValue / 100).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  ${(row.paidAmount / 100).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {row.verifiedCount}/{row.deliverableCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between px-4">
          <p className="text-xs text-gray-500">
            Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sorted.length)} of{" "}
            {sorted.length}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
