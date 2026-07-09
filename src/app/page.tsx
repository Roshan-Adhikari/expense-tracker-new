"use client";

import { motion } from "framer-motion";
import { ArrowRight, DollarSign, Users, Shield, Share2 } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden flex flex-col justify-between">
      {/* Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 -right-40 w-[600px] h-[600px] bg-accent/15 rounded-full blur-[120px]" />
      </div>

      {/* Grid Pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(124,58,237,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.5) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Navigation */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center neon-glow">
          <span className="text-white font-extrabold text-xl">E</span>
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-300">
            Expense Tracker
          </span>
        </div>
        <Link
          href="/login"
          className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition-all"
        >
          Sign In
        </Link>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 md:py-24 text-center flex-1 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <Badge>Announcing Expense Tracker 1.0</Badge>
          <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight mt-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-accent leading-[1.1]">
            Track & Split Expenses <br className="hidden md:inline" />
            With Zero Friction
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mt-6 leading-relaxed">
            Experience the next generation of expense tracking. Log personal transactions, invite friends, create shared groups, and automate splits with instant notifications.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/95 text-white font-semibold px-8 py-3.5 rounded-xl transition-all neon-glow"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground font-semibold px-8 py-3.5 rounded-xl border border-white/5 transition-all"
            >
              Explore Features
            </a>
          </div>
        </motion.div>

        {/* Feature Cards Preview */}
        <motion.section
          id="features"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 text-left"
        >
          <div className="glass p-6 rounded-2xl border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-2">Smart Personal Tracking</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Log category-based expenses on a mobile-first dashboard. Perfect for keeping tabs on your day-to-day spending.
            </p>
          </div>

          <div className="glass p-6 rounded-2xl border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4 border border-accent/20">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <h3 className="font-bold text-lg mb-2">Seamless Social Invites</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Connect with friends by entering their email. If they don&apos;t have an account, they get a custom email invitation instantly.
            </p>
          </div>

          <div className="glass p-6 rounded-2xl border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20">
              <Share2 className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="font-bold text-lg mb-2">Group Split & Alerts</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Create groups for trips or shared living. Customize split amounts and receive real-time transactional email notifications.
            </p>
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-white/5 text-center text-xs text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Expense Tracker App. Built for modern, borderless shared tracking.</p>
      </footer>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold bg-primary/10 border border-primary/20 text-primary uppercase tracking-wider">
      {children}
    </span>
  );
}
