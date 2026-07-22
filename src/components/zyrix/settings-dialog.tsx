"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Key, ExternalLink, CheckCircle2 } from "lucide-react";

export function SettingsDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}) {
  const [masked, setMasked] = useState<string>("");
  const [keySet, setKeySet] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/settings/gemini-key")
      .then((r) => r.json())
      .then((d) => {
        setMasked(d.masked || "");
        setKeySet(Boolean(d.keySet));
      })
      .catch(() => {});
  }, [open]);

  async function handleSave() {
    if (!input.trim()) {
      toast.error("Enter your Gemini API key first.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/settings/gemini-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save key.");
      toast.success("Gemini API key saved.");
      setInput("");
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    setBusy(true);
    try {
      await fetch("/api/settings/gemini-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "" }),
      });
      toast.success("Gemini API key cleared.");
      setMasked("");
      setKeySet(false);
      onSaved?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-tight flex items-center gap-2">
            <Key className="w-5 h-5 text-zyrix-brown" />
            Gemini API Key
          </DialogTitle>
          <DialogDescription>
            This key powers AI outreach drafts and screenshot analysis. It is
            stored locally on this server and never sent anywhere except
            Google&apos;s Gemini API.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-zyrix-cream-deep/60 border border-zyrix-line px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-zyrix-brown mb-1">
              Current status
            </p>
            {keySet ? (
              <div className="flex items-center gap-2 text-sm text-zyrix-green">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-mono">{masked}</span>
              </div>
            ) : (
              <p className="text-sm text-zyrix-ink-soft">
                No key set yet — AI features are disabled.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="gemini-key" className="text-zyrix-ink">
              {keySet ? "Update key" : "Paste your Gemini API key"}
            </Label>
            <Input
              id="gemini-key"
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="AIza..."
              className="h-11 font-mono text-sm bg-white border-zyrix-line focus:border-zyrix-brown"
              autoComplete="off"
            />
            <p className="text-xs text-zyrix-ink-soft">
              Get a free key at{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zyrix-brown hover:text-zyrix-green inline-flex items-center gap-1 link-underline"
              >
                Google AI Studio
                <ExternalLink className="w-3 h-3" />
              </a>
              . The free tier is generous and sufficient for this platform.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {keySet && (
            <Button
              variant="ghost"
              onClick={handleClear}
              disabled={busy}
              className="text-red-700 hover:text-red-800 hover:bg-red-50"
            >
              Clear key
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={busy || !input.trim()}
            className="bg-zyrix-green hover:bg-zyrix-green-deep text-zyrix-cream"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Save key"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
