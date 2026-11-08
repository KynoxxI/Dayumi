import { supabase } from "@/lib/supabase";
import { platform } from "@/platform";
import { useAuthStore } from "@/stores/useAuthStore";

const MAX_FILES = 4;
const LOCAL_STORAGE_KEY = "dayumi_reports_cache";

let cachedVersion;
async function getAppVersion() {
  if (cachedVersion !== undefined) return cachedVersion;
  try {
    cachedVersion = (await platform.getVersion()) || "0.4.0";
  } catch {
    cachedVersion = "0.4.0";
  }
  return cachedVersion;
}

function currentUser() {
  try {
    const u = useAuthStore.getState().user;
    if (u) return u;
  } catch (_) {}
  return null;
}

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export async function listMyReports({ asStaff = false } = {}) {
  const user = currentUser();
  if (!user?.id) return [];

  const isStaffRole = user.role === "owner" || user.role === "admin" || user.role === "moderator" || user.role === "super_moderator" || user.role === "helper";
  const shouldFetchAll = asStaff && isStaffRole;

  try {
    const url = new URL("https://dayumi.site/fn/reports");
    url.searchParams.set("userId", user.id);
    url.searchParams.set("role", user.role || "user");
    if (user.discord_id) url.searchParams.set("discordId", user.discord_id);
    if (shouldFetchAll) url.searchParams.set("all", "true");

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.data)) {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(json.data));
        } catch (_) {}
        return json.data;
      }
    }
  } catch (_) {}

  // Fallback to Supabase RPC if available
  try {
    const { data, error } = await supabase.rpc("report_my_list");
    if (!error && Array.isArray(data)) return data;
  } catch (_) {}

  // Fallback to local storage cache
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (_) {}

  return [];
}

export async function createReport({ category, body, files = [], context = null }) {
  const user = currentUser();
  const reportId = crypto.randomUUID();
  const messageId = crypto.randomUUID();

  // Convert files to data URLs (up to MAX_FILES)
  const attachments = [];
  for (const f of (files || []).slice(0, MAX_FILES)) {
    const dataUrl = await fileToDataUrl(f);
    if (dataUrl) {
      attachments.push({ path: dataUrl, name: f.name, sizeBytes: f.size });
    }
  }

  const payload = {
    reportId,
    messageId,
    category,
    body,
    attachments,
    appVersion: await getAppVersion(),
    platform: platform.os || platform.name || "windows",
    context: context || null,
    user: {
      id: user?.id || "guest",
      username: user?.username || "Membre",
      avatar: user?.avatar || null,
      role: user?.role || "user",
      discordId: user?.discord_id || null,
    },
  };

  try {
    const res = await fetch("https://dayumi.site/fn/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const json = await res.json();
      return json?.data || payload;
    }
  } catch (_) {}

  // Local storage save
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
    list.unshift({
      id: reportId,
      reportId,
      userId: user?.id,
      authorName: user?.username,
      authorRole: user?.role,
      category,
      message: body,
      status: "open",
      createdAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      context,
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (_) {}

  return payload;
}

export async function getReportMessages(reportId) {
  if (!reportId) return [];

  try {
    const res = await fetch(`https://dayumi.site/fn/reports/${encodeURIComponent(reportId)}/messages`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.data)) return json.data;
    }
  } catch (_) {}

  // Fallback to Supabase RPC
  try {
    const { data, error } = await supabase.rpc("report_messages", { p_report_id: reportId });
    if (!error && Array.isArray(data)) return data;
  } catch (_) {}

  return [];
}

export async function sendReportMessage(reportId, body, files = []) {
  const user = currentUser();
  const messageId = crypto.randomUUID();

  const attachments = [];
  for (const f of (files || []).slice(0, MAX_FILES)) {
    const dataUrl = await fileToDataUrl(f);
    if (dataUrl) {
      attachments.push({ path: dataUrl, name: f.name, sizeBytes: f.size });
    }
  }

  const payload = {
    messageId,
    reportId,
    body,
    attachments,
    user: {
      id: user?.id,
      username: user?.username,
      avatar: user?.avatar,
      role: user?.role,
    },
  };

  try {
    const res = await fetch(`https://dayumi.site/fn/reports/${encodeURIComponent(reportId)}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const json = await res.json();
      return json?.data;
    }
  } catch (_) {}

  return payload;
}

export async function updateReportStatus(reportId, status) {
  const user = currentUser();
  try {
    const res = await fetch(`https://dayumi.site/fn/reports/${encodeURIComponent(reportId)}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, handledBy: user?.username || "Équipe Dayumi" }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const json = await res.json();
      return json?.data;
    }
  } catch (_) {}
  return null;
}

/** URL signée ou data URL */
export async function getAttachmentUrl(path) {
  if (!path) return null;
  if (path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  try {
    const { data } = await supabase.storage.from("bug-reports").createSignedUrl(path, 3600);
    return data?.signedUrl || null;
  } catch {
    return null;
  }
}

export function subscribeReport(reportId, onChange) {
  if (!reportId) return () => {};
  const timer = setInterval(() => {
    onChange();
  }, 10000);
  return () => clearInterval(timer);
}

export function subscribeMyReports(onChange) {
  const timer = setInterval(() => {
    onChange();
  }, 15000);
  return () => clearInterval(timer);
}
