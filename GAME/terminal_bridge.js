ObjC.import('Foundation');

function readText(path) {
  const text = $.NSString.stringWithContentsOfFileEncodingError($(path), $.NSUTF8StringEncoding, null);
  if (!text) throw new Error('Dosya okunamadi: ' + path);
  return ObjC.unwrap(text);
}

function writeStdout(text) {
  const output = $(String(text || '')).dataUsingEncoding($.NSUTF8StringEncoding);
  $.NSFileHandle.fileHandleWithStandardOutput.writeData(output);
}

function makeClassList() {
  return {
    add() {},
    remove() {},
    contains() { return false; }
  };
}

function makeElement() {
  return {
    addEventListener() {},
    removeEventListener() {},
    appendChild() {},
    remove() {},
    setAttribute() {},
    getAttribute() { return null; },
    focus() {},
    click() {},
    contains() { return false; },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    style: {},
    dataset: {},
    classList: makeClassList(),
    innerHTML: '',
    textContent: '',
    value: '',
    disabled: false
  };
}

function installBrowserStubs() {
  const globalObject = this;
  globalObject.window = globalObject;
  globalObject.addEventListener = function () {};
  globalObject.removeEventListener = function () {};
  globalObject.document = {
    addEventListener() {},
    removeEventListener() {},
    getElementById() { return makeElement(); },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    createElement() { return makeElement(); },
    body: makeElement()
  };
  globalObject.navigator = {
    sendBeacon() { return true; }
  };
  globalObject.location = {
    reload() {}
  };
  globalObject.localStorage = {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  };
  globalObject.alert = function () {};
  globalObject.confirm = function () { return true; };
  globalObject.fetch = function () {
    throw new Error('fetch bu bridge icinde kapali. API cagrilari Python tarafindan yapilmali.');
  };
  globalObject.setTimeout = function () { return 0; };
  globalObject.clearTimeout = function () {};
  globalObject.Blob = function (parts, options) {
    return { parts, options };
  };
  globalObject.performance = { now() { return 0; } };
}

function loadRuntime(baseDir) {
  installBrowserStubs();
  const apiSource = readText(baseDir + '/api.js');
  const gameSource = readText(baseDir + '/game.js');
  const runtime = eval(`(function () {\n${apiSource}\n${gameSource}\nreturn {\n  GameState,\n  GPTClient,\n  createEmptyLoreMemory,\n  compactReferenceText,\n  initializeCharacterStates,\n  ensureCharacterState,\n  applyPassiveCharacterDrift,\n  applyPlayerMessageToCharacterState,\n  finalizeCharacterStateAfterResponse\n};\n})()`);

  if (!runtime || !runtime.GameState || !runtime.GPTClient) {
    throw new Error('Runtime exportleri yüklenemedi.');
  }

  this.GameState = runtime.GameState;
  this.GPTClient = runtime.GPTClient;
  this.createEmptyLoreMemory = runtime.createEmptyLoreMemory;
  this.compactReferenceText = runtime.compactReferenceText;
  this.initializeCharacterStates = runtime.initializeCharacterStates;
  this.ensureCharacterState = runtime.ensureCharacterState;
  this.applyPassiveCharacterDrift = runtime.applyPassiveCharacterDrift;
  this.applyPlayerMessageToCharacterState = runtime.applyPlayerMessageToCharacterState;
  this.finalizeCharacterStateAfterResponse = runtime.finalizeCharacterStateAfterResponse;
}

function getFoundCluesFromPayload(scenario, clueList) {
  return (Array.isArray(clueList) ? clueList : [])
    .map(clue => {
      if (clue && typeof clue === 'object' && clue.id) return clue;
      return (scenario.clues || []).find(item => item.id === clue) || null;
    })
    .filter(Boolean);
}

function hydrateGameState(payload) {
  const scenario = payload.scenario;
  const state = payload.gameState || {};

  GameState.storyFolder = payload.storyFolder || '';
  GameState.scenario = scenario;
  GameState.phase = Number.isFinite(state.phase) ? state.phase : 1;
  GameState.totalTurns = Number.isFinite(state.totalTurns) ? state.totalTurns : 0;
  GameState.visitedLocations = new Set(Array.isArray(state.visitedLocations) ? state.visitedLocations : []);
  GameState.foundClues = getFoundCluesFromPayload(scenario, state.foundClues);
  GameState.conversations = state.conversations && typeof state.conversations === 'object'
    ? state.conversations
    : {};
  GameState.gptSummaries = state.gptSummaries && typeof state.gptSummaries === 'object'
    ? state.gptSummaries
    : {};
  GameState.characterStates = state.characterStates && typeof state.characterStates === 'object'
    ? state.characterStates
    : {};
  GameState.playerNotes = Array.isArray(state.playerNotes) ? state.playerNotes : [];
  GameState.loreMemory = state.loreMemory && typeof state.loreMemory === 'object'
    ? state.loreMemory
    : createEmptyLoreMemory(payload.storyFolder || '');
  GameState.uniqueCharConversations = new Set(Array.isArray(state.uniqueCharConversations) ? state.uniqueCharConversations : []);
  initializeCharacterStates(GameState.characterStates);
  GameState.gpt = new GPTClient('__terminal__', payload.model || 'smart-low-cost');
}

function getTargetByInteractionType(interactionType, targetId) {
  switch (interactionType) {
    case 'location_enter':
    case 'location_chat':
      return (GameState.scenario.locations || []).find(item => item.id === targetId) || null;
    case 'character_meet':
    case 'character_chat':
      return (GameState.scenario.characters || []).find(item => item.id === targetId) || null;
    case 'advisor':
      return GameState.scenario.advisor || null;
    case 'clue_examine':
      return (GameState.scenario.clues || []).find(item => item.id === targetId) || null;
    default:
      return null;
  }
}

function getActionConfig(action, target, userMessage) {
  switch (action) {
    case 'location_enter': {
      const generatedUserMessage = GameState.scenario.response_style?.short_location_entries
        ? `${target.name} mekanina girdim. Hazir giris metni gosterildi. Tekrar etmeden kisa bir devam cevabi ver.`
        : `${target.name} mekanina giriyorum. Mekani tasvir et.`;
      return {
        interactionType: 'location_enter',
        temperature: GameState.gpt.getScenarioTemperature('location_enter', GameState.scenario, 0.8),
        userMessage: generatedUserMessage,
        allowedClueIds: []
      };
    }
    case 'character_meet': {
      const generatedUserMessage = GameState.scenario.response_style?.concise_character_intro
        ? `${target.name} ile ilk kez karsilasiyorum. Kendini kisa tanit ve tavrini 1-2 kisa cumlede goster.`
        : `${target.name} ile ilk kez karsilasiyorum. Kendini tanit ve ilk izlenimi ver.`;
      return {
        interactionType: 'character_chat',
        temperature: GameState.gpt.getScenarioTemperature('character_chat', GameState.scenario, 0.8),
        userMessage: generatedUserMessage,
        allowedClueIds: []
      };
    }
    case 'location_chat':
      return {
        interactionType: 'location_chat',
        temperature: GameState.gpt.getScenarioTemperature('location_chat', GameState.scenario, 0.7),
        userMessage: userMessage || '',
        allowedClueIds: GameState.gpt.getAllowedLocationClueIds(target, GameState, userMessage || '')
      };
    case 'character_chat':
      return {
        interactionType: 'character_chat',
        temperature: GameState.gpt.getScenarioTemperature('character_chat', GameState.scenario, 0.7),
        userMessage: userMessage || '',
        allowedClueIds: []
      };
    case 'advisor':
      return {
        interactionType: 'advisor',
        temperature: GameState.gpt.getScenarioTemperature('advisor', GameState.scenario, 0.7),
        userMessage: userMessage || '',
        allowedClueIds: []
      };
    case 'clue_examine':
      return {
        interactionType: 'clue_examine',
        temperature: GameState.gpt.getScenarioTemperature('clue_examine', GameState.scenario, 0.7),
        userMessage: userMessage || '',
        allowedClueIds: []
      };
    default:
      throw new Error('Bilinmeyen action: ' + action);
  }
}

function buildLoreEntry(interactionType, target, userMessage, responseText) {
  const targetType = interactionType === 'clue_examine' ? 'clue' : 'location';
  const intent = GameState.gpt.classifySoftLoreQuery(interactionType, target, userMessage);
  if (!intent) return null;
  if (!GameState.gpt.shouldPersistSoftLore(responseText, { interactionType, target, userMessage })) {
    return null;
  }

  const now = Date.now();
  const questionHint = compactReferenceText(userMessage, 120);
  return {
    targetType,
    targetId: target.id,
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
}

function normalizeJudgeVerdict(rawVerdict, interactionType, loreIntent) {
  return GameState.gpt.parseJudgeVerdict(rawVerdict, interactionType, loreIntent || null);
}

function run(argv) {
  if (!argv || argv.length === 0) {
    throw new Error('Payload yolu gerekli.');
  }

  const payload = JSON.parse(readText(argv[0]));
  loadRuntime(payload.baseDir);
  hydrateGameState(payload);

  const action = payload.command;
  const target = getTargetByInteractionType(payload.interactionType || payload.action, payload.targetId || null);

  switch (action) {
    case 'prepare_action': {
      const config = getActionConfig(payload.action, target, payload.userMessage || '');
      const loreIntent = GameState.gpt.classifySoftLoreQuery(config.interactionType, target, config.userMessage);
      const systemPrompt = GameState.gpt.buildSystemPrompt(
        config.interactionType,
        GameState.scenario,
        GameState,
        target,
        config.userMessage
      );

      writeStdout(JSON.stringify({
        interactionType: config.interactionType,
        userMessage: config.userMessage,
        systemPrompt,
        temperature: config.temperature,
        allowedClueIds: config.allowedClueIds,
        forcedResponse: config.interactionType === 'location_chat'
          ? GameState.gpt.buildForcedLocationClueResponse(target, GameState.scenario, config.userMessage, config.allowedClueIds)
          : null,
        loreIntent,
        callProfile: GameState.gpt.getCallProfile(config.interactionType)
      }));
      return;
    }
    case 'finalize_action': {
      const response = GameState.gpt.finalizeResponse(payload.rawResponse || {}, {
        interactionType: payload.interactionType,
        scenario: GameState.scenario,
        gameState: GameState,
        target,
        userMessage: payload.userMessage || '',
        allowedClueIds: Array.isArray(payload.allowedClueIds) ? payload.allowedClueIds : []
      });
      writeStdout(JSON.stringify(response));
      return;
    }
    case 'judge_prepare': {
      const loreIntent = GameState.gpt.classifySoftLoreQuery(payload.interactionType, target, payload.userMessage || '');
      writeStdout(JSON.stringify({
        systemPrompt: GameState.gpt.buildJudgeSystemPrompt(),
        userPayload: GameState.gpt.buildJudgePayload({
          interactionType: payload.interactionType,
          target,
          scenario: GameState.scenario,
          gameState: GameState,
          userMessage: payload.userMessage || '',
          recentMessages: Array.isArray(payload.recentMessages) ? payload.recentMessages : [],
          candidateResponse: payload.candidateResponse || {},
          loreIntent
        }),
        loreIntent,
        callProfile: GameState.gpt.getCallProfile('judge_review')
      }));
      return;
    }
    case 'normalize_judge_verdict': {
      const loreIntent = payload.loreIntent || null;
      writeStdout(JSON.stringify(normalizeJudgeVerdict(payload.rawVerdict || {}, payload.interactionType, loreIntent)));
      return;
    }
    case 'judge_retry_prompt': {
      writeStdout(JSON.stringify({
        systemPrompt: GameState.gpt.buildJudgeRetrySystemPrompt(
          payload.baseSystemPrompt || '',
          payload.rejectedResponse || {},
          payload.judgeVerdict || {}
        )
      }));
      return;
    }
    case 'judge_fallback_text': {
      writeStdout(JSON.stringify({
        text: GameState.gpt.getJudgeFallbackText(payload.interactionType, payload.loreIntent || null)
      }));
      return;
    }
    case 'init_character_states': {
      initializeCharacterStates(payload.rawCharacterStates || null);
      writeStdout(JSON.stringify({ characterStates: GameState.characterStates }));
      return;
    }
    case 'character_passive_drift': {
      if (target) {
        const state = ensureCharacterState(target.id);
        const turnsAway = state ? Math.max(0, GameState.totalTurns - (state.lastInteractionTurn || 0)) : 0;
        applyPassiveCharacterDrift(target, turnsAway);
      }
      writeStdout(JSON.stringify({ characterStates: GameState.characterStates }));
      return;
    }
    case 'character_before_message': {
      if (target) {
        applyPlayerMessageToCharacterState(target, payload.userMessage || '');
      }
      writeStdout(JSON.stringify({ characterStates: GameState.characterStates }));
      return;
    }
    case 'character_after_response': {
      if (target) {
        finalizeCharacterStateAfterResponse(target, payload.response || {});
      }
      writeStdout(JSON.stringify({ characterStates: GameState.characterStates }));
      return;
    }
    case 'build_lore_entry': {
      const entry = buildLoreEntry(payload.interactionType, target, payload.userMessage || '', String(payload.responseText || '').trim());
      writeStdout(JSON.stringify({ entry }));
      return;
    }
    default:
      throw new Error('Bilinmeyen command: ' + action);
  }
}