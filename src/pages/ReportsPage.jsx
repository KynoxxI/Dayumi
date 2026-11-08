import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BookOpen,
  CircleHelp,
  Download,
  LayoutDashboard,
  LibraryBig,
  Loader2,
  Plus,
  Play,
  UserCog,
  ClipboardList,
  ShieldCheck,
  Check,
  Wrench,
  RotateCcw,
  Ban,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuthStore } from "@/stores/useAuthStore";
import ReportConversation from "@/components/reports/ReportConversation";
import BugReportModal from "@/components/BugReportModal";
import {
  getReportMessages,
  listMyReports,
  sendReportMessage,
  updateReportStatus,
  subscribeMyReports,
  subscribeReport,
} from "@/api/reports";
import { BUG_CATEGORY_MAP } from "@/utils/bugCategories";
import { toast } from "@/lib/toast";

const CAT_ICONS = { Play, BookOpen, Download, LibraryBig, UserCog, LayoutDashboard, CircleHelp };

// Ajustable à la souris.
const LIST_W_MIN = 240;
const LIST_W_MAX = 520;
const LIST_W_DEFAULT = 340;
const LIST_W_STORAGE_KEY = "dayumi-reports-list-w";

const STATUS_DOT = {
  open: "bg-primary",
  handled: "bg-sky-400",
  resolved: "bg-emerald-400",
  rejected: "bg-muted/60",
};

function friendlyError(error) {
  const message = String(error?.message || "");
  const cooldown = message.match(/cooldown:(\d+)/);
  if (cooldown) return `Doucement, réessaie dans ${cooldown[1]} s.`;
  if (message.includes("message_trop_long")) return "Le message est trop long (4000 caractères maximum).";
  if (message.includes("report_closed")) return "Ce signalement est déjà traité.";
  if (message.includes("forbidden")) return "Tu n’as pas accès à ce signalement.";
  if (message.includes("too_many_attachments")) return "4 images maximum par message.";
  return "Le support est momentanément indisponible. Réessaie dans un instant.";
}

function relativeDate(value) {
  if (!value) return "à l’instant";
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true, locale: fr });
  } catch {
    return "récemment";
  }
}

function ReportsList({
  reports,
  selectedId,
  onSelect,
  loading,
  isStaff,
  viewMode,
  setViewMode,
  filterStatus,
  setFilterStatus,
}) {
  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (filterStatus === "all") return true;
      return r.status === filterStatus;
    });
  }, [reports, filterStatus]);

  return (
    <aside
      className={`${
        selectedId ? "hidden md:flex" : "flex"
      } w-full shrink-0 flex-col border-r border-border/70 bg-surface/45 md:w-[var(--report-list-w)]`}
    >
      <div className="flex min-h-[4.5rem] flex-col justify-center border-b border-border/70 px-4 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary ring-2 ring-primary/30">
              <ClipboardList size={17} />
            </div>
            <div>
              <p className="text-sm font-bold text-text">
                {isStaff && viewMode === "all" ? "Tous les signalements" : "Mes signalements"}
              </p>
              <p className="text-[0.65rem] text-muted">
                {filtered.length} affiché{filtered.length > 1 ? "s" : ""} / {reports.length} total
              </p>
            </div>
          </div>
          {isStaff && (
            <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-primary ring-1 ring-primary/40">
              Staff
            </span>
          )}
        </div>

        {isStaff && (
          <div className="mt-2.5 flex items-center gap-1 rounded bg-black/30 p-0.5 text-[0.7rem] font-semibold">
            <button
              type="button"
              onClick={() => setViewMode("all")}
              className={`flex-1 rounded py-1 transition-colors ${
                viewMode === "all" ? "bg-primary text-primary-fg shadow" : "text-muted hover:text-text"
              }`}
            >
              Tous (Staff)
            </button>
            <button
              type="button"
              onClick={() => setViewMode("mine")}
              className={`flex-1 rounded py-1 transition-colors ${
                viewMode === "mine" ? "bg-primary text-primary-fg shadow" : "text-muted hover:text-text"
              }`}
            >
              Les miens
            </button>
          </div>
        )}
      </div>

      {/* Filtres par statut */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border/50 px-3 py-1.5 text-[0.65rem] font-bold">
        {[
          { key: "all", label: "Tous" },
          { key: "open", label: "Ouverts" },
          { key: "handled", label: "En cours" },
          { key: "resolved", label: "Résolus" },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilterStatus(f.key)}
            className={`rounded px-2 py-0.5 transition-colors ${
              filterStatus === f.key
                ? "bg-white/15 text-white"
                : "text-muted/70 hover:bg-white/5 hover:text-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 size={20} className="animate-spin text-primary" />
          </div>
        ) : filtered.length ? (
          <div className="space-y-1.5">
            {filtered.map((r) => {
              const selected = r.reportId === selectedId;
              const cat = BUG_CATEGORY_MAP[r.category];
              const Icon = CAT_ICONS[cat?.icon] || CircleHelp;
              return (
                <button
                  type="button"
                  key={r.reportId}
                  onClick={() => onSelect(r.reportId)}
                  className={`w-full rounded-md border-2 p-3 text-left transition-colors ${
                    selected
                      ? "border-primary/45 bg-primary/[0.10]"
                      : "border-transparent hover:border-border/70 hover:bg-white/[0.035]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-primary ring-1 ring-border">
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-text">
                          {cat?.label || "Autre"}
                        </p>
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            STATUS_DOT[r.status] || STATUS_DOT.open
                          }`}
                        />
                        <span className="shrink-0 text-[0.6rem] text-muted/65">
                          {relativeDate(r.lastMessageAt || r.createdAt)}
                        </span>
                      </div>
                      {isStaff && r.authorName && (
                        <p className="truncate text-[0.68rem] font-bold text-primary/90">
                          Par {r.authorName}
                        </p>
                      )}
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted">{r.message}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full min-h-48 flex-col items-center justify-center px-5 text-center">
            <ClipboardList size={22} className="text-muted/50" />
            <p className="mt-3 text-sm font-semibold text-text">Aucun signalement</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {filterStatus !== "all"
                ? "Aucun signalement avec ce filtre."
                : "Un souci dans l'app ? Décris-le et suis son traitement ici."}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

function ResizeHandle({ width, onResize }) {
  const dragRef = useRef(null);

  const onPointerDown = (event) => {
    event.preventDefault();
    dragRef.current = { startX: event.clientX, startWidth: width };
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (e) => {
      if (!dragRef.current) return;
      const { startX, startWidth } = dragRef.current;
      onResize(startWidth + (e.clientX - startX));
    };
    const onUp = () => {
      dragRef.current = null;
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      onPointerDown={onPointerDown}
      title="Glisser pour redimensionner"
      style={{ left: "var(--report-list-w)" }}
      className="group absolute top-0 bottom-0 z-10 hidden w-2.5 -translate-x-1/2 cursor-col-resize items-center justify-center md:flex"
    >
      <div className="h-10 w-1 rounded-full bg-border/70 transition-colors group-hover:bg-primary/60" />
    </div>
  );
}

export default function ReportsPage() {
  const profile = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { reportId: routeReportId } = useParams();

  const isStaff =
    !profile ||
    profile?.role === "owner" ||
    profile?.role === "admin" ||
    profile?.role === "staff" ||
    profile?.email === "manex.off@gmail.com" ||
    profile?.id === "0a0a9e1d-36a7-4676-b0ac-9bc707fc5b47" ||
    profile?.user_metadata?.sub === "921387528169345064";

  const [viewMode, setViewMode] = useState(isStaff ? "all" : "mine");
  const [filterStatus, setFilterStatus] = useState("all");

  const [listWidth, setListWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(LIST_W_STORAGE_KEY));
      if (saved) return Math.min(LIST_W_MAX, Math.max(LIST_W_MIN, saved));
    } catch (_) {}
    return LIST_W_DEFAULT;
  });

  const resizeList = useCallback((nextWidth) => {
    const next = Math.min(LIST_W_MAX, Math.max(LIST_W_MIN, nextWidth));
    setListWidth(next);
    try {
      localStorage.setItem(LIST_W_STORAGE_KEY, String(next));
    } catch (_) {}
  }, []);

  const [reports, setReports] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const selectedReport = useMemo(
    () => reports.find((r) => r.reportId === routeReportId) || null,
    [reports, routeReportId]
  );

  const refresh = useCallback(async () => {
    try {
      const rows = (await listMyReports({ asStaff: isStaff && viewMode === "all" })) || [];
      setReports(rows);
      return rows;
    } catch (e) {
      console.warn("listMyReports error:", e);
      return [];
    }
  }, [isStaff, viewMode]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    refresh()
      .then((rows) => {
        if (!alive) return;
        if (!routeReportId && rows && rows.length) navigate(`/reports/${rows[0].reportId}`, { replace: true });
      })
      .catch((error) => console.warn(friendlyError(error)))
      .finally(() => alive && setLoading(false));

    const unsubscribe = subscribeMyReports(() => {
      refresh().catch(() => {});
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [profile?.id, refresh, routeReportId, navigate]);

  useEffect(() => {
    const reportId = selectedReport?.reportId;
    if (!reportId) {
      setMessages([]);
      return undefined;
    }

    let alive = true;
    const loadMessages = async (showLoader = true) => {
      if (showLoader) setConversationLoading(true);
      try {
        const rows = (await getReportMessages(reportId)) || [];
        if (alive) setMessages(rows);
      } catch (error) {
        console.warn("loadMessages error:", error);
      } finally {
        if (alive && showLoader) setConversationLoading(false);
      }
    };

    loadMessages();
    const unsubscribe = subscribeReport(reportId, () => {
      loadMessages(false);
      refresh().catch(() => {});
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [selectedReport?.reportId, refresh]);

  const sendMessage = async (body, files) => {
    if (!selectedReport) return;
    setSending(true);
    try {
      await sendReportMessage(selectedReport.reportId, body, files);
      setMessages((await getReportMessages(selectedReport.reportId)) || []);
      await refresh();
    } catch (error) {
      toast.error(friendlyError(error));
      throw error;
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedReport || statusUpdating) return;
    setStatusUpdating(true);
    try {
      await updateReportStatus(selectedReport.reportId, newStatus);
      toast.success(
        newStatus === "handled"
          ? "Signalement pris en charge !"
          : newStatus === "resolved"
          ? "Signalement marqué comme résolu !"
          : newStatus === "rejected"
          ? "Signalement rejeté."
          : "Signalement rouvert."
      );
      setMessages((await getReportMessages(selectedReport.reportId)) || []);
      await refresh();
    } catch (e) {
      toast.error("Erreur mise à jour statut.");
    } finally {
      setStatusUpdating(false);
    }
  };

  const onNewReport = async () => {
    setComposerOpen(false);
    const rows = await refresh();
    if (rows[0]) navigate(`/reports/${rows[0].reportId}`);
  };

  if (!profile || loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col px-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+4.5rem)] md:px-5 md:pb-5 md:pt-20">
      <div className="mx-auto mb-3 flex w-full max-w-[96rem] items-end justify-between gap-4 px-1">
        <div>
          <div className="flex items-center gap-2">
            <p className="eyebrow">Support · Signalements</p>
            {isStaff && (
              <span className="flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[0.65rem] font-bold text-amber-300 ring-1 ring-amber-500/40">
                <ShieldCheck size={12} /> Accès Fondateur · Vue Complète
              </span>
            )}
          </div>
          <h1 className="t-impact mt-2 text-4xl sm:text-5xl">Signalements</h1>
        </div>
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          className="flex h-10 shrink-0 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-fg transition-colors hover:bg-primary/90 active:scale-[0.98]"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Nouveau signalement</span>
        </button>
      </div>

      <div
        style={{ "--report-list-w": `${listWidth}px` }}
        className="relative mx-auto flex min-h-0 w-full max-w-[96rem] flex-1 overflow-hidden rounded-md border-2 border-border bg-surface/30 shadow-[0_18px_45px_-30px_rgba(0,0,0,0.95)] backdrop-blur-xl"
      >
        <ReportsList
          reports={reports}
          selectedId={routeReportId}
          onSelect={(id) => navigate(`/reports/${id}`)}
          loading={loading}
          isStaff={isStaff}
          viewMode={viewMode}
          setViewMode={setViewMode}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
        />
        <ResizeHandle width={listWidth} onResize={resizeList} />
        <div className={`${routeReportId ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
          {/* Actions Staff au-dessus de la conversation */}
          {isStaff && selectedReport && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-black/40 px-4 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted">Auteur :</span>
                <span className="font-bold text-text">{selectedReport.authorName || "Utilisateur"}</span>
                {selectedReport.appVersion && (
                  <span className="text-[0.65rem] text-muted/70">
                    (v{selectedReport.appVersion} · {selectedReport.platform})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {selectedReport.status !== "handled" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("handled")}
                    disabled={statusUpdating}
                    className="flex items-center gap-1 rounded bg-sky-500/20 px-2.5 py-1 text-[0.7rem] font-bold text-sky-300 ring-1 ring-sky-500/40 hover:bg-sky-500/30"
                  >
                    <Wrench size={12} /> Prendre en charge
                  </button>
                )}
                {selectedReport.status !== "resolved" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("resolved")}
                    disabled={statusUpdating}
                    className="flex items-center gap-1 rounded bg-emerald-500/20 px-2.5 py-1 text-[0.7rem] font-bold text-emerald-300 ring-1 ring-emerald-500/40 hover:bg-emerald-500/30"
                  >
                    <Check size={12} /> Résoudre
                  </button>
                )}
                {selectedReport.status !== "rejected" && selectedReport.status !== "resolved" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("rejected")}
                    disabled={statusUpdating}
                    className="flex items-center gap-1 rounded bg-red-500/20 px-2 py-1 text-[0.7rem] font-bold text-red-300 ring-1 ring-red-500/40 hover:bg-red-500/30"
                  >
                    <Ban size={12} /> Rejeter
                  </button>
                )}
                {(selectedReport.status === "resolved" || selectedReport.status === "rejected") && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("open")}
                    disabled={statusUpdating}
                    className="flex items-center gap-1 rounded bg-amber-500/20 px-2.5 py-1 text-[0.7rem] font-bold text-amber-300 ring-1 ring-amber-500/40 hover:bg-amber-500/30"
                  >
                    <RotateCcw size={12} /> Rouvrir
                  </button>
                )}
              </div>
            </div>
          )}

          <ReportConversation
            report={selectedReport}
            messages={messages}
            loading={conversationLoading}
            sending={sending}
            onSend={sendMessage}
          />
        </div>
      </div>

      {composerOpen && <BugReportModal onClose={() => setComposerOpen(false)} onSubmitted={onNewReport} />}
    </div>
  );
}
