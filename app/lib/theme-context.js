"use client";

import { createContext, useContext, useEffect, useState } from "react";

export const DARK = {
  name: "dark",
  BG: "#0a0a0a",
  CARD: "#161616",
  CARD_ALT: "#1e1e1e",
  BORDER: "#2a2a2a",
  RED: "#ef233c",
  GOLD: "#ffd60a",
  WHITE: "#f5f0e6",
  MUTED: "#8a8a8a",
};

export const LIGHT = {
  name: "light",
  BG: "#faf6ee",
  CARD: "#ffffff",
  CARD_ALT: "#f2ecdd",
  BORDER: "#e2d9c3",
  RED: "#d62839",
  GOLD: "#a8790a",
  WHITE: "#12100c",
  MUTED: "#726a55",
};

const ThemeContext = createContext({
  theme: "dark",
  colors: DARK,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("wos-theme");
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  function toggleTheme() {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      window.localStorage.setItem("wos-theme", next);
      return next;
    });
  }

  const colors = theme === "dark" ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
