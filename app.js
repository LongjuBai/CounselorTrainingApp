const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const STORAGE_KEY = 'reflection_training_config_v1';
const MENTAL_BANK_URL = './world_mental_bank.json';

const ANGLE_CONFIG = {
  empathy: {
    label: 'Empathy',
    qualityId: 'empathyQuality',
    summaryId: 'empathySummary',
    rubricsId: 'empathyRubrics',
  },
  reflection: {
    label: 'Reflection',
    qualityId: 'reflectionQuality',
    summaryId: 'reflectionSummary',
    rubricsId: 'reflectionRubrics',
  },
  open_ended_questions: {
    label: 'Open-Ended Questions',
    qualityId: 'openQuestionsQuality',
    summaryId: 'openQuestionsSummary',
    rubricsId: 'openQuestionsRubrics',
  },
  affirmations: {
    label: 'Affirmations',
    qualityId: 'affirmationsQuality',
    summaryId: 'affirmationsSummary',
    rubricsId: 'affirmationsRubrics',
  },
};

const PROFILE_ESSENTIALS = [
  {
    key: 'issue',
    label: 'main issue',
    isFilled: (profile) => Boolean(profile.issue),
    missingText: 'Choose the main concern to anchor the patient.',
    filledText: (profile) => `Selected concern: ${formatLabel(profile.issue)}.`,
  },
  {
    key: 'gender',
    label: 'gender',
    isFilled: (profile) => profile.gender !== 'unspecified',
    missingText: 'Pick a gender if you want the patient voice to feel more specific.',
    filledText: (profile) => `Gender set to ${formatSentence(profile.gender)}.`,
  },
  {
    key: 'age',
    label: 'age',
    isFilled: (profile) => Boolean(profile.age),
    missingText: 'Add an age so the patient voice and life stage feel more believable.',
    filledText: (profile) => `Age set to ${profile.age}.`,
  },
  {
    key: 'occupation',
    label: 'occupation',
    isFilled: (profile) => Boolean(profile.occupation),
    missingText: 'Add school, work, or daily-role context to ground the patient.',
    filledText: (profile) => `Occupation set to ${profile.occupation}.`,
  },
  {
    key: 'event',
    label: 'event',
    isFilled: (profile) => Boolean(profile.event),
    missingText: 'Add the event or current stressor the patient is bringing into session.',
    filledText: (profile) => `Current stressor: ${profile.event}.`,
  },
  {
    key: 'goal',
    label: 'goal',
    isFilled: (profile) => Boolean(profile.goal),
    missingText: 'Add what the patient hopes will improve or feel different.',
    filledText: (profile) => `Current goal: ${profile.goal}.`,
  },
];

const REQUIRED_PROFILE_KEYS = ['issue', 'event', 'goal'];

const dom = {
  apiKeyInput: document.getElementById('apiKeyInput'),
  modelInput: document.getElementById('modelInput'),
  openrouterFileInput: document.getElementById('openrouterFileInput'),
  rememberToggle: document.getElementById('rememberToggle'),
  mainIssueGrid: document.getElementById('mainIssueGrid'),
  completionBadge: document.getElementById('completionBadge'),
  completionHint: document.getElementById('completionHint'),
  issueHint: document.getElementById('issueHint'),
  genderSelect: document.getElementById('genderSelect'),
  genderHint: document.getElementById('genderHint'),
  ageInput: document.getElementById('ageInput'),
  ageHint: document.getElementById('ageHint'),
  occupationInput: document.getElementById('occupationInput'),
  occupationHint: document.getElementById('occupationHint'),
  severitySelect: document.getElementById('severitySelect'),
  severityHint: document.getElementById('severityHint'),
  eventInput: document.getElementById('eventInput'),
  eventHint: document.getElementById('eventHint'),
  goalInput: document.getElementById('goalInput'),
  goalHint: document.getElementById('goalHint'),
  additionalDetailsInput: document.getElementById('additionalDetailsInput'),
  notesHint: document.getElementById('notesHint'),
  personaSummary: document.getElementById('personaSummary'),
  profileChecklist: document.getElementById('profileChecklist'),
  startConversationBtn: document.getElementById('startConversationBtn'),
  conversationStatus: document.getElementById('conversationStatus'),
  chatTranscript: document.getElementById('chatTranscript'),
  chatInput: document.getElementById('chatInput'),
  sendMessageBtn: document.getElementById('sendMessageBtn'),
  endConversationBtn: document.getElementById('endConversationBtn'),
  startEvaluationBtn: document.getElementById('startEvaluationBtn'),
  combinedSuggestions: document.getElementById('combinedSuggestions'),
  statusBadge: document.getElementById('statusBadge'),
  statusTitle: document.getElementById('statusTitle'),
  statusMessage: document.getElementById('statusMessage'),
  statusBox: document.getElementById('statusBox'),
};

const feedbackDom = Object.fromEntries(
  Object.entries(ANGLE_CONFIG).map(([key, config]) => [
    key,
    {
      quality: document.getElementById(config.qualityId),
      summary: document.getElementById(config.summaryId),
      rubrics: document.getElementById(config.rubricsId),
    },
  ]),
);

const state = {
  mentalBank: {},
  issueOrder: [],
  selectedIssue: '',
  conversation: [],
  conversationStarted: false,
  conversationEnded: false,
  activeProfile: null,
  patientSystemPrompt: '',
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
    updateActionAvailability();
    setStatus('Pick a concern and fill the patient profile, then start the conversation.', 'info', 'Ready');
  } catch (error) {
    console.error(error);
    dom.mainIssueGrid.textContent = 'Issue bank failed to load.';
    setStatus('Could not load world_mental_bank.json. Serve the folder with a local web server and try again.', 'error', 'Setup Error');
  }
}

function bindEventListeners() {
  dom.openrouterFileInput.addEventListener('change', handleOpenRouterFile);
  dom.startConversationBtn.addEventListener('click', handleStartConversation);
  dom.sendMessageBtn.addEventListener('click', handleSendMessage);
  dom.endConversationBtn.addEventListener('click', handleEndConversation);
  dom.startEvaluationBtn.addEventListener('click', handleStartEvaluation);
  dom.apiKeyInput.addEventListener('input', maybePersistConfig);
  dom.modelInput.addEventListener('input', maybePersistConfig);
  dom.rememberToggle.addEventListener('change', maybePersistConfig);
  dom.chatInput.addEventListener('input', updateActionAvailability);

  [
    dom.genderSelect,
    dom.ageInput,
    dom.occupationInput,
    dom.severitySelect,
    dom.eventInput,
    dom.goalInput,
    dom.additionalDetailsInput,
  ].forEach((element) => {
    element.addEventListener('input', handleProfileDraftChange);
    element.addEventListener('change', handleProfileDraftChange);
  });
}

function handleProfileDraftChange() {
  renderDraftSummaries();
  updateActionAvailability();
}

async function loadMentalBank() {
  const response = await fetch(MENTAL_BANK_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load issue bank (${response.status}).`);
  }

  const mentalBank = await response.json();
  state.mentalBank = mentalBank;
  state.issueOrder = Object.keys(mentalBank || {});
}

function renderIssueButtons() {
  dom.mainIssueGrid.innerHTML = '';
  state.issueOrder.forEach((issueKey) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'issue-chip';
    button.textContent = formatLabel(issueKey);
    button.setAttribute('aria-pressed', 'false');
    button.dataset.issueKey = issueKey;
    button.addEventListener('click', () => handleIssueSelect(issueKey));
    dom.mainIssueGrid.appendChild(button);
  });
}

function handleIssueSelect(issueKey) {
  state.selectedIssue = issueKey;
  updateIssueButtons();
  renderDraftSummaries();
  updateActionAvailability();
  setStatus(`Main issue selected: ${formatLabel(issueKey)}. Finish the patient profile when ready.`, 'success');
}

function updateIssueButtons() {
  const issueButtons = dom.mainIssueGrid.querySelectorAll('.issue-chip');
  issueButtons.forEach((button) => {
    const isActive = button.dataset.issueKey === state.selectedIssue;
    button.classList.toggle('selected', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function buildDraftProfile() {
  return {
    issue: state.selectedIssue,
    gender: dom.genderSelect.value.trim() || 'unspecified',
    age: dom.ageInput.value.trim(),
    occupation: dom.occupationInput.value.trim(),
    severity: dom.severitySelect.value.trim() || 'moderate',
    event: dom.eventInput.value.trim(),
    goal: dom.goalInput.value.trim(),
    additionalDetails: dom.additionalDetailsInput.value.trim(),
  };
}

function normalizeProfileForConversation(profile) {
  return {
    issue: profile.issue || 'general distress',
    gender: profile.gender || 'unspecified',
    age: profile.age || 'adult',
    occupation: profile.occupation || 'not specified',
    severity: profile.severity || 'moderate',
    event: profile.event || 'ongoing emotional strain',
    goal: profile.goal || 'better coping and emotional clarity',
    additionalDetails: profile.additionalDetails || '',
  };
}

function getProfileCompleteness(profile) {
  const essentials = PROFILE_ESSENTIALS.map((entry) => ({
    key: entry.key,
    label: entry.label,
    filled: entry.isFilled(profile),
    missingText: entry.missingText,
    filledText: typeof entry.filledText === 'function' ? entry.filledText(profile) : entry.filledText,
  }));
  const completedCount = essentials.filter((entry) => entry.filled).length;
  const missing = essentials.filter((entry) => !entry.filled);
  const missingRequired = REQUIRED_PROFILE_KEYS.filter((key) => {
    const essential = essentials.find((entry) => entry.key === key);
    return !essential?.filled;
  });

  return {
    essentials,
    completedCount,
    missing,
    missingRequired,
    readyToStart: missingRequired.length === 0,
  };
}

function renderDraftSummaries() {
  const profile = buildDraftProfile();
  const completeness = getProfileCompleteness(profile);

  renderPersonaSummary(profile);
  dom.completionBadge.textContent = `${completeness.completedCount} / ${completeness.essentials.length} essentials filled`;
  dom.completionHint.textContent = buildCompletionHint(completeness);

  renderProfileHints(profile, completeness);
  renderProfileChecklist(profile);
}

function renderPersonaSummary(profile) {
  const rows = [
    {
      label: 'Main issue',
      value: profile.issue ? formatLabel(profile.issue) : 'Not selected yet',
      placeholder: !profile.issue,
    },
    {
      label: 'Identity',
      value: [
        profile.gender !== 'unspecified' ? formatSentence(profile.gender) : 'Gender not set',
        profile.age ? `${profile.age} years old` : 'Age not set',
        profile.occupation || 'Occupation not set',
      ],
      tags: true,
    },
    {
      label: 'Severity',
      value: formatSentence(profile.severity || 'moderate'),
    },
    {
      label: 'Current event',
      value: profile.event || "Add the patient's current stressor or event.",
      placeholder: !profile.event,
    },
    {
      label: 'Goal',
      value: profile.goal || 'Add what the patient wants help with.',
      placeholder: !profile.goal,
    },
    {
      label: 'Additional notes',
      value: profile.additionalDetails || 'No extra notes yet.',
      placeholder: !profile.additionalDetails,
    },
  ];

  dom.personaSummary.innerHTML = '';

  rows.forEach((row) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'snapshot-row';

    const label = document.createElement('p');
    label.className = 'snapshot-label';
    label.textContent = row.label;

    const valueContainer = document.createElement('div');
    valueContainer.className = 'snapshot-value';
    if (row.placeholder) {
      valueContainer.classList.add('is-placeholder');
    }

    if (row.tags) {
      valueContainer.classList.add('snapshot-tags');
      row.value.forEach((itemText) => {
        const tag = document.createElement('span');
        tag.className = 'snapshot-tag';
        tag.textContent = itemText;
        valueContainer.appendChild(tag);
      });
    } else {
      valueContainer.textContent = row.value;
    }

    wrapper.appendChild(label);
    wrapper.appendChild(valueContainer);
    dom.personaSummary.appendChild(wrapper);
  });
}

function buildCompletionHint(completeness) {
  if (!completeness.completedCount) {
    return 'Choose a main issue and add a few core details to shape the patient.';
  }

  if (completeness.missing.length) {
    const labels = completeness.missing.slice(0, 3).map((entry) => entry.label);
    return `Strongest next fills: ${labels.join(', ')}.`;
  }

  return 'Profile looks grounded. You can start the conversation or add optional notes for more nuance.';
}

function renderProfileHints(profile, completeness) {
  const essentialsByKey = Object.fromEntries(completeness.essentials.map((entry) => [entry.key, entry]));

  applyHintState(dom.issueHint, essentialsByKey.issue);
  applyHintState(dom.genderHint, essentialsByKey.gender);
  applyHintState(dom.ageHint, essentialsByKey.age);
  applyHintState(dom.occupationHint, essentialsByKey.occupation);
  applyHintState(dom.eventHint, essentialsByKey.event);
  applyHintState(dom.goalHint, essentialsByKey.goal);

  setStaticHint(dom.severityHint, `Severity set to ${formatSentence(profile.severity)}.`);
  setStaticHint(
    dom.notesHint,
    profile.additionalDetails
      ? 'Additional notes added. The patient will carry this nuance into the chat.'
      : 'Optional. Use this for tone, history, cultural context, or anything nuanced.',
  );
}

function applyHintState(element, entry) {
  const text = entry.filled ? entry.filledText : entry.missingText;
  element.textContent = text;
  element.classList.toggle('is-missing', !entry.filled);

  const field = element.closest('.form-field');
  if (field) {
    field.classList.toggle('needs-input', !entry.filled);
  }
}

function setStaticHint(element, text) {
  element.textContent = text;
  element.classList.remove('is-missing');

  const field = element.closest('.form-field');
  if (field) {
    field.classList.remove('needs-input');
  }
}

function renderProfileChecklist(profile) {
  dom.profileChecklist.innerHTML = '';

  const checklistItems = [];

  if (!profile.issue) {
    checklistItems.push('Choose a main issue so the patient has a clear presenting concern.');
  }
  if (!profile.event) {
    checklistItems.push('Describe the current event or stressor the patient is reacting to.');
  }
  if (!profile.goal) {
    checklistItems.push('Add what the patient wants help with or hopes will improve.');
  }
  if (!profile.age) {
    checklistItems.push('Add an age so the patient voice matches a believable life stage.');
  }
  if (!profile.occupation) {
    checklistItems.push('Add work, school, or caregiving context to make the story more specific.');
  }
  if (profile.gender === 'unspecified') {
    checklistItems.push('Optional: choose a gender if you want the persona to feel more specific.');
  }
  if (!profile.additionalDetails) {
    checklistItems.push('Optional: add extra notes if you want more cultural, relational, or personality nuance.');
  }

  const itemsToRender = checklistItems.length
    ? checklistItems
    : ['Everything important is filled. You can start the conversation whenever you are ready.'];

  itemsToRender.forEach((itemText) => {
    const item = document.createElement('li');
    item.textContent = itemText;
    if (!checklistItems.length) {
      item.classList.add('checklist-success');
    }
    dom.profileChecklist.appendChild(item);
  });
}

function formatPersonaSummary(profile) {
  const concern = profile.issue ? formatLabel(profile.issue) : 'Not selected yet';
  const gender = profile.gender !== 'unspecified' ? formatSentence(profile.gender) : 'Not set';
  const age = profile.age || 'Not set';
  const occupation = profile.occupation || 'Not set';
  const severity = formatSentence(profile.severity || 'moderate');
  const event = profile.event || "Add the patient's current stressor or event.";
  const goal = profile.goal || 'Add what the patient wants help with.';
  const notes = profile.additionalDetails || 'No extra notes yet.';

  return [
    `Main issue: ${concern}`,
    `Identity: ${gender} • ${age} • ${occupation}`,
    `Severity: ${severity}`,
    `Current event: ${event}`,
    `Goal: ${goal}`,
    `Additional notes: ${notes}`,
  ].join('\n');
}

function getMissingRequiredLabels(profile) {
  return REQUIRED_PROFILE_KEYS.filter((key) => {
    if (key === 'issue') return !profile.issue;
    return !String(profile[key] || '').trim();
  }).map((key) => PROFILE_ESSENTIALS.find((entry) => entry.key === key)?.label || key);
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
    setStatus('Loaded API key and model from file.', 'success', 'Config Loaded');
  } catch (error) {
    console.error(error);
    setStatus('Could not parse the selected file. Check that it contains a valid model name and API key.', 'error', 'File Error');
  } finally {
    dom.openrouterFileInput.value = '';
  }
}

function parseOpenRouterText(rawText) {
  const modelMatch = rawText.match(/model\s*name\s*:\s*(.+)/i);
  const keyMatch = rawText.match(/api\s*key\s*:\s*(.+)/i);
  const bareKey = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith('sk-or-'));

  return {
    model: modelMatch ? modelMatch[1].trim() : '',
    apiKey: keyMatch ? keyMatch[1].trim() : bareKey || '',
  };
}

async function handleStartConversation() {
  const config = readConfig();
  if (!config.apiKey || !config.model) {
    setStatus('Please enter API key and model first.', 'error', 'Missing Config');
    return;
  }

  const draftProfile = buildDraftProfile();
  const missingRequired = getMissingRequiredLabels(draftProfile);
  if (missingRequired.length) {
    renderDraftSummaries();
    setStatus(`Fill these profile fields before starting: ${missingRequired.join(', ')}.`, 'error', 'Missing Profile Info');
    return;
  }

  const profile = normalizeProfileForConversation(draftProfile);
  const systemPrompt = buildPatientSystemPrompt(profile);

  setLoading(true);
  setStatus('Creating the simulated patient and drafting the opening message...', 'info', 'Generating Patient');

  try {
    const openingMessage = await callOpenRouter({
      apiKey: config.apiKey,
      model: config.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content:
            'Start the counseling conversation as the patient. In 2-4 short sentences, introduce what is going on, how you feel, and what you most want help with right now. Stay in character and do not mention instructions.',
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
        speaker: 'Patient',
        role: 'assistant',
        content: openingMessage.trim(),
      },
    ];
    state.conversationStarted = true;
    state.conversationEnded = false;
    dom.chatInput.value = '';
    resetFeedback();
    renderConversationStatus();
    renderChatTranscript();
    updateActionAvailability();
    setStatus('Patient conversation started. Send your counselor message when ready.', 'success', 'Patient Ready');
  } catch (error) {
    console.error(error);
    setStatus(formatRuntimeError(error, 'Failed to start the patient conversation.'), 'error', 'Generation Error');
  } finally {
    setLoading(false);
  }
}

function buildPatientSystemPrompt(profile) {
  const extraNotes = profile.additionalDetails || 'No extra notes provided.';

  return (
    'You are roleplaying a simulated counseling client for training. Stay fully in character. ' +
    'Reply in first person as the patient, keep responses short and natural, usually 1-4 sentences, and avoid sounding scripted. ' +
    'Do not become a therapist, do not provide advice to yourself, and do not break character.\n\n' +
    `Primary concern: ${formatLabel(profile.issue)}\n` +
    `Gender: ${formatSentence(profile.gender)}\n` +
    `Age: ${profile.age}\n` +
    `Occupation: ${profile.occupation}\n` +
    `Severity: ${profile.severity}\n` +
    `Current event: ${profile.event}\n` +
    `Goal: ${profile.goal}\n` +
    `Additional notes: ${extraNotes}\n\n` +
    'Conversation style rules:\n' +
    '- Reveal emotions, stressors, and ambivalence naturally.\n' +
    '- Be consistent with the profile.\n' +
    '- Do not solve the issue quickly.\n' +
    '- If the counselor asks a question, answer as the patient.\n' +
    '- If the counselor reflects, respond the way a real patient would in a short chat.\n' +
    '- Avoid long monologues.'
  );
}

async function handleSendMessage() {
  const config = readConfig();
  if (!config.apiKey || !config.model) {
    setStatus('Please enter API key and model first.', 'error', 'Missing Config');
    return;
  }

  if (!state.conversationStarted) {
    setStatus('Start a patient conversation first.', 'error', 'No Active Chat');
    return;
  }

  if (state.conversationEnded) {
    setStatus('The conversation has ended. Start a new conversation to continue chatting.', 'error', 'Chat Closed');
    return;
  }

  const counselorMessage = dom.chatInput.value.trim();
  if (!counselorMessage) {
    setStatus('Type a counselor message before sending.', 'error', 'Empty Message');
    return;
  }

  state.conversation.push({
    speaker: 'Counselor',
    role: 'user',
    content: counselorMessage,
  });
  dom.chatInput.value = '';
  renderChatTranscript();
  updateActionAvailability();
  setLoading(true);
  setStatus('The simulated patient is generating a reply...', 'info', 'Generating Reply');

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
      speaker: 'Patient',
      role: 'assistant',
      content: patientReply.trim(),
    });
    renderChatTranscript();
    updateActionAvailability();
    setStatus('Patient replied. Continue the conversation or end it when ready.', 'success', 'Reply Received');
  } catch (error) {
    console.error(error);
    setStatus(formatRuntimeError(error, 'Failed to generate the patient reply.'), 'error', 'Reply Error');
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
      role: 'system',
      content: state.patientSystemPrompt,
    },
    ...history,
  ];
}

function handleEndConversation() {
  if (!state.conversationStarted) {
    setStatus('There is no conversation to end yet.', 'error', 'No Active Chat');
    return;
  }

  if (state.conversationEnded) {
    setStatus('The conversation is already ended. You can start evaluation now.', 'success', 'Already Ended');
    return;
  }

  state.conversationEnded = true;
  renderConversationStatus();
  updateActionAvailability();
  setStatus('Conversation ended. Start evaluation when you are ready.', 'success', 'Conversation Closed');
}

async function handleStartEvaluation() {
  const config = readConfig();
  if (!config.apiKey || !config.model) {
    setStatus('Please enter API key and model first.', 'error', 'Missing Config');
    return;
  }

  if (!state.conversationStarted) {
    setStatus('Start a conversation before evaluating.', 'error', 'No Conversation');
    return;
  }

  if (!state.conversationEnded) {
    setStatus('End the conversation before starting evaluation.', 'error', 'Conversation Still Open');
    return;
  }

  if (!getCounselorTurns().length) {
    setStatus('Send at least one counselor message before evaluation.', 'error', 'Nothing To Evaluate');
    return;
  }

  setLoading(true);
  setStatus('Evaluating the full conversation across empathy, reflection, questions, and affirmations...', 'info', 'Running Evaluation');

  const transcript = buildTranscriptText();
  const profile = state.activeProfile || normalizeProfileForConversation(buildDraftProfile());
  const messages = [
    {
      role: 'system',
      content:
        'You are an expert counseling skills evaluator. Evaluate only the counselor turns. Return JSON only, with no markdown and no extra keys.',
    },
    {
      role: 'user',
      content:
        'Evaluate the conversation across four angles: empathy, reflection, open_ended_questions, and affirmations.\n\n' +
        'Quality levels must be exactly one of: Needs Work, Developing, Effective, Strong.\n\n' +
        'Use these rubrics:\n' +
        'Empathy rubrics:\n' +
        "- Names or validates the patient's emotion.\n" +
        '- Uses a nonjudgmental, supportive tone.\n' +
        "- Stays with the patient's perspective before problem-solving.\n\n" +
        'Reflection rubrics:\n' +
        "- Captures the patient's main meaning or concern.\n" +
        '- Reflects feeling, need, or tension rather than just facts.\n' +
        '- Avoids advice-giving or empty parroting.\n\n' +
        'Open-ended question rubrics:\n' +
        '- Invites elaboration rather than yes/no answers.\n' +
        '- Fits the flow of the conversation rather than interrogating.\n' +
        '- Helps the patient explore meaning, feelings, or goals.\n\n' +
        'Affirmation rubrics:\n' +
        '- Recognizes a strength, effort, value, or resilience.\n' +
        '- Is specific and genuine rather than generic praise.\n' +
        '- Supports autonomy or self-efficacy.\n\n' +
        `Patient profile:\n${formatPersonaSummary(profile)}\n\n` +
        `Conversation transcript:\n${transcript}\n\n` +
        'Return strict JSON with this shape:\n' +
        '{\n' +
        '  "empathy": {\n' +
        '    "quality_level": "Needs Work|Developing|Effective|Strong",\n' +
        '    "summary": string,\n' +
        '    "rubrics": [\n' +
        '      { "criterion": string, "met": boolean, "evidence": string }\n' +
        '    ]\n' +
        '  },\n' +
        '  "reflection": "same structure as empathy",\n' +
        '  "open_ended_questions": "same structure as empathy",\n' +
        '  "affirmations": "same structure as empathy",\n' +
        '  "combined_suggestions": [string, string, string]\n' +
        '}\n\n' +
        'Rules:\n' +
        '- Every angle must include exactly three rubric items.\n' +
        '- Evidence should be short transcript slices or a brief note that evidence is missing.\n' +
        '- combined_suggestions must synthesize across angles rather than repeating one angle at a time.\n' +
        '- combined_suggestions should contain 3 concise coaching suggestions.\n' +
        '- Do not include markdown.',
    },
  ];

  try {
    const rawFeedback = await callOpenRouter({
      apiKey: config.apiKey,
      model: config.model,
      messages,
      temperature: 0.2,
      max_tokens: 1400,
      requireJson: true,
    });

    const parsed = parseJsonFromResponse(rawFeedback);
    renderEvaluationFeedback(parsed);
    setStatus('Evaluation complete. Open any factor card to review the rubric details and evidence.', 'success', 'Evaluation Ready');
  } catch (error) {
    console.error(error);
    setStatus(formatRuntimeError(error, 'Failed to evaluate the conversation.'), 'error', 'Evaluation Error');
  } finally {
    setLoading(false);
  }
}

function buildTranscriptText() {
  return state.conversation
    .map((turn, index) => `${index + 1}. ${turn.speaker}: ${turn.content}`)
    .join('\n');
}

function getCounselorTurns() {
  return state.conversation.filter((turn) => turn.speaker === 'Counselor');
}

function renderConversationStatus() {
  if (!state.conversationStarted || !state.activeProfile) {
    dom.conversationStatus.textContent =
      'No active patient conversation yet. Build a profile and click Start Patient Conversation.';
    return;
  }

  const statusText = state.conversationEnded ? 'Conversation ended.' : 'Conversation active.';
  const ageText = state.activeProfile.age ? `${state.activeProfile.age}` : 'age unspecified';
  dom.conversationStatus.textContent =
    `${statusText} ${formatLabel(state.activeProfile.issue)}, ${formatSentence(state.activeProfile.severity)} intensity, ` +
    `${ageText}, ${state.activeProfile.occupation}, current event: ${state.activeProfile.event}.`;
}

function renderChatTranscript() {
  dom.chatTranscript.innerHTML = '';

  if (!state.conversation.length) {
    const emptyState = document.createElement('div');
    emptyState.className = 'chat-empty';
    emptyState.textContent = 'No conversation yet.';
    dom.chatTranscript.appendChild(emptyState);
    return;
  }

  state.conversation.forEach((turn) => {
    const message = document.createElement('div');
    const isCounselor = turn.speaker === 'Counselor';
    message.className = `chat-message ${isCounselor ? 'counselor' : 'patient'}`;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';

    const content = document.createElement('p');
    content.className = 'chat-text';
    content.textContent = turn.content;

    const meta = document.createElement('p');
    meta.className = 'chat-meta';
    meta.textContent = turn.speaker;

    bubble.appendChild(content);
    bubble.appendChild(meta);
    message.appendChild(bubble);
    dom.chatTranscript.appendChild(message);
  });

  dom.chatTranscript.scrollTop = dom.chatTranscript.scrollHeight;
}

function renderEvaluationFeedback(rawPayload) {
  const payload = rawPayload.angles && typeof rawPayload.angles === 'object' ? rawPayload.angles : rawPayload;

  Object.keys(ANGLE_CONFIG).forEach((angleKey) => {
    const normalized = normalizeAngleFeedback(payload[angleKey]);
    const angleDom = feedbackDom[angleKey];

    setQualityChip(angleDom.quality, normalized.qualityLevel);
    angleDom.summary.textContent = normalized.summary;
    renderRubricList(angleDom.rubrics, normalized.rubrics);
  });

  dom.combinedSuggestions.textContent = normalizeCombinedSuggestions(
    rawPayload.combined_suggestions || payload.combined_suggestions,
  );
}

function normalizeAngleFeedback(rawAngle) {
  const safeAngle = rawAngle && typeof rawAngle === 'object' ? rawAngle : {};
  const qualityLevel = String(safeAngle.quality_level || 'Needs Work').trim() || 'Needs Work';
  const summary = String(safeAngle.summary || 'No summary provided.').trim() || 'No summary provided.';
  const rawRubrics = Array.isArray(safeAngle.rubrics) ? safeAngle.rubrics : [];
  const rubrics = rawRubrics.slice(0, 3).map((rubric) => ({
    criterion: String(rubric.criterion || 'Unnamed rubric').trim() || 'Unnamed rubric',
    met: Boolean(rubric.met),
    evidence: String(rubric.evidence || 'No evidence provided.').trim() || 'No evidence provided.',
  }));

  return {
    qualityLevel,
    summary,
    rubrics,
  };
}

function normalizeCombinedSuggestions(rawSuggestions) {
  if (Array.isArray(rawSuggestions) && rawSuggestions.length) {
    return rawSuggestions
      .map((suggestion, index) => `${index + 1}. ${String(suggestion).trim()}`)
      .join('\n');
  }

  if (typeof rawSuggestions === 'string' && rawSuggestions.trim()) {
    return rawSuggestions.trim();
  }

  return 'No suggestions yet.';
}

function setQualityChip(element, qualityLevel) {
  element.textContent = qualityLevel;
  element.className = 'quality-chip';
  element.classList.add(`level-${slugifyQualityLevel(qualityLevel)}`);
}

function slugifyQualityLevel(qualityLevel) {
  const mapping = {
    strong: 'strong',
    effective: 'effective',
    developing: 'developing',
    'needs work': 'needs-work',
    'not evaluated': 'neutral',
  };

  const lowered = String(qualityLevel || '').trim().toLowerCase();
  return mapping[lowered] || 'neutral';
}

function renderRubricList(container, rubrics) {
  container.innerHTML = '';

  if (!rubrics.length) {
    container.textContent = 'No rubric details yet.';
    return;
  }

  rubrics.forEach((rubric) => {
    const item = document.createElement('div');
    item.className = 'rubric-item';

    const title = document.createElement('p');
    title.className = 'rubric-title';
    title.textContent = rubric.criterion;

    const status = document.createElement('p');
    status.className = `rubric-status ${rubric.met ? 'met' : 'not-met'}`;
    status.textContent = rubric.met ? 'Satisfied' : 'Not satisfied';

    const evidence = document.createElement('p');
    evidence.className = 'rubric-evidence-label';
    evidence.textContent = 'Evidence slice';

    const evidenceBox = document.createElement('div');
    evidenceBox.className = 'rubric-evidence';
    evidenceBox.textContent = rubric.evidence;

    item.appendChild(title);
    item.appendChild(status);
    item.appendChild(evidence);
    item.appendChild(evidenceBox);
    container.appendChild(item);
  });
}

function resetFeedback() {
  Object.keys(ANGLE_CONFIG).forEach((angleKey) => {
    const angle = feedbackDom[angleKey];
    setQualityChip(angle.quality, 'Not evaluated');
    angle.summary.textContent = 'Start an evaluation to see the quality classification.';
    angle.rubrics.textContent = 'No rubric details yet.';
  });
  dom.combinedSuggestions.textContent = 'End the conversation and start evaluation to see next-step guidance.';
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
    const firstError = String(payload.error?.message || '').toLowerCase();
    const responseFormatUnsupported =
      firstError.includes('response_format') ||
      firstError.includes('json_object') ||
      firstError.includes('unsupported');

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
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.href,
      'X-Title': 'Reflection Training Lab',
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

  if (typeof content === 'string' && content.trim()) {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const joined = content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (typeof part?.text === 'string') return part.text;
        if (typeof part?.content === 'string') return part.content;
        if (part?.json && typeof part.json === 'object') return JSON.stringify(part.json);
        return '';
      })
      .join('')
      .trim();
    if (joined) return joined;
  }

  if (content && typeof content === 'object') {
    if (typeof content.text === 'string' && content.text.trim()) {
      return content.text.trim();
    }
    const asJson = JSON.stringify(content);
    if (asJson && asJson !== '{}') return asJson;
  }

  if (typeof choice?.text === 'string' && choice.text.trim()) {
    return choice.text.trim();
  }

  if (Array.isArray(message?.tool_calls)) {
    const args = message.tool_calls
      .map((toolCall) => toolCall?.function?.arguments || '')
      .join('')
      .trim();
    if (args) return args;
  }

  if (typeof message?.reasoning === 'string' && message.reasoning.trim()) {
    return message.reasoning.trim();
  }

  return '';
}

function buildPayloadHint(payload) {
  const choice = payload?.choices?.[0] || {};
  const message = choice?.message || {};
  const finishReason = choice?.finish_reason ? `finish_reason=${choice.finish_reason}` : 'finish_reason=unknown';
  const messageKeys = Object.keys(message);
  return `(${finishReason}; message_keys=${messageKeys.join(',') || 'none'})`;
}

function parseJsonFromResponse(rawText) {
  const direct = tryParseJson(rawText);
  if (direct) return direct;

  const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch) {
    const fenced = tryParseJson(fencedMatch[1]);
    if (fenced) return fenced;
  }

  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = rawText.slice(firstBrace, lastBrace + 1);
    const partial = tryParseJson(candidate);
    if (partial) return partial;
  }

  throw new Error('Could not parse JSON feedback from model response.');
}

function tryParseJson(text) {
  try {
    return JSON.parse(text.trim());
  } catch {
    return null;
  }
}

function formatRuntimeError(error, fallbackMessage) {
  const rawMessage = String(error?.message || '').trim();
  if (!rawMessage) return fallbackMessage;

  if (rawMessage.includes('Could not parse JSON feedback')) {
    return 'The evaluation finished, but the model response was not in a readable JSON format. Please try evaluation again.';
  }

  if (rawMessage.includes('OpenRouter returned no message content')) {
    return 'The model returned an empty response. Please try again.';
  }

  return rawMessage;
}

function setStatus(message, type = 'info', title = '') {
  const resolvedTitle =
    title ||
    (type === 'error'
      ? 'Action Needed'
      : type === 'success'
        ? 'Completed'
        : state.isLoading
          ? 'Working'
          : 'Status');

  const badgeText =
    type === 'error'
      ? 'Error'
      : type === 'success'
        ? 'Ready'
        : state.isLoading
          ? 'Running'
          : 'System';

  dom.statusBadge.textContent = badgeText;
  dom.statusTitle.textContent = resolvedTitle;
  dom.statusMessage.textContent = message;
  dom.statusBox.classList.remove('info', 'error', 'success', 'is-loading');
  dom.statusBox.classList.add(type);
  dom.statusBox.classList.toggle('is-loading', type === 'info' && state.isLoading);
  dom.statusBox.setAttribute('aria-busy', String(type === 'info' && state.isLoading));
}

function setLoading(isLoading) {
  state.isLoading = isLoading;
  updateActionAvailability();
}

function updateActionAvailability() {
  const profile = buildDraftProfile();
  const canStart = getMissingRequiredLabels(profile).length === 0;
  const hasChatInput = Boolean(dom.chatInput.value.trim());
  const hasCounselorTurns = getCounselorTurns().length > 0;

  dom.startConversationBtn.disabled = state.isLoading || !canStart;
  dom.sendMessageBtn.disabled = state.isLoading || !state.conversationStarted || state.conversationEnded || !hasChatInput;
  dom.endConversationBtn.disabled = state.isLoading || !state.conversationStarted || state.conversationEnded;
  dom.startEvaluationBtn.disabled =
    state.isLoading || !state.conversationStarted || !state.conversationEnded || !hasCounselorTurns;
  dom.chatInput.disabled = state.isLoading || !state.conversationStarted || state.conversationEnded;
  dom.startConversationBtn.textContent = state.conversationStarted ? 'Start New Patient Conversation' : 'Start Patient Conversation';
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
    console.warn('Failed to load local config.', error);
  }
}

function formatLabel(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatSentence(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}
