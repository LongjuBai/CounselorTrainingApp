const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const STORAGE_KEY = "reflection_training_config_v1";
const MENTAL_BANK_URL = "./world_mental_bank.json";

const REGION_LAYOUT = {
  "North America": { x: 16, y: 28 },
  "Latin America": { x: 25, y: 64 },
  Europe: { x: 49, y: 25 },
  "Eastern Europe": { x: 57, y: 28 },
  Africa: { x: 54, y: 56 },
  "Middle East": { x: 63, y: 39 },
  "South Asia": { x: 71, y: 46 },
  "Southeast Asia": { x: 80, y: 51 },
  "East Asia": { x: 84, y: 28 },
  Global: { x: 50, y: 80 },
};

const dom = {
  apiKeyInput: document.getElementById("apiKeyInput"),
  modelInput: document.getElementById("modelInput"),
  openrouterFileInput: document.getElementById("openrouterFileInput"),
  rememberToggle: document.getElementById("rememberToggle"),
  mainIssueGrid: document.getElementById("mainIssueGrid"),
  regionMap: document.getElementById("regionMap"),
  randomSelectionBtn: document.getElementById("randomSelectionBtn"),
  selectionSummary: document.getElementById("selectionSummary"),
  generateClientBtn: document.getElementById("generateClientBtn"),
  clientPromptBox: document.getElementById("clientPromptBox"),
  traineeResponse: document.getElementById("traineeResponse"),
  evaluateBtn: document.getElementById("evaluateBtn"),
  scoreValue: document.getElementById("scoreValue"),
  scoreFill: document.getElementById("scoreFill"),
  evidenceBox: document.getElementById("evidenceBox"),
  explanationBox: document.getElementById("explanationBox"),
  suggestionBox: document.getElementById("suggestionBox"),
  statusBox: document.getElementById("statusBox"),
};

const state = {
  mentalBank: {},
  issueOrder: [],
  regionOrder: [],
  selectedIssue: "",
  selectedRegion: "",
  selectedTopic: "",
  selectedNarrative: "",
  latestClientPrompt: "",
  isLoading: false,
};

void init();

async function init() {
  loadConfigFromStorage();
  bindEventListeners();
  resetFeedback();
  clearClientPrompt();

  try {
    await loadMentalBank();
    renderIssueButtons();
    renderRegionButtons();
    updateSelectionSummary();
    updateActionAvailability();
    setStatus("Select a main issue to begin.", "info");
  } catch (error) {
    console.error(error);
    dom.mainIssueGrid.textContent = "Scenario bank failed to load.";
    setStatus("Could not load world_mental_bank.json. Serve the folder with a local web server and try again.", "error");
  }
}

function bindEventListeners() {
  dom.openrouterFileInput.addEventListener("change", handleOpenRouterFile);
  dom.generateClientBtn.addEventListener("click", handleGenerateClientPrompt);
  dom.evaluateBtn.addEventListener("click", handleEvaluateReflection);
  dom.randomSelectionBtn.addEventListener("click", handleRandomSelection);
  dom.apiKeyInput.addEventListener("input", maybePersistConfig);
  dom.modelInput.addEventListener("input", maybePersistConfig);
  dom.rememberToggle.addEventListener("change", maybePersistConfig);
  dom.traineeResponse.addEventListener("input", updateActionAvailability);
}

async function loadMentalBank() {
  const response = await fetch(MENTAL_BANK_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load scenario bank (${response.status}).`);
  }

  const mentalBank = await response.json();
  state.mentalBank = mentalBank;
  state.issueOrder = Object.keys(mentalBank);
  state.regionOrder = buildOrderedRegionList(mentalBank);
}

function buildOrderedRegionList(mentalBank) {
  const discovered = new Set();
  Object.values(mentalBank).forEach((issueData) => {
    Object.keys(issueData || {}).forEach((region) => discovered.add(region));
  });

  const preferred = Object.keys(REGION_LAYOUT).filter((region) => discovered.has(region));
  const fallback = [...discovered]
    .filter((region) => !REGION_LAYOUT[region])
    .sort((left, right) => left.localeCompare(right));
  return [...preferred, ...fallback];
}

function renderIssueButtons() {
  dom.mainIssueGrid.innerHTML = "";
  state.issueOrder.forEach((issueKey) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "issue-chip";
    button.textContent = formatLabel(issueKey);
    button.setAttribute("aria-pressed", "false");
    button.dataset.issueKey = issueKey;
    button.addEventListener("click", () => handleIssueSelect(issueKey));
    dom.mainIssueGrid.appendChild(button);
  });
}

function renderRegionButtons() {
  dom.regionMap.innerHTML = "";
  state.regionOrder.forEach((region, index) => {
    const layout = REGION_LAYOUT[region] || buildFallbackRegionLayout(index);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "region-pin";
    button.textContent = region;
    button.dataset.region = region;
    button.style.setProperty("--x", `${layout.x}%`);
    button.style.setProperty("--y", `${layout.y}%`);
    button.addEventListener("click", () => handleRegionSelect(region));
    dom.regionMap.appendChild(button);
  });
  updateRegionButtons();
}

function buildFallbackRegionLayout(index) {
  const column = index % 4;
  const row = Math.floor(index / 4);
  return {
    x: 18 + column * 20,
    y: 82 + row * 10,
  };
}

function handleIssueSelect(issueKey) {
  state.selectedIssue = issueKey;
  state.selectedRegion = "";
  state.selectedTopic = "";
  state.selectedNarrative = "";
  clearScenarioOutput();
  updateIssueButtons();
  updateRegionButtons();
  updateSelectionSummary();
  updateActionAvailability();
  setStatus(`Main issue selected: ${formatLabel(issueKey)}. Choose a region or use Random.`, "success");
}

function updateIssueButtons() {
  const issueButtons = dom.mainIssueGrid.querySelectorAll(".issue-chip");
  issueButtons.forEach((button) => {
    const isActive = button.dataset.issueKey === state.selectedIssue;
    button.classList.toggle("selected", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function updateRegionButtons() {
  const availableRegions = new Set(getAvailableRegions());
  const regionButtons = dom.regionMap.querySelectorAll(".region-pin");

  regionButtons.forEach((button) => {
    const region = button.dataset.region;
    const isAvailable = availableRegions.has(region);
    const isActive = region === state.selectedRegion;
    button.disabled = !isAvailable;
    button.classList.toggle("is-available", isAvailable);
    button.classList.toggle("is-disabled", !isAvailable);
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
    button.title = isAvailable
      ? `${region} is available for ${formatLabel(state.selectedIssue || "this issue")}.`
      : `${region} is not available for the current issue.`;
  });
}

function getAvailableRegions() {
  if (!state.selectedIssue) return [];
  return Object.keys(state.mentalBank[state.selectedIssue] || {});
}

function handleRegionSelect(region) {
  if (!state.selectedIssue) {
    setStatus("Pick a main issue before choosing a region.", "error");
    return;
  }

  const regionData = state.mentalBank[state.selectedIssue]?.[region];
  if (!regionData) {
    setStatus(`No scenarios are available for ${region} under ${formatLabel(state.selectedIssue)}.`, "error");
    return;
  }

  const scenario = pickRandomScenarioFromRegion(regionData);
  applyScenarioSeed({
    region,
    topic: scenario.topic,
    narrative: scenario.narrative,
    source: "region",
  });
}

function handleRandomSelection() {
  if (!state.selectedIssue) {
    setStatus("Pick a main issue first, then Random can choose across that issue's regions.", "error");
    return;
  }

  const issueData = state.mentalBank[state.selectedIssue] || {};
  const regionEntries = Object.entries(issueData).flatMap(([region, regionData]) =>
    extractScenarioOptions(regionData).map((option) => ({
      region,
      topic: option.topic,
      narrative: option.narrative,
    })),
  );

  if (!regionEntries.length) {
    setStatus("No scenario seeds are available for the selected issue.", "error");
    return;
  }

  const selection = sample(regionEntries);
  applyScenarioSeed({
    region: selection.region,
    topic: selection.topic,
    narrative: selection.narrative,
    source: "random",
  });
}

function applyScenarioSeed({ region, topic, narrative, source }) {
  state.selectedRegion = region;
  state.selectedTopic = topic;
  state.selectedNarrative = narrative;
  clearScenarioOutput();
  updateRegionButtons();
  updateSelectionSummary();
  updateActionAvailability();

  const sourceLabel = source === "random" ? "Random scenario ready" : "Scenario ready";
  setStatus(
    `${sourceLabel}: ${formatLabel(state.selectedIssue)} -> ${region} -> ${formatLabel(topic)} -> ${narrative}.`,
    "success",
  );
}

function extractScenarioOptions(regionData) {
  if (Array.isArray(regionData)) {
    return regionData.map((narrative) => ({
      topic: "general",
      narrative,
    }));
  }

  return Object.entries(regionData || {}).flatMap(([topic, narratives]) => {
    if (!Array.isArray(narratives)) return [];
    return narratives.map((narrative) => ({
      topic,
      narrative,
    }));
  });
}

function pickRandomScenarioFromRegion(regionData) {
  const options = extractScenarioOptions(regionData);
  if (!options.length) {
    return {
      topic: "general",
      narrative: "general distress with unclear context",
    };
  }
  return sample(options);
}

function updateSelectionSummary() {
  if (!state.selectedIssue) {
    dom.selectionSummary.textContent = "Main issue: waiting for selection\nRegion: --\nTopic: --\nNarrative: --";
    return;
  }

  if (!state.selectedRegion) {
    dom.selectionSummary.textContent =
      `Main issue: ${formatLabel(state.selectedIssue)}\n` +
      "Region: choose from the active map zones\n" +
      "Topic: --\n" +
      "Narrative: --";
    return;
  }

  dom.selectionSummary.textContent =
    `Main issue: ${formatLabel(state.selectedIssue)}\n` +
    `Region: ${state.selectedRegion}\n` +
    `Topic: ${formatLabel(state.selectedTopic)}\n` +
    `Narrative: ${state.selectedNarrative}`;
}

async function handleOpenRouterFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const content = await file.text();
    const { model, apiKey } = parseOpenRouterText(content);
    if (model) dom.modelInput.value = model;
    if (apiKey) dom.apiKeyInput.value = apiKey;

    maybePersistConfig();
    setStatus("Loaded API key/model from file.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Could not parse the selected file.", "error");
  } finally {
    dom.openrouterFileInput.value = "";
  }
}

function parseOpenRouterText(rawText) {
  const modelMatch = rawText.match(/model\s*name\s*:\s*(.+)/i);
  const keyMatch = rawText.match(/api\s*key\s*:\s*(.+)/i);
  return {
    model: modelMatch ? modelMatch[1].trim() : "",
    apiKey: keyMatch ? keyMatch[1].trim() : "",
  };
}

async function handleGenerateClientPrompt() {
  const config = readConfig();
  if (!config.apiKey || !config.model) {
    setStatus("Please enter API key and model first.", "error");
    return;
  }

  if (!state.selectedIssue || !state.selectedRegion || !state.selectedTopic || !state.selectedNarrative) {
    setStatus("Pick a main issue, then choose a region or use Random before generating.", "error");
    return;
  }

  setLoading(true);
  setStatus("Generating simulated client prompt...", "info");

  const messages = [
    {
      role: "system",
      content:
        "You simulate a counseling client for reflection training. Create realistic first-person client speech that reveals emotions, context, and ambivalence. Keep it 100-170 words. Avoid explicit graphic detail. Do not provide counseling advice in the client prompt. Keep language natural and emotionally grounded.",
    },
    {
      role: "user",
      content:
        "Generate one simulated client statement using the scenario seed below.\n" +
        `Main issue: ${formatLabel(state.selectedIssue)}\n` +
        `Region: ${state.selectedRegion}\n` +
        `Context topic: ${formatLabel(state.selectedTopic)}\n` +
        `Narrative seed: ${state.selectedNarrative}\n\n` +
        "Requirements:\n" +
        "- Keep the regional context realistic but avoid stereotypes.\n" +
        "- Mention specific stressors and emotions.\n" +
        "- Include one tension or contradiction the trainee can reflect.\n" +
        "- Keep the prompt as one cohesive client monologue.",
    },
  ];

  try {
    const clientPrompt = await callOpenRouter({
      apiKey: config.apiKey,
      model: config.model,
      messages,
      temperature: 0.8,
      max_tokens: 420,
      requireJson: false,
    });

    state.latestClientPrompt = clientPrompt.trim();
    dom.clientPromptBox.textContent = state.latestClientPrompt;
    updateActionAvailability();
    setStatus("Client prompt generated. Write the trainee reflection, then evaluate.", "success");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Failed to generate client prompt.", "error");
  } finally {
    setLoading(false);
  }
}

async function handleEvaluateReflection() {
  const config = readConfig();
  if (!config.apiKey || !config.model) {
    setStatus("Please enter API key and model first.", "error");
    return;
  }

  if (!state.latestClientPrompt) {
    setStatus("Generate a client prompt before evaluation.", "error");
    return;
  }

  const traineeText = dom.traineeResponse.value.trim();
  if (!traineeText) {
    setStatus("Please enter a trainee response.", "error");
    return;
  }

  setLoading(true);
  setStatus("Evaluating reflection quality...", "info");

  const rubric = [
    "0.00-0.24: mostly off-target, advice/questioning, little reflection.",
    "0.25-0.49: some paraphrase but weak emotional attunement.",
    "0.50-0.74: reflects core feeling/meaning with moderate empathy.",
    "0.75-1.00: accurate, concise, empathic reflection of deeper meaning and affect.",
  ].join("\n");

  const messages = [
    {
      role: "system",
      content:
        "You are an expert counseling supervisor scoring reflective listening quality. Return JSON only with the exact keys requested. No markdown, no extra keys.",
    },
    {
      role: "user",
      content:
        "Evaluate the trainee response using the rubric below.\n\n" +
        `Rubric:\n${rubric}\n\n` +
        `Client prompt:\n${state.latestClientPrompt}\n\n` +
        `Trainee response:\n${traineeText}\n\n` +
        "Return strict JSON with these keys:\n" +
        "{\n" +
        '  "score": number,\n' +
        '  "evidence": {\n' +
        '    "client_slice": string,\n' +
        '    "trainee_slice": string\n' +
        "  },\n" +
        '  "rubric_explanation": string,\n' +
        '  "next_step": string,\n' +
        '  "suggested_response": string\n' +
        "}\n" +
        "Constraints:\n" +
        "- score must be between 0 and 1.\n" +
        "- evidence slices should be short direct quotes from the inputs.\n" +
        "- rubric_explanation should justify score according to reflection quality.\n" +
        "- next_step should say what to improve next turn.\n" +
        "- suggested_response should model a stronger reflection in 1-2 sentences.",
    },
  ];

  try {
    const rawFeedback = await callOpenRouter({
      apiKey: config.apiKey,
      model: config.model,
      messages,
      temperature: 0.2,
      max_tokens: 650,
      requireJson: true,
    });

    const parsed = parseJsonFromResponse(rawFeedback);
    const feedback = normalizeFeedback(parsed);
    renderFeedback(feedback);
    updateActionAvailability();
    setStatus("Evaluation complete.", "success");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Failed to evaluate reflection.", "error");
  } finally {
    setLoading(false);
  }
}

function normalizeFeedback(raw) {
  const numericScore = Number.parseFloat(raw.score);
  const score = Number.isFinite(numericScore) ? clamp(numericScore, 0, 1) : 0;

  let evidenceText = "No evidence provided.";
  if (typeof raw.evidence === "string" && raw.evidence.trim()) {
    evidenceText = raw.evidence.trim();
  } else if (raw.evidence && typeof raw.evidence === "object") {
    const clientSlice = String(raw.evidence.client_slice || "").trim();
    const traineeSlice = String(raw.evidence.trainee_slice || "").trim();
    if (clientSlice || traineeSlice) {
      evidenceText = `Client slice: "${clientSlice || "[missing]"}"\nTrainee slice: "${traineeSlice || "[missing]"}"`;
    }
  }

  const rubricExplanation = String(raw.rubric_explanation || "").trim() || "No rubric explanation provided.";
  const nextStep = String(raw.next_step || "").trim();
  const suggestedResponse = String(raw.suggested_response || "").trim();
  const nextAndSuggested =
    `${nextStep ? `Next step: ${nextStep}` : "Next step: not provided."}\n\n` +
    `${suggestedResponse ? `Suggested response: ${suggestedResponse}` : "Suggested response: not provided."}`;

  return {
    score,
    evidenceText,
    rubricExplanation,
    nextAndSuggested,
  };
}

function renderFeedback(feedback) {
  dom.scoreValue.textContent = feedback.score.toFixed(2);
  dom.scoreFill.style.width = `${Math.round(feedback.score * 100)}%`;
  dom.evidenceBox.textContent = feedback.evidenceText;
  dom.explanationBox.textContent = feedback.rubricExplanation;
  dom.suggestionBox.textContent = feedback.nextAndSuggested;
}

function resetFeedback() {
  dom.scoreValue.textContent = "-";
  dom.scoreFill.style.width = "0%";
  dom.evidenceBox.textContent = "No evidence yet.";
  dom.explanationBox.textContent = "No explanation yet.";
  dom.suggestionBox.textContent = "No next step yet.";
}

function clearScenarioOutput() {
  clearClientPrompt();
  resetFeedback();
  updateActionAvailability();
}

function clearClientPrompt() {
  state.latestClientPrompt = "";
  dom.clientPromptBox.textContent = "No client prompt yet. Select an issue and region, then click Generate.";
}

async function callOpenRouter({ apiKey, model, messages, temperature, max_tokens, requireJson }) {
  let { response, payload } = await postToOpenRouter({
    apiKey,
    model,
    messages,
    temperature,
    max_tokens,
    withJsonResponseFormat: requireJson,
  });

  if (!response.ok && requireJson) {
    const firstError = String(payload.error?.message || "").toLowerCase();
    const responseFormatUnsupported =
      firstError.includes("response_format") ||
      firstError.includes("json_object") ||
      firstError.includes("unsupported");

    if (responseFormatUnsupported) {
      ({ response, payload } = await postToOpenRouter({
        apiKey,
        model,
        messages,
        temperature,
        max_tokens,
        withJsonResponseFormat: false,
      }));
    }
  }

  if (!response.ok) {
    const message = payload.error?.message || `OpenRouter request failed (${response.status}).`;
    throw new Error(message);
  }

  let content = extractTextFromPayload(payload);
  if (!content && requireJson) {
    ({ response, payload } = await postToOpenRouter({
      apiKey,
      model,
      messages,
      temperature,
      max_tokens,
      withJsonResponseFormat: false,
    }));
    if (!response.ok) {
      const message = payload.error?.message || `OpenRouter request failed (${response.status}).`;
      throw new Error(message);
    }
    content = extractTextFromPayload(payload);
  }

  if (content) return content;
  throw new Error(`OpenRouter returned no message content. ${buildPayloadHint(payload)}`);
}

async function postToOpenRouter({
  apiKey,
  model,
  messages,
  temperature,
  max_tokens,
  withJsonResponseFormat,
}) {
  const body = {
    model,
    messages,
    temperature,
    max_tokens,
  };

  if (withJsonResponseFormat) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": window.location.href,
      "X-Title": "Reflection Training Lab",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

function extractTextFromPayload(payload) {
  const choice = payload?.choices?.[0] || {};
  const message = choice?.message || {};
  const content = message?.content;

  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const joined = content
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        if (typeof part?.content === "string") return part.content;
        if (part?.json && typeof part.json === "object") return JSON.stringify(part.json);
        return "";
      })
      .join("")
      .trim();
    if (joined) return joined;
  }

  if (content && typeof content === "object") {
    if (typeof content.text === "string" && content.text.trim()) {
      return content.text.trim();
    }
    const asJson = JSON.stringify(content);
    if (asJson && asJson !== "{}") return asJson;
  }

  if (typeof choice?.text === "string" && choice.text.trim()) {
    return choice.text.trim();
  }

  if (Array.isArray(message?.tool_calls)) {
    const args = message.tool_calls
      .map((toolCall) => toolCall?.function?.arguments || "")
      .join("")
      .trim();
    if (args) return args;
  }

  if (typeof message?.reasoning === "string" && message.reasoning.trim()) {
    return message.reasoning.trim();
  }

  return "";
}

function buildPayloadHint(payload) {
  const choice = payload?.choices?.[0] || {};
  const message = choice?.message || {};
  const finishReason = choice?.finish_reason ? `finish_reason=${choice.finish_reason}` : "finish_reason=unknown";
  const messageKeys = Object.keys(message);
  return `(${finishReason}; message_keys=${messageKeys.join(",") || "none"})`;
}

function parseJsonFromResponse(rawText) {
  const direct = tryParseJson(rawText);
  if (direct) return direct;

  const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch) {
    const fenced = tryParseJson(fencedMatch[1]);
    if (fenced) return fenced;
  }

  const firstBrace = rawText.indexOf("{");
  const lastBrace = rawText.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = rawText.slice(firstBrace, lastBrace + 1);
    const partial = tryParseJson(candidate);
    if (partial) return partial;
  }

  throw new Error("Could not parse JSON feedback from model response.");
}

function tryParseJson(text) {
  try {
    return JSON.parse(text.trim());
  } catch {
    return null;
  }
}

function setStatus(message, type = "info") {
  dom.statusBox.textContent = message;
  dom.statusBox.classList.remove("error", "success");
  if (type === "error" || type === "success") {
    dom.statusBox.classList.add(type);
  }
}

function setLoading(isLoading) {
  state.isLoading = isLoading;
  updateActionAvailability();
}

function updateActionAvailability() {
  const hasScenarioSeed =
    Boolean(state.selectedIssue) &&
    Boolean(state.selectedRegion) &&
    Boolean(state.selectedTopic) &&
    Boolean(state.selectedNarrative);
  const hasTraineeText = Boolean(dom.traineeResponse.value.trim());
  const hasRegions = getAvailableRegions().length > 0;

  dom.randomSelectionBtn.disabled = state.isLoading || !state.selectedIssue || !hasRegions;
  dom.generateClientBtn.disabled = state.isLoading || !hasScenarioSeed;
  dom.evaluateBtn.disabled = state.isLoading || !state.latestClientPrompt || !hasTraineeText;
}

function readConfig() {
  return {
    apiKey: dom.apiKeyInput.value.trim(),
    model: dom.modelInput.value.trim(),
  };
}

function maybePersistConfig() {
  if (!dom.rememberToggle.checked) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  const config = readConfig();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      apiKey: config.apiKey,
      model: config.model,
      remember: true,
    }),
  );
}

function loadConfigFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (parsed.apiKey) dom.apiKeyInput.value = parsed.apiKey;
    if (parsed.model) dom.modelInput.value = parsed.model;
    dom.rememberToggle.checked = Boolean(parsed.remember);
  } catch (error) {
    console.warn("Failed to load local config.", error);
  }
}

function formatLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function sample(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
