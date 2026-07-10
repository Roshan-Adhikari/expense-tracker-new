"use client";

import { motion } from "framer-motion";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4">
        {/* Animated Outer Ring */}
        <div className="relative w-16 h-16">
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-primary/20"
            style={{ borderTopColor: "#7C3AED" }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border-4 border-accent/20"
            style={{ borderBottomColor: "#db2777" }}
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          />
        </div>

        {/* Loading text */}
        <motion.p
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        >
          Syncing Ledger...
        </motion.p>
      </div>
    </div>
  );
}
