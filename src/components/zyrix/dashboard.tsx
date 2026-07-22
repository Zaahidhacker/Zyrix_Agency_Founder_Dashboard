"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSession } from "@/hooks/use-session";
import { LoginScreen } from "./login-screen";
import { SettingsDialog } from "./settings-dialog";
import { LeadDiscovery } from "./lead-discovery";
import { Pipeline } from "./pipeline";
import { ScreenshotAnalysis } from "./screenshot-analysis";
import {
  Search,
  ClipboardList,
  Camera,
  Settings as SettingsIcon,
  LogOut,
  KeyRound,
  Sparkles,
} from "lucide-react";

type Tab = "discovery" | "pipeline" | "screenshots";

interface Lead {
  id: string;
  businessName: string;
  category: string | null;
}

export function Dashboard() {
  const { user, loading, geminiKeySet, refresh, logout } = useSession();
  const [tab, setTab] = useState<Tab>("discovery");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pipelineRefreshKey, setPipelineRefreshKey] = useState(0);

  const loadLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      setLeads(data.leads || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadLeads();
      setPipelineRefreshKey((k) => k + 1);
    }
  }, [user, loadLeads]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zyrix-cream">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-zyrix-tan border-t-zyrix-brown animate-spin" />
          <p className="text-sm text-zyrix-ink-soft">Loading Zyrix console…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const tabs: Array<{
    id: Tab;
    label: string;
    icon: React.ReactNode;
    desc: string;
  }> = [
    {
      id: "discovery",
      label: "Lead Discovery",
      icon: <Search className="w-4 h-4" />,
      desc: "Find businesses without a website",
    },
    {
      id: "pipeline",
      label: "Pipeline",
      icon: <ClipboardList className="w-4 h-4" />,
      desc: "Approve and schedule projects",
    },
    {
      id: "screenshots",
      label: "Screenshot Analysis",
      icon: <Camera className="w-4 h-4" />,
      desc: "Turn chats into build prompts",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-zyrix-cream">
      {/* Top navigation */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-zyrix-line">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 rounded-lg bg-green-gradient flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                <path
                  d="M8 6 L12 12 L8 18"
                  stroke="#d2b48c"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 6 L12 12 L16 18"
                  stroke="#d2b48c"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.5"
                />
              </svg>
            </div>
            <div className="hidden sm:block">
              <p className="font-display text-lg leading-none tracking-tight text-zyrix-ink">
                Zyrix
              </p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-zyrix-brown mt-0.5">
                Agency OS
              </p>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex-1 flex items-center justify-center gap-1">
            <TooltipProvider delayDuration={300}>
              {tabs.map((t) => (
                <Tooltip key={t.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setTab(t.id)}
                      className={`relative flex items-center gap-2 px-3 sm:px-4 h-10 rounded-lg text-sm font-medium transition-all ${
                        tab === t.id
                          ? "text-zyrix-green"
                          : "text-zyrix-ink-soft hover:text-zyrix-ink hover:bg-zyrix-cream/60"
                      }`}
                    >
                      {t.icon}
                      <span className="hidden sm:inline">{t.label}</span>
                      {tab === t.id && (
                        <motion.div
                          layoutId="active-tab"
                          className="absolute inset-0 bg-zyrix-green/8 rounded-lg -z-10"
                          transition={{
                            type: "spring",
                            stiffness: 350,
                            damping: 30,
                          }}
                        />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t.desc}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSettingsOpen(true)}
                    className={`h-9 gap-2 border-zyrix-line ${
                      geminiKeySet
                        ? "text-zyrix-green hover:bg-zyrix-green hover:text-zyrix-cream"
                        : "text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100"
                    }`}
                  >
                    {geminiKeySet ? (
                      <KeyRound className="w-3.5 h-3.5" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden md:inline">
                      {geminiKeySet ? "Gemini connected" : "Set Gemini key"}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {geminiKeySet
                      ? "Gemini API key is set. Click to update."
                      : "No Gemini key. AI features disabled."}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await logout();
                refresh();
              }}
              className="h-9 w-9 p-0 text-zyrix-ink-soft hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {tab === "discovery" && <LeadDiscovery />}
            {tab === "pipeline" && <Pipeline refreshKey={pipelineRefreshKey} />}
            {tab === "screenshots" && (
              <ScreenshotAnalysis leadOptions={leads} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-zyrix-line bg-white/50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-2 text-xs text-zyrix-ink-soft">
          <div className="flex items-center gap-3">
            <span>
              Signed in as{" "}
              <span className="font-medium text-zyrix-ink">{user.email}</span>
            </span>
            <Badge
              variant="outline"
              className="text-[10px] bg-zyrix-cream border-zyrix-line text-zyrix-brown"
            >
              Founder
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span>Zyrix · Dehiwala, Sri Lanka</span>
            <span className="text-zyrix-tan">·</span>
            <span>Built with Gemini + Overpass</span>
          </div>
        </div>
      </footer>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSaved={() => refresh()}
      />
    </div>
  );
}
