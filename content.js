(() => {
  "use strict";

  const BUTTON_ID = "refrag-routine-shuffler";
  const STYLE_ID = "refrag-routine-shuffler-style";
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${BUTTON_ID} {
        background-color: #4d7c61 !important;
        color: #ffffff !important;
      }
      #${BUTTON_ID}:hover { background-color: #5d9171 !important; }
      #${BUTTON_ID}[aria-disabled="true"] { cursor: wait; opacity: .7; }
    `;
    document.head.append(style);
  }

  function elementText(element) {
    return (element.innerText || element.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Routine cards render some names differently from the selector (for example
  // "AngleTrainer" on a card and "Angle Trainer" in the menu).
  function sameValue(left, right) {
    return String(left).replace(/\s+/g, "").toLowerCase() ===
      String(right).replace(/\s+/g, "").toLowerCase();
  }

  function actionElement(label) {
    return Array.from(document.querySelectorAll("*")).find(
      (element) =>
        element.children.length === 0 && elementText(element) === label,
    );
  }

  const visible = (element) => {
    const rect = element?.getBoundingClientRect();
    const style = element && getComputedStyle(element);
    return Boolean(rect?.width && rect?.height && style?.display !== "none" && style?.visibility !== "hidden");
  };

  async function waitFor(find, message) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const result = find();
      if (result) return result;
      await pause(50);
    }
    throw new Error(message);
  }

  function getSegmentCards() {
    const container = document.querySelector(".smooth-dnd-container.vertical");
    if (!container) return [];
    return Array.from(container.children)
      .map((wrapper) => wrapper.querySelector(".item"))
      .filter(Boolean);
  }

  async function selectSegment(segmentNumber) {
    const index = segmentNumber - 1;
    const card = getSegmentCards()[index];
    if (!card) throw new Error(`Could not find segment ${segmentNumber}.`);
    card.scrollIntoView({ block: "center", behavior: "auto" });
    card.click();
    await waitFor(
      () => getSegmentCards()[index]?.classList.contains("border-primary-500"),
      `Could not activate segment ${segmentNumber}.`,
    );
  }

  function getDropdown(label) {
    const heading = Array.from(document.querySelectorAll("h1")).find(
      (element) => sameValue(elementText(element), label),
    );
    const trigger = heading?.parentElement?.querySelector('button[aria-haspopup="true"]');
    if (!trigger) throw new Error(`Could not find Refrag’s ${label} selector.`);
    return trigger;
  }

  async function chooseDropdownValue(label, value) {
    let trigger = getDropdown(label);
    if (sameValue(elementText(trigger), value)) return;
    trigger.click();
    const menu = await waitFor(
      () => Array.from(document.querySelectorAll('[role="menu"]')).find(visible),
      `Could not open Refrag’s ${label} menu.`,
    );
    const option = Array.from(menu.querySelectorAll('[role="menuitem"],[role="option"],button'))
      .find((element) => visible(element) && sameValue(elementText(element), value));
    if (!option) throw new Error(`Could not select ${label} ${value}.`);
    option.click();
    await waitFor(() => {
      trigger = getDropdown(label);
      return trigger.getAttribute("aria-expanded") !== "true" && sameValue(elementText(trigger), value);
    }, `Could not confirm ${label} ${value}.`);
  }

  async function availableDropdownValues(label, values) {
    const trigger = getDropdown(label);
    trigger.click();
    const menu = await waitFor(
      () => Array.from(document.querySelectorAll('[role="menu"]')).find(visible),
      `Could not open Refrag’s ${label} menu.`,
    );
    const available = values.filter((value) =>
      Array.from(menu.querySelectorAll('[role="menuitem"],[role="option"],button'))
        .some((element) => visible(element) && sameValue(elementText(element), value)),
    );
    trigger.click();
    return available;
  }

  function shuffledMapAssignments(currentMaps) {
    const values = [...currentMaps];
    if (new Set(values).size < 2) return values;

    let bestCandidate = values;
    let fewestUnchanged = values.length;
    for (let tryNumber = 0; tryNumber < 60; tryNumber += 1) {
      const candidate = [...values];
      for (let index = candidate.length - 1; index > 0; index -= 1) {
        const swapIndex =
          crypto.getRandomValues(new Uint32Array(1))[0] % (index + 1);
        [candidate[index], candidate[swapIndex]] = [
          candidate[swapIndex],
          candidate[index],
        ];
      }
      const unchanged = candidate.filter(
        (map, index) => map === values[index],
      ).length;
      if (unchanged < fewestUnchanged) {
        bestCandidate = candidate;
        fewestUnchanged = unchanged;
      }
      if (unchanged === 0) return candidate;
    }

    return bestCandidate;
  }

  function saveButton() {
    return actionElement("Save");
  }

  function assignCompatibleMods(allowedMods, mods, currentMods) {
    const remaining = new Map();
    for (const mod of mods) remaining.set(mod, (remaining.get(mod) || 0) + 1);
    const assignment = Array(allowedMods.length);
    const order = allowedMods
      .map((options, index) => ({ index, options }))
      .sort((left, right) => left.options.length - right.options.length);

    let bestAssignment = null;
    let mostChanged = -1;

    function visit(position, changed) {
      if (changed + order.length - position <= mostChanged) return;
      if (position === order.length) {
        if (changed > mostChanged) {
          mostChanged = changed;
          bestAssignment = [...assignment];
        }
        return;
      }
      const { index, options } = order[position];
      const candidates = options
        .filter((mod) => remaining.get(mod) > 0)
        .sort((left, right) => {
          const leftUnchanged = sameValue(left, currentMods[index]);
          const rightUnchanged = sameValue(right, currentMods[index]);
          return Number(leftUnchanged) - Number(rightUnchanged);
        });
      for (const mod of candidates) {
        remaining.set(mod, remaining.get(mod) - 1);
        assignment[index] = mod;
        visit(position + 1, changed + Number(!sameValue(mod, currentMods[index])));
        remaining.set(mod, remaining.get(mod) + 1);
      }
    }

    visit(0, 0);
    return bestAssignment;
  }

  async function shuffleRoutine(button) {
    const cards = getSegmentCards();
    if (cards.length < 2)
      throw new Error(
        "At least two segments are required to shuffle a routine.",
      );

    button.disabled = true;
    button.textContent = "Shuffling…";

    try {
      const segments = cards.map((card) => {
        const values = Array.from(card.querySelectorAll("h2")).map(elementText);
        const map = values[1];
        const mod = values[2];
        if (!map || !mod) throw new Error("Could not read a routine segment.");
        const number = Number(values[0]?.match(/^Segment (\d+)/)?.[1]);
        if (!number) throw new Error("Could not read a routine segment number.");
        return { number, map, mod };
      });

      const targetMaps = shuffledMapAssignments(
        segments.map((segment) => segment.map),
      );
      const targetMods = shuffledMapAssignments(
        segments.map((segment) => segment.mod),
      );
      if (targetMaps.every((map, index) => map === segments[index].map)) {
        throw new Error(
          "This routine needs at least two distinct maps to create a new combination.",
        );
      }

      const distinctMods = [...new Set(targetMods)];
      const allowedMods = [];
      for (const [index, segment] of segments.entries()) {
        await selectSegment(segment.number);
        await chooseDropdownValue("Map", targetMaps[index]);
        await selectSegment(segment.number);
        allowedMods[index] = await availableDropdownValues("Mod", distinctMods);
      }

      const compatibleMods = assignCompatibleMods(
        allowedMods,
        targetMods,
        segments.map((segment) => segment.mod),
      );
      if (!compatibleMods) {
        location.reload();
        throw new Error(
          "Refrag does not allow a complete shuffled map and mod combination for this routine.",
        );
      }

      for (const [index, segment] of segments.entries()) {
        await selectSegment(segment.number);
        await chooseDropdownValue("Map", targetMaps[index]);
        await selectSegment(segment.number);
        await chooseDropdownValue("Mod", compatibleMods[index]);

        const save = saveButton();
        if (!save) throw new Error("Could not find Refrag’s Save button.");
        save.click();
        await pause(180);
      }

      button.textContent = "Shuffled";
      await pause(1200);
    } finally {
      button.disabled = false;
      button.textContent = "Shuffle";
    }
  }

  function mountButton() {
    if (document.getElementById(BUTTON_ID)) return;
    const deleteButton = actionElement("Delete");
    const publishButton = actionElement("Review & Publish");
    if (!deleteButton || !publishButton) return;

    const button = publishButton.cloneNode(false);
    addStyles();
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "Shuffle";
    button.title =
      "Shuffle maps while keeping all map, mod, and duration counts unchanged";
    button.addEventListener("click", () => {
      shuffleRoutine(button).catch((error) => {
        console.error("[Refrag Routine Shuffler]", error);
        button.textContent = "Try again";
      });
    });
    publishButton.insertAdjacentElement("beforebegin", button);
  }

  const observer = new MutationObserver(mountButton);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  mountButton();
})();
