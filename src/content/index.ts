import { loadConfig, type ShuffleConfig } from "../shared/config";
import type { Segment } from "../shared/types";
import { generateShuffle, normalize } from "../shuffle/engine";
import { findPublishConfirmation, findReviewAction } from "./actions";
import { acquireInteractionLock } from "./interaction-lock";

const BUTTON_ID = "refrag-routine-shuffler";
const WAIT_TIMEOUT = 20_000;
const pause = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
let running = false;

const text = (element: Element | null | undefined): string =>
  (element?.textContent ?? "").replace(/\s+/g, " ").trim();
const same = (a: string, b: string): boolean => normalize(a) === normalize(b);
const visible = (element: Element): boolean => {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return (
    element.isConnected &&
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden"
  );
};

async function waitFor<T>(
  find: () => T | false | null | undefined,
  message: string,
  timeout = WAIT_TIMEOUT,
): Promise<T> {
  const started = performance.now();
  while (performance.now() - started < timeout) {
    const result = find();
    if (result) return result;
    await pause(75);
  }
  throw new Error(message);
}

function leafAction(
  label: string,
  root: ParentNode = document,
): HTMLElement | undefined {
  return [
    ...root.querySelectorAll<HTMLElement>("button, [role='button'], div, a"),
  ].find(
    (element) =>
      !element.children.length &&
      same(text(element), label) &&
      visible(element),
  );
}

function cards(): HTMLElement[] {
  const heading = [...document.querySelectorAll("h1")].find((node) =>
    same(text(node), "Segments"),
  );
  const container =
    heading?.parentElement?.querySelector(".smooth-dnd-container.vertical") ??
    document.querySelector(".smooth-dnd-container.vertical");
  return container
    ? [...container.children]
        .map((node) => node.querySelector<HTMLElement>(".item"))
        .filter((node): node is HTMLElement => Boolean(node))
    : [];
}

function readCard(card: HTMLElement): Segment {
  const values = [...card.querySelectorAll("h2")].map(text);
  const number = Number(values[0]?.match(/^Segment\s+(\d+)/i)?.[1]);
  if (!number || !values[1] || !values[2])
    throw new Error("Could not read a routine segment card.");
  return { number, map: values[1], mod: values[2], duration: values[3] ?? "" };
}

const cardFor = (number: number): HTMLElement | undefined =>
  cards().find((card) => readCard(card).number === number);
const editorNumber = (): number | undefined =>
  Number(
    text(
      [...document.querySelectorAll("h1")].find((node) =>
        /^Segment\s+\d+$/i.test(text(node)),
      ),
    ).match(/\d+/)?.[0],
  ) || undefined;

function editor(): HTMLElement {
  const title = [...document.querySelectorAll("h1")].find((node) =>
    /^Segment\s+\d+$/i.test(text(node)),
  );
  let node = title?.parentElement;
  while (node && node !== document.body) {
    const headings = [...node.querySelectorAll("h1")].map(text);
    if (
      headings.some((value) => same(value, "Map")) &&
      headings.some((value) => same(value, "Mod"))
    )
      return node;
    node = node.parentElement;
  }
  throw new Error("Could not locate the segment editor.");
}

async function selectSegment(number: number): Promise<void> {
  const card = cardFor(number);
  if (!card) throw new Error(`Could not find segment ${number}.`);
  if (editorNumber() !== number) {
    card.scrollIntoView({ block: "center" });
    card.click();
  }
  await waitFor(
    () =>
      editorNumber() === number &&
      editor().querySelector('button[aria-haspopup="true"]'),
    `Could not activate segment ${number}.`,
  );
  await pause(120);
}

function dropdown(label: string): HTMLButtonElement {
  const heading = [...editor().querySelectorAll("h1")].find((node) =>
    same(text(node), label),
  );
  const trigger = heading?.parentElement?.querySelector<HTMLButtonElement>(
    'button[aria-haspopup="true"]',
  );
  if (!trigger) throw new Error(`Could not find Refrag's ${label} selector.`);
  return trigger;
}

function menuFor(trigger: HTMLButtonElement): HTMLElement | undefined {
  const controlled = trigger.getAttribute("aria-controls")
    ? document.getElementById(trigger.getAttribute("aria-controls")!)
    : null;
  if (controlled && visible(controlled)) return controlled;
  const menus = [
    ...document.querySelectorAll<HTMLElement>('[role="menu"]'),
  ].filter(visible);
  return (
    menus.find((menu) => menu.getAttribute("aria-labelledby") === trigger.id) ??
    (menus.length === 1 ? menus[0] : undefined)
  );
}

async function choose(label: string, value: string): Promise<void> {
  let trigger = dropdown(label);
  if (same(text(trigger), value)) return;
  trigger.click();
  const menu = await waitFor(
    () => menuFor(dropdown(label)),
    `Could not open Refrag's ${label} menu.`,
  );
  const candidates = [
    ...menu.querySelectorAll<HTMLElement>(
      '[role="menuitem"], [role="option"], button, [data-headlessui-value]',
    ),
  ];
  const option =
    candidates.find((node) => same(text(node), value)) ??
    [...menu.querySelectorAll<HTMLElement>("*")].find(
      (node) => !node.children.length && same(text(node), value),
    );
  if (!option) throw new Error(`Could not select ${label} “${value}”.`);
  option.scrollIntoView({ block: "nearest" });
  option.click();
  await waitFor(() => {
    trigger = dropdown(label);
    return (
      trigger.getAttribute("aria-expanded") !== "true" &&
      same(text(trigger), value)
    );
  }, `Could not confirm ${label} “${value}”.`);
  if (same(label, "Map")) {
    await waitFor(
      () => !dropdown("Mod").disabled,
      "The Mod selector did not finish updating.",
    );
    await pause(120);
  }
}

async function save(segment: Segment): Promise<void> {
  if (editorNumber() !== segment.number)
    throw new Error(`Refusing to save the wrong segment.`);
  const title = [...editor().querySelectorAll("h1")].find((node) =>
    /^Segment\s+\d+$/i.test(text(node)),
  );
  const control = title?.parentElement
    ? leafAction("Save", title.parentElement)
    : undefined;
  if (!control) throw new Error("Could not find Refrag's Save control.");
  control.click();
  await waitFor(() => {
    const card = cardFor(segment.number);
    if (!card) return false;
    const state = readCard(card);
    return same(state.map, segment.map) && same(state.mod, segment.mod);
  }, `Segment ${segment.number} was not saved.`);
  await pause(900);
}

async function publishRoutine(): Promise<void> {
  const reviewAction = findReviewAction((label) => leafAction(label));
  if (!reviewAction) throw new Error("Could not find Refrag's review action.");

  reviewAction.click();
  const dialog = await waitFor(
    () =>
      [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].find(
        visible,
      ),
    "Refrag's publish dialog did not open.",
  );
  const confirmation = await waitFor(
    () => findPublishConfirmation((label) => leafAction(label, dialog)),
    "Could not find Publish or Update Routine in Refrag's dialog.",
  );
  confirmation.click();
}

async function shuffle(button: HTMLElement): Promise<void> {
  if (running) return;
  running = true;
  const interactionLock = acquireInteractionLock();
  button.setAttribute("aria-disabled", "true");
  button.textContent = "Preparing…";
  try {
    const original = cards().map(readCard);
    const config = await loadConfig();
    const result = generateShuffle(original, config);
    if (config.runtime.logPlan)
      console.table(
        result.map((target, i) => ({
          segment: target.number,
          from: `${original[i]!.map} / ${original[i]!.mod}`,
          to: `${target.map} / ${target.mod}`,
        })),
      );
    for (let i = 0; i < result.length; i++) {
      const target = result[i]!,
        before = original[i]!;
      button.textContent = `${i + 1}/${result.length}`;
      if (
        config.runtime.saveOnlyChangedSegments &&
        same(before.map, target.map) &&
        same(before.mod, target.mod)
      )
        continue;
      await selectSegment(target.number);
      await choose("Map", target.map);
      await choose("Mod", target.mod);
      await save(target);
    }
    if (config.runtime.autoPublish) {
      button.textContent = "Publishing…";
      await publishRoutine();
    }
    button.textContent = "Shuffled";
    await pause(1200);
  } finally {
    interactionLock.release();
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    running = false;
    button.removeAttribute("aria-disabled");
    button.textContent = "Shuffle";
  }
}

function mount(): void {
  if (document.getElementById(BUTTON_ID)) return;
  const reviewAction = findReviewAction((label) => leafAction(label));
  if (!leafAction("Delete") || !reviewAction) return;
  const button = reviewAction.cloneNode(false) as HTMLElement;
  button.id = BUTTON_ID;
  button.textContent = "Shuffle";
  button.title = "Shuffle maps and mods using extension settings";
  button.style.setProperty("background-color", "#4d7c61", "important");
  button.style.setProperty("color", "white", "important");
  button.addEventListener(
    "click",
    () =>
      void shuffle(button).catch((error: unknown) => {
        console.error("[Refrag Routine Shuffler]", error);
        button.textContent = "Try again";
      }),
  );
  reviewAction.insertAdjacentElement("beforebegin", button);
}

new MutationObserver(mount).observe(document.documentElement, {
  childList: true,
  subtree: true,
});
mount();

declare global {
  interface Window {
    RefragRoutineShuffler: {
      preview(): Promise<Segment[]>;
      shuffle(): Promise<void>;
      getConfig(): Promise<ShuffleConfig>;
    };
  }
}
window.RefragRoutineShuffler = {
  async preview() {
    return generateShuffle(cards().map(readCard), await loadConfig());
  },
  async shuffle() {
    const button = document.getElementById(BUTTON_ID);
    if (!button) throw new Error("Shuffle button is not available.");
    await shuffle(button);
  },
  getConfig: loadConfig,
};
