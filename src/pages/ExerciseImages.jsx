/**
 * ExerciseImages.jsx — Admin tool to attach photos to Exercise records.
 *
 * Workflow:
 * 1. Open this page (after the duplicate cleanup in exercise-duplicate-cleanup.md
 *    has been done, so each exercise appears once).
 * 2. For each exercise, download the matching photo from Google Drive using
 *    media_mapping.xlsx (column "Drive link" filtered to Record type = Exercise).
 * 3. Tap "Upload" next to that exercise and pick the downloaded file.
 *    This uploads it to Base44 file storage and sets Exercise.image_url —
 *    the same field ExerciseCard.jsx reads to display the photo.
 *
 * Safe to use repeatedly — uploading again for an exercise just replaces its
 * image_url, nothing else is touched.
 */

import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ChevronLeft, ImageIcon, CheckCircle, XCircle, Loader2, RefreshCw, Search
} from "lucide-react";

const CAT_LABEL = {
  upper_body: "Upper Body", lower_body: "Lower Body",
  core: "Core", full_body: "Full Body", mobility: "Mobility",
};

export default function ExerciseImages() {
  const navigate = useNavigate();
  const fileInputRefs = useRef({});

  const [exercises,   setExercises]   = useState([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [loadError,   setLoadError]   = useState(null);
  const [uploadingFor,setUploadingFor]= useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hideDone,    setHideDone]    = useState(false);

  useEffect(() => { loadExercises(); }, []);

  const loadExercises = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await base44.entities.Exercise.list();
      const list = (data || []).filter(e => !e.is_deleted);
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setExercises(list);
    } catch (err) {
      setLoadError(err.message || "Could not load exercises.");
    }
    setIsLoading(false);
  };

  const handleFileUpload = async (exerciseId, file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file (jpg, png, webp, etc).");
      return;
    }

    setUploadingFor(exerciseId);
    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadResult.file_url || uploadResult.url;
      if (!fileUrl) throw new Error("No file URL returned from upload");

      await base44.entities.Exercise.update(exerciseId, { image_url: fileUrl });

      setExercises(prev =>
        prev.map(e => (e.id === exerciseId ? { ...e, image_url: fileUrl } : e))
      );
    } catch (err) {
      alert(`Upload failed: ${err.message || "Unknown error"}`);
    } finally {
      setUploadingFor(null);
    }
  };

  const filtered = exercises
    .filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(ex => !hideDone || !ex.image_url);

  const withImage = exercises.filter(e => !!e.image_url).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-24">

      {/* Header */}
      <div className="bg-[#111] border-b border-gray-800 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(createPageUrl("Exercises"))} className="text-gray-400 hover:text-white">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <ImageIcon className="w-5 h-5 text-blue-400" />
        <div>
          <h1 className="text-base font-bold">Exercise Photos</h1>
          <p className="text-xs text-gray-500">Admin tool — upload a photo per exercise (sets image_url)</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {isLoading && (
          <div className="flex items-center gap-3 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
            <span className="text-sm">Loading exercises…</span>
          </div>
        )}

        {loadError && (
          <div className="bg-red-950/40 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-300 text-sm font-semibold">Could not load exercises</p>
            <p className="text-red-400/70 text-xs mt-0.5">{loadError}</p>
            <button onClick={loadExercises} className="text-blue-400 text-xs underline mt-2">Try again</button>
          </div>
        )}

        {!isLoading && !loadError && (
          <>
            {/* Status */}
            <div className="bg-[#111] border border-gray-700 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">{withImage} / {exercises.length} have photos</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Use media_mapping.xlsx to find the matching Drive photo for each exercise.
                </p>
              </div>
              <button onClick={loadExercises} className="text-gray-600 hover:text-white">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Search + filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search exercises…"
                  className="bg-[#111] border-gray-700 text-white pl-9"
                />
              </div>
              <button
                onClick={() => setHideDone(h => !h)}
                className={`text-xs px-3 rounded-lg border whitespace-nowrap ${
                  hideDone ? "bg-blue-600 border-blue-500 text-white" : "border-gray-700 text-gray-400"
                }`}
              >
                {hideDone ? "Showing missing only" : "Show all"}
              </button>
            </div>

            {/* List */}
            <div className="space-y-2">
              {filtered.map((ex) => {
                const hasImage = !!ex.image_url;
                return (
                  <div
                    key={ex.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                      hasImage ? "bg-[#111] border-green-900/40" : "bg-red-950/10 border-red-900/40"
                    }`}
                  >
                    {/* Thumbnail / status icon */}
                    {hasImage ? (
                      <img src={ex.image_url} alt={ex.name} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-700" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center shrink-0">
                        <XCircle className="w-4 h-4 text-red-500" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{ex.name}</p>
                      <p className="text-[11px] text-gray-500">{CAT_LABEL[ex.category] ?? ex.category}</p>
                    </div>

                    {hasImage && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}

                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={el => (fileInputRefs.current[ex.id] = el)}
                      onChange={(e) => handleFileUpload(ex.id, e.target.files?.[0])}
                    />
                    <button
                      onClick={() => fileInputRefs.current[ex.id]?.click()}
                      disabled={uploadingFor === ex.id}
                      className="text-xs text-blue-400 hover:text-blue-300 shrink-0 ml-1 font-semibold disabled:opacity-50"
                    >
                      {uploadingFor === ex.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : hasImage ? "Replace" : "Upload"}
                    </button>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-center text-sm text-gray-500 py-8">
                  {hideDone ? "All exercises have photos! 🎉" : "No exercises match your search."}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
