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

const PRESET_PATIENTS = [
  {
    id: 'maya-finals',
    name: 'Maya',
    issue: 'anxiety',
    gender: 'woman',
    age: '21',
    occupation: 'college student',
    severity: 'moderate',
    event: 'Final exams are close, and she has started losing sleep before classes and skipping meals when she feels overwhelmed.',
    goal: 'sleep more consistently and feel less panicked before school',
    additionalDetails: 'High-achieving, first-generation college student, embarrassed that she is struggling, and hesitant to disappoint her family.',
    lifeStage: 'young_adult',
    tags: ['college', 'sleep', 'performance pressure'],
  },
  {
    id: 'marcus-drinking',
    name: 'Marcus',
    issue: 'substance_use',
    gender: 'man',
    age: '42',
    occupation: 'warehouse supervisor',
    severity: 'moderate',
    event: 'He has been drinking more after work since a recent separation and is starting to notice arguments with his sister about it.',
    goal: 'understand whether his drinking is becoming a real problem and regain control',
    additionalDetails: 'Proud, guarded, and more comfortable talking about stress than sadness. Does not want to feel judged or labeled.',
    lifeStage: 'adult',
    tags: ['alcohol use', 'family tension', 'ambivalence'],
  },
  {
    id: 'elena-separation',
    name: 'Elena',
    issue: 'relationship_issues',
    gender: 'woman',
    age: '36',
    occupation: 'elementary school teacher',
    severity: 'moderate',
    event: 'She recently separated from her partner and feels lonely at home after years of building her life around the relationship.',
    goal: 'feel less stuck in grief and stop blaming herself for everything',
    additionalDetails: 'Warm and reflective, but highly self-critical. Wants support without being rushed into dating or quick solutions.',
    lifeStage: 'adult',
    tags: ['breakup', 'loneliness', 'self-blame'],
  },
  {
    id: 'darius-burnout',
    name: 'Darius',
    issue: 'depression',
    gender: 'man',
    age: '17',
    occupation: 'high school student',
    severity: 'moderate',
    event: 'He has stopped turning in assignments, sleeps at odd hours, and feels numb after withdrawing from friends for months.',
    goal: 'feel motivated again and stop disappointing the people around him',
    additionalDetails: 'Answers briefly at first, often says he is just tired, and is unsure whether what he feels counts as depression.',
    lifeStage: 'teen',
    tags: ['motivation', 'school', 'withdrawal'],
  },
  {
    id: 'priya-accident',
    name: 'Priya',
    issue: 'trauma',
    gender: 'woman',
    age: '31',
    occupation: 'software engineer',
    severity: 'moderate',
    event: 'After a recent car accident, she keeps replaying the moment in her head and avoids driving whenever possible.',
    goal: 'feel safer in her body and stop getting flooded by panic on the road',
    additionalDetails: 'Analytical and articulate, but visibly tense when talking about the crash. Wants control over her reactions.',
    lifeStage: 'adult',
    tags: ['panic', 'avoidance', 'accident'],
  },
  {
    id: 'naomi-overload',
    name: 'Naomi',
    issue: 'stress',
    gender: 'nonbinary',
    age: '28',
    occupation: 'ICU nurse',
    severity: 'severe',
    event: 'Back-to-back shifts and family caregiving demands have left them feeling wired, irritable, and close to burnout.',
    goal: 'find a way to slow down without feeling like they are failing everyone',
    additionalDetails: 'Quick thinker, dry sense of humor, and used to being the capable one. Tends to minimize their own distress.',
    lifeStage: 'adult',
    tags: ['burnout', 'caregiving', 'healthcare'],
  },
  {
    id: 'rosa-empty-nest',
    name: 'Rosa',
    issue: 'depression',
    gender: 'woman',
    age: '63',
    occupation: 'retired bookkeeper',
    severity: 'mild',
    event: 'Since her youngest child moved away, the house feels painfully quiet and she has started questioning her purpose day to day.',
    goal: 'feel connected again and rebuild a sense of meaning',
    additionalDetails: 'Soft-spoken, reflective, and worried that she sounds ungrateful when she talks about loneliness.',
    lifeStage: 'older_adult',
    tags: ['loneliness', 'life transition', 'purpose'],
  },
  {
    id: 'andre-arguments',
    name: 'Andre',
    issue: 'relationship_issues',
    gender: 'man',
    age: '27',
    occupation: 'restaurant manager',
    severity: 'moderate',
    event: 'He and his partner keep having the same escalating argument about trust, and he is scared the relationship is about to end.',
    goal: 'understand his own reactions and communicate without shutting down',
    additionalDetails: 'Protective, reactive under stress, and more comfortable talking about anger than vulnerability.',
    lifeStage: 'young_adult',
    tags: ['conflict', 'trust', 'communication'],
  },
];

const dom = {
  apiKeyInput: document.getElementById('apiKeyInput'),
  modelInput: document.getElementById('modelInput'),
  openrouterFileInput: document.getElementById('openrouterFileInput'),
  rememberToggle: document.getElementById('rememberToggle'),
  mainIssueGrid: document.getElementById('mainIssueGrid'),
  completionBadge: document.getElementById('completionBadge'),
  completionHint: document.getElementById('completionHint'),
  issueHint: document.getElementById('issueHint'),
  presetIssueFilter: document.getElementById('presetIssueFilter'),
  presetSeverityFilter: document.getElementById('presetSeverityFilter'),
  presetLifeStageFilter: document.getElementById('presetLifeStageFilter'),
  presetCardsGrid: document.getElementById('presetCardsGrid'),
  clearPresetFiltersBtn: document.getElementById('clearPresetFiltersBtn'),
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
  simpleModeBtn: document.getElementById('simpleModeBtn'),
  highFidelityModeBtn: document.getElementById('highFidelityModeBtn'),
  devModeToggle: document.getElementById('devModeToggle'),
  modeDescription: document.getElementById('modeDescription'),
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
  selectedPresetId: '',
  conversation: [],
  conversationStarted: false,
  conversationEnded: false,
  activeProfile: null,
  patientSystemPrompt: '',
  isLoading: false,
  chatMode: 'simple',      // 'simple' | 'high-fidelity'
  devMode: false,
  trajectories: {},        // { conversationIndex: trajectoryArray }
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
    renderPresetFilters();
    renderPresetCards();
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
  dom.presetIssueFilter.addEventListener('change', renderPresetCards);
  dom.presetSeverityFilter.addEventListener('change', renderPresetCards);
  dom.presetLifeStageFilter.addEventListener('change', renderPresetCards);
  dom.clearPresetFiltersBtn.addEventListener('click', clearPresetFilters);
  dom.apiKeyInput.addEventListener('input', maybePersistConfig);
  dom.modelInput.addEventListener('input', maybePersistConfig);
  dom.rememberToggle.addEventListener('change', maybePersistConfig);
  dom.chatInput.addEventListener('input', updateActionAvailability);
  dom.simpleModeBtn.addEventListener('click', () => handleModeChange('simple'));
  dom.highFidelityModeBtn.addEventListener('click', () => handleModeChange('high-fidelity'));
  dom.devModeToggle.addEventListener('click', handleDevModeToggle);

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

function handleModeChange(mode) {
  state.chatMode = mode;
  dom.simpleModeBtn.classList.toggle('is-active', mode === 'simple');
  dom.highFidelityModeBtn.classList.toggle('is-active', mode === 'high-fidelity');

  if (mode === 'high-fidelity') {
    dom.devModeToggle.hidden = false;
    dom.modeDescription.textContent =
      'High-Fidelity mode adds a Fidelity Reviewer pass after each draft — slower but with higher simulation quality.';
  } else {
    dom.devModeToggle.hidden = true;
    dom.modeDescription.textContent =
      'Simple mode generates the patient reply in a single pass — faster, but no fidelity check.';
  }
}

function handleDevModeToggle() {
  state.devMode = !state.devMode;
  dom.devModeToggle.classList.toggle('is-active', state.devMode);
  dom.devModeToggle.textContent = state.devMode ? 'Dev Mode: ON' : 'Dev Mode';
  renderChatTranscript();
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
  state.selectedPresetId = '';
  updateIssueButtons();
  renderPresetCards();
  renderDraftSummaries();
  updateActionAvailability();
  setStatus(`Main issue selected: ${formatLabel(issueKey)}. Finish the patient profile when ready.`, 'success');
}

function renderPresetFilters() {
  populateFilterSelect(dom.presetIssueFilter, state.issueOrder, 'All issues', formatLabel);
  populateFilterSelect(dom.presetSeverityFilter, uniquePresetValues('severity'), 'All severities', formatSentence);
  populateFilterSelect(dom.presetLifeStageFilter, uniquePresetValues('lifeStage'), 'All life stages', formatLabel);
}

function populateFilterSelect(selectElement, values, defaultLabel, formatter) {
  const currentValue = selectElement.value;
  selectElement.innerHTML = '';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = defaultLabel;
  selectElement.appendChild(defaultOption);

  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = formatter(value);
    selectElement.appendChild(option);
  });

  selectElement.value = values.includes(currentValue) ? currentValue : '';
}

function uniquePresetValues(key) {
  return [...new Set(PRESET_PATIENTS.map((patient) => patient[key]).filter(Boolean))];
}

function clearPresetFilters() {
  dom.presetIssueFilter.value = '';
  dom.presetSeverityFilter.value = '';
  dom.presetLifeStageFilter.value = '';
  renderPresetCards();
}

function renderPresetCards() {
  dom.presetCardsGrid.innerHTML = '';

  const filteredCards = PRESET_PATIENTS.filter((card) => {
    const issueMatches = !dom.presetIssueFilter.value || card.issue === dom.presetIssueFilter.value;
    const severityMatches = !dom.presetSeverityFilter.value || card.severity === dom.presetSeverityFilter.value;
    const lifeStageMatches = !dom.presetLifeStageFilter.value || card.lifeStage === dom.presetLifeStageFilter.value;
    return issueMatches && severityMatches && lifeStageMatches;
  });

  if (!filteredCards.length) {
    const emptyState = document.createElement('div');
    emptyState.className = 'preset-empty';
    emptyState.textContent = 'No preset patients match the current filters.';
    dom.presetCardsGrid.appendChild(emptyState);
    return;
  }

  filteredCards.forEach((card) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset-card';
    if (card.id === state.selectedPresetId) {
      button.classList.add('is-active');
    }
    button.addEventListener('click', () => applyPresetPatient(card));

    const topRow = document.createElement('div');
    topRow.className = 'preset-card-top';

    const headingWrap = document.createElement('div');
    const name = document.createElement('p');
    name.className = 'preset-name';
    name.textContent = card.name;
    const meta = document.createElement('p');
    meta.className = 'preset-meta';
    meta.textContent = `${card.age} • ${card.occupation}`;
    headingWrap.appendChild(name);
    headingWrap.appendChild(meta);

    const severityPill = document.createElement('span');
    severityPill.className = `preset-severity severity-${card.severity}`;
    severityPill.textContent = formatSentence(card.severity);

    topRow.appendChild(headingWrap);
    topRow.appendChild(severityPill);

    const issue = document.createElement('p');
    issue.className = 'preset-issue';
    issue.textContent = formatLabel(card.issue);

    const description = document.createElement('p');
    description.className = 'preset-description';
    description.textContent = card.event;

    const tags = document.createElement('div');
    tags.className = 'preset-tags';

    [formatLabel(card.lifeStage), ...card.tags].forEach((tagText) => {
      const tag = document.createElement('span');
      tag.className = 'preset-tag';
      tag.textContent = tagText;
      tags.appendChild(tag);
    });

    const action = document.createElement('p');
    action.className = 'preset-action';
    action.textContent = 'Click to load this patient into the builder';

    button.appendChild(topRow);
    button.appendChild(issue);
    button.appendChild(description);
    button.appendChild(tags);
    button.appendChild(action);
    dom.presetCardsGrid.appendChild(button);
  });
}

function applyPresetPatient(card) {
  state.selectedPresetId = card.id;
  state.selectedIssue = card.issue;

  dom.genderSelect.value = card.gender;
  dom.ageInput.value = card.age;
  dom.occupationInput.value = card.occupation;
  dom.severitySelect.value = card.severity;
  dom.eventInput.value = card.event;
  dom.goalInput.value = card.goal;
  dom.additionalDetailsInput.value = card.additionalDetails;

  updateIssueButtons();
  renderPresetCards();
  renderDraftSummaries();
  updateActionAvailability();
  setStatus(`${card.name} was loaded into the builder. You can edit any detail before starting the chat.`, 'success', 'Preset Loaded');
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
        content: stripPoses(openingMessage),
      },
    ];
    state.conversationStarted = true;
    state.conversationEnded = false;
    state.trajectories = {};
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
    'Reply in first person as the patient. Keep responses short and natural — many turns should be only 1-2 sentences, ' +
    'occasionally 3 sentences, rarely more. Real patients in counseling do not give speeches.\n' +
    'STRICT RULES:\n' +
    '- Never write action descriptions, stage directions, or physical gestures (e.g. *sighs*, *looks down*, *fidgets*). Plain spoken words only.\n' +
    '- Do not become a therapist, do not provide advice to yourself, and do not break character.\n' +
    '- Do not over-explain or summarize your own feelings clinically.\n\n' +
    `Primary concern: ${formatLabel(profile.issue)}\n` +
    `Gender: ${formatSentence(profile.gender)}\n` +
    `Age: ${profile.age}\n` +
    `Occupation: ${profile.occupation}\n` +
    `Severity: ${profile.severity}\n` +
    `Current event: ${profile.event}\n` +
    `Goal: ${profile.goal}\n` +
    `Additional notes: ${extraNotes}\n\n` +
    'Conversation style rules:\n' +
    '- Reveal emotions, stressors, and ambivalence naturally through words, not through descriptions of body language.\n' +
    '- Be consistent with the profile.\n' +
    '- Do not solve the issue quickly.\n' +
    '- If the counselor asks a question, answer briefly as the patient would in real life.\n' +
    '- If the counselor reflects, respond the way a real patient would — sometimes just a short confirmation or a shift.\n' +
    '- Avoid long monologues. Shorter is almost always better.'
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

  try {
    if (state.chatMode === 'high-fidelity') {
      const result = await generateHighFidelityReply(config, state.activeProfile);
      const patientTurnIdx = state.conversation.length;
      state.conversation.push({
        speaker: 'Patient',
        role: 'assistant',
        content: result.reply,
      });
      state.trajectories[patientTurnIdx] = result.trajectory;
    } else {
      setStatus('The simulated patient is generating a reply...', 'info', 'Generating Reply');
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
        content: stripPoses(patientReply),
      });
    }

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
        "- Accuracy of emotional identification: Does the counselor correctly name or reflect the client's emotional state, rather than projecting or guessing incorrectly?\n" +
        "- Timing and responsiveness: Does the empathic response come at a natural moment, showing the counselor is tracking the client's experience in real time?\n" +
        '- Depth matching: Does the counselor match the intensity of what the client is expressing, neither minimizing nor dramatizing the feeling?\n' +
        "- Verbal and nonverbal congruence: Do the counselor's tone, pace, and body language align with the empathic words being used?\n" +
        '- Impact on the client: Does the empathic statement visibly help the client feel understood, as evidenced by continued exploration, visible relief, or verbal confirmation?\n\n' +
        'Reflection rubrics:\n' +
        '- Accuracy of content: Does the reflection faithfully capture what the client said without distorting, adding, or omitting key meaning?\n' +
        '- Balance of simple and complex reflections: Does the counselor go beyond parroting to add meaning, underscore feeling, or make implicit content explicit?\n' +
        '- Strategic direction: Does the reflection steer toward change talk, values, or motivation rather than simply restating the problem or sustain talk?\n' +
        '- Continuity and flow: Does the reflection land smoothly in conversation, encouraging the client to keep exploring rather than disrupting their train of thought?\n' +
        '- Ratio of reflections to questions: Does the counselor rely more on reflections than questions, maintaining a reflection-to-question ratio of at least 1:1 or higher?\n\n' +
        'Open-ended question rubrics:\n' +
        '- Genuinely open structure: Is the question truly open, inviting narrative, elaboration, or exploration rather than a yes or no answer or a leading question disguised as open?\n' +
        '- Relevance and timing: Does the question connect meaningfully to what the client just said, rather than abruptly shifting the topic or following a rigid agenda?\n' +
        "- Evocative quality: Does the question draw out the client's own motivations, values, or feelings rather than gathering purely factual or logistical information?\n" +
        '- Economy and clarity: Is the question concise and easy to understand, avoiding compound or multi-part constructions that overwhelm the client?\n' +
        "- Promotes client agency: Does the question position the client as the expert on their own life, inviting self-assessment and self-directed thinking rather than leading toward the counselor's preferred answer?\n\n" +
        'Affirmation rubrics:\n' +
        '- Specificity: Does the affirmation point to a concrete strength, effort, or quality the client has demonstrated, rather than offering vague praise like good job?\n' +
        '- Authenticity: Does the affirmation sound genuine and grounded in what the client actually shared, avoiding flattery or formulaic compliments?\n' +
        "- Focus on character and effort over outcome: Does the affirmation highlight the client's values, courage, persistence, or intention rather than simply congratulating a result?\n" +
        '- Appropriate frequency: Are affirmations used selectively enough to carry weight, rather than so frequently that they feel hollow or patronizing?\n' +
        '- Alignment with client self-concept: Does the affirmation resonate with something the client can recognize in themselves, rather than imposing an identity that feels foreign or pressured?\n\n' +
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
        '- Every angle must include exactly five rubric items.\n' +
        '- Keep the rubric items aligned with the five criteria listed for that angle.\n' +
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
      max_tokens: 2200,
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

  state.conversation.forEach((turn, index) => {
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

    if (!isCounselor && state.devMode && state.chatMode === 'high-fidelity' && state.trajectories[index]) {
      dom.chatTranscript.appendChild(renderTrajectoryBlock(state.trajectories[index]));
    }
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
  const rubrics = rawRubrics.slice(0, 5).map((rubric) => ({
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

function buildFidelitySystemPrompt(profile) {
  const extraNotes = profile.additionalDetails || 'None';
  return (
    'You are a strict simulation fidelity reviewer for a counseling training platform. ' +
    'Your job is to catch problems — do not approve a draft unless it genuinely passes every criterion below. ' +
    'Be demanding: a response that is merely acceptable is not good enough.\n\n' +
    'Patient profile:\n' +
    `Primary concern: ${formatLabel(profile.issue)}\n` +
    `Gender: ${formatSentence(profile.gender)}\n` +
    `Age: ${profile.age}\n` +
    `Occupation: ${profile.occupation}\n` +
    `Severity: ${profile.severity}\n` +
    `Current event: ${profile.event}\n` +
    `Goal: ${profile.goal}\n` +
    `Additional notes: ${extraNotes}\n\n` +
    'Reject the draft (approved: false) if ANY of the following are true:\n' +
    '1. Stage directions or poses: The response contains action text such as *sighs*, *looks away*, *pauses*, or any *asterisk-wrapped* gesture.\n' +
    '2. Wrong emotional register: The emotional depth does not match the stated severity level — too flat for severe, too dramatic for mild.\n' +
    '3. Too long: The response is more than 3 sentences. Real patients in counseling give short replies.\n' +
    '4. Scripted or clinical tone: The patient sounds like they are narrating their own psychology rather than speaking naturally ("I tend to cope by...", "My pattern is...", "I realize that...").\n' +
    '5. Reactive mismatch: The response does not directly follow from what the counselor just said — ignores the question or reflection.\n' +
    '6. Role reversal: The patient gives advice, offers insight to the counselor, or resolves their own issue too neatly.\n\n' +
    'Only approve if none of the above apply and the response sounds like a real person talking in a therapy session.\n\n' +
    'Respond with JSON only: { "approved": boolean, "feedback": string }\n' +
    'If approved is false, feedback must name the specific criterion that failed and say exactly what to fix (under 80 words).\n' +
    'If approved is true, feedback must be an empty string.'
  );
}

async function callFidelityReviewer(config, profile, conversationMessages, draftReply) {
  const recentExchange = conversationMessages
    .filter((m) => m.role !== 'system')
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Counselor' : 'Patient'}: ${m.content}`)
    .join('\n');

  try {
    const raw = await callOpenRouter({
      apiKey: config.apiKey,
      model: config.model,
      messages: [
        {
          role: 'system',
          content: buildFidelitySystemPrompt(profile),
        },
        {
          role: 'user',
          content:
            `Conversation so far:\n${recentExchange}\n\n` +
            `Simulator draft response:\nPatient: ${draftReply}\n\n` +
            'Evaluate this draft. Return JSON only: { "approved": boolean, "feedback": string }',
        },
      ],
      temperature: 0.2,
      max_tokens: 200,
      requireJson: true,
    });

    const parsed = parseJsonFromResponse(raw);
    return {
      approved: Boolean(parsed.approved),
      feedback: String(parsed.feedback || '').trim(),
    };
  } catch (error) {
    console.warn('Fidelity reviewer call failed, accepting draft:', error);
    return { approved: true, feedback: '' };
  }
}

function buildConversationMessagesWithRevision(lastDraft, feedback) {
  const history = state.conversation.slice(-12).map((turn) => ({
    role: turn.role,
    content: turn.content,
  }));

  const revisedSystemPrompt =
    state.patientSystemPrompt +
    `\n\nREVISION NOTE: Your previous response was: "${lastDraft}". ` +
    `Fidelity reviewer feedback: ${feedback} ` +
    `Please revise your response to address the feedback while staying fully in character.`;

  return [{ role: 'system', content: revisedSystemPrompt }, ...history];
}

async function generateHighFidelityReply(config, profile) {
  const MAX_ATTEMPTS = 3;
  const trajectory = [];
  let lastDraft = '';
  let lastFeedback = '';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt === 1) {
      setStatus('Generating patient reply...', 'info', 'Generating Reply');
    } else {
      setStatus(`Refining patient reply (attempt ${attempt} of ${MAX_ATTEMPTS})...`, 'info', 'Refining Reply');
    }

    const messages =
      attempt === 1
        ? buildConversationMessages()
        : buildConversationMessagesWithRevision(lastDraft, lastFeedback);

    lastDraft = stripPoses(
      await callOpenRouter({
        apiKey: config.apiKey,
        model: config.model,
        messages,
        temperature: 0.8,
        max_tokens: 260,
        requireJson: false,
      })
    );

    if (attempt === MAX_ATTEMPTS) {
      trajectory.push({ attempt, draft: lastDraft, fidelity: null });
      break;
    }

    setStatus('Fidelity Reviewer is checking the draft...', 'info', 'Fidelity Check');
    const fidelityResult = await callFidelityReviewer(config, profile, messages, lastDraft);
    trajectory.push({ attempt, draft: lastDraft, fidelity: fidelityResult });

    if (fidelityResult.approved) break;
    lastFeedback = fidelityResult.feedback;
  }

  return { reply: lastDraft, trajectory };
}

function renderTrajectoryBlock(trajectory) {
  const container = document.createElement('details');
  container.className = 'dev-trajectory';

  const summary = document.createElement('summary');
  summary.textContent = `Fidelity trajectory — ${trajectory.length} attempt${trajectory.length !== 1 ? 's' : ''}`;
  container.appendChild(summary);

  const body = document.createElement('div');
  body.className = 'dev-trajectory-body';

  trajectory.forEach(({ attempt, draft, fidelity }) => {
    const attemptEl = document.createElement('div');
    attemptEl.className = 'dev-attempt';

    const label = document.createElement('p');
    label.className = 'dev-attempt-label';
    label.textContent = `Attempt ${attempt}`;
    attemptEl.appendChild(label);

    const draftEl = document.createElement('p');
    draftEl.className = 'dev-attempt-draft';
    draftEl.textContent = `"${draft}"`;
    attemptEl.appendChild(draftEl);

    if (fidelity === null) {
      const badge = document.createElement('span');
      badge.className = 'dev-fidelity-badge dev-final-badge';
      badge.textContent = 'Accepted — max attempts reached';
      attemptEl.appendChild(badge);
    } else {
      const badge = document.createElement('span');
      badge.className = `dev-fidelity-badge ${fidelity.approved ? 'passed' : 'needs-revision'}`;
      badge.textContent = fidelity.approved ? 'Fidelity: Passed' : 'Fidelity: Needs revision';
      attemptEl.appendChild(badge);

      if (!fidelity.approved && fidelity.feedback) {
        const feedbackEl = document.createElement('p');
        feedbackEl.className = 'dev-fidelity-feedback';
        feedbackEl.textContent = fidelity.feedback;
        attemptEl.appendChild(feedbackEl);
      }
    }

    body.appendChild(attemptEl);
  });

  container.appendChild(body);
  return container;
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

function stripPoses(text) {
  return String(text || '')
    .replace(/\*[^*]+\*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
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
