import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Brain, BarChart2, RefreshCw, LayoutDashboard, TrendingUp, ClipboardList, Zap, ChevronRight } from "lucide-react";
import { useAddons } from "@/hooks/useAddons";
import UpgradeGate from "@/components/UpgradeGate";
import BrainSetupWizard from "@/components/fitnessbrain/BrainSetupWizard";
import BrainDashboard from "@/components/fitnessbrain/BrainDashboard";
import TransformationPredictor from "@/components/fitnessbrain/TransformationPredictor";
import DailyLogPanel from "@/components/fitnessbrain/DailyLogPanel";
import WeeklyReport from "@/components/fitnessbrain/WeeklyReport";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "log", label: "Log Data", icon: ClipboardList },
  { id: "predict", label: "Transform", icon: TrendingUp },
  { id: "report", label: "Weekly", icon: BarChart2 },
];

export default function FitnessBrain() {
  const { hasFitnessBrain, loading: addonLoading } = useAddons();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [workouts, setWorkouts] = useState([]);
  const [sleepLogs, setSleepLogs] = useState([]);
  const [recoveryLogs, setRecoveryLogs] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [hormoneLogs, setHormoneLogs] = useState([]);
  const [weeklyAnalyses, setWeeklyAnalyses] = useState([]);
  const [lastAnalyzed, setLastAnalyzed] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [profiles, wks, sl, rl, ml, hl, wa] = await Promise.all([
        base44.entities.FitnessBrainProfile.list('-created_date', 1),
        base44.entities.Workout.filter({ completed: true }, '-created_date', 14),
        base44.entities.SleepLog.list('-log_date', 14),
        base44.entities.RecoveryLog.list('-log_date', 14),
        base44.entities.BodyMeasurement.list('-measurement_date', 10),
        base44.entities.HormoneLog.list('-log_date', 7),
        base44.entities.WeeklyAnalysis.list('-week_start_date', 4)
      ]);
      if (profiles.length > 0) {
        setProfile(profiles[0]);
      } else {
        setShowSetup(true);
      }
      setWorkouts(wks);
      setSleepLogs(sl);
      setRecoveryLogs(rl);
      setMeasurements(ml);
      setHormoneLogs(hl);
      setWeeklyAnalyses(wa);

      // Auto-load cached analysis
      const cached = localStorage.getItem('fitnessBrainAnalysis');
      const cachedDate = localStorage.getItem('fitnessBrainAnalysisDate');
      if (cached && cachedDate) {
        const today = new Date().toISOString().split('T')[0];
        if (cachedDate === today) {
          setAnalysis(JSON.parse(cached));
          setLastAnalyzed(cachedDate);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const runAnalysis = async () => {
    if (!profile) return;
    setAnalyzing(true);
    try {
      const resp = await base44.functions.invoke('fitnessBrainAnalyze', {
        action: 'analyze',
        data: { profile, workouts, sleepLogs, recoveryLogs, measurements, hormoneLogs }
      });
      const result = resp.data.analysis;
      setAnalysis(result);
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('fitnessBrainAnalysis', JSON.stringify(result));
      localStorage.setItem('fitnessBrainAnalysisDate', today);
      setLastAnalyzed(today);

      // Save insight to DB
      await base44.entities.AIInsight.create({
        insight_date: today,
        insight_type: 'daily',
        category: 'general',
        title: 'Daily AI Analysis',
        message: result.daily_message || '',
        action_items: result.action_items || [],
        priority: 'high',
        ai_adjustments: {
          calories_adjustment: result.calorie_adjustment,
          intensity_adjustment_percent: result.intensity_adjustment,
          protein_adjustment_g: result.protein_target_g
        }
      });
    } catch (e) {
      console.error(e);
    }
    setAnalyzing(false);
  };

  const handleSetupComplete = () => {
    setShowSetup(false);
    loadAll();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#00a9ff]/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Brain className="w-8 h-8 text-[#00a9ff]" />
          </div>
          <p className="text-gray-400 text-sm">Loading AI Fitness Brain...</p>
        </div>
      </div>
    );
  }

  return (
    <UpgradeGate
      locked={!hasFitnessBrain}
      loading={addonLoading}
      title="AI Fitness Brain"
      description="Get daily AI coaching, smart adjustments, and weekly performance reports."
      price="$1.99/mo"
      gradient="from-blue-600 to-purple-700"
    >
    <div className="min-h-screen pb-24 md:pb-8" style={{ color: '#f9fafb' }}>
      {showSetup && <BrainSetupWizard onComplete={handleSetupComplete} />}

      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#020817]/90 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00a9ff] to-purple-600 flex items-center justify-center shadow-lg">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg leading-tight">AI Fitness Brain</h1>
                <p className="text-gray-400 text-xs">
                  {lastAnalyzed ? `Last analyzed: ${lastAnalyzed}` : 'Your 24/7 AI coach'}
                </p>
              </div>
            </div>
            <Button onClick={runAnalysis} disabled={analyzing || !profile}
              className="bg-gradient-to-r from-[#00a9ff] to-purple-600 text-white font-bold text-xs px-4 py-2 h-auto rounded-xl gap-1.5">
              {analyzing ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
              ) : (
                <><Zap className="w-3.5 h-3.5" /> Analyze</>
              )}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4 pb-0">
          <div className="flex border-b border-white/10">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all relative ${tab === t.id ? 'text-[#00a9ff]' : 'text-gray-500 hover:text-gray-300'}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                  {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00a9ff] rounded-full" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* No Profile Warning */}
      {!profile && !showSetup && (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-[#00a9ff]/10 border border-[#00a9ff]/30 rounded-2xl p-6 text-center">
            <Brain className="w-12 h-12 text-[#00a9ff] mx-auto mb-3" />
            <h3 className="text-white font-bold mb-2">Initialize Your AI Brain</h3>
            <p className="text-gray-400 text-sm mb-4">Set up your profile so the AI can start optimizing your fitness journey.</p>
            <Button onClick={() => setShowSetup(true)} className="bg-[#00a9ff] text-white font-bold">Get Started</Button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-5">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

            {tab === "dashboard" && (
              <>
                {!analysis && profile && (
                  <div className="bg-gradient-to-br from-[#00a9ff]/10 to-purple-600/10 border border-[#00a9ff]/20 rounded-2xl p-6 text-center mb-5">
                    <div className="text-4xl mb-3">🧠</div>
                    <h3 className="text-white font-bold mb-1">Ready to Analyze</h3>
                    <p className="text-gray-400 text-sm mb-4">Tap "Analyze" above to get your personalized AI insights, adjusted plan, and daily coaching message.</p>
                    <Button onClick={runAnalysis} disabled={analyzing} className="bg-gradient-to-r from-[#00a9ff] to-purple-600 text-white font-bold px-6">
                      {analyzing ? 'Analyzing...' : '🧠 Run AI Analysis'}
                    </Button>
                  </div>
                )}
                {profile && (
                  <BrainDashboard analysis={analysis} profile={profile} measurements={measurements} sleepLogs={sleepLogs} recoveryLogs={recoveryLogs} />
                )}
                {/* Quick Edit Profile */}
                {profile && (
                  <button onClick={() => setShowSetup(true)} className="mt-4 w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-all">
                    <span className="text-gray-400 text-sm">Update Profile & Metrics</span>
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </>
            )}

            {tab === "log" && (
              <DailyLogPanel onSaved={loadAll} />
            )}

            {tab === "predict" && (
              <TransformationPredictor analysis={analysis} profile={profile} />
            )}

            {tab === "report" && (
              <WeeklyReport analysis={analysis} weeklyAnalyses={weeklyAnalyses} profile={profile} />
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}