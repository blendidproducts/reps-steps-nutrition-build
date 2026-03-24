import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useRef, useEffect } from "react";
import { resolveTabForPath } from "@/hooks/useTabNavigator";

export default function MobileRouteTransition({ children }) {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  const prevTabRef = useRef(resolveTabForPath(location.pathname));
  const isBackNavigation = location.state?.fromBack === true;

  // Detect whether this is a tab switch (horizontal) vs in-tab push (also horizontal, forward)
  const currentTab = resolveTabForPath(location.pathname);
  const prevTab = prevTabRef.current;
  const isTabSwitch = currentTab !== prevTab && prevTab !== null;

  useEffect(() => {
    prevPathRef.current = location.pathname;
    prevTabRef.current = resolveTabForPath(location.pathname);
  }, [location.pathname]);

  const variants = {
    initial: (isBack) => ({
      x: isBack ? '-60%' : '60%',
      opacity: 0
    }),
    animate: {
      x: 0,
      opacity: 1
    },
    exit: (isBack) => ({
      x: isBack ? '60%' : '-60%',
      opacity: 0
    })
  };

  // Use a shorter, snappier transition for tab switches; slightly longer for in-tab pushes
  const transitionDuration = isTabSwitch ? 0.2 : 0.25;

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
          ease: [0.25, 0.46, 0.45, 0.94], // easeOutQuart — feels native
          duration: transitionDuration
        }}
        style={{ willChange: 'transform, opacity' }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}