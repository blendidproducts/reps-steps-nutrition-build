import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Activity, Zap, Moon, Flame, Target, Brain } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

// eslint-disable-next-line no-unused-vars
const MetricCard = ({ icon: IconComponent, label, value, unit, color, trend }) => {
  const Icon = IconComponent;
  return (
  <div className={`bg-white/5 border border-white/10 rounded-xl p-4 relative overflow-hidden`}>
    <div className={`absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-20`} style={{ backgroundColor: color }} />
    <div className="flex items-start justify-between mb-2">
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center`} style={{ backgroundColor: color + '33' }}>
    <Icon className="w-4 h-4" style={{ color }} />
    </div>
    {trend !== undefined && (
    <span className={`text-xs font-medium ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
      {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
    </span>
    )}
    </div>
    <div className="text-2xl font-bold text-white">{value ?? '—'}<span className="text-sm text-gray-400 ml-1">{unit}</span></div>
    <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
    );
    };

const ScoreRing = ({ score, label, color }) => {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" className="rotate-[-90deg]">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <div className="text-center -mt-12 pb-8">
        <div className="text-xl font-bold text-white">{score}</div>
      </div>
      <div className="text-xs text-gray-400 text-center mt-1">{label}</div>
    </div>
  );
};

export default function BrainDashboard({ analysis, profile, measurements, sleepLogs, recoveryLogs }) {
  const weightData = measurements?.slice(0, 10).reverse().map(m => ({
    date: m.measurement_date?.slice(5),
    weight: m.weight_kg,
    bf: m.body_fat_percent
  })) || [];

  const sleepData = sleepLogs?.slice(0, 7).reverse().map(s => ({
    date: s.log_date?.slice(5),
    hours: s.hours_slept
  })) || [];

  const recoveryScore = analysis?.recovery_score || recoveryLogs?.[0]?.recovery_score || 72;
  const intensity = analysis?.training_intensity || 75;
  const calories = analysis?.recommended_calories || profile?.target_calories || 2000;

  return (
    <div className="space-y-6">
      {/* AI Message Banner */}
      {analysis?.daily_message && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#00a9ff]/15 to-purple-600/15 border border-[#00a9ff]/30 rounded-2xl p-5">
          <div className="flex gap-3 items-start">
            <div className="w-10 h-10 rounded-xl bg-[#00a9ff]/20 flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5 text-[#00a9ff]" />
            </div>
            <div>
              <div className="text-xs text-[#00a9ff] font-semibold uppercase tracking-wider mb-1">AI Fitness Brain</div>
              <p className="text-gray-200 text-sm leading-relaxed">{analysis.daily_message}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Score Rings */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4 text-sm">Today's Status</h3>
        <div className="flex justify-around">
          <ScoreRing score={recoveryScore} label="Recovery" color="#00a9ff" />
          <ScoreRing score={intensity} label="Intensity" color="#a855f7" />
          <ScoreRing score={Math.min(100, Math.round((calories / (profile?.target_calories || 2000)) * 100))} label="Nutrition" color="#10b981" />
        </div>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard icon={Flame} label="Target Calories" value={calories} unit="kcal" color="#f97316" />
        <MetricCard icon={Zap} label="Protein Target" value={analysis?.protein_target_g || profile?.target_protein_g} unit="g" color="#a855f7" />
        <MetricCard icon={Activity} label="TDEE" value={profile?.tdee} unit="kcal" color="#00a9ff" />
        <MetricCard icon={Target} label="BMR" value={profile?.bmr} unit="kcal" color="#10b981" />
      </div>

      {/* Weight Trend */}
      {weightData.length > 1 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 text-sm">Weight Trend</h3>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={weightData}>
              <defs>
                <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00a9ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00a9ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ backgroundColor: '#0a1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
              <Area type="monotone" dataKey="weight" stroke="#00a9ff" strokeWidth={2} fill="url(#wGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sleep Trend */}
      {sleepData.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 text-sm flex items-center gap-2"><Moon className="w-4 h-4 text-purple-400" /> Sleep Trend</h3>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={sleepData}>
              <defs>
                <linearGradient id="sGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 10]} />
              <Tooltip contentStyle={{ backgroundColor: '#0a1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
              <Area type="monotone" dataKey="hours" stroke="#a855f7" strokeWidth={2} fill="url(#sGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Action Items */}
      {analysis?.action_items?.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-3 text-sm">Today's Action Plan</h3>
          <div className="space-y-2">
            {analysis.action_items.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#00a9ff]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[#00a9ff] text-xs font-bold">{i + 1}</span>
                </div>
                <p className="text-gray-300 text-sm">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {analysis?.warnings?.filter(w => w).map((w, i) => (
        <div key={i} className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3">
          <span className="text-amber-400 text-lg">⚠️</span>
          <p className="text-amber-200 text-sm">{w}</p>
        </div>
      ))}

      {/* Achievements */}
      {analysis?.achievements?.filter(a => a).map((a, i) => (
        <div key={i} className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex gap-3">
          <span className="text-green-400 text-lg">🏆</span>
          <p className="text-green-200 text-sm">{a}</p>
        </div>
      ))}
    </div>
  );
}