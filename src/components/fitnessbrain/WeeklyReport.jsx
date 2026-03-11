import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function WeeklyReport({ analysis, weeklyAnalyses, profile }) {
  const latest = weeklyAnalyses?.[0];

  const macroData = analysis ? [
    { name: 'Protein', value: analysis.protein_target_g || profile?.target_protein_g || 0, color: '#a855f7' },
    { name: 'Carbs', value: analysis.carbs_target_g || profile?.target_carbs_g || 0, color: '#f97316' },
    { name: 'Fat', value: analysis.fat_target_g || profile?.target_fat_g || 0, color: '#10b981' }
  ] : [];

  return (
    <div className="space-y-5">
      {/* Weekly Summary Message */}
      {(analysis?.weekly_summary || latest?.ai_summary) && (
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-5">
          <div className="text-green-400 font-semibold text-xs uppercase tracking-wider mb-2">📊 Weekly Intelligence Report</div>
          <p className="text-gray-200 text-sm leading-relaxed">{analysis?.weekly_summary || latest?.ai_summary}</p>
        </div>
      )}

      {/* Macro Targets */}
      {macroData.some(m => m.value > 0) && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 text-sm">AI Macro Targets</h3>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={macroData} layout="vertical">
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#d1d5db', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
              <Tooltip contentStyle={{ backgroundColor: '#0a1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} formatter={(v) => [`${v}g`]} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {macroData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {macroData.map(m => (
              <div key={m.name} className="bg-white/5 rounded-lg p-2 text-center">
                <div className="text-sm font-bold" style={{ color: m.color }}>{m.value}g</div>
                <div className="text-xs text-gray-400">{m.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Adjustments */}
      {analysis && (analysis.calorie_adjustment !== undefined || analysis.intensity_adjustment !== undefined) && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-3 text-sm">🤖 AI Adjustments This Week</h3>
          <div className="space-y-2">
            {analysis.calorie_adjustment !== 0 && analysis.calorie_adjustment !== undefined && (
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-gray-300 text-sm">Calorie Adjustment</span>
                <span className={`font-bold text-sm ${analysis.calorie_adjustment > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {analysis.calorie_adjustment > 0 ? '+' : ''}{analysis.calorie_adjustment} kcal
                </span>
              </div>
            )}
            {analysis.intensity_adjustment !== 0 && analysis.intensity_adjustment !== undefined && (
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-gray-300 text-sm">Training Intensity</span>
                <span className={`font-bold text-sm ${analysis.intensity_adjustment > 0 ? 'text-green-400' : 'text-amber-400'}`}>
                  {analysis.intensity_adjustment > 0 ? '+' : ''}{analysis.intensity_adjustment}%
                </span>
              </div>
            )}
            {analysis.rest_days_recommendation > 0 && (
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-300 text-sm">Recommended Rest Days</span>
                <span className="font-bold text-sm text-blue-400">{analysis.rest_days_recommendation} days</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}