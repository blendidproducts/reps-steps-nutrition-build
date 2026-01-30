import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trophy, Target, Dumbbell, Zap } from "lucide-react";

export default function FitnessQuiz({ onComplete }) {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    fitness_level: "",
    age: "",
    fitness_goals: ""
  });

  const questions = [
    {
      step: 1,
      title: "What's Your Fitness Level?",
      subtitle: "Be honest - we'll tailor everything to you",
      options: [
        { value: "beginner", label: "Beginner", desc: "New to working out", icon: "🌱" },
        { value: "intermediate", label: "Intermediate", desc: "Regular exercise", icon: "💪" },
        { value: "advanced", label: "Advanced", desc: "Experienced athlete", icon: "🔥" }
      ],
      field: "fitness_level"
    },
    {
      step: 2,
      title: "How Old Are You?",
      subtitle: "Helps us customize your workouts",
      isInput: true,
      field: "age",
      placeholder: "Enter your age"
    },
    {
      step: 3,
      title: "What's Your Primary Goal?",
      subtitle: "We'll recommend the best path for you",
      options: [
        { value: "weight_loss", label: "Weight Loss", desc: "Burn fat & get lean", icon: "🔥" },
        { value: "muscle_gain", label: "Muscle Gain", desc: "Build strength & size", icon: "💪" },
        { value: "fitness_conditioning", label: "Fitness Conditioning", desc: "Overall health & endurance", icon: "⚡" }
      ],
      field: "fitness_goals"
    }
  ];

  const currentQuestion = questions.find(q => q.step === step);

  const handleSelect = (value) => {
    setAnswers({ ...answers, [currentQuestion.field]: value });
    if (step < 3) {
      setTimeout(() => setStep(step + 1), 300);
    }
  };

  const handleInputSubmit = () => {
    if (answers.age && parseInt(answers.age) > 0 && parseInt(answers.age) < 120) {
      setStep(step + 1);
    }
  };

  const handleFinish = () => {
    onComplete(answers);
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-2xl w-full"
      >
        <Card className="bg-card border-brand-blue/30">
          <CardContent className="p-6 sm:p-8">
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Question {step} of 3</span>
                <span className="text-sm text-brand-blue font-bold">{Math.round((step / 3) * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full gradient-bg"
                  initial={{ width: "0%" }}
                  animate={{ width: `${(step / 3) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Header */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                    {currentQuestion.title}
                  </h2>
                  <p className="text-gray-400">{currentQuestion.subtitle}</p>
                </div>

                {/* Input Field */}
                {currentQuestion.isInput ? (
                  <div className="space-y-4">
                    <Input
                      type="number"
                      value={answers[currentQuestion.field]}
                      onChange={(e) => setAnswers({ ...answers, [currentQuestion.field]: e.target.value })}
                      placeholder={currentQuestion.placeholder}
                      className="text-center text-2xl h-16 bg-background border-brand-blue/30"
                      autoFocus
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleInputSubmit();
                      }}
                    />
                    <Button
                      onClick={handleInputSubmit}
                      disabled={!answers[currentQuestion.field] || parseInt(answers[currentQuestion.field]) <= 0}
                      className="w-full gradient-bg text-white font-bold h-12"
                    >
                      Next →
                    </Button>
                  </div>
                ) : (
                  /* Options */
                  <div className="grid gap-4">
                    {currentQuestion.options.map((option) => (
                      <motion.button
                        key={option.value}
                        onClick={() => handleSelect(option.value)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-4 sm:p-6 rounded-xl border-2 transition-all text-left ${
                          answers[currentQuestion.field] === option.value
                            ? "border-brand-blue bg-brand-blue/20"
                            : "border-gray-700 bg-background hover:border-brand-blue/50"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-4xl">{option.icon}</div>
                          <div className="flex-1">
                            <div className="text-lg font-bold text-white">{option.label}</div>
                            <div className="text-sm text-gray-400">{option.desc}</div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* Finish Button */}
                {step === 3 && answers.fitness_goals && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6"
                  >
                    <Button
                      onClick={handleFinish}
                      className="w-full gradient-bg text-white font-bold h-14 text-lg"
                    >
                      <Trophy className="w-5 h-5 mr-2" />
                      Get My Recommendations
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}