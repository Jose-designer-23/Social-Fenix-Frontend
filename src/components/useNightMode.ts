import { useEffect, useState } from "react";

const STORAGE_KEY = "app:night-mode";

export default function useNightMode(defaultMode = false) {
  const [isNight, setIsNight] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : defaultMode;
    } catch {
      return defaultMode;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(isNight));
    } catch {
      // ignore
    }
    const root = document.documentElement;
    if (isNight) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [isNight]);

  return { isNight, setIsNight };
}