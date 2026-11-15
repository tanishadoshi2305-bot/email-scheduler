import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  LogOut,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { emailsApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import BrandStamp from "../components/BrandStamp";
import StarburstIcon from "../components/StarburstIcon";
import EmptyState from "../components/EmptyState";
import ComposeModal from "../components/ComposeModal";
import EmailInspectorDrawer from "../components/EmailInspectorDrawer";
import { getTemplateMeta } from "../components/StationeryPreview";
import { exportEmailsToCsv } from "../utils/csv";

function toLocalDateTimeInput(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function formatDateTime(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeCountdown(isoString, nowMs = Date.now()) {
  if (!isoString) return "";
  const targetMs = new Date(isoString).getTime();
  if (Number.isNaN(targetMs)) return "";

  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) {
    return "Sending now...";
  }

  const totalSeconds = Math.ceil(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${minutes}m`;
  if (minutes > 0) return `in ${minutes}m ${seconds}s`;
  return `in ${seconds}s`;
}

function UserAvatar({ user }) {
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name || user.email || "User avatar"}
        referrerPolicy="no-referrer"
        className="w-6 h-6 rounded-full object-cover border border-[#3A2327]"
      />
    );
  }

  const initial = (user?.name || user?.email || "D").trim().charAt(0).toUpperCase();
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#F3DCE6] border border-[#3A2327] text-[11px] font-bold text-[#3A2327]">
      {initial}
    </span>
  );
}

function StatusBadge({ status }) {
  const styles = {
    SCHEDULED: "bg-[#B8CEDD] text-[#3A2327]",
    SENT: "bg-[#E2F0E6] text-[#225238]",
    FAILED: "bg-[#FFF0F2] text-[#8E2233]",
    CANCELLED: "bg-[#EAE3DA] text-[#3A2327]/75",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border border-[#3A2327] px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
        styles[status] || "bg-[#FAF6F0] text-[#3A2327]"
      }`}
    >
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [scheduled, setScheduled] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ scheduled: 0, sent: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState("scheduled");
  const [searchQuery, setSearchQuery] = useState("");
  const [historyFilter, setHistoryFilter] = useState("ALL");

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeInitialData, setComposeInitialData] = useState(null);
  const [inspectedEmailId, setInspectedEmailId] = useState(null);
  const [inspectedFallback, setInspectedFallback] = useState(null);

  const [cancellingId, setCancellingId] = useState(null);
  const [sendingNowId, setSendingNowId] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [reschedulingId, setReschedulingId] = useState(null);
  const [rescheduleValue, setRescheduleValue] = useState("");
  const [savingRescheduleId, setSavingRescheduleId] = useState(null);

  const [banner, setBanner] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const fetchEmails = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setRefreshing(true);
    }
    try {
      const data = await emailsApi.list();
      setScheduled(Array.isArray(data.scheduled) ? data.scheduled : []);
      setHistory(Array.isArray(data.history) ? data.history : []);
      setStats(data.stats || { scheduled: 0, sent: 0, failed: 0 });
    } catch (err) {
      if (!silent) {
        setBanner({
          type: "error",
          text: err.message || "Failed to refresh your dispatches.",
        });
      }
    } finally {
      setLoading(false);
      if (!silent) {
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchEmails({ silent: false });
  }, [fetchEmails]);

  // Smooth 1-second countdown ticker
  useEffect(() => {
    const ticker = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  // Adaptive polling: every 1s when queue has pending scheduled items, else every 4s
  const pollIntervalMs = scheduled.length > 0 ? 1000 : 4000;
  useEffect(() => {
    const poller = setInterval(() => {
      fetchEmails({ silent: true });
    }, pollIntervalMs);
    return () => clearInterval(poller);
  }, [fetchEmails, pollIntervalMs]);

  const activeInspectedEmail = useMemo(() => {
    if (!inspectedEmailId) return null;
    return (
      scheduled.find((item) => item.id === inspectedEmailId) ||
      history.find((item) => item.id === inspectedEmailId) ||
      inspectedFallback
    );
  }, [inspectedEmailId, scheduled, history, inspectedFallback]);

  const filteredScheduled = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return scheduled;
    return scheduled.filter((item) =>
      [item.recipient, item.recipientName, item.subject, item.body, item.template]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q))
    );
  }, [scheduled, searchQuery]);

  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return history.filter((item) => {
      if (historyFilter === "SENT" && item.status !== "SENT") return false;
      if (historyFilter === "FAILED" && item.status !== "FAILED") return false;
      if (!q) return true;
      return [item.recipient, item.recipientName, item.subject, item.body, item.template]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q));
    });
  }, [history, historyFilter, searchQuery]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function openComposeModal(initialData = null) {
    setComposeInitialData(initialData);
    setComposeOpen(true);
  }

  function closeComposeModal() {
    setComposeOpen(false);
    setComposeInitialData(null);
  }

  function handleInspectEmail(email) {
    setInspectedEmailId(email.id);
    setInspectedFallback(email);
  }

  function handleDuplicateFromDrawer(email) {
    setInspectedEmailId(null);
    setInspectedFallback(null);
    openComposeModal({
      recipient: email.recipient,
      recipientName: email.recipientName || null,
      subject: email.subject,
      body: email.body,
      template: email.template || "editorial",
    });
  }

  async function handleCancelEmail(e, email) {
    e.stopPropagation();
    setCancellingId(email.id);
    setBanner(null);
    try {
      await emailsApi.cancel(email.id);
      if (reschedulingId === email.id) {
        setReschedulingId(null);
      }
      setBanner({
        type: "success",
        text: `Cancelled scheduled dispatch to ${email.recipient}.`,
      });
      await fetchEmails({ silent: false });
    } catch (err) {
      setBanner({
        type: "error",
        text: err.message || "Unable to cancel scheduled dispatch.",
      });
    } finally {
      setCancellingId(null);
    }
  }

  async function handleSendNow(e, email) {
    e.stopPropagation();
    setSendingNowId(email.id);
    setBanner(null);
    try {
      await emailsApi.sendNow(email.id);
      if (reschedulingId === email.id) {
        setReschedulingId(null);
      }
      setBanner({
        type: "success",
        text: `Triggered immediate dispatch to ${email.recipient}.`,
      });
      await fetchEmails({ silent: false });
    } catch (err) {
      setBanner({
        type: "error",
        text: err.message || "Unable to send dispatch immediately.",
      });
    } finally {
      setSendingNowId(null);
    }
  }

  function openRescheduleInline(e, email) {
    e.stopPropagation();
    const baseDate = new Date(email.scheduledAt);
    const fallbackDate = Number.isNaN(baseDate.getTime())
      ? new Date(Date.now() + 5 * 60 * 1000)
      : baseDate;
    setReschedulingId(email.id);
    setRescheduleValue(toLocalDateTimeInput(fallbackDate));
  }

  async function handleSaveReschedule(e, email) {
    e.stopPropagation();
    if (!rescheduleValue) return;
    const parsedDate = new Date(rescheduleValue);
    if (Number.isNaN(parsedDate.getTime())) {
      setBanner({
        type: "error",
        text: "Please pick a valid date and time to reschedule.",
      });
      return;
    }

    setSavingRescheduleId(email.id);
    setBanner(null);
    try {
      await emailsApi.reschedule(email.id, parsedDate.toISOString());
      setReschedulingId(null);
      setBanner({
        type: "success",
        text: `Rescheduled dispatch to ${email.recipient} for ${formatDateTime(
          parsedDate.toISOString()
        )}.`,
      });
      await fetchEmails({ silent: false });
    } catch (err) {
      setBanner({
        type: "error",
        text: err.message || "Unable to reschedule dispatch.",
      });
    } finally {
      setSavingRescheduleId(null);
    }
  }

  async function handleRetryEmail(e, email) {
    e.stopPropagation();
    setRetryingId(email.id);
    setBanner(null);
    try {
      await emailsApi.retry(email.id);
      setBanner({
        type: "success",
        text: `Re-queued failed dispatch to ${email.recipient} for immediate delivery.`,
      });
      await fetchEmails({ silent: false });
    } catch (err) {
      setBanner({
        type: "error",
        text: err.message || "Unable to retry failed dispatch.",
      });
    } finally {
      setRetryingId(null);
    }
  }

  function handleExportCsv() {
    const recordsToExport =
      activeTab === "history" && (searchQuery.trim() || historyFilter !== "ALL")
        ? filteredHistory
        : history;

    if (!recordsToExport || recordsToExport.length === 0) {
      setBanner({
        type: "error",
        text: "No sent or archived history records match to export.",
      });
      return;
    }

    exportEmailsToCsv(recordsToExport, "dispatch-email-history.csv");
    setBanner({
      type: "success",
      text: `Exported ${recordsToExport.length} history record${
        recordsToExport.length === 1 ? "" : "s"
      } to CSV.`,
    });
  }

  function handleComposeSuccess(result) {
    closeComposeModal();
    setActiveTab("scheduled");
    setBanner({
      type: "success",
      text: result?.message || "Dispatch scheduled successfully!",
    });
    fetchEmails({ silent: false });
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#3A2327] py-4 sm:py-6 px-3 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Top Editorial Navigation Header */}
        <header className="editorial-grid-bg rounded-2xl border-[1.5px] border-[#3A2327] px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="Dispatch Home">
              <BrandStamp variant="cream" size="sm" tilt="-rotate-2" />
            </Link>
            <div className="hidden sm:flex items-center gap-2.5 rounded-full bg-[#FAF6F0]/15 border border-[#FAF6F0]/30 pl-1.5 pr-3.5 py-1 text-xs text-[#FAF6F0]">
              <UserAvatar user={user} />
              <span className="font-semibold">{user?.name}</span>
              <span className="opacity-70">·</span>
              <span className="opacity-85">{user?.email}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => openComposeModal(null)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#E6A8BF] border-[1.5px] border-[#FAF6F0]/40 px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold text-[#3A2327] hover:bg-[#FAF6F0] transition"
            >
              <Plus className="w-4 h-4" />
              Compose Email
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF6F0]/10 border border-[#FAF6F0]/35 px-3.5 py-2 text-xs sm:text-sm font-medium text-[#FAF6F0] hover:bg-[#FAF6F0]/20 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Welcome & Refresh Sub-header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#3A2327]/65">
              Dispatch Studio
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#3A2327] tracking-tight mt-0.5">
              Queue &amp; Correspondence
            </h1>
            <p className="text-sm text-[#3A2327]/75 mt-1">
              Click any dispatch to inspect full stationery copy, trigger instant delivery, reschedule, or export history.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="sm:hidden inline-flex items-center gap-1.5 rounded-full bg-[#F3DCE6] border border-[#3A2327] pl-1 pr-3 py-0.5 text-xs font-medium text-[#3A2327]">
              <UserAvatar user={user} />
              <span>{user?.email}</span>
            </span>
            <button
              type="button"
              onClick={() => fetchEmails({ silent: false })}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#3A2327] bg-[#FAF6F0] px-3.5 py-1.5 text-xs font-semibold text-[#3A2327] hover:bg-[#F3DCE6] transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Dismissible Alert Banner */}
        {banner ? (
          <div
            className={`flex items-center justify-between gap-3 rounded-2xl border-[1.5px] px-4 py-3 text-sm ${
              banner.type === "error"
                ? "bg-red-100 border-red-800 text-red-950"
                : "bg-[#F3DCE6] border-[#3A2327] text-[#3A2327]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {banner.type === "error" ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span className="font-medium">{banner.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setBanner(null)}
              aria-label="Dismiss message"
              className="p-1 hover:opacity-70"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : null}

        {/* Editorial Bento Stats Row */}
        <section className="rounded-3xl bg-[#3A2327] p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: "Scheduled",
                value: stats.scheduled,
                caption: "Waiting for their chosen delivery hour",
                pillClass: "bg-[#B8CEDD]",
              },
              {
                label: "Sent",
                value: stats.sent,
                caption: "Delivered formatted stationery emails",
                pillClass: "bg-[#F3DCE6]",
              },
              {
                label: "Failed",
                value: stats.failed,
                caption: "Requires inspection or retry",
                pillClass: "bg-[#E6A8BF]",
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-2xl bg-[#FAF6F0] px-5 py-5 flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center rounded-full border border-[#3A2327] px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-[#3A2327] ${card.pillClass}`}
                  >
                    {card.label}
                  </span>
                  <StarburstIcon className="w-5 h-5 text-[#3A2327]" title="" />
                </div>

                <div>
                  <p className="font-display text-4xl sm:text-5xl font-semibold text-[#3A2327] leading-none">
                    {loading ? "—" : card.value}
                  </p>
                  <p className="mt-2 text-xs text-[#3A2327]/70">{card.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tabbed Email Workspace */}
        <section className="rounded-3xl bg-[#FAF6F0] border-[1.5px] border-[#3A2327] overflow-hidden">
          {/* Tab Strip & Primary Actions */}
          <div className="bg-[#F3DCE6]/70 border-b-[1.5px] border-[#3A2327] px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("scheduled")}
                className={`inline-flex items-center gap-2 rounded-full border-[1.5px] border-[#3A2327] px-4 py-2 text-xs sm:text-sm font-bold transition ${
                  activeTab === "scheduled"
                    ? "bg-[#3A2327] text-[#FAF6F0]"
                    : "bg-[#FAF6F0] text-[#3A2327] hover:bg-[#E6A8BF]/60"
                }`}
              >
                <span>Scheduled Queue</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    activeTab === "scheduled"
                      ? "bg-[#E6A8BF] text-[#3A2327]"
                      : "bg-[#F3DCE6] text-[#3A2327]"
                  }`}
                >
                  {scheduled.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`inline-flex items-center gap-2 rounded-full border-[1.5px] border-[#3A2327] px-4 py-2 text-xs sm:text-sm font-bold transition ${
                  activeTab === "history"
                    ? "bg-[#3A2327] text-[#FAF6F0]"
                    : "bg-[#FAF6F0] text-[#3A2327] hover:bg-[#E6A8BF]/60"
                }`}
              >
                <span>Sent &amp; History</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    activeTab === "history"
                      ? "bg-[#E6A8BF] text-[#3A2327]"
                      : "bg-[#F3DCE6] text-[#3A2327]"
                  }`}
                >
                  {history.length}
                </span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={history.length === 0}
                className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#3A2327] bg-[#B8CEDD]/55 px-3.5 py-2 text-xs font-bold text-[#3A2327] hover:bg-[#B8CEDD] transition disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5" />
                Export History (.csv)
              </button>

              <button
                type="button"
                onClick={() => openComposeModal(null)}
                className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#3A2327] bg-[#FAF6F0] px-4 py-2 text-xs font-bold text-[#3A2327] hover:bg-[#E6A8BF] transition"
              >
                <Plus className="w-3.5 h-3.5" />
                New Schedule
              </button>
            </div>
          </div>

          {/* Search & Status Filter Sub-Bar */}
          <div className="border-b border-[#3A2327]/20 bg-[#FAF6F0] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="w-4 h-4 text-[#3A2327]/55 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipient, name, subject, or body..."
                className="w-full rounded-full bg-white border border-[#3A2327]/60 pl-9 pr-8 py-1.5 text-xs sm:text-sm text-[#3A2327] placeholder:text-[#3A2327]/45 focus:outline-none focus:ring-2 focus:ring-[#E6A8BF]"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#3A2327]/55 hover:text-[#3A2327]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>

            {activeTab === "history" ? (
              <div className="inline-flex items-center gap-1.5">
                {[
                  { id: "ALL", label: "All" },
                  { id: "SENT", label: "Delivered" },
                  { id: "FAILED", label: "Failed" },
                ].map((pill) => {
                  const active = historyFilter === pill.id;
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setHistoryFilter(pill.id)}
                      className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                        active
                          ? "bg-[#3A2327] border-[#3A2327] text-[#FAF6F0]"
                          : "bg-white border-[#3A2327]/40 text-[#3A2327] hover:bg-[#F3DCE6]/60"
                      }`}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-[#3A2327]/65">
                <Clock className="w-3.5 h-3.5" />
                Live 1-second queue countdown
              </span>
            )}
          </div>

          {/* Content Body */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-11 h-11 rounded-full bg-[#F3DCE6] border-[1.5px] border-[#3A2327] flex items-center justify-center animate-spin">
                <StarburstIcon className="w-5 h-5 text-[#3A2327]" title="Loading" />
              </div>
              <p className="font-display text-lg text-[#3A2327]">Loading email queue...</p>
            </div>
          ) : activeTab === "scheduled" ? (
            scheduled.length === 0 ? (
              <EmptyState
                title="No scheduled dispatches in queue"
                description="Your upcoming dispatch queue is clear. Compose a personalized letter, pick stationery, or import a CSV contact list."
                actionLabel="+ Compose Email"
                onAction={() => openComposeModal(null)}
              />
            ) : filteredScheduled.length === 0 ? (
              <EmptyState
                title="No scheduled dispatches match your search"
                description={`Nothing in your scheduled queue matches "${searchQuery}".`}
                actionLabel="Clear Search"
                onAction={() => setSearchQuery("")}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-[1.5px] border-[#3A2327] bg-[#FAF6F0] text-[11px] font-bold uppercase tracking-wider text-[#3A2327]/75">
                      <th className="py-3.5 px-5">Recipient</th>
                      <th className="py-3.5 px-5">Subject &amp; Style</th>
                      <th className="py-3.5 px-5">Scheduled Time</th>
                      <th className="py-3.5 px-5">Status</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3A2327]/15 text-sm">
                    {filteredScheduled.map((email) => {
                      const templateMeta = getTemplateMeta(email.template || "editorial");
                      const isRescheduling = reschedulingId === email.id;
                      const isRowBusy =
                        cancellingId === email.id ||
                        sendingNowId === email.id ||
                        savingRescheduleId === email.id;

                      return (
                        <tr
                          key={email.id}
                          onClick={() => handleInspectEmail(email)}
                          className="hover:bg-[#F3DCE6]/35 transition cursor-pointer"
                        >
                          <td className="py-4 px-5 whitespace-nowrap">
                            {email.recipientName ? (
                              <div>
                                <p className="font-semibold text-[#3A2327]">
                                  {email.recipientName}
                                </p>
                                <p className="text-xs font-mono text-[#3A2327]/65 mt-0.5">
                                  {email.recipient}
                                </p>
                              </div>
                            ) : (
                              <span className="font-semibold text-[#3A2327]">
                                {email.recipient}
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-5 max-w-xs">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-[#3A2327] truncate">
                                {email.subject}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center rounded-full bg-[#FAF6F0] border border-[#3A2327]/40 px-2 py-0.5 text-[10px] font-semibold text-[#3A2327]/80 shrink-0">
                                {templateMeta.shortName}
                              </span>
                              <p className="text-xs text-[#3A2327]/60 truncate">
                                {email.body}
                              </p>
                            </div>
                          </td>

                          <td className="py-4 px-5 whitespace-nowrap">
                            <p className="font-medium text-[#3A2327]">
                              {formatDateTime(email.scheduledAt)}
                            </p>
                            <p className="text-xs text-[#3A2327]/65 mt-0.5 tabular-nums">
                              {formatRelativeCountdown(email.scheduledAt, now)}
                            </p>
                          </td>

                          <td className="py-4 px-5 whitespace-nowrap">
                            <StatusBadge status={email.status} />
                          </td>

                          <td
                            className="py-4 px-5 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isRescheduling ? (
                              <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                                <input
                                  type="datetime-local"
                                  value={rescheduleValue}
                                  onChange={(e) => setRescheduleValue(e.target.value)}
                                  className="rounded-lg bg-white border border-[#3A2327] px-2 py-1 text-xs text-[#3A2327]"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => handleSaveReschedule(e, email)}
                                  disabled={savingRescheduleId === email.id}
                                  className="inline-flex items-center gap-1 rounded-full border border-[#3A2327] bg-[#3A2327] px-2.5 py-1 text-xs font-bold text-[#FAF6F0] hover:bg-[#3A2327]/90 transition disabled:opacity-50"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>
                                    {savingRescheduleId === email.id ? "Saving" : "Save"}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReschedulingId(null);
                                  }}
                                  aria-label="Cancel reschedule"
                                  className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-[#3A2327] bg-[#FAF6F0] text-[#3A2327] hover:bg-[#F3DCE6] transition"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => handleSendNow(e, email)}
                                  disabled={isRowBusy}
                                  className="inline-flex items-center gap-1 rounded-full border border-[#3A2327] bg-[#E6A8BF]/70 px-3 py-1.5 text-xs font-bold text-[#3A2327] hover:bg-[#E6A8BF] transition disabled:opacity-50"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>
                                    {sendingNowId === email.id ? "Sending..." : "Send Now"}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => openRescheduleInline(e, email)}
                                  disabled={isRowBusy}
                                  className="inline-flex items-center gap-1 rounded-full border border-[#3A2327] bg-[#FAF6F0] px-3 py-1.5 text-xs font-bold text-[#3A2327] hover:bg-[#B8CEDD]/50 transition disabled:opacity-50"
                                >
                                  <CalendarClock className="w-3 h-3" />
                                  <span>Reschedule</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => handleCancelEmail(e, email)}
                                  disabled={isRowBusy}
                                  className="inline-flex items-center gap-1 rounded-full border border-[#3A2327] bg-[#FAF6F0] px-3 py-1.5 text-xs font-bold text-[#3A2327] hover:bg-red-100 hover:border-red-800 hover:text-red-900 transition disabled:opacity-50"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>
                                    {cancellingId === email.id ? "Cancelling..." : "Cancel"}
                                  </span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : history.length === 0 ? (
            <EmptyState
              title="No sent or archived dispatches yet"
              description="Once scheduled dispatches finish sending, their delivery timestamps, Ethereal preview links, and exportable records appear here."
              actionLabel="+ Compose Email"
              onAction={() => openComposeModal(null)}
            />
          ) : filteredHistory.length === 0 ? (
            <EmptyState
              title="No matching history records"
              description="Try adjusting your search query or status filter pill."
              actionLabel="Reset Filters"
              onAction={() => {
                setSearchQuery("");
                setHistoryFilter("ALL");
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-[1.5px] border-[#3A2327] bg-[#FAF6F0] text-[11px] font-bold uppercase tracking-wider text-[#3A2327]/75">
                    <th className="py-3.5 px-5">Recipient</th>
                    <th className="py-3.5 px-5">Subject &amp; Style</th>
                    <th className="py-3.5 px-5">Sent / Updated At</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3A2327]/15 text-sm">
                  {filteredHistory.map((email) => {
                    const templateMeta = getTemplateMeta(email.template || "editorial");
                    return (
                      <tr
                        key={email.id}
                        onClick={() => handleInspectEmail(email)}
                        className="hover:bg-[#F3DCE6]/35 transition cursor-pointer"
                      >
                        <td className="py-4 px-5 whitespace-nowrap">
                          {email.recipientName ? (
                            <div>
                              <p className="font-semibold text-[#3A2327]">
                                {email.recipientName}
                              </p>
                              <p className="text-xs font-mono text-[#3A2327]/65 mt-0.5">
                                {email.recipient}
                              </p>
                            </div>
                          ) : (
                            <span className="font-semibold text-[#3A2327]">
                              {email.recipient}
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-5 max-w-xs">
                          <p className="font-medium text-[#3A2327] truncate">
                            {email.subject}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center rounded-full bg-[#FAF6F0] border border-[#3A2327]/40 px-2 py-0.5 text-[10px] font-semibold text-[#3A2327]/80 shrink-0">
                              {templateMeta.shortName}
                            </span>
                            {email.error ? (
                              <p
                                className="text-xs text-red-800 truncate"
                                title={email.error}
                              >
                                Error: {email.error}
                              </p>
                            ) : (
                              <p className="text-xs text-[#3A2327]/60 truncate">
                                {email.body}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-5 whitespace-nowrap text-[#3A2327]">
                          {formatDateTime(email.sentAt || email.createdAt)}
                        </td>

                        <td className="py-4 px-5 whitespace-nowrap">
                          <StatusBadge status={email.status} />
                        </td>

                        <td
                          className="py-4 px-5 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {email.status === "FAILED" ? (
                            <button
                              type="button"
                              onClick={(e) => handleRetryEmail(e, email)}
                              disabled={retryingId === email.id}
                              className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#3A2327] bg-[#F3DCE6] px-3.5 py-1.5 text-xs font-bold text-[#3A2327] hover:bg-[#E6A8BF] transition disabled:opacity-50"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>
                                {retryingId === email.id ? "Retrying..." : "Retry"}
                              </span>
                            </button>
                          ) : email.previewUrl ? (
                            <a
                              href={email.previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#3A2327] bg-[#E6A8BF] px-3.5 py-1.5 text-xs font-bold text-[#3A2327] hover:bg-[#F3DCE6] transition"
                            >
                              <span>View Ethereal Email</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="text-xs text-[#3A2327]/45">Unavailable</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Compose Email Modal (Supports Duplicate Initial Data) */}
      <ComposeModal
        isOpen={composeOpen}
        onClose={closeComposeModal}
        onScheduled={handleComposeSuccess}
        initialData={composeInitialData}
      />

      {/* Slide-Over Email Inspector Drawer */}
      <EmailInspectorDrawer
        email={activeInspectedEmail}
        onClose={() => {
          setInspectedEmailId(null);
          setInspectedFallback(null);
        }}
        onDuplicate={handleDuplicateFromDrawer}
      />
    </div>
  );
}
