const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const STORAGE_KEY = "reflection_training_config_v1";

const TOPICS = [
  {
    id: "depression_anxiety",
    label: "Depression/anxiety",
    focus: "low mood, worry, daily functioning, hopelessness, emotional overwhelm",
  },
  {
    id: "fitness_diet_cautionary",
    label: "Fitness/diet - cautionary note",
    focus: "movement, nutrition pressure, guilt language; avoid body shaming",
  },
  { id: "substance_use", label: "Substance use", focus: "ambivalence, coping, relapse risk, shame" },
  { id: "vaccination", label: "Vaccination", focus: "hesitancy, trust, family conflict, fear" },
  {
    id: "domestic_violence",
    label: "Domestic violence",
    focus: "safety concerns, fear, control dynamics, support-seeking",
  },
  { id: "epidemic", label: "Epidemic", focus: "uncertainty, anxiety, grief, social disruption" },
  {
    id: "body_image_acceptance",
    label: "Body image acceptance",
    focus: "self-worth, social pressure, self-criticism, acceptance",
  },
  {
    id: "intuitive_eating",
    label: "Intuitive eating/healthy diet (no shaming)",
    focus: "hunger cues, balanced choices, emotional eating, self-kindness",
  },
  { id: "loneliness", label: "Loneliness", focus: "disconnection, social fear, isolation, belonging needs" },
  {
    id: "sexual_health_education",
    label: "Sexual health/education",
    focus: "boundaries, consent, uncertainty, stigma, questions",
  },
  {
    id: "transition_to_college",
    label: "Transition to college",
    focus: "identity shift, homesickness, stress, academic pressure, independence",
  },
];

const dom = {
  apiKeyInput: document.getElementById("apiKeyInput"),
  modelInput: document.getElementById("modelInput"),
  openrouterFileInput: document.getElementById("openrouterFileInput"),
  rememberToggle: document.getElementById("rememberToggle"),
  topicGrid: document.getElementById("topicGrid"),
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
  selectedTopics: new Set(),
  latestClientPrompt: "",
};

init();

function init() {
  loadConfigFromStorage();
  renderTopicButtons();

  dom.openrouterFileInput.addEventListener("change", handleOpenRouterFile);
  dom.generateClientBtn.addEventListener("click", handleGenerateClientPrompt);
  dom.evaluateBtn.addEventListener("click", handleEvaluateReflection);

  dom.apiKeyInput.addEventListener("input", maybePersistConfig);
  dom.modelInput.addEventListener("input", maybePersistConfig);
  dom.rememberToggle.addEventListener("change", maybePersistConfig);
}

function renderTopicButtons() {
  dom.topicGrid.innerHTML = "";
  TOPICS.forEach((topic) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "topic-btn";
    button.textContent = topic.label;
    button.setAttribute("aria-pressed", "false");
    button.dataset.topicId = topic.id;
    button.addEventListener("click", () => toggleTopic(topic.id, button));
    dom.topicGrid.appendChild(button);
  });
}

function toggleTopic(topicId, button) {
  if (state.selectedTopics.has(topicId)) {
    state.selectedTopics.delete(topicId);
    button.classList.remove("selected");
    button.setAttribute("aria-pressed", "false");
    return;
  }

  state.selectedTopics.add(topicId);
  button.classList.add("selected");
  button.setAttribute("aria-pressed", "true");
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

  const selected = TOPICS.filter((topic) => state.selectedTopics.has(topic.id));
  if (!selected.length) {
    setStatus("Select at least one topic.", "error");
    return;
  }

  setLoading(true);
  setStatus("Generating simulated client prompt...", "info");

  const topicSummary = selected
    .map((topic, idx) => `${idx + 1}. ${topic.label} (focus: ${topic.focus})`)
    .join("\n");

  const messages = [
    {
      role: "system",
      content:
        "You simulate a counseling client for reflection training. Create realistic first-person client speech that reveals emotions, context, and ambivalence. Keep it 100-170 words. Avoid explicit graphic detail. Do not provide counseling advice in the client prompt. Keep language natural and emotionally grounded.",
    },
    {
      role: "user",
      content:
        `Generate one simulated client statement using these selected topics.\n${topicSummary}\n` +
        "Requirements:\n" +
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
  dom.generateClientBtn.disabled = isLoading;
  dom.evaluateBtn.disabled = isLoading;
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
