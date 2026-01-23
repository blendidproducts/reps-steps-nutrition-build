import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Zap, Target, Trophy, TrendingUp, Star, Moon, Sun, Dumbbell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { User } from "@/entities/User";

export default function Home() {
  const [isPro, setIsPro] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDarkMode, setIsDarkMode] = React.useState(true);
  const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/d1545e30c_repsandsteps_main_logo_2.png";
  const bannerUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/8866d855e_repsandSteps_name_banner.png";

  React.useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const user = await User.me();
        setIsPro(user.subscription_status === 'pro');
      } catch (error) {
        console.error("Failed to fetch user status:", error);
        setIsPro(false);
      }
      setIsLoading(false);
    };
    checkUserStatus();
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#ffffff';
    } else {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#0a0a0a';
    }
  };

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }}>
      {/* Theme Toggle Button - Fixed Position */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          onClick={toggleTheme}
          className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 rounded-full w-12 h-12 p-0"
          size="icon"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
      </div>

      {/* Hero Section */}
      <section style={{ backgroundColor: '#0a0a0a' }} className="text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 lg:py-20">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="flex justify-center mb-4 sm:mb-6 md:mb-8">
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 bg-gray-800/50 p-2 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-sm">
                <img src={logoUrl} alt="RepsAndSteps Logo" className="w-full h-full rounded-lg" />
              </div>
            </div>

            <div className="flex justify-center mb-3 sm:mb-4 md:mb-6">
              <img src={bannerUrl} alt="RepsAndSteps" className="h-6 sm:h-8 md:h-10 lg:h-12 xl:h-16 max-w-full px-4" />
            </div>
            
            {/* Hero Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="my-6 sm:my-8 md:my-10 lg:my-12 px-2 sm:px-4"
            >
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/da699ae1c_RnS_AppfrontScreen.png" 
                alt="Reps and Steps App"
                className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-2xl mx-auto rounded-lg sm:rounded-xl md:rounded-2xl shadow-2xl"
              />
            </motion.div>

            <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 md:mb-10 text-gray-300 max-w-2xl mx-auto px-4">
              Your ultimate calisthenics companion to track every rep and count every step.
            </p>

            {/* 7-Day Trial Offer - Prominent */}
            {!isPro && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="mb-6 sm:mb-8 max-w-2xl mx-auto px-4"
              >
                <a href="https://buy.stripe.com/aFa7sL4lM5muau82OpbQY0i" target="_blank" rel="noopener noreferrer">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 sm:p-5 rounded-xl border-2 border-green-400 shadow-2xl hover:scale-105 transition-transform cursor-pointer">
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                      <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-white animate-pulse" />
                      <div className="text-center">
                        <div className="text-white font-black text-xl sm:text-2xl">🔥 7-DAY TRIAL - START TODAY!</div>
                        <div className="text-green-100 text-sm sm:text-base font-bold">Only $3.99 - Try ALL PRO Features Risk-Free!</div>
                      </div>
                    </div>
                  </div>
                </a>
              </motion.div>
            )}

            {/* Choose Your Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.8 }}
              className="mb-8 sm:mb-10 px-4 max-w-4xl mx-auto"
            >
              <h3 className="text-2xl sm:text-3xl font-bold text-center mb-2 text-white">Choose Your Plan</h3>
              <p className="text-center text-gray-400 mb-6">AI Generator or Manual Builder</p>

              {/* WorkoutGenie AI - Featured */}
              <div className="mb-4">
                <Link to={isPro ? createPageUrl("Exercises") : createPageUrl("Pricing")}>
                  <div className={`relative bg-gradient-to-br from-yellow-500 via-orange-600 to-red-600 p-5 sm:p-6 rounded-xl border-4 ${
                    isPro ? 'border-yellow-300 shadow-2xl shadow-yellow-500/30' : 'border-yellow-500/50 opacity-90'
                  } hover:scale-[1.02] transition-transform cursor-pointer`}>
                    {!isPro && (
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-black text-yellow-400 font-bold border-2 border-yellow-400 text-xs px-2 py-0.5">⭐ PRO</Badge>
                      </div>
                    )}
                    <div className="flex items-start gap-3 sm:gap-4">
                      <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-white flex-shrink-0 animate-pulse" />
                      <div className="flex-1">
                        <h4 className="text-xl sm:text-2xl font-black mb-2 text-white">🧞 WorkoutGenie AI</h4>
                        <p className="text-white text-xs sm:text-sm mb-2 font-semibold">Just describe your workout - AI builds it instantly</p>
                        <ul className="space-y-1 text-xs text-white/95 font-medium">
                          <li>✨ Type in plain English - no complexity</li>
                          <li>⚡ Instant workout generation in seconds</li>
                          <li>🎯 Uses real exercises from our library</li>
                          <li>🔥 Perfect for any fitness level</li>
                        </ul>
                        <div className="mt-3 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-bold border border-white/20 inline-block">
                          💬 "18 min low intensity upper & lower mix"
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>

              {/* AI Auto Mode & Manual Builder */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Link to={isPro ? createPageUrl("AIWorkoutGenerator") : createPageUrl("Pricing")}>
                  <div className={`relative bg-gradient-to-br from-purple-600 to-indigo-700 p-4 sm:p-5 rounded-xl border-2 ${
                    isPro ? 'border-purple-300 shadow-xl shadow-purple-500/20' : 'border-purple-500/50 opacity-80'
                  } hover:scale-[1.02] transition-transform cursor-pointer h-full`}>
                    {!isPro && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-yellow-400 text-black font-bold text-xs px-2 py-0.5">⭐ PRO</Badge>
                      </div>
                    )}
                    <Zap className="w-7 h-7 sm:w-8 sm:h-8 mb-2 text-white" />
                    <h4 className="text-base sm:text-lg font-bold mb-1 text-white">AI Auto Mode</h4>
                    <p className="text-white/90 text-xs mb-2 font-medium">Smart AI creates complete workouts automatically</p>
                    <ul className="space-y-1 text-xs text-white/85">
                      <li>🎚️ Choose fitness level</li>
                      <li>⏱️ Set duration & intensity</li>
                      <li>🤖 AI picks exercises for you</li>
                      <li>🚀 Instant workout generation</li>
                    </ul>
                  </div>
                </Link>

                <Link to={createPageUrl("Exercises")}>
                  <div className="relative bg-gradient-to-br from-gray-700 to-gray-900 p-4 sm:p-5 rounded-xl border-2 border-green-500 hover:scale-[1.02] transition-transform cursor-pointer h-full shadow-xl shadow-green-500/10">
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-green-500 text-white font-bold text-xs px-2 py-0.5">✓ FREE</Badge>
                    </div>
                    <Dumbbell className="w-7 h-7 sm:w-8 sm:h-8 mb-2 text-green-400" />
                    <h4 className="text-base sm:text-lg font-bold mb-1 text-white">Manual Builder</h4>
                    <p className="text-white/90 text-xs mb-2 font-medium">Browse & select exercises yourself</p>
                    <ul className="space-y-1 text-xs text-white/85">
                      <li>📚 Browse 50+ exercises</li>
                      <li>✋ Pick your favorites</li>
                      <li>⚙️ Full control & customization</li>
                      <li>🆓 100% Free forever</li>
                    </ul>
                  </div>
                </Link>
              </div>

              <div className="mt-4 text-center">
                <p className="text-xs sm:text-sm text-green-400 font-semibold">👇 FREE USERS: Scroll down on Exercises page to manually build workouts</p>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="px-4 space-y-4"
            >
              {!isPro && !isLoading && (
                <div className="mb-4 max-w-2xl mx-auto">
                  <a href="https://buy.stripe.com/aFa7sL4lM5muau82OpbQY0i" target="_blank" rel="noopener noreferrer">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 rounded-xl border-2 border-green-400 shadow-xl hover:scale-105 transition-transform cursor-pointer">
                      <div className="flex items-center justify-center gap-3 flex-wrap">
                        <Zap className="w-6 h-6 text-white animate-pulse" />
                        <div className="text-center">
                          <div className="text-white font-black text-lg">🔥 7-DAY TRIAL - START TODAY!</div>
                          <div className="text-green-100 text-sm font-semibold">Only $3.99 - Try ALL PRO features!</div>
                        </div>
                      </div>
                    </div>
                  </a>
                </div>
              )}

              <Link to={createPageUrl("Exercises")} className="block">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto gradient-bg text-white hover:opacity-90 text-base sm:text-lg md:text-xl px-6 sm:px-8 md:px-12 py-3 sm:py-4 md:py-6 rounded-full font-bold shadow-lg hover:shadow-blue-500/30 transition-all duration-300 transform hover:scale-105 touch-manipulation"
                >
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
                  START FREE WORKOUT NOW
                </Button>
              </Link>
              
              {!isPro && !isLoading && (
                <div className="text-sm text-gray-400">
                  <p>Free Forever • No Credit Card Required</p>
                  <Link to={createPageUrl("Pricing")} className="text-brand-blue hover:underline font-semibold">
                    Or unlock PRO features with AI workouts & more →
                  </Link>
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* PRO Features Upgrade Banner */}
      {!isPro && !isLoading && (
        <section className="py-8 sm:py-12 md:py-16" style={{ backgroundColor: '#0a0a0a' }}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-600/10 border-2 border-yellow-500/30 shadow-xl">
                <CardContent className="p-6 sm:p-8 md:p-10 text-center">
                  <Star className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-400 mx-auto mb-4" />
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
                    Unlock PRO Features
                  </h2>
                  <p className="text-base sm:text-lg text-gray-300 mb-6 sm:mb-8 max-w-2xl mx-auto">
                    Get AI-powered workout generator, advanced analytics, preset programs, and unlimited saved workouts
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
                    <div className="text-center">
                      <div className="text-3xl sm:text-4xl font-bold text-yellow-400">$4.99</div>
                      <div className="text-sm text-gray-400">per month</div>
                    </div>
                    <div className="text-gray-500 hidden sm:block">or</div>
                    <div className="text-center">
                      <div className="text-3xl sm:text-4xl font-bold text-green-400">$39.99</div>
                      <div className="text-sm text-gray-400">lifetime access</div>
                    </div>
                  </div>

                  <Link to={createPageUrl("Pricing")}>
                    <Button 
                      size="lg" 
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black hover:opacity-90 text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold shadow-lg transform hover:scale-105 transition-all duration-300 touch-manipulation"
                    >
                      <Star className="w-5 h-5 mr-2" />
                      UPGRADE TO PRO
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-8 sm:py-12 md:py-16 lg:py-20" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8 sm:mb-12 md:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 px-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto px-4">
              Built for athletes who want to track, improve, and dominate their fitness goals.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Target,
                title: "Precision Tracking",
                description: "Count every rep, time every set, track steps with GPS. Advanced tracking with accuracy you can trust.",
                free: true
              },
              {
                icon: Zap,
                title: "AI Workout Generator",
                description: "Let AI create perfect workouts based on your goals, time, and intensity preferences.",
                free: false
              },
              {
                icon: Trophy,
                title: "Achievements & Progress",
                description: "Save workouts, track streaks, earn badges, and share your victories with the community.",
                free: true
              }
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.2, duration: 0.6 }}
                  whileHover={{ y: -5 }}
                  className="px-4"
                >
                  <Card className="h-full bg-card border-border shadow-lg hover:shadow-blue-500/20 transition-all duration-300 relative">
                    {!feature.free && (
                      <div className="absolute top-3 right-3">
                        <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full">PRO</span>
                      </div>
                    )}
                    <CardContent className="p-6 md:p-8 text-center">
                      <div className="w-14 h-14 md:w-16 md:h-16 gradient-bg rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                        <Icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4">
                        {feature.title}
                      </h3>
                      <p className="text-gray-400 leading-relaxed text-sm md:text-base">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-8 sm:py-12 md:py-16 lg:py-20 gradient-bg text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <TrendingUp className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 mx-auto mb-3 sm:mb-4 md:mb-6 text-white" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 md:mb-6 px-4">
              Start Your Transformation Today
            </h2>
            <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 md:mb-10 max-w-2xl mx-auto text-white/90 px-4">
              Free forever. No credit card. Start tracking reps and steps in under 60 seconds.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center px-4">
              <Link to={createPageUrl("Exercises")}>
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto bg-white text-black hover:bg-gray-100 text-base sm:text-lg md:text-xl px-6 sm:px-8 md:px-12 py-3 sm:py-4 md:py-6 rounded-full font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 touch-manipulation"
                >
                  <Play className="w-5 h-5 mr-2" />
                  START FREE WORKOUT
                </Button>
              </Link>
              
              {!isPro && !isLoading && (
                <Link to={createPageUrl("Pricing")}>
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto bg-yellow-400 text-black hover:bg-yellow-300 text-base sm:text-lg md:text-xl px-6 sm:px-8 md:px-12 py-3 sm:py-4 md:py-6 rounded-full font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 touch-manipulation"
                  >
                    <Star className="w-5 h-5 mr-2" />
                    GO PRO
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}