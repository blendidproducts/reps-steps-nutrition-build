import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import MobileDrawerSelect from "@/components/MobileDrawerSelect";

const GOALS = [
  { value: "fat_loss", label: "🔥 Fat Loss", desc: "Burn fat, lean out" },
  { value: "muscle_gain", label: "💪 Muscle Gain", desc: "Build size & strength" },
  { value: "body_recomposition", label: "⚡ Recomposition", desc: "Lose fat, gain muscle" },
  { value: "athletic_performance", label: "🏆 Performance", desc: "Speed, power, endurance" },
];

const STEPS = [
  { id: "basics", title: "Your Stats", subtitle: "Let the AI calibrate your metabolism" },
  { id: "goal", title: "Your Goal", subtitle: "What are you training for?" },
  { id: "lifestyle", title: "Your Lifestyle", subtitle: "Help the AI understand your daily habits" },
  { id: "experience", title: "Training Level", subtitle: "So we can tailor your program" },
];

export default function BrainSetupWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    height_cm: "", weight_kg: "", age: "", gender: "male",
    body_fat_percent: "", waist_cm: "",
    primary_goal: "fat_loss",
    stress_level: "moderate", sleep_quality: "fair",
    daily_steps: "6000", training_experience: "beginner"
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFinish = async () => {
    setSaving(true);
    try {
      const metaResp = await base44.functions.invoke('fitnessBrainAnalyze', {
        action: 'calculate_metabolism',
        data: {
          height_cm: +form.height_cm,
          weight_kg: +form.weight_kg,
          age: +form.age,
          gender: form.gender,
          activity_level: form.training_experience === 'beginner' ? 'light' : form.training_experience === 'intermediate' ? 'moderate' : 'active',
          goal: form.primary_goal
        }
      });
      const meta = metaResp.data;
      await base44.entities.FitnessBrainProfile.create({
        ...form,
        height_cm: +form.height_cm, weight_kg: +form.weight_kg, age: +form.age,
        body_fat_percent: form.body_fat_percent ? +form.body_fat_percent : undefined,
        waist_cm: form.waist_cm ? +form.waist_cm : undefined,
        daily_steps: +form.daily_steps,
        bmr: meta.bmr, tdee: meta.tdee,
        target_calories: meta.target_calories,
        target_protein_g: meta.protein_g,
        target_carbs_g: meta.carbs_g,
        target_fat_g: meta.fat_g,
        profile_initialized: true,
        last_analysis_date: new Date().toISOString().split('T')[0]
      });
      onComplete();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const SelectBtn = ({ value, label, field, options }) => (
    <div className="grid grid-cols-2 gap-2">
      {options.map(o => (
        <button key={o.value} onClick={() => set(field, o.value)}
          className={`p-3 rounded-xl border text-left transition-all ${form[field] === o.value ? 'border-[#00a9ff] bg-[#00a9ff]/20 text-white' : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/30'}`}>
          <div className="font-semibold text-sm">{o.label}</div>
          {o.desc && <div className="text-xs text-gray-400 mt-0.5">{o.desc}</div>}
        </button>
      ))}
    </div>
  );

  const currentStep = STEPS[step];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-[#0a1628] border border-[#00a9ff]/30 rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#00a9ff]/20 to-purple-600/20 p-6 border-b border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#00a9ff]/20 flex items-center justify-center">
              <span className="text-xl">🧠</span>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">AI Fitness Brain</h2>
              <p className="text-gray-400 text-xs">Setup ({step + 1}/{STEPS.length})</p>
            </div>
          </div>
          <div className="flex gap-1 mt-2">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-[#00a9ff]' : 'bg-white/10'}`} />
            ))}
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-white font-bold text-xl mb-1">{currentStep.title}</h3>
          <p className="text-gray-400 text-sm mb-5">{currentStep.subtitle}</p>

          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">

              {step === 0 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Height (cm)</label>
                      <Input value={form.height_cm} onChange={e => set('height_cm', e.target.value)} placeholder="175" type="number" className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Weight (kg)</label>
                      <Input value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)} placeholder="75" type="number" className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Age</label>
                      <Input value={form.age} onChange={e => set('age', e.target.value)} placeholder="28" type="number" className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Body Fat % (opt.)</label>
                      <Input value={form.body_fat_percent} onChange={e => set('body_fat_percent', e.target.value)} placeholder="18" type="number" className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Waist (cm, opt.)</label>
                      <Input value={form.waist_cm} onChange={e => set('waist_cm', e.target.value)} placeholder="82" type="number" className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Gender</label>
                      <MobileDrawerSelect
                        value={form.gender}
                        onValueChange={v => set('gender', v)}
                        placeholder="Select gender"
                        label="Gender"
                        options={[
                          { value: 'male', label: 'Male' },
                          { value: 'female', label: 'Female' },
                          { value: 'other', label: 'Other' },
                        ]}
                        triggerClassName="bg-white/5 border-white/10 text-white text-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              {step === 1 && (
                <div className="grid grid-cols-1 gap-2">
                  {GOALS.map(g => (
                    <button key={g.value} onClick={() => set('primary_goal', g.value)}
                      className={`p-4 rounded-xl border text-left transition-all ${form.primary_goal === g.value ? 'border-[#00a9ff] bg-[#00a9ff]/20' : 'border-white/10 bg-white/5 hover:border-white/30'}`}>
                      <div className="font-bold text-white">{g.label}</div>
                      <div className="text-xs text-gray-400">{g.desc}</div>
                    </button>
                  ))}
                </div>
              )}

              {step === 2 && (
                <>
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">Stress Level</label>
                    <SelectBtn field="stress_level" options={[
                      { value: 'low', label: '😌 Low' },
                      { value: 'moderate', label: '😐 Moderate' },
                      { value: 'high', label: '😤 High' }
                    ]} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">Sleep Quality</label>
                    <SelectBtn field="sleep_quality" options={[
                      { value: 'poor', label: '😴 Poor' },
                      { value: 'fair', label: '😑 Fair' },
                      { value: 'good', label: '😊 Good' },
                      { value: 'excellent', label: '🌟 Excellent' }
                    ]} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Avg Daily Steps</label>
                    <Input value={form.daily_steps} onChange={e => set('daily_steps', e.target.value)} placeholder="6000" type="number" className="bg-white/5 border-white/10 text-white" />
                  </div>
                </>
              )}

              {step === 3 && (
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { value: 'beginner', label: '🌱 Beginner', desc: 'Under 1 year of training' },
                    { value: 'intermediate', label: '⚡ Intermediate', desc: '1–3 years of training' },
                    { value: 'advanced', label: '🔥 Advanced', desc: '3+ years, consistent training' }
                  ].map(o => (
                    <button key={o.value} onClick={() => set('training_experience', o.value)}
                      className={`p-4 rounded-xl border text-left transition-all ${form.training_experience === o.value ? 'border-[#00a9ff] bg-[#00a9ff]/20' : 'border-white/10 bg-white/5 hover:border-white/30'}`}>
                      <div className="font-bold text-white">{o.label}</div>
                      <div className="text-xs text-gray-400">{o.desc}</div>
                    </button>
                  ))}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          {step > 0 && (
            <Button variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10" onClick={() => setStep(s => s - 1)}>Back</Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button className="flex-1 bg-[#00a9ff] hover:bg-[#0085cc] text-white font-bold" onClick={() => setStep(s => s + 1)}>Next →</Button>
          ) : (
            <Button className="flex-1 bg-gradient-to-r from-[#00a9ff] to-purple-600 text-white font-bold" onClick={handleFinish} disabled={saving}>
              {saving ? '🧠 Initializing Brain...' : '🚀 Activate AI Brain'}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}