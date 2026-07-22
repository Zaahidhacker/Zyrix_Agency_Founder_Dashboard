"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Upload,
  Loader2,
  Sparkles,
  Copy,
  Check,
  ImageIcon,
  FileText,
  Wand2,
  X,
  ScrollText,
} from "lucide-react";

interface Lead {
  id: string;
  businessName: string;
  category: string | null;
}

interface ScreenshotRecord {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  leadId: string | null;
  masterPrompt: string | null;
  requirements: string | null;
  targetAudience: string | null;
  features: string | null;
  createdAt: string;
}

export function ScreenshotAnalysis({ leadOptions }: { leadOptions: Lead[] }) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [linkLead, setLinkLead] = useState<string>("none");
  const [uploading, setUploading] = useState(false);
  const [uploadedIds, setUploadedIds] = useState<
    Array<{ id: string; fileName: string }>
  >([]);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [results, setResults] = useState<
    Record<string, { requirements: any; masterPrompt: string }>
  >({});
  const [copied, setCopied] = useState<string | null>(null);
  const [history, setHistory] = useState<ScreenshotRecord[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<ScreenshotRecord | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const res = await fetch("/api/screenshots/analyze");
      const data = await res.json();
      setHistory(data.screenshots || []);
    } catch {
      // ignore
    }
  }

  const handleFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming).filter((f) =>
      f.type.startsWith("image/")
    );
    if (arr.length === 0) {
      toast.error("Please upload image files only.");
      return;
    }
    setFiles((prev) => [...prev, ...arr]);
    arr.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () =>
        setPreviews((p) => [...p, reader.result as string]);
      reader.readAsDataURL(f);
    });
  }, []);

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  async function uploadAndAnalyze() {
    if (files.length === 0) {
      toast.error("Add at least one screenshot first.");
      return;
    }
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const fd = new FormData();
        fd.append("file", f);
        fd.append("leadId", linkLead === "none" ? "" : linkLead);
        const upRes = await fetch("/api/screenshots/upload", {
          method: "POST",
          body: fd,
        });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error || "Upload failed.");

        setUploadedIds((prev) => [
          ...prev,
          { id: upData.id, fileName: upData.fileName },
        ]);

        // Analyze each one
        setAnalyzing(upData.id);
        const anRes = await fetch("/api/screenshots/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ screenshotId: upData.id }),
        });
        const anData = await anRes.json();
        if (!anRes.ok) throw new Error(anData.error || "Analysis failed.");

        setResults((prev) => ({
          ...prev,
          [upData.id]: {
            requirements: anData.screenshot.requirements,
            masterPrompt: anData.screenshot.masterPrompt,
          },
        }));
      }
      toast.success(
        `${files.length} screenshot${files.length > 1 ? "s" : ""} analyzed.`
      );
      setFiles([]);
      setPreviews([]);
      await loadHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setUploading(false);
      setAnalyzing(null);
    }
  }

  function copyPrompt(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="space-y-6">
      {/* Upload panel */}
      <div className="bg-white rounded-2xl border border-zyrix-line p-6 sm:p-8 shadow-warm">
        <div className="mb-6">
          <h2 className="font-display text-2xl tracking-tight text-zyrix-ink">
            Upload client conversation screenshots
          </h2>
          <p className="text-sm text-zyrix-ink-soft mt-1.5 max-w-2xl">
            Gemini reads each screenshot, extracts project requirements, and
            generates a master prompt that instructs an AI developer to build
            the client website using the full skill repository workflow.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.18em] text-zyrix-brown">
              Link to lead (optional)
            </Label>
            <Select value={linkLead} onValueChange={setLinkLead}>
              <SelectTrigger className="h-11 bg-zyrix-cream/40 border-zyrix-line">
                <SelectValue placeholder="No specific lead" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific lead</SelectItem>
                {leadOptions.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.businessName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={`relative rounded-xl border-2 border-dashed p-10 cursor-pointer transition-all ${
              dragOver
                ? "border-zyrix-green bg-zyrix-green/5"
                : "border-zyrix-line bg-zyrix-cream/30 hover:bg-zyrix-cream/60 hover:border-zyrix-brown/40"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-zyrix-brown/10 flex items-center justify-center">
                <Upload className="w-5 h-5 text-zyrix-brown" />
              </div>
              <p className="font-display text-lg text-zyrix-ink mb-1">
                Drop screenshots here or click to browse
              </p>
              <p className="text-xs text-zyrix-ink-soft">
                PNG, JPG, WebP — up to 8MB each. Multiple files supported.
              </p>
            </div>
          </div>

          {/* Previews */}
          {previews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {previews.map((src, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative group aspect-square rounded-lg overflow-hidden border border-zyrix-line bg-zyrix-cream"
                >
                  <img
                    src={src}
                    alt={`Preview ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          {previews.length > 0 && (
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setFiles([]);
                  setPreviews([]);
                }}
                className="border-zyrix-line"
              >
                Clear
              </Button>
              <Button
                onClick={uploadAndAnalyze}
                disabled={uploading}
                className="bg-zyrix-green hover:bg-zyrix-green-deep text-zyrix-cream"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {analyzing ? "Analyzing…" : "Uploading…"}
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Upload & analyze
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Recent analyses */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-zyrix-line shadow-warm overflow-hidden">
          <div className="px-6 py-4 border-b border-zyrix-line flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg text-zyrix-ink">
                Recent analyses
              </h3>
              <p className="text-xs text-zyrix-ink-soft mt-0.5">
                Click any analysis to view the full master prompt.
              </p>
            </div>
            <ScrollText className="w-5 h-5 text-zyrix-tan" />
          </div>
          <ScrollArea className="max-h-[400px]">
            <div className="divide-y divide-zyrix-line/60">
              {history
                .filter((h) => h.masterPrompt)
                .map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setSelectedHistory(h)}
                    className="w-full px-6 py-4 text-left hover:bg-zyrix-cream/40 transition-colors flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-lg bg-zyrix-cream-deep flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-4 h-4 text-zyrix-brown" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zyrix-ink truncate">
                        {h.fileName}
                      </p>
                      <p className="text-xs text-zyrix-ink-soft mt-0.5">
                        {new Date(h.createdAt).toLocaleString("en-GB")}
                        {h.targetAudience && ` · ${h.targetAudience.slice(0, 80)}`}
                      </p>
                    </div>
                    {h.masterPrompt && (
                      <Badge
                        variant="outline"
                        className="bg-zyrix-green/5 text-zyrix-green border-zyrix-green/30"
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        Master prompt ready
                      </Badge>
                    )}
                  </button>
                ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Live results (from this session) */}
      {uploadedIds.length > 0 && (
        <div className="space-y-4">
          {uploadedIds.map(({ id, fileName }) => {
            const r = results[id];
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-zyrix-line shadow-warm overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-zyrix-line flex items-center gap-3">
                  <FileText className="w-4 h-4 text-zyrix-brown" />
                  <p className="font-medium text-zyrix-ink truncate">
                    {fileName}
                  </p>
                  {r ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200 ml-auto"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Analyzed
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-200 ml-auto"
                    >
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Analyzing
                    </Badge>
                  )}
                </div>

                <AnimatePresence>
                  {r && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-6 space-y-4"
                    >
                      {/* Requirements summary */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field
                          label="Business"
                          value={r.requirements?.businessName || "—"}
                        />
                        <Field
                          label="Category"
                          value={r.requirements?.businessCategory || "—"}
                        />
                        <Field
                          label="Target audience"
                          value={r.requirements?.targetAudience || "—"}
                          full
                        />
                        <Field
                          label="Goals"
                          value={r.requirements?.websiteGoals || "—"}
                          full
                        />
                        <Field
                          label="Design preferences"
                          value={r.requirements?.designPreferences || "—"}
                          full
                        />
                        {r.requirements?.requiredFeatures?.length > 0 && (
                          <div className="space-y-1.5 md:col-span-2">
                            <p className="text-xs uppercase tracking-[0.18em] text-zyrix-brown">
                              Required features
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {r.requirements.requiredFeatures.map(
                                (f: string, i: number) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className="bg-zyrix-cream border-zyrix-line text-zyrix-ink-soft"
                                  >
                                    {f}
                                  </Badge>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Master prompt */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs uppercase tracking-[0.18em] text-zyrix-brown">
                            Master build prompt
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyPrompt(id, r.masterPrompt)}
                            className="h-7 text-xs border-zyrix-line text-zyrix-green hover:bg-zyrix-green hover:text-zyrix-cream"
                          >
                            {copied === id ? (
                              <>
                                <Check className="w-3 h-3 mr-1" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 mr-1" />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                        <pre className="text-xs font-mono text-zyrix-ink bg-zyrix-cream/40 border border-zyrix-line rounded-lg p-4 max-h-[400px] overflow-auto whitespace-pre-wrap leading-relaxed">
                          {r.masterPrompt}
                        </pre>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* History dialog */}
      <AnimatePresence>
        {selectedHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedHistory(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-warm-lg max-w-3xl w-full max-h-[88vh] overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-zyrix-line flex items-center justify-between">
                <div>
                  <p className="font-display text-lg text-zyrix-ink">
                    {selectedHistory.fileName}
                  </p>
                  <p className="text-xs text-zyrix-ink-soft mt-0.5">
                    {new Date(selectedHistory.createdAt).toLocaleString("en-GB")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedHistory(null)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-4">
                  {selectedHistory.requirements && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(JSON.parse(selectedHistory.requirements)).map(
                        ([k, v]: [string, any]) => (
                          <Field
                            key={k}
                            label={k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}
                            value={Array.isArray(v) ? v.join(", ") : String(v || "—")}
                            full={["websiteGoals", "designPreferences", "targetAudience", "specialInstructions", "contactInfo"].includes(k)}
                          />
                        )
                      )}
                    </div>
                  )}
                  {selectedHistory.masterPrompt && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.18em] text-zyrix-brown">
                          Master build prompt
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            copyPrompt(selectedHistory.id, selectedHistory.masterPrompt || "")
                          }
                          className="h-7 text-xs border-zyrix-line text-zyrix-green hover:bg-zyrix-green hover:text-zyrix-cream"
                        >
                          {copied === selectedHistory.id ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                      <pre className="text-xs font-mono text-zyrix-ink bg-zyrix-cream/40 border border-zyrix-line rounded-lg p-4 whitespace-pre-wrap leading-relaxed">
                        {selectedHistory.masterPrompt}
                      </pre>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={`space-y-1 ${full ? "md:col-span-2" : ""}`}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-zyrix-brown">
        {label}
      </p>
      <p className="text-sm text-zyrix-ink leading-relaxed">{value}</p>
    </div>
  );
}
