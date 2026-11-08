const API_BASE = "https://anime.dayumi.site";

/** État persisté pour la relève d'hôte dans MariaDB via dayumi-api. Un échec ne casse jamais le salon. */

export async function savePartyRoomState(code, { hostClientId, current, queue, playback, options }) {
  try {
    await fetch(`${API_BASE}/v1/party/rooms/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        hostClientId,
        current: current ?? null,
        queue: queue ?? [],
        playback: playback ?? { currentTime: 0, isPlaying: false },
        options: options ?? {},
      }),
    });
  } catch (_) {}
}

export async function getPartyRoomState(code) {
  try {
    const res = await fetch(`${API_BASE}/v1/party/rooms/${code}`);
    if (!res.ok) return null;
    const json = await res.json();
    const row = json?.data;
    if (!row) return null;
    return {
      current: row.current ?? null,
      queue: Array.isArray(row.queue) ? row.queue : [],
      playback: row.playback || { currentTime: 0, isPlaying: false },
      options: row.options || {},
      updatedAt: row.updatedAt || row.updated_at,
    };
  } catch (_) {
    return null;
  }
}

export async function closePartyRoom(code) {
  try {
    await fetch(`${API_BASE}/v1/party/rooms/${code}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch (_) {}
}

/** Hôte d'un salon public : rappelé régulièrement, sinon le salon sort de la liste. */
export async function publishPartyRoom(code, isPublic, participants) {
  try {
    await fetch(`${API_BASE}/v1/party/rooms/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        isPublic: !!isPublic,
        participants: participants || 1,
      }),
    });
  } catch (_) {}
}

export async function listPublicPartyRooms() {
  try {
    const res = await fetch(`${API_BASE}/v1/party/rooms/public`);
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data || [];
  } catch (_) {
    return [];
  }
}
