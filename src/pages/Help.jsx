import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { 
  HelpCircle, 
  Play, 
  Timer, 
  Target, 
  Settings,
  MessageSquare,
  BookOpen,
  Video,
  ChevronDown,
  ChevronRight,
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Help() {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSending, setIsSending] = useState(false);

  const faqs = [
    {
      question: "How do I start a workout?",
      answer: "Go to the Exercises page, select your preferred exercises, click 'Create Workout', customize your settings, then hit 'START WORKOUT'. You can choose rep-based, time-based, or random workout types."
    },
    {
      question: "Can I track my progress over time?",
      answer: "Yes! Visit the History page to see all your completed workouts, including total reps, duration, calories burned, and detailed exercise breakdowns. Your stats are automatically saved after each session."
    },
    {
      question: "How does the rep counter work?",
      answer: "During your workout, tap the '+' button each time you complete a rep. The counter tracks your progress in real-time and saves your data automatically. You can also use the '-' button to adjust if needed."
    },
    {
      question: "What are the different workout types?",
      answer: "Rep-based: Set target reps for each exercise. Time-based: Work out for a set duration. Random: Let our AI create surprise workouts with varying reps and timing for maximum variety."
    },
    {
      question: "How do I customize my workout settings?",
      answer: "In the Settings page, you can adjust voice guidance, sound effects, display preferences, rest timers, and sharing options to personalize your workout experience."
    },
    {
      question: "Can I share my workout results?",
      answer: "Absolutely! After completing a workout or from your History, use the share button to post your achievements on social media or copy stats to your clipboard."
    },
    {
      question: "How accurate is the calorie counter?",
      answer: "Our calorie estimates are based on exercise intensity and duration. While generally accurate, actual calories burned can vary based on body weight, fitness level, and effort intensity."
    },
    {
      question: "What if I need to pause or stop my workout?",
      answer: "Use the pause button to take breaks - your progress is saved. The stop button ends your workout early and still saves your completed exercises to your history."
    }
  ];

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setIsSending(true);
    
    try {
      await base44.integrations.Core.SendEmail({
        to: 'info@repsandsteps.com',
        subject: `RepsAndSteps Feedback from ${feedbackForm.name}`,
        body: `
Name: ${feedbackForm.name}
Email: ${feedbackForm.email}

Message:
${feedbackForm.message}
        `
      });
      
      toast.success('Thank you for your feedback! We\'ll get back to you soon.');
      setFeedbackForm({ name: '', email: '', message: '' });
    } catch (error) {
      toast.error('Failed to send feedback. Please try again.');
    }
    
    setIsSending(false);
  };

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }}>
      <div className="gradient-bg text-white py-12">
        <div className="container mx-auto px-6">
          <h1 className="text-4xl font-bold mb-4">Help & Support</h1>
          <p className="text-xl text-white/90">
            Everything you need to master your calisthenics journey
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <Tabs defaultValue="getting-started" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-card border-border">
            <TabsTrigger value="getting-started" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground text-gray-400 hover:text-foreground">
              <Play className="w-4 h-4" />
              Getting Started
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground text-gray-400 hover:text-foreground">
              <HelpCircle className="w-4 h-4" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="exercises" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground text-gray-400 hover:text-foreground">
              <BookOpen className="w-4 h-4" />
              Exercise Guide
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground text-gray-400 hover:text-foreground">
              <MessageSquare className="w-4 h-4" />
              Feedback
            </TabsTrigger>
          </TabsList>

          {/* Getting Started */}
          <TabsContent value="getting-started">
            <div className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Play className="w-6 h-6 text-brand-blue" />
                    Quick Start Guide
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6">
                    {[
                      {
                        step: 1,
                        title: "Choose Your Exercises",
                        description: "Browse our library of 20+ calisthenics exercises. Use filters to find exercises by category (upper body, cardio, etc.) or difficulty level.",
                        icon: Target
                      },
                      {
                        step: 2,
                        title: "Build Your Workout",
                        description: "Select exercises and customize your workout. Choose rep-based for strength, time-based for endurance, or random for variety.",
                        icon: Settings
                      },
                      {
                        step: 3,
                        title: "Start Training",
                        description: "Follow along with voice guidance, track your reps with the counter, and take breaks when needed. Your progress is automatically saved.",
                        icon: Timer
                      },
                      {
                        step: 4,
                        title: "Track Progress",
                        description: "View your workout history, see your stats improve over time, and share your achievements with friends.",
                        icon: TrendingUp
                      }
                    ].map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <div key={index} className="flex gap-4">
                          <div className="w-12 h-12 gradient-bg rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold">{item.step}</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                              <Icon className="w-5 h-5 text-brand-blue" />
                              {item.title}
                            </h3>
                            <p className="text-gray-400">{item.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-brand-blue/10 border-brand-blue/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Video className="w-6 h-6 text-brand-blue" />
                    <h3 className="text-lg font-semibold text-brand-blue">Pro Tips for Success</h3>
                  </div>
                  <ul className="space-y-2 text-gray-300">
                    <li>• Start with beginner exercises and gradually increase difficulty</li>
                    <li>• Focus on proper form over rep count for better results</li>
                    <li>• Use the help button on each exercise to learn proper technique</li>
                    <li>• Set realistic goals and celebrate small victories</li>
                    <li>• Stay consistent - even 10 minutes daily makes a difference</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* FAQ */}
          <TabsContent value="faq">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <div key={index} className="border border-border rounded-lg">
                      <button
                        onClick={() => toggleFaq(index)}
                        className="w-full p-4 text-left hover:bg-gray-800/50 transition-colors flex items-center justify-between"
                      >
                        <span className="font-medium text-foreground">{faq.question}</span>
                        {expandedFaq === index ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      
                      <AnimatePresence>
                        {expandedFaq === index && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 pt-0 text-gray-400 border-t border-border">
                              {faq.answer}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Exercise Guide */}
          <TabsContent value="exercises">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Exercise Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  {
                    category: "Upper Body",
                    color: "bg-red-900/50 text-red-300 border-red-500/30",
                    exercises: ["Push-ups", "Diamond Push-ups", "Pike Press Push-ups"],
                    description: "Build strength in chest, shoulders, arms, and upper back"
                  },
                  {
                    category: "Lower Body", 
                    color: "bg-sky-900/50 text-sky-300 border-sky-500/30",
                    exercises: ["Squats", "Lunges", "Calf Raises", "Wall Sits"],
                    description: "Develop power in legs, glutes, and lower body stability"
                  },
                  {
                    category: "Core",
                    color: "bg-yellow-900/50 text-yellow-300 border-yellow-500/30", 
                    exercises: ["Plank", "Sit-ups", "Russian Twists", "Dead Bug"],
                    description: "Strengthen your core for better posture and stability"
                  },
                  {
                    category: "Cardio",
                    color: "bg-green-900/50 text-green-300 border-green-500/30",
                    exercises: ["Jumping Jacks", "Mountain Climbers", "High Knees"],
                    description: "Improve cardiovascular health and burn calories"
                  },
                  {
                    category: "Full Body",
                    color: "bg-purple-900/50 text-purple-300 border-purple-500/30",
                    exercises: ["Burpees", "Star Jumps", "Bear Crawl"],
                    description: "Challenge multiple muscle groups simultaneously"
                  }
                ].map((category, index) => (
                  <div key={index} className="border border-border rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${category.color}`}>
                        {category.category}
                      </span>
                    </div>
                    <p className="text-gray-400 mb-4">{category.description}</p>
                    <div className="flex gap-2 flex-wrap">
                      {category.exercises.map((exercise, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-800 rounded text-sm text-gray-300">
                          {exercise}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feedback */}
          <TabsContent value="feedback">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Send Feedback</CardTitle>
                <p className="text-gray-400">
                  Help us improve RepsAndSteps by sharing your thoughts and suggestions
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Name</label>
                      <Input
                        value={feedbackForm.name}
                        onChange={(e) => setFeedbackForm({...feedbackForm, name: e.target.value})}
                        placeholder="Your name"
                        className="bg-background border-border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <Input
                        type="email"
                        value={feedbackForm.email}
                        onChange={(e) => setFeedbackForm({...feedbackForm, email: e.target.value})}
                        placeholder="your.email@example.com"
                        className="bg-background border-border"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Message</label>
                    <Textarea
                      value={feedbackForm.message}
                      onChange={(e) => setFeedbackForm({...feedbackForm, message: e.target.value})}
                      placeholder="Share your feedback, suggestions, or report any issues..."
                      rows={6}
                      required
                      className="bg-background border-border"
                    />
                  </div>
                  
                  <Button type="submit" disabled={isSending} className="gradient-bg hover:opacity-90">
                    {isSending ? 'Sending...' : 'Send Feedback'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}