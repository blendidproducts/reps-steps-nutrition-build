/**
 * MissingAssets.jsx — superseded by /ContentAudit (2026-09-30).
 *
 * This page listed names with no image_url and names with no youtube_url, from
 * Exercise records only. /ContentAudit covers both of those plus stretches, the
 * stretches that have no database row at all, instructions, descriptions, tips,
 * muscle groups, hold durations and 3D models — grouped by how badly each one
 * hurts the user, with a CSV export.
 *
 * Kept as a redirect rather than deleted so any existing link or bookmark still
 * lands somewhere useful.
 */
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ClipboardCheck } from "lucide-react";

export default function MissingAssets() {
  const navigate = useNavigate();
  const target = createPageUrl("ContentAudit");

  useEffect(() => {
    const t = setTimeout(() => navigate(target, { replace: true }), 1200);
    return () => clearTimeout(t);
  }, [navigate, target]);

  return (
    <div className="min-h-screen bg-[#020817] text-white flex flex-col items-center justify-center px-6 text-center">
      <ClipboardCheck className="w-10 h-10 text-blue-400 mb-3" />
      <h1 className="text-lg font-bold">Moved to Content Audit</h1>
      <p className="text-sm text-gray-400 mt-2 max-w-xs leading-snug">
        The missing-assets report is now part of the full content audit, which also
        covers stretches, instructions and tips. Taking you there…
      </p>
      <button
        onClick={() => navigate(target, { replace: true })}
        className="mt-5 text-blue-400 text-sm font-semibold underline"
      >
        Go now
      </button>
    </div>
  );
}
