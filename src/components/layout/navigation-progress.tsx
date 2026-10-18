"use client";

import React, { createContext, useContext, useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface NavigationContextType {
  isNavigating: boolean;
  startNavigation: (callback: () => void) => void;
}

const NavigationContext = createContext<NavigationContextType>({
  isNavigating: false,
  startNavigation: (cb) => cb(),
});

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [isPending, startTransition] = useTransition();
  const [activeRouteTransition, setActiveRouteTransition] = useState(false);
  const pathname = usePathname();

  // Reset progress bar whenever route successfully completes transition
  useEffect(() => {
    setActiveRouteTransition(false);
  }, [pathname]);

  const startNavigation = (callback: () => void) => {
    setActiveRouteTransition(true);
    startTransition(() => {
      callback();
    });
  };

  const isNavigating = isPending || activeRouteTransition;

  return (
    <NavigationContext.Provider value={{ isNavigating, startNavigation }}>
      {/* Top restrained monochrome progress treatment */}
      <AnimatePresence>
        {isNavigating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-transparent pointer-events-none"
          >
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "85%" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="h-full bg-[#17191C] dark:bg-[#F1F2F3] shadow-[0_0_8px_rgba(0,0,0,0.3)] dark:shadow-[0_0_8px_rgba(255,255,255,0.4)]"
            />
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  return useContext(NavigationContext);
}
