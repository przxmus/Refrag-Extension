import { isRoutineListPath, routineViewUrl } from "./routine-navigation";

const WAIT_TIMEOUT = 5_000;
const pause = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
const text = (element: Element | null | undefined): string =>
  (element?.textContent ?? "").replace(/\s+/g, " ").trim();
const same = (a: string, b: string): boolean =>
  a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;
let openingRoutine = false;

async function waitForDestination(
  read: () => string | undefined,
): Promise<string> {
  const started = performance.now();
  while (performance.now() - started < WAIT_TIMEOUT) {
    const result = read();
    if (result) return result;
    await pause(25);
  }
  throw new Error("Could not resolve the routine URL.");
}

function routineCardFor(title: HTMLElement): HTMLElement | undefined {
  let node = title.parentElement;
  while (node && node !== document.body) {
    const labels = [
      ...node.querySelectorAll("h1, h2, h3, [role='heading']"),
    ].map(text);
    if (
      labels.some((label) => same(label, "Author")) &&
      labels.some((label) => same(label, "Status")) &&
      labels.some((label) => same(label, "Length"))
    )
      return node;
    node = node.parentElement;
  }
  return undefined;
}

async function openRoutine(card: HTMLElement): Promise<void> {
  if (openingRoutine) return;
  const actions = [
    ...card.querySelectorAll<HTMLElement>(".cursor-pointer"),
  ].filter((action) => action !== card);
  const status = [
    ...card.querySelectorAll<HTMLElement>("h1, h2, h3, [role='heading']"),
  ].map(text);
  const editAction = status.some((value) => same(value, "Draft"))
    ? actions.at(-1)
    : actions[0];
  if (!editAction) return;

  openingRoutine = true;
  let destination: string | undefined;
  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);
  const resolveRoutine = (
    url: string | URL | null | undefined,
  ): string | undefined => {
    if (url === undefined || url === null) return undefined;
    return routineViewUrl(new URL(String(url), location.href).toString());
  };
  const interceptPushState: History["pushState"] = (data, unused, url) => {
    const routineUrl = resolveRoutine(url);
    if (!routineUrl) {
      originalPushState(data, unused, url);
      return;
    }
    destination = routineUrl;
    originalPushState(data, unused, routineUrl);
  };
  const interceptReplaceState: History["replaceState"] = (
    data,
    unused,
    url,
  ) => {
    const routineUrl = resolveRoutine(url);
    if (!routineUrl) {
      originalReplaceState(data, unused, url);
      return;
    }
    destination = routineUrl;
    originalPushState(data, unused, routineUrl);
  };
  history.pushState = interceptPushState;
  history.replaceState = interceptReplaceState;

  try {
    editAction.click();
    location.replace(await waitForDestination(() => destination));
  } catch (error) {
    openingRoutine = false;
    console.error("[Refrag+]", error);
  } finally {
    if (history.pushState === interceptPushState)
      history.pushState = originalPushState;
    if (history.replaceState === interceptReplaceState)
      history.replaceState = originalReplaceState;
  }
}

function mountRoutineLinks(): void {
  if (!isRoutineListPath(location.pathname)) return;
  for (const title of document.querySelectorAll<HTMLElement>(
    "h1, h2, h3, [role='heading']",
  )) {
    const card = routineCardFor(title);
    if (!card || card.dataset.refragRoutineLink === "true") continue;
    card.dataset.refragRoutineLink = "true";
    card.style.cursor = "pointer";
    card.setAttribute("role", "link");
    card.tabIndex = 0;

    const activate = (target: EventTarget | null): void => {
      const element = target instanceof Element ? target : null;
      const action = element?.closest(
        "a, button, [role='button'], .cursor-pointer",
      );
      if (action && action !== card) return;
      void openRoutine(card);
    };
    card.addEventListener("click", (event) => activate(event.target));
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target !== card) return;
      event.preventDefault();
      activate(event.target);
    });
  }
}

new MutationObserver(mountRoutineLinks).observe(document.documentElement, {
  childList: true,
  subtree: true,
});
mountRoutineLinks();
