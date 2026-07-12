const LOCK_ID = "refrag-routine-shuffler-lock";
const BLOCKED_KEYS = new Set([
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "End",
  "Home",
  "PageDown",
  "PageUp",
  " ",
]);

export interface InteractionLock {
  release(): void;
}

export function acquireInteractionLock(): InteractionLock {
  document.getElementById(LOCK_ID)?.remove();

  const overlay = document.createElement("div");
  overlay.id = LOCK_ID;
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-live", "assertive");
  overlay.textContent = "Shuffling routine… Please wait.";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    display: "grid",
    placeItems: "center",
    color: "#ffffff",
    background: "rgba(15, 15, 15, 0.72)",
    font: "600 14px ui-sans-serif, system-ui, sans-serif",
    cursor: "wait",
    userSelect: "none",
  });

  const root = document.documentElement;
  const body = document.body;
  const previousRootOverflow = root.style.overflow;
  const previousBodyOverflow = body.style.overflow;
  root.style.setProperty("overflow", "hidden", "important");
  body.style.setProperty("overflow", "hidden", "important");

  const blockKeyboardScroll = (event: KeyboardEvent): void => {
    if (BLOCKED_KEYS.has(event.key)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  document.addEventListener("keydown", blockKeyboardScroll, true);
  body.append(overlay);

  let released = false;
  return {
    release(): void {
      if (released) return;
      released = true;
      document.removeEventListener("keydown", blockKeyboardScroll, true);
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
      overlay.remove();
    },
  };
}
