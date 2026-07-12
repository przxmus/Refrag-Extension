(() => {
  "use strict";

  const BUTTON_ID = "refrag-routine-shuffler";
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function buttonText(button) {
    return (button.innerText || button.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
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

  function fieldSelect(label) {
    const labelNode = Array.from(
      document.querySelectorAll("h1,h2,h3,h4,h5,h6,label,div,span"),
    ).find((element) => directText(element) === label);
    if (!labelNode) return null;

    const scope = labelNode.parentElement;
    return scope?.querySelector("select") || null;
  }

  async function waitForEditor() {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const map = fieldSelect("Map");
      const mod = fieldSelect("Mod");
      if (map && mod) return { map, mod };
      await pause(100);
    }
    throw new Error("The segment editor did not become available.");
  }

  function setNativeSelect(select, value) {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype,
      "value",
    ).set;
    setter.call(select, value);
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
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
    return Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent.trim() === "Save",
    );
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
      const segments = [];
      for (const card of cards) {
        card.click();
        const { map, mod } = await waitForEditor();
        segments.push({ card, map: map.value, mod: mod.value });
      }

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
        const { map, mod } = await waitForEditor();
        setNativeSelect(map, targetMaps[index]);
        await pause(40);
        if (mod.value !== segment.mod) setNativeSelect(mod, segment.mod);

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
    const deleteButton = Array.from(document.querySelectorAll("button")).find(
      (button) => buttonText(button) === "Delete",
    );
    const publishButton = Array.from(document.querySelectorAll("button")).find(
      (button) => buttonText(button) === "Review & Publish",
    );
    if (!deleteButton || !publishButton) return;

    const button = publishButton.cloneNode(false);
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
