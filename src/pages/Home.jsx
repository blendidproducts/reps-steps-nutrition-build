import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Zap, Target, Trophy, TrendingUp, Star, Moon, Sun } from "lucide-react";
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
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/d8912cfd2_Jace_RepsandSteps_bluemodel_female1.png" 
                alt="Fitness Models"
                className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl mx-auto rounded-xl sm:rounded-2xl shadow-2xl"
              />
            </motion.div>

            <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 md:mb-10 text-gray-300 max-w-2xl mx-auto px-4">
              Your ultimate calisthenics companion to track every rep and count every step.
            </p>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="px-4 space-y-4"
            >
              <Link to={createPageUrl("Exercises")} className="block">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto gradient-bg text-white hover:opacity-90 text-base sm:text-lg md:text-xl px-6 sm:px-8 md:px-12 py-3 sm:py-4 md:py-6 rounded-full font-bold shadow-lg hover:shadow-blue-500/30 transition-all duration-300 transform hover:scale-105 touch-manipulation"
                >
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
                  BEGIN WORKOUT
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

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
              Why Reps & Steps?
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
                description: "Count every rep, time every set. Advanced tracking with accuracy you can trust.",
              },
              {
                icon: Zap,
                title: "Smart Workouts",
                description: "Choose from our exercise library, create custom workouts, or let our AI randomizer challenge you.",
              },
              {
                icon: Trophy,
                title: "Share Victories",
                description: "Save your achievements and share your progress. Inspire others with your dedication.",
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
                  <Card className="h-full bg-card border-border shadow-lg hover:shadow-blue-500/20 transition-all duration-300">
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
              Ready to Transform Your Training?
            </h2>
            <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 md:mb-10 max-w-2xl mx-auto text-white/90 px-4">
              Join thousands of athletes who trust Reps & Steps to track their calisthenics journey.
            </p>
            
            <Link to={createPageUrl("Exercises")} className="inline-block">
              <Button 
                size="lg" 
                className="w-full sm:w-auto bg-white text-black hover:bg-brand-blue hover:text-white text-base sm:text-lg md:text-xl px-6 sm:px-8 md:px-12 py-3 sm:py-4 md:py-6 rounded-full font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 touch-manipulation"
              >
                START YOUR JOURNEY
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}