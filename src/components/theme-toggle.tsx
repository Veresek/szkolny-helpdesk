"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { THEME_CHANGE_EVENT, THEME_STORAGE_KEY } from "@/lib/theme";

function subscribeToTheme(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

function getThemeSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerThemeSnapshot() {
  return false;
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

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
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
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
