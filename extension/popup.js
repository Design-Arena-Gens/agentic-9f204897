const blockedCount = document.querySelector("#blocked-count");
const activeLists = document.querySelector("#active-lists");
const lastSync = document.querySelector("#last-sync");
const refreshButton = document.querySelector("#refresh");
const toggleProtection = document.querySelector("#toggle-protection");
const openDashboard = document.querySelector("#open-dashboard");

async function getState() {
  const response = await chrome.runtime.sendMessage({ type: "get-state" });
  if (!response?.ok) {
    throw new Error(response?.error ?? "Unable to load state");
  }
  return response.state;
}

async function render() {
  const state = await getState();
  blockedCount.textContent = state.blockedRequests ?? 0;
  activeLists.textContent = state.lists.filter((list) => list.enabled).length;
  if (state.lastSync) {
    lastSync.textContent = new Date(state.lastSync).toLocaleString();
  } else {
    lastSync.textContent = "Pending";
  }

  if (state.protectionEnabled) {
    toggleProtection.textContent = "Disable Protection";
    toggleProtection.classList.remove("secondary");
  } else {
    toggleProtection.textContent = "Enable Protection";
    toggleProtection.classList.add("secondary");
  }
}

refreshButton.addEventListener("click", async () => {
  refreshButton.disabled = true;
  await chrome.runtime.sendMessage({ type: "refresh" });
  refreshButton.disabled = false;
  await render();
});

toggleProtection.addEventListener("click", async () => {
  toggleProtection.disabled = true;
  const state = await getState();
  const response = await chrome.runtime.sendMessage({
    type: "toggle-protection",
    enabled: !state.protectionEnabled
  });
  toggleProtection.disabled = false;
  if (!response?.ok) {
    return;
  }
  await render();
});

openDashboard.addEventListener("click", (event) => {
  event.preventDefault();
  chrome.runtime.openOptionsPage();
});

render().catch((error) => {
  blockedCount.textContent = "Error";
  console.error(error);
});
