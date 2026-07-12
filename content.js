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

  function directText(element) {
    return Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent.trim())
      .join(" ");
  }

  function getSegmentCards() {
    const seen = new Set();
    const cards = [];
    const headings = Array.from(
      document.querySelectorAll("h1,h2,h3,h4,h5,h6,div,span"),
    ).filter((element) => /^Segment \d+$/.test(directText(element)));

    for (const heading of headings) {
      let candidate = heading.parentElement;
      while (candidate && candidate !== document.body) {
        const text = candidate.innerText?.replace(/\s+/g, " ").trim() || "";
        const segmentCount = (text.match(/\bSegment\s+\d+\b/g) || []).length;
        if (
          /^Segment\s+\d+\b/.test(text) &&
          text.includes("•") &&
          /\b\d+\s*(?:minute|minutes|min|mins)\b/.test(text) &&
          segmentCount === 1
        ) {
          break;
        }
        candidate = candidate.parentElement;
      }
      if (candidate && candidate !== document.body && !seen.has(candidate)) {
        seen.add(candidate);
        cards.push(candidate);
      }
    }

    return cards.sort((left, right) => {
      const leftNumber = Number(left.innerText.match(/^Segment (\d+)/)?.[1]);
      const rightNumber = Number(right.innerText.match(/^Segment (\d+)/)?.[1]);
      return leftNumber - rightNumber;
    });
  }

  async function selectSegment(segmentNumber) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const card = getSegmentCards().find(
        (candidate) =>
          Number(candidate.innerText.match(/^Segment (\d+)/)?.[1]) ===
          segmentNumber,
      );
      if (card) {
        card.click();
        await pause(100);
        return;
      }
      await pause(100);
    }
    throw new Error(`Could not find segment ${segmentNumber}.`);
  }

  function findFieldTrigger(label, value) {
    const labelNode = Array.from(
      document.querySelectorAll("h1,h2,h3,h4,h5,h6,label,div,span"),
    ).find((element) => directText(element) === label);
    if (!labelNode) return null;

    const labelRect = labelNode.getBoundingClientRect();
    const candidates = Array.from(document.querySelectorAll("*"))
      .filter((element) => {
        if (
          element === document.body ||
          element === document.documentElement ||
          !element.getClientRects().length
        )
          return false;
        const rect = element.getBoundingClientRect();
        return (
          rect.width > 100 &&
          rect.left >= labelRect.left - 2 &&
          rect.top >= labelRect.bottom - 2 &&
          rect.top <= labelRect.bottom + 88
        );
      })
      .sort(
        (left, right) =>
          left.getBoundingClientRect().width *
            left.getBoundingClientRect().height -
          right.getBoundingClientRect().width *
            right.getBoundingClientRect().height,
      );

    return (
      candidates.find((element) => value && sameValue(elementText(element), value)) ||
      candidates[0] ||
      null
    );
  }

  async function waitForFieldTrigger(label, value) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const trigger = findFieldTrigger(label, value);
      if (trigger) return trigger;
      await pause(100);
    }
    throw new Error(`Could not find Refrag’s ${label} selector.`);
  }

  async function waitForFieldValue(label, value) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const trigger = findFieldTrigger(label, value);
      if (trigger && sameValue(elementText(trigger), value)) return trigger;
      await pause(100);
    }
    throw new Error(`Could not confirm Refrag’s ${label} value ${value}.`);
  }

  function dropdownOption(trigger, value) {
    const triggerRect = trigger.getBoundingClientRect();
    const isTrigger = (element) =>
      element === trigger || trigger.contains(element) || element.contains(trigger);
    const depth = (element) => {
      let result = 0;
      for (let node = element; node?.parentElement; node = node.parentElement) {
        result += 1;
      }
      return result;
    };

    return Array.from(document.querySelectorAll("*"))
      .filter(
        (element) =>
          element !== document.body &&
          element !== document.documentElement &&
          !isTrigger(element) &&
          sameValue(elementText(element), value) &&
          element.getClientRects().length,
      )
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const menu = element.closest(
          'menu,[role="option"],[role="menuitem"],[role="listbox"],[role="menu"],[data-radix-select-content],[data-radix-popper-content-wrapper]',
        );
        return {
          element,
          inMenu: Boolean(menu),
          depth: depth(element),
          distance:
            Math.abs(rect.left - triggerRect.left) +
            Math.abs(rect.top - triggerRect.top),
        };
      })
      .sort((left, right) => {
        return (
          Number(right.inMenu) - Number(left.inMenu) ||
          left.distance - right.distance ||
          right.depth - left.depth
        );
      })[0]?.element;
  }

  async function chooseDropdownValue(trigger, value, label) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      trigger.click();
      for (let waitAttempt = 0; waitAttempt < 10; waitAttempt += 1) {
        await pause(80);
        const option = dropdownOption(trigger, value);
        if (!option) continue;
        option.click();
        await pause(100);
        return;
      }
      trigger.click();
      await pause(80);
    }
    throw new Error(`Could not select ${label} ${value}.`);
  }

  async function availableDropdownValues(trigger, values) {
    trigger.click();
    await pause(80);
    const available = values.filter((value) => dropdownOption(trigger, value));
    trigger.click();
    await pause(80);
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
        const parts = card.innerText
          .replace(/\s+/g, " ")
          .split("•")
          .map((part) => part.trim());
        const map = parts[0]?.replace(/^Segment \d+\s*/, "").trim();
        const mod = parts[1];
        if (!map || !mod) throw new Error("Could not read a routine segment.");
        const number = Number(card.innerText.match(/^Segment (\d+)/)?.[1]);
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
        const mapTrigger = await waitForFieldTrigger("Map", segment.map);
        await chooseDropdownValue(mapTrigger, targetMaps[index], "map");
        await selectSegment(segment.number);
        const modTrigger = await waitForFieldTrigger("Mod");
        allowedMods[index] = await availableDropdownValues(
          modTrigger,
          distinctMods,
        );
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
        const mapTrigger = await waitForFieldTrigger("Map");
        await chooseDropdownValue(mapTrigger, targetMaps[index], "map");
        await selectSegment(segment.number);
        const modTrigger = await waitForFieldTrigger("Mod");
        await chooseDropdownValue(modTrigger, compatibleMods[index], "mod");

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
