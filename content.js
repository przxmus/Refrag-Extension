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
        if (/^Segment \d+ .* • .* • \d+ minutes?$/.test(text)) break;
        candidate = candidate.parentElement;
      }
      if (candidate && !seen.has(candidate)) {
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

  function findFieldTrigger(label, value) {
    const labelNode = Array.from(
      document.querySelectorAll("h1,h2,h3,h4,h5,h6,label,div,span"),
    ).find((element) => directText(element) === label);
    if (!labelNode) return null;

    const labelRect = labelNode.getBoundingClientRect();
    return Array.from(document.querySelectorAll("*")).find((element) => {
      if (elementText(element) !== value || !element.getClientRects().length)
        return false;
      const rect = element.getBoundingClientRect();
      return (
        rect.width > 100 &&
        rect.left >= labelRect.left - 2 &&
        rect.top >= labelRect.bottom - 2 &&
        rect.top <= labelRect.bottom + 88
      );
    });
  }

  async function waitForFieldTrigger(label, value) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const trigger = findFieldTrigger(label, value);
      if (trigger) return trigger;
      await pause(100);
    }
    throw new Error(`Could not find Refrag’s ${label} selector.`);
  }

  async function chooseDropdownValue(trigger, value) {
    trigger.click();
    await pause(80);
    const triggerRect = trigger.getBoundingClientRect();
    const option = Array.from(document.querySelectorAll("*"))
      .filter(
        (element) =>
          elementText(element) === value && element.getClientRects().length,
      )
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(
        ({ rect }) =>
          rect.width > 100 &&
          rect.left >= triggerRect.left - 4 &&
          rect.top >= triggerRect.bottom - 2,
      )
      .sort((left, right) => right.rect.top - left.rect.top)[0]?.element;
    if (!option) throw new Error(`Could not select map ${value}.`);
    option.click();
    await pause(80);
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
        return { card, map, mod };
      });

      const targetMaps = shuffledMapAssignments(
        segments.map((segment) => segment.map),
      );
      if (targetMaps.every((map, index) => map === segments[index].map)) {
        throw new Error(
          "This routine needs at least two distinct maps to create a new combination.",
        );
      }

      for (const [index, segment] of segments.entries()) {
        segment.card.click();
        const mapTrigger = await waitForFieldTrigger("Map", segment.map);
        await chooseDropdownValue(mapTrigger, targetMaps[index]);

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
