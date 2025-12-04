import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

/** Obtiene la lista de notificaciones del servidor. */
export async function fetchNotifications(token?: string | null) {
  const t =
    token ?? (typeof window !== "undefined" ? localStorage.getItem("authToken") : null);
  const res = await axios.get<{ data?: any[] }>(`${API_BASE}/notifications`, {
    headers: t ? { Authorization: `Bearer ${t}` } : undefined,
  });
  return res.data?.data ?? [];
}

/** Marca todas las notificaciones del usuario como leídas (envía markAll: true). */
export async function markAllNotifications(token?: string | null) {
  const t =
    token ?? (typeof window !== "undefined" ? localStorage.getItem("authToken") : null);
  if (!t) throw new Error("no auth token");
  const res = await axios.patch(
    `${API_BASE}/notifications/mark-read`,
    { markAll: true },
    {
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    }
  );
  return res.data;
}

/** Marca las notificaciones por ids (array no vacío). */
export async function markNotificationsByIds(ids: number[], token?: string | null) {
  if (!ids || ids.length === 0) return { ok: true, affected: 0 };
  const t =
    token ?? (typeof window !== "undefined" ? localStorage.getItem("authToken") : null);
  if (!t) throw new Error("no auth token");
  const res = await axios.patch(
    `${API_BASE}/notifications/mark-read`,
    { ids },
    {
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    }
  );
  return res.data;
}

/** Borra todas las notificaciones del usuario. */
export async function clearAllNotifications(token?: string | null) {
  const t =
    token ?? (typeof window !== "undefined" ? localStorage.getItem("authToken") : null);
  if (!t) throw new Error("no auth token");
  const res = await axios.delete(`${API_BASE}/notifications`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  return res.data;
}