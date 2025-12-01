
import type { PostInteraction } from "../../../utils/notification-mapper";

export type ActorShape = {
  id: number;
  nombre?: string | null;
  apodo?: string | null;
  avatar?: string | null;
};


export function emitPostInteraction(payload: PostInteraction) {
  try {
    // Añadimos campo `source` para identificar que es un evento originado localmente
    const p = { ...payload, source: "local" as const, persisted: false as const };
    window.dispatchEvent(new CustomEvent("post:interaction", { detail: p }));
  } catch (err) {
    // Para que un error no rompa la app
    // eslint-disable-next-line no-console
    console.warn("emitPostInteraction failed", err);
  }
}