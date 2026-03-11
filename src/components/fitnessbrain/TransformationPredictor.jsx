import React from "react";
import { motion } from "framer-motion";
import { TrendingDown, Target, Calendar } from "lucide-react";

const PredCard = ({ period, weight, bodyfat, goal, current_weight, current_bf }) => {
  const wDiff = weight && current_weight ? (weight - current_weight).toFixed(1) : null;
  const bDiff = bodyfat && current_bf ? (bodyfat - current_bf).toFixed(1) : null;
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex-1">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-[#00a9ff]" />
        <span className="text-[#00a9ff] font-bold text-sm">{period}</span>
      </div>
      {weight && (
        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-0.5">Projected Weight</div>
          <div className="text-2xl font-bold text-white">{weight} <span className="text-sm text-gray-400">kg</span></div>
          {wDiff !== null && (
            <div className={`text-xs font-medium mt-0.5 ${+wDiff < 0 ? 'text-green-400' : 'text-orange-400'}`}>
              {+wDiff < 0 ? '↓' : '↑'} {Math.abs(+wDiff)} kg
            </div>
          )}
        </div>
      )}
      {bodyfat && (
        <div>
          <div className="text-xs text-gray-400 mb-0.5">Projected Body Fat</div>
          <div className="text-2xl font-bold text-white">{bodyfat}<span className="text-sm text-gray-400">%</span></div>
          {bDiff !== null && (
            <div className={`text-xs font-medium mt-0.5 ${+bDiff < 0 ? 'text-green-400' : 'text-orange-400'}`}>
              {+bDiff < 0 ? '↓' : '↑'} {Math.abs(+bDiff)}%
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function TransformationPredictor({ analysis, profile }) {
  const cw = profile?.weight_kg;
  const cbf = profile?.body_fat_percent;

  const has4wk = analysis?.predicted_4wk_weight || analysis?.predicted_4wk_bodyfat;
  const has12wk = analysis?.predicted_12wk_weight || analysis?.predicted_12wk_bodyfat;

  if (!has4wk && !has12wk) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">🔮</div>
        <p className="text-gray-400 text-sm">Run the AI analysis to unlock transformation predictions</p>
      </div>
    );
  }

  const goalLabels = {
    fat_loss: '🔥 Fat Loss Path',
    muscle_gain: '💪 Muscle Building Path',
    body_recomposition: '⚡ Recomposition Path',
    athletic_performance: '🏆 Performance Path'
  };

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-purple-600/15 to-[#00a9ff]/15 border border-purple-500/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🔮</span>
          <h3 className="text-white font-bold">Transformation Predictor</h3>
        </div>
        <p className="text-purple-300 text-xs">{goalLabels[profile?.primary_goal] || 'Your transformation journey'}</p>
      </div>

      {/* Current Stats */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">Starting Point</div>
        <div className="flex gap-6">
          {cw && <div><div className="text-xl font-bold text-white">{cw} kg</div><div className="text-xs text-gray-400">Current Weight</div></div>}
          {cbf && <div><div className="text-xl font-bold text-white">{cbf}%</div><div className="text-xs text-gray-400">Body Fat</div></div>}
        </div>
      </div>

      <div className="flex gap-3">
        <PredCard period="4 Weeks" weight={analysis?.predicted_4wk_weight} bodyfat={analysis?.predicted_4wk_bodyfat}
          current_weight={cw} current_bf={cbf} />
        <PredCard period="12 Weeks" weight={analysis?.predicted_12wk_weight} bodyfat={analysis?.predicted_12wk_bodyfat}
          current_weight={cw} current_bf={cbf} />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <p className="text-gray-500 text-xs">* Predictions are estimates based on your current data, goal, and adherence. Actual results vary. Consistency is the key to transformation.</p>
      </div>
    </div>
  );
}