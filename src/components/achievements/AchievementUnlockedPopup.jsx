import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';

export default function AchievementUnlockedPopup({ achievement, onClose }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (achievement) {
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Auto-close after 5 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [achievement]);

  const handleClose = () => {
    setShow(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!achievement) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotateY: -180 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotateY: 180 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 border-2 border-brand-blue"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="flex justify-center mb-6"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-brand-blue/20 rounded-full blur-xl animate-pulse"></div>
                  <img 
                    src={achievement.icon_url} 
                    alt={achievement.title}
                    className="w-32 h-32 relative z-10 drop-shadow-2xl"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                  <h2 className="text-2xl font-bold text-white">Achievement Unlocked!</h2>
                  <Trophy className="w-6 h-6 text-yellow-400" />
                </div>
                
                <h3 className="text-3xl font-black text-brand-blue mb-2">
                  {achievement.title}
                </h3>
                
                <p className="text-gray-300 text-lg mb-6">
                  {achievement.description}
                </p>

                <div className="bg-black/30 rounded-lg p-4 mb-6">
                  <p className="text-white/80 text-sm">
                    Category: <span className="text-brand-blue font-semibold">{achievement.category?.toUpperCase()}</span>
                  </p>
                </div>

                <Button
                  onClick={handleClose}
                  className="w-full bg-brand-blue hover:bg-brand-blue-dark text-white font-bold py-3"
                >
                  Awesome!
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}