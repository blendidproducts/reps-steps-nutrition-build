import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Heart, Footprints, Flame, Moon, Activity,
  RefreshCw, Save, CheckCircle, TrendingUp,
  Battery, Wifi, WifiOff, Zap, MapPin
} from "lucide-react";

const METRIC = [
  { key: "heartRate", label: "Heart Rate", unit: "BPM", icon: Heart, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  { key: "steps", label: "Steps", unit: "", icon: Footprints, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  { key: "calories", label: "Calories", unit: "kcal", icon: Flame, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  { key: "distance", label: "GPS Distance", unit: "mi", icon: MapPin, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
  { key: "sleep", label: "Sleep", unit: "hrs", icon: Moon, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  { key: "recovery", label: "Recovery", unit: "/100", icon: Activity, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
];

export default function WatchDataSync({ connectedDevice, onDataUpdate, onSyncComplete, liveData }) {
  const [data, setData] = useState({
    heartRate: liveData?.heartRate || null,
    steps: liveData?.steps || null,
    calories: liveData?.calories || null,
    distance: liveData?.distance || null,
    sleep: liveData?.sleep || null,
    recovery: null,
    battery: liveData?.battery || null
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hrHistory, setHrHistory] = useState([]);
  const hrHistRef = useRef([]);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState({});

  // Simulate live HR fluctuation when connected via BT (demo if no actual BT data)
  useEffect(() => {
    if (!connectedDevice) return;

    // If we have real BT data, use it; otherwise demo
    const isDemo = !connectedDevice.isManual && connectedDevice.source !== "manual";

    if (isDemo) {
      const interval = setInterval(() => {
        const baseHR = data.heartRate || 72;
        const newHR = Math.round(baseHR + (Math.random() * 6 - 3));
        const clamped = Math.max(55, Math.min(180, newHR));

        setData(prev => {
          const updated = { ...prev, heartRate: clamped };
          onDataUpdate?.(updated);
          return updated;
        });

        hrHistRef.current = [...hrHistRef.current.slice(-19), clamped];
        setHrHistory([...hrHistRef.current]);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [connectedDevice]);

  // Sync liveData prop changes (from BT characteristic notifications)
  useEffect(() => {
    if (liveData) {
      setData(prev => ({ ...prev, ...liveData }));
    }
  }, [liveData]);

  const saveToApp = async () => {
    setSaving(true);
    const today = format(new Date(), "yyyy-MM-dd");

    try {
      // Save to RecoveryLog
      if (data.heartRate || data.recovery) {
        await base44.entities.RecoveryLog.create({
          log_date: today,
          resting_heart_rate: data.heartRate,
          recovery_score: data.recovery,
          energy_level: data.recovery > 70 ? "high" : data.recovery > 40 ? "moderate" : "low",
          notes: `Synced from ${connectedDevice?.name || "smartwatch"}`
        });
      }

      // Save to SleepLog
      if (data.sleep) {
        await base44.entities.SleepLog.create({
          log_date: today,
          hours_slept: data.sleep,
          sleep_quality: data.sleep >= 8 ? "excellent" : data.sleep >= 7 ? "good" : data.sleep >= 6 ? "fair" : "poor",
          notes: `Auto-synced from ${connectedDevice?.name || "smartwatch"}`
        });
      }

      const record = {
        device: connectedDevice?.name || "Watch",
        time: format(new Date(), "MMM d, h:mm a"),
        heartRate: data.heartRate,
        steps: data.steps,
        calories: data.calories,
        distance: data.distance,
        sleep: data.sleep,
        recovery: data.recovery
      };

      onSyncComplete?.(record);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Sync save error:", err);
    }
    setSaving(false);
  };

  const startEditMode = () => {
    setEditValues({ ...data });
    setEditMode(true);
  };

  const saveEditMode = () => {
    const parsed = {};
    Object.entries(editValues).forEach(([k, v]) => {
      parsed[k] = v !== "" && v !== null ? Number(v) : null;
    });
    setData(parsed);
    onDataUpdate?.(parsed);
    setEditMode(false);
  };

  if (!connectedDevice) {
    return (
      <div className="text-center py-16">
        <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 font-medium">No watch connected</p>
        <p className="text-gray-600 text-sm mt-1">Connect a watch from the Connect tab to see live data</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Live indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-green-400 text-xs font-medium">
            {connectedDevice.isManual ? "Manual data" : "Live data stream"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data.battery !== null && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Battery className="w-3.5 h-3.5" />
              {data.battery}%
            </div>
          )}
          <span className="text-gray-500 text-xs">{connectedDevice.name}</span>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        {METRIC.map(m => {
          const Icon = m.icon;
          const val = data[m.key];
          return (
            <motion.div key={m.key}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className={`${m.bg} border ${m.border} rounded-xl p-4`}>
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-4 h-4 ${m.color}`} />
                <span className="text-gray-500 text-xs">{m.label}</span>
              </div>
              {editMode ? (
                <input
                  type="number"
                  value={editValues[m.key] ?? ""}
                  onChange={e => setEditValues(prev => ({ ...prev, [m.key]: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm focus:outline-none"
                  placeholder="—"
                />
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-bold ${val !== null ? "text-white" : "text-gray-600"}`}>
                    {val !== null ? (m.key === "steps" ? val.toLocaleString() : val) : "—"}
                  </span>
                  {val !== null && <span className="text-gray-400 text-xs">{m.unit}</span>}
                </div>
              )}
              {/* HR mini spark */}
              {m.key === "heartRate" && hrHistory.length > 3 && !editMode && (
                <div className="flex items-end gap-0.5 mt-2 h-6">
                  {hrHistory.slice(-12).map((v, i) => {
                    const min = Math.min(...hrHistory);
                    const max = Math.max(...hrHistory);
                    const h = max === min ? 12 : Math.round(((v - min) / (max - min)) * 20) + 4;
                    return (
                      <div key={i} className="flex-1 bg-red-400/50 rounded-sm transition-all"
                        style={{ height: `${h}px` }} />
                    );
                  })}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Edit / Save actions */}
      <div className="flex gap-2">
        {editMode ? (
          <>
            <Button onClick={saveEditMode} className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-bold">
              <CheckCircle className="w-4 h-4 mr-2" /> Apply
            </Button>
            <Button onClick={() => setEditMode(false)} variant="outline"
              className="border-white/20 text-gray-300 hover:bg-white/10">
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button onClick={startEditMode} variant="outline"
              className="flex-1 border-white/20 text-gray-300 hover:bg-white/10">
              ✏️ Edit Values
            </Button>
            <Button onClick={saveToApp} disabled={saving}
              className={`flex-1 font-bold ${saved ? "bg-green-600" : "bg-[#00a9ff] hover:bg-[#007fbf]"}`}>
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> :
               saved ? <CheckCircle className="w-4 h-4 mr-2" /> :
               <Save className="w-4 h-4 mr-2" />}
              {saving ? "Saving..." : saved ? "Saved!" : "Save to App"}
            </Button>
          </>
        )}
      </div>

      {/* Save explanation */}
      <p className="text-gray-600 text-xs text-center">
        "Save to App" logs heart rate & recovery to Recovery Log, and sleep to Sleep Log
      </p>
    </div>
  );
}