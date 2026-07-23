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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Key, ExternalLink, CheckCircle2, Cpu } from "lucide-react";

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
  const [model, setModel] = useState("gemini-2.5-flash");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/settings/gemini-key")
      .then((r) => r.json())
      .then((d) => {
        setMasked(d.masked || "");
        setKeySet(Boolean(d.keySet));
        if (d.model) setModel(d.model);
      })
      .catch(() => {});
  }, [open]);

  async function handleSave() {
    if (!keySet && !input.trim()) {
      toast.error("Enter your Gemini API key first.");
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, string> = { model };
      if (input.trim()) body.apiKey = input.trim();

      const res = await fetch("/api/settings/gemini-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings.");
      toast.success("Gemini settings saved.");
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
            Gemini Settings
          </DialogTitle>
          <DialogDescription>
            Configure your Gemini API key and model preferences. Key is stored
            securely on this server and used only for outreach generation and analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="rounded-lg bg-zyrix-cream-deep/60 border border-zyrix-line px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-zyrix-brown mb-1">
              Current status
            </p>
            {keySet ? (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-zyrix-green">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-mono">{masked}</span>
                </div>
                <span className="text-xs font-mono bg-zyrix-cream px-2 py-0.5 rounded border border-zyrix-line text-zyrix-brown">
                  {model}
                </span>
              </div>
            ) : (
              <p className="text-sm text-zyrix-ink-soft">
                No key set yet — AI features are disabled.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="gemini-key" className="text-zyrix-ink">
              {keySet ? "Update key (leave blank to keep current)" : "Paste your Gemini API key"}
            </Label>
            <Input
              id="gemini-key"
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={keySet ? "••••••••••••••••" : "AIza..."}
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
              .
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gemini-model" className="text-zyrix-ink flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-zyrix-brown" />
              Gemini Model Selection
            </Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="gemini-model" className="h-11 bg-white border-zyrix-line text-zyrix-ink">
                <SelectValue placeholder="Select Gemini model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-2.5-flash">
                  gemini-2.5-flash (Recommended — High quota)
                </SelectItem>
                <SelectItem value="gemini-1.5-flash">
                  gemini-1.5-flash (Fast & stable)
                </SelectItem>
                <SelectItem value="gemini-2.0-flash-lite">
                  gemini-2.0-flash-lite (Lightweight)
                </SelectItem>
                <SelectItem value="gemini-1.5-pro">
                  gemini-1.5-pro (Advanced reasoning)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-zyrix-ink-soft">
              If your chosen model hits quota limits, Zyrix automatically falls back to secondary flash models seamlessly.
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
            disabled={busy || (!keySet && !input.trim())}
            className="bg-zyrix-green hover:bg-zyrix-green-deep text-zyrix-cream"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Save settings"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
