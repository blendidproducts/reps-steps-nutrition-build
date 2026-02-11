import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
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
  TrendingUp,
  Mic,
  Bluetooth,
  Shield,
  Volume2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Help() {
  const navigate = useNavigate();
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSending, setIsSending] = useState(false);
  
  // Check if we need to scroll to VCFS section
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('section') === 'vcfs') {
      setTimeout(() => {
        const element = document.getElementById('vcfs-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, []);

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
          <TabsList className="grid w-full grid-cols-5 bg-card border-border">
            <TabsTrigger value="getting-started" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground text-gray-400 hover:text-foreground">
              <Play className="w-4 h-4" />
              <span className="hidden sm:inline">Getting Started</span>
              <span className="sm:hidden">Start</span>
            </TabsTrigger>
            <TabsTrigger value="vcfs" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground text-gray-400 hover:text-foreground relative">
              <Mic className="w-4 h-4" />
              <span className="hidden sm:inline">VCFS™</span>
              <span className="sm:hidden">Voice</span>
              <span className="absolute -top-1 -right-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[8px] font-bold px-1 rounded-full">NEW</span>
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground text-gray-400 hover:text-foreground">
              <HelpCircle className="w-4 h-4" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="exercises" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground text-gray-400 hover:text-foreground">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Exercise Guide</span>
              <span className="sm:hidden">Guide</span>
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground text-gray-400 hover:text-foreground">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Feedback</span>
              <span className="sm:hidden">Feed</span>
            </TabsTrigger>
          </TabsList>

          {/* VCFS - Voice Control Fitness System */}
          <TabsContent value="vcfs" id="vcfs-section">
            <div className="space-y-6">
              {/* Prominent Enable Button at Top */}
              <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-2 border-purple-400 shadow-xl">
                <CardContent className="p-6 text-center">
                  <div className="inline-block p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mb-3">
                    <Mic className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">🎤 Enable Voice Control</h2>
                  <p className="text-gray-300 text-sm mb-4">
                    Start any workout and tap the purple microphone button to activate
                  </p>
                  <Button
                    onClick={() => navigate(createPageUrl("Exercises"))}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-lg px-8 py-6 rounded-xl shadow-2xl select-none"
                  >
                    <Mic className="w-6 h-6 mr-3" />
                    Start Workout & Enable Voice
                  </Button>
                  <p className="text-xs text-gray-400 mt-3">
                    Look for the purple AI microphone button at the top of the workout screen
                  </p>
                </CardContent>
              </Card>

              {/* Hero Card */}
              <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/50">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <div className="inline-block p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mb-4">
                      <Mic className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      Voice Control Fitness System™
                    </h2>
                    <p className="text-lg text-gray-300">Truly hands-free workouts powered by AI voice technology</p>
                  </div>
                </CardContent>
              </Card>

              {/* What is VCFS */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Target className="w-6 h-6 text-purple-400" />
                    What is VCFS™?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-300">
                    VCFS™ is our revolutionary AI-powered voice control system that lets you track workouts completely hands-free. No need to touch your phone during exercises - just speak your commands and your AI coach responds with audio guidance.
                  </p>
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                    <h4 className="font-bold text-purple-300 mb-2">Perfect for:</h4>
                    <ul className="text-gray-300 space-y-1">
                      <li>• Outdoor workouts and runs</li>
                      <li>• Intense exercises where you can't touch your phone</li>
                      <li>• Bluetooth headphone users</li>
                      <li>• Anyone who wants a more natural workout experience</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* How to Use VCFS */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Play className="w-6 h-6 text-purple-400" />
                    How to Use VCFS™
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {[
                      {
                        step: 1,
                        title: "Enable Permissions",
                        description: "First time setup requires microphone access. Tap 'Allow' when prompted by your browser.",
                        icon: Shield,
                        tips: ["Required: Microphone permission", "Optional: Bluetooth for wireless audio"]
                      },
                      {
                        step: 2,
                        title: "Activate Voice Control",
                        description: "In your active workout, tap the purple AI button in the top stats bar. You'll see a 'NEW AI' badge.",
                        icon: Mic,
                        tips: ["Look for the purple gradient button", "Status banner shows when active"]
                      },
                      {
                        step: 3,
                        title: "Say the Wake Command",
                        description: "Speak clearly: \"RNS reps and steps\" or \"R-N-S reps and steps\"",
                        icon: Volume2,
                        tips: ["Your AI coach will respond immediately", "Timer starts automatically", "Exercise name and target announced"]
                      },
                      {
                        step: 4,
                        title: "Complete & Record",
                        description: "When finished, say: \"[number] reps completed\" - Example: \"15 reps completed\"",
                        icon: Target,
                        tips: ["Reps auto-recorded instantly", "AI confirms your count", "No need to touch your phone"]
                      }
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.step} className="flex gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold">{item.step}</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                              <Icon className="w-5 h-5 text-purple-400" />
                              {item.title}
                            </h3>
                            <p className="text-gray-400 mb-2">{item.description}</p>
                            <div className="bg-gray-800/50 rounded-lg p-3">
                              <p className="text-xs font-semibold text-purple-300 mb-1">Tips:</p>
                              <ul className="text-xs text-gray-400 space-y-1">
                                {item.tips.map((tip, idx) => (
                                  <li key={idx}>• {tip}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Permissions & Setup */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Settings className="w-6 h-6 text-purple-400" />
                    Permissions & Setup
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border border-border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-bold text-green-400 mb-2">Microphone Access (Required)</h4>
                        <p className="text-sm text-gray-400 mb-2">
                          VCFS™ needs microphone permission to hear your voice commands. This is secure and only used during workouts.
                        </p>
                        <p className="text-xs text-gray-500">
                          If denied: Go to browser settings → Site permissions → Microphone → Allow for this site
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border border-border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Bluetooth className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-bold text-blue-400 mb-2">Bluetooth Headphones (Optional)</h4>
                        <p className="text-sm text-gray-400 mb-2">
                          For the best experience, connect Bluetooth headphones before starting. Your AI coach's audio will play directly in your ears.
                        </p>
                        <p className="text-xs text-gray-500">
                          Setup: Settings → Bluetooth → Pair your device → Start workout
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Voice Commands Reference */}
              <Card className="bg-gradient-to-br from-pink-900/20 to-purple-900/20 border-pink-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Volume2 className="w-6 h-6 text-pink-400" />
                    Voice Commands Reference
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <p className="font-bold text-pink-300 mb-2">Wake Command:</p>
                      <p className="text-white text-lg font-mono">"RNS reps and steps"</p>
                      <p className="text-xs text-gray-400 mt-1">Triggers AI coach guidance for current exercise</p>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <p className="font-bold text-pink-300 mb-2">Record Completion:</p>
                      <p className="text-white text-lg font-mono">"[number] reps completed"</p>
                      <p className="text-xs text-gray-400 mt-1">Examples: "10 reps completed", "25 reps completed"</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Troubleshooting */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <HelpCircle className="w-6 h-6 text-purple-400" />
                    Troubleshooting
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border-l-4 border-yellow-500 bg-yellow-500/10 p-4 rounded">
                      <p className="font-bold text-yellow-300 mb-1">AI not responding?</p>
                      <p className="text-sm text-gray-400">• Speak clearly and at normal volume</p>
                      <p className="text-sm text-gray-400">• Reduce background noise</p>
                      <p className="text-sm text-gray-400">• Check microphone permissions are enabled</p>
                    </div>
                    <div className="border-l-4 border-yellow-500 bg-yellow-500/10 p-4 rounded">
                      <p className="font-bold text-yellow-300 mb-1">Voice not recognized?</p>
                      <p className="text-sm text-gray-400">• Say the exact wake phrase: "RNS reps and steps"</p>
                      <p className="text-sm text-gray-400">• Pause briefly between words</p>
                      <p className="text-sm text-gray-400">• Try "R-N-S reps and steps" (spell out R-N-S)</p>
                    </div>
                    <div className="border-l-4 border-yellow-500 bg-yellow-500/10 p-4 rounded">
                      <p className="font-bold text-yellow-300 mb-1">Can't hear AI coach?</p>
                      <p className="text-sm text-gray-400">• Check device volume is up</p>
                      <p className="text-sm text-gray-400">• Verify Bluetooth connection if using headphones</p>
                      <p className="text-sm text-gray-400">• Make sure browser has audio permission</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

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