(() => {
  "use strict";

  const BUTTON_ID = "refrag-routine-shuffler";
  const STYLE_ID = "refrag-routine-shuffler-style";
  const WAIT_TIMEOUT = 20_000;
  const SAVE_SETTLE_MS = 900;

  const DEFAULT_SHUFFLE_CONFIG = {
    combinations: {
      // true = żadna para mapa + mod nie może wystąpić dwa razy
      // w wyniku jednego tasowania.
      preventDuplicatesInResult: true,

      // true = żadna para mapa + mod, która istniała przed tasowaniem,
      // nie może pojawić się nigdzie w nowym układzie.
      preventAnyOriginalCombination: true,

      // 0 = brak ograniczenia odległości.
      // 1 = taka sama kombinacja nie może wystąpić obok siebie.
      // 2 = pomiędzy powtórzeniami musi być co najmniej 2 segmenty itd.
      // Ma znaczenie głównie, gdy preventDuplicatesInResult = false.
      minimumRepeatGap: 0,

      // Wymaga zmiany pary w każdym konkretnym segmencie.
      // Jest automatycznie spełnione, gdy preventAnyOriginalCombination = true.
      requireDifferentAtSamePosition: true,

      // Miękka preferencja używana, gdy twardy zakaz powyżej jest wyłączony.
      preferNewCombinations: true,

      // Gdy twardy zakaz duplikatów jest wyłączony, nadal próbuj
      // ograniczać liczbę powtarzających się par.
      preferUniqueCombinations: true,
    },

    maps: {
      // 1 = nie pozwalaj na tę samą mapę w sąsiednich segmentach.
      minimumRepeatGap: 1,

      // true = mapa w każdym segmencie musi być inna niż przed tasowaniem.
      requireDifferentAtSamePosition: false,

      // Miękka preferencja: próbuj zmienić mapę na każdej pozycji.
      preferDifferentAtSamePosition: true,
    },

    mods: {
      // 1 = nie pozwalaj na ten sam mod w sąsiednich segmentach.
      minimumRepeatGap: 1,

      // true = mod w każdym segmencie musi być inny niż przed tasowaniem.
      requireDifferentAtSamePosition: false,

      // Miękka preferencja: próbuj zmienić mod na każdej pozycji.
      preferDifferentAtSamePosition: true,
    },

    runtime: {
      // Nie klikaj Save dla segmentu, którego para finalnie się nie zmieniła.
      saveOnlyChangedSegments: true,

      // Więcej prób pomaga przy bardzo restrykcyjnych ustawieniach,
      // ale może wydłużyć generowanie.
      generationAttempts: 200,

      // Ile poprawnych planów maksymalnie porównać pod kątem miękkich
      // preferencji. Generator kończy wcześniej, gdy znajdzie wynik idealny.
      validPlansToCompare: 20,

      maxSearchNodesPerAttempt: 50_000,

      // Szczegółowy plan i ustawienia w konsoli DevTools.
      logPlan: true,
    },
  };

  // Edytuj DEFAULT_SHUFFLE_CONFIG, aby zmienić ustawienia startowe.
  // SHUFFLE_CONFIG jest mutowalną kopią przygotowaną pod przyszłe UI.
  const SHUFFLE_CONFIG = JSON.parse(JSON.stringify(DEFAULT_SHUFFLE_CONFIG));

  // Metadane pod przyszłe UI. Na ich podstawie można automatycznie
  // zbudować checkboxy i pola liczbowe bez duplikowania opisów opcji.
  const SHUFFLE_CONFIG_SCHEMA = [
    {
      path: "combinations.preventDuplicatesInResult",
      group: "Kombinacje",
      type: "boolean",
      label: "Bez duplikatów kombinacji",
      description: "Każda para mapa + mod może wystąpić najwyżej raz.",
    },
    {
      path: "combinations.preventAnyOriginalCombination",
      group: "Kombinacje",
      type: "boolean",
      label: "Nie używaj starych kombinacji",
      description: "Blokuje każdą parę, która istniała przed tasowaniem.",
    },
    {
      path: "combinations.minimumRepeatGap",
      group: "Kombinacje",
      type: "integer",
      min: 0,
      max: 12,
      label: "Minimalny odstęp kombinacji",
      description: "0 wyłącza regułę; 1 blokuje powtórkę obok siebie.",
    },
    {
      path: "combinations.requireDifferentAtSamePosition",
      group: "Kombinacje",
      type: "boolean",
      label: "Zmień kombinację na każdej pozycji",
      description: "Segment nie może zachować swojej wcześniejszej pary.",
    },
    {
      path: "combinations.preferNewCombinations",
      group: "Kombinacje",
      type: "boolean",
      label: "Preferuj nowe kombinacje",
      description:
        "Miękka preferencja używana, gdy twardy zakaz jest wyłączony.",
    },
    {
      path: "combinations.preferUniqueCombinations",
      group: "Kombinacje",
      type: "boolean",
      label: "Preferuj unikalne kombinacje",
      description: "Miękka preferencja używana, gdy duplikaty są dozwolone.",
    },
    {
      path: "maps.minimumRepeatGap",
      group: "Mapy",
      type: "integer",
      min: 0,
      max: 12,
      label: "Minimalny odstęp map",
      description: "1 blokuje tę samą mapę w sąsiednich segmentach.",
    },
    {
      path: "maps.requireDifferentAtSamePosition",
      group: "Mapy",
      type: "boolean",
      label: "Zmień mapę na każdej pozycji",
      description: "Twardy wymóg zmiany mapy w każdym segmencie.",
    },
    {
      path: "maps.preferDifferentAtSamePosition",
      group: "Mapy",
      type: "boolean",
      label: "Preferuj zmianę mapy",
      description: "Generator próbuje zmienić mapę, ale może ją zostawić.",
    },
    {
      path: "mods.minimumRepeatGap",
      group: "Tryby",
      type: "integer",
      min: 0,
      max: 12,
      label: "Minimalny odstęp trybów",
      description: "1 blokuje ten sam tryb w sąsiednich segmentach.",
    },
    {
      path: "mods.requireDifferentAtSamePosition",
      group: "Tryby",
      type: "boolean",
      label: "Zmień tryb na każdej pozycji",
      description: "Twardy wymóg zmiany trybu w każdym segmencie.",
    },
    {
      path: "mods.preferDifferentAtSamePosition",
      group: "Tryby",
      type: "boolean",
      label: "Preferuj zmianę trybu",
      description: "Generator próbuje zmienić tryb, ale może go zostawić.",
    },
    {
      path: "runtime.saveOnlyChangedSegments",
      group: "Zaawansowane",
      type: "boolean",
      label: "Zapisuj tylko zmienione segmenty",
      description: "Pomija Save, gdy mapa i tryb pozostały bez zmian.",
    },
    {
      path: "runtime.generationAttempts",
      group: "Zaawansowane",
      type: "integer",
      min: 1,
      max: 2000,
      label: "Liczba prób generowania",
      description: "Więcej prób pomaga przy restrykcyjnych regułach.",
    },
    {
      path: "runtime.validPlansToCompare",
      group: "Zaawansowane",
      type: "integer",
      min: 1,
      max: 100,
      label: "Liczba planów do porównania",
      description: "Większa wartość lepiej optymalizuje miękkie preferencje.",
    },
    {
      path: "runtime.maxSearchNodesPerAttempt",
      group: "Zaawansowane",
      type: "integer",
      min: 100,
      max: 1000000,
      label: "Limit wyszukiwania",
      description: "Limit pracy generatora podczas pojedynczej próby.",
    },
    {
      path: "runtime.logPlan",
      group: "Zaawansowane",
      type: "boolean",
      label: "Loguj plan w konsoli",
      description: "Pokazuje ustawienia oraz wynik w DevTools.",
    },
  ];

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

  function randomUnit() {
    return randomUint(1_000_000) / 1_000_000;
  }

  function combinationKey(map, mod) {
    return `${normalizeValue(map)}::${normalizeValue(mod)}`;
  }

  function buildValuePool(values) {
    const pool = new Map();

    for (const value of values) {
      const key = normalizeValue(value);
      const existing = pool.get(key);

      if (existing) {
        existing.count += 1;
      } else {
        pool.set(key, {
          key,
          value,
          count: 1,
        });
      }
    }

    return Array.from(pool.values());
  }

  function countValues(values) {
    const counts = new Map();

    for (const value of values) {
      const key = normalizeValue(value);
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    return counts;
  }

  function sameCounts(leftValues, rightValues) {
    const left = countValues(leftValues);
    const right = countValues(rightValues);

    if (left.size !== right.size) {
      return false;
    }

    return Array.from(left).every(([key, count]) => right.get(key) === count);
  }

  function nonNegativeInteger(value, optionName) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`${optionName} must be a non-negative integer.`);
    }
  }

  function positiveInteger(value, optionName) {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`${optionName} must be a positive integer.`);
    }
  }

  function validateShuffleConfig() {
    const booleanOptions = [
      [
        SHUFFLE_CONFIG.combinations.preventDuplicatesInResult,
        "combinations.preventDuplicatesInResult",
      ],
      [
        SHUFFLE_CONFIG.combinations.preventAnyOriginalCombination,
        "combinations.preventAnyOriginalCombination",
      ],
      [
        SHUFFLE_CONFIG.combinations.requireDifferentAtSamePosition,
        "combinations.requireDifferentAtSamePosition",
      ],
      [
        SHUFFLE_CONFIG.combinations.preferNewCombinations,
        "combinations.preferNewCombinations",
      ],
      [
        SHUFFLE_CONFIG.combinations.preferUniqueCombinations,
        "combinations.preferUniqueCombinations",
      ],
      [
        SHUFFLE_CONFIG.maps.requireDifferentAtSamePosition,
        "maps.requireDifferentAtSamePosition",
      ],
      [
        SHUFFLE_CONFIG.maps.preferDifferentAtSamePosition,
        "maps.preferDifferentAtSamePosition",
      ],
      [
        SHUFFLE_CONFIG.mods.requireDifferentAtSamePosition,
        "mods.requireDifferentAtSamePosition",
      ],
      [
        SHUFFLE_CONFIG.mods.preferDifferentAtSamePosition,
        "mods.preferDifferentAtSamePosition",
      ],
      [
        SHUFFLE_CONFIG.runtime.saveOnlyChangedSegments,
        "runtime.saveOnlyChangedSegments",
      ],
      [SHUFFLE_CONFIG.runtime.logPlan, "runtime.logPlan"],
    ];

    for (const [value, optionName] of booleanOptions) {
      if (typeof value !== "boolean") {
        throw new Error(`${optionName} must be true or false.`);
      }
    }

    nonNegativeInteger(
      SHUFFLE_CONFIG.combinations.minimumRepeatGap,
      "combinations.minimumRepeatGap",
    );
    nonNegativeInteger(
      SHUFFLE_CONFIG.maps.minimumRepeatGap,
      "maps.minimumRepeatGap",
    );
    nonNegativeInteger(
      SHUFFLE_CONFIG.mods.minimumRepeatGap,
      "mods.minimumRepeatGap",
    );
    positiveInteger(
      SHUFFLE_CONFIG.runtime.generationAttempts,
      "runtime.generationAttempts",
    );
    positiveInteger(
      SHUFFLE_CONFIG.runtime.validPlansToCompare,
      "runtime.validPlansToCompare",
    );
    positiveInteger(
      SHUFFLE_CONFIG.runtime.maxSearchNodesPerAttempt,
      "runtime.maxSearchNodesPerAttempt",
    );
  }

  function appearsWithinGap(values, value, gap) {
    if (gap <= 0) {
      return false;
    }

    const start = Math.max(0, values.length - gap);

    return values.slice(start).some((existing) => sameValue(existing, value));
  }

  function combinationAppearsWithinGap(maps, mods, nextMap, nextMod, gap) {
    if (gap <= 0) {
      return false;
    }

    const nextKey = combinationKey(nextMap, nextMod);
    const start = Math.max(0, mods.length - gap);

    for (let index = start; index < mods.length; index += 1) {
      if (combinationKey(maps[index], mods[index]) === nextKey) {
        return true;
      }
    }

    return false;
  }

  function pairAllowedByGlobalRules(map, mod, originalPairKeys) {
    return !(
      SHUFFLE_CONFIG.combinations.preventAnyOriginalCombination &&
      originalPairKeys.has(combinationKey(map, mod))
    );
  }

  function assertGapCapacity(pool, gap, segmentCount, label) {
    if (gap <= 0) {
      return;
    }

    const maximumOccurrences = Math.floor((segmentCount + gap) / (gap + 1));
    const impossible = pool.find((item) => item.count > maximumOccurrences);

    if (impossible) {
      throw new Error(
        `${label} ${impossible.value} occurs ${impossible.count} times, ` +
          `so minimumRepeatGap=${gap} is impossible for ` +
          `${segmentCount} segments.`,
      );
    }
  }

  function assertBasicShuffleFeasibility(
    segments,
    mapPool,
    modPool,
    originalPairKeys,
  ) {
    assertGapCapacity(
      mapPool,
      SHUFFLE_CONFIG.maps.minimumRepeatGap,
      segments.length,
      "Map",
    );
    assertGapCapacity(
      modPool,
      SHUFFLE_CONFIG.mods.minimumRepeatGap,
      segments.length,
      "Mod",
    );

    const globallyAllowedPairs = [];

    for (const mapItem of mapPool) {
      for (const modItem of modPool) {
        if (
          pairAllowedByGlobalRules(
            mapItem.value,
            modItem.value,
            originalPairKeys,
          )
        ) {
          globallyAllowedPairs.push({
            mapKey: mapItem.key,
            modKey: modItem.key,
          });
        }
      }
    }

    if (!globallyAllowedPairs.length) {
      throw new Error(
        "The current settings forbid every possible map/mod combination.",
      );
    }

    for (const mapItem of mapPool) {
      const allowedMods = new Set(
        globallyAllowedPairs
          .filter((pair) => pair.mapKey === mapItem.key)
          .map((pair) => pair.modKey),
      );

      if (!allowedMods.size) {
        throw new Error(
          `Map ${mapItem.value} has no allowed mods with the current settings.`,
        );
      }

      if (
        SHUFFLE_CONFIG.combinations.preventDuplicatesInResult &&
        mapItem.count > allowedMods.size
      ) {
        throw new Error(
          `Map ${mapItem.value} occurs ${mapItem.count} times, but only ` +
            `${allowedMods.size} distinct non-forbidden mods are available. ` +
            `Disable combinations.preventDuplicatesInResult or ` +
            `combinations.preventAnyOriginalCombination.`,
        );
      }
    }

    for (const modItem of modPool) {
      const allowedMaps = new Set(
        globallyAllowedPairs
          .filter((pair) => pair.modKey === modItem.key)
          .map((pair) => pair.mapKey),
      );

      if (!allowedMaps.size) {
        throw new Error(
          `Mod ${modItem.value} has no allowed maps with the current settings.`,
        );
      }

      if (
        SHUFFLE_CONFIG.combinations.preventDuplicatesInResult &&
        modItem.count > allowedMaps.size
      ) {
        throw new Error(
          `Mod ${modItem.value} occurs ${modItem.count} times, but only ` +
            `${allowedMaps.size} distinct non-forbidden maps are available. ` +
            `Disable combinations.preventDuplicatesInResult or ` +
            `combinations.preventAnyOriginalCombination.`,
        );
      }
    }

    if (
      SHUFFLE_CONFIG.combinations.preventDuplicatesInResult &&
      globallyAllowedPairs.length < segments.length
    ) {
      throw new Error(
        `Only ${globallyAllowedPairs.length} distinct combinations are ` +
          `allowed for ${segments.length} segments.`,
      );
    }
  }

  function buildMapSequence(segments, searchBudget) {
    const mapPool = buildValuePool(segments.map((segment) => segment.map));
    const maps = [];

    const search = (position) => {
      searchBudget.nodes += 1;

      if (
        searchBudget.nodes > SHUFFLE_CONFIG.runtime.maxSearchNodesPerAttempt
      ) {
        return false;
      }

      if (position >= segments.length) {
        return [...maps];
      }

      const choices = mapPool
        .filter(
          (item) =>
            item.count > 0 &&
            !appearsWithinGap(
              maps,
              item.value,
              SHUFFLE_CONFIG.maps.minimumRepeatGap,
            ) &&
            !(
              SHUFFLE_CONFIG.maps.requireDifferentAtSamePosition &&
              sameValue(item.value, segments[position].map)
            ),
        )
        .map((item) => ({
          item,
          penalty:
            (SHUFFLE_CONFIG.maps.preferDifferentAtSamePosition &&
            sameValue(item.value, segments[position].map)
              ? 10
              : 0) + randomUnit(),
        }))
        .sort((left, right) => left.penalty - right.penalty);

      for (const choice of choices) {
        choice.item.count -= 1;
        maps.push(choice.item.value);

        const result = search(position + 1);

        if (result) {
          return result;
        }

        maps.pop();
        choice.item.count += 1;
      }

      return false;
    };

    return search(0);
  }

  function modAllowedAtPosition({
    position,
    mod,
    segments,
    maps,
    mods,
    originalPairKeys,
    usedPairKeys,
    ignoreSequenceGaps = false,
  }) {
    const map = maps[position];
    const original = segments[position];
    const pairKey = combinationKey(map, mod);

    if (!pairAllowedByGlobalRules(map, mod, originalPairKeys)) {
      return false;
    }

    if (
      SHUFFLE_CONFIG.combinations.preventDuplicatesInResult &&
      usedPairKeys.has(pairKey)
    ) {
      return false;
    }

    if (
      SHUFFLE_CONFIG.combinations.requireDifferentAtSamePosition &&
      sameValue(map, original.map) &&
      sameValue(mod, original.mod)
    ) {
      return false;
    }

    if (
      SHUFFLE_CONFIG.mods.requireDifferentAtSamePosition &&
      sameValue(mod, original.mod)
    ) {
      return false;
    }

    if (!ignoreSequenceGaps) {
      if (appearsWithinGap(mods, mod, SHUFFLE_CONFIG.mods.minimumRepeatGap)) {
        return false;
      }

      if (
        combinationAppearsWithinGap(
          maps,
          mods,
          map,
          mod,
          SHUFFLE_CONFIG.combinations.minimumRepeatGap,
        )
      ) {
        return false;
      }
    }

    return true;
  }

  function remainingModsLookPossible({
    nextPosition,
    segments,
    maps,
    mods,
    modPool,
    originalPairKeys,
    usedPairKeys,
  }) {
    if (nextPosition >= segments.length) {
      return true;
    }

    // Każda kopia danego moda potrzebuje dostępnej pozycji. Przy zakazie
    // duplikatów liczymy odrębne pary mapa + mod, a nie same pozycje.
    for (const modItem of modPool) {
      if (modItem.count <= 0) continue;

      const available = new Set();

      for (
        let position = nextPosition;
        position < segments.length;
        position += 1
      ) {
        if (
          modAllowedAtPosition({
            position,
            mod: modItem.value,
            segments,
            maps,
            mods,
            originalPairKeys,
            usedPairKeys,
            ignoreSequenceGaps: true,
          })
        ) {
          available.add(
            SHUFFLE_CONFIG.combinations.preventDuplicatesInResult
              ? combinationKey(maps[position], modItem.value)
              : `position:${position}`,
          );
        }
      }

      if (available.size < modItem.count) {
        return false;
      }
    }

    // Każda przyszła pozycja musi mieć przynajmniej jeden możliwy mod.
    for (
      let position = nextPosition;
      position < segments.length;
      position += 1
    ) {
      const hasChoice = modPool.some(
        (modItem) =>
          modItem.count > 0 &&
          modAllowedAtPosition({
            position,
            mod: modItem.value,
            segments,
            maps,
            mods,
            originalPairKeys,
            usedPairKeys,
            ignoreSequenceGaps: true,
          }),
      );

      if (!hasChoice) {
        return false;
      }
    }

    // Najbliższa pozycja musi być możliwa także z aktywnymi gapami.
    return modPool.some(
      (modItem) =>
        modItem.count > 0 &&
        modAllowedAtPosition({
          position: nextPosition,
          mod: modItem.value,
          segments,
          maps,
          mods,
          originalPairKeys,
          usedPairKeys,
        }),
    );
  }

  function buildModSequence(segments, maps, originalPairKeys, searchBudget) {
    const modPool = buildValuePool(segments.map((segment) => segment.mod));
    const mods = [];
    const usedPairKeys = new Set();

    const search = (position) => {
      searchBudget.nodes += 1;

      if (
        searchBudget.nodes > SHUFFLE_CONFIG.runtime.maxSearchNodesPerAttempt
      ) {
        return false;
      }

      if (position >= segments.length) {
        return [...mods];
      }

      const choices = modPool
        .filter(
          (item) =>
            item.count > 0 &&
            modAllowedAtPosition({
              position,
              mod: item.value,
              segments,
              maps,
              mods,
              originalPairKeys,
              usedPairKeys,
            }),
        )
        .map((item) => {
          const pairKey = combinationKey(maps[position], item.value);
          let penalty = randomUnit();

          if (
            SHUFFLE_CONFIG.mods.preferDifferentAtSamePosition &&
            sameValue(item.value, segments[position].mod)
          ) {
            penalty += 10;
          }

          if (
            SHUFFLE_CONFIG.combinations.preferNewCombinations &&
            originalPairKeys.has(pairKey)
          ) {
            penalty += 100;
          }

          return {
            item,
            pairKey,
            penalty,
          };
        })
        .sort((left, right) => left.penalty - right.penalty);

      for (const choice of choices) {
        choice.item.count -= 1;
        mods.push(choice.item.value);
        usedPairKeys.add(choice.pairKey);

        const possible = remainingModsLookPossible({
          nextPosition: position + 1,
          segments,
          maps,
          mods,
          modPool,
          originalPairKeys,
          usedPairKeys,
        });
        const result = possible ? search(position + 1) : false;

        if (result) {
          return result;
        }

        usedPairKeys.delete(choice.pairKey);
        mods.pop();
        choice.item.count += 1;
      }

      return false;
    };

    return search(0);
  }

  function assignmentPenalty(segments, assignments, originalPairKeys) {
    let penalty = 0;
    const pairCounts = new Map();

    for (let index = 0; index < assignments.length; index += 1) {
      const original = segments[index];
      const assigned = assignments[index];
      const pairKey = combinationKey(assigned.map, assigned.mod);

      if (
        SHUFFLE_CONFIG.maps.preferDifferentAtSamePosition &&
        sameValue(original.map, assigned.map)
      ) {
        penalty += 10;
      }

      if (
        SHUFFLE_CONFIG.mods.preferDifferentAtSamePosition &&
        sameValue(original.mod, assigned.mod)
      ) {
        penalty += 10;
      }

      if (
        SHUFFLE_CONFIG.combinations.preferNewCombinations &&
        originalPairKeys.has(pairKey)
      ) {
        penalty += 100;
      }

      pairCounts.set(pairKey, (pairCounts.get(pairKey) || 0) + 1);
    }

    if (
      !SHUFFLE_CONFIG.combinations.preventDuplicatesInResult &&
      SHUFFLE_CONFIG.combinations.preferUniqueCombinations
    ) {
      for (const count of pairCounts.values()) {
        penalty += Math.max(0, count - 1) * 50;
      }
    }

    return penalty;
  }

  function validateAssignment(segments, assignments, originalPairKeys) {
    if (assignments.length !== segments.length) {
      throw new Error("Generated assignment has an invalid length.");
    }

    if (
      !sameCounts(
        segments.map((segment) => segment.map),
        assignments.map((segment) => segment.map),
      )
    ) {
      throw new Error("Generated assignment changed the map pool.");
    }

    if (
      !sameCounts(
        segments.map((segment) => segment.mod),
        assignments.map((segment) => segment.mod),
      )
    ) {
      throw new Error("Generated assignment changed the mod pool.");
    }

    const seenPairs = new Set();
    const maps = [];
    const mods = [];

    for (let position = 0; position < assignments.length; position += 1) {
      const original = segments[position];
      const assigned = assignments[position];
      const pairKey = combinationKey(assigned.map, assigned.mod);

      if (
        SHUFFLE_CONFIG.combinations.preventAnyOriginalCombination &&
        originalPairKeys.has(pairKey)
      ) {
        throw new Error(
          `Original combination returned at segment ${original.number}.`,
        );
      }

      if (
        SHUFFLE_CONFIG.combinations.preventDuplicatesInResult &&
        seenPairs.has(pairKey)
      ) {
        throw new Error(
          `Duplicate combination generated at segment ${original.number}.`,
        );
      }

      if (
        SHUFFLE_CONFIG.combinations.requireDifferentAtSamePosition &&
        sameValue(original.map, assigned.map) &&
        sameValue(original.mod, assigned.mod)
      ) {
        throw new Error(
          `Combination did not change at segment ${original.number}.`,
        );
      }

      if (
        SHUFFLE_CONFIG.maps.requireDifferentAtSamePosition &&
        sameValue(original.map, assigned.map)
      ) {
        throw new Error(`Map did not change at segment ${original.number}.`);
      }

      if (
        SHUFFLE_CONFIG.mods.requireDifferentAtSamePosition &&
        sameValue(original.mod, assigned.mod)
      ) {
        throw new Error(`Mod did not change at segment ${original.number}.`);
      }

      if (
        appearsWithinGap(
          maps,
          assigned.map,
          SHUFFLE_CONFIG.maps.minimumRepeatGap,
        )
      ) {
        throw new Error(
          `Map repeat gap was violated at segment ${original.number}.`,
        );
      }

      if (
        appearsWithinGap(
          mods,
          assigned.mod,
          SHUFFLE_CONFIG.mods.minimumRepeatGap,
        )
      ) {
        throw new Error(
          `Mod repeat gap was violated at segment ${original.number}.`,
        );
      }

      if (
        combinationAppearsWithinGap(
          maps,
          mods,
          assigned.map,
          assigned.mod,
          SHUFFLE_CONFIG.combinations.minimumRepeatGap,
        )
      ) {
        throw new Error(
          `Combination repeat gap was violated at segment ` +
            `${original.number}.`,
        );
      }

      seenPairs.add(pairKey);
      maps.push(assigned.map);
      mods.push(assigned.mod);
    }
  }

  function shuffledValidPairs(segments) {
    validateShuffleConfig();

    const originalPairKeys = new Set(
      segments.map((segment) => combinationKey(segment.map, segment.mod)),
    );
    const mapPool = buildValuePool(segments.map((segment) => segment.map));
    const modPool = buildValuePool(segments.map((segment) => segment.mod));

    assertBasicShuffleFeasibility(segments, mapPool, modPool, originalPairKeys);

    let best = null;
    let bestPenalty = Infinity;
    let validPlans = 0;

    for (
      let attempt = 0;
      attempt < SHUFFLE_CONFIG.runtime.generationAttempts;
      attempt += 1
    ) {
      const searchBudget = { nodes: 0 };
      const maps = buildMapSequence(segments, searchBudget);

      if (!maps) {
        continue;
      }

      const mods = buildModSequence(
        segments,
        maps,
        originalPairKeys,
        searchBudget,
      );

      if (!mods) {
        continue;
      }

      const candidate = segments.map((segment, index) => ({
        ...segment,
        map: maps[index],
        mod: mods[index],
      }));

      validateAssignment(segments, candidate, originalPairKeys);
      validPlans += 1;

      const penalty = assignmentPenalty(segments, candidate, originalPairKeys);

      if (penalty < bestPenalty) {
        best = candidate;
        bestPenalty = penalty;
      }

      if (
        penalty === 0 ||
        validPlans >= SHUFFLE_CONFIG.runtime.validPlansToCompare
      ) {
        break;
      }
    }

    if (!best) {
      throw new Error(
        "Could not generate a shuffle satisfying every enabled rule. " +
          "Relax one of the DEFAULT_SHUFFLE_CONFIG restrictions or " +
          "increase runtime.generationAttempts / maxSearchNodesPerAttempt.",
      );
    }

    validateAssignment(segments, best, originalPairKeys);

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

      if (SHUFFLE_CONFIG.runtime.logPlan) {
        console.info(
          "[Refrag Routine Shuffler] Active config:",
          JSON.parse(JSON.stringify(SHUFFLE_CONFIG)),
        );

        console.table(
          assignments.map((target, index) => ({
            segment: segments[index].number,
            from: `${segments[index].map} / ${segments[index].mod}`,
            to: `${target.map} / ${target.mod}`,
            mapChanged: !sameValue(segments[index].map, target.map),
            modChanged: !sameValue(segments[index].mod, target.mod),
          })),
        );
      }

      for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        const target = assignments[index];
        const unchanged =
          sameValue(segment.map, target.map) &&
          sameValue(segment.mod, target.mod);

        button.textContent = `${index + 1}/${segments.length}`;

        if (unchanged && SHUFFLE_CONFIG.runtime.saveOnlyChangedSegments) {
          if (SHUFFLE_CONFIG.runtime.logPlan) {
            console.info(
              `[Refrag Routine Shuffler] Segment ${segment.number}: ` +
                "unchanged, skipping Save.",
            );
          }

          continue;
        }

        if (SHUFFLE_CONFIG.runtime.logPlan) {
          console.info(
            `[Refrag Routine Shuffler] ` +
              `Segment ${segment.number}: ` +
              `${target.map} / ${target.mod}`,
          );
        }

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
      "Independently shuffle maps and mods using SHUFFLE_CONFIG rules";

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

  function cloneConfig() {
    return JSON.parse(JSON.stringify(SHUFFLE_CONFIG));
  }

  function replaceConfig(nextConfig) {
    for (const key of Object.keys(SHUFFLE_CONFIG)) {
      delete SHUFFLE_CONFIG[key];
    }

    Object.assign(SHUFFLE_CONFIG, JSON.parse(JSON.stringify(nextConfig)));
  }

  function updateConfigObject(target, patch, path = "") {
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
      throw new Error("Config patch must be an object.");
    }

    for (const [key, value] of Object.entries(patch)) {
      if (!(key in target)) {
        throw new Error(`Unknown config option: ${path}${key}`);
      }

      const current = target[key];
      const optionPath = `${path}${key}`;

      if (current && typeof current === "object" && !Array.isArray(current)) {
        updateConfigObject(current, value, `${optionPath}.`);
        continue;
      }

      if (typeof value !== typeof current) {
        throw new Error(`${optionPath} must be of type ${typeof current}.`);
      }

      target[key] = value;
    }
  }

  function applyConfigPatch(patch) {
    const previous = cloneConfig();

    try {
      updateConfigObject(SHUFFLE_CONFIG, patch);
      validateShuffleConfig();
      return cloneConfig();
    } catch (error) {
      replaceConfig(previous);
      throw error;
    }
  }

  function configPatchFromPath(path, value) {
    if (typeof path !== "string" || !path.trim()) {
      throw new Error("Config path must be a non-empty string.");
    }

    const parts = path.split(".");
    let patch = value;

    for (let index = parts.length - 1; index >= 0; index -= 1) {
      patch = {
        [parts[index]]: patch,
      };
    }

    return patch;
  }

  // Gotowe pod przyszłe UI. Checkboxy/slidery mogą czytać config
  // albo wywoływać setConfig({ combinations: { ... } }).
  window.RefragRoutineShuffler = {
    config: SHUFFLE_CONFIG,
    schema: SHUFFLE_CONFIG_SCHEMA,

    getConfig: cloneConfig,

    getSchema() {
      return JSON.parse(JSON.stringify(SHUFFLE_CONFIG_SCHEMA));
    },

    setConfig: applyConfigPatch,

    setConfigValue(path, value) {
      return applyConfigPatch(configPatchFromPath(path, value));
    },

    resetConfig() {
      replaceConfig(DEFAULT_SHUFFLE_CONFIG);
      validateShuffleConfig();
      return cloneConfig();
    },

    preview() {
      const segments = getSegmentCards().map(readSegmentCard);
      const assignments = shuffledValidPairs(segments);

      return assignments.map((target, index) => ({
        segment: segments[index].number,
        fromMap: segments[index].map,
        fromMod: segments[index].mod,
        toMap: target.map,
        toMod: target.mod,
      }));
    },

    shuffle() {
      const button = document.getElementById(BUTTON_ID);

      if (!button) {
        throw new Error("The Shuffle button is not mounted yet.");
      }

      return shuffleRoutine(button);
    },
  };

  const observer = new MutationObserver(mountButton);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  mountButton();
})();
