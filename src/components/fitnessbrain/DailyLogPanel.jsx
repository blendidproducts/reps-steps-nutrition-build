import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { Moon, Activity, Heart, Beaker } from "lucide-react";

const TAB_ICONS = { sleep: Moon, recovery: Activity, measurement: Heart, hormones: Beaker };

const SelectRow = ({ label, field, value, onChange, options }) => (
  <div>
    <label className="text-xs text-gray-400 mb-1.5 block">{label}</label>
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(field, o.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${value === o.value ? 'border-[#00a9ff] bg-[#00a9ff]/20 text-white' : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/30'}`}>
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

export default function DailyLogPanel({ onSaved }) {
  const [tab, setTab] = useState("sleep");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const [sleepForm, setSleepForm] = useState({ log_date: today, hours_slept: "", sleep_quality: "fair", notes: "" });
  const [recForm, setRecForm] = useState({ log_date: today, resting_heart_rate: "", muscle_soreness: "none", energy_level: "moderate", mood: "fair" });
  const [measForm, setMeasForm] = useState({ measurement_date: today, weight_kg: "", body_fat_percent: "", waist_cm: "", chest_cm: "", hips_cm: "" });
  const [hormForm, setHormForm] = useState({ log_date: today, testosterone_level: "normal", cortisol_level: "normal", thyroid_indicator: "normal", energy_level: "moderate" });

  const setSleep = (k, v) => setSleepForm(f => ({ ...f, [k]: v }));
  const setRec = (k, v) => setRecForm(f => ({ ...f, [k]: v }));
  const setMeas = (k, v) => setMeasForm(f => ({ ...f, [k]: v }));
  const setHorm = (k, v) => setHormForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (tab === "sleep") {
        await base44.entities.SleepLog.create({ ...sleepForm, hours_slept: +sleepForm.hours_slept });
      } else if (tab === "recovery") {
        await base44.entities.RecoveryLog.create({ ...recForm, resting_heart_rate: recForm.resting_heart_rate ? +recForm.resting_heart_rate : undefined });
      } else if (tab === "measurement") {
        const data = { ...measForm };
        ['weight_kg', 'body_fat_percent', 'waist_cm', 'chest_cm', 'hips_cm'].forEach(k => { if (data[k]) data[k] = +data[k]; else delete data[k]; });
        await base44.entities.BodyMeasurement.create(data);
      } else if (tab === "hormones") {
        await base44.entities.HormoneLog.create(hormForm);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved?.();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const tabs = [
    { id: "sleep", label: "Sleep" },
    { id: "recovery", label: "Recovery" },
    { id: "measurement", label: "Body" },
    { id: "hormones", label: "Hormones" }
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="flex border-b border-white/10">
        {tabs.map(t => {
          const Icon = TAB_ICONS[t.id];
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all ${tab === t.id ? 'bg-[#00a9ff]/10 text-[#00a9ff] border-b-2 border-[#00a9ff]' : 'text-gray-400 hover:text-gray-300'}`}>
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-5 space-y-4">
        {tab === "sleep" && (
          <>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Hours Slept</label>
              <Input value={sleepForm.hours_slept} onChange={e => setSleep('hours_slept', e.target.value)} placeholder="7.5" type="number" step="0.5" className="bg-white/5 border-white/10 text-white" />
            </div>
            <SelectRow label="Sleep Quality" field="sleep_quality" value={sleepForm.sleep_quality} onChange={setSleep} options={[
              { value: 'poor', label: 'Poor' }, { value: 'fair', label: 'Fair' }, { value: 'good', label: 'Good' }, { value: 'excellent', label: 'Excellent' }
            ]} />
          </>
        )}

        {tab === "recovery" && (
          <>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Resting HR (bpm, optional)</label>
              <Input value={recForm.resting_heart_rate} onChange={e => setRec('resting_heart_rate', e.target.value)} placeholder="60" type="number" className="bg-white/5 border-white/10 text-white" />
            </div>
            <SelectRow label="Muscle Soreness" field="muscle_soreness" value={recForm.muscle_soreness} onChange={setRec} options={[
              { value: 'none', label: 'None' }, { value: 'mild', label: 'Mild' }, { value: 'moderate', label: 'Moderate' }, { value: 'severe', label: 'Severe' }
            ]} />
            <SelectRow label="Energy Level" field="energy_level" value={recForm.energy_level} onChange={setRec} options={[
              { value: 'very_low', label: 'Very Low' }, { value: 'low', label: 'Low' }, { value: 'moderate', label: 'OK' }, { value: 'high', label: 'High' }, { value: 'very_high', label: 'Great' }
            ]} />
            <SelectRow label="Mood" field="mood" value={recForm.mood} onChange={setRec} options={[
              { value: 'poor', label: 'Poor' }, { value: 'fair', label: 'Fair' }, { value: 'good', label: 'Good' }, { value: 'great', label: 'Great' }
            ]} />
          </>
        )}

        {tab === "measurement" && (
          <div className="grid grid-cols-2 gap-3">
            {[['Weight (kg)', 'weight_kg', '75'], ['Body Fat %', 'body_fat_percent', '18'], ['Waist (cm)', 'waist_cm', '82'], ['Chest (cm)', 'chest_cm', '95'], ['Hips (cm)', 'hips_cm', '90']].map(([label, key, ph]) => (
              <div key={key}>
                <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                <Input value={measForm[key]} onChange={e => setMeas(key, e.target.value)} placeholder={ph} type="number" className="bg-white/5 border-white/10 text-white" />
              </div>
            ))}
          </div>
        )}

        {tab === "hormones" && (
          <>
            <SelectRow label="Testosterone (subjective)" field="testosterone_level" value={hormForm.testosterone_level} onChange={setHorm} options={[
              { value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }
            ]} />
            <SelectRow label="Stress / Cortisol" field="cortisol_level" value={hormForm.cortisol_level} onChange={setHorm} options={[
              { value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High (stressed)' }
            ]} />
            <SelectRow label="Thyroid Feel" field="thyroid_indicator" value={hormForm.thyroid_indicator} onChange={setHorm} options={[
              { value: 'underactive', label: 'Sluggish' }, { value: 'normal', label: 'Normal' }, { value: 'overactive', label: 'Wired' }
            ]} />
            <SelectRow label="Energy Level" field="energy_level" value={hormForm.energy_level} onChange={setHorm} options={[
              { value: 'very_low', label: 'Very Low' }, { value: 'low', label: 'Low' }, { value: 'moderate', label: 'OK' }, { value: 'high', label: 'High' }
            ]} />
          </>
        )}

        <Button onClick={handleSave} disabled={saving} className={`w-full font-bold transition-all ${saved ? 'bg-green-600 hover:bg-green-600' : 'bg-[#00a9ff] hover:bg-[#0085cc]'} text-white`}>
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Log Data'}
        </Button>
      </div>
    </div>
  );
}