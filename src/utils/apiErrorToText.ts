import type { TFunction } from "i18next";

export type ApiErrorResponse = {
  code?: string;
  params?: Record<string, unknown>;
  message?: unknown;
};

/**
 * Convierte una posible respuesta de error en una cadena segura para mostrar.
 * - `t` es la función de i18next.
 * - `resp` viene del servidor (puede ser undefined/null).
 * - `fallback` texto alternativo si no hay nada útil.
 */
export function apiErrorToText(t: TFunction, resp: ApiErrorResponse | null | undefined, fallback?: string): string {
  const fallbackText = fallback ?? t("errors.UNKNOWN");

  if (!resp) return fallbackText;

  // 1) Si viene código estructurado -> traducir con key
  if (typeof resp.code === "string" && resp.code.trim().length > 0) {
    const translated = t(`errors.${resp.code}`, resp.params ?? {});
    return typeof translated === "string" ? translated : String(translated);
  }

  // 2) Si viene `message` como string -> intentar mapear a keys conocidas
  if (typeof resp.message === "string" && resp.message.length > 0) {
    const messageMap: Record<string, string> = {
      "Invalid credentials": "errors.INVALID_CREDENTIALS",
      "Credenciales inválidas": "errors.INVALID_CREDENTIALS",
      // añade mapeos concretos que recibas del backend
    };

    const mappedKey = messageMap[resp.message];
    if (mappedKey) {
      const translated = t(mappedKey);
      return typeof translated === "string" ? translated : String(translated);
    }

    // Si no hay mapeo, devolvemos el message tal cual (es string)
    return resp.message;
  }

  // 3) Si no hay nada legible -> fallback
  return fallbackText;
}