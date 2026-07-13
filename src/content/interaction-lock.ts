const LOCK_ID = "refrag-plus-interaction-lock";
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
  update(progress: InteractionProgress): void;
}

export interface InteractionProgress {
  current?: number;
  detail?: string;
  title: string;
  total?: number;
}

export function acquireInteractionLock(): InteractionLock {
  document.getElementById(LOCK_ID)?.remove();

  const overlay = document.createElement("div");
  overlay.id = LOCK_ID;
  overlay.setAttribute("role", "presentation");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    display: "grid",
    placeItems: "center",
    padding: "16px",
    color: "#f5f5f5",
    background: "rgba(15, 15, 15, 0.82)",
    font: "14px ui-sans-serif, system-ui, -apple-system, sans-serif",
    cursor: "wait",
    userSelect: "none",
  });

  const panel = document.createElement("div");
  panel.setAttribute("role", "status");
  panel.setAttribute("aria-live", "polite");
  panel.setAttribute("aria-atomic", "true");
  Object.assign(panel.style, {
    width: "min(380px, calc(100vw - 32px))",
    padding: "20px",
    background: "#1a1a1a",
    border: "1px solid #3a3a3a",
    borderRadius: "10px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.35)",
  });

  const title = document.createElement("div");
  Object.assign(title.style, {
    marginBottom: "6px",
    fontSize: "15px",
    fontWeight: "650",
  });
  const detail = document.createElement("div");
  Object.assign(detail.style, {
    minHeight: "40px",
    color: "#a3a3a3",
    fontSize: "13px",
    lineHeight: "20px",
  });
  const track = document.createElement("div");
  track.setAttribute("role", "progressbar");
  Object.assign(track.style, {
    height: "6px",
    marginTop: "14px",
    overflow: "hidden",
    background: "#303030",
    borderRadius: "3px",
  });
  const bar = document.createElement("div");
  Object.assign(bar.style, {
    width: "0%",
    height: "100%",
    background: "#00d4aa",
    transition: "width 150ms ease",
  });
  const count = document.createElement("div");
  Object.assign(count.style, {
    marginTop: "8px",
    color: "#a3a3a3",
    fontSize: "12px",
    textAlign: "right",
  });
  track.append(bar);
  panel.append(title, detail, track, count);
  overlay.append(panel);

  const update = (progress: InteractionProgress): void => {
    const hasTotal =
      typeof progress.current === "number" &&
      typeof progress.total === "number" &&
      progress.total > 0;
    const percentage = hasTotal
      ? Math.min(100, Math.max(0, (progress.current! / progress.total!) * 100))
      : 0;
    title.textContent = progress.title;
    detail.textContent = progress.detail ?? "";
    bar.style.width = `${percentage}%`;
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    track.setAttribute("aria-valuenow", String(Math.round(percentage)));
    count.textContent = hasTotal
      ? `${Math.round(progress.current!)} / ${Math.round(progress.total!)} · ${Math.round(percentage)}%`
      : "Working…";
  };
  update({
    current: 0,
    detail: "Reading segments and shuffle settings",
    title: "Preparing shuffle",
    total: 1,
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
    update,
  };
}
