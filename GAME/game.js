// ============================================================
// OYUN MOTORU + UI KONTROLCÜSÜ
// ============================================================

// ----------------------------------------------------------
// OYUN DURUMU (STATE)
// ----------------------------------------------------------
function compactEventTraceText(value, maxLength = 320) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, Math.max(0, maxLength - 3)).trimEnd() + '...';
}

function normalizeEventTraceResponseSnapshot(rawSnapshot) {
  if (!rawSnapshot || typeof rawSnapshot !== 'object') return null;

  return {
    text: compactEventTraceText(rawSnapshot.text, 360),
    summary: compactEventTraceText(rawSnapshot.summary, 220),
    clues_found: Array.isArray(rawSnapshot.clues_found) ? rawSnapshot.clues_found.filter(Boolean).slice(0, 8) : []
  };
}

function normalizeEventTraceJudgeSnapshot(rawJudge) {
  if (!rawJudge || typeof rawJudge !== 'object') return null;

  return {
    approved: Boolean(rawJudge.approved),
    issues: Array.isArray(rawJudge.issues) ? rawJudge.issues.filter(Boolean).slice(0, 8) : [],
    reason: compactEventTraceText(rawJudge.reason, 220),
    retryInstruction: compactEventTraceText(rawJudge.retryInstruction, 220),
    finalAction: compactEventTraceText(rawJudge.finalAction, 40),
    attempts: Number.isInteger(rawJudge.attempts) ? rawJudge.attempts : undefined
  };
}

function normalizeEventTraceAttempt(rawAttempt, fallbackAttempt = 1) {
  if (!rawAttempt || typeof rawAttempt !== 'object') return null;

  return {
    attempt: Number.isInteger(rawAttempt.attempt) ? rawAttempt.attempt : fallbackAttempt,
    promptStage: compactEventTraceText(rawAttempt.promptStage, 40),
    sanitizerFallback: compactEventTraceText(rawAttempt.sanitizerFallback, 60),
    rawResponse: normalizeEventTraceResponseSnapshot(rawAttempt.rawResponse),
    finalizedResponse: normalizeEventTraceResponseSnapshot(rawAttempt.finalizedResponse),
    judgeVerdict: normalizeEventTraceJudgeSnapshot(rawAttempt.judgeVerdict)
  };
}

function normalizeEventTraceEntry(rawEntry, fallbackSequence = 1) {
  if (!rawEntry || typeof rawEntry !== 'object') return null;

  const attempts = Array.isArray(rawEntry.attempts)
    ? rawEntry.attempts
        .map((attempt, index) => normalizeEventTraceAttempt(attempt, index + 1))
        .filter(Boolean)
        .slice(-6)
    : [];

  return {
    sequence: Number.isInteger(rawEntry.sequence) ? rawEntry.sequence : fallbackSequence,
    timestamp: typeof rawEntry.timestamp === 'number' ? rawEntry.timestamp : Date.now(),
    interactionType: compactEventTraceText(rawEntry.interactionType, 40),
    contextView: compactEventTraceText(rawEntry.contextView, 30),
    conversationKey: compactEventTraceText(rawEntry.conversationKey, 80),
    targetId: compactEventTraceText(rawEntry.targetId, 80),
    targetName: compactEventTraceText(rawEntry.targetName, 120),
    userMessage: compactEventTraceText(rawEntry.userMessage, 260),
    loreIntent: rawEntry.loreIntent && typeof rawEntry.loreIntent === 'object'
      ? {
          slotKey: compactEventTraceText(rawEntry.loreIntent.slotKey, 60),
          label: compactEventTraceText(rawEntry.loreIntent.label, 80)
        }
      : null,
    allowedClueIds: Array.isArray(rawEntry.allowedClueIds) ? rawEntry.allowedClueIds.filter(Boolean).slice(0, 8) : [],
    judgeApplied: Boolean(rawEntry.judgeApplied),
    finalAction: compactEventTraceText(rawEntry.finalAction, 40),
    attempts,
    finalResponse: normalizeEventTraceResponseSnapshot(rawEntry.finalResponse),
    judge: normalizeEventTraceJudgeSnapshot(rawEntry.judge),
    gameGuard: rawEntry.gameGuard && typeof rawEntry.gameGuard === 'object'
      ? {
          applied: Boolean(rawEntry.gameGuard.applied),
          changed: Boolean(rawEntry.gameGuard.changed),
          before: normalizeEventTraceResponseSnapshot(rawEntry.gameGuard.before),
          after: normalizeEventTraceResponseSnapshot(rawEntry.gameGuard.after)
        }
      : null,
    delivered: rawEntry.delivered && typeof rawEntry.delivered === 'object'
      ? {
          senderName: compactEventTraceText(rawEntry.delivered.senderName, 80),
          messageKind: compactEventTraceText(rawEntry.delivered.messageKind, 40),
          response: normalizeEventTraceResponseSnapshot(rawEntry.delivered.response),
          judge: normalizeEventTraceJudgeSnapshot(rawEntry.delivered.judge)
        }
      : null,
    error: compactEventTraceText(rawEntry.error, 220)
  };
}

function createEmptyEventLog(storyFolder = '', sessionId = '') {
  return {
    version: 1,
    storyFolder: storyFolder || '',
    sessionId: sessionId || '',
    createdAt: 0,
    updatedAt: 0,
    lastSequence: 0,
    entries: []
  };
}

function createEventLogSessionId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function compactEventLogText(value, maxLength = 12000) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, Math.max(0, maxLength - 3)).trimEnd() + '...';
}

function normalizeEventLogValue(value, depth = 0) {
  if (value == null) return value ?? null;
  if (typeof value === 'string') {
    return compactEventLogText(value, depth === 0 ? 16000 : 8000);
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Set) return Array.from(value).slice(0, 160).map(item => normalizeEventLogValue(item, depth + 1));
  if (Array.isArray(value)) return value.slice(0, depth === 0 ? 160 : 80).map(item => normalizeEventLogValue(item, depth + 1));
  if (typeof value === 'object') {
    if (depth >= 5) return compactEventLogText(JSON.stringify(value), 4000);

    const normalized = {};
    Object.entries(value).slice(0, 160).forEach(([key, itemValue]) => {
      if (typeof itemValue === 'function') return;
      normalized[key] = normalizeEventLogValue(itemValue, depth + 1);
    });
    return normalized;
  }

  return compactEventLogText(String(value), 4000);
}

function normalizeEventLogEntry(rawEntry, fallbackSequence = 1) {
  if (!rawEntry || typeof rawEntry !== 'object') return null;

  return {
    sequence: Number.isInteger(rawEntry.sequence) ? rawEntry.sequence : fallbackSequence,
    timestamp: typeof rawEntry.timestamp === 'number' ? rawEntry.timestamp : Date.now(),
    sessionId: compactEventLogText(rawEntry.sessionId, 120),
    scope: compactEventLogText(rawEntry.scope || 'system', 60),
    action: compactEventLogText(rawEntry.action || 'event', 80),
    status: compactEventLogText(rawEntry.status || 'info', 20),
    screen: compactEventLogText(rawEntry.screen || '', 40),
    view: compactEventLogText(rawEntry.view || '', 40),
    targetId: compactEventLogText(rawEntry.targetId || '', 80),
    targetName: compactEventLogText(rawEntry.targetName || '', 160),
    phase: Number.isInteger(rawEntry.phase) ? rawEntry.phase : undefined,
    totalTurns: Number.isInteger(rawEntry.totalTurns) ? rawEntry.totalTurns : undefined,
    details: normalizeEventLogValue(rawEntry.details && typeof rawEntry.details === 'object' ? rawEntry.details : {}),
    error: compactEventLogText(rawEntry.error, 1200)
  };
}

function hasPersistableEventLog(log) {
  if (!log || typeof log !== 'object') return false;
  if (Number.isInteger(log.lastSequence) && log.lastSequence > 0) return true;
  return Array.isArray(log.entries) && log.entries.length > 0;
}

const GameState = {
  scenario: null,
  gpt: null,
  storyFolder: null,
  loreMemory: createEmptyLoreMemory(),
  eventLog: createEmptyEventLog(),
  eventLogDirty: false,
  logSessionId: '',

  // Ekran durumu
  currentScreen: 'apikey', // apikey, intro, game, accusation, result
  currentView: null,       // location, character, advisor, clue
  currentTarget: null,     // aktif entity ID

  // Oyun ilerlemesi
  phase: 1,
  totalTurns: 0,
  visitedLocations: new Set(),
  foundClues: [],          // [{ id, name, icon, short_description, ... }]

  // Konuşma geçmişleri (entity bazlı)
  // key: "char_id", "loc_id", "advisor", "clue_id"
  conversations: {},

  // GPT özetleri (GPT'nin kendi kullanımı için, oyuncu görmez)
  gptSummaries: {},

  // Karakterlerin anlik psikolojik durumu (runtime)
  characterStates: {},

  // Oyuncu notları (kronolojik, oyuncu görür)
  playerNotes: [], // [{ index, type, entityId, entityName, title, text }]

  // Yerel inspectable geçmişi
  inspectableHistory: {},

  // Görsel yüklemeleri
  images: {}, // key: "char_id" | "loc_id" | "clue_id", value: dataURL

  // Suçlama seçimi
  selectedSuspect: null,

  // Entity bağlam değişikliği takibi
  _pendingSummary: false,
  _queuedSummaries: {},
  _lastSummaryVersions: {},
  loadingCounter: 0,

  // Adli tıp raporu sistemi
  gameStartTime: null,           // oyun başlangıç zamanı (ms)
  unlockedReports: new Set(),    // açılmış rapor ID'leri
  uniqueCharConversations: new Set(), // konuşulan farklı karakter ID'leri

  // Son 15 mesaj limiti
  MAX_RECENT_MESSAGES: 15,

  // Özet konsolidasyonu eşiği (bu kadar summary birikince birleştir)
  SUMMARY_CONSOLIDATION_THRESHOLD: 8,

  // Otomatik kayıt ve zamanlayıcılar
  saveTimer: null,
  loreSaveTimer: null,
  eventLogSaveTimer: null,
  forensicTimer: null
,
  MAX_EVENT_LOG_ENTRIES: 2400
};

const ReferenceUIState = {
  matches: [],
  activeIndex: 0,
  activeTokenRange: null,
  isOpen: false
};

const ThemeManager = {
  storageKey: 'dedektif-theme',
  currentTheme: 'dark',

  normalizeTheme(value) {
    if (value === 'light' || value === 'dark') return value;
    return null;
  },

  getStoredTheme() {
    try {
      return this.normalizeTheme(localStorage.getItem(this.storageKey));
    } catch (_) {
      return null;
    }
  },

  getSystemTheme() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark';
    } catch (_) {
      return 'dark';
    }
  },

  resolveInitialTheme() {
    return this.normalizeTheme(document.documentElement.dataset.theme)
      || this.getStoredTheme()
      || this.getSystemTheme();
  },

  saveTheme(theme) {
    try {
      localStorage.setItem(this.storageKey, theme);
    } catch (_) {
      // LocalStorage kapalıysa tema bu oturum için geçerli kalır.
    }
  },

  apply(theme, options = {}) {
    const nextTheme = this.normalizeTheme(theme) || 'dark';
    this.currentTheme = nextTheme;
    document.documentElement.dataset.theme = nextTheme;
    if (document.body) {
      document.body.dataset.theme = nextTheme;
    }
    this.updateControls();
    if (options.persist) {
      this.saveTheme(nextTheme);
    }
  },

  updateControls() {
    document.querySelectorAll('[data-theme-option]').forEach(button => {
      const isActive = button.dataset.themeOption === this.currentTheme;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  },

  init() {
    this.apply(this.resolveInitialTheme());
    document.querySelectorAll('[data-theme-option]').forEach(button => {
      if (button.dataset.themeBound === 'true') return;
      button.addEventListener('click', () => {
        this.apply(button.dataset.themeOption, { persist: true });
      });
      button.dataset.themeBound = 'true';
    });
    this.updateControls();
  }
};

function createEmptyLoreMemory(storyFolder = '') {
  return {
    version: 1,
    storyFolder: storyFolder || '',
    updatedAt: 0,
    entries: {
      location: {},
      clue: {}
    }
  };
}

// ----------------------------------------------------------
// YARDIMCI FONKSİYONLAR
// ----------------------------------------------------------

function getConversationKey(type, id) {
  switch (type) {
    case 'location': return 'loc_' + id;
    case 'character': return 'char_' + id;
    case 'advisor': return 'advisor';
    case 'clue': return 'clue_' + id;
    default: return id;
  }
}

function getRecentMessages(key, limit) {
  const conv = GameState.conversations[key] || [];
  const filtered = conv.filter(m => m.role === 'user' || m.role === 'assistant');
  return filtered.slice(-limit).map(m => ({
    role: m.role,
    content: m.content
  }));
}

function getSummarySourceMessages(key) {
  const conv = GameState.conversations[key] || [];
  return conv.filter(m => (m.role === 'user' || m.role === 'assistant') && m.messageKind !== 'soft-lore');
}

function getSummaryMessages(key, limit) {
  return getSummarySourceMessages(key)
    .slice(-limit)
    .map(m => ({ role: m.role, content: m.content }));
}

function getSummaryVersion(key) {
  const recent = getSummarySourceMessages(key).slice(-GameState.MAX_RECENT_MESSAGES);
  if (recent.length < 3) return null;

  const lastMessage = recent[recent.length - 1];
  return `${recent.length}:${lastMessage.timestamp || 0}`;
}

function createConversationEntry(role, content, meta = {}) {
  return {
    role,
    content,
    timestamp: Date.now(),
    senderName: meta.senderName || null,
    isClueFound: Boolean(meta.isClueFound),
    foundClueIds: Array.isArray(meta.foundClueIds) ? meta.foundClueIds.filter(Boolean) : [],
    messageKind: typeof meta.messageKind === 'string' ? meta.messageKind : null
  };
}

function addMessage(key, role, content, meta = {}) {
  if (!GameState.conversations[key]) {
    GameState.conversations[key] = [];
  }
  GameState.conversations[key].push(createConversationEntry(role, content, meta));
  logGameEvent('conversation', 'message_added', {
    conversationKey: key,
    role,
    content,
    senderName: meta.senderName || null,
    messageKind: meta.messageKind || null,
    isClueFound: Boolean(meta.isClueFound),
    foundClueIds: Array.isArray(meta.foundClueIds) ? meta.foundClueIds : []
  }, {
    status: role === 'system' ? 'info' : 'success',
    includeState: false,
    targetId: key.startsWith('loc_') ? key.slice(4)
      : key.startsWith('char_') ? key.slice(5)
      : key.startsWith('clue_') ? key.slice(5)
      : GameState.currentTarget || '',
    view: key === 'advisor' ? 'advisor'
      : key.startsWith('loc_') ? 'location'
      : key.startsWith('char_') ? 'character'
      : key.startsWith('clue_') ? 'clue'
      : GameState.currentView || ''
  });
  SaveManager.scheduleSave();
}

function getCurrentEventTargetName(view = GameState.currentView, targetId = GameState.currentTarget) {
  if (!view) return '';
  if (view === 'advisor') return GameState.scenario?.advisor?.name || '';
  return getEntityById(view, targetId)?.name || '';
}

function buildEventStateSnapshot() {
  return {
    currentScreen: GameState.currentScreen,
    currentView: GameState.currentView,
    currentTarget: GameState.currentTarget,
    phase: GameState.phase,
    totalTurns: GameState.totalTurns,
    visitedLocations: [...GameState.visitedLocations],
    foundClueIds: GameState.foundClues.map(clue => clue.id),
    unlockedReports: [...GameState.unlockedReports],
    uniqueCharConversations: [...GameState.uniqueCharConversations],
    selectedSuspect: GameState.selectedSuspect || null,
    currentConversationLength: (getCurrentConversationKey() && GameState.conversations[getCurrentConversationKey()]?.length) || 0
  };
}

function logGameEvent(scope, action, details = {}, options = {}) {
  return EventLogManager.append({
    sessionId: GameState.logSessionId || '',
    scope,
    action,
    status: options.status || 'info',
    screen: options.screen || GameState.currentScreen || '',
    view: options.view || GameState.currentView || '',
    targetId: options.targetId || GameState.currentTarget || '',
    targetName: options.targetName || getCurrentEventTargetName(options.view || GameState.currentView, options.targetId || GameState.currentTarget),
    phase: GameState.phase,
    totalTurns: GameState.totalTurns,
    details: {
      ...details,
      stateSnapshot: options.includeState === false ? undefined : buildEventStateSnapshot()
    },
    error: options.error || ''
  });
}

function recordInteractionEvent(response, options = {}) {
  if (!response?.eventTrace) return;

  logGameEvent('interaction', response.eventTrace.interactionType || 'response', {
    conversationKey: options.conversationKey || '',
    senderName: options.senderName || '',
    messageKind: options.messageKind || '',
    trace: {
      ...response.eventTrace,
      delivered: {
        senderName: options.senderName || '',
        messageKind: options.messageKind || '',
        response: {
          text: response.text,
          summary: response.summary,
          clues_found: response.clues_found
        },
        judge: response.judge || null
      }
    }
  }, {
    status: response?.judge?.approved === false || response?.judge?.finalAction === 'fallback' ? 'warning' : 'success',
    view: options.contextView || GameState.currentView || '',
    targetId: options.targetId || response.eventTrace.targetId || '',
    targetName: options.targetName || response.eventTrace.targetName || ''
  });
}

function getCurrentConversationKey() {
  if (!GameState.currentView) return null;
  return getConversationKey(GameState.currentView, GameState.currentTarget);
}

function isConversationActive(key) {
  return getCurrentConversationKey() === key;
}

function getEntityById(type, id) {
  switch (type) {
    case 'location': return GameState.scenario.locations.find(l => l.id === id);
    case 'character': return GameState.scenario.characters.find(c => c.id === id);
    case 'clue': return GameState.scenario.clues.find(c => c.id === id);
    default: return null;
  }
}

function compactReferenceText(value, maxLength = 180) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, Math.max(0, maxLength - 3)).trimEnd() + '...';
}

function slugifyReferenceText(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/i̇/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function getReferenceEntity(type, id) {
  if (type === 'advisor') return GameState.scenario?.advisor || null;
  return getEntityById(type, id);
}

function getEntityReferenceTag(type, entity) {
  if (!entity) return '';

  if (typeof entity.tag === 'string' && entity.tag.trim()) {
    return slugifyReferenceText(entity.tag);
  }

  if (type === 'clue') {
    return slugifyReferenceText(entity.name || entity.id);
  }

  return slugifyReferenceText(entity.id || entity.name);
}

function formatEntityReferenceTag(type, entity) {
  const tag = getEntityReferenceTag(type, entity);
  return tag ? `#${tag}` : '';
}

function getLatestPlayerNote(type, entityId) {
  const notes = GameState.playerNotes.filter(note => note.type === type && note.entityId === entityId);
  return notes.length ? notes[notes.length - 1] : null;
}

function getReferenceIcon(type, entity) {
  if (type === 'advisor') return entity?.icon || '🎖️';
  if (type === 'location') return entity?.icon || '📍';
  if (type === 'character') return entity?.icon || '👤';
  return entity?.icon || '🔍';
}

function buildQuickReferenceText(type, id, options = {}) {
  const entity = getReferenceEntity(type, id);
  if (!entity) return '';

  const tag = formatEntityReferenceTag(type, entity);
  const icon = getReferenceIcon(type, entity);
  const lines = [`${icon} ${entity.name}${tag ? ` · ${tag}` : ''}`];

  if (type === 'clue') {
    const note = getLatestPlayerNote('clue', entity.id);
    lines.push(compactReferenceText(entity.short_description, 140));
    if (note?.text && note.text !== entity.short_description) {
      lines.push(compactReferenceText(note.text, 180));
    } else if (entity.detailed_description) {
      lines.push(compactReferenceText(entity.detailed_description, 160));
    }
    if (entity.examination_hints) {
      lines.push(`Hatırlatma: ${compactReferenceText(entity.examination_hints, 140)}`);
    }
    if (options.sourceLabel) {
      lines.push(`İlk kayıt: ${options.sourceLabel}`);
    }
    return lines.join('\n');
  }

  if (type === 'location') {
    const note = getLatestPlayerNote('location', entity.id);
    lines.push(compactReferenceText(note?.text || entity.description, 170));
    if (!note?.text && Array.isArray(entity.visible_elements) && entity.visible_elements.length) {
      lines.push(`Görünür: ${entity.visible_elements.slice(0, 3).join(', ')}`);
    }
    return lines.join('\n');
  }

  if (type === 'character') {
    const note = getLatestPlayerNote('character', entity.id);
    lines.push(compactReferenceText(`${entity.title}. ${entity.appearance || ''}`, 170));
    if (note?.text) {
      lines.push(compactReferenceText(note.text, 180));
    } else if (entity.personality) {
      lines.push(compactReferenceText(entity.personality, 160));
    }
    return lines.join('\n');
  }

  lines.push(compactReferenceText(`${entity.title}. Takıldığın yerde bulunan deliller üzerinden yön gösterir.`, 170));
  return lines.join('\n');
}

function buildReferenceItem(type, entity) {
  if (!entity) return null;

  const id = type === 'advisor' ? 'advisor' : entity.id;
  const tag = getEntityReferenceTag(type, entity);
  const label = entity.name;

  return {
    type,
    id,
    tag,
    displayTag: tag ? `#${tag}` : '',
    label,
    icon: getReferenceIcon(type, entity),
    searchText: [
      tag,
      slugifyReferenceText(label),
      slugifyReferenceText(entity.id || ''),
      slugifyReferenceText(entity.title || ''),
      slugifyReferenceText(entity.short_description || '')
    ].filter(Boolean).join(' ')
  };
}

function getKnownReferenceItems() {
  if (!GameState.scenario) return [];

  const items = [];

  getAvailableLocationIds().forEach(id => {
    const location = getEntityById('location', id);
    const item = buildReferenceItem('location', location);
    if (item) items.push(item);
  });

  getAvailableCharacterIds().forEach(id => {
    const character = getEntityById('character', id);
    const item = buildReferenceItem('character', character);
    if (item) items.push(item);
  });

  GameState.foundClues.forEach(clue => {
    const item = buildReferenceItem('clue', clue);
    if (item) items.push(item);
  });

  const advisorItem = buildReferenceItem('advisor', GameState.scenario.advisor);
  if (advisorItem) items.push(advisorItem);

  return items;
}

function buildInspectableTag(label, fallback = 'incele') {
  const stopWords = new Set([
    've', 'ile', 'bir', 'bu', 'su', 'eski', 'yeni', 'yari', 'acik', 'islak', 'fazla', 'olan',
    'icin', 'gibi', 'notu', 'notlari', 'detayi', 'detaylari', 'hat', 'hatti'
  ]);
  const words = slugifyReferenceText(label)
    .split('_')
    .filter(word => word.length >= 3 && !stopWords.has(word));

  if (words.length === 0) return fallback;
  if (words.length === 1) return words[0];
  return words.slice(0, 2).join('_');
}

function buildInspectableAliases(label) {
  const slug = slugifyReferenceText(label);
  const words = slug.split('_').filter(word => word.length >= 4);
  const aliases = new Set([slug]);

  if (words.length > 0) {
    aliases.add(words[words.length - 1]);
    aliases.add(words.slice(0, 2).join('_'));
    aliases.add(words.slice(-2).join('_'));
  }

  return [...aliases].filter(Boolean);
}

function normalizeInspectableAliasList(value) {
  const aliases = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? [value]
      : [];

  return aliases
    .map(alias => slugifyReferenceText(alias))
    .filter(Boolean)
    .filter((alias, index, array) => array.indexOf(alias) === index);
}

function normalizeInspectableText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeInspectableClueIds(...values) {
  const rawIds = values.flatMap(value => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];
    return [];
  });

  return normalizeClueIdList(rawIds);
}

function getInspectableInspectionCount(inspectableId) {
  const raw = GameState.inspectableHistory?.[inspectableId];
  return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 0;
}

function markInspectableInspected(inspectableId) {
  if (!inspectableId) return;
  if (!GameState.inspectableHistory || typeof GameState.inspectableHistory !== 'object') {
    GameState.inspectableHistory = {};
  }
  GameState.inspectableHistory[inspectableId] = getInspectableInspectionCount(inspectableId) + 1;
}

function doesUserMessageMatchInspectable(userMessage, inspectable) {
  const normalized = slugifyReferenceText(String(userMessage || ''));
  if (!normalized || !inspectable) return false;

  const candidates = [
    inspectable.tag,
    slugifyReferenceText(inspectable.label),
    ...(Array.isArray(inspectable.aliases) ? inspectable.aliases.map(alias => slugifyReferenceText(alias)) : [])
  ].filter(Boolean);

  return candidates.some(candidate => normalized === candidate || normalized.includes(candidate));
}

function buildLocationInspectableItem(location, definition, index, seenLabels, seenTags) {
  const cleanLabel = normalizeInspectableText(definition?.label);
  if (!cleanLabel) return null;

  const normalizedLabel = slugifyReferenceText(cleanLabel);
  if (!normalizedLabel || seenLabels.has(normalizedLabel)) {
    return null;
  }
  seenLabels.add(normalizedLabel);

  let tag = slugifyReferenceText(definition?.tag) || buildInspectableTag(cleanLabel, `incele_${index + 1}`);
  if (!tag) {
    tag = `incele_${index + 1}`;
  }
  if (seenTags.has(tag)) {
    let suffix = 2;
    while (seenTags.has(`${tag}_${suffix}`)) {
      suffix += 1;
    }
    tag = `${tag}_${suffix}`;
  }
  seenTags.add(tag);

  const explicitClueIds = normalizeInspectableClueIds(definition?.reveal_clue_id, definition?.reveal_clue_ids);
  const matchedClueIds = Array.isArray(location.hidden_clues)
    ? location.hidden_clues
      .filter(hiddenClue => explicitClueIds.includes(hiddenClue.clue_id) || doesInspectableMatchHiddenClue(cleanLabel, hiddenClue))
      .map(hiddenClue => hiddenClue.clue_id)
    : [];
  const relatedClueIds = normalizeInspectableClueIds(explicitClueIds, matchedClueIds);
  const aliases = [
    ...normalizeInspectableAliasList(definition?.aliases),
    ...buildInspectableAliases(cleanLabel)
  ].filter((alias, aliasIndex, aliasArray) => alias && aliasArray.indexOf(alias) === aliasIndex);
  const inspectionCount = getInspectableInspectionCount(definition?.id || `inspect_location_${location.id}_${tag}`);

  return {
    kind: 'inspectable',
    type: 'inspectable',
    scope: 'location',
    contextView: 'location',
    contextTarget: location.id,
    id: normalizeInspectableText(definition?.id) || `inspect_location_${location.id}_${tag}`,
    tag,
    displayTag: `#${tag}`,
    label: cleanLabel,
    icon: normalizeInspectableText(definition?.icon) || '🧩',
    subtitle: normalizeInspectableText(definition?.subtitle)
      || (relatedClueIds.length > 0 && relatedClueIds.every(hasFoundClue) ? 'yerel inceleme · kayıtlı iz' : 'yerel inceleme'),
    searchText: [
      tag,
      normalizedLabel,
      ...aliases,
      ...normalizeInspectableAliasList(definition?.search_terms),
      slugifyReferenceText(location.name)
    ].filter(Boolean).join(' '),
    aliases,
    relatedClueIds,
    inspectionCount,
    resolved: relatedClueIds.length > 0
      ? relatedClueIds.every(hasFoundClue)
      : inspectionCount > 0,
    rawDefinition: definition || {}
  };
}

function doesInspectableMatchHiddenClue(inspectableLabel, hiddenClue) {
  if (!inspectableLabel || !hiddenClue) return false;

  try {
    if (GameState.gpt?.isHiddenClueTargeted?.(inspectableLabel, hiddenClue)) {
      return true;
    }
  } catch (err) {
    console.warn('Yerel ipucu eşleme fallback moduna geçti:', err);
  }

  const inspectableWords = buildInspectableAliases(inspectableLabel)
    .join('_')
    .split('_')
    .filter(word => word.length >= 4);
  const hiddenSource = slugifyReferenceText([
    hiddenClue.trigger_hint,
    hiddenClue.reveal_text,
    hiddenClue.clue_id
  ].filter(Boolean).join(' '));

  return inspectableWords.some(word => hiddenSource.includes(word));
}

function buildLocationInspectableItems(location) {
  if (!location) return [];

  const seenLabels = new Set();
  const seenTags = new Set();
  const items = [];

  if (Array.isArray(location.inspectables)) {
    location.inspectables.forEach((definition, index) => {
      const item = buildLocationInspectableItem(location, definition, index, seenLabels, seenTags);
      if (item) items.push(item);
    });
  }

  const labels = [];
  if (Array.isArray(location.interactive_objects)) labels.push(...location.interactive_objects);
  if (Array.isArray(location.visible_elements)) labels.push(...location.visible_elements);

  labels
    .filter(label => typeof label === 'string' && label.trim())
    .forEach((label, index) => {
      const item = buildLocationInspectableItem(location, { label }, index + items.length, seenLabels, seenTags);
      if (item) items.push(item);
    });

  return items;
}

function buildClueInspectableItems(clue) {
  if (!clue) return [];

  const sections = [
    {
      id: 'overview',
      tag: 'ozet',
      label: 'Kısa Özet',
      subtitle: 'yerel inceleme',
      icon: '🧾',
      enabled: Boolean(clue.short_description || clue.description)
    },
    {
      id: 'detail',
      tag: 'detay',
      label: 'Detaylı Okuma',
      subtitle: 'yerel inceleme',
      icon: '🔎',
      enabled: Boolean(clue.detailed_description || clue.short_description)
    },
    {
      id: 'how',
      tag: 'nasil_bulundu',
      label: 'Nasıl Bulundu',
      subtitle: 'yerel inceleme',
      icon: '🪄',
      enabled: Boolean(clue.how_to_unlock)
    },
    {
      id: 'hint',
      tag: 'inceleme_notu',
      label: 'İnceleme Notu',
      subtitle: 'yerel inceleme',
      icon: '📎',
      enabled: Boolean(clue.examination_hints)
    },
    {
      id: 'context',
      tag: 'baglam',
      label: 'Bağlam',
      subtitle: 'spoilersız kısa bağlam',
      icon: '🧠',
      enabled: Boolean(clue.description || clue.narrative_purpose)
    }
  ];

  return sections
    .filter(section => section.enabled)
    .map(section => ({
      kind: 'inspectable',
      type: 'inspectable',
      scope: 'clue',
      contextView: 'clue',
      contextTarget: clue.id,
      id: `inspect_clue_${clue.id}_${section.id}`,
      tag: section.tag,
      displayTag: `#${section.tag}`,
      label: section.label,
      icon: section.icon,
      subtitle: section.subtitle,
      sectionId: section.id,
      searchText: [
        section.tag,
        slugifyReferenceText(section.label),
        slugifyReferenceText(clue.name),
        slugifyReferenceText(clue.tag || '')
      ].filter(Boolean).join(' '),
      aliases: [section.tag, slugifyReferenceText(section.label)],
      resolved: false
    }));
}

function getCurrentInspectableItems() {
  if (!GameState.scenario) return [];

  if (GameState.currentView === 'location' && GameState.currentTarget) {
    return buildLocationInspectableItems(getEntityById('location', GameState.currentTarget));
  }

  if (GameState.currentView === 'clue' && GameState.currentTarget) {
    return buildClueInspectableItems(getEntityById('clue', GameState.currentTarget));
  }

  return [];
}

function getTaggableItems() {
  return [...getCurrentInspectableItems(), ...getKnownReferenceItems()];
}

function resolveDirectInspectableCommand(text) {
  const normalized = slugifyReferenceText(String(text || '').replace(/^#/, '').trim());
  if (!normalized) return null;

  return getCurrentInspectableItems().find(item => (
    item.tag === normalized ||
    slugifyReferenceText(item.label) === normalized ||
    (Array.isArray(item.aliases) && item.aliases.some(alias => slugifyReferenceText(alias) === normalized))
  )) || null;
}

function buildLocationInspectableRawResponse(location, inspectable) {
  if (!location || !inspectable) return null;

  const inspectionCount = getInspectableInspectionCount(inspectable.id);
  const inspectText = normalizeInspectableText(inspectable.rawDefinition?.inspect_text);
  const repeatText = normalizeInspectableText(inspectable.rawDefinition?.repeat_text);
  const noRevealText = normalizeInspectableText(inspectable.rawDefinition?.no_reveal_text);
  const revealText = normalizeInspectableText(inspectable.rawDefinition?.reveal_text);
  const summaryText = normalizeInspectableText(inspectable.rawDefinition?.summary_text);
  const repeatSummaryText = normalizeInspectableText(inspectable.rawDefinition?.repeat_summary_text);
  const revealSummaryText = normalizeInspectableText(inspectable.rawDefinition?.reveal_summary_text);

  const matchingHiddenClues = Array.isArray(location.hidden_clues)
    ? location.hidden_clues.filter(hiddenClue => inspectable.relatedClueIds.includes(hiddenClue.clue_id))
    : [];

  const newClueIds = inspectable.relatedClueIds.filter(clueId => clueId && !hasFoundClue(clueId));

  if (newClueIds.length > 0) {
    const derivedRevealText = matchingHiddenClues
      .filter(hiddenClue => newClueIds.includes(hiddenClue.clue_id))
      .map(hiddenClue => hiddenClue.reveal_text)
      .filter(Boolean)
      .join('\n\n');
    const composedText = [
      inspectText,
      revealText || derivedRevealText
    ].filter(Boolean).join('\n\n') || `${inspectable.label} üzerinde durunca yeni bir ayrıntı açılıyor.`;

    return {
      text: composedText,
      clues_found: newClueIds,
      summary: revealSummaryText || `${inspectable.label} incelendi; yeni bir iz kayda geçti.`
    };
  }

  const configuredText = inspectionCount > 0
    ? (repeatText || noRevealText || inspectText)
    : (inspectText || noRevealText);

  if (configuredText) {
    return {
      text: configuredText,
      clues_found: [],
      summary: inspectionCount > 0
        ? (repeatSummaryText || `${inspectable.label} yeniden kontrol edildi.`)
        : (summaryText || `${inspectable.label} incelendi.`)
    };
  }

  const knownRelatedClues = matchingHiddenClues
    .map(hiddenClue => getEntityById('clue', hiddenClue.clue_id))
    .filter(Boolean)
    .filter(clue => hasFoundClue(clue.id));

  if (knownRelatedClues.length > 0) {
    const knownText = knownRelatedClues
      .map(clue => `${clue.name}: ${clue.detailed_description || clue.short_description}`)
      .join('\n\n');

    return {
      text: `${inspectable.label} zaten kayıtlarında duran bir izi doğruluyor:\n${knownText}`,
      clues_found: [],
      summary: `${inspectable.label} yeniden kontrol edildi.`
    };
  }

  const fallbackDescription = compactReferenceText(
    location.description || location.sensory_atmosphere || location.atmosphere,
    150
  );
  const supportingVisible = Array.isArray(location.visible_elements)
    ? location.visible_elements.find(element => {
      const elementSlug = slugifyReferenceText(element);
      return elementSlug.includes(inspectable.tag) || inspectable.searchText.includes(elementSlug);
    })
    : '';

  const details = [
    `${inspectable.label} bu mekânda dikkat çeken sabit parçalardan biri.`,
    supportingVisible && supportingVisible !== inspectable.label ? `${supportingVisible} bunu destekliyor.` : '',
    fallbackDescription ? `${fallbackDescription} Şimdilik yeni bir delil vermiyor.` : 'Şimdilik yeni bir delil vermiyor.'
  ].filter(Boolean).join(' ');

  return {
    text: details,
    clues_found: [],
    summary: `${inspectable.label} incelendi.`
  };
}

function buildClueInspectableRawResponse(clue, inspectable) {
  if (!clue || !inspectable) return null;

  let text = '';
  switch (inspectable.sectionId) {
    case 'overview':
      text = clue.short_description || clue.description || '';
      break;
    case 'detail':
      text = clue.detailed_description || clue.short_description || clue.description || '';
      break;
    case 'how':
      text = clue.how_to_unlock ? `Bu iz şu dikkatle ortaya çıkıyor: ${clue.how_to_unlock}` : '';
      break;
    case 'hint':
      text = clue.examination_hints || '';
      break;
    case 'context':
      text = clue.description || clue.narrative_purpose || clue.short_description || '';
      break;
    default:
      text = clue.short_description || '';
      break;
  }

  if (!text) return null;

  return {
    text: `${clue.name} · ${inspectable.label}\n${text}`,
    clues_found: [],
    summary: `${clue.name} içinde ${inspectable.label.toLocaleLowerCase('tr-TR')} açıldı.`
  };
}

function buildInspectableRawResponse(inspectable) {
  if (!inspectable) return null;

  if (inspectable.scope === 'location') {
    const location = getEntityById('location', inspectable.contextTarget);
    return buildLocationInspectableRawResponse(location, inspectable);
  }

  if (inspectable.scope === 'clue') {
    const clue = getEntityById('clue', inspectable.contextTarget);
    return buildClueInspectableRawResponse(clue, inspectable);
  }

  return null;
}

function buildInspectableResponseBundle(inspectableItems) {
  const sections = [];
  const clueIds = [];
  const labels = [];

  inspectableItems.forEach(item => {
    const raw = buildInspectableRawResponse(item);
    if (!raw?.text) return;

    sections.push(raw.text);
    labels.push(item.label);
    clueIds.push(...(Array.isArray(raw.clues_found) ? raw.clues_found : []));
  });

  if (sections.length === 0) return null;

  const uniqueClueIds = normalizeClueIdList(clueIds);
  const summary = uniqueClueIds.length > 0
    ? `${labels.join(', ')} incelendi; ${uniqueClueIds.map(getCharacterClueLabel).join(', ')} kayda geçti.`
    : `${labels.join(', ')} incelendi.`;

  return {
    text: sections.join('\n\n'),
    clues_found: uniqueClueIds,
    summary
  };
}

async function appendLocalInspectableResponse(inspectableItems, options = {}) {
  const key = getCurrentConversationKey();
  if (!key || !Array.isArray(inspectableItems) || inspectableItems.length === 0) return false;

  const rawResponse = buildInspectableResponseBundle(inspectableItems);
  if (!rawResponse) return false;

  const interactionType = GameState.currentView === 'location' ? 'location_chat' : 'clue_examine';
  const guardMessage = inspectableItems.map(item => item.label).join(' ');
  const safeResponse = applySpoilerGuardsToResponse(
    rawResponse,
    interactionType,
    GameState.currentTarget,
    guardMessage,
    null,
    'local-inspect'
  );

  if (!safeResponse.text) return false;

  const senderName = options.senderName || (GameState.currentView === 'clue' ? '🔍 Yerel İnceleme' : '🧩 Yerel İnceleme');

  inspectableItems.forEach(item => markInspectableInspected(item.id));

  addMessage(key, 'assistant', safeResponse.text, {
    senderName,
    isClueFound: safeResponse.clues_found.length > 0,
    foundClueIds: safeResponse.clues_found,
    messageKind: 'local-inspect'
  });
  UI.addChatMessage('assistant', safeResponse.text, senderName, safeResponse.clues_found.length > 0, safeResponse.clues_found, 'local-inspect');

  GameState.totalTurns += 1;
  processFoundClues(safeResponse.clues_found);
  appendSummary(key, safeResponse.summary);
  await SaveManager.saveNow();
  UI.updateHeader();
  return true;
}

function getReferenceMatches(query = '') {
  const normalizedQuery = slugifyReferenceText(query);
  const items = getTaggableItems();
  if (!normalizedQuery) {
    return items.slice(0, 8);
  }

  return items
    .filter(item => item.searchText.includes(normalizedQuery))
    .sort((left, right) => {
      const leftStarts = left.tag.startsWith(normalizedQuery) ? 0 : 1;
      const rightStarts = right.tag.startsWith(normalizedQuery) ? 0 : 1;
      if (leftStarts !== rightStarts) return leftStarts - rightStarts;
      return left.label.localeCompare(right.label, 'tr');
    })
    .slice(0, 8);
}

function resolveReferenceTag(tagValue) {
  const tag = slugifyReferenceText(String(tagValue || '').replace(/^#/, ''));
  if (!tag) return null;
  return getTaggableItems().find(item => item.tag === tag) || null;
}

function replaceReferenceTagsInText(text) {
  return String(text || '').replace(/(^|\s)#([^\s#.,;:!?()]+)/g, (match, prefix, tagValue) => {
    const reference = resolveReferenceTag(tagValue);
    if (!reference) return match;
    return `${prefix}${reference.label}`;
  });
}

function extractReferenceItemsFromText(text) {
  const matches = [...String(text || '').matchAll(/(^|\s)#([^\s#.,;:!?()]+)/g)];
  return matches
    .map(match => resolveReferenceTag(match[2]))
    .filter(Boolean)
    .filter((item, index, array) => array.findIndex(candidate => candidate.type === item.type && candidate.id === item.id) === index);
}

function isPureReferenceQuery(text) {
  const value = String(text || '').trim();
  if (!value) return false;
  return /^\s*(#[^\s#.,;:!?()]+[\s,;:!?]*)+$/u.test(value);
}

function getCurrentContextLabel() {
  if (!GameState.currentView) return '';
  if (GameState.currentView === 'advisor') return GameState.scenario?.advisor?.name || 'Danışman';
  const entity = getEntityById(GameState.currentView, GameState.currentTarget);
  return entity?.name || '';
}

async function appendLocalReferenceResponse(referenceItems, options = {}) {
  const key = getCurrentConversationKey();
  if (!key || !Array.isArray(referenceItems) || referenceItems.length === 0) return false;

  const content = referenceItems
    .map(item => buildQuickReferenceText(item.type, item.id))
    .filter(Boolean)
    .join('\n\n');

  if (!content) return false;

  addMessage(key, 'assistant', content, {
    senderName: options.senderName || '⚡ Hızlı Bakış',
    messageKind: 'local-reference'
  });
  UI.addChatMessage('assistant', content, options.senderName || '⚡ Hızlı Bakış', false, [], 'local-reference');
  await SaveManager.saveNow();
  return true;
}

function seedClueConversationSummary(clue, sourceLabel = '') {
  if (!clue) return;

  const key = getConversationKey('clue', clue.id);
  if (!GameState.conversations[key]) {
    GameState.conversations[key] = [];
  }

  const hasSeed = GameState.conversations[key].some(message => message.messageKind === 'clue-seed');
  if (hasSeed) return;

  GameState.conversations[key].push(createConversationEntry('assistant', buildQuickReferenceText('clue', clue.id, { sourceLabel }), {
    senderName: '📎 Hızlı Not',
    messageKind: 'clue-seed'
  }));
}

function seedKnownClueConversationSummaries() {
  GameState.foundClues.forEach(clue => seedClueConversationSummary(clue));
}

function getReferenceTagForEntity(type, entityId) {
  const entity = getReferenceEntity(type, entityId);
  return entity ? formatEntityReferenceTag(type, entity) : '';
}

function getReferenceAutocompleteElement() {
  return document.getElementById('tag-autocomplete');
}

function closeReferenceAutocomplete() {
  const panel = getReferenceAutocompleteElement();
  if (panel) {
    panel.innerHTML = '';
    panel.classList.remove('open');
  }

  ReferenceUIState.matches = [];
  ReferenceUIState.activeIndex = 0;
  ReferenceUIState.activeTokenRange = null;
  ReferenceUIState.isOpen = false;
}

function getActiveReferenceToken(value, caretPosition) {
  const uptoCaret = String(value || '').slice(0, caretPosition);
  const match = uptoCaret.match(/(^|\s)#([^\s#]*)$/u);
  if (!match) return null;

  const leading = match[1] || '';
  const tokenText = match[0].slice(leading.length);
  const tokenStart = caretPosition - tokenText.length;

  return {
    query: match[2] || '',
    start: tokenStart,
    end: caretPosition
  };
}

function renderReferenceAutocomplete() {
  const panel = getReferenceAutocompleteElement();
  if (!panel) return;

  if (!ReferenceUIState.isOpen || ReferenceUIState.matches.length === 0) {
    closeReferenceAutocomplete();
    return;
  }

  panel.innerHTML = '';
  ReferenceUIState.matches.forEach((item, index) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'tag-option' + (index === ReferenceUIState.activeIndex ? ' active' : '');
    option.innerHTML = `
      <span class="tag-option-icon">${item.icon}</span>
      <span class="tag-option-main">
        <span class="tag-option-tag">${item.displayTag}</span>
        <span class="tag-option-label">${item.label}</span>
      </span>
      <span class="tag-option-type">${item.type === 'location' ? 'mekan' : item.type === 'character' ? 'şüpheli' : item.type === 'advisor' ? 'danışman' : item.type === 'inspectable' ? 'inceleme' : 'ipucu'}</span>
    `;

    option.addEventListener('mousedown', event => {
      event.preventDefault();
      selectReferenceAutocompleteItem(index);
    });
    option.addEventListener('mouseenter', () => {
      ReferenceUIState.activeIndex = index;
      renderReferenceAutocomplete();
    });
    panel.appendChild(option);
  });

  panel.classList.add('open');
}

function updateReferenceAutocomplete() {
  const input = document.getElementById('user-input');
  if (!input || !GameState.scenario) {
    closeReferenceAutocomplete();
    return;
  }

  const token = getActiveReferenceToken(input.value, input.selectionStart ?? input.value.length);
  if (!token) {
    closeReferenceAutocomplete();
    return;
  }

  const matches = getReferenceMatches(token.query);
  if (matches.length === 0) {
    closeReferenceAutocomplete();
    return;
  }

  ReferenceUIState.matches = matches;
  ReferenceUIState.activeIndex = Math.min(ReferenceUIState.activeIndex, matches.length - 1);
  ReferenceUIState.activeTokenRange = { start: token.start, end: token.end };
  ReferenceUIState.isOpen = true;
  renderReferenceAutocomplete();
}

function selectReferenceAutocompleteItem(index) {
  const input = document.getElementById('user-input');
  const item = ReferenceUIState.matches[index];
  const range = ReferenceUIState.activeTokenRange;
  if (!input || !item || !range) {
    closeReferenceAutocomplete();
    return;
  }

  const before = input.value.slice(0, range.start);
  const after = input.value.slice(range.end);
  const insertion = `${item.displayTag} `;
  input.value = before + insertion + after;

  const caret = before.length + insertion.length;
  input.focus();
  input.setSelectionRange(caret, caret);
  closeReferenceAutocomplete();
}

function handleReferenceAutocompleteKeydown(event) {
  if (!ReferenceUIState.isOpen || ReferenceUIState.matches.length === 0) return false;

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    ReferenceUIState.activeIndex = (ReferenceUIState.activeIndex + 1) % ReferenceUIState.matches.length;
    renderReferenceAutocomplete();
    return true;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    ReferenceUIState.activeIndex = (ReferenceUIState.activeIndex - 1 + ReferenceUIState.matches.length) % ReferenceUIState.matches.length;
    renderReferenceAutocomplete();
    return true;
  }

  if (event.key === 'Enter' || event.key === 'Tab') {
    event.preventDefault();
    selectReferenceAutocompleteItem(ReferenceUIState.activeIndex);
    return true;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    closeReferenceAutocomplete();
    return true;
  }

  return false;
}

function setupReferenceAutocomplete() {
  const input = document.getElementById('user-input');
  if (!input || input.dataset.referenceBound) return;

  input.addEventListener('input', updateReferenceAutocomplete);
  input.addEventListener('click', updateReferenceAutocomplete);
  input.addEventListener('keyup', event => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'Enter' || event.key === 'Tab' || event.key === 'Escape') {
      return;
    }
    updateReferenceAutocomplete();
  });

  document.addEventListener('click', event => {
    const panel = getReferenceAutocompleteElement();
    if (!panel) return;
    if (event.target === input || panel.contains(event.target)) return;
    closeReferenceAutocomplete();
  });

  input.dataset.referenceBound = 'true';
}

function clampCharacterMetric(value) {
  const numeric = Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function normalizeSearchText(value) {
  return String(value || '').toLocaleLowerCase('tr-TR');
}

function getCharacterClueLabel(clueId) {
  const clue = GameState.scenario?.clues?.find(item => item.id === clueId);
  return clue?.name || clueId;
}

function getCharacterReactionProfile(character) {
  const speechSource = normalizeSearchText(character.speech_style || '');
  const appearanceSource = normalizeSearchText(character.appearance || '');
  const profileSource = normalizeSearchText([
    character.personality,
    character.speech_style,
    character.background,
    character.psychological_profile?.pressure_response,
    character.psychological_profile?.lying_style,
    character.psychological_profile?.public_mask,
    character.gpt_instructions
  ].filter(Boolean).join(' '));

  return {
    aggressive: /(sert|saldırgan|saldirgan|dominant|tehdit|otoriter|agresif|öfke|ofke|buyurgan|sivri|alaycı|alayci)/.test(profileSource),
    fearful: /(güvensiz|guvensiz|kork|panik|suçluluk|sucluluk|çekingen|cekingen|ürkek|urke|savunmada|tetikte|kapanır|kapanir)/.test(profileSource),
    closed: /(ketum|sessiz|içe dönük|ice donuk|içe kapan|ice kapan|az konuşur|az konusur|ölçülü|olculu|temkinli)/.test(profileSource),
    manipulative: /(manip|aktris|oynar|ikili oyn|hesapçı|hesapci|çerçeve|cerceve|samimi görün|samimi gorun)/.test(profileSource),
    formal: /(resmi|bürokratik|burokratik|kurumsal|prosedür|prosedur|akademik|gazeteci dili)/.test(profileSource),
    fast: /(hızlı|hizli|parçalı|parcali|tekrar eder|hızlanır|hizlanir)/.test(speechSource),
    slow: /(yavaş|yavas|ölçülü|olculu|uzun sessizlik|düşük ton|dusuk ton)/.test(speechSource),
    stammer: /(kekele|kekeleme|duraksar|takılır|takilir)/.test(speechSource),
    lowTone: /(düşük ton|dusuk ton|yumuşak|yumusak|fısıltı|fisilti)/.test(speechSource),
    sharp: /(sert|sivri|keskin|kısa|kisa cümle|kisa cumle)/.test(speechSource),
    appearanceSource,
    speechSource,
    profileSource
  };
}

function getInterrogationProfile(character) {
  const profile = character.interrogation_profile && typeof character.interrogation_profile === 'object'
    ? character.interrogation_profile
    : {};
  const reactionProfile = getCharacterReactionProfile(character);

  let stressResponse = profile.stress_response;
  if (!stressResponse) {
    if (reactionProfile.manipulative) stressResponse = 'performative_mask';
    else if (reactionProfile.aggressive) stressResponse = 'combative_leak';
    else if (reactionProfile.fearful) stressResponse = 'fragile_spill';
    else if (reactionProfile.closed) stressResponse = 'stoic_withdraw';
    else if (reactionProfile.formal) stressResponse = 'formal_bargainer';
    else stressResponse = 'grief_soften';
  }

  const defaultRoutes = {
    fragile_spill: ['evidence', 'contradiction', 'calm', 'return_later'],
    grief_soften: ['empathy', 'personal_memory', 'return_later', 'calm'],
    stoic_withdraw: ['respect', 'return_later', 'evidence'],
    combative_leak: ['evidence', 'contradiction', 'respect'],
    performative_mask: ['evidence', 'contradiction', 'return_later'],
    formal_bargainer: ['respect', 'evidence', 'return_later']
  };

  return {
    stressResponse,
    unlockRoutes: Array.isArray(profile.unlock_routes) && profile.unlock_routes.length > 0
      ? profile.unlock_routes
      : (defaultRoutes[stressResponse] || ['evidence', 'return_later']),
    cooldownTurns: Number.isFinite(profile.cooldown_turns)
      ? Math.max(1, Math.round(profile.cooldown_turns))
      : (stressResponse === 'performative_mask' ? 2 : 1),
    hiddenWeakSpot: typeof profile.hidden_weak_spot === 'string' ? profile.hidden_weak_spot : '',
    pressureWindow: typeof profile.pressure_window === 'string' ? profile.pressure_window : 'medium'
  };
}

function hasUnlockRoute(profile, route) {
  return Array.isArray(profile?.unlockRoutes) && profile.unlockRoutes.includes(route);
}

function getSignalSnapshot(state) {
  return {
    pressure: state.pressure,
    fear: state.fear,
    hostility: state.hostility,
    guard: state.guard,
    trust: state.trust,
    energy: state.energy,
    closureLevel: state.closureLevel,
    breakthrough: state.breakthrough
  };
}

function crossedUp(previousSnapshot, key, threshold, currentValue) {
  if (!previousSnapshot || !Number.isFinite(previousSnapshot[key])) return false;
  return previousSnapshot[key] < threshold && currentValue >= threshold;
}

function crossedDown(previousSnapshot, key, threshold, currentValue) {
  if (!previousSnapshot || !Number.isFinite(previousSnapshot[key])) return false;
  return previousSnapshot[key] >= threshold && currentValue < threshold;
}

function createPresenceCue(text, source = 'base') {
  const value = typeof text === 'string' ? text.trim() : '';
  if (!value) return null;
  return {
    text: value,
    source: source === 'dynamic' ? 'dynamic' : 'base'
  };
}

function getPresenceCueText(cue) {
  if (typeof cue === 'string') return cue.trim();
  return typeof cue?.text === 'string' ? cue.text.trim() : '';
}

function pushCue(list, cue, max = 3) {
  const text = getPresenceCueText(cue);
  if (!text || list.length >= max) return;
  if (list.some(item => getPresenceCueText(item) === text)) return;
  list.push(typeof cue === 'string' ? createPresenceCue(cue) : cue);
}

function pushDynamicCue(list, cue, max = 3) {
  const normalizedCue = createPresenceCue(cue, 'dynamic');
  if (!normalizedCue) return;
  pushCue(list, normalizedCue, max);
}

function extractBaseAppearanceCues(character, reactionProfile) {
  const source = normalizeSearchText([
    character.appearance,
    character.personality,
    character.current_state?.outward_mood
  ].filter(Boolean).join(' '));
  const cues = [];

  if (/gözaltı|gozalti|uykusuz/.test(source)) pushCue(cues, 'uykusuz');
  if (/gözlük|gozluk/.test(source)) pushCue(cues, 'gözlüğünü düzeltiyor');
  if (/sigara/.test(source)) pushCue(cues, 'üstüne sigara kokusu sinmiş');
  if (/titreme|titriyor|titrek/.test(source)) pushCue(cues, 'elleri hafif titriyor');
  if (/şişmiş|sismis/.test(source)) pushCue(cues, 'gözleri şiş');
  if (/dağınık saç|daginik sac/.test(source)) pushCue(cues, 'saçları dağınık');
  if (/keskin bakış|keskin bakis/.test(source)) pushCue(cues, 'bakışları keskin');
  if (/bakımlı|bakimli/.test(source)) pushCue(cues, 'bakımlı');
  if (/sert bir ifade|sert ifade/.test(source)) pushCue(cues, 'yüzü sert');
  if (/gülümseme|gulumseme/.test(source)) pushCue(cues, 'ölçülü bir ifade taşıyor');
  if (/yorgun/.test(source)) pushCue(cues, 'yorgun görünüyor');

  if (cues.length === 0) {
    if (reactionProfile.closed) pushCue(cues, 'yüzünü kontrollü tutuyor');
    if (reactionProfile.aggressive) pushCue(cues, 'bakışları sert');
    if (reactionProfile.fearful) pushCue(cues, 'dikkati dağınık görünüyor');
  }

  if (cues.length === 0) {
    pushCue(cues, 'dışarıdan okunması zor');
  }

  return cues;
}

function extractBaseVoiceCues(character, reactionProfile) {
  const source = normalizeSearchText(character.speech_style || '');
  const cues = [];

  if (reactionProfile.stammer) pushCue(cues, 'hafif kekeliyor');
  if (reactionProfile.fast) pushCue(cues, 'hızlı konuşuyor');
  if (reactionProfile.slow) pushCue(cues, 'yavaş konuşuyor');
  if (reactionProfile.lowTone) pushCue(cues, 'sesi düşük');
  if (reactionProfile.formal) pushCue(cues, 'resmi konuşuyor');
  if (reactionProfile.sharp) pushCue(cues, 'kısa cümleler kuruyor');
  if (/alaycı|alayci/.test(source)) pushCue(cues, 'alaycı bir ton var');
  if (/sorulara soruyla|soruyla karşılık|soruyla karsilik/.test(source)) pushCue(cues, 'soruyu geri çeviriyor');
  if (/ankara|anadolu ağzı|anadolu agzi|istanbul ağzı|istanbul agzi/.test(source)) pushCue(cues, 'ağzı yer yer belirginleşiyor');

  if (cues.length === 0) {
    pushCue(cues, 'temkinli konuşuyor');
  }

  return cues;
}

function buildVisibleAppearanceCues(character, state, reactionProfile, previousSnapshot = null) {
  const cues = [];

  if (state.pressure >= 80 && state.energy <= 45) {
    pushDynamicCue(cues, crossedUp(previousSnapshot, 'pressure', 80, state.pressure) ? 'yüzü soldu' : 'soluk');
  }
  if (state.pressure >= 72) {
    pushDynamicCue(
      cues,
      state.fear >= state.hostility
        ? (crossedUp(previousSnapshot, 'pressure', 72, state.pressure) ? 'terlemeye başladı' : 'terli')
        : (crossedUp(previousSnapshot, 'pressure', 72, state.pressure) ? 'yüzü gerildi' : 'yüzü gergin')
    );
  }
  if (state.fear >= 68) {
    pushDynamicCue(cues, crossedUp(previousSnapshot, 'fear', 68, state.fear) ? 'bakışları kaçmaya başladı' : 'bakışları kaçıyor');
  } else if (state.fear >= 45) {
    pushDynamicCue(cues, crossedUp(previousSnapshot, 'fear', 45, state.fear) ? 'göz hareketi arttı' : 'göz hareketi artmış');
  } else if (crossedDown(previousSnapshot, 'fear', 45, state.fear)) {
    pushDynamicCue(cues, 'bakışı biraz toplandı');
  }
  if (state.hostility >= 68) {
    pushDynamicCue(cues, crossedUp(previousSnapshot, 'hostility', 68, state.hostility) ? 'yüzü kızardı' : 'kaşları çatık');
  } else if (state.hostility >= 45) {
    pushDynamicCue(cues, crossedUp(previousSnapshot, 'hostility', 45, state.hostility) ? 'çenesi kasıldı' : 'çenesi sıkı');
  }
  if (state.energy <= 32) pushDynamicCue(cues, crossedDown(previousSnapshot, 'energy', 32, state.energy) ? 'iyice yoruldu' : 'yorgun');
  if (state.maskIntegrity <= 38) pushDynamicCue(cues, crossedUp(previousSnapshot, 'closureLevel', 2, state.closureLevel) ? 'ifadesi çatladı' : 'ifadesi dağılıyor');
  if (state.trust >= 65 && state.guard <= 45) pushDynamicCue(cues, crossedDown(previousSnapshot, 'guard', 45, state.guard) ? 'bakışı açıldı' : 'daha açık bakıyor');

  extractBaseAppearanceCues(character, reactionProfile).forEach(cue => pushCue(cues, cue));
  return cues.slice(0, 3);
}

function buildVoiceToneCues(character, state, reactionProfile, previousSnapshot = null) {
  const cues = [];

  if (state.hostility >= 68) {
    pushDynamicCue(cues, reactionProfile.lowTone
      ? (crossedUp(previousSnapshot, 'hostility', 68, state.hostility) ? 'sesi kalınlaştı' : 'sesi alçalıp sertleşiyor')
      : (crossedUp(previousSnapshot, 'hostility', 68, state.hostility) ? 'sesi sertleşti' : 'sert konuşuyor'));
  }
  if (state.fear >= 68) {
    pushDynamicCue(cues, reactionProfile.stammer
      ? (crossedUp(previousSnapshot, 'fear', 68, state.fear) ? 'kekelemeye başladı' : 'hafif kekeliyor')
      : reactionProfile.fast
        ? (crossedUp(previousSnapshot, 'fear', 68, state.fear) ? 'cümleleri kırıldı' : 'hızlı ve kırık konuşuyor')
        : (crossedUp(previousSnapshot, 'fear', 68, state.fear) ? 'sesi inceldi' : 'sesi inceliyor'));
  }
  if (state.pressure >= 72) {
    pushDynamicCue(cues, reactionProfile.fast
      ? (crossedUp(previousSnapshot, 'pressure', 72, state.pressure) ? 'cümleleri hızlandı' : 'çok hızlı konuşuyor')
      : (crossedUp(previousSnapshot, 'pressure', 72, state.pressure) ? 'cümleleri kopmaya başladı' : 'cümleleri kopuyor'));
  }
  if (state.guard >= 75) pushDynamicCue(cues, crossedUp(previousSnapshot, 'guard', 75, state.guard) ? 'kelimelerini daha çok seçiyor' : 'kelimelerini seçiyor');
  if (state.trust >= 60 && state.guard <= 50) pushDynamicCue(cues, crossedDown(previousSnapshot, 'guard', 50, state.guard) ? 'sesi biraz çözüldü' : 'daha açık konuşuyor');

  extractBaseVoiceCues(character, reactionProfile).forEach(cue => pushCue(cues, cue));
  return cues.slice(0, 3);
}

function syncCharacterStateDescriptors(character, state, previousSnapshot = null) {
  const reactionProfile = getCharacterReactionProfile(character);
  const interrogationProfile = getInterrogationProfile(character);
  const pressureLabel = state.pressure >= 75 ? 'köşeye sıkışmış' : state.pressure >= 45 ? 'gergin' : 'kontrollü';
  const guardLabel = state.guard >= 75 ? 'çok kapalı' : state.guard >= 45 ? 'temkinli' : 'daha açık';
  const energyLabel = state.energy <= 30 ? 'yorgun' : state.energy <= 60 ? 'ayakta kalıyor' : 'enerjisini koruyor';
  const trustLabel = state.trust >= 70 ? 'beklenmedik ölçüde ısınmış' : state.trust >= 40 ? 'mesafesi azalıyor' : 'mesafesini koruyor';
  const maskLabel = state.maskIntegrity <= 30 ? 'maskesi çatlıyor' : state.maskIntegrity <= 60 ? 'maskesini zor tutuyor' : 'maskesini koruyor';

  state.currentBehavior = `${pressureLabel}, ${guardLabel}, ${energyLabel}`;
  state.disclosureMode = state.openness >= 70 || state.trust >= 70
    ? 'açılmaya yakın'
    : state.maskIntegrity <= 30
      ? 'sakladıkları yüzeye çıkıyor'
      : state.guard >= 75
        ? 'bilgiyi sıkı tutuyor'
        : 'ölçülü bilgi veriyor';
  state.socialRead = `${trustLabel}; ${maskLabel}`;
  state.responseMode = state.fear >= 65 && state.hostility < 55
    ? 'ürküp içine kapanıyor'
    : state.hostility >= 65
      ? 'sertleşip karşılık veriyor'
      : reactionProfile.manipulative && state.maskIntegrity >= 60
        ? 'sakince yönlendirmeye çalışıyor'
        : state.guard >= 75
          ? 'ölçüp biçerek cevap veriyor'
          : 'temkinli ama yanıt veriyor';
    if (state.closureLevel >= 3) {
      state.responseMode = 'kendini tamamen kapatıyor';
    } else if (state.closureLevel === 2) {
      state.responseMode = interrogationProfile.stressResponse === 'combative_leak'
        ? 'sinirden toparlanmakta zorlanıyor'
        : 'cevap vermekte zorlanıyor';
    } else if (state.breakthrough >= 70) {
      state.responseMode = 'açılmaya başladı';
    }
    state.visibleAppearance = buildVisibleAppearanceCues(character, state, reactionProfile, previousSnapshot);
    state.voiceTone = buildVoiceToneCues(character, state, reactionProfile, previousSnapshot);
    state.lastSignalSnapshot = getSignalSnapshot(state);
}

function createCharacterState(character) {
  const scenarioState = character.current_state && typeof character.current_state === 'object'
    ? character.current_state
    : {};
  const isCulprit = GameState.scenario?.solution?.culprit_id === character.id;
  const hasHeavySecretLoad = Array.isArray(character.secrets) && character.secrets.length >= 4;
  const reactionProfile = getCharacterReactionProfile(character);

  const state = {
    outwardMood: typeof scenarioState.outward_mood === 'string'
      ? scenarioState.outward_mood
      : isCulprit
        ? 'sakin ve kontrollü'
        : hasHeavySecretLoad
          ? 'temkinli ve ölçülü'
          : 'ölçülü ve mesafeli',
    innerState: typeof scenarioState.inner_state === 'string'
      ? scenarioState.inner_state
      : isCulprit
        ? 'kontrolü kaybetmekten korkuyor'
        : hasHeavySecretLoad
          ? 'tetikte ve savunmada'
          : 'olayları tartıyor',
    energy: clampCharacterMetric(Number.isFinite(scenarioState.energy) ? scenarioState.energy : 65),
    guard: clampCharacterMetric(Number.isFinite(scenarioState.guard) ? scenarioState.guard : isCulprit ? 85 : hasHeavySecretLoad ? 72 : 58),
    pressure: clampCharacterMetric(Number.isFinite(scenarioState.pressure) ? scenarioState.pressure : isCulprit ? 38 : 24),
    trust: clampCharacterMetric(Number.isFinite(scenarioState.trust) ? scenarioState.trust : 20),
    maskIntegrity: clampCharacterMetric(Number.isFinite(scenarioState.mask_integrity) ? scenarioState.mask_integrity : isCulprit ? 92 : 76),
    openness: clampCharacterMetric(Number.isFinite(scenarioState.openness) ? scenarioState.openness : 18),
    fear: clampCharacterMetric(Number.isFinite(scenarioState.fear) ? scenarioState.fear : reactionProfile.fearful ? 46 : hasHeavySecretLoad ? 30 : 18),
    hostility: clampCharacterMetric(Number.isFinite(scenarioState.hostility) ? scenarioState.hostility : reactionProfile.aggressive ? 34 : 12),
    breakthrough: clampCharacterMetric(Number.isFinite(scenarioState.breakthrough) ? scenarioState.breakthrough : Math.max(0, (Number.isFinite(scenarioState.openness) ? scenarioState.openness : 18) - 5)),
    closureLevel: Number.isFinite(scenarioState.closure_level) ? Math.max(0, Math.min(3, Math.round(scenarioState.closure_level))) : 0,
    lastInteractionTurn: Number.isFinite(scenarioState.last_interaction_turn) ? Math.max(0, Math.round(scenarioState.last_interaction_turn)) : 0,
    lastPlayerApproach: 'notr',
    lastPressureSource: '',
    triggeredClues: [],
    currentBehavior: '',
    disclosureMode: '',
    socialRead: '',
    responseMode: '',
    visibleAppearance: [],
    voiceTone: [],
    lastSignalSnapshot: null
  };

  syncCharacterStateDescriptors(character, state);
  return state;
}

function sanitizeCharacterState(character, rawState = {}) {
  const base = createCharacterState(character);
  const state = {
    outwardMood: typeof rawState.outwardMood === 'string' ? rawState.outwardMood : base.outwardMood,
    innerState: typeof rawState.innerState === 'string' ? rawState.innerState : base.innerState,
    energy: clampCharacterMetric(Number.isFinite(rawState.energy) ? rawState.energy : base.energy),
    guard: clampCharacterMetric(Number.isFinite(rawState.guard) ? rawState.guard : base.guard),
    pressure: clampCharacterMetric(Number.isFinite(rawState.pressure) ? rawState.pressure : base.pressure),
    trust: clampCharacterMetric(Number.isFinite(rawState.trust) ? rawState.trust : base.trust),
    maskIntegrity: clampCharacterMetric(Number.isFinite(rawState.maskIntegrity) ? rawState.maskIntegrity : base.maskIntegrity),
    openness: clampCharacterMetric(Number.isFinite(rawState.openness) ? rawState.openness : base.openness),
    fear: clampCharacterMetric(Number.isFinite(rawState.fear) ? rawState.fear : base.fear),
    hostility: clampCharacterMetric(Number.isFinite(rawState.hostility) ? rawState.hostility : base.hostility),
    breakthrough: clampCharacterMetric(Number.isFinite(rawState.breakthrough) ? rawState.breakthrough : base.breakthrough),
    closureLevel: Number.isFinite(rawState.closureLevel) ? Math.max(0, Math.min(3, Math.round(rawState.closureLevel))) : base.closureLevel,
    lastInteractionTurn: Number.isFinite(rawState.lastInteractionTurn) ? Math.max(0, Math.round(rawState.lastInteractionTurn)) : base.lastInteractionTurn,
    lastPlayerApproach: typeof rawState.lastPlayerApproach === 'string' ? rawState.lastPlayerApproach : base.lastPlayerApproach,
    lastPressureSource: typeof rawState.lastPressureSource === 'string' ? rawState.lastPressureSource : base.lastPressureSource,
    triggeredClues: Array.isArray(rawState.triggeredClues)
      ? rawState.triggeredClues.filter(clueId => typeof clueId === 'string' && character.triggers?.[clueId])
      : [],
    currentBehavior: '',
    disclosureMode: '',
    socialRead: '',
    responseMode: '',
    visibleAppearance: [],
    voiceTone: [],
    lastSignalSnapshot: rawState.lastSignalSnapshot && typeof rawState.lastSignalSnapshot === 'object'
      ? rawState.lastSignalSnapshot
      : null
  };

  syncCharacterStateDescriptors(character, state);
  return state;
}

function initializeCharacterStates(rawStates = null) {
  const nextStates = {};
  if (!GameState.scenario?.characters) {
    GameState.characterStates = nextStates;
    return;
  }

  GameState.scenario.characters.forEach(character => {
    nextStates[character.id] = sanitizeCharacterState(character, rawStates?.[character.id] || {});
  });
  GameState.characterStates = nextStates;
}

function ensureCharacterState(charId) {
  if (!charId) return null;
  if (!GameState.characterStates[charId]) {
    const character = getEntityById('character', charId);
    if (!character) return null;
    GameState.characterStates[charId] = sanitizeCharacterState(character);
  }
  return GameState.characterStates[charId];
}

function classifyPlayerApproach(text) {
  const normalized = normalizeSearchText(text);
  if (/(katil|oldur|öldür|yalan|sakli|saklı|itiraf|suclu|suçlu|yaptin|yaptın|tehdit)/.test(normalized)) {
    return 'suclayici';
  }
  if (/(anliyorum|anlıyorum|yardim|yardım|uzgun|üzgün|zor olmali|zor olmalı|haklisin|haklısın|sakin ol)/.test(normalized)) {
    return 'empatik';
  }
  if (/(neden|nasil|nasıl|kim|ne zaman|nerede|anlat|acikla|açıkla)/.test(normalized)) {
    return 'sorgulayici';
  }
  return 'notr';
}

function analyzePlayerMessage(text) {
  const raw = String(text || '');
  const normalized = normalizeSearchText(raw);
  return {
    normalized,
    approach: classifyPlayerApproach(raw),
    profanity: /(amk|aq|siktir|salak|aptal|gerizekal|geri zekal|orospu|piç|pic|kahpe|şerefsiz|serefsiz|lan|ulan|bok herif)/.test(normalized),
    directThreat: /(mahvederim|gebert|öldürürüm|oldururum|seni bitir|yakarım|yakarim|tutuklat|hapse attır|haps?e attir)/.test(normalized),
    usesEvidenceLanguage: /(delil|kanıt|kanit|kayıt|kayit|kamera|telefon|hts|parmak izi|parmak|mesaj|rapor|baz kaydı|baz kaydi)/.test(normalized),
    calming: /(lütfen|lutfen|sakince|sakin ol|rahat ol|anlıyorum|anliyorum|yardım etmek|yardim etmek|haklısın|haklisin)/.test(normalized),
    contradiction: /(az önce|demin|önce farklı|once farkli|çeliş|celis|tutarsız|tutarsiz|yalan söyl|yalan soyl|yanlış söyl|yanlis soyl)/.test(normalized),
    polite: /(lütfen|lutfen|rica|müsaitsen|musaitsen|anlatabilir misin|açıklar mısın|aciklar misin)/.test(normalized),
    respectful: /(bey|hanım|hanim|hocam|hocanım|efendi|dede|lütfen|lutfen|müsaade|musade|izin verirsen|izninizle)/.test(normalized),
    personalMemory: /(annen|baban|ailen|aile|çocukluk|cocukluk|mektup|kardeş|kardes|dost|arkadaşlığ|arkadaslig|seviyor|özled|ozled|hocan|abla|dayı|dayi|geç kaldın|gec kaldin)/.test(normalized),
    longForm: normalized.split(/\s+/).filter(Boolean).length >= 18,
    rapidFire: (raw.match(/\?/g) || []).length >= 3 || /!{2,}/.test(raw) || /\b[A-ZÇĞİÖŞÜ]{3,}\b/.test(raw),
    softTopic: !/(katil|öldür|oldur|suçlu|suclu|itiraf|delil|kanıt|kanit|yalan|hts|kamera|rapor|parmak|iz|neden yaptın|neden yaptin)/.test(normalized)
  };
}

function applyPassiveCharacterDrift(character, turnsAway) {
  if (!turnsAway || turnsAway <= 0) return;

  const state = ensureCharacterState(character.id);
  if (!state) return;

  const profile = getInterrogationProfile(character);
  if (turnsAway < profile.cooldownTurns) return;

  const previousSnapshot = getSignalSnapshot(state);
  const driftSteps = Math.min(3, Math.floor(turnsAway / profile.cooldownTurns));

  state.pressure -= 4 * driftSteps;
  state.fear -= 5 * driftSteps;
  state.hostility -= 4 * driftSteps;
  state.energy += 3 * driftSteps;

  if (hasUnlockRoute(profile, 'return_later')) {
    state.guard -= 3 * driftSteps;
    state.breakthrough += 4 * driftSteps;
  }

  if (profile.stressResponse === 'performative_mask') {
    state.maskIntegrity -= 2 * driftSteps;
  }

  state.closureLevel = Math.max(0, state.closureLevel - driftSteps);
  state.pressure = clampCharacterMetric(state.pressure);
  state.fear = clampCharacterMetric(state.fear);
  state.hostility = clampCharacterMetric(state.hostility);
  state.energy = clampCharacterMetric(state.energy);
  state.guard = clampCharacterMetric(state.guard);
  state.breakthrough = clampCharacterMetric(state.breakthrough);
  state.maskIntegrity = clampCharacterMetric(state.maskIntegrity);
  syncCharacterStateDescriptors(character, state, previousSnapshot);
}

function updateClosureAndBreakthrough(character, state) {
  const profile = getInterrogationProfile(character);

  let closure = 0;
  switch (profile.stressResponse) {
    case 'fragile_spill':
      if (state.fear >= 82 && state.breakthrough < 35) closure = 2;
      else if (state.fear >= 68 && state.breakthrough < 20) closure = 1;
      if (state.breakthrough >= 60 && state.pressure >= 55) closure = 0;
      break;
    case 'grief_soften':
      if (state.hostility >= 55 || (state.fear >= 72 && state.trust < 30)) closure = 2;
      else if (state.guard >= 76 && state.trust < 35) closure = 1;
      if (state.breakthrough >= 55 && state.trust >= 35) closure = 0;
      break;
    case 'stoic_withdraw':
      if (state.guard >= 86 || state.fear >= 72) closure = 2;
      else if (state.guard >= 74) closure = 1;
      break;
    case 'combative_leak':
      if (state.hostility >= 84 && state.breakthrough < 50) closure = 2;
      else if (state.hostility >= 62) closure = 1;
      if (state.breakthrough >= 65 && state.hostility >= 55) closure = 0;
      break;
    case 'performative_mask':
      if (state.maskIntegrity >= 88 && state.breakthrough < 45) closure = 2;
      else if (state.maskIntegrity >= 72 && state.breakthrough < 30) closure = 1;
      if (state.breakthrough >= 75) closure = 0;
      break;
    case 'formal_bargainer':
      if (state.guard >= 82 && state.trust < 25) closure = 2;
      else if (state.guard >= 68) closure = 1;
      if (state.breakthrough >= 55 && state.hostility < 55) closure = 0;
      break;
    default:
      closure = state.guard >= 75 ? 1 : 0;
      break;
  }

  if (state.pressure >= 88 && state.breakthrough < 40) {
    closure = Math.max(closure, 3);
  }

  state.closureLevel = Math.max(0, Math.min(3, closure));
}

function applyInterrogationStyle(character, state, analysis, mentionedTriggerClues) {
  const profile = getInterrogationProfile(character);
  const previousSnapshot = getSignalSnapshot(state);

  if (analysis.softTopic && hasUnlockRoute(profile, 'return_later') && state.closureLevel > 0) {
    state.closureLevel = Math.max(0, state.closureLevel - 1);
    state.pressure -= 5;
    state.guard -= 3;
  }

  switch (profile.stressResponse) {
    case 'fragile_spill':
      if (analysis.usesEvidenceLanguage || analysis.contradiction || mentionedTriggerClues.length > 0) {
        if (state.pressure >= 55 || state.fear >= 55) {
          state.guard -= 8;
          state.openness += 10;
          state.breakthrough += 14;
        } else {
          state.breakthrough += 8;
        }
      }
      if (analysis.profanity || analysis.directThreat) {
        state.fear += 10;
        state.breakthrough -= 4;
      }
      if (analysis.calming || analysis.polite) {
        state.trust += 6;
        state.guard -= 4;
        state.breakthrough += 6;
      }
      break;
    case 'grief_soften':
      if (analysis.personalMemory || analysis.calming) {
        state.trust += 10;
        state.guard -= 6;
        state.fear -= 6;
        state.openness += 10;
        state.breakthrough += 14;
      }
      if (analysis.approach === 'suclayici' || analysis.profanity) {
        state.guard += 8;
        state.hostility += 6;
        state.breakthrough -= 5;
      }
      if (analysis.usesEvidenceLanguage && analysis.respectful) {
        state.breakthrough += 7;
      }
      break;
    case 'stoic_withdraw':
      if (analysis.approach === 'suclayici' || analysis.profanity || analysis.rapidFire) {
        state.guard += 10;
        state.openness -= 7;
        state.fear += 4;
      }
      if (analysis.respectful || analysis.polite) {
        state.guard -= 4;
        state.trust += 4;
        state.breakthrough += 5;
      }
      if (analysis.usesEvidenceLanguage && analysis.respectful) {
        state.breakthrough += 8;
        state.openness += 4;
      }
      break;
    case 'combative_leak':
      if (analysis.approach === 'suclayici' || analysis.usesEvidenceLanguage || analysis.contradiction) {
        state.hostility += 10;
        state.pressure += 4;
        if (analysis.usesEvidenceLanguage || analysis.contradiction || mentionedTriggerClues.length > 0) {
          state.breakthrough += 9;
          state.openness += 5;
        }
      }
      if (analysis.profanity || analysis.directThreat) {
        state.hostility += 10;
        state.breakthrough -= 3;
      }
      if (analysis.respectful) {
        state.hostility -= 5;
        state.breakthrough += 4;
      }
      break;
    case 'performative_mask':
      if ((analysis.approach === 'suclayici' || analysis.rapidFire || analysis.profanity) && !analysis.usesEvidenceLanguage && mentionedTriggerClues.length === 0) {
        state.maskIntegrity += 6;
        state.guard += 5;
        state.breakthrough -= 6;
      }
      if (analysis.usesEvidenceLanguage || analysis.contradiction || mentionedTriggerClues.length > 0) {
        state.maskIntegrity -= 8;
        state.guard -= 3;
        state.breakthrough += 11;
        if (analysis.respectful || analysis.polite) {
          state.trust += 2;
        }
      }
      break;
    case 'formal_bargainer':
      if (analysis.respectful || analysis.polite) {
        state.guard -= 4;
        state.trust += 5;
        state.breakthrough += 4;
      }
      if (analysis.usesEvidenceLanguage) {
        state.breakthrough += 10;
        state.openness += 5;
      }
      if (analysis.profanity || analysis.directThreat) {
        state.guard += 6;
        state.hostility += 5;
        state.breakthrough -= 6;
      }
      break;
  }

  updateClosureAndBreakthrough(character, state);
  state.pressure = clampCharacterMetric(state.pressure);
  state.guard = clampCharacterMetric(state.guard);
  state.trust = clampCharacterMetric(state.trust);
  state.maskIntegrity = clampCharacterMetric(state.maskIntegrity);
  state.openness = clampCharacterMetric(state.openness);
  state.fear = clampCharacterMetric(state.fear);
  state.hostility = clampCharacterMetric(state.hostility);
  state.breakthrough = clampCharacterMetric(state.breakthrough);
  syncCharacterStateDescriptors(character, state, previousSnapshot);
}

function findTriggeredClueMentions(character, text) {
  const normalized = normalizeSearchText(text);
  return Object.keys(character.triggers || {}).filter(clueId => {
    if (normalized.includes(normalizeSearchText(clueId))) return true;

    const clue = GameState.scenario?.clues?.find(item => item.id === clueId);
    if (!clue) return false;

    const candidates = [clue.name, clue.short_description].filter(Boolean);
    return candidates.some(candidate => {
      const candidateText = normalizeSearchText(candidate);
      if (!candidateText) return false;
      if (normalized.includes(candidateText)) return true;

      const words = candidateText.split(/[^a-z0-9çğıöşü]+/).filter(word => word.length >= 5);
      return words.some(word => normalized.includes(word));
    });
  });
}

function applyPlayerMessageToCharacterState(character, text) {
  const state = ensureCharacterState(character.id);
  if (!state) return null;

  const analysis = analyzePlayerMessage(text);
  const reactionProfile = getCharacterReactionProfile(character);
  const approach = analysis.approach;
  const mentionedTriggerClues = findTriggeredClueMentions(character, text);
  const previousSnapshot = getSignalSnapshot(state);

  state.lastPlayerApproach = approach;
  state.lastPressureSource = '';
  state.lastInteractionTurn = GameState.totalTurns;

  if (approach === 'suclayici') {
    state.pressure += 10;
    state.guard += 8;
    state.trust -= 6;
    state.maskIntegrity -= 4;
    state.openness -= 3;
  } else if (approach === 'empatik') {
    state.trust += 8;
    state.guard -= 5;
    state.pressure -= 2;
    state.openness += 8;
  } else if (approach === 'sorgulayici') {
    state.pressure += 4;
    state.guard += 2;
  } else {
    state.trust += 1;
  }

  if (analysis.profanity || analysis.directThreat) {
    state.pressure += reactionProfile.fearful && !reactionProfile.aggressive ? 12 : 8;
    state.trust -= 12;
    state.energy -= 4;
    if (reactionProfile.aggressive) {
      state.hostility += 18;
      state.guard += 4;
      state.maskIntegrity -= 4;
      state.openness += state.pressure >= 70 ? 2 : -3;
    } else if (reactionProfile.fearful) {
      state.fear += 18;
      state.guard += 10;
      state.openness -= 6;
    } else {
      state.fear += 8;
      state.hostility += 6;
      state.guard += 6;
      state.openness -= 4;
    }
    state.lastPressureSource = 'sert / hakaret içeren dil';
  }

  if (analysis.rapidFire) {
    state.pressure += 6;
    state.guard += 4;
    if (reactionProfile.fearful) state.fear += 6;
    if (reactionProfile.aggressive) state.hostility += 5;
    if (!state.lastPressureSource) state.lastPressureSource = 'art arda yüklenen soru';
  }

  if (analysis.contradiction) {
    state.pressure += 8;
    state.maskIntegrity -= 7;
    state.openness += 4;
    if (reactionProfile.manipulative) state.guard += 3;
    if (!state.lastPressureSource) state.lastPressureSource = 'çelişki baskısı';
  }

  if (analysis.calming || approach === 'empatik') {
    state.fear -= reactionProfile.fearful ? 8 : 3;
    state.hostility -= reactionProfile.aggressive ? 5 : 2;
  }

  if (analysis.polite && reactionProfile.formal) {
    state.trust += 3;
    state.guard -= 1;
  }

  if (analysis.longForm && reactionProfile.formal) {
    state.trust += 2;
  }

  if (analysis.usesEvidenceLanguage) {
    state.pressure += 8;
    state.maskIntegrity -= 5;
    state.openness += reactionProfile.fearful ? 3 : 1;
    if (reactionProfile.aggressive) state.hostility += 4;
    else state.fear += 4;
    state.lastPressureSource = 'somut delil dili';
  }

  if (mentionedTriggerClues.length > 0) {
    state.pressure += mentionedTriggerClues.length * 14;
    state.guard += mentionedTriggerClues.length * 4;
    state.maskIntegrity -= mentionedTriggerClues.length * 10;
    state.openness += mentionedTriggerClues.length * 7;
    if (reactionProfile.fearful) {
      state.fear += mentionedTriggerClues.length * 12;
    } else if (reactionProfile.aggressive) {
      state.hostility += mentionedTriggerClues.length * 10;
    } else {
      state.fear += mentionedTriggerClues.length * 5;
      state.hostility += mentionedTriggerClues.length * 4;
    }
    state.lastPressureSource = mentionedTriggerClues.map(getCharacterClueLabel).join(', ');

    mentionedTriggerClues.forEach(clueId => {
      if (!state.triggeredClues.includes(clueId)) {
        state.triggeredClues.push(clueId);
      }
    });
  }

  state.energy -= (approach === 'suclayici' || analysis.profanity || analysis.rapidFire) ? 3 : 1;

  state.energy = clampCharacterMetric(state.energy);
  state.guard = clampCharacterMetric(state.guard);
  state.pressure = clampCharacterMetric(state.pressure);
  state.trust = clampCharacterMetric(state.trust);
  state.maskIntegrity = clampCharacterMetric(state.maskIntegrity);
  state.openness = clampCharacterMetric(state.openness);
  state.fear = clampCharacterMetric(state.fear);
  state.hostility = clampCharacterMetric(state.hostility);
  state.breakthrough = clampCharacterMetric(state.breakthrough);
  updateClosureAndBreakthrough(character, state);
  syncCharacterStateDescriptors(character, state, previousSnapshot);
  applyInterrogationStyle(character, state, analysis, mentionedTriggerClues);
  return state;
}

function finalizeCharacterStateAfterResponse(character, response) {
  const state = ensureCharacterState(character.id);
  if (!state) return;
  const reactionProfile = getCharacterReactionProfile(character);
  const previousSnapshot = getSignalSnapshot(state);

  state.lastInteractionTurn = GameState.totalTurns + 1;

  if (state.lastPlayerApproach === 'empatik') {
    state.trust += 4;
    state.guard -= 2;
    state.openness += 4;
    state.fear -= 6;
    state.hostility -= 3;
  } else if (state.lastPlayerApproach === 'suclayici') {
    state.guard += 3;
    state.pressure += 3;
    if (reactionProfile.aggressive) state.hostility += 6;
    else state.fear += 6;
  } else {
    state.trust += 1;
  }

  if (response?.clues_found?.length) {
    state.pressure += response.clues_found.length * 8;
    state.maskIntegrity -= response.clues_found.length * 6;
    state.openness += response.clues_found.length * 9;
    if (reactionProfile.fearful) state.fear += response.clues_found.length * 5;
    if (reactionProfile.aggressive) state.hostility += response.clues_found.length * 5;
    state.lastPressureSource = response.clues_found.map(getCharacterClueLabel).join(', ');
  }

  state.energy = clampCharacterMetric(state.energy - 1);
  state.guard = clampCharacterMetric(state.guard);
  state.pressure = clampCharacterMetric(state.pressure);
  state.trust = clampCharacterMetric(state.trust);
  state.maskIntegrity = clampCharacterMetric(state.maskIntegrity);
  state.openness = clampCharacterMetric(state.openness);
  state.fear = clampCharacterMetric(state.fear);
  state.hostility = clampCharacterMetric(state.hostility);
  state.breakthrough = clampCharacterMetric(state.breakthrough + (response?.clues_found?.length ? 4 : 0));
  updateClosureAndBreakthrough(character, state);
  syncCharacterStateDescriptors(character, state, previousSnapshot);
}

function getLastPhase() {
  if (!GameState.scenario || !GameState.scenario.phases?.length) return null;
  return GameState.scenario.phases[GameState.scenario.phases.length - 1];
}

function hasFoundClue(clueId) {
  return GameState.foundClues.some(clue => clue.id === clueId);
}

function getKnownClueIdSet(source = GameState.foundClues) {
  if (source instanceof Set) {
    return new Set([...source].filter(Boolean));
  }

  if (!Array.isArray(source)) return new Set();

  return new Set(source
    .map(item => (typeof item === 'string' ? item : item?.id))
    .filter(Boolean));
}

function normalizeClueIdList(clueIds) {
  if (!Array.isArray(clueIds)) return [];

  return clueIds
    .filter((clueId, index, array) => clueId && array.indexOf(clueId) === index)
    .filter(clueId => GameState.scenario?.clues?.some(clue => clue.id === clueId));
}

function getReportRevealedClueIds(reportIds = GameState.unlockedReports) {
  const known = new Set();
  const reportIdSet = reportIds instanceof Set ? reportIds : new Set(Array.isArray(reportIds) ? reportIds : []);

  (GameState.scenario?.forensic_reports || []).forEach(report => {
    if (reportIdSet.has(report.id) && report.clue_revealed) {
      known.add(report.clue_revealed);
    }
  });

  return known;
}

function getInteractionContext(interactionType, targetId) {
  switch (interactionType) {
    case 'location_enter':
    case 'location_chat':
      return getEntityById('location', targetId);
    case 'character_chat':
      return getEntityById('character', targetId);
    case 'advisor':
      return GameState.scenario?.advisor || null;
    case 'clue_examine':
      return getEntityById('clue', targetId);
    default:
      return null;
  }
}

function getConversationContextFromKey(key) {
  if (typeof key !== 'string') return null;

  if (key.startsWith('loc_')) {
    const targetId = key.slice(4);
    return {
      view: 'location',
      targetId,
      entity: getEntityById('location', targetId)
    };
  }

  if (key.startsWith('char_')) {
    const targetId = key.slice(5);
    return {
      view: 'character',
      targetId,
      entity: getEntityById('character', targetId)
    };
  }

  if (key.startsWith('clue_')) {
    const targetId = key.slice(5);
    return {
      view: 'clue',
      targetId,
      entity: getEntityById('clue', targetId)
    };
  }

  if (key === 'advisor') {
    return {
      view: 'advisor',
      targetId: null,
      entity: GameState.scenario?.advisor || null
    };
  }

  return null;
}

function getPreviousUserMessage(messages, index) {
  if (!Array.isArray(messages)) return '';

  for (let pointer = index - 1; pointer >= 0; pointer -= 1) {
    const message = messages[pointer];
    if (message?.role === 'user' && typeof message.content === 'string') {
      return message.content;
    }
  }

  return '';
}

function getAllowedClueIdsForInteraction(interactionType, targetId, userMessage = '', knownClueIds = null) {
  const knownSet = getKnownClueIdSet(knownClueIds || GameState.foundClues);

  if (interactionType !== 'location_chat' || !GameState.gpt) {
    return [];
  }

  const location = getEntityById('location', targetId);
  if (!location || !Array.isArray(location.hidden_clues)) {
    return [];
  }

  const hiddenClueMatches = location.hidden_clues
    .filter(hiddenClue => !knownSet.has(hiddenClue.clue_id) && GameState.gpt.isHiddenClueTargeted(userMessage, hiddenClue))
    .map(hiddenClue => hiddenClue.clue_id)
    .filter((clueId, index, array) => clueId && array.indexOf(clueId) === index);

  const inspectableMatches = buildLocationInspectableItems(location)
    .filter(inspectable => doesUserMessageMatchInspectable(userMessage, inspectable))
    .flatMap(inspectable => inspectable.relatedClueIds)
    .filter(clueId => clueId && !knownSet.has(clueId));

  return [...new Set([...hiddenClueMatches, ...inspectableMatches])];
}

function filterAuthorizedClueIds(proposedClueIds, interactionType, targetId, userMessage = '', knownClueIds = null) {
  const allowed = new Set(getAllowedClueIdsForInteraction(interactionType, targetId, userMessage, knownClueIds));
  const known = getKnownClueIdSet(knownClueIds || GameState.foundClues);

  return normalizeClueIdList(proposedClueIds).filter(clueId => allowed.has(clueId) && !known.has(clueId));
}

function sanitizeInteractionText(text, interactionType, targetId, userMessage = '', knownClueIds = null, allowedClueIds = [], artifactType = 'response') {
  if (!GameState.gpt || !GameState.scenario) {
    return String(text || '').trim();
  }

  const target = getInteractionContext(interactionType, targetId);
  return GameState.gpt.sanitizeContextText(text, {
    scenario: GameState.scenario,
    interactionType,
    target,
    knownClueIds: [...getKnownClueIdSet(knownClueIds || GameState.foundClues)],
    allowedClueIds,
    userMessage,
    artifactType
  });
}

function applySpoilerGuardsToResponse(response, interactionType, targetId, userMessage = '', knownClueIds = null, artifactType = 'response') {
  const safeResponse = {
    ...response,
    text: String(response?.text || '').trim(),
    clues_found: normalizeClueIdList(response?.clues_found),
    summary: String(response?.summary || '').trim()
  };
  const beforeGuard = {
    text: safeResponse.text,
    clues_found: safeResponse.clues_found.slice(),
    summary: safeResponse.summary
  };

  const knownSet = getKnownClueIdSet(knownClueIds || GameState.foundClues);
  const safeClueIds = filterAuthorizedClueIds(safeResponse.clues_found, interactionType, targetId, userMessage, knownSet);

  safeResponse.clues_found = safeClueIds;
  safeResponse.text = sanitizeInteractionText(
    safeResponse.text,
    interactionType,
    targetId,
    userMessage,
    knownSet,
    safeClueIds,
    artifactType
  );
  safeResponse.summary = sanitizeInteractionText(
    safeResponse.summary,
    interactionType,
    targetId,
    userMessage,
    knownSet,
    safeClueIds,
    artifactType === 'local-inspect' ? 'local-inspect' : 'summary'
  );

  if (response?.eventTrace) {
    const changed = beforeGuard.text !== safeResponse.text
      || beforeGuard.summary !== safeResponse.summary
      || JSON.stringify(beforeGuard.clues_found) !== JSON.stringify(safeResponse.clues_found);

    safeResponse.eventTrace = {
      ...response.eventTrace,
      gameGuard: {
        applied: true,
        changed,
          before: normalizeEventTraceResponseSnapshot(beforeGuard),
          after: normalizeEventTraceResponseSnapshot(safeResponse)
      }
    };

    if (changed) {
      logGameEvent('guard', 'response_sanitized', {
        interactionType,
        artifactType,
        userMessage,
        before: normalizeEventTraceResponseSnapshot(beforeGuard),
        after: normalizeEventTraceResponseSnapshot(safeResponse)
      }, {
        status: 'warning',
        view: GameState.currentView || '',
        targetId: targetId || '',
        targetName: getCurrentEventTargetName(GameState.currentView, targetId)
      });
    }
  }

  return safeResponse;
}

function recomputeSafePhase() {
  if (!Array.isArray(GameState.scenario?.phases) || GameState.scenario.phases.length === 0) {
    return 1;
  }

  const originalPhase = GameState.phase;
  let phase = 1;

  while (true) {
    const currentPhase = GameState.scenario.phases.find(item => item.id === phase);
    const hasNextPhase = GameState.scenario.phases.some(item => item.id === phase + 1);
    if (!currentPhase?.next_phase_trigger || !hasNextPhase) break;

    GameState.phase = phase;
    const canAdvance = isUnlockConditionMet(currentPhase.next_phase_trigger);
    GameState.phase = originalPhase;

    if (!canAdvance) break;
    phase += 1;
  }

  GameState.phase = originalPhase;
  return phase;
}

function repairSaveSpoilers() {
  if (!GameState.scenario || !GameState.gpt) return;

  const validClueIds = getReportRevealedClueIds(GameState.unlockedReports);
  const entries = [];

  Object.entries(GameState.conversations).forEach(([key, messages]) => {
    if (!Array.isArray(messages)) return;
    messages.forEach((message, index) => {
      entries.push({
        key,
        index,
        timestamp: typeof message?.timestamp === 'number' ? message.timestamp : 0
      });
    });
  });

  entries.sort((left, right) => left.timestamp - right.timestamp || left.index - right.index);

  entries.forEach(({ key, index }) => {
    const messages = GameState.conversations[key];
    const message = messages?.[index];
    if (!message || typeof message.content !== 'string') return;

    if (message.role === 'system' && /Unsupported value: 'temperature'/.test(message.content)) {
      message._remove = true;
      return;
    }

    const context = getConversationContextFromKey(key);
    if (!context) return;

    if (message.role !== 'assistant') return;

    const previousUserText = getPreviousUserMessage(messages, index);
    const interactionType = context.view === 'location'
      ? (previousUserText ? 'location_chat' : 'location_enter')
      : context.view === 'character'
        ? 'character_chat'
        : context.view === 'advisor'
          ? 'advisor'
          : 'clue_examine';

    const safeClueIds = filterAuthorizedClueIds(message.foundClueIds, interactionType, context.targetId, previousUserText, validClueIds);
    const artifactType = message.messageKind === 'clue-seed' || message.messageKind === 'local-reference'
      ? 'note'
      : message.messageKind === 'local-inspect'
        ? 'local-inspect'
        : 'response';

    message.foundClueIds = safeClueIds;
    message.isClueFound = safeClueIds.length > 0;
    message.content = sanitizeInteractionText(
      message.content,
      interactionType,
      context.targetId,
      previousUserText,
      validClueIds,
      safeClueIds,
      artifactType
    );

    if (!message.content) {
      message._remove = true;
      return;
    }

    safeClueIds.forEach(clueId => validClueIds.add(clueId));
  });

  Object.keys(GameState.conversations).forEach(key => {
    const context = getConversationContextFromKey(key);
    if (context?.view === 'clue' && !validClueIds.has(context.targetId)) {
      delete GameState.conversations[key];
      return;
    }

    GameState.conversations[key] = (GameState.conversations[key] || []).filter(message => {
      if (!message || message._remove) return false;
      delete message._remove;
      return typeof message.content === 'string' && message.content.trim().length > 0;
    });

    if (GameState.conversations[key].length === 0) {
      delete GameState.conversations[key];
    }
  });

  GameState.foundClues = [...validClueIds]
    .map(clueId => getEntityById('clue', clueId))
    .filter(Boolean);

  Object.entries(GameState.gptSummaries || {}).forEach(([key, summary]) => {
    if (typeof summary !== 'string') {
      delete GameState.gptSummaries[key];
      return;
    }

    const context = getConversationContextFromKey(key);
    if (!context) return;

    if (context.view === 'clue' && !validClueIds.has(context.targetId)) {
      delete GameState.gptSummaries[key];
      return;
    }

    const interactionType = context.view === 'location'
      ? 'location_chat'
      : context.view === 'character'
        ? 'character_chat'
        : context.view === 'advisor'
          ? 'advisor'
          : 'clue_examine';

    const sanitized = sanitizeInteractionText(summary, interactionType, context.targetId, '', validClueIds, [], 'summary');
    if (!sanitized) {
      delete GameState.gptSummaries[key];
      return;
    }

    GameState.gptSummaries[key] = sanitized;
  });

  GameState.playerNotes = (GameState.playerNotes || [])
    .map(note => {
      if (!note || typeof note !== 'object') return null;

      if (note.type === 'clue') {
        if (!validClueIds.has(note.entityId)) return null;

        const clue = getEntityById('clue', note.entityId);
        return {
          ...note,
          entityName: clue?.name || note.entityName,
          title: clue?.name || note.title,
          text: clue?.short_description || note.text
        };
      }

      const interactionType = note.type === 'location'
        ? 'location_chat'
        : note.type === 'character'
          ? 'character_chat'
          : note.type === 'advisor'
            ? 'advisor'
            : note.type === 'clue'
              ? 'clue_examine'
              : null;

      if (!interactionType) return null;

      const sanitizedText = sanitizeInteractionText(note.text, interactionType, note.entityId, '', validClueIds, [], 'note');
      if (!sanitizedText) return null;

      return {
        ...note,
        text: sanitizedText
      };
    })
    .filter(Boolean)
    .map((note, index) => ({
      ...note,
      index: index + 1
    }));

  GameState.phase = recomputeSafePhase();
}

function hasVisitedLocation(locId) {
  return GameState.visitedLocations.has(locId);
}

function getElapsedMinutes() {
  if (!GameState.gameStartTime) return 0;
  return (Date.now() - GameState.gameStartTime) / 60000;
}

function isUnlockConditionMet(condition) {
  if (!condition) return true;

  switch (condition.type) {
    case 'clues':
      return (condition.required || []).every(hasFoundClue);
    case 'visited_locations':
      return (condition.required || []).every(hasVisitedLocation);
    case 'conversations':
      return GameState.uniqueCharConversations.size >= (condition.min_count || 0);
    case 'time':
      return getElapsedMinutes() >= (condition.delay_minutes || 0);
    case 'phase':
      return GameState.phase >= (condition.min_phase || 1);
    case 'all':
      return Array.isArray(condition.conditions) && condition.conditions.every(isUnlockConditionMet);
    case 'any':
      return Array.isArray(condition.conditions) && condition.conditions.some(isUnlockConditionMet);
    default:
      console.warn('Bilinmeyen unlock_condition tipi:', condition.type);
      return false;
  }
}

function getMissingAccusationClues() {
  const required = GameState.scenario?.accusation?.required_clues || [];
  return required.filter(reqId => !hasFoundClue(reqId));
}

function canOpenAccusation() {
  const lastPhase = getLastPhase();
  if (!lastPhase) return false;
  return GameState.phase >= lastPhase.id && getMissingAccusationClues().length === 0;
}

function isLocationAvailable(locId) {
  const location = getEntityById('location', locId);
  if (!location) return false;

  const phase = GameState.scenario.phases.find(p => p.id === GameState.phase);
  if (!phase || !phase.available_locations.includes(locId)) return false;
  if (location.unlock_phase != null && GameState.phase < location.unlock_phase) return false;
  return isUnlockConditionMet(location.unlock_condition);
}

function getAvailableLocationIds() {
  if (!GameState.scenario?.locations) return [];
  return GameState.scenario.locations
    .filter(location => isLocationAvailable(location.id))
    .map(location => location.id);
}

function isCharacterAvailable(charId) {
  const character = getEntityById('character', charId);
  if (!character) return false;

  if (character.unlock_phase != null && GameState.phase < character.unlock_phase) return false;
  return isUnlockConditionMet(character.unlock_condition);
}

function getAvailableCharacterIds() {
  if (!GameState.scenario?.characters) return [];
  return GameState.scenario.characters
    .filter(character => isCharacterAvailable(character.id))
    .map(character => character.id);
}

function getCharacterUnlockDescription(character) {
  const description = character?.unlock_condition?.description;
  if (typeof description !== 'string' || !description.trim()) return '';

  const text = description.trim();
  if (text.length <= 88) return text;
  return text.slice(0, 85).trimEnd() + '...';
}

function sanitizeLoadedConversationArtifacts() {
  if (!GameState.scenario || !GameState.gpt) return;

  repairSaveSpoilers();

  Object.entries(GameState.conversations).forEach(([key, messages]) => {
    if (!Array.isArray(messages)) return;

    const clue = key.startsWith('clue_') ? getEntityById('clue', key.slice(5)) : null;

    GameState.conversations[key] = messages.filter(message => {
      if (!message || typeof message.content !== 'string') return false;

      if (message.role === 'system' && /Unsupported value: 'temperature'/.test(message.content)) {
        return false;
      }

      if (clue && message.role === 'assistant') {
        message.content = GameState.gpt.sanitizeClueResponseText(message.content, clue);
      }

      return true;
    });
  });

  Object.entries(GameState.gptSummaries || {}).forEach(([key, summary]) => {
    if (!key.startsWith('clue_') || typeof summary !== 'string') return;

    const clue = getEntityById('clue', key.slice(5));
    if (!clue) return;

    GameState.gptSummaries[key] = GameState.gpt.sanitizeClueResponseText(summary, clue);
  });
}

function refreshAvailability(previousLocationIds = null, previousCharacterIds = null) {
  UI.refreshAll();

  const unlockedLocations = [];
  const unlockedCharacters = [];

  const previousLocations = previousLocationIds ? new Set(previousLocationIds) : null;
  if (previousLocations) {
    GameState.scenario.locations.forEach(location => {
      if (isLocationAvailable(location.id) && !previousLocations.has(location.id)) {
        unlockedLocations.push({ id: location.id, name: location.name });
        UI.notify(`📍 Yeni mekan açıldı: ${location.name}`);
      }
    });
  }

  const previousCharacters = previousCharacterIds ? new Set(previousCharacterIds) : null;
  if (previousCharacters) {
    GameState.scenario.characters.forEach(character => {
      if (isCharacterAvailable(character.id) && !previousCharacters.has(character.id)) {
        const unlockDescription = getCharacterUnlockDescription(character);
        unlockedCharacters.push({
          id: character.id,
          name: character.name,
          description: unlockDescription || ''
        });
        UI.notify(
          unlockDescription
            ? `🗣️ Yeni şüpheli açıldı: ${character.name} — ${unlockDescription}`
            : `🗣️ Yeni şüpheli açıldı: ${character.name}`
        );
      }
    });
  }

  if (unlockedLocations.length > 0 || unlockedCharacters.length > 0) {
    logGameEvent('state', 'availability_changed', {
      unlockedLocations,
      unlockedCharacters,
      availableLocationIds: getAvailableLocationIds(),
      availableCharacterIds: getAvailableCharacterIds()
    }, {
      status: 'success'
    });
  }
}

function refreshLocationAvailability(previousIds = null) {
  refreshAvailability(previousIds, null);
}

function refreshCharacterAvailability(previousIds = null) {
  refreshAvailability(null, previousIds);
}

function isValidContext(view, target) {
  if (!view) return false;
  if (view === 'advisor') return true;
  if (view === 'clue') return GameState.foundClues.some(c => c.id === target);
  if (view === 'location') return isLocationAvailable(target);
  if (view === 'character') return isCharacterAvailable(target);
  return Boolean(getEntityById(view, target));
}

const SaveManager = {
  getUrl(storyFolder = GameState.storyFolder) {
    return '/__save?story=' + encodeURIComponent(storyFolder || '');
  },

  canSave() {
    return Boolean(GameState.storyFolder && GameState.scenario);
  },

  buildPayload() {
    return {
      version: 1,
      savedAt: Date.now(),
      currentScreen: GameState.currentScreen,
      currentView: GameState.currentView,
      currentTarget: GameState.currentTarget,
      phase: GameState.phase,
      totalTurns: GameState.totalTurns,
      visitedLocations: [...GameState.visitedLocations],
      foundClueIds: GameState.foundClues.map(c => c.id),
      conversations: GameState.conversations,
      gptSummaries: GameState.gptSummaries,
      characterStates: GameState.characterStates,
      playerNotes: GameState.playerNotes,
      inspectableHistory: GameState.inspectableHistory,
      images: GameState.images,
      selectedSuspect: GameState.selectedSuspect,
      gameStartTime: GameState.gameStartTime,
      unlockedReports: [...GameState.unlockedReports],
      uniqueCharConversations: [...GameState.uniqueCharConversations]
    };
  },

  normalizeConversations(rawConversations) {
    if (!rawConversations || typeof rawConversations !== 'object') return {};

    const normalized = {};
    Object.entries(rawConversations).forEach(([key, messages]) => {
      if (!Array.isArray(messages)) return;
      normalized[key] = messages
        .filter(msg => msg && typeof msg.content === 'string')
        .map(msg => ({
          role: msg.role === 'system' ? 'system' : msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
          timestamp: typeof msg.timestamp === 'number' ? msg.timestamp : Date.now(),
          senderName: typeof msg.senderName === 'string' ? msg.senderName : null,
          isClueFound: Boolean(msg.isClueFound),
          foundClueIds: Array.isArray(msg.foundClueIds) ? msg.foundClueIds.filter(Boolean) : [],
          messageKind: typeof msg.messageKind === 'string' ? msg.messageKind : null
        }));
    });

    return normalized;
  },

  applyPayload(payload) {
    GameState.currentScreen = payload.currentScreen || 'game';
    GameState.currentView = payload.currentView || null;
    GameState.currentTarget = payload.currentTarget || null;
    GameState.phase = Number.isInteger(payload.phase) ? payload.phase : 1;
    GameState.totalTurns = Number.isInteger(payload.totalTurns) ? payload.totalTurns : 0;
    GameState.visitedLocations = new Set(Array.isArray(payload.visitedLocations) ? payload.visitedLocations : []);
    GameState.foundClues = (payload.foundClueIds || [])
      .map(id => GameState.scenario.clues.find(c => c.id === id))
      .filter(Boolean);
    GameState.conversations = this.normalizeConversations(payload.conversations);
    GameState.gptSummaries = payload.gptSummaries && typeof payload.gptSummaries === 'object'
      ? payload.gptSummaries
      : {};
    initializeCharacterStates(payload.characterStates && typeof payload.characterStates === 'object'
      ? payload.characterStates
      : null);
    GameState.playerNotes = Array.isArray(payload.playerNotes) ? payload.playerNotes : [];
    GameState.inspectableHistory = payload.inspectableHistory && typeof payload.inspectableHistory === 'object'
      ? payload.inspectableHistory
      : {};
    const rawImages = payload.images && typeof payload.images === 'object' ? payload.images : {};
    GameState.images = {};
    Object.entries(rawImages).forEach(([key, val]) => {
      if (typeof val === 'string' && val.startsWith('data:image/')) {
        GameState.images[key] = val;
      }
    });
    GameState.selectedSuspect = payload.selectedSuspect || null;
    GameState.gameStartTime = typeof payload.gameStartTime === 'number' ? payload.gameStartTime : Date.now();
    GameState.unlockedReports = new Set(Array.isArray(payload.unlockedReports) ? payload.unlockedReports : []);
    GameState.uniqueCharConversations = new Set(Array.isArray(payload.uniqueCharConversations) ? payload.uniqueCharConversations : []);

    sanitizeLoadedConversationArtifacts();
    seedKnownClueConversationSummaries();

    if (!isValidContext(GameState.currentView, GameState.currentTarget)) {
      GameState.currentView = null;
      GameState.currentTarget = null;
    }
  },

  async load(storyFolder) {
    const response = await fetch(this.getUrl(storyFolder), { cache: 'no-store' });
    if (response.status === 404) return null;
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Kayıt okunamadı.');
    }

    const payload = await response.json();
    logGameEvent('save', 'save_loaded', {
      storyFolder,
      hasData: Boolean(payload.data)
    }, {
      status: 'success',
      includeState: false
    });
    return payload.data || null;
  },

  async saveNow(options = {}) {
    if (!this.canSave()) return;

    if (GameState.saveTimer) {
      clearTimeout(GameState.saveTimer);
      GameState.saveTimer = null;
    }

    const body = JSON.stringify({
      storyFolder: GameState.storyFolder,
      data: this.buildPayload()
    });

    await fetch(this.getUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: Boolean(options.keepalive)
    });

    logGameEvent('save', 'save_written', {
      keepalive: Boolean(options.keepalive),
      payloadVersion: 1
    }, {
      status: 'success',
      includeState: false
    });
  },

  scheduleSave() {
    if (!this.canSave()) return;
    if (GameState.saveTimer) clearTimeout(GameState.saveTimer);

    GameState.saveTimer = setTimeout(() => {
      this.saveNow().catch(err => console.error('Kayıt hatası:', err));
    }, 250);
  },

  flushOnUnload() {
    if (!this.canSave()) return;

    const body = JSON.stringify({
      storyFolder: GameState.storyFolder,
      data: this.buildPayload()
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(this.getUrl(), new Blob([body], { type: 'application/json' }));
      return;
    }

    fetch(this.getUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true
    }).catch(() => {});
  },

  async clear(storyFolder = GameState.storyFolder) {
    if (!storyFolder) return;
    await fetch(this.getUrl(storyFolder), { method: 'DELETE' });
    logGameEvent('save', 'save_cleared', {
      storyFolder
    }, {
      status: 'warning',
      includeState: false
    });
  }
};

const LoreManager = {
  getUrl(storyFolder = GameState.storyFolder) {
    return '/__lore?story=' + encodeURIComponent(storyFolder || '');
  },

  canSave() {
    return Boolean(GameState.storyFolder);
  },

  normalizeEntry(slotKey, rawEntry) {
    if (!rawEntry || typeof rawEntry !== 'object') return null;

    const canonicalText = String(rawEntry.canonicalText || rawEntry.surfaceText || '').trim();
    const surfaceText = String(rawEntry.surfaceText || canonicalText).trim();
    if (!canonicalText || !surfaceText) return null;

    return {
      slotKey,
      label: typeof rawEntry.label === 'string' && rawEntry.label.trim() ? rawEntry.label.trim() : slotKey,
      category: typeof rawEntry.category === 'string' && rawEntry.category.trim() ? rawEntry.category.trim() : slotKey,
      canonicalText,
      surfaceText,
      confidence: typeof rawEntry.confidence === 'string' && rawEntry.confidence.trim() ? rawEntry.confidence.trim() : 'orta',
      epistemicTone: typeof rawEntry.epistemicTone === 'string' && rawEntry.epistemicTone.trim() ? rawEntry.epistemicTone.trim() : 'belirsiz',
      traceState: typeof rawEntry.traceState === 'string' && rawEntry.traceState.trim() ? rawEntry.traceState.trim() : 'belirsiz',
      anchors: Array.isArray(rawEntry.anchors) ? rawEntry.anchors.filter(Boolean).slice(0, 6) : [],
      questionHints: Array.isArray(rawEntry.questionHints) ? rawEntry.questionHints.filter(Boolean).slice(-6) : [],
      generatedNames: Array.isArray(rawEntry.generatedNames) ? rawEntry.generatedNames.filter(Boolean).slice(0, 6) : [],
      source: typeof rawEntry.source === 'string' && rawEntry.source.trim() ? rawEntry.source.trim() : 'generated',
      createdAt: typeof rawEntry.createdAt === 'number' ? rawEntry.createdAt : Date.now(),
      updatedAt: typeof rawEntry.updatedAt === 'number' ? rawEntry.updatedAt : Date.now()
    };
  },

  normalizeStore(rawStore, storyFolder = GameState.storyFolder) {
    const normalized = createEmptyLoreMemory(storyFolder);
    if (!rawStore || typeof rawStore !== 'object') {
      return normalized;
    }

    normalized.version = Number.isInteger(rawStore.version) ? rawStore.version : 1;
    normalized.storyFolder = typeof rawStore.storyFolder === 'string' && rawStore.storyFolder.trim()
      ? rawStore.storyFolder.trim()
      : (storyFolder || '');
    normalized.updatedAt = typeof rawStore.updatedAt === 'number' ? rawStore.updatedAt : 0;

    ['location', 'clue'].forEach(targetType => {
      const rawTargets = rawStore.entries?.[targetType];
      if (!rawTargets || typeof rawTargets !== 'object') return;

      Object.entries(rawTargets).forEach(([targetId, rawSlots]) => {
        if (!targetId || !rawSlots || typeof rawSlots !== 'object') return;

        const normalizedSlots = {};
        Object.entries(rawSlots).forEach(([slotKey, rawEntry]) => {
          const entry = this.normalizeEntry(slotKey, rawEntry);
          if (entry) {
            normalizedSlots[slotKey] = entry;
          }
        });

        if (Object.keys(normalizedSlots).length > 0) {
          normalized.entries[targetType][targetId] = normalizedSlots;
        }
      });
    });

    return normalized;
  },

  async load(storyFolder) {
    const response = await fetch(this.getUrl(storyFolder), { cache: 'no-store' });
    if (response.status === 404) {
      logGameEvent('lore', 'lore_missing', {
        storyFolder
      }, {
        status: 'info',
        includeState: false
      });
      return this.normalizeStore(null, storyFolder);
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Lore kaydı okunamadı.');
    }

    const payload = await response.json();
    logGameEvent('lore', 'lore_loaded', {
      storyFolder,
      hasEntries: Boolean(payload.data && payload.data.entries)
    }, {
      status: 'success',
      includeState: false
    });
    return this.normalizeStore(payload.data || payload, storyFolder);
  },

  getBucket(view, targetId, create = false) {
    const targetType = view === 'clue' ? 'clue' : view === 'location' ? 'location' : null;
    if (!targetType || !targetId) return null;

    if (!GameState.loreMemory || typeof GameState.loreMemory !== 'object') {
      GameState.loreMemory = createEmptyLoreMemory(GameState.storyFolder);
    }

    const entries = GameState.loreMemory.entries || (GameState.loreMemory.entries = { location: {}, clue: {} });
    entries.location = entries.location || {};
    entries.clue = entries.clue || {};

    if (!entries[targetType][targetId] && create) {
      entries[targetType][targetId] = {};
    }

    return entries[targetType][targetId] || null;
  },

  scheduleSave() {
    if (!this.canSave()) return;
    if (GameState.loreSaveTimer) clearTimeout(GameState.loreSaveTimer);

    GameState.loreSaveTimer = setTimeout(() => {
      this.saveNow().catch(err => console.error('Lore kayıt hatası:', err));
    }, 250);
  },

  async saveNow(options = {}) {
    if (!this.canSave()) return;

    if (GameState.loreSaveTimer) {
      clearTimeout(GameState.loreSaveTimer);
      GameState.loreSaveTimer = null;
    }

    GameState.loreMemory.updatedAt = Date.now();
    GameState.loreMemory.storyFolder = GameState.storyFolder || '';

    const body = JSON.stringify({
      storyFolder: GameState.storyFolder,
      data: GameState.loreMemory
    });

    await fetch(this.getUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: Boolean(options.keepalive)
    });

    logGameEvent('lore', 'lore_written', {
      keepalive: Boolean(options.keepalive)
    }, {
      status: 'success',
      includeState: false
    });
  },

  flushOnUnload() {
    if (!this.canSave()) return;

    GameState.loreMemory.updatedAt = Date.now();
    GameState.loreMemory.storyFolder = GameState.storyFolder || '';

    const body = JSON.stringify({
      storyFolder: GameState.storyFolder,
      data: GameState.loreMemory
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(this.getUrl(), new Blob([body], { type: 'application/json' }));
      return;
    }

    fetch(this.getUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true
    }).catch(() => {});
  },

  upsertFromInteraction(view, targetId, userMessage, responseText) {
    if (!GameState.gpt || !GameState.scenario) return null;

    const interactionType = view === 'location'
      ? 'location_chat'
      : view === 'clue'
        ? 'clue_examine'
        : null;
    if (!interactionType) return null;

    const target = getEntityById(view, targetId);
    if (!target) return null;

    const intent = GameState.gpt.classifySoftLoreQuery(interactionType, target, userMessage);
    if (!intent) return null;
    if (!GameState.gpt.shouldPersistSoftLore(responseText, { interactionType, target, userMessage })) {
      return null;
    }

    const bucket = this.getBucket(view, targetId, true);
    if (!bucket) return null;

    const now = Date.now();
    const questionHint = compactReferenceText(userMessage, 120);
    const existing = bucket[intent.slotKey];

    if (existing) {
      if (questionHint && !existing.questionHints.includes(questionHint)) {
        existing.questionHints = [...existing.questionHints, questionHint].slice(-6);
      }
      existing.traceState = GameState.gpt.detectSoftLoreTraceState(existing.surfaceText || existing.canonicalText);
      existing.epistemicTone = GameState.gpt.hasSoftLoreQualifier(existing.surfaceText || existing.canonicalText) ? 'belirsiz' : 'zayif-belirsiz';
      existing.updatedAt = now;
      GameState.loreMemory.updatedAt = now;
      this.scheduleSave();
      return existing;
    }

    const entry = {
      slotKey: intent.slotKey,
      label: intent.label,
      category: intent.slotKey,
      canonicalText: responseText,
      surfaceText: responseText,
      confidence: GameState.gpt.detectSoftLoreConfidenceLabel(responseText),
      epistemicTone: GameState.gpt.hasSoftLoreQualifier(responseText) ? 'belirsiz' : 'zayif-belirsiz',
      traceState: intent.allowPublicTrace ? GameState.gpt.detectSoftLoreTraceState(responseText) : 'uygulanmaz',
      anchors: GameState.gpt.pickSoftLoreAnchors(target),
      questionHints: questionHint ? [questionHint] : [],
      generatedNames: intent.allowGeneratedNames ? GameState.gpt.extractSoftLoreGeneratedNames(responseText, GameState.scenario) : [],
      source: 'generated',
      createdAt: now,
      updatedAt: now
    };

    bucket[intent.slotKey] = entry;
    GameState.loreMemory.updatedAt = now;
    this.scheduleSave();
    return entry;
  }
};

const EventLogManager = {
  getUrl(storyFolder = GameState.storyFolder) {
    return '/__log?story=' + encodeURIComponent(storyFolder || '');
  },

  canSave() {
    return Boolean(GameState.storyFolder);
  },

  normalizeStore(rawStore, storyFolder = GameState.storyFolder) {
    const normalized = createEmptyEventLog(storyFolder);
    if (!rawStore || typeof rawStore !== 'object') {
      return normalized;
    }

    normalized.version = Number.isInteger(rawStore.version) ? rawStore.version : 1;
    normalized.storyFolder = typeof rawStore.storyFolder === 'string' && rawStore.storyFolder.trim()
      ? rawStore.storyFolder.trim()
      : (storyFolder || '');
    normalized.sessionId = typeof rawStore.sessionId === 'string' ? rawStore.sessionId.trim() : '';
    normalized.createdAt = typeof rawStore.createdAt === 'number' ? rawStore.createdAt : 0;
    normalized.updatedAt = typeof rawStore.updatedAt === 'number' ? rawStore.updatedAt : 0;
    normalized.lastSequence = Number.isInteger(rawStore.lastSequence) ? Math.max(0, rawStore.lastSequence) : 0;
    normalized.entries = Array.isArray(rawStore.entries)
      ? rawStore.entries
          .map((entry, index) => normalizeEventLogEntry(entry, index + 1))
          .filter(Boolean)
          .slice(-GameState.MAX_EVENT_LOG_ENTRIES)
      : [];

    const lastEntrySequence = normalized.entries.length > 0
      ? normalized.entries[normalized.entries.length - 1].sequence
      : 0;
    if (normalized.lastSequence < lastEntrySequence) {
      normalized.lastSequence = lastEntrySequence;
    }

    if (!normalized.createdAt && normalized.entries.length > 0) {
      normalized.createdAt = normalized.entries[0].timestamp;
    }

    return normalized;
  },

  async load(storyFolder) {
    const response = await fetch(this.getUrl(storyFolder), { cache: 'no-store' });
    if (response.status === 404) {
      return this.normalizeStore(null, storyFolder);
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Olay günlüğü okunamadı.');
    }

    const payload = await response.json();
    GameState.eventLogDirty = false;
    return this.normalizeStore(payload.data || payload, storyFolder);
  },

  scheduleSave() {
    if (!this.canSave()) return;
    if (GameState.eventLogSaveTimer) clearTimeout(GameState.eventLogSaveTimer);

    GameState.eventLogSaveTimer = setTimeout(() => {
      this.saveNow().catch(err => console.error('Olay günlüğü kayıt hatası:', err));
    }, 250);
  },

  async saveNow(options = {}) {
    if (!this.canSave()) return;
    if (!GameState.eventLogDirty && !options.force) return;
    if (!hasPersistableEventLog(GameState.eventLog) && !options.force) {
      GameState.eventLogDirty = false;
      return;
    }

    if (GameState.eventLogSaveTimer) {
      clearTimeout(GameState.eventLogSaveTimer);
      GameState.eventLogSaveTimer = null;
    }

    GameState.eventLog.updatedAt = Date.now();
    GameState.eventLog.storyFolder = GameState.storyFolder || '';
    GameState.eventLog.sessionId = GameState.logSessionId || GameState.eventLog.sessionId || createEventLogSessionId();
    if (!GameState.eventLog.createdAt) {
      GameState.eventLog.createdAt = GameState.eventLog.updatedAt;
    }

    const body = JSON.stringify({
      storyFolder: GameState.storyFolder,
      data: GameState.eventLog
    });

    await fetch(this.getUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: Boolean(options.keepalive)
    });

    GameState.eventLogDirty = false;
  },

  flushOnUnload() {
    if (!this.canSave()) return;
    if (!GameState.eventLogDirty) return;
    if (!hasPersistableEventLog(GameState.eventLog)) {
      GameState.eventLogDirty = false;
      return;
    }

    GameState.eventLog.updatedAt = Date.now();
    GameState.eventLog.storyFolder = GameState.storyFolder || '';
    GameState.eventLog.sessionId = GameState.logSessionId || GameState.eventLog.sessionId || createEventLogSessionId();
    if (!GameState.eventLog.createdAt) {
      GameState.eventLog.createdAt = GameState.eventLog.updatedAt;
    }

    const body = JSON.stringify({
      storyFolder: GameState.storyFolder,
      data: GameState.eventLog
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(this.getUrl(), new Blob([body], { type: 'application/json' }));
      return;
    }

    fetch(this.getUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true
    }).catch(() => {});
  },

  async clear(storyFolder = GameState.storyFolder) {
    if (!storyFolder) return;
    GameState.eventLogDirty = false;
    await fetch(this.getUrl(storyFolder), { method: 'DELETE' });
  },

  append(entry) {
    if (!this.canSave()) return null;

    if (!GameState.eventLog || typeof GameState.eventLog !== 'object') {
      GameState.eventLog = createEmptyEventLog(GameState.storyFolder, GameState.logSessionId || createEventLogSessionId());
    }

    if (!GameState.logSessionId) {
      GameState.logSessionId = GameState.eventLog.sessionId || createEventLogSessionId();
    }

    const nextSequence = Number.isInteger(GameState.eventLog.lastSequence)
      ? GameState.eventLog.lastSequence + 1
      : (Array.isArray(GameState.eventLog.entries) ? GameState.eventLog.entries.length + 1 : 1);
    const normalizedEntry = normalizeEventLogEntry({
      ...entry,
      sessionId: entry?.sessionId || GameState.logSessionId,
      sequence: nextSequence,
      timestamp: Date.now()
    }, nextSequence);
    if (!normalizedEntry) return null;

    GameState.eventLog.lastSequence = normalizedEntry.sequence;
    GameState.eventLog.storyFolder = GameState.storyFolder || '';
    GameState.eventLog.sessionId = GameState.logSessionId;
    GameState.eventLog.updatedAt = Date.now();
    if (!GameState.eventLog.createdAt) {
      GameState.eventLog.createdAt = normalizedEntry.timestamp;
    }
    GameState.eventLog.entries = [...(GameState.eventLog.entries || []), normalizedEntry]
      .slice(-GameState.MAX_EVENT_LOG_ENTRIES);
    GameState.eventLogDirty = true;

    if (typeof window !== 'undefined') {
      window.__DEDEKTIF_LAST_EVENT = normalizedEntry;
      window.__DEDEKTIF_EVENT_LOG = GameState.eventLog;
    }

    console.info('[DEDEKTIF EVENT]', normalizedEntry);
    this.scheduleSave();
    return normalizedEntry;
  }
};

// ----------------------------------------------------------
// UI KONTROLCÜSÜ
// ----------------------------------------------------------
const UI = {

  // Ekran geçişi
  showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById('screen-' + screenName);
    if (screen) screen.classList.add('active');
    GameState.currentScreen = screenName;
    document.body.dataset.currentScreen = screenName;
    logGameEvent('ui', 'screen_changed', {
      screenName
    }, {
      includeState: true,
      screen: screenName,
      status: 'info'
    });
  },

  // Loading göster/gizle
  showLoading(show) {
    GameState.loadingCounter = show
      ? GameState.loadingCounter + 1
      : Math.max(0, GameState.loadingCounter - 1);

    const isVisible = GameState.loadingCounter > 0;
    document.getElementById('loading-overlay').style.display = isVisible ? 'flex' : 'none';
    document.getElementById('btn-send').disabled = isVisible;
    logGameEvent('ui', 'loading_state_changed', {
      requestedVisible: Boolean(show),
      visible: isVisible,
      loadingCounter: GameState.loadingCounter
    }, {
      includeState: false,
      status: 'info'
    });
  },

  // Bildirim göster
  notify(text) {
    const el = document.getElementById('notification');
    document.getElementById('notification-text').textContent = text;
    el.style.display = 'block';
    // Animasyon bitti reset
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = '';
    setTimeout(() => { el.style.display = 'none'; }, 3500);
    logGameEvent('ui', 'notification_shown', {
      text
    }, {
      includeState: false,
      status: 'info'
    });
  },

  // Header güncelle
  updateHeader() {
    document.getElementById('turn-counter').textContent = `Tur: ${GameState.totalTurns}`;
    document.getElementById('phase-label').textContent = `Aşama: ${GameState.phase}`;

    let label = 'Soruşturma';
    if (GameState.currentView === 'location' && GameState.currentTarget) {
      const loc = getEntityById('location', GameState.currentTarget);
      label = loc ? `📍 ${loc.name}` : label;
    } else if (GameState.currentView === 'character' && GameState.currentTarget) {
      const chr = getEntityById('character', GameState.currentTarget);
      label = chr ? `🗣️ ${chr.name}` : label;
    } else if (GameState.currentView === 'advisor') {
      label = `🎖️ ${GameState.scenario.advisor.name}`;
    } else if (GameState.currentView === 'clue' && GameState.currentTarget) {
      const clue = getEntityById('clue', GameState.currentTarget);
      label = clue ? `🔍 ${clue.name}` : label;
    }
    document.getElementById('current-context-label').textContent = label;
  },

  // Sol panel: Mekanlar listesi
  renderLocations() {
    const list = document.getElementById('list-locations');
    list.innerHTML = '';
    GameState.scenario.locations.forEach(loc => {
      const available = isLocationAvailable(loc.id);
      if (!available) return;

      const visited = GameState.visitedLocations.has(loc.id);
      const isActive = GameState.currentView === 'location' && GameState.currentTarget === loc.id;

      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'entity-item' + (isActive ? ' active' : '');
      btn.innerHTML = `
        <span class="entity-icon">${loc.icon || '📍'}</span>
        ${GameState.images['loc_' + loc.id] ? `<img class="entity-thumbnail" src="${GameState.images['loc_' + loc.id]}" alt="">` : ''}
        <span class="entity-name">${loc.name}${visited ? ' ✓' : ''}</span>
        <span class="entity-img-btn ${GameState.images['loc_' + loc.id] ? 'has-image' : ''}" data-img-type="location" data-img-id="${loc.id}" title="Görsel ekle">+</span>
      `;

      if (available) {
        btn.addEventListener('click', (e) => {
          if (e.target.classList.contains('entity-img-btn')) return;
          switchContext('location', loc.id);
        });
      }

      li.appendChild(btn);
      list.appendChild(li);
    });
  },

  // Sol panel: İpuçları listesi
  renderClues() {
    const list = document.getElementById('list-clues');
    const noText = document.getElementById('no-clues-text');
    list.innerHTML = '';

    if (GameState.foundClues.length === 0) {
      noText.style.display = 'block';
      return;
    }
    noText.style.display = 'none';

    GameState.foundClues.forEach(clue => {
      const isActive = GameState.currentView === 'clue' && GameState.currentTarget === clue.id;
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'entity-item' + (isActive ? ' active' : '');
      btn.innerHTML = `
        <span class="entity-icon">${clue.icon || '🔍'}</span>
        ${GameState.images['clue_' + clue.id] ? `<img class="entity-thumbnail" src="${GameState.images['clue_' + clue.id]}" alt="">` : ''}
        <span class="entity-name">${clue.name}</span>
        <span class="entity-img-btn ${GameState.images['clue_' + clue.id] ? 'has-image' : ''}" data-img-type="clue" data-img-id="${clue.id}" title="Görsel ekle">+</span>
      `;
      btn.addEventListener('click', (e) => {
        if (e.target.classList.contains('entity-img-btn')) return;
        switchContext('clue', clue.id);
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
  },

  // Sağ panel: Karakterler listesi
  renderCharacters() {
    const list = document.getElementById('list-characters');
    list.innerHTML = '';
    const availableCharacters = GameState.scenario.characters.filter(char => isCharacterAvailable(char.id));

    if (availableCharacters.length === 0) {
      const li = document.createElement('li');
      li.className = 'empty-text entity-list-hint';
      li.textContent = 'Henüz görünen şüpheli yok. Yeni isimler ipuçları ve ziyaretlerle açılacak.';
      list.appendChild(li);
      return;
    }

    availableCharacters.forEach(char => {
      const isActive = GameState.currentView === 'character' && GameState.currentTarget === char.id;
      const talked = GameState.conversations['char_' + char.id]?.length > 0;

      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'entity-item' + (isActive ? ' active' : '');
      btn.innerHTML = `
        <span class="entity-icon">${char.icon || '👤'}</span>
        ${GameState.images['char_' + char.id] ? `<img class="entity-thumbnail" src="${GameState.images['char_' + char.id]}" alt="">` : ''}
        <span class="entity-name">${char.name}${talked ? ' ✓' : ''}</span>
        <span class="entity-img-btn ${GameState.images['char_' + char.id] ? 'has-image' : ''}" data-img-type="character" data-img-id="${char.id}" title="Görsel ekle">+</span>
      `;
      btn.addEventListener('click', (e) => {
        if (e.target.classList.contains('entity-img-btn')) return;
        switchContext('character', char.id);
      });
      li.appendChild(btn);
      list.appendChild(li);
    });

    const lockedCount = GameState.scenario.characters.length - availableCharacters.length;
    if (lockedCount > 0) {
      const li = document.createElement('li');
      li.className = 'empty-text entity-list-hint';
      li.textContent = `${lockedCount} isim daha soruşturma ilerledikçe açılacak.`;
      list.appendChild(li);
    }
  },

  // Danışman butonu
  setupAdvisor() {
    const adv = GameState.scenario?.advisor;
    const btn = document.getElementById('btn-advisor');
    document.getElementById('advisor-icon').textContent = adv?.icon || '🎖️';
    document.getElementById('advisor-name').textContent = adv?.name || 'Danışman';

    if (!btn.dataset.bound) {
      btn.addEventListener('click', () => {
        if (!GameState.scenario) return;
        switchContext('advisor', null);
      });
      btn.dataset.bound = 'true';
    }
  },

  renderSignalTags(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return '<span class="presence-tag subtle">okunur bir değişim yok</span>';
    }

    return items
      .map(item => {
        const text = getPresenceCueText(item);
        if (!text) return '';

        const source = item?.source === 'dynamic' ? 'dynamic' : 'base';
        const badge = source === 'dynamic'
          ? '<span class="presence-tag-badge">anlik</span>'
          : '';

        return `<span class="presence-tag presence-tag-${source}">${badge}<span>${this.escapeHtml(text)}</span></span>`;
      })
      .join('');
  },

  renderCharacterPresence() {
    const bar = document.getElementById('character-presence-bar');
    const nameEl = document.getElementById('character-presence-name');
    const lookEl = document.getElementById('character-presence-look');
    const voiceEl = document.getElementById('character-presence-voice');

    if (GameState.currentView !== 'character' || !GameState.currentTarget) {
      bar.classList.remove('active');
      nameEl.textContent = 'Karakter okuması';
      lookEl.innerHTML = '';
      voiceEl.innerHTML = '';
      return;
    }

    const character = getEntityById('character', GameState.currentTarget);
    const state = ensureCharacterState(GameState.currentTarget);
    if (!character || !state) {
      bar.classList.remove('active');
      return;
    }

    nameEl.textContent = `${character.icon || '👤'} ${character.name}`;
    lookEl.innerHTML = this.renderSignalTags(state.visibleAppearance);
    voiceEl.innerHTML = this.renderSignalTags(state.voiceTone);
    bar.classList.add('active');
  },

  // Chat alanını temizle ve özet göster
  clearChat(summaryHtml) {
    const messages = document.getElementById('chat-messages');
    messages.innerHTML = '';
    if (summaryHtml) {
      const div = document.createElement('div');
      div.className = 'chat-summary-note';
      div.innerHTML = summaryHtml;
      messages.appendChild(div);
    }
  },

  buildContextToolsPanel() {
    const items = getCurrentInspectableItems();
    if (items.length === 0) return null;

    const wrapper = document.createElement('div');
    wrapper.className = 'chat-context-tools';

    const heading = document.createElement('div');
    heading.className = 'context-tools-heading';
    heading.innerHTML = `
      <div class="context-tools-title">${GameState.currentView === 'location' ? '🧩 İncelenebilirler' : '🔍 Yerel İnceleme'}</div>
      <div class="context-tools-subtitle">Birine tıkla ya da etiketi yazarak yerel cevap al.</div>
    `;
    wrapper.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'context-tools-grid';

    items.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'context-tool-card' + (item.resolved ? ' resolved' : '');
      button.innerHTML = `
        <div class="context-tool-topline">
          <span class="context-tool-icon">${item.icon}</span>
          <span class="context-tool-tag">${this.escapeHtml(item.displayTag)}</span>
        </div>
        <div class="context-tool-label">${this.escapeHtml(item.label)}</div>
        <div class="context-tool-meta">${this.escapeHtml(item.subtitle || 'yerel inceleme')}</div>
      `;
      button.addEventListener('click', () => {
        handleInspectableSelection(item).catch(err => {
          console.error('Yerel inceleme hatası:', err);
          UI.notify('⚠️ Yerel inceleme çalıştırılamadı.');
        });
      });
      grid.appendChild(button);
    });

    wrapper.appendChild(grid);
    return wrapper;
  },

  syncContextTools(scrollToBottom = false) {
    const messages = document.getElementById('chat-messages');
    if (!messages) return;

    messages.querySelectorAll('.chat-context-tools').forEach(node => node.remove());

    const panel = this.buildContextToolsPanel();
    if (panel) {
      messages.appendChild(panel);
    }

    if (scrollToBottom) {
      const chatArea = document.getElementById('chat-area');
      chatArea.scrollTop = chatArea.scrollHeight;
    }
  },

  renderConversation(key) {
    const existingSummary = GameState.gptSummaries[key];
    const summaryHtml = existingSummary
      ? `<strong>📋 Önceki Notlar:</strong> ${this.escapeHtml(existingSummary)}`
      : '';

    this.clearChat(summaryHtml);

    const history = GameState.conversations[key] || [];
    history.forEach(msg => {
      this.addChatMessage(msg.role, msg.content, msg.senderName, msg.isClueFound, msg.foundClueIds, msg.messageKind, false);
    });

    this.syncContextTools();

    const chatArea = document.getElementById('chat-area');
    chatArea.scrollTop = chatArea.scrollHeight;
  },

  buildFoundClueChipRow(clueIds) {
    const uniqueIds = Array.isArray(clueIds)
      ? clueIds.filter((clueId, index, array) => clueId && array.indexOf(clueId) === index)
      : [];
    if (uniqueIds.length === 0) return null;

    const row = document.createElement('div');
    row.className = 'msg-reference-row';

    uniqueIds.forEach(clueId => {
      const clue = getEntityById('clue', clueId);
      if (!clue) return;

      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'msg-reference-chip';
      chip.textContent = `${formatEntityReferenceTag('clue', clue)} · ${clue.name}`;
      chip.addEventListener('click', () => {
        appendLocalReferenceResponse([buildReferenceItem('clue', clue)], { senderName: '⚡ Hızlı Bakış' }).catch(err => {
          console.error('Hızlı bakış hatası:', err);
        });
      });
      row.appendChild(chip);
    });

    return row;
  },

  // Chat'e mesaj ekle
  addChatMessage(role, text, senderName, isClueFound = false, foundClueIds = [], messageKind = null, syncContextTools = true) {
    const messages = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `chat-msg ${role}` + (isClueFound ? ' clue-found' : '') + (messageKind ? ` ${messageKind}` : '');

    let html = '';
    if (senderName && role !== 'user') {
      html += `<div class="msg-sender">${senderName}</div>`;
    }
    html += `<div class="msg-text">${this.escapeHtml(text)}</div>`;
    div.innerHTML = html;

    const clueChipRow = this.buildFoundClueChipRow(foundClueIds);
    if (clueChipRow) {
      div.appendChild(clueChipRow);
    }

    messages.appendChild(div);
    if (syncContextTools) {
      this.syncContextTools();
    }
    // Auto scroll
    const chatArea = document.getElementById('chat-area');
    chatArea.scrollTop = chatArea.scrollHeight;
  },

  // Sistem mesajı (ortada, altın kenarlıklı)
  addSystemMessage(text) {
    this.addChatMessage('system', text, null, false);
  },

  // HTML escape
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // Alt panel: Notları güncelle
  renderNotes() {
    const locDiv = document.getElementById('notes-locations');
    const charDiv = document.getElementById('notes-characters');
    const clueDiv = document.getElementById('notes-clues');

    // Mekan notları
    const locNotes = GameState.playerNotes.filter(n => n.type === 'location');
    if (locNotes.length > 0) {
      locDiv.innerHTML = locNotes.map(n => `
        <div class="note-entry">
          <span class="note-index">${n.index}.</span>
          <span class="note-title">${n.title}</span>
          ${getReferenceTagForEntity('location', n.entityId) ? `<span class="note-ref-tag">${this.escapeHtml(getReferenceTagForEntity('location', n.entityId))}</span>` : ''}
          <div class="note-text">${this.escapeHtml(n.text)}</div>
        </div>
      `).join('');
    } else {
      locDiv.innerHTML = '<p class="empty-text">Henüz mekan notu yok.</p>';
    }

    // Karakter notları
    const charNotes = GameState.playerNotes.filter(n => n.type === 'character');
    if (charNotes.length > 0) {
      charDiv.innerHTML = charNotes.map(n => `
        <div class="note-entry">
          <span class="note-index">${n.index}.</span>
          <span class="note-title">${n.title}</span>
          ${getReferenceTagForEntity('character', n.entityId) ? `<span class="note-ref-tag">${this.escapeHtml(getReferenceTagForEntity('character', n.entityId))}</span>` : ''}
          <div class="note-text">${this.escapeHtml(n.text)}</div>
        </div>
      `).join('');
    } else {
      charDiv.innerHTML = '<p class="empty-text">Henüz karakter notu yok.</p>';
    }

    // İpucu notları
    const clueNotes = GameState.playerNotes.filter(n => n.type === 'clue');
    if (clueNotes.length > 0) {
      clueDiv.innerHTML = clueNotes.map(n => `
        <div class="note-entry">
          <span class="note-index">${n.index}.</span>
          <span class="note-title">${n.title}</span>
          ${getReferenceTagForEntity('clue', n.entityId) ? `<span class="note-ref-tag">${this.escapeHtml(getReferenceTagForEntity('clue', n.entityId))}</span>` : ''}
          <div class="note-text">${this.escapeHtml(n.text)}</div>
        </div>
      `).join('');
    } else {
      clueDiv.innerHTML = '<p class="empty-text">Henüz ipucu notu yok.</p>';
    }
  },

  // Suçlama ekranı
  renderAccusationScreen() {
    document.getElementById('accusation-intro').textContent = GameState.scenario.accusation.intro_text;

    // Delil listesi
    const clueList = document.getElementById('accusation-clue-list');
    clueList.innerHTML = '';
    GameState.foundClues.forEach(c => {
      const li = document.createElement('li');
      li.textContent = `${c.name}: ${c.short_description}`;
      clueList.appendChild(li);
    });

    // Şüpheli kartları
    const grid = document.getElementById('accusation-suspects');
    grid.innerHTML = '';
    GameState.selectedSuspect = null;
    document.getElementById('btn-accuse').disabled = true;

    const accusationCharacters = GameState.scenario.characters.filter(char => isCharacterAvailable(char.id));
    (accusationCharacters.length > 0 ? accusationCharacters : GameState.scenario.characters).forEach(char => {
      const card = document.createElement('div');
      card.className = 'suspect-card';
      card.innerHTML = `
        <div class="suspect-icon">${char.icon || '👤'}</div>
        <div class="suspect-name">${char.name}</div>
        <div class="suspect-title">${char.title}</div>
      `;
      card.addEventListener('click', () => {
        document.querySelectorAll('.suspect-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        GameState.selectedSuspect = char.id;
        document.getElementById('btn-accuse').disabled = false;
      });
      grid.appendChild(card);
    });
  },

  // Tüm panelleri güncelle
  refreshAll() {
    this.renderLocations();
    this.renderClues();
    this.renderCharacters();
    this.renderNotes();
    this.updateHeader();
    this.renderCharacterPresence();

    // Karar merkezi görünürlüğü
    document.getElementById('accusation-section').style.display =
      canOpenAccusation() ? 'block' : 'none';
  }
};

// ----------------------------------------------------------
// BAĞLAM DEĞİŞİKLİĞİ (Entity switch)
// ----------------------------------------------------------
async function switchContext(newView, newTargetId) {
  // Aynı yere tıklama
  if (GameState.currentView === newView && GameState.currentTarget === newTargetId) return;

  if (!isValidContext(newView, newTargetId)) {
    if (newView === 'character') {
      UI.notify('🗣️ Bu şüpheli henüz görünür değil. Önce hattı ve ipuçlarını ilerlet.');
    }
    return;
  }

  // Mevcut context'ten çıkış: özeti arka plan kuyruğuna al
  queueSummaryForContext(GameState.currentView, GameState.currentTarget);
  closeReferenceAutocomplete();

  logGameEvent('ui', 'context_switch_requested', {
    fromView: GameState.currentView,
    fromTargetId: GameState.currentTarget,
    toView: newView,
    toTargetId: newTargetId,
    hasExistingHistory: (GameState.conversations[getConversationKey(newView, newTargetId)]?.length || 0) > 0
  }, {
    status: 'info',
    view: newView,
    targetId: newTargetId,
    targetName: getCurrentEventTargetName(newView, newTargetId)
  });

  // Yeni context'e giriş
  GameState.currentView = newView;
  GameState.currentTarget = newTargetId;
  SaveManager.scheduleSave();

  const key = getConversationKey(newView, newTargetId);
  const hasHistory = (GameState.conversations[key]?.length || 0) > 0;

  UI.renderConversation(key);
  UI.refreshAll();

  switch (newView) {
    case 'location':
      await enterLocation(newTargetId, hasHistory);
      break;
    case 'character':
      await enterCharacter(newTargetId, hasHistory);
      break;
    case 'advisor':
      await enterAdvisor(hasHistory);
      break;
    case 'clue':
      await enterClue(newTargetId, hasHistory);
      break;
  }
}

// ----------------------------------------------------------
// MEKAN GİRİŞ
// ----------------------------------------------------------
async function enterLocation(locId, hasHistory) {
  const location = getEntityById('location', locId);
  if (!location) return;

  logGameEvent('interaction', 'enter_location', {
    locationId: locId,
    locationName: location.name,
    hasHistory
  }, {
    status: 'info',
    view: 'location',
    targetId: locId,
    targetName: location.name
  });

  const availableBefore = getAvailableLocationIds();
  const availableCharactersBefore = getAvailableCharacterIds();
  GameState.visitedLocations.add(locId);
  refreshAvailability(availableBefore, availableCharactersBefore);
  const key = getConversationKey('location', locId);

  if (!hasHistory) {
    // İlk ziyaret: hazır entry_text göster
    addMessage(key, 'system', location.entry_text);
    if (isConversationActive(key)) {
      UI.addSystemMessage(location.entry_text);
    }

    // GPT'den atmosferik tasvir al
    UI.showLoading(true);
    try {
      const rawResponse = await GameState.gpt.enterLocation(location, GameState.scenario, GameState);
      const response = applySpoilerGuardsToResponse(rawResponse, 'location_enter', locId, '');
      GameState.totalTurns++;

      addMessage(key, 'assistant', response.text, {
        senderName: '📍 ' + location.name,
        isClueFound: response.clues_found.length > 0,
        foundClueIds: response.clues_found
      });
      recordInteractionEvent(response, {
        contextView: 'location',
        conversationKey: key,
        targetId: locId,
        targetName: location.name,
        senderName: '📍 ' + location.name
      });
      if (isConversationActive(key)) {
        UI.addChatMessage('assistant', response.text, '📍 ' + location.name, response.clues_found.length > 0, response.clues_found);
      }

      // İpucu kontrolü
      processFoundClues(response.clues_found);

      // Özet güncelle
      appendSummary(key, response.summary);

    } catch (err) {
      addMessage(key, 'system', '⚠️ Hata: ' + err.message);
      if (isConversationActive(key)) {
        UI.addSystemMessage('⚠️ Hata: ' + err.message);
      }
    }
    UI.showLoading(false);
  }

  UI.updateHeader();
}

// ----------------------------------------------------------
// KARAKTER GİRİŞ
// ----------------------------------------------------------
async function enterCharacter(charId, hasHistory) {
  const character = getEntityById('character', charId);
  if (!character || !isCharacterAvailable(charId)) return;
  logGameEvent('interaction', 'enter_character', {
    characterId: charId,
    characterName: character.name,
    hasHistory
  }, {
    status: 'info',
    view: 'character',
    targetId: charId,
    targetName: character.name
  });
  const state = ensureCharacterState(charId);
  const turnsAway = state ? Math.max(0, GameState.totalTurns - (state.lastInteractionTurn || 0)) : 0;
  applyPassiveCharacterDrift(character, turnsAway);
  UI.renderCharacterPresence();
  const key = getConversationKey('character', charId);

  // Karakter konuşma sayacını güncelle
  GameState.uniqueCharConversations.add(charId);
  // Yeni karakter konuşması forensic tetikleyebilir
  checkForensicReports();

  if (!hasHistory) {
    // İlk karşılaşma
    UI.showLoading(true);
    try {
      const rawResponse = await GameState.gpt.meetCharacter(character, GameState.scenario, GameState);
      const response = applySpoilerGuardsToResponse(rawResponse, 'character_chat', charId, '');
      GameState.totalTurns++;
      const state = ensureCharacterState(charId);
      if (state) {
        state.lastInteractionTurn = GameState.totalTurns;
      }

      addMessage(key, 'assistant', response.text, {
        senderName: character.name,
        isClueFound: response.clues_found.length > 0,
        foundClueIds: response.clues_found
      });
      recordInteractionEvent(response, {
        contextView: 'character',
        conversationKey: key,
        targetId: charId,
        targetName: character.name,
        senderName: character.name
      });
      if (isConversationActive(key)) {
        UI.addChatMessage('assistant', response.text, character.name, response.clues_found.length > 0, response.clues_found);
      }

      processFoundClues(response.clues_found);
      appendSummary(key, response.summary);

    } catch (err) {
      addMessage(key, 'system', '⚠️ Hata: ' + err.message);
      if (isConversationActive(key)) {
        UI.addSystemMessage('⚠️ Hata: ' + err.message);
      }
    }
    UI.showLoading(false);
  }

  UI.updateHeader();
}

// ----------------------------------------------------------
// DANIŞMAN GİRİŞ
// ----------------------------------------------------------
async function enterAdvisor(hasHistory) {
  const adv = GameState.scenario.advisor;
  const key = getConversationKey('advisor', null);
  logGameEvent('interaction', 'enter_advisor', {
    advisorName: adv.name,
    hasHistory
  }, {
    status: 'info',
    view: 'advisor',
    targetName: adv.name
  });
  if (!hasHistory) {
    addMessage(key, 'system', `${adv.name} ile görüşmeye başladın. Takıldığın konuları sor.`);
    if (isConversationActive(key)) {
      UI.addSystemMessage(`${adv.name} ile görüşmeye başladın. Takıldığın konuları sor.`);
    }
  }
  UI.updateHeader();
}

// ----------------------------------------------------------
// İPUCU İNCELEME GİRİŞ
// ----------------------------------------------------------
async function enterClue(clueId, hasHistory) {
  const clue = GameState.foundClues.find(c => c.id === clueId);
  if (!clue) return;
  const key = getConversationKey('clue', clueId);

  logGameEvent('interaction', 'enter_clue', {
    clueId,
    clueName: clue.name,
    hasHistory
  }, {
    status: 'info',
    view: 'clue',
    targetId: clueId,
    targetName: clue.name
  });

  if (!hasHistory) {
    addMessage(key, 'system', `${clue.name} ipucunu inceliyorsun.\n${clue.short_description}`);
    if (isConversationActive(key)) {
      UI.addSystemMessage(`${clue.name} ipucunu inceliyorsun.\n${clue.short_description}`);
    }
  }
  UI.updateHeader();
}

  async function handleInspectableSelection(inspectableOrText, options = {}) {
    const inspectable = typeof inspectableOrText === 'string'
      ? resolveDirectInspectableCommand(inspectableOrText)
      : inspectableOrText;

    if (!inspectable || inspectable.type !== 'inspectable') return false;
    if (inspectable.contextView !== GameState.currentView || inspectable.contextTarget !== GameState.currentTarget) {
      return false;
    }

    const key = getCurrentConversationKey();
    if (!key) return false;

    const userMessage = options.userMessage || inspectable.displayTag || inspectable.label;

    if (!options.skipUserEcho) {
      UI.addChatMessage('user', userMessage, null, false);
      addMessage(key, 'user', userMessage);
      await SaveManager.saveNow();
    }

    logGameEvent('interaction', 'local_inspect_requested', {
      userMessage,
      inspectableId: inspectable.id,
      inspectableLabel: inspectable.label,
      contextView: inspectable.contextView,
      contextTarget: inspectable.contextTarget
    }, {
      status: 'info',
      view: inspectable.contextView,
      targetId: inspectable.contextTarget,
      targetName: getCurrentEventTargetName(inspectable.contextView, inspectable.contextTarget)
    });

    return appendLocalInspectableResponse([inspectable], {
      userMessage,
      senderName: options.senderName
    });
  }

// ----------------------------------------------------------
// MESAJ GÖNDERME
// ----------------------------------------------------------
async function sendMessage() {
  const input = document.getElementById('user-input');
  const text = input.value.trim();
  if (!text) return;
  if (!GameState.currentView) {
    UI.addSystemMessage('Önce bir mekan, karakter veya ipucu seç.');
    return;
  }

  const loreInteractionType = GameState.currentView === 'location'
    ? 'location_chat'
    : GameState.currentView === 'clue'
      ? 'clue_examine'
      : null;
  const loreTarget = loreInteractionType
    ? getInteractionContext(loreInteractionType, GameState.currentTarget)
    : null;
  const loreIntent = (loreInteractionType && GameState.gpt)
    ? GameState.gpt.classifySoftLoreQuery(loreInteractionType, loreTarget, text)
    : null;

  logGameEvent('interaction', 'message_submitted', {
    rawText: text,
    loreInteractionType,
    loreIntent: loreIntent ? {
      slotKey: loreIntent.slotKey,
      label: loreIntent.label
    } : null
  }, {
    status: 'info'
  });

  input.value = '';
  closeReferenceAutocomplete();
  UI.addChatMessage('user', text, null, false);

  const key = getConversationKey(GameState.currentView, GameState.currentTarget);
  addMessage(key, 'user', text, {
    messageKind: loreIntent ? 'soft-lore' : null
  });
  await SaveManager.saveNow();

  const referenceItems = extractReferenceItemsFromText(text);
  const inspectableItems = referenceItems.filter(item => item.type === 'inspectable');
  const entityReferenceItems = referenceItems.filter(item => item.type !== 'inspectable');

  if (referenceItems.length > 0 && isPureReferenceQuery(text)) {
    logGameEvent('interaction', 'pure_reference_query', {
      text,
      referenceItems
    }, {
      status: 'info'
    });
    if (inspectableItems.length > 0) {
      await appendLocalInspectableResponse(inspectableItems, { userMessage: text });
    }
    if (entityReferenceItems.length > 0) {
      await appendLocalReferenceResponse(entityReferenceItems);
    }
    UI.updateHeader();
    return;
  }

  const directInspectable = resolveDirectInspectableCommand(text);
  if (directInspectable) {
    logGameEvent('interaction', 'direct_inspectable_command', {
      text,
      inspectableId: directInspectable.id,
      inspectableLabel: directInspectable.label
    }, {
      status: 'info'
    });
    await handleInspectableSelection(directInspectable, {
      skipUserEcho: true,
      userMessage: text
    });
    UI.updateHeader();
    return;
  }

  const recentMessages = getRecentMessages(key, GameState.MAX_RECENT_MESSAGES)
    .map(message => ({
      ...message,
      content: replaceReferenceTagsInText(message.content)
    }));
  const resolvedText = replaceReferenceTagsInText(text);

  UI.showLoading(true);
  try {
    let response;
    let logSenderName = '';
    let logTargetName = '';
    let logMessageKind = loreIntent ? 'soft-lore' : '';
    switch (GameState.currentView) {
      case 'location': {
        const location = getEntityById('location', GameState.currentTarget);
        const rawResponse = await GameState.gpt.chatAtLocation(location, resolvedText, GameState.scenario, GameState, recentMessages);
        response = applySpoilerGuardsToResponse(rawResponse, 'location_chat', GameState.currentTarget, resolvedText);
        logSenderName = '📍 ' + location.name;
        logTargetName = location.name;
        addMessage(key, 'assistant', response.text, {
          senderName: '📍 ' + location.name,
          isClueFound: response.clues_found.length > 0,
          foundClueIds: response.clues_found,
          messageKind: loreIntent ? 'soft-lore' : null
        });
        UI.addChatMessage('assistant', response.text, '📍 ' + location.name, response.clues_found.length > 0, response.clues_found);
        break;
      }
      case 'character': {
        const character = getEntityById('character', GameState.currentTarget);
        applyPlayerMessageToCharacterState(character, resolvedText);
        UI.renderCharacterPresence();
        const rawResponse = await GameState.gpt.chatWithCharacter(character, resolvedText, GameState.scenario, GameState, recentMessages);
        response = applySpoilerGuardsToResponse(rawResponse, 'character_chat', GameState.currentTarget, resolvedText);
        logSenderName = character.name;
        logTargetName = character.name;
        logMessageKind = '';
        addMessage(key, 'assistant', response.text, {
          senderName: character.name,
          isClueFound: response.clues_found.length > 0,
          foundClueIds: response.clues_found
        });
        UI.addChatMessage('assistant', response.text, character.name, response.clues_found.length > 0, response.clues_found);
        finalizeCharacterStateAfterResponse(character, response);
        UI.renderCharacterPresence();
        break;
      }
      case 'advisor': {
        const rawResponse = await GameState.gpt.askAdvisor(resolvedText, GameState.scenario, GameState, recentMessages);
        response = applySpoilerGuardsToResponse(rawResponse, 'advisor', null, resolvedText);
        logSenderName = GameState.scenario.advisor.name;
        logTargetName = GameState.scenario.advisor.name;
        logMessageKind = '';
        addMessage(key, 'assistant', response.text, {
          senderName: GameState.scenario.advisor.name,
          isClueFound: false
        });
        UI.addChatMessage('assistant', response.text, GameState.scenario.advisor.name, false);
        break;
      }
      case 'clue': {
        const clue = GameState.foundClues.find(c => c.id === GameState.currentTarget);
        const rawResponse = await GameState.gpt.examineClue(clue, resolvedText, GameState.scenario, GameState, recentMessages);
        response = applySpoilerGuardsToResponse(rawResponse, 'clue_examine', GameState.currentTarget, resolvedText);
        logSenderName = '🔍 ' + clue.name;
        logTargetName = clue.name;
        addMessage(key, 'assistant', response.text, {
          senderName: '🔍 ' + clue.name,
          isClueFound: response.clues_found.length > 0,
          foundClueIds: response.clues_found,
          messageKind: loreIntent ? 'soft-lore' : null
        });
        UI.addChatMessage('assistant', response.text, '🔍 ' + clue.name, response.clues_found.length > 0, response.clues_found);
        break;
      }
    }

    GameState.totalTurns++;

    if (response) {
      recordInteractionEvent(response, {
        contextView: GameState.currentView,
        conversationKey: key,
        targetId: GameState.currentTarget,
        targetName: logTargetName,
        senderName: logSenderName,
        messageKind: logMessageKind
      });
      processFoundClues(response.clues_found);
      const judgeApprovedForLore = response?.judge?.approved !== false && response?.judge?.finalAction !== 'fallback';
      if (loreIntent && judgeApprovedForLore) {
        LoreManager.upsertFromInteraction(GameState.currentView, GameState.currentTarget, resolvedText, response.text);
      } else {
        appendSummary(key, response.summary);
      }
      await SaveManager.saveNow();
    }

  } catch (err) {
    logGameEvent('error', 'message_pipeline_failed', {
      text,
      currentView: GameState.currentView,
      currentTarget: GameState.currentTarget
    }, {
      status: 'error',
      error: err.message
    });
    addMessage(key, 'system', '⚠️ Hata: ' + err.message);
    UI.addSystemMessage('⚠️ Hata: ' + err.message);
    await SaveManager.saveNow();
  }

  UI.showLoading(false);
  UI.updateHeader();
}

// ----------------------------------------------------------
// İPUCU İŞLEME
// ----------------------------------------------------------
function processFoundClues(clueIds) {
  if (!clueIds || clueIds.length === 0) return;

  const availableBefore = getAvailableLocationIds();
  const availableCharactersBefore = getAvailableCharacterIds();
  const sourceLabel = getCurrentContextLabel();
  let addedAny = false;
  const addedClues = [];

  clueIds.forEach(clueId => {
    // Zaten bulunduysa atla
    if (hasFoundClue(clueId)) return;

    const clue = GameState.scenario.clues.find(c => c.id === clueId);
    if (!clue) return;

    GameState.foundClues.push(clue);
    addedAny = true;
    addedClues.push({ id: clue.id, name: clue.name, sourceLabel });

    // İpucu notu ekle
    const noteIndex = GameState.playerNotes.length + 1;
    GameState.playerNotes.push({
      index: noteIndex,
      type: 'clue',
      entityId: clue.id,
      entityName: clue.name,
      title: clue.name,
      text: clue.short_description
    });

    seedClueConversationSummary(clue, sourceLabel);

    UI.notify(`🔍 Yeni İpucu: ${clue.name}`);
  });

  if (!addedAny) return;

  logGameEvent('state', 'clues_added', {
    clues: addedClues,
    sourceLabel
  }, {
    status: 'success'
  });

  // Aşama geçişi kontrolü
  checkPhaseTransition({ skipRefresh: true });

  // Adli tıp raporu kontrolü
  checkForensicReports({ skipRefresh: true });

  refreshAvailability(availableBefore, availableCharactersBefore);

  SaveManager.scheduleSave();
}

// ----------------------------------------------------------
// AŞAMA GEÇİŞİ
// ----------------------------------------------------------
function checkPhaseTransition(options = {}) {
  const currentPhase = GameState.scenario.phases.find(p => p.id === GameState.phase);
  if (!currentPhase || !currentPhase.next_phase_trigger) return;

  const availableBefore = getAvailableLocationIds();
  const availableCharactersBefore = getAvailableCharacterIds();

  const trigger = currentPhase.next_phase_trigger;
  const triggerSatisfied = isUnlockConditionMet(trigger);
  logGameEvent('state', 'phase_transition_checked', {
    currentPhaseId: currentPhase.id,
    trigger,
    satisfied: triggerSatisfied
  }, {
    status: triggerSatisfied ? 'success' : 'info'
  });

  if (triggerSatisfied) {
    GameState.phase++;
    const newPhase = GameState.scenario.phases.find(p => p.id === GameState.phase);
    logGameEvent('state', 'phase_advanced', {
      fromPhase: currentPhase.id,
      toPhase: GameState.phase,
      phaseName: newPhase?.name || '',
      phaseDescription: newPhase?.description || ''
    }, {
      status: 'success'
    });
    if (newPhase) {
      UI.notify(`📢 ${newPhase.name}: ${newPhase.description}`);
    }

    // Aşama değişince tekrar rapor kontrolü
    checkForensicReports({ skipRefresh: true });
    if (!options.skipRefresh) {
      refreshAvailability(availableBefore, availableCharactersBefore);
    }
    SaveManager.scheduleSave();
  }
}

// ----------------------------------------------------------
// ADLİ TIP RAPORU SİSTEMİ
// ----------------------------------------------------------
function checkForensicReports(options = {}) {
  const reports = GameState.scenario.forensic_reports;
  if (!reports) return;

  const availableBefore = getAvailableLocationIds();
  const availableCharactersBefore = getAvailableCharacterIds();
  let unlockedAny = false;
  const unlockedReports = [];

  reports.forEach(report => {
    // Zaten açılmışsa atla
    if (GameState.unlockedReports.has(report.id)) return;

    const cond = report.unlock_condition;

    if (isUnlockConditionMet(cond)) {
      GameState.unlockedReports.add(report.id);
      unlockedAny = true;
      unlockedReports.push({
        id: report.id,
        name: report.name,
        clueRevealed: report.clue_revealed || null,
        notificationText: report.notification_text || ''
      });

      // İlgili ipucunu otomatik ekle
      const clueId = report.clue_revealed;
      if (clueId && !hasFoundClue(clueId)) {
        const clue = GameState.scenario.clues.find(c => c.id === clueId);
        if (clue) {
          GameState.foundClues.push(clue);

          const noteIndex = GameState.playerNotes.length + 1;
          GameState.playerNotes.push({
            index: noteIndex,
            type: 'clue',
            entityId: clue.id,
            entityName: clue.name,
            title: `📋 ${report.name}`,
            text: clue.short_description
          });

          seedClueConversationSummary(clue, report.name);

          UI.notify(report.notification_text);

          // Rapor ile gelen ipucu da aşama geçişi tetikleyebilir
          checkPhaseTransition({ skipRefresh: true });
        }
      }

      SaveManager.scheduleSave();
    }
  });

  if (unlockedAny && !options.skipRefresh) {
    refreshAvailability(availableBefore, availableCharactersBefore);
  }

  if (unlockedReports.length > 0) {
    logGameEvent('state', 'forensic_reports_unlocked', {
      reports: unlockedReports
    }, {
      status: 'success'
    });
  }
}

// ----------------------------------------------------------
// ÖZET YÖNETİMİ
// ----------------------------------------------------------

// Yeni özet parçası ekle
function appendSummary(key, summaryText) {
  if (!summaryText) return;
  const existing = GameState.gptSummaries[key] || '';
  GameState.gptSummaries[key] = existing
    ? existing + ' | ' + summaryText
    : summaryText;
  SaveManager.scheduleSave();
}

function queueSummaryForContext(view, target) {
  if (!view || !GameState.gpt) return;

  const key = getConversationKey(view, target);
  const version = getSummaryVersion(key);
  if (!version || GameState._lastSummaryVersions[key] === version) return;

  GameState._queuedSummaries[key] = { key, view, target, version };
  processSummaryQueue().catch(err => console.error('Özet kuyruğu hatası:', err));
}

async function processSummaryQueue() {
  if (GameState._pendingSummary) return;
  GameState._pendingSummary = true;

  try {
    while (true) {
      const nextKey = Object.keys(GameState._queuedSummaries)[0];
      if (!nextKey) break;

      const request = GameState._queuedSummaries[nextKey];
      delete GameState._queuedSummaries[nextKey];
      if (!request) continue;

      const liveVersion = getSummaryVersion(request.key);
      if (!liveVersion || GameState._lastSummaryVersions[request.key] === liveVersion) continue;

      await generateSummaryForContext(request.view, request.target, request.key, liveVersion);
    }
  } finally {
    GameState._pendingSummary = false;

    if (Object.keys(GameState._queuedSummaries).length > 0) {
      processSummaryQueue().catch(err => console.error('Özet kuyruğu hatası:', err));
    }
  }
}

function generateSummaryForCurrent() {
  queueSummaryForContext(GameState.currentView, GameState.currentTarget);
}

// Mevcut context'ten çıkınca tam özet oluştur
async function generateSummaryForContext(view, target, key, version) {
  const conv = getSummaryMessages(key, GameState.MAX_RECENT_MESSAGES);
  if (!conv || conv.length < 3) return; // Çok kısa konuşmalar için özet atla

  logGameEvent('summary', 'summary_generation_started', {
    view,
    target,
    conversationKey: key,
    version,
    messageCount: conv.length
  }, {
    status: 'info',
    view,
    targetId: target,
    targetName: getCurrentEventTargetName(view, target)
  });

  try {
    // GPT özeti
    const rawSummary = await GameState.gpt.generateGPTSummary(
      view,
      target,
      GameState.scenario,
      GameState,
      conv
    );
    const interactionType = view === 'location'
      ? 'location_chat'
      : view === 'character'
        ? 'character_chat'
        : view === 'advisor'
          ? 'advisor'
          : 'clue_examine';
    const safeSummary = sanitizeInteractionText(rawSummary, interactionType, target, '', GameState.foundClues, [], 'summary');
    if (safeSummary) {
      GameState.gptSummaries[key] = safeSummary;
    } else {
      delete GameState.gptSummaries[key];
    }

    // Oyuncu notu
    let entityName = '';
    let entityType = view;
    if (view === 'location') {
      const loc = getEntityById('location', target);
      entityName = loc?.name || '';
    } else if (view === 'character') {
      const char = getEntityById('character', target);
      entityName = char?.name || '';
    } else if (view === 'advisor') {
      entityName = GameState.scenario.advisor.name;
    } else if (view === 'clue') {
      const clue = GameState.foundClues.find(c => c.id === target);
      entityName = clue?.name || '';
    }

    if (entityName) {
      const rawPlayerNote = await GameState.gpt.generatePlayerNote(
        entityType,
        target,
        entityName,
        conv
      );
      const playerNote = sanitizeInteractionText(rawPlayerNote, interactionType, target, '', GameState.foundClues, [], 'note');

      if (playerNote) {
        const noteIndex = GameState.playerNotes.length + 1;
        GameState.playerNotes.push({
          index: noteIndex,
          type: entityType,
          entityId: GameState.currentTarget,
          entityName: entityName,
          title: entityName + ' görüşmesi',
          text: playerNote
        });
        UI.renderNotes();
      }
    }

    GameState.totalTurns += 2; // Özet için 2 API çağrısı
    GameState._lastSummaryVersions[key] = version;
    SaveManager.scheduleSave();

    logGameEvent('summary', 'summary_generation_completed', {
      view,
      target,
      conversationKey: key,
      version,
      savedSummary: GameState.gptSummaries[key] || '',
      playerNoteCreated: Boolean(entityName)
    }, {
      status: 'success',
      view,
      targetId: target,
      targetName: getCurrentEventTargetName(view, target)
    });

  } catch (err) {
    console.error('Özet oluşturma hatası:', err);
    logGameEvent('error', 'summary_generation_failed', {
      view,
      target,
      conversationKey: key,
      version
    }, {
      status: 'error',
      view,
      targetId: target,
      targetName: getCurrentEventTargetName(view, target),
      error: err.message
    });
    // Hata olsa bile devam et
  }
}

// ----------------------------------------------------------
// GÖRSEL YÜKLEME
// ----------------------------------------------------------
function setupImageUpload() {
  // Event delegation: tüm "+" butonlarını yakala
  document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('entity-img-btn')) return;

    const type = e.target.dataset.imgType;
    const id = e.target.dataset.imgId;
    const imgKey = type.substring(0, 3) === 'loc' ? 'loc_' + id
      : type === 'character' ? 'char_' + id
      : type === 'clue' ? 'clue_' + id
      : type + '_' + id;

    openImageModal(imgKey, type, id);
  });
}

function openImageModal(imgKey, type, id) {
  const overlay = document.getElementById('modal-overlay');
  const preview = document.getElementById('modal-preview');
  const fileInput = document.getElementById('modal-file-input');
  const removeBtn = document.getElementById('modal-btn-remove');

  // Mevcut görsel varsa göster
  if (GameState.images[imgKey]) {
    preview.innerHTML = `<img src="${GameState.images[imgKey]}" alt="Görsel">`;
    removeBtn.style.display = 'inline-block';
  } else {
    preview.innerHTML = '<span class="no-image">Henüz görsel yok</span>';
    removeBtn.style.display = 'none';
  }

  overlay.style.display = 'flex';

  // Dosya seçimi
  const selectBtn = document.getElementById('modal-btn-select');
  const newSelectBtn = selectBtn.cloneNode(true);
  selectBtn.parentNode.replaceChild(newSelectBtn, selectBtn);
  newSelectBtn.addEventListener('click', () => fileInput.click());

  // File input handler
  const newFileInput = fileInput.cloneNode(true);
  fileInput.parentNode.replaceChild(newFileInput, fileInput);
  newFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      GameState.images[imgKey] = ev.target.result;
      preview.innerHTML = `<img src="${ev.target.result}" alt="Görsel">`;
      removeBtn.style.display = 'inline-block';
      UI.refreshAll();
      SaveManager.scheduleSave();
      logGameEvent('ui', 'image_uploaded', {
        imageKey: imgKey,
        imageType: type,
        entityId: id,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type
      }, {
        status: 'success',
        view: type,
        targetId: id,
        targetName: getCurrentEventTargetName(type, id)
      });
    };
    reader.readAsDataURL(file);
  });

  // Kaldır butonu
  const newRemoveBtn = removeBtn.cloneNode(true);
  removeBtn.parentNode.replaceChild(newRemoveBtn, removeBtn);
  newRemoveBtn.addEventListener('click', () => {
    delete GameState.images[imgKey];
    preview.innerHTML = '<span class="no-image">Henüz görsel yok</span>';
    newRemoveBtn.style.display = 'none';
    UI.refreshAll();
    SaveManager.scheduleSave();
    logGameEvent('ui', 'image_removed', {
      imageKey: imgKey,
      imageType: type,
      entityId: id
    }, {
      status: 'warning',
      view: type,
      targetId: id,
      targetName: getCurrentEventTargetName(type, id)
    });
  });

  // Kapat butonu
  const closeBtn = document.getElementById('modal-btn-close');
  const newCloseBtn = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
  newCloseBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
  });
}

// ----------------------------------------------------------
// SUÇLAMA
// ----------------------------------------------------------
function openAccusation() {
  if (!canOpenAccusation()) {
    const missing = getMissingAccusationClues();
    logGameEvent('accusation', 'accusation_blocked', {
      missingClueIds: missing,
      canOpen: false
    }, {
      status: 'warning'
    });
    if (missing.length > 0) {
      const missingNames = missing.map(id =>
        GameState.scenario.clues.find(clue => clue.id === id)?.name || id
      ).join(', ');
      UI.notify(`📌 Suçlama için önce şu delilleri netleştir: ${missingNames}`);
    } else {
      UI.notify('📌 Suçlama için henüz erken.');
    }
    return;
  }

  UI.renderAccusationScreen();
  UI.showScreen('accusation');
  logGameEvent('accusation', 'accusation_opened', {
    availableSuspectIds: GameState.scenario.characters.filter(char => isCharacterAvailable(char.id)).map(char => char.id)
  }, {
    status: 'info',
    screen: 'accusation'
  });
}

function confirmAccusation() {
  if (!GameState.selectedSuspect || !canOpenAccusation()) return;

  const correct = GameState.selectedSuspect === GameState.scenario.solution.culprit_id;
  const resultScreen = document.getElementById('screen-result');

  if (correct) {
    resultScreen.className = 'screen victory';
    document.getElementById('result-title').textContent = '✅ Dava Çözüldü!';
    document.getElementById('result-text').textContent = GameState.scenario.solution.full_reveal;
  } else {
    resultScreen.className = 'screen defeat';
    document.getElementById('result-title').textContent = '❌ Yanlış Suçlama';
    const wrongText = GameState.scenario.solution.wrong_accusation;
    document.getElementById('result-text').textContent =
      wrongText.text + '\n\n' + wrongText.missed_info + '\n\n' + wrongText.real_story;
  }

  UI.showScreen('result');
  logGameEvent('accusation', 'accusation_confirmed', {
    selectedSuspect: GameState.selectedSuspect,
    correct,
    culpritId: GameState.scenario.solution.culprit_id
  }, {
    status: correct ? 'success' : 'error',
    screen: 'result'
  });
}

// ----------------------------------------------------------
// NOT PANELİ TOGGLE
// ----------------------------------------------------------
function setupNotesPanel() {
  const toggleBtn = document.getElementById('btn-toggle-notes');
  const content = document.getElementById('notes-content');
  const arrow = document.getElementById('notes-arrow');

  toggleBtn.addEventListener('click', () => {
    content.classList.toggle('collapsed');
    arrow.classList.toggle('open');
  });

  // Tab geçişleri
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.notes-tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
}

function resetGameProgress() {
  if (GameState.saveTimer) {
    clearTimeout(GameState.saveTimer);
    GameState.saveTimer = null;
  }

  if (GameState.loreSaveTimer) {
    clearTimeout(GameState.loreSaveTimer);
    GameState.loreSaveTimer = null;
  }

  if (GameState.eventLogSaveTimer) {
    clearTimeout(GameState.eventLogSaveTimer);
    GameState.eventLogSaveTimer = null;
  }

  if (GameState.forensicTimer) {
    clearInterval(GameState.forensicTimer);
    GameState.forensicTimer = null;
  }

  GameState.storyFolder = null;
  GameState.scenario = null;
  GameState.gpt = null;
  GameState.loreMemory = createEmptyLoreMemory();
  GameState.eventLog = createEmptyEventLog();
  GameState.eventLogDirty = false;
  GameState.logSessionId = '';
  GameState.currentScreen = 'apikey';
  GameState.currentView = null;
  GameState.currentTarget = null;
  GameState.phase = 1;
  GameState.totalTurns = 0;
  GameState.visitedLocations = new Set();
  GameState.foundClues = [];
  GameState.conversations = {};
  GameState.gptSummaries = {};
  GameState.characterStates = {};
  GameState.playerNotes = [];
  GameState.inspectableHistory = {};
  GameState.images = {};
  GameState.selectedSuspect = null;
  GameState._pendingSummary = false;
  GameState._queuedSummaries = {};
  GameState._lastSummaryVersions = {};
  GameState.loadingCounter = 0;
  GameState.gameStartTime = null;
  GameState.unlockedReports = new Set();
  GameState.uniqueCharConversations = new Set();

  if (typeof window !== 'undefined') {
    window.__DEDEKTIF_LAST_EVENT = null;
    window.__DEDEKTIF_EVENT_LOG = GameState.eventLog;
  }
}

function startForensicTimer() {
  if (GameState.forensicTimer) return;

  GameState.forensicTimer = setInterval(() => {
    if (GameState.currentScreen === 'game') {
      checkForensicReports();
    }
  }, 60000);
}

async function openGameScreen(options = {}) {
  initializeCharacterStates(GameState.characterStates);
  UI.showScreen('game');
  UI.refreshAll();

  if (!GameState.gameStartTime) {
    GameState.gameStartTime = Date.now();
  }

  startForensicTimer();

  logGameEvent('system', options.resume ? 'game_resumed' : 'game_started', {
    resume: Boolean(options.resume),
    storyFolder: GameState.storyFolder,
    storyTitle: GameState.scenario?.meta?.title || ''
  }, {
    status: 'success',
    screen: 'game'
  });

  if (options.resume) {
    if (GameState.currentView && isValidContext(GameState.currentView, GameState.currentTarget)) {
      const savedView = GameState.currentView;
      const savedTarget = GameState.currentTarget;
      GameState.currentView = null;
      GameState.currentTarget = null;
      await switchContext(savedView, savedTarget);
    } else {
      UI.clearChat('');
      UI.addSystemMessage('💾 Kayıt yüklendi. Kaldığın yerden devam edebilirsin.');
      UI.updateHeader();
    }

    UI.notify('💾 Kayıt yüklendi.');
    return;
  }

  UI.clearChat('');
  UI.addSystemMessage('Soruşturma başladı. Sol panelden bir mekan seç veya sağ panelden bir şüpheli ile konuş.');

  const firstPhase = GameState.scenario.phases[0];
  if (firstPhase) {
    UI.notify(firstPhase.description);
  }

  await SaveManager.saveNow();
}

async function resumeSavedGame(savedData) {
  SaveManager.applyPayload(savedData);
  logGameEvent('save', 'save_applied', {
    currentView: savedData.currentView || null,
    currentTarget: savedData.currentTarget || null,
    phase: savedData.phase,
    totalTurns: savedData.totalTurns
  }, {
    status: 'success'
  });
  await openGameScreen({ resume: true });
}

// ----------------------------------------------------------
// HİKAYE YÜKLEME SİSTEMİ
// ----------------------------------------------------------

// Seçili hikaye bilgisi
let selectedStory = null;

// Hikaye listesini yükle ve kartları oluştur
async function loadStoryList() {
  const container = document.getElementById('story-cards');
  const errorEl = document.getElementById('story-error');
  try {
    const resp = await fetch('./hikayeler.json', { cache: 'no-store' });
    if (!resp.ok) throw new Error('hikayeler.json bulunamadı. Oyunu baslat.py ile başlatın.');
    const stories = await resp.json();
    if (!stories.length) {
      container.innerHTML = '<p class="empty-text">Hiç hikaye bulunamadı. Bir klasöre senaryo.js ekleyip baslat.py çalıştırın.</p>';
      return;
    }
    renderStoryCards(stories);
  } catch (err) {
    container.innerHTML = '';
    errorEl.textContent = err.message;
  }
}

function renderStoryCards(stories) {
  const container = document.getElementById('story-cards');
  container.innerHTML = '';
  stories.forEach(story => {
    const card = document.createElement('div');
    card.className = 'story-card';
    card.innerHTML = `
      <div class="story-card-header">
        <span class="story-card-icon">${story.ikon || '📖'}</span>
        <span class="story-card-title">${story.baslik}</span>
      </div>
      <p class="story-card-subtitle">${story.altbaslik || ''}</p>
      <div class="story-card-meta">
        ${story.sure ? `<span>⏱️ ${story.sure}</span>` : ''}
        ${story.zorluk ? `<span>📊 ${story.zorluk}</span>` : ''}
      </div>
    `;
    card.addEventListener('click', () => {
      container.querySelectorAll('.story-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedStory = story;
      document.getElementById('api-error').textContent = '';
    });
    container.appendChild(card);
  });
  // Tek hikaye varsa otomatik seç
  if (stories.length === 1) {
    container.querySelector('.story-card').click();
  }
}

// Senaryo scriptini izole kapsamda yükle
async function loadStoryScript(folder) {
  const scenarioUrl = '/' + encodeURIComponent(folder) + '/senaryo.js';
  let source = '';

  try {
    const response = await fetch(scenarioUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`${folder}/senaryo.js alınamadı (${response.status}).`);
    }
    source = await response.text();
  } catch (_) {
    throw new Error(folder + '/senaryo.js dosyası yüklenemedi.');
  }

  try {
    window.SENARYO = undefined;

    const evaluator = new Function(
      `${source}\nreturn typeof SENARYO !== 'undefined' ? SENARYO : (typeof window !== 'undefined' ? window.SENARYO : undefined);\n//# sourceURL=${scenarioUrl}`
    );

    const loadedScenario = evaluator();
    window.SENARYO = undefined;

    if (loadedScenario) {
      return loadedScenario;
    }

    throw new Error('senaryo.js dosyası SENARYO değişkenini tanımlamıyor.');
  } catch (err) {
    const message = err && typeof err.message === 'string'
      ? err.message
      : 'senaryo.js değerlendirilemedi.';
    throw new Error(`${folder}/senaryo.js dosyası yüklenemedi. ${message}`);
  }
}

// ----------------------------------------------------------
// BAŞLATMA (INIT)
// ----------------------------------------------------------
function init() {
  document.body.dataset.currentScreen = GameState.currentScreen;
  ThemeManager.init();

  const EMBEDDED_OPENAI_API_KEY = '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';

  // Hikaye listesini yükle
  loadStoryList();

  // API Key: doğrudan koddan otomatik yükle
  (function loadEmbeddedApiKey() {
    const input = document.getElementById('api-key-input');
    if (!input) return;

    const key = String(EMBEDDED_OPENAI_API_KEY || '').trim();
    if (key && key.startsWith('sk-')) {
      input.value = key;
    }
  })();

  // Oyuna başla butonu
  document.getElementById('btn-start-game').addEventListener('click', async () => {
    const apiKey = document.getElementById('api-key-input').value.trim();
    const model = document.getElementById('model-select')?.value?.trim() || 'smart-low-cost';
    const errorEl = document.getElementById('api-error');

    if (!selectedStory) {
      errorEl.textContent = 'Önce bir hikaye seçin.';
      return;
    }
    if (!apiKey) {
      errorEl.textContent = 'API anahtarı gerekli.';
      return;
    }

    // Senaryo yükle
    try {
      errorEl.textContent = 'Hikaye yükleniyor...';
      const scenario = await loadStoryScript(selectedStory.klasor);

      resetGameProgress();
      GameState.storyFolder = selectedStory.klasor;
      GameState.scenario = scenario;
      initializeCharacterStates();
      GameState.logSessionId = createEventLogSessionId();

      document.getElementById('header-game-title').textContent = '🔍 ' + scenario.meta.title + ' [Ucuz]';
      document.title = 'Dedektif Ucuz - ' + scenario.meta.title;

      GameState.gpt = new GPTClient(apiKey, model);
      GameState.gpt.setEventLogger(event => {
        if (!event || typeof event !== 'object') return;
        logGameEvent(event.scope || 'gpt', event.action || 'event', event.details || {}, {
          status: event.status || 'info',
          includeState: false,
          view: GameState.currentView || '',
          targetId: GameState.currentTarget || '',
          targetName: getCurrentEventTargetName(GameState.currentView, GameState.currentTarget)
        });
      });
      UI.setupAdvisor();

      GameState.loreMemory = await LoreManager.load(GameState.storyFolder).catch(err => {
        console.error('Lore kaydı yükleme hatası:', err);
        return createEmptyLoreMemory(GameState.storyFolder);
      });

      GameState.eventLog = await EventLogManager.load(GameState.storyFolder).catch(err => {
        console.error('Olay günlüğü yükleme hatası:', err);
        return createEmptyEventLog(GameState.storyFolder);
      });
      GameState.logSessionId = createEventLogSessionId();
      if (typeof window !== 'undefined') {
        window.__DEDEKTIF_EVENT_LOG = GameState.eventLog;
      }

      const savedGame = await SaveManager.load(GameState.storyFolder).catch(err => {
        console.error('Kayıt yükleme hatası:', err);
        return null;
      });

      logGameEvent('system', 'story_initialized', {
        storyFolder: GameState.storyFolder,
        storyTitle: scenario.meta.title,
        model,
        hasSavedGame: Boolean(savedGame),
        existingLogEntries: GameState.eventLog.entries?.length || 0
      }, {
        status: 'success',
        includeState: false
      });

      errorEl.textContent = '';

      if (savedGame) {
        await resumeSavedGame(savedGame);
        return;
      }

      showIntro();
    } catch (err) {
      errorEl.textContent = 'Hata: ' + err.message;
    }
  });

  // Enter ile başlatma
  document.getElementById('api-key-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-start-game').click();
  });

  // Intro ekranı
  function showIntro() {
    const scenario = GameState.scenario;
    document.getElementById('intro-title').textContent = scenario.meta.title;
    document.getElementById('intro-subtitle').textContent = scenario.meta.subtitle;
    document.getElementById('intro-text').textContent = scenario.intro.text;
    UI.showScreen('intro');
  }

  // Soruşturmaya başla
  document.getElementById('btn-begin').addEventListener('click', async () => {
    await openGameScreen({ resume: false });
  });

  // Mesaj gönderme
  document.getElementById('btn-send').addEventListener('click', sendMessage);
  document.getElementById('user-input').addEventListener('keydown', (e) => {
    if (handleReferenceAutocompleteKeydown(e)) {
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Suçlama
  document.getElementById('btn-accusation').addEventListener('click', openAccusation);
  document.getElementById('btn-accuse').addEventListener('click', () => {
    if (confirm(GameState.scenario.accusation.confirm_text)) {
      confirmAccusation();
    }
  });
  document.getElementById('btn-back-to-game').addEventListener('click', () => {
    UI.showScreen('game');
  });

  // Yeniden başlatma
  document.getElementById('btn-restart').addEventListener('click', async () => {
    try {
      await SaveManager.clear();
      await EventLogManager.clear();
    } catch (err) {
      console.error('Kayıt temizleme hatası:', err);
    }
    location.reload();
  });

  // Danışman butonu
  UI.setupAdvisor();

  // Alt panel
  setupNotesPanel();
  setupReferenceAutocomplete();

  // Görsel yükleme
  setupImageUpload();

  window.addEventListener('beforeunload', () => {
    SaveManager.flushOnUnload();
    LoreManager.flushOnUnload();
    EventLogManager.flushOnUnload();
  });
}

// Sayfa yüklenince başlat
document.addEventListener('DOMContentLoaded', init);
