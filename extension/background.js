const LIST_SOURCES = [
  {
    key: "easylist",
    name: "EasyList",
    url: "https://easylist.to/easylist/easylist.txt",
    defaultEnabled: true
  },
  {
    key: "easyprivacy",
    name: "EasyPrivacy",
    url: "https://easylist.to/easylist/easyprivacy.txt",
    defaultEnabled: true
  },
  {
    key: "ublock-filters",
    name: "uBlock Filters",
    url: "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt",
    defaultEnabled: true
  },
  {
    key: "ublock-badware",
    name: "uBlock Badware Risks",
    url: "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt",
    defaultEnabled: true
  },
  {
    key: "ublock-privacy",
    name: "uBlock Privacy",
    url: "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt",
    defaultEnabled: false
  }
];

const STORAGE_KEY = "uorigin-state";
const MAX_RULES = 30000;
const UPDATE_ALARM = "uorigin-refresh";
const REFRESH_INTERVAL_MINUTES = 60 * 6;

/**
 * Returns persisted extension state or initializes defaults.
 */
async function getState() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  if (result[STORAGE_KEY]) {
    return result[STORAGE_KEY];
  }

  const initialState = {
    lists: LIST_SOURCES.map((list) => ({
      key: list.key,
      name: list.name,
      url: list.url,
      enabled: list.defaultEnabled,
      ruleCount: 0,
      lastUpdated: null,
      lastError: null
    })),
    customFilters: [],
    lastSync: null,
    blockedRequests: 0,
    protectionEnabled: true
  };

  await chrome.storage.local.set({ [STORAGE_KEY]: initialState });
  return initialState;
}

/**
 * Persists state to storage.
 * @param {object} partialState
 */
async function updateState(partialState) {
  const state = await getState();
  const merged = { ...state, ...partialState };
  await chrome.storage.local.set({ [STORAGE_KEY]: merged });
  return merged;
}

/**
 * Parses a filter list into declarativeNetRequest rules.
 * Supports a subset of uBlock/uOrigin syntax for performant conversion.
 * @param {string} text
 * @param {number} startingId
 */
function parseFilterList(text, startingId) {
  const rules = [];
  const allowRules = [];
  let nextId = startingId;

  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (
      !line ||
      line.startsWith("!") ||
      line.startsWith("#") ||
      line.startsWith("[")
    ) {
      continue;
    }

    if (line.startsWith("@@")) {
      const allowRule = buildRuleFromFilter(line.substring(2), nextId, true);
      if (allowRule) {
        allowRules.push(allowRule);
        nextId += 1;
      }
      continue;
    }

    const blockRule = buildRuleFromFilter(line, nextId, false);
    if (blockRule) {
      rules.push(blockRule);
      nextId += 1;
    }

    if (nextId - startingId > MAX_RULES) {
      break;
    }
  }

  return {
    rules: [...allowRules, ...rules],
    nextId
  };
}

/**
 * Builds a Declarative Net Request rule from a single filter expression.
 * @param {string} filter
 * @param {number} id
 * @param {boolean} isAllow
 */
function buildRuleFromFilter(filter, id, isAllow) {
  const urlFilter = normalizeFilterToUrlFilter(filter);
  if (!urlFilter) {
    return null;
  }

  const types = detectResourceTypes(filter);
  const condition = {
    urlFilter
  };
  if (types.length) {
    condition.resourceTypes = types;
  }

  return {
    id,
    priority: isAllow ? 2 : 1,
    action: { type: isAllow ? "allow" : "block" },
    condition
  };
}

/**
 * Reduces filter modifiers to declarativeNetRequest resource types.
 */
function detectResourceTypes(filter) {
  const match = filter.split("$")[1];
  if (!match) {
    return [];
  }

  const modifiers = match.split(",");
  const typeMap = {
    image: "image",
    script: "script",
    stylesheet: "stylesheet",
    font: "font",
    media: "media",
    xmlhttprequest: "xmlhttprequest",
    xhr: "xmlhttprequest",
    subdocument: "sub_frame",
    popup: "main_frame",
    document: "main_frame"
  };

  const resourceTypes = [];
  for (const modifier of modifiers) {
    const trimmed = modifier.trim();
    if (trimmed.startsWith("domain=")) {
      // Domain scoping handled later when necessary.
      continue;
    }

    const mapped = typeMap[trimmed];
    if (mapped && !resourceTypes.includes(mapped)) {
      resourceTypes.push(mapped);
    }
  }
  return resourceTypes;
}

/**
 * Converts a uBlock style filter into a urlFilter supported by DNR.
 * Focuses on domain and path blocking rules, ignoring unsupported syntax.
 */
function normalizeFilterToUrlFilter(filter) {
  const value = filter.split("$")[0];
  if (!value) {
    return null;
  }

  if (
    value.includes("##") ||
    value.includes("#@#") ||
    value.includes("#?#") ||
    value.includes("#$#") ||
    value.includes("#$") ||
    value.includes("^$popup") ||
    value.startsWith("!")
  ) {
    return null;
  }

  if (value.startsWith("||")) {
    const domain = value.substring(2).replace(/\^$/u, "");
    if (!domain) {
      return null;
    }
    return "||" + domain;
  }

  if (value.startsWith("|")) {
    return value;
  }

  if (value.includes("*") || value.includes("^") || value.includes("/")) {
    return value;
  }

  return `*://${value}/*`;
}

/**
 * Refreshes all enabled lists and updates dynamic rules.
 * Triggered on install, alarm, and manual requests.
 */
async function refreshRules() {
  const state = await getState();
  if (!state.protectionEnabled) {
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const existingIds = existing.map((rule) => rule.id);
    if (existingIds.length) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingIds,
        addRules: []
      });
    }
    await updateState({ lastSync: Date.now() });
    return;
  }

  const enabledLists = state.lists.filter((list) => list.enabled);
  const newRules = [];
  let nextId = 1000;
  const updatedLists = [];

  for (const list of enabledLists) {
    try {
      const response = await fetch(list.url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to fetch ${list.url}`);
      }
      const text = await response.text();
      const parsed = parseFilterList(text, nextId);
      nextId = parsed.nextId;
      newRules.push(...parsed.rules);
      updatedLists.push({
        ...list,
        ruleCount: parsed.rules.length,
        lastUpdated: Date.now(),
        lastError: null
      });
    } catch (error) {
      console.error("List refresh failed:", list.key, error);
      updatedLists.push({
        ...list,
        lastError: error.message,
        ruleCount: 0
      });
    }

    if (newRules.length >= MAX_RULES) {
      break;
    }
  }

  // Include custom filter rules.
  if (state.customFilters?.length) {
    for (const filter of state.customFilters) {
      if (!filter.enabled) {
        continue;
      }
      const rule = buildRuleFromFilter(filter.expression, nextId, filter.type === "allow");
      if (rule) {
        newRules.push(rule);
        nextId += 1;
      }
    }
  }

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const existingIds = existing.map((rule) => rule.id);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingIds,
    addRules: newRules.slice(0, MAX_RULES)
  });

  await updateState({
    lists: state.lists.map((list) => {
      const updated = updatedLists.find((item) => item.key === list.key);
      return updated ?? list;
    }),
    lastSync: Date.now()
  });

  console.info("Updated dynamic rules:", newRules.length);
}

chrome.runtime.onInstalled.addListener(async () => {
  await getState();
  await refreshRules();
  chrome.alarms.create(UPDATE_ALARM, {
    periodInMinutes: REFRESH_INTERVAL_MINUTES
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === UPDATE_ALARM) {
    await refreshRules();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "refresh") {
    refreshRules()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "toggle-list") {
    (async () => {
      const state = await getState();
      const lists = state.lists.map((list) => {
        if (list.key === message.key) {
          return { ...list, enabled: message.enabled };
        }
        return list;
      });
      await updateState({ lists });
      await refreshRules();
      sendResponse({ ok: true });
    })().catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "custom-filters") {
    (async () => {
      const state = await getState();
      await updateState({ customFilters: message.filters });
      await refreshRules();
      sendResponse({ ok: true });
    })().catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "get-state") {
    (async () => {
      const state = await getState();
      sendResponse({ ok: true, state });
    })().catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "toggle-protection") {
    (async () => {
      await updateState({ protectionEnabled: message.enabled });
      await refreshRules();
      sendResponse({ ok: true });
    })().catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});

chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(async () => {
  const state = await getState();
  const blockedRequests = (state.blockedRequests ?? 0) + 1;
  await updateState({ blockedRequests });
});
