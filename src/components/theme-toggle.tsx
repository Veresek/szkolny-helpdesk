"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const THEME_STORAGE_KEY = "helpdesk-theme";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    let savedTheme: string | null = null;
    try {
      savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // The theme still follows the system preference when storage is unavailable.
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = savedTheme ? savedTheme === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark", shouldUseDark);
    setIsDark(shouldUseDark);
  }, []);

  function toggleTheme() {
    const root = document.documentElement;
    const nextIsDark = !root.classList.contains("dark");
    root.classList.add("theme-changing");
    root.classList.toggle("dark", nextIsDark);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => root.classList.remove("theme-changing"));
    });
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextIsDark ? "dark" : "light");
    } catch {
      // Keep the current selection for this page when storage is unavailable.
    }
    setIsDark(nextIsDark);
  }

  return (
    <button
      aria-label={isDark ? "Włącz jasny motyw" : "Włącz ciemny motyw"}
      className="theme-toggle"
      onClick={toggleTheme}
      title={isDark ? "Jasny motyw" : "Ciemny motyw"}
      type="button"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span>{isDark ? "Jasny motyw" : "Ciemny motyw"}</span>
    </button>
  );
}
