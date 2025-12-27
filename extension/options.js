const listContainer = document.querySelector("#list-container");
const listTemplate = document.querySelector("#list-template");
const customContainer = document.querySelector("#custom-container");
const customTemplate = document.querySelector("#custom-template");
const statusEl = document.querySelector("#status");
const refreshButton = document.querySelector("#refresh-button");
const addCustomButton = document.querySelector("#add-custom");
const customDialog = document.querySelector("#custom-dialog");
const customExpression = document.querySelector("#custom-expression");
const customType = document.querySelector("#custom-type");
const customDialogTitle = document.querySelector("#custom-dialog-title");

let currentState = null;
let editingCustomId = null;

async function loadState() {
  const response = await chrome.runtime.sendMessage({ type: "get-state" });
  if (!response?.ok) {
    throw new Error(response?.error ?? "Unable to load state");
  }
  currentState = response.state;
  render();
}

function render() {
  renderLists();
  renderCustomRules();
  if (currentState?.lastSync) {
    const lastSync = new Date(currentState.lastSync).toLocaleString();
    statusEl.textContent = `Last updated ${lastSync}`;
  } else {
    statusEl.textContent = "Pending initial synchronization…";
  }
}

function renderLists() {
  listContainer.innerHTML = "";
  for (const list of currentState.lists) {
    const clone = listTemplate.content.firstElementChild.cloneNode(true);
    const checkbox = clone.querySelector("input[type='checkbox']");
    checkbox.checked = list.enabled;
    clone.querySelector(".name").textContent = list.name;
    clone.querySelector(".rules").textContent = list.ruleCount
      ? `${list.ruleCount} active rules`
      : "Waiting for sync";
    const status = clone.querySelector(".status");
    if (list.lastError) {
      status.textContent = `Last error: ${list.lastError}`;
    } else if (list.lastUpdated) {
      status.textContent = `Updated ${new Date(list.lastUpdated).toLocaleString()}`;
    } else {
      status.textContent = "Pending update";
    }
    const source = clone.querySelector(".source");
    source.href = list.url;
    source.textContent = "Open source list";

    checkbox.addEventListener("change", async (event) => {
      checkbox.disabled = true;
      statusEl.textContent = "Updating list configuration…";
      const enabled = event.target.checked;
      const result = await chrome.runtime.sendMessage({
        type: "toggle-list",
        key: list.key,
        enabled
      });
      checkbox.disabled = false;
      if (!result?.ok) {
        statusEl.textContent = `Failed: ${result?.error ?? "Unknown error"}`;
        checkbox.checked = !enabled;
        return;
      }
      await loadState();
      statusEl.textContent = "List configuration updated.";
    });

    listContainer.appendChild(clone);
  }
}

function renderCustomRules() {
  customContainer.innerHTML = "";
  const filters = currentState.customFilters ?? [];
  if (!filters.length) {
    const empty = document.createElement("p");
    empty.textContent = "No custom rules yet. Add one to fine-tune blocking.";
    empty.className = "empty";
    customContainer.appendChild(empty);
    return;
  }

  for (const filter of filters) {
    const clone = customTemplate.content.firstElementChild.cloneNode(true);
    const checkbox = clone.querySelector(".enabled");
    checkbox.checked = filter.enabled;
    clone.querySelector(".expression").textContent = `${filter.type === "allow" ? "Allow" : "Block"} → ${filter.expression}`;

    checkbox.addEventListener("change", async (event) => {
      checkbox.disabled = true;
      const updated = filters.map((item) =>
        item.id === filter.id ? { ...item, enabled: event.target.checked } : item
      );
      const result = await chrome.runtime.sendMessage({
        type: "custom-filters",
        filters: updated
      });
      checkbox.disabled = false;
      if (!result?.ok) {
        statusEl.textContent = `Failed to update custom filters: ${result?.error ?? "Unknown"}`;
        checkbox.checked = !event.target.checked;
        return;
      }
      currentState.customFilters = updated;
      renderCustomRules();
      statusEl.textContent = "Custom filters updated.";
    });

    clone.querySelector(".delete").addEventListener("click", async () => {
      const updated = filters.filter((item) => item.id !== filter.id);
      const result = await chrome.runtime.sendMessage({
        type: "custom-filters",
        filters: updated
      });
      if (!result?.ok) {
        statusEl.textContent = `Failed to remove rule: ${result?.error ?? "Unknown"}`;
        return;
      }
      currentState.customFilters = updated;
      renderCustomRules();
      statusEl.textContent = "Custom rule removed.";
    });

    clone.querySelector(".edit").addEventListener("click", () => {
      editingCustomId = filter.id;
      customExpression.value = filter.expression;
      customType.value = filter.type ?? "block";
      customDialogTitle.textContent = "Edit Custom Rule";
      customDialog.showModal();
    });

    customContainer.appendChild(clone);
  }
}

refreshButton.addEventListener("click", async () => {
  statusEl.textContent = "Refreshing filter lists…";
  refreshButton.disabled = true;
  const response = await chrome.runtime.sendMessage({ type: "refresh" });
  refreshButton.disabled = false;
  if (!response?.ok) {
    statusEl.textContent = `Failed to refresh: ${response?.error ?? "Unknown error"}`;
    return;
  }
  await loadState();
  statusEl.textContent = "Filter lists refreshed.";
});

addCustomButton.addEventListener("click", () => {
  editingCustomId = null;
  customExpression.value = "";
  customType.value = "block";
  customDialogTitle.textContent = "Add Custom Rule";
  customDialog.showModal();
});

customDialog.addEventListener("close", async () => {
  if (customDialog.returnValue !== "save") {
    return;
  }

  const expression = customExpression.value.trim();
  if (!expression) {
    return;
  }

  const filters = currentState.customFilters ?? [];
  if (editingCustomId) {
    const updated = filters.map((filter) =>
      filter.id === editingCustomId
        ? { ...filter, expression, type: customType.value }
        : filter
    );
    const result = await chrome.runtime.sendMessage({
      type: "custom-filters",
      filters: updated
    });
    if (!result?.ok) {
      statusEl.textContent = `Failed to update rule: ${result?.error ?? "Unknown"}`;
      return;
    }
    currentState.customFilters = updated;
  } else {
    const newFilter = {
      id: crypto.randomUUID(),
      expression,
      type: customType.value,
      enabled: true
    };
    const updated = [...filters, newFilter];
    const result = await chrome.runtime.sendMessage({
      type: "custom-filters",
      filters: updated
    });
    if (!result?.ok) {
      statusEl.textContent = `Failed to add rule: ${result?.error ?? "Unknown"}`;
      return;
    }
    currentState.customFilters = updated;
  }

  renderCustomRules();
  statusEl.textContent = "Custom rules saved.";
});

loadState().catch((error) => {
  statusEl.textContent = error.message;
});
