"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/use-session";
import { Loader2, Lock, Mail, ArrowRight } from "lucide-react";

export function LoginScreen() {
  const { login } = useSession();
  const [email, setEmail] = useState("zyrix@founder.agency");
  const [password, setPassword] = useState("Zaahid2290");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-zyrix-cream">
      {/* Left — brand panel */}
      <div className="relative lg:w-1/2 min-h-[40vh] lg:min-h-screen bg-green-gradient text-zyrix-cream overflow-hidden flex items-center">
        {/* Decorative grain */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(210, 180, 140, 1) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Floating tan orb */}
        <motion.div
          className="absolute -right-32 -top-32 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #d2b48c 0%, transparent 70%)" }}
          animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -left-24 -bottom-24 w-80 h-80 rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(circle, #8b5a2b 0%, transparent 70%)" }}
          animate={{ y: [0, -15, 0], x: [0, 12, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 px-8 sm:px-12 lg:px-16 py-16 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-3 mb-12">
              <ZyrixMark className="w-10 h-10" />
              <div>
                <p className="font-display text-2xl tracking-tight leading-none">
                  Zyrix
                </p>
                <p className="text-[11px] uppercase tracking-[0.22em] text-zyrix-tan mt-1">
                  Web Agency OS
                </p>
              </div>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight text-balance">
              The operating system for{" "}
              <span className="text-zyrix-tan italic">ambitious</span> web
              agency work.
            </h1>

            <p className="mt-8 text-zyrix-cream/80 text-lg leading-relaxed text-pretty max-w-xl">
              Discover local businesses without a website, draft outreach in
              seconds with Gemini, and turn client conversations into
              production-ready build briefs — all from one quiet, focused
              control room in Dehiwala.
            </p>

            <div className="mt-12 flex flex-wrap gap-3">
              {[
                "Free Overpass business search",
                "Gemini-powered outreach",
                "Screenshot to master prompt",
              ].map((tag, i) => (
                <motion.span
                  key={tag}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.08, duration: 0.5 }}
                  className="text-xs px-3 py-1.5 rounded-full border border-zyrix-tan/30 text-zyrix-tan/90 bg-zyrix-tan/5"
                >
                  {tag}
                </motion.span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="absolute bottom-8 left-8 sm:left-12 lg:left-16 right-8 flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-zyrix-cream/40"
          >
            <span>Dehiwala, Sri Lanka</span>
            <span>v1.0</span>
          </motion.div>
        </div>
      </div>

      {/* Right — auth form */}
      <div className="lg:w-1/2 flex-1 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="mb-10">
            <p className="text-xs uppercase tracking-[0.22em] text-zyrix-brown mb-3">
              Founder Access
            </p>
            <h2 className="font-display text-3xl tracking-tight text-zyrix-ink">
              Sign in to your console
            </h2>
            <p className="mt-3 text-zyrix-ink-soft text-sm leading-relaxed">
              Use your founder credentials. Your session stays on this device.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zyrix-ink font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zyrix-brown/60" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-white border-zyrix-line focus:border-zyrix-brown focus:ring-zyrix-brown/20"
                  placeholder="zyrix@founder.agency"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zyrix-ink font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zyrix-brown/60" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 bg-white border-zyrix-line focus:border-zyrix-brown focus:ring-zyrix-brown/20"
                  placeholder="Enter password"
                  required
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3"
              >
                {error}
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="w-full h-12 bg-zyrix-green hover:bg-zyrix-green-deep text-zyrix-cream font-medium tracking-wide group"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying…
                </>
              ) : (
                <>
                  Enter console
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-zyrix-line">
            <p className="text-xs text-zyrix-ink-soft leading-relaxed">
              <span className="font-medium text-zyrix-ink">Demo note:</span>{" "}
              The platform stores its data locally on this server. Only the
              founder email is authorized. After signing in, paste your Gemini
              API key in Settings to enable AI outreach and screenshot
              analysis.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function ZyrixMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="10"
        stroke="#d2b48c"
        strokeWidth="1.5"
        opacity="0.4"
      />
      <path
        d="M16 14 L24 24 L16 34"
        stroke="#d2b48c"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 14 L24 24 L32 34"
        stroke="#d2b48c"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
      <circle cx="24" cy="24" r="2" fill="#d2b48c" />
    </svg>
  );
}
