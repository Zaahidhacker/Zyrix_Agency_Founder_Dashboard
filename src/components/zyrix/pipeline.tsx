"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Phone,
  Mail,
  MapPin,
  Globe,
  MessageCircle,
  Calendar,
  Trash2,
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  Inbox,
} from "lucide-react";

interface Lead {
  id: string;
  businessName: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  websiteStatus: string;
  status: string;
  approved: boolean;
  projectDeliveryDate: string | null;
  conversationHistory: string | null;
  createdAt: string;
  outrechMessages: Array<{
    id: string;
    channel: string;
    content: string;
    createdAt: string;
  }>;
}

const STATUS_META: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  discovered: {
    label: "Discovered",
    color: "text-zyrix-ink-soft",
    bg: "bg-zyrix-cream-deep",
    border: "border-zyrix-line",
  },
  contacted: {
    label: "Contacted",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  approved: {
    label: "Approved",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  declined: {
    label: "Declined",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
};

export function Pipeline({ refreshKey }: { refreshKey: number }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [approvalLead, setApprovalLead] = useState<Lead | null>(null);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [historyLead, setHistoryLead] = useState<Lead | null>(null);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      setLeads(data.leads || []);
    } catch {
      toast.error("Failed to load pipeline.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads, refreshKey]);

  const filtered = leads.filter((l) => {
    if (filter === "all") return true;
    return l.status === filter;
  });

  const stats = {
    total: leads.length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    approved: leads.filter((l) => l.status === "approved").length,
    discovered: leads.filter((l) => l.status === "discovered").length,
  };

  async function toggleApproved(lead: Lead, checked: boolean) {
    if (checked) {
      setApprovalLead(lead);
      setDeliveryDate(
        lead.projectDeliveryDate
          ? lead.projectDeliveryDate.split("T")[0]
          : defaultDate()
      );
    } else {
      // Unapprove
      try {
        const res = await fetch(`/api/leads/${lead.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approved: false,
            status: "contacted",
            projectDeliveryDate: null,
          }),
        });
        if (!res.ok) throw new Error("Update failed");
        toast.success(`${lead.businessName} moved back to contacted.`);
        loadLeads();
      } catch {
        toast.error("Failed to update lead.");
      }
    }
  }

  async function confirmApproval() {
    if (!approvalLead) return;
    if (!deliveryDate) {
      toast.error("Please select a target delivery date.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/leads/${approvalLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approved: true,
          status: "approved",
          projectDeliveryDate: new Date(deliveryDate).toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success(
        `${approvalLead.businessName} approved. Target: ${new Date(
          deliveryDate
        ).toLocaleDateString()}.`
      );
      setApprovalLead(null);
      loadLeads();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name} from pipeline?`)) return;
    try {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success(`${name} removed.`);
      loadLeads();
    } catch {
      toast.error("Failed to delete lead.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total leads" value={stats.total} icon={<Inbox className="w-4 h-4" />} />
        <StatCard label="Discovered" value={stats.discovered} icon={<Building2 className="w-4 h-4" />} />
        <StatCard label="Contacted" value={stats.contacted} icon={<Clock className="w-4 h-4" />} />
        <StatCard label="Approved" value={stats.approved} icon={<CheckCircle2 className="w-4 h-4" />} />
      </div>

      {/* Filter + list */}
      <div className="bg-white rounded-2xl border border-zyrix-line shadow-warm overflow-hidden">
        <div className="px-6 py-4 border-b border-zyrix-line flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-display text-xl tracking-tight text-zyrix-ink">
            Pipeline
          </h2>
          <div className="flex items-center gap-1.5 flex-wrap">
            {["all", "discovered", "contacted", "approved", "declined"].map(
              (f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "ghost"}
                  onClick={() => setFilter(f)}
                  className={
                    filter === f
                      ? "h-8 bg-zyrix-green text-zyrix-cream hover:bg-zyrix-green-deep capitalize"
                      : "h-8 text-zyrix-ink-soft hover:text-zyrix-ink capitalize"
                  }
                >
                  {f}
                </Button>
              )
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-zyrix-brown mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-zyrix-tan mx-auto mb-4" />
            <p className="font-display text-xl text-zyrix-ink mb-2">
              {leads.length === 0 ? "Pipeline is empty" : "No leads in this stage"}
            </p>
            <p className="text-sm text-zyrix-ink-soft">
              {leads.length === 0
                ? "Go to Lead Discovery and save your first prospect."
                : "Try a different filter above."}
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[700px]">
            <div className="divide-y divide-zyrix-line/60">
              <AnimatePresence>
                {filtered.map((lead) => {
                  const meta = STATUS_META[lead.status] || STATUS_META.discovered;
                  return (
                    <motion.div
                      key={lead.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-6 py-5 hover:bg-zyrix-cream/30 transition-colors"
                    >
                      <div className="flex items-start gap-4 flex-wrap">
                        {/* Approve checkbox */}
                        <div className="pt-1">
                          <Checkbox
                            checked={lead.approved}
                            onCheckedChange={(v) =>
                              toggleApproved(lead, v === true)
                            }
                            className="border-zyrix-brown/40 data-[state=checked]:bg-zyrix-green data-[state=checked]:border-zyrix-green w-5 h-5"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-zyrix-ink">
                              {lead.businessName}
                            </h3>
                            <Badge
                              variant="outline"
                              className={`${meta.bg} ${meta.color} ${meta.border} text-[10px]`}
                            >
                              {meta.label}
                            </Badge>
                            {lead.category && (
                              <span className="text-xs text-zyrix-ink-soft">
                                · {lead.category}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-zyrix-ink-soft">
                            {lead.address && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {lead.address}
                              </span>
                            )}
                            {lead.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {lead.phone}
                              </span>
                            )}
                            {lead.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {lead.email}
                              </span>
                            )}
                          </div>

                          {lead.approved && lead.projectDeliveryDate && (
                            <div className="mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Calendar className="w-3 h-3" />
                              Delivery target:{" "}
                              {new Date(lead.projectDeliveryDate).toLocaleDateString(
                                "en-GB",
                                { day: "numeric", month: "short", year: "numeric" }
                              )}
                            </div>
                          )}

                          {lead.outrechMessages.length > 0 && (
                            <button
                              onClick={() => setHistoryLead(lead)}
                              className="mt-2 text-xs text-zyrix-brown hover:text-zyrix-green link-underline"
                            >
                              View conversation history ({lead.outrechMessages.length})
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {lead.whatsapp && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                window.open(
                                  `https://wa.me/${lead.whatsapp}`,
                                  "_blank",
                                  "noopener,noreferrer"
                                )
                              }
                              className="h-8 w-8 p-0 text-zyrix-green hover:bg-zyrix-green hover:text-zyrix-cream"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {lead.websiteStatus !== "none" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-zyrix-brown hover:bg-zyrix-brown hover:text-zyrix-cream"
                              onClick={() => {
                                // For demo, just show toast since we don't store website URL on Lead
                                toast.info("Website URL not stored in pipeline view.");
                              }}
                            >
                              <Globe className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(lead.id, lead.businessName)}
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Approval date dialog */}
      <Dialog
        open={Boolean(approvalLead)}
        onOpenChange={(v) => !v && setApprovalLead(null)}
      >
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-tight text-zyrix-ink">
              Set project delivery date
            </DialogTitle>
            <DialogDescription>
              {approvalLead?.businessName} confirmed they want a website.
              When should we deliver the first version?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label className="text-zyrix-ink">Target delivery date</Label>
            <Input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="h-11 bg-zyrix-cream/40 border-zyrix-line"
            />
            <p className="text-xs text-zyrix-ink-soft">
              You can change this later from the pipeline. The lead will be
              marked as <strong>Approved</strong>.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setApprovalLead(null)}
              className="border-zyrix-line"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmApproval}
              disabled={busy || !deliveryDate}
              className="bg-zyrix-green hover:bg-zyrix-green-deep text-zyrix-cream"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Confirm approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conversation history dialog */}
      <Dialog
        open={Boolean(historyLead)}
        onOpenChange={(v) => !v && setHistoryLead(null)}
      >
        <DialogContent className="sm:max-w-2xl bg-white max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-tight text-zyrix-ink">
              Conversation with {historyLead?.businessName}
            </DialogTitle>
            <DialogDescription>
              Every outreach draft generated for this lead.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[55vh] flex-1">
            <div className="space-y-3 pr-2">
              {historyLead?.outrechMessages
                .slice()
                .reverse()
                .map((m) => (
                  <div
                    key={m.id}
                    className="rounded-lg border border-zyrix-line bg-zyrix-cream/40 p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-white border-zyrix-line text-zyrix-brown capitalize"
                      >
                        {m.channel}
                      </Badge>
                      <span className="text-[11px] text-zyrix-ink-soft">
                        {new Date(m.createdAt).toLocaleString("en-GB")}
                      </span>
                    </div>
                    <pre className="text-sm text-zyrix-ink whitespace-pre-wrap font-sans leading-relaxed">
                      {m.content}
                    </pre>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-zyrix-line p-5 shadow-warm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-[0.18em] text-zyrix-brown">
          {label}
        </p>
        <span className="text-zyrix-tan">{icon}</span>
      </div>
      <p className="font-display text-3xl text-zyrix-ink tracking-tight">
        {value}
      </p>
    </div>
  );
}

function defaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().split("T")[0];
}
