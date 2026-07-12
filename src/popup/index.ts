import {
  CONFIG_SCHEMA,
  DEFAULT_CONFIG,
  cloneConfig,
  getConfigValue,
  loadConfig,
  saveConfig,
  setConfigValue,
  type ShuffleConfig,
} from "../shared/config";

const settings = document.querySelector<HTMLElement>("#settings")!;
const saveButton = document.querySelector<HTMLButtonElement>("#save")!;
const resetButton = document.querySelector<HTMLButtonElement>("#reset")!;
const status = document.querySelector<HTMLElement>("#status")!;
let config: ShuffleConfig;

function render(): void {
  settings.replaceChildren();
  for (const group of ["Combinations", "Maps", "Mods", "Advanced"] as const) {
    const section = document.createElement("section");
    const heading = document.createElement("h2");
    heading.textContent = group;
    section.append(heading);
    for (const field of CONFIG_SCHEMA.filter((item) => item.group === group)) {
      const row = document.createElement("div");
      row.className = "field";
      const id = field.path.replace(".", "-");
      const label = document.createElement("label");
      label.htmlFor = id;
      label.textContent = field.label;
      const description = document.createElement("p");
      description.textContent = field.description;
      const input: HTMLInputElement | HTMLSelectElement =
        field.type === "select"
          ? document.createElement("select")
          : document.createElement("input");
      input.id = id;
      input.dataset.path = field.path;
      if (field.type === "select") {
        for (const item of field.options ?? []) {
          const option = document.createElement("option");
          option.value = item.value;
          option.textContent = item.label;
          input.append(option);
        }
        input.value = String(getConfigValue(config, field.path));
      } else if (
        field.type === "boolean" &&
        input instanceof HTMLInputElement
      ) {
        input.type = "checkbox";
        input.checked = Boolean(getConfigValue(config, field.path));
      } else if (input instanceof HTMLInputElement) {
        input.type = "number";
        input.min = String(field.min);
        input.max = String(field.max);
        input.step = "1";
        input.value = String(getConfigValue(config, field.path));
      }
      input.addEventListener("change", () => {
        setConfigValue(
          config,
          field.path,
          input instanceof HTMLInputElement && input.type === "checkbox"
            ? input.checked
            : field.type === "integer"
              ? Number(input.value)
              : input.value,
        );
        status.textContent = "Unsaved changes";
      });
      row.append(label, input, description);
      section.append(row);
    }
    settings.append(section);
  }
}

saveButton.addEventListener("click", async () => {
  saveButton.disabled = true;
  try {
    await saveConfig(config);
    status.textContent = "Saved";
  } catch (error) {
    status.textContent =
      error instanceof Error ? error.message : "Could not save";
  } finally {
    saveButton.disabled = false;
  }
});

resetButton.addEventListener("click", () => {
  config = cloneConfig(DEFAULT_CONFIG);
  render();
  status.textContent = "Defaults restored — save to apply";
});

void loadConfig()
  .then((loaded) => {
    config = loaded;
    render();
  })
  .catch((error: unknown) => {
    status.textContent =
      error instanceof Error ? error.message : "Could not load settings";
  });
