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

const ANGLE_CONFIG = {
  empathy: {
    label: "Empathy",
    qualityId: "empathyQuality",
    summaryId: "empathySummary",
    rubricsId: "empathyRubrics",
    suggestionId: "empathySuggestion",
  },
  reflection: {
    label: "Reflection",
    qualityId: "reflectionQuality",
    summaryId: "reflectionSummary",
    rubricsId: "reflectionRubrics",
    suggestionId: "reflectionSuggestion",
  },
  open_ended_questions: {
    label: "Open-Ended Questions",
    qualityId: "openQuestionsQuality",
    summaryId: "openQuestionsSummary",
    rubricsId: "openQuestionsRubrics",
    suggestionId: "openQuestionsSuggestion",
  },
  affirmations: {
    label: "Affirmations",
    qualityId: "affirmationsQuality",
    summaryId: "affirmationsSummary",
    rubricsId: "affirmationsRubrics",
    suggestionId: "affirmationsSuggestion",
  },
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
  genderSelect: document.getElementById("genderSelect"),
  ageInput: document.getElementById("ageInput"),
  occupationInput: document.getElementById("occupationInput"),
  severitySelect: document.getElementById("severitySelect"),
  eventInput: document.getElementById("eventInput"),
  goalInput: document.getElementById("goalInput"),
  additionalDetailsInput: document.getElementById("additionalDetailsInput"),
  personaSummary: document.getElementById("personaSummary"),
  startConversationBtn: document.getElementById("startConversationBtn"),
  conversationStatus: document.getElementById("conversationStatus"),
  chatTranscript: document.getElementById("chatTranscript"),
  chatInput: document.getElementById("chatInput"),
  sendMessageBtn: document.getElementById("sendMessageBtn"),
  endConversationBtn: document.getElementById("endConversationBtn"),
  startEvaluationBtn: document.getElementById("startEvaluationBtn"),
  statusBox: document.getElementById("statusBox"),
};

const feedbackDom = Object.fromEntries(
  Object.entries(ANGLE_CONFIG).map(([key, config]) => [
    key,
    {
      quality: document.getElementById(config.qualityId),
      summary: document.getElementById(config.summaryId),
      rubrics: document.getElementById(config.rubricsId),
      suggestion: document.getElementById(config.suggestionId),
    },
  ]),
);

const state = {
  mentalBank: {},
  issueOrder: [],
  regionOrder: [],
  selectedIssue: "",
  selectedRegion: "",
  selectedTopic: "",
  selectedNarrative: "",
  conversation: [],
  conversationStarted: false,
  conversationEnded: false,
  activeProfile: null,
  patientSystemPrompt: "",
  isLoading: false,
};

void init();

async function init() {
  loadConfigFromStorage();
  bindEventListeners();
  resetFeedback();
  renderDraftSummaries();
  renderConversationStatus();
  renderChatTranscript();

  try {
    await loadMentalBank();
    renderIssueButtons();
    renderRegionButtons();
    updateActionAvailability();
    setStatus("Set the concern, region, and profile details, then start the conversation.", "info");
  } catch (error) {
    console.error(error);
    dom.mainIssueGrid.textContent = "Scenario bank failed to load.";
    setStatus("Could not load world_mental_bank.json. Serve the folder with a local web server and try again.", "error");
  }
}

function bindEventListeners() {
  dom.openrouterFileInput.addEventListener("change", handleOpenRouterFile);
  dom.randomSelectionBtn.addEventListener("click", handleRandomSelection);
  dom.startConversationBtn.addEventListener("click", handleStartConversation);
  dom.sendMessageBtn.addEventListener("click", handleSendMessage);
  dom.endConversationBtn.addEventListener("click", handleEndConversation);
  dom.startEvaluationBtn.addEventListener("click", handleStartEvaluation);
  dom.apiKeyInput.addEventListener("input", maybePersistConfig);
  dom.modelInput.addEventListener("input", maybePersistConfig);
  dom.rememberToggle.addEventListener("change", maybePersistConfig);
  dom.chatInput.addEventListener("input", updateActionAvailability);

  [
    dom.genderSelect,
    dom.ageInput,
    dom.occupationInput,
    dom.severitySelect,
    dom.eventInput,
    dom.goalInput,
    dom.additionalDetailsInput,
  ].forEach((element) => {
    element.addEventListener("input", handleProfileDraftChange);
    element.addEventListener("change", handleProfileDraftChange);
  });
}

function handleProfileDraftChange() {
  renderDraftSummaries();
  updateActionAvailability();
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
  updateIssueButtons();
  updateRegionButtons();
  renderDraftSummaries();
  updateActionAvailability();
  setStatus(`Main issue selected: ${formatLabel(issueKey)}. Choose a region or use Random.`, "success");
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
  applyScenarioSeed(region, scenario.topic, scenario.narrative, "region");
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
  applyScenarioSeed(selection.region, selection.topic, selection.narrative, "random");
}

function applyScenarioSeed(region, topic, narrative, source) {
  state.selectedRegion = region;
  state.selectedTopic = topic;
  state.selectedNarrative = narrative;
  dom.eventInput.value = narrative;
  updateRegionButtons();
  renderDraftSummaries();
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
    button.classList.toggle("is-disabled", !isAvailable);
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function getAvailableRegions() {
  if (!state.selectedIssue) return [];
  return Object.keys(state.mentalBank[state.selectedIssue] || {});
}

function buildDraftProfile() {
  return {
    issue: state.selectedIssue,
    region: state.selectedRegion,
    topic: state.selectedTopic,
    narrative: state.selectedNarrative,
    gender: dom.genderSelect.value.trim() || "unspecified",
    age: dom.ageInput.value.trim() || "unspecified",
    occupation: dom.occupationInput.value.trim() || "unspecified",
    severity: dom.severitySelect.value.trim() || "moderate",
    event: dom.eventInput.value.trim() || state.selectedNarrative || "",
    goal: dom.goalInput.value.trim(),
    additionalDetails: dom.additionalDetailsInput.value.trim(),
  };
}

function normalizeProfileForConversation(profile) {
  return {
    ...profile,
    event: profile.event || "ongoing emotional strain",
    goal: profile.goal || "better coping and emotional clarity",
  };
}

function renderDraftSummaries() {
  const profile = buildDraftProfile();
  dom.selectionSummary.textContent = formatScenarioSeedSummary(profile);
  dom.personaSummary.textContent = formatPersonaSummary(profile);
}

function formatScenarioSeedSummary(profile) {
  if (!profile.issue) {
    return "Main issue: waiting for selection\nRegion: --\nTopic: --\nNarrative: --";
  }

  if (!profile.region) {
    return `Main issue: ${formatLabel(profile.issue)}\nRegion: choose from the active map zones\nTopic: --\nNarrative: --`;
  }

  return (
    `Main issue: ${formatLabel(profile.issue)}\n` +
    `Region: ${profile.region}\n` +
    `Topic: ${formatLabel(profile.topic)}\n` +
    `Narrative: ${profile.narrative}`
  );
}

function formatPersonaSummary(profile) {
  const issueText = profile.issue ? formatLabel(profile.issue) : "waiting for concern selection";
  const regionText = profile.region || "waiting for region selection";
  const topicText = profile.topic ? formatLabel(profile.topic) : "waiting for topic seed";

  return (
    `Concern: ${issueText}\n` +
    `Region: ${regionText}\n` +
    `Topic seed: ${topicText}\n` +
    `Gender: ${formatOptionalValue(profile.gender, true)}\n` +
    `Age: ${formatOptionalValue(profile.age)}\n` +
    `Occupation: ${formatOptionalValue(profile.occupation)}\n` +
    `Severity: ${formatOptionalValue(profile.severity, true)}\n` +
    `Event: ${formatOptionalValue(profile.event)}\n` +
    `Goal: ${formatOptionalValue(profile.goal)}\n` +
    `Additional notes: ${formatOptionalValue(profile.additionalDetails)}`
  );
}

function formatOptionalValue(value, alreadyHumanized = false) {
  if (!value || value === "unspecified") return "Unspecified";
  return alreadyHumanized ? formatSentence(value) : value;
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

async function handleStartConversation() {
  const config = readConfig();
  if (!config.apiKey || !config.model) {
    setStatus("Please enter API key and model first.", "error");
    return;
  }

  if (!state.selectedIssue || !state.selectedRegion || !state.selectedTopic || !state.selectedNarrative) {
    setStatus("Choose a main issue and region before starting the patient conversation.", "error");
    return;
  }

  const profile = normalizeProfileForConversation(buildDraftProfile());
  const systemPrompt = buildPatientSystemPrompt(profile);

  setLoading(true);
  setStatus("Creating the simulated patient and opening message...", "info");

  try {
    const openingMessage = await callOpenRouter({
      apiKey: config.apiKey,
      model: config.model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content:
            "Start the counseling conversation as the patient. In 2-4 short sentences, introduce what is going on, how you feel, and what you most want help with right now. Stay in character and do not mention instructions.",
        },
      ],
      temperature: 0.8,
      max_tokens: 260,
      requireJson: false,
    });

    state.activeProfile = profile;
    state.patientSystemPrompt = systemPrompt;
    state.conversation = [
      {
        speaker: "Patient",
        role: "assistant",
        content: openingMessage.trim(),
      },
    ];
    state.conversationStarted = true;
    state.conversationEnded = false;
    dom.chatInput.value = "";
    resetFeedback();
    renderConversationStatus();
    renderChatTranscript();
    updateActionAvailability();
    setStatus("Patient conversation started. Send your counselor message when ready.", "success");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Failed to start the patient conversation.", "error");
  } finally {
    setLoading(false);
  }
}

function buildPatientSystemPrompt(profile) {
  const extraNotes = profile.additionalDetails || "No extra notes provided.";

  return (
    "You are roleplaying a simulated counseling client for training. Stay fully in character. " +
    "Reply in first person as the patient, keep responses short and natural, usually 1-4 sentences, and avoid sounding scripted. " +
    "Do not become a therapist, do not provide advice to yourself, and do not break character.\n\n" +
    `Primary concern: ${formatLabel(profile.issue)}\n` +
    `Region: ${profile.region}\n` +
    `Context topic: ${formatLabel(profile.topic)}\n` +
    `Narrative seed: ${profile.narrative}\n` +
    `Gender: ${profile.gender}\n` +
    `Age: ${profile.age}\n` +
    `Occupation: ${profile.occupation}\n` +
    `Severity: ${profile.severity}\n` +
    `Event: ${profile.event}\n` +
    `Goal: ${profile.goal}\n` +
    `Additional notes: ${extraNotes}\n\n` +
    "Conversation style rules:\n" +
    "- Reveal emotions, stressors, and ambivalence naturally.\n" +
    "- Be consistent with the profile.\n" +
    "- Do not solve the issue quickly.\n" +
    "- If the counselor asks a question, answer as the patient.\n" +
    "- If the counselor reflects, respond as a patient would in a real short chat.\n" +
    "- Avoid long monologues."
  );
}

async function handleSendMessage() {
  const config = readConfig();
  if (!config.apiKey || !config.model) {
    setStatus("Please enter API key and model first.", "error");
    return;
  }

  if (!state.conversationStarted) {
    setStatus("Start a patient conversation first.", "error");
    return;
  }

  if (state.conversationEnded) {
    setStatus("The conversation has ended. Start a new conversation to continue chatting.", "error");
    return;
  }

  const counselorMessage = dom.chatInput.value.trim();
  if (!counselorMessage) {
    setStatus("Type a counselor message before sending.", "error");
    return;
  }

  state.conversation.push({
    speaker: "Counselor",
    role: "user",
    content: counselorMessage,
  });
  dom.chatInput.value = "";
  renderChatTranscript();
  updateActionAvailability();
  setLoading(true);
  setStatus("Patient is replying...", "info");

  try {
    const patientReply = await callOpenRouter({
      apiKey: config.apiKey,
      model: config.model,
      messages: buildConversationMessages(),
      temperature: 0.8,
      max_tokens: 260,
      requireJson: false,
    });

    state.conversation.push({
      speaker: "Patient",
      role: "assistant",
      content: patientReply.trim(),
    });
    renderChatTranscript();
    updateActionAvailability();
    setStatus("Patient replied. Continue the conversation or end it when ready.", "success");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Failed to generate the patient reply.", "error");
  } finally {
    setLoading(false);
  }
}

function buildConversationMessages() {
  const history = state.conversation.slice(-12).map((turn) => ({
    role: turn.role,
    content: turn.content,
  }));

  return [
    {
      role: "system",
      content: state.patientSystemPrompt,
    },
    ...history,
  ];
}

function handleEndConversation() {
  if (!state.conversationStarted) {
    setStatus("There is no conversation to end yet.", "error");
    return;
  }

  if (state.conversationEnded) {
    setStatus("The conversation is already ended. You can start evaluation now.", "success");
    return;
  }

  state.conversationEnded = true;
  renderConversationStatus();
  updateActionAvailability();
  setStatus("Conversation ended. Start evaluation when you are ready.", "success");
}

async function handleStartEvaluation() {
  const config = readConfig();
  if (!config.apiKey || !config.model) {
    setStatus("Please enter API key and model first.", "error");
    return;
  }

  if (!state.conversationStarted) {
    setStatus("Start a conversation before evaluating.", "error");
    return;
  }

  if (!state.conversationEnded) {
    setStatus("End the conversation before starting evaluation.", "error");
    return;
  }

  if (!getCounselorTurns().length) {
    setStatus("Send at least one counselor message before evaluation.", "error");
    return;
  }

  setLoading(true);
  setStatus("Evaluating the full conversation across counseling skill rubrics...", "info");

  const transcript = buildTranscriptText();
  const profile = state.activeProfile || buildDraftProfile();
  const messages = [
    {
      role: "system",
      content:
        "You are an expert counseling skills evaluator. Evaluate only the counselor turns. Return JSON only, with no markdown and no extra keys.",
    },
    {
      role: "user",
      content:
        "Evaluate the conversation across four angles: empathy, reflection, open_ended_questions, and affirmations.\n\n" +
        "Quality levels must be exactly one of: Needs Work, Developing, Effective, Strong.\n\n" +
        "Use these rubrics:\n" +
        "Empathy rubrics:\n" +
        "- Names or validates the patient's emotion.\n" +
        "- Uses a nonjudgmental, supportive tone.\n" +
        "- Stays with the patient's perspective before problem-solving.\n\n" +
        "Reflection rubrics:\n" +
        "- Captures the patient's main meaning or concern.\n" +
        "- Reflects feeling, need, or tension rather than just facts.\n" +
        "- Avoids advice-giving or empty parroting.\n\n" +
        "Open-ended question rubrics:\n" +
        "- Invites elaboration rather than yes/no answers.\n" +
        "- Fits the flow of the conversation rather than interrogating.\n" +
        "- Helps the patient explore meaning, feelings, or goals.\n\n" +
        "Affirmation rubrics:\n" +
        "- Recognizes a strength, effort, value, or resilience.\n" +
        "- Is specific and genuine rather than generic praise.\n" +
        "- Supports autonomy or self-efficacy.\n\n" +
        `Patient profile:\n${formatPersonaSummary(profile)}\n\n` +
        `Conversation transcript:\n${transcript}\n\n` +
        "Return strict JSON with this shape:\n" +
        "{\n" +
        '  "empathy": {\n' +
        '    "quality_level": "Needs Work|Developing|Effective|Strong",\n' +
        '    "summary": string,\n' +
        '    "rubrics": [\n' +
        '      { "criterion": string, "met": boolean, "evidence": string }\n' +
        "    ],\n" +
        '    "suggestion": string\n' +
        "  },\n" +
        '  "reflection": "same structure as empathy",\n' +
        '  "open_ended_questions": "same structure as empathy",\n' +
        '  "affirmations": "same structure as empathy"\n' +
        "}\n\n" +
        "Rules:\n" +
        "- Every angle must include exactly three rubric items.\n" +
        "- Evidence should be short transcript slices or a brief note that evidence is missing.\n" +
        "- Suggestion should explain what to improve next for that angle.",
    },
  ];

  try {
    const rawFeedback = await callOpenRouter({
      apiKey: config.apiKey,
      model: config.model,
      messages,
      temperature: 0.2,
      max_tokens: 1200,
      requireJson: true,
    });

    const parsed = parseJsonFromResponse(rawFeedback);
    renderEvaluationFeedback(parsed);
    setStatus("Evaluation complete.", "success");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Failed to evaluate the conversation.", "error");
  } finally {
    setLoading(false);
  }
}

function buildTranscriptText() {
  return state.conversation
    .map((turn, index) => `${index + 1}. ${turn.speaker}: ${turn.content}`)
    .join("\n");
}

function getCounselorTurns() {
  return state.conversation.filter((turn) => turn.speaker === "Counselor");
}

function renderConversationStatus() {
  if (!state.conversationStarted || !state.activeProfile) {
    dom.conversationStatus.textContent =
      "No active patient conversation yet. Build a profile and click Start Patient Conversation.";
    return;
  }

  const statusText = state.conversationEnded ? "Conversation ended." : "Conversation active.";
  dom.conversationStatus.textContent =
    `${statusText} Active patient: ${formatLabel(state.activeProfile.issue)} in ${state.activeProfile.region}, ` +
    `${formatSentence(state.activeProfile.severity)} severity, event: ${state.activeProfile.event}.`;
}

function renderChatTranscript() {
  dom.chatTranscript.innerHTML = "";

  if (!state.conversation.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "chat-empty";
    emptyState.textContent = "No conversation yet.";
    dom.chatTranscript.appendChild(emptyState);
    return;
  }

  state.conversation.forEach((turn) => {
    const message = document.createElement("div");
    message.className = `chat-message ${turn.speaker === "Counselor" ? "counselor" : "patient"}`;

    const role = document.createElement("p");
    role.className = "chat-role";
    role.textContent = turn.speaker;

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.textContent = turn.content;

    message.appendChild(role);
    message.appendChild(bubble);
    dom.chatTranscript.appendChild(message);
  });

  dom.chatTranscript.scrollTop = dom.chatTranscript.scrollHeight;
}

function renderEvaluationFeedback(rawPayload) {
  const payload = rawPayload.angles && typeof rawPayload.angles === "object" ? rawPayload.angles : rawPayload;

  Object.keys(ANGLE_CONFIG).forEach((angleKey) => {
    const normalized = normalizeAngleFeedback(payload[angleKey]);
    const angleDom = feedbackDom[angleKey];

    setQualityChip(angleDom.quality, normalized.qualityLevel);
    angleDom.summary.textContent = normalized.summary;
    angleDom.suggestion.textContent = normalized.suggestion;
    renderRubricList(angleDom.rubrics, normalized.rubrics);
  });
}

function normalizeAngleFeedback(rawAngle) {
  const safeAngle = rawAngle && typeof rawAngle === "object" ? rawAngle : {};
  const qualityLevel = String(safeAngle.quality_level || "Needs Work").trim() || "Needs Work";
  const summary = String(safeAngle.summary || "No summary provided.").trim() || "No summary provided.";
  const suggestion = String(safeAngle.suggestion || "No suggestion provided.").trim() || "No suggestion provided.";
  const rawRubrics = Array.isArray(safeAngle.rubrics) ? safeAngle.rubrics : [];
  const rubrics = rawRubrics.slice(0, 3).map((rubric) => ({
    criterion: String(rubric.criterion || "Unnamed rubric").trim() || "Unnamed rubric",
    met: Boolean(rubric.met),
    evidence: String(rubric.evidence || "No evidence provided.").trim() || "No evidence provided.",
  }));

  return {
    qualityLevel,
    summary,
    suggestion,
    rubrics,
  };
}

function setQualityChip(element, qualityLevel) {
  element.textContent = qualityLevel;
  element.className = "quality-chip";
  element.classList.add(`level-${slugifyQualityLevel(qualityLevel)}`);
}

function slugifyQualityLevel(qualityLevel) {
  const mapping = {
    strong: "strong",
    effective: "effective",
    developing: "developing",
    "needs work": "needs-work",
    "not evaluated": "neutral",
  };

  const lowered = String(qualityLevel || "").trim().toLowerCase();
  return mapping[lowered] || "neutral";
}

function renderRubricList(container, rubrics) {
  container.innerHTML = "";

  if (!rubrics.length) {
    container.textContent = "No rubric details yet.";
    return;
  }

  rubrics.forEach((rubric) => {
    const item = document.createElement("div");
    item.className = "rubric-item";

    const title = document.createElement("p");
    title.className = "rubric-title";
    title.textContent = rubric.criterion;

    const status = document.createElement("p");
    status.className = `rubric-status ${rubric.met ? "met" : "not-met"}`;
    status.textContent = rubric.met ? "Satisfied" : "Not satisfied";

    const evidence = document.createElement("p");
    evidence.className = "rubric-evidence";
    evidence.textContent = `Evidence: ${rubric.evidence}`;

    item.appendChild(title);
    item.appendChild(status);
    item.appendChild(evidence);
    container.appendChild(item);
  });
}

function resetFeedback() {
  Object.keys(ANGLE_CONFIG).forEach((angleKey) => {
    const angle = feedbackDom[angleKey];
    setQualityChip(angle.quality, "Not evaluated");
    angle.summary.textContent = "Start an evaluation to see the quality classification.";
    angle.rubrics.textContent = "No rubric details yet.";
    angle.suggestion.textContent = "No suggestions yet.";
  });
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
  const hasChatInput = Boolean(dom.chatInput.value.trim());
  const hasCounselorTurns = getCounselorTurns().length > 0;
  const hasAvailableRegions = getAvailableRegions().length > 0;

  dom.randomSelectionBtn.disabled = state.isLoading || !state.selectedIssue || !hasAvailableRegions;
  dom.startConversationBtn.disabled = state.isLoading || !hasScenarioSeed;
  dom.sendMessageBtn.disabled = state.isLoading || !state.conversationStarted || state.conversationEnded || !hasChatInput;
  dom.endConversationBtn.disabled = state.isLoading || !state.conversationStarted || state.conversationEnded;
  dom.startEvaluationBtn.disabled =
    state.isLoading || !state.conversationStarted || !state.conversationEnded || !hasCounselorTurns;
  dom.chatInput.disabled = state.isLoading || !state.conversationStarted || state.conversationEnded;
  dom.startConversationBtn.textContent = state.conversationStarted ? "Start New Patient Conversation" : "Start Patient Conversation";
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

function formatSentence(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function sample(items) {
  return items[Math.floor(Math.random() * items.length)];
}
