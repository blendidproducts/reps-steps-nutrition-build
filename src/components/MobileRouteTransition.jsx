import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useRef, useEffect } from "react";

export default function MobileRouteTransition({ children }) {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  const isBackNavigation = location.state?.fromBack === true;

  useEffect(() => {
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  const variants = {
    initial: (isBack) => ({
      x: isBack ? '-100%' : '100%',
      opacity: 0
    }),
    animate: {
      x: 0,
      opacity: 1
    },
    exit: (isBack) => ({
      x: isBack ? '100%' : '-100%',
      opacity: 0
    })
  };

  return (
    <AnimatePresence mode="wait" custom={isBackNavigation}>
      <motion.div
        key={location.pathname}
        custom={isBackNavigation}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          type: 'tween',
          ease: 'easeInOut',
          duration: 0.3
        }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}