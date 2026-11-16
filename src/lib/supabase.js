import { platform } from "@/platform";
import { SITE_URL } from "@/config/instance";
import { createClient } from "@supabase/supabase-js";

const API_BASE = "https://anime.dayumi.site";
const hasBridge = () => !!platform.session;

const sharedStorage = {
  async getItem(key) {
    if (!hasBridge()) {
      let val = localStorage.getItem(key);
      if (val == null && key === "dayumi-auth") {
        val = localStorage.getItem("nartya-auth");
        if (val != null) localStorage.setItem("dayumi-auth", val);
      }
      return val;
    }
    let v = await platform.session.get(key);
    if (v == null && key === "dayumi-auth") {
      v = await platform.session.get("nartya-auth");
      if (v != null) await platform.session.set("dayumi-auth", v);
    }
    if (v == null) {
      const legacy = localStorage.getItem(key) || (key === "dayumi-auth" ? localStorage.getItem("nartya-auth") : null);
      if (legacy != null) {
        await platform.session.set(key, legacy);
        v = legacy;
      }
    }
    if (v != null) localStorage.setItem(key, v);
    return v;
  },
  async setItem(key, value) {
    localStorage.setItem(key, value);
    if (hasBridge()) await platform.session.set(key, value);
  },
  async removeItem(key) {
    localStorage.removeItem(key);
    if (hasBridge()) await platform.session.remove(key);
  },
};

class DayumiQueryBuilder {
  constructor(table) {
    this.table = table;
    this.conditions = {};
    this.orderCol = null;
    this.limitVal = null;
    this.isSingle = false;
    this.action = "select";
    this.payload = null;
  }

  select() {
    this.action = "select";
    return this;
  }

  eq(col, val) {
    this.conditions[col] = val;
    return this;
  }

  neq() {
    return this;
  }

  in(col, vals) {
    if (Array.isArray(vals) && vals.length > 0) {
      this.conditions[col] = vals[0];
    }
    return this;
  }

  order(col, { ascending = true } = {}) {
    this.orderCol = `${col} ${ascending ? "ASC" : "DESC"}`;
    return this;
  }

  limit(n) {
    this.limitVal = n;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isSingle = true;
    return this;
  }

  insert(data) {
    this.action = "insert";
    this.payload = data;
    return this;
  }

  upsert(data) {
    this.action = "insert";
    this.payload = data;
    return this;
  }

  update(data) {
    this.action = "update";
    this.payload = data;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  async execute() {
    try {
      if (this.action === "insert") {
        const res = await fetch(`${API_BASE}/v1/db/tables/${this.table}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.payload),
        });
        const json = await res.json().catch(() => ({}));
        return { data: json?.data || this.payload, error: res.ok ? null : { message: json?.error } };
      }

      if (this.action === "update") {
        const body = { ...(this.payload || {}), ...this.conditions };
        const res = await fetch(`${API_BASE}/v1/db/tables/${this.table}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        return { data: json?.data || body, error: res.ok ? null : { message: json?.error } };
      }

      if (this.action === "delete") {
        const params = new URLSearchParams(this.conditions);
        const res = await fetch(`${API_BASE}/v1/db/tables/${this.table}?${params}`, {
          method: "DELETE",
        });
        const json = await res.json().catch(() => ({}));
        return { data: json, error: res.ok ? null : { message: json?.error } };
      }

      // SELECT
      const params = new URLSearchParams(this.conditions);
      if (this.orderCol) params.set("order", this.orderCol);
      if (this.limitVal) params.set("limit", this.limitVal);

      const res = await fetch(`${API_BASE}/v1/db/tables/${this.table}?${params}`);
      const json = await res.json().catch(() => ({ data: [] }));
      let rows = json?.data || [];
      if (this.isSingle) {
        return { data: rows.length > 0 ? rows[0] : null, error: null };
      }
      return { data: rows, error: null };
    } catch (e) {
      console.warn(`[DayumiDB] Query failed on ${this.table}:`, e?.message || e);
      return { data: this.isSingle ? null : [], error: { message: e?.message || "DB error" } };
    }
  }

  then(onFulfilled, onRejected) {
    return this.execute().then(onFulfilled, onRejected);
  }
}

const authListeners = new Set();

function notifyAuthChange(event, session) {
  authListeners.forEach((cb) => {
    try {
      cb(event, session);
    } catch (_) {}
  });
}

function getStoredSessionSync() {
  try {
    const raw = localStorage.getItem("dayumi-auth") || localStorage.getItem("nartya-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const s = parsed?.currentSession ?? parsed;
    return s?.user ? s : null;
  } catch {
    return null;
  }
}

export const supabase = {
  from(table) {
    return new DayumiQueryBuilder(table);
  },

  async rpc(fnName, args = {}) {
    try {
      const res = await fetch(`${API_BASE}/v1/db/rpc/${fnName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
      const json = await res.json().catch(() => ({ data: null }));
      return { data: json?.data ?? null, error: res.ok ? null : { message: json?.error || "RPC error" } };
    } catch (err) {
      console.warn(`[DayumiDB] RPC failed: ${fnName}`, err?.message || err);
      return { data: null, error: { message: err?.message || "Network error" } };
    }
  },

  auth: {
    async getSession() {
      const s = getStoredSessionSync();
      return { data: { session: s }, error: null };
    },

    async getUser() {
      const s = getStoredSessionSync();
      return { data: { user: s?.user || null }, error: null };
    },

    onAuthStateChange(cb) {
      authListeners.add(cb);
      const s = getStoredSessionSync();
      if (s) {
        setTimeout(() => cb("SIGNED_IN", s), 0);
      }
      return {
        data: {
          subscription: {
            unsubscribe: () => authListeners.delete(cb),
          },
        },
      };
    },

    async signInWithPassword({ email, password }) {
      try {
        const res = await fetch(`${API_BASE}/v1/db/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const json = await res.json();
        if (json?.session) {
          await sharedStorage.setItem("dayumi-auth", JSON.stringify(json.session));
          notifyAuthChange("SIGNED_IN", json.session);
          return { data: json, error: null };
        }
        return { data: null, error: { message: json?.error || "Identifiants invalides" } };
      } catch (err) {
        return { data: null, error: { message: err?.message || "Erreur de connexion" } };
      }
    },

    async signUp({ email, password, options }) {
      try {
        const username = options?.data?.full_name || email.split("@")[0];
        const res = await fetch(`${API_BASE}/v1/users/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: "u_" + Date.now(),
            username,
            role: "user",
          }),
        });
        const json = await res.json();
        const user = json?.user || { id: "u_" + Date.now(), username };
        const session = {
          access_token: "d_token_" + Date.now(),
          user,
        };
        await sharedStorage.setItem("dayumi-auth", JSON.stringify(session));
        notifyAuthChange("SIGNED_IN", session);
        return { data: { session, user }, error: null };
      } catch (err) {
        return { data: null, error: { message: err?.message || "Erreur d'inscription" } };
      }
    },

    async signInAnonymously() {
      try {
        const res = await fetch(`${API_BASE}/v1/db/auth/guest`, { method: "POST" });
        const json = await res.json();
        if (json?.session) {
          await sharedStorage.setItem("dayumi-auth", JSON.stringify(json.session));
          notifyAuthChange("SIGNED_IN", json.session);
          return { data: json, error: null };
        }
        return { data: null, error: { message: "Erreur invité" } };
      } catch (err) {
        return { data: null, error: { message: err?.message || "Erreur invité" } };
      }
    },

    async signInWithOAuth({ provider, options }) {
      if (provider === "discord") {
        const url = `https://discord.com/oauth2/authorize?client_id=1499518898188451920&response_type=code&redirect_uri=${encodeURIComponent(options?.redirectTo || OAUTH_REDIRECT)}&scope=identify+email+guilds+guilds.join`;
        return { data: { url }, error: null };
      }
      return { data: null, error: { message: "Provider not supported" } };
    },

    async linkIdentity({ provider, options }) {
      return this.signInWithOAuth({ provider, options });
    },

    async setSession({ access_token, refresh_token }) {
      const s = { access_token, refresh_token };
      await sharedStorage.setItem("dayumi-auth", JSON.stringify(s));
      notifyAuthChange("TOKEN_REFRESHED", s);
      return { data: { session: s }, error: null };
    },

    async signOut() {
      await sharedStorage.removeItem("dayumi-auth");
      await sharedStorage.removeItem("nartya-auth");
      notifyAuthChange("SIGNED_OUT", null);
      return { error: null };
    },
  },

  storage: {
    from(bucket) {
      return {
        getPublicUrl(path) {
          return { data: { publicUrl: `https://anime.dayumi.site/assets/${path}` } };
        },
        async upload(path) {
          return { data: { path }, error: null };
        },
        async createSignedUrl(path) {
          return { data: { signedUrl: `https://anime.dayumi.site/assets/${path}` } };
        },
      };
    },
  },
};

/**
 * Watch Party channel client (mécanisme léger de canal)
 */
class DayumiPartyChannel {
  constructor(name) {
    this.name = name;
    this.listeners = new Map();
  }
  on(type, filter, cb) {
    const key = `${type}:${filter?.event || "*"}`;
    if (!this.listeners.has(key)) this.listeners.set(key, []);
    this.listeners.get(key).push(cb);
    return this;
  }
  send(data) {
    const key = `${data.type}:${data.event || "*"}`;
    const cbs = this.listeners.get(key) || [];
    cbs.forEach((cb) => {
      try {
        cb(data);
      } catch (_) {}
    });
    return Promise.resolve("ok");
  }
  track(presence) {
    this.presence = presence;
    return Promise.resolve("ok");
  }
  untrack() {
    this.presence = null;
  }
  presenceState() {
    if (!this.presence) return {};
    return { [this.presence.clientId || "me"]: [this.presence] };
  }
  subscribe(cb) {
    setTimeout(() => {
      cb("SUBSCRIBED");
    }, 50);
    return this;
  }
}

const realtimeSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "https://uhuepuwrcjciwfsfoetn.supabase.co",
  import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVodWVwdXdyY2pjaXdmc2ZvZXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0OTI1NTIsImV4cCI6MjEwOTA2ODU1Mn0.SQdqYeZvhEgyvG9Nwufon2hqDZ4v-CVJCeLJY9dDaAo"
);

export const partyClient = realtimeSupabase;

export const OAUTH_REDIRECT = `${SITE_URL}/callback`;
