import React from "react";
import { AnimatePresence, motion } from "framer-motion";

type PageTransitionProps = {
  viewKey: string | number;
  children: React.ReactNode;
};

export function PageTransition({ viewKey, children }: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="min-h-[60vh]"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default PageTransition;