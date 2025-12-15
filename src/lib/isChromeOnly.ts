export function isChromeOnly(): boolean {
  if (typeof navigator === "undefined") return false;

  // Preferimos userAgentData cuando exista (Client Hints)
  const uaData = (navigator as any).userAgentData;
  if (uaData && Array.isArray(uaData.brands)) {
    const brands: string[] = uaData.brands.map((b: any) => String(b.brand).toLowerCase());
    const excluded = ["microsoft edge", "edge", "opera", "brave", "firefox", "safari"];
    if (brands.some((b) => excluded.some((ex) => b.includes(ex)))) return false;
    return brands.some((b) => b.includes("google chrome") || b.includes("chromium"));
  }

  // Fallback a userAgent string
  const ua = navigator.userAgent || "";
  const isChrome = /\bChrome\/\d+/i.test(ua) || /\bCriOS\/\d+/i.test(ua); // desktop & iOS Chrome (CriOS)
  const isEdge = /\bEdg(e|A|iOS)?\//i.test(ua);
  const isOpera = /\bOPR\//i.test(ua);
  const isFirefox = /\bFirefox\//i.test(ua);
  const isBrave = /\bBrave\//i.test(ua);
  return Boolean(isChrome && !isEdge && !isOpera && !isFirefox && !isBrave);
}