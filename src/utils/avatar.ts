export type AuthorLike = {
  id?: number;
  apodo?: string | null;
  nombre?: string | null;
  avatar?: string | null;
  avatar_url?: string | null;
  profile_picture?: string | null;
  picture?: string | null;
  image?: string | null;
  url?: string | null;
};

/**
 * Acepta un valor genérico (unknown), lo valida como objeto y
 * busca entre varios aliases la URL del avatar. Devuelve null si no encuentra.
 */
export function getAvatarUrlFromAuthor(author?: unknown | null): string | null {
  if (!author || typeof author !== "object") return null;

  const record = author as Record<string, unknown>;
  const aliases = [
    "avatar",
    "avatar_url",
    "profile_picture",
    "picture",
    "image",
    "url",
  ];

  for (const key of aliases) {
    const val = record[key];
    if (typeof val === "string" && val.trim() !== "") {
      return val.trim();
    }
  }

  return null;
}

/**
 * Obtiene una inicial segura a partir de apodo o nombre.
 * Acepta cualquier objeto compatible.
 */
export function getInitialFromAuthor(author?: unknown | null): string {
  if (!author || typeof author !== "object") return "U";

  const record = author as Record<string, unknown>;

  const apodo =
    typeof record["apodo"] === "string" && record["apodo"].trim()
      ? (record["apodo"] as string).trim()[0]
      : undefined;

  const nombre =
    typeof record["nombre"] === "string" && record["nombre"].trim()
      ? (record["nombre"] as string).trim()[0]
      : undefined;

  const ch = apodo ?? nombre ?? "U";
  return String(ch).toUpperCase();
}