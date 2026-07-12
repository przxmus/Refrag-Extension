(() => {
  "use strict";

  const BUTTON_ID = "refrag-routine-shuffler";
  const STYLE_ID = "refrag-routine-shuffler-style";
  const WAIT_TIMEOUT = 20_000;
  const SAVE_SETTLE_MS = 900;

  let routineRunning = false;

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

      #${BUTTON_ID}:hover {
        background-color: #5d9171 !important;
      }

      #${BUTTON_ID}[aria-disabled="true"] {
        cursor: wait !important;
        opacity: .7 !important;
        pointer-events: none !important;
      }
    `;

    document.head.append(style);
  }

  function elementText(element) {
    return (element?.innerText || element?.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeValue(value) {
    return String(value ?? "")
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  function sameValue(left, right) {
    return normalizeValue(left) === normalizeValue(right);
  }

  function visible(element) {
    if (!element?.isConnected) return false;

    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);

    return Boolean(
      rect.width &&
      rect.height &&
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0",
    );
  }

  async function waitFor(find, message, timeout = WAIT_TIMEOUT) {
    const startedAt = performance.now();
    let lastError;

    while (performance.now() - startedAt < timeout) {
      try {
        const result = find();

        if (result) {
          return result;
        }
      } catch (error) {
        lastError = error;
      }

      await pause(75);
    }

    const suffix = lastError?.message
      ? ` Last error: ${lastError.message}`
      : "";

    throw new Error(`${message}${suffix}`);
  }

  function findLeafAction(label, root = document) {
    return Array.from(
      root.querySelectorAll("button, [role='button'], div, a"),
    ).find(
      (element) =>
        element.children.length === 0 &&
        sameValue(elementText(element), label) &&
        visible(element),
    );
  }

  function getSegmentsContainer() {
    const heading = Array.from(document.querySelectorAll("h1")).find(
      (element) => sameValue(elementText(element), "Segments"),
    );

    return (
      heading?.parentElement?.querySelector(".smooth-dnd-container.vertical") ||
      document.querySelector(".smooth-dnd-container.vertical")
    );
  }

  function getSegmentCards() {
    const container = getSegmentsContainer();

    if (!container) {
      return [];
    }

    return Array.from(container.children)
      .map((wrapper) => wrapper.querySelector(".item"))
      .filter(Boolean);
  }

  function readSegmentCard(card) {
    const values = Array.from(card.querySelectorAll("h2")).map(elementText);
    const number = Number(values[0]?.match(/^Segment\s+(\d+)/i)?.[1]);

    if (!number || !values[1] || !values[2]) {
      throw new Error("Could not read a routine segment card.");
    }

    return {
      number,
      map: values[1],
      mod: values[2],
      duration: values[3] || "",
    };
  }

  function getSegmentCard(segmentNumber) {
    return getSegmentCards().find((card) => {
      try {
        return readSegmentCard(card).number === segmentNumber;
      } catch {
        return false;
      }
    });
  }

  function getEditorSegmentNumber() {
    const heading = Array.from(document.querySelectorAll("h1")).find(
      (element) => /^Segment\s+\d+$/i.test(elementText(element)),
    );

    return Number(elementText(heading).match(/\d+/)?.[0]) || null;
  }

  function getEditorPanel() {
    const title = Array.from(document.querySelectorAll("h1")).find((element) =>
      /^Segment\s+\d+$/i.test(elementText(element)),
    );

    if (!title) {
      throw new Error("Could not find the segment editor.");
    }

    let node = title.parentElement;

    while (node && node !== document.body) {
      const headings = Array.from(node.querySelectorAll("h1")).map(elementText);

      const hasMap = headings.some((text) => sameValue(text, "Map"));

      const hasMod = headings.some((text) => sameValue(text, "Mod"));

      if (hasMap && hasMod) {
        return node;
      }

      node = node.parentElement;
    }

    throw new Error("Could not locate the complete segment editor panel.");
  }

  async function selectSegment(segmentNumber) {
    const initialCard = getSegmentCard(segmentNumber);

    if (!initialCard) {
      throw new Error(`Could not find segment ${segmentNumber}.`);
    }

    const alreadySelected =
      initialCard.classList.contains("border-primary-500") &&
      getEditorSegmentNumber() === segmentNumber;

    if (!alreadySelected) {
      initialCard.scrollIntoView({
        block: "center",
        behavior: "auto",
      });

      initialCard.click();
    }

    await waitFor(() => {
      const currentCard = getSegmentCard(segmentNumber);

      if (!currentCard?.classList.contains("border-primary-500")) {
        return false;
      }

      if (getEditorSegmentNumber() !== segmentNumber) {
        return false;
      }

      const panel = getEditorPanel();

      return Boolean(panel.querySelector('button[aria-haspopup="true"]'));
    }, `Could not activate segment ${segmentNumber}.`);

    // Vue może zaznaczyć kartę chwilę przed pełnym
    // przebudowaniem formularza.
    await pause(120);
  }

  function getDropdown(label) {
    const panel = getEditorPanel();

    const heading = Array.from(panel.querySelectorAll("h1")).find((element) =>
      sameValue(elementText(element), label),
    );

    const trigger = heading?.parentElement?.querySelector(
      'button[aria-haspopup="true"]',
    );

    if (!trigger) {
      throw new Error(`Could not find Refrag's ${label} selector.`);
    }

    return trigger;
  }

  function getOwnedMenu(trigger) {
    const controlsId = trigger.getAttribute("aria-controls");

    if (controlsId) {
      const controlled = document.getElementById(controlsId);

      if (controlled?.getAttribute("role") === "menu" && visible(controlled)) {
        return controlled;
      }
    }

    if (trigger.id) {
      const labelledMenu = Array.from(
        document.querySelectorAll('[role="menu"]'),
      ).find(
        (menu) =>
          menu.getAttribute("aria-labelledby") === trigger.id && visible(menu),
      );

      if (labelledMenu) {
        return labelledMenu;
      }
    }

    const localMenu = trigger
      .closest("[data-headlessui-state]")
      ?.querySelector('[role="menu"]');

    if (localMenu && visible(localMenu)) {
      return localMenu;
    }

    const visibleMenus = Array.from(
      document.querySelectorAll('[role="menu"]'),
    ).filter(visible);

    return visibleMenus.length === 1 ? visibleMenus[0] : null;
  }

  async function openDropdown(label) {
    let trigger = getDropdown(label);

    if (trigger.getAttribute("aria-expanded") !== "true") {
      trigger.click();
    }

    const menu = await waitFor(() => {
      trigger = getDropdown(label);

      if (trigger.getAttribute("aria-expanded") !== "true") {
        return false;
      }

      return getOwnedMenu(trigger);
    }, `Could not open Refrag's ${label} menu.`);

    return {
      trigger,
      menu,
    };
  }

  async function closeDropdown(label) {
    let trigger;

    try {
      trigger = getDropdown(label);
    } catch {
      return;
    }

    if (trigger.getAttribute("aria-expanded") === "true") {
      trigger.click();
    }

    await waitFor(
      () => {
        try {
          trigger = getDropdown(label);

          return (
            trigger.getAttribute("aria-expanded") !== "true" &&
            !getOwnedMenu(trigger)
          );
        } catch {
          return true;
        }
      },
      `Could not close Refrag's ${label} menu.`,
      6000,
    );
  }

  function menuCandidates(menu) {
    return Array.from(
      menu.querySelectorAll(
        [
          '[role="menuitem"]',
          '[role="option"]',
          "button",
          "[data-headlessui-value]",
        ].join(", "),
      ),
    );
  }

  function findMenuOption(menu, requestedValue) {
    const semanticMatch = menuCandidates(menu).find((element) =>
      sameValue(elementText(element), requestedValue),
    );

    if (semanticMatch) {
      return semanticMatch;
    }

    const leafMatch = Array.from(menu.querySelectorAll("*")).find(
      (element) =>
        element.children.length === 0 &&
        sameValue(elementText(element), requestedValue),
    );

    return (
      leafMatch?.closest(
        [
          '[role="menuitem"]',
          '[role="option"]',
          "button",
          "[data-headlessui-value]",
        ].join(", "),
      ) ||
      leafMatch ||
      null
    );
  }

  function readableMenuValues(menu) {
    return menuCandidates(menu)
      .map(elementText)
      .filter(Boolean)
      .filter((value, index, all) => all.indexOf(value) === index)
      .slice(0, 30);
  }

  async function chooseDropdownValue(label, value) {
    let trigger = getDropdown(label);

    if (sameValue(elementText(trigger), value)) {
      return;
    }

    const { menu } = await openDropdown(label);
    const option = findMenuOption(menu, value);

    if (!option) {
      const available = readableMenuValues(menu);

      await closeDropdown(label).catch(() => {});

      throw new Error(
        `Could not select ${label} ${value}. ` +
          `Menu values: ${available.join(" | ") || "<none>"}`,
      );
    }

    option.scrollIntoView({
      block: "nearest",
      behavior: "auto",
    });

    option.click();

    await waitFor(() => {
      trigger = getDropdown(label);

      return (
        trigger.getAttribute("aria-expanded") !== "true" &&
        sameValue(elementText(trigger), value)
      );
    }, `Could not confirm ${label} ${value}.`);

    if (sameValue(label, "Map")) {
      await waitFor(() => {
        const modTrigger = getDropdown("Mod");

        return modTrigger.isConnected && !modTrigger.disabled;
      }, "The Mod selector did not finish updating after the map change.");

      await pause(120);
    }
  }

  function getSaveControl() {
    const panel = getEditorPanel();

    const segmentTitle = Array.from(panel.querySelectorAll("h1")).find(
      (element) => /^Segment\s+\d+$/i.test(elementText(element)),
    );

    const header = segmentTitle?.parentElement;
    const save = header && findLeafAction("Save", header);

    if (!save) {
      throw new Error("Could not find Refrag's Save control.");
    }

    return save;
  }

  async function saveSegment(segmentNumber, expectedMap, expectedMod) {
    if (getEditorSegmentNumber() !== segmentNumber) {
      throw new Error(
        `Refusing to save: editor is not showing ` +
          `segment ${segmentNumber}.`,
      );
    }

    const save = getSaveControl();
    save.click();

    // Nie przechodź dalej, dopóki karta segmentu
    // nie pokaże zapisanych wartości.
    await waitFor(
      () => {
        const card = getSegmentCard(segmentNumber);

        if (!card) {
          return false;
        }

        const state = readSegmentCard(card);

        return (
          sameValue(state.map, expectedMap) && sameValue(state.mod, expectedMod)
        );
      },
      `Segment ${segmentNumber} was not saved as ` +
        `${expectedMap} / ${expectedMod}.`,
    );

    // Dodatkowe oczekiwanie na zakończenie requestu
    // i ustabilizowanie stanu Vue.
    await pause(SAVE_SETTLE_MS);

    const card = getSegmentCard(segmentNumber);

    if (!card) {
      throw new Error(`Segment ${segmentNumber} disappeared after Save.`);
    }

    const confirmed = readSegmentCard(card);

    if (
      !sameValue(confirmed.map, expectedMap) ||
      !sameValue(confirmed.mod, expectedMod)
    ) {
      throw new Error(
        `Segment ${segmentNumber} reverted after Save ` +
          `(${confirmed.map} / ${confirmed.mod}).`,
      );
    }
  }

  function randomUint(maxExclusive) {
    if (maxExclusive <= 1) {
      return 0;
    }

    return crypto.getRandomValues(new Uint32Array(1))[0] % maxExclusive;
  }

  function shuffledValidPairs(segments) {
    const source = segments.map((segment, sourceIndex) => ({
      ...segment,
      sourceIndex,
    }));

    let best = null;
    let bestUnchanged = Infinity;

    // Tasujemy istniejące pary mapa + mod.
    // Dzięki temu kombinacje są już poprawne dla Refrag.
    for (let attempt = 0; attempt < 2000; attempt += 1) {
      const remaining = [...source];
      const candidate = [];
      let failed = false;

      for (let position = 0; position < source.length; position += 1) {
        const previous = candidate[position - 1];

        let choices = remaining.filter(
          (item) =>
            !previous ||
            (!sameValue(item.map, previous.map) &&
              !sameValue(item.mod, previous.mod)),
        );

        if (!choices.length) {
          failed = true;
          break;
        }

        const movedChoices = choices.filter(
          (item) => item.sourceIndex !== position,
        );

        if (movedChoices.length) {
          choices = movedChoices;
        }

        const selected = choices[randomUint(choices.length)];

        candidate.push(selected);

        remaining.splice(remaining.indexOf(selected), 1);
      }

      if (failed) {
        continue;
      }

      const unchanged = candidate.filter(
        (item, index) => item.sourceIndex === index,
      ).length;

      if (unchanged < bestUnchanged) {
        best = candidate;
        bestUnchanged = unchanged;
      }

      if (unchanged === 0) {
        break;
      }
    }

    if (!best) {
      throw new Error(
        "Could not build a shuffle without adjacent " +
          "repeated maps or mods.",
      );
    }

    const didNotChange = best.every(
      (item, index) =>
        sameValue(item.map, segments[index].map) &&
        sameValue(item.mod, segments[index].mod),
    );

    if (didNotChange) {
      throw new Error("The generated shuffle did not change the routine.");
    }

    return best;
  }

  async function shuffleRoutine(button) {
    if (routineRunning) {
      return;
    }

    const cards = getSegmentCards();

    if (cards.length < 2) {
      throw new Error(
        "At least two segments are required to shuffle a routine.",
      );
    }

    routineRunning = true;
    button.setAttribute("aria-disabled", "true");
    button.textContent = "Preparing…";

    try {
      const segments = cards.map(readSegmentCard);
      const assignments = shuffledValidPairs(segments);

      console.table(
        assignments.map((target, index) => ({
          segment: segments[index].number,
          from: `${segments[index].map} / ` + `${segments[index].mod}`,
          to: `${target.map} / ${target.mod}`,
        })),
      );

      for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        const target = assignments[index];

        button.textContent = `${index + 1}/${segments.length}`;

        console.info(
          `[Refrag Routine Shuffler] ` +
            `Segment ${segment.number}: ` +
            `${target.map} / ${target.mod}`,
        );

        await selectSegment(segment.number);

        await chooseDropdownValue("Map", target.map);

        // Bardzo ważne:
        // nie klikamy ponownie segmentu po zmianie mapy.
        await chooseDropdownValue("Mod", target.mod);

        await saveSegment(segment.number, target.map, target.mod);
      }

      button.textContent = "Shuffled";
      await pause(1200);
    } finally {
      routineRunning = false;
      button.removeAttribute("aria-disabled");
      button.textContent = "Shuffle";
    }
  }

  function mountButton() {
    if (document.getElementById(BUTTON_ID)) {
      return;
    }

    const deleteButton = findLeafAction("Delete");
    const publishButton = findLeafAction("Review & Publish");

    if (!deleteButton || !publishButton) {
      return;
    }

    const button = publishButton.cloneNode(false);

    addStyles();

    button.id = BUTTON_ID;
    button.setAttribute("role", "button");
    button.setAttribute("tabindex", "0");
    button.textContent = "Shuffle";
    button.title =
      "Shuffle existing valid map/mod pairs, " +
      "save every changed segment, and avoid adjacent repeats";

    const start = () => {
      if (routineRunning) {
        return;
      }

      shuffleRoutine(button).catch((error) => {
        console.error("[Refrag Routine Shuffler]", error);

        button.textContent = "Try again";
        button.removeAttribute("aria-disabled");
        routineRunning = false;
      });
    };

    button.addEventListener("click", start);

    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        start();
      }
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
