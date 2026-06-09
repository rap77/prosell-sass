"use client";

import { useEffect } from "react";

interface KeyboardShortcuts {
  [key: string]: () => void;
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcuts,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      // Check for modifier keys
      const hasModifier =
        event.metaKey || event.ctrlKey || event.altKey || event.shiftKey;

      // Build the shortcut key string (e.g., "cmd+k", "escape", "mod+s")
      let shortcutKey = key;
      if (event.metaKey || event.ctrlKey) shortcutKey = "cmd+" + key;
      if (event.altKey) shortcutKey = "alt+" + key;
      if (event.shiftKey && !hasModifier) shortcutKey = "shift+" + key;

      // Check if this key has a handler
      const handler = shortcuts[shortcutKey] || shortcuts[key];
      if (handler) {
        // Prevent default behavior for shortcuts
        event.preventDefault();
        handler();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, enabled]);
}
