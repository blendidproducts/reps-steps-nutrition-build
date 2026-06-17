import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download, Dumbbell, Apple, Target, Sparkles } from "lucide-react";

/**
 * Guides.jsx — Program Guides & Downloads
 *
 * Re-surfaces the downloadable PDF programs that ship with Reps & Steps.
 * The PDFs are hosted on the marketing site under /downloads/. If you move
 * hosting (e.g. to Base44/Supabase storage), update DOWNLOAD_BASE below.
 *
 * NOTE: confirm each href resolves on the live site — a couple of source
 * filenames contain spaces; the URLs here use the marketing site's own
 * (space-free) link names where those were already in use.
 */
const DOWNLOAD_BASE = "https://repsandsteps.com/downloads/";

const GUIDES = [
  // ── Workout programs ──
  { title: "4-Week Beginner Calisthenics Routine", file: "RepsAndSteps_4Week_Beginner_Calisthenics_Routine.pdf", group: "Workout Programs" },
  { title: "AR-Optimized Bodyweight Guide",        file: "AR-Optimized Bodyweight Guide.pdf",                    group: "Workout Programs" },
  { title: "Trimmer Fit 300 Workout Plan",         file: "Trimmer_Fit_300_Workout_Plan.pdf",                     group: "Workout Programs" },
  { title: "TrimmerFit 4 — Weight Training Isolation", file: "trimmerfit-4-weight-training-isolation.pdf",       group: "Workout Programs" },
  { title: "The Volume Beast Protocol",            file: "The Volume Beast Protocol.pdf",                        group: "Workout Programs" },
  { title: "Endurance Beast System",               file: "Endurance Beast System.pdf",                           group: "Workout Programs" },

  // ── Goal-based programs ──
  { title: "Waist Size Goal Program",              file: "Reps_and_Steps_Waist_Size_Goal_Program.pdf",           group: "Goal Programs" },
  { title: "Waist Size Goal — Quick Doc",          file: "WAIST SIZE GOAL DOC.pdf",                              group: "Goal Programs" },

  // ── Women's programs ──
  { title: "4-Week Beginner Routine (Women)",      file: "4-week_beginner_routine_for_women.pdf",                group: "Women's Programs" },
  { title: "8-Week Beginner Workout (Women)",      file: "8-week_beginner_workout_for_women.pdf",                group: "Women's Programs" },
  { title: "Beginner Reset Guide (Women)",         file: "beginner-reset-guide-for-women.pdf",                   group: "Women's Programs" },

  // ── Nutrition guides ──
  { title: "Complete Nutrition System",            file: "Complete Nutrition System.pdf",                        group: "Nutrition Guides" },
  { title: "Reps & Steps Nutrition Guide",         file: "FitRepsandSteps_NutritionGuide.pdf",                   group: "Nutrition Guides" },
];

const GROUP_META = {
  "Workout Programs": { icon: Dumbbell, color: "text-blue-400" },
  "Goal Programs":    { icon: Target,   color: "text-emerald-400" },
  "Women's Programs": { icon: Sparkles, color: "text-pink-400" },
  "Nutrition Guides": { icon: Apple,    color: "text-orange-400" },
};

const ORDER = ["Workout Programs", "Goal Programs", "Women's Programs", "Nutrition Guides"];

function hrefFor(file) {
  return DOWNLOAD_BASE + encodeURIComponent(file);
}

export default function Guides() {
  const grouped = ORDER
    .map(group => ({ group, items: GUIDES.filter(g => g.group === group) }))
    .filter(s => s.items.length > 0);

  return (
    <div style={{ backgroundColor: "#0a0a0a", minHeight: "100vh", color: "#f9fafb", paddingBottom: "100px" }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <FileText className="w-6 h-6" /> Program Guides
          </h1>
          <p className="text-white/80 text-sm">Download your workout, nutrition &amp; goal program PDFs</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-5 space-y-7">
        {grouped.map(({ group, items }) => {
          const meta = GROUP_META[group] || { icon: FileText, color: "text-gray-400" };
          const Icon = meta.icon;
          return (
            <div key={group}>
              <h2 className={`flex items-center gap-2 text-sm font-semibold uppercase tracking-wide mb-3 ${meta.color}`}>
                <Icon className="w-4 h-4" /> {group}
              </h2>
              <div className="space-y-3">
                {items.map(item => (
                  <a key={item.file} href={hrefFor(item.file)} target="_blank" rel="noopener noreferrer" download>
                    <Card className="bg-gray-900 border-gray-700 hover:border-blue-500/50 transition-all cursor-pointer">
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-5 h-5 text-gray-400 shrink-0" />
                          <span className="text-white font-medium text-sm truncate">{item.title}</span>
                        </div>
                        <span className="flex items-center gap-1 text-blue-400 text-xs font-semibold shrink-0">
                          <Download className="w-4 h-4" /> PDF
                        </span>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            </div>
          );
        })}

        <p className="text-gray-500 text-xs text-center pt-2">
          Guides open in a new tab. Trouble downloading? Contact support from the Help page.
        </p>
      </div>
    </div>
  );
}
