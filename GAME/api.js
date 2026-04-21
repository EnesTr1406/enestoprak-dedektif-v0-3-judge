// ============================================================
// GPT API İLETİŞİM MODÜLÜ
// ============================================================
// Seçilen model ile tüm iletişimi yönetir.
// System prompt oluşturma, dinamik context, cevap parse etme.
// ============================================================

class GPTClient {
  constructor(apiKey, model = 'smart-low-cost') {
    this.apiKey = apiKey;
    this.model = model;
    this.endpoint = 'https://api.openai.com/v1/chat/completions';
    this.eventLogger = null;
  }

  setEventLogger(logger) {
    this.eventLogger = typeof logger === 'function' ? logger : null;
  }

  emitEventLog(scope, action, details = {}, status = 'info') {
    if (typeof this.eventLogger !== 'function') return;
    try {
      this.eventLogger({ scope, action, details, status });
    } catch (error) {
      console.warn('Event logger hatası:', error);
    }
  }

  getCallProfile(type) {
    const base = this.getBaseCallLimits(type);

    if (this.model === 'smart-low-cost') {
      const routed = {
        location_enter: { model: 'gpt-4.1-mini', fallbackModel: 'gpt-5-mini' },
        location_chat: { model: 'gpt-4.1-mini', fallbackModel: 'gpt-5-mini' },
        clue_examine: { model: 'gpt-4.1-mini', fallbackModel: 'gpt-5-mini' },
        summary_memory: { model: 'gpt-4.1-mini', fallbackModel: 'gpt-5-mini' },
        player_note: { model: 'gpt-4.1-mini', fallbackModel: 'gpt-5-mini' },
        judge_review: { model: 'gpt-5-mini', fallbackModel: 'gpt-4.1' },
        character_chat: { model: 'gpt-5-mini', fallbackModel: 'gpt-4.1' },
        advisor: { model: 'gpt-5-mini', fallbackModel: 'gpt-4.1' }
      };

      return {
        ...base,
        ...(routed[type] || { model: 'gpt-5-mini', fallbackModel: 'gpt-4.1' })
      };
    }

    return {
      ...base,
      model: this.model || 'gpt-5-mini',
      fallbackModel: null
    };
  }

  getBaseCallLimits(type) {
    switch (type) {
      case 'location_enter':
        return { maxOutputTokens: 180, maxMessages: 2, maxCharsPerMessage: 500 };
      case 'location_chat':
        return { maxOutputTokens: 220, maxMessages: 6, maxCharsPerMessage: 700 };
      case 'character_chat':
        return { maxOutputTokens: 280, maxMessages: 8, maxCharsPerMessage: 800 };
      case 'advisor':
        return { maxOutputTokens: 340, maxMessages: 10, maxCharsPerMessage: 900 };
      case 'clue_examine':
        return { maxOutputTokens: 220, maxMessages: 6, maxCharsPerMessage: 700 };
      case 'summary_memory':
      case 'player_note':
        return { maxOutputTokens: 220, maxMessages: 1, maxCharsPerMessage: 3200 };
      case 'judge_review':
        return { maxOutputTokens: 260, maxMessages: 1, maxCharsPerMessage: 32000 };
      default:
        return { maxOutputTokens: 240, maxMessages: 8, maxCharsPerMessage: 800 };
    }
  }

  buildMessageSnapshots(messages, maxContentLength = 2400) {
    if (!Array.isArray(messages)) return [];
    return messages.map(message => ({
      role: message?.role || '',
      content: this.compactText(message?.content, maxContentLength)
    }));
  }

  compactText(value, maxLength = 220) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, Math.max(0, maxLength - 3)).trimEnd() + '...';
  }

  getPromptStopWords() {
    return new Set([
      've', 'veya', 'ile', 'icin', 'gibi', 'olan', 'olarak', 'bir', 'bu', 'su', 'o', 'da', 'de',
      'mi', 'mu', 'muu', 'diye', 'gore', 'kadar', 'daha', 'sonra', 'yer', 'sey', 'seyler',
      'bak', 'bakarsa', 'bakilirsa', 'bakilir', 'bakinca', 'incelenirse', 'incelenir', 'incelenince',
      'aranirsa', 'aranir', 'acilirsa', 'acilir', 'acilinca', 'sorulursa', 'edilirse', 'edilir',
      'olursa', 'olur', 'yapilirse', 'yapilir', 'takip', 'gorulurse', 'eslestirilirse', 'capraz',
      'dogru', 'yanlis', 'ayri', 'birlikte', 'olan', 'icin', 'gore', 'arti', 'eksi', 'kisa',
      'uzun', 'son', 'ilk', 'var', 'yok', 'ama', 'fakat', 'ancak', 'gibi', 'burada', 'orada',
      'sadece', 'bile', 'gore', 've', 'ile', 'icin', 'diye', 'gorece', 'karsi', 'uzerinden'
    ]);
  }

  normalizePromptSearchText(value) {
    return String(value || '')
      .toLocaleLowerCase('tr-TR')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/i̇/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  extractPromptKeywords(value) {
    const stopWords = this.getPromptStopWords();

    return this.normalizePromptSearchText(value)
      .split(' ')
      .filter(token => token.length >= 3 && !stopWords.has(token));
  }

  makeSpoilerStem(token, length = 5) {
    const normalized = this.normalizePromptSearchText(token).replace(/\s+/g, '');
    if (!normalized) return '';
    return normalized.slice(0, Math.min(length, normalized.length));
  }

  extractSpoilerTokens(value, minLength = 4) {
    const stopWords = this.getPromptStopWords();
    return this.normalizePromptSearchText(value)
      .split(' ')
      .filter(token => token.length >= minLength && !stopWords.has(token));
  }

  extractSpoilerSignals(value) {
    const tokens = this.extractSpoilerTokens(value, 4);
    const stems = new Set(tokens.map(token => this.makeSpoilerStem(token)).filter(Boolean));
    const phraseStems = new Set();

    for (let index = 0; index < tokens.length - 1; index += 1) {
      const left = this.makeSpoilerStem(tokens[index], 4);
      const right = this.makeSpoilerStem(tokens[index + 1], 4);
      if (left && right) {
        phraseStems.add(`${left}_${right}`);
      }
    }

    return { stems, phraseStems };
  }

  mergeSpoilerSignals(targetSignals, sourceSignals) {
    sourceSignals.stems.forEach(stem => targetSignals.stems.add(stem));
    sourceSignals.phraseStems.forEach(phrase => targetSignals.phraseStems.add(phrase));
  }

  createEmptySpoilerSignals() {
    return {
      stems: new Set(),
      phraseStems: new Set()
    };
  }

  getSoftLoreCatalog() {
    return [
      {
        slotKey: 'kurumsal_hava',
        label: 'kurumsal hava',
        patterns: [
          /isletme/, /kurum/, /disariya/, /hissediliyor/, /hava/, /izlenim/, /nasil sun/, /nasil bir yer/
        ],
        allowGeneratedNames: true,
        allowPublicTrace: false,
        preferredPhrases: ['izlenim veriyor', 'dışarıya böyle görünüyor', 'gibi duruyor'],
        instruction: 'Kurumsal imaj ve dışarıya yansıyan düzen üzerinden konuş. Resmi görünen ama içi tam okunmayan yapı hissi verebilirsin.'
      },
      {
        slotKey: 'eskilik_izlenimi',
        label: 'eskilik izlenimi',
        patterns: [
          /kaclardan kalma/, /kac yil/, /on yillik/, /ne kadar eski/, /eskimi[sş]/, /eskilik/, /yasli/, /yipranmis/
        ],
        allowGeneratedNames: false,
        allowPublicTrace: false,
        preferredPhrases: ['yaşlı gözüküyor', 'çok net değil ama', 'on yıllık var gibi'],
        instruction: 'Yalnızca yıpranma, parça dili, bakım izi ve malzeme üzerinden yaş/eskilik yorumu yap. Net yıl verme.'
      },
      {
        slotKey: 'kamu_izi',
        label: 'kamu izi',
        patterns: [
          /internet/, /arastir/, /acik kaynak/, /kayit/, /guncel durum/, /firma/, /sirket/, /marka/, /rozet/, /slogan/
        ],
        allowGeneratedNames: true,
        allowPublicTrace: true,
        preferredPhrases: ['internette belirgin bir iz yok', 'açık kaynakta net değil', 'eski bir kayıt var gibi'],
        instruction: 'Açık kaynak / internet izi sorularında üç durumdan biriyle konuş: iz yok, zayıf iz var, eski iz var ama güncel durum belirsiz.'
      },
      {
        slotKey: 'sahiplik_gecmisi',
        label: 'sahiplik geçmişi',
        patterns: [
          /firma.*ait/, /sirket.*ait/, /kurum.*ait/, /marka.*ait/, /el degist/, /devir/, /devral/, /sahiplik/, /guncel sahibi/, /gecmis sahibi/
        ],
        allowGeneratedNames: true,
        allowPublicTrace: true,
        preferredPhrases: ['bir ara buna aitmiş gibi', 'sonradan el değiştirmiş olabilir', 'güncel durumu net değil'],
        instruction: 'Sahiplik geçmişini ancak belirsiz ve kırık kayıt diliyle ver. Kesin zincir kurma.'
      },
      {
        slotKey: 'gorunur_kullanim',
        label: 'görünür kullanım',
        patterns: [
          /ne icin kullan/, /kullanim amaci/, /arka servis/, /vitrin/, /ne ise yariyor/, /hat gibi/
        ],
        allowGeneratedNames: false,
        allowPublicTrace: false,
        preferredPhrases: ['arka servis hattı gibi', 'vitrinden çok işleyen taraf gibi', 'görünen kullanım bu yönde'],
        instruction: 'Mekanın ne için kullanıldığına dair sadece görünür düzen ve nesne yerleşiminden yumuşak yorum üret.'
      }
    ];
  }

  getSoftLoreIntentBySlot(slotKey) {
    return this.getSoftLoreCatalog().find(item => item.slotKey === slotKey) || null;
  }

  classifySoftLoreQuery(interactionType, target, userMessage = '') {
    if (!target) return null;
    if (interactionType !== 'location_chat' && interactionType !== 'clue_examine') {
      return null;
    }

    const normalized = this.normalizePromptSearchText(userMessage);
    if (!normalized) return null;

    const publicTraceSignal = /internet|arastir|acik kaynak|firma|sirket|kurum|marka|guncel durum/.test(normalized);
    const concreteInvestigationSignal = /duplicate|misafir\s*14|kart|gecis|log|kamera|bakim cizelgesi|cizelge|hafiza karti|ses kaydi|defter|uv|capraz isik|dolap|isitici|baca|havalandirma|alarm|etiket|muhur|sevkiyat|koordinat|butce|havale|tarih|saat|filtre|kayitlarinda|kayitlari|giris var mi|girisler|giris kaydi/.test(normalized);

    if (concreteInvestigationSignal && !publicTraceSignal) {
      return null;
    }

    const matched = this.getSoftLoreCatalog().find(item => item.patterns.some(pattern => pattern.test(normalized)));
    const broadLoreSignal = /gorunuyor|duruyor|hissediliyor|izlenim|hava|eski mi|ne kadar eski|eskilik|yasli|internet|firma|sirket|kurum|marka|el degist|guncel|acik kaynak|arka servis|vitrin/.test(normalized);

    if (!matched && !broadLoreSignal) {
      return null;
    }

    const fallback = {
      slotKey: 'genel_izlenim',
      label: 'genel izlenim',
      allowGeneratedNames: false,
      allowPublicTrace: false
    };
    const intent = matched || fallback;

    return {
      slotKey: intent.slotKey,
      label: intent.label,
      targetType: interactionType === 'clue_examine' ? 'clue' : 'location',
      allowGeneratedNames: Boolean(intent.allowGeneratedNames),
      allowPublicTrace: Boolean(intent.allowPublicTrace),
      preferredPhrases: Array.isArray(intent.preferredPhrases) ? intent.preferredPhrases : [],
      instruction: intent.instruction || ''
    };
  }

  detectSoftLoreTraceState(text) {
    const normalized = this.normalizePromptSearchText(text);
    if (!normalized) return 'belirsiz';
    if (/iz yok|bulamiyorsun|bulunmuyor|net bir sey yok|belirgin bir iz yok/.test(normalized)) return 'yok';
    if (/eski kayit|eski bir kayit|gecmis iz|bir ara|sonradan el degistirmis|guncel durumu belirsiz/.test(normalized)) return 'eski-iz';
    if (/isim geciyor|zayif iz|kayit var gibi|acik kayitta net degil/.test(normalized)) return 'zayif-iz';
    return 'belirsiz';
  }

  isGenericSoftLoreNameToken(token) {
    const normalized = this.normalizePromptSearchText(token).replace(/\s+/g, '');
    return new Set([
      'eski', 'yeni', 'guncel', 'acik', 'kapali', 'bu', 'burasi', 'su', 'buyer', 'gizli',
      'guncel', 'ilgili', 'hakkinda', 'mekan', 'yer', 'kamu', 'kurum', 'firma', 'sirket',
      'marka', 'laboratuvar', 'laboratuvari', 'iskele', 'iskelesi', 'vakif', 'dosya', 'arsiv'
    ]).has(normalized);
  }

  isKnownNameLikeCandidate(candidate, knownNames) {
    const normalized = this.normalizePromptSearchText(candidate);
    if (!normalized) return true;

    return [...knownNames].some(knownName => {
      if (!knownName) return false;
      if (knownName === normalized) return true;
      if (knownName.length >= normalized.length && knownName.includes(normalized)) return true;
      if (normalized.length >= knownName.length && normalized.includes(knownName)) return true;
      return false;
    });
  }

  extractSoftLoreGeneratedNames(text, scenario) {
    const original = String(text || '').trim();
    if (!original) return [];

    const knownNames = new Set([
      ...(scenario?.characters || []).map(item => item?.name),
      ...(scenario?.locations || []).map(item => item?.name),
      ...(scenario?.clues || []).map(item => item?.name),
      scenario?.advisor?.name
    ].filter(Boolean).map(item => this.normalizePromptSearchText(item)));

    const candidates = [];
    const cuePattern = /(?:firma|şirket|kurum|marka)(?:\s+adı)?\s+["“]?([A-ZÇĞİÖŞÜ][\wÇĞİÖŞÜçğıöşü-]+(?:\s+[A-ZÇĞİÖŞÜ][\wÇĞİÖŞÜçğıöşü-]+){0,2})["”]?/g;
    const multiWordPattern = /\b[A-ZÇĞİÖŞÜ][\wÇĞİÖŞÜçğıöşü-]+(?:\s+[A-ZÇĞİÖŞÜ][\wÇĞİÖŞÜçğıöşü-]+){1,2}\b/g;
    let match;

    while ((match = cuePattern.exec(original)) !== null) {
      candidates.push({ value: match[1], fromCue: true });
    }
    while ((match = multiWordPattern.exec(original)) !== null) {
      candidates.push({ value: match[0], fromCue: false });
    }

    const accepted = [];
    candidates.forEach(candidateInfo => {
      const candidate = String(candidateInfo.value || '').trim();
      const normalized = this.normalizePromptSearchText(candidate);
      if (!normalized || normalized.length < 4) return;
      if (this.isKnownNameLikeCandidate(candidate, knownNames)) return;

      const words = candidate.split(/\s+/).filter(Boolean);
      if (words.every(word => this.isGenericSoftLoreNameToken(word))) return;
      if (words.length === 1 && !candidateInfo.fromCue) return;
      if (words.length > 0 && this.isGenericSoftLoreNameToken(words[words.length - 1])) return;

      if (!accepted.includes(candidate)) {
        accepted.push(candidate);
      }
    });

    return accepted.slice(0, 4);
  }

  getSoftLoreSafeTextParts(intent) {
    const parts = [
      'gibi duruyor',
      'gibi gorunuyor',
      'izlenim veriyor',
      'cok net degil ama',
      'acik kayitta net degil',
      'internette belirgin bir iz yok',
      'acik kaynakta net degil',
      'guncel durumu belirsiz',
      'el degistirmis olabilir',
      'yasli gozukuyor',
      'arka servis hatti gibi',
      'eski bir servis iskelesi olarak kullanildigi anlasiliyor'
    ];

    if (intent?.preferredPhrases?.length) {
      parts.push(...intent.preferredPhrases);
    }

    switch (intent?.slotKey) {
      case 'kurumsal_hava':
        parts.push(
          'duzenli ve profesyonel bir imaj veriyor',
          'kurumsal hava',
          'kontrol altinda oldugu izlenimi',
          'ic isleyis hakkinda net bilgi vermiyor',
          'resmi gorunen ama ici tam okunmayan yapi'
        );
        break;
      case 'kamu_izi':
        parts.push(
          'acik kaynaklarda net bilgi bulunmuyor',
          'kayitlar daginik ve net degil',
          'eski kayitlar var ama guncel durum belirsiz',
          'bu konuda acik bir bilgi yok'
        );
        break;
      case 'sahiplik_gecmisi':
        parts.push(
          'sahiplik gecmisi daginik ve net degil',
          'bir ara buna aitmis gibi',
          'sonradan el degistirmis olabilir',
          'kesin degil'
        );
        break;
      case 'eskilik_izlenimi':
        parts.push(
          'eski tarz ve yipranmis',
          'uzun suredir kullanilmadigini gosteriyor',
          'oldukca eski ve yipranmis durumda'
        );
        break;
      case 'gorunur_kullanim':
        parts.push(
          'vitrinden cok arka servis hatti gibi',
          'eski ekipmanlar ve pasli yapilar bunu gosteriyor',
          'görünen kullanım bu yönde'
        );
        break;
      default:
        break;
    }

    return [...new Set(parts.filter(Boolean))];
  }

  getSoftLoreEntriesForTarget(gameState, interactionType, target) {
    const targetType = interactionType === 'clue_examine' ? 'clue' : 'location';
    return gameState?.loreMemory?.entries?.[targetType]?.[target?.id] || {};
  }

  buildSoftLoreContext(interactionType, target, gameState, userMessage = '') {
    const intent = this.classifySoftLoreQuery(interactionType, target, userMessage);
    if (!intent) return '';

    const targetEntries = this.getSoftLoreEntriesForTarget(gameState, interactionType, target);
    const slotEntry = targetEntries[intent.slotKey] || null;
    const otherEntries = Object.values(targetEntries)
      .filter(entry => entry && entry.slotKey !== intent.slotKey)
      .slice(0, 3);

    let ctx = `[YUMUSAK LORE MODU]\n`;
    ctx += `Oyuncu şu anda sert kanıt değil, belirsiz ama tutarlı arka plan/lore yorumu soruyor.\n`;
    ctx += `Bu cevap soruşturma delili değildir. clues_found her zaman [] olsun. summary boş string olsun.\n`;
    ctx += `Yalnızca görünen ayrıntılar, açık metinler ve gerekirse simüle edilmiş kamu izi üzerinden yorum yap.\n`;
    ctx += `Epistemik ton kullan: "gibi duruyor", "izlenim veriyor", "çok net değil ama", "açık kayıtta net değil", "internette belirgin bir iz yok".\n`;
    ctx += `Yeni firma veya kurum adı ancak arka plan etiketi olarak ve belirsiz tonda üretilebilir; suç ağı, fail, rota, gizli delil veya yeni mekan doğuramaz.\n`;
    ctx += `Yeni net yıl, sayı, tarih, gizli olay veya sert sahiplik zinciri uydurma.\n`;
    ctx += `Aynı slot için kayıtlı lore varsa onun anlamını koru; yeni cevap onunla çelişmesin.\n`;
    ctx += `Aktif lore slotu: ${intent.label}.\n`;

    if (intent.instruction) {
      ctx += `Slot davranışı: ${intent.instruction}\n`;
    }

    if (intent.preferredPhrases.length > 0) {
      ctx += `Tercih edilen belirsizlik dili: ${intent.preferredPhrases.join(', ')}.\n`;
    }

    if (intent.allowPublicTrace) {
      ctx += `Oyuncu kamu izi / internet araştırması dili kullanıyor. Açık iz yoksa bunu dürüstçe söyleyebilirsin.\n`;
    }

    if (slotEntry?.surfaceText) {
      ctx += `Bu slot için kayıtlı yumuşak lore: ${this.compactText(slotEntry.surfaceText, 220)}\n`;
      ctx += `Mümkünse aynı anlamı ve ana ifadeyi koru.\n`;
    }

    if (otherEntries.length > 0) {
      ctx += `Aynı hedef için mevcut diğer lore notları:\n`;
      otherEntries.forEach(entry => {
        ctx += `- ${entry.label || entry.slotKey}: ${this.compactText(entry.surfaceText || entry.canonicalText, 140)}\n`;
      });
    }

    return ctx + '\n';
  }

  hasSoftLoreQualifier(text) {
    const normalized = this.normalizePromptSearchText(text);
    if (!normalized) return false;

    return [
      'gibi duruyor',
      'gibi gorunuyor',
      'izlenim veriyor',
      'hissediliyor',
      'cagristiriyor',
      'var gibi',
      'olabilir',
      'kesin soylemek zor',
      'net degil',
      'acik kayitta net degil',
      'acik kaynakta belirgin bir iz yok',
      'internette belirgin bir iz yok',
      'internetten net bir sey bulamiyorsun',
      'guncel durumu belirsiz',
      'ilk kez duydugun'
    ].some(signal => normalized.includes(signal));
  }

  isSoftLoreCandidateText(text) {
    const normalized = this.normalizePromptSearchText(text);
    if (!normalized) return false;

    if (this.hasSoftLoreQualifier(text)) {
      return true;
    }

    return [
      'acik kaynakta belirgin bir iz yok',
      'internette net bir sey bulamiyorsun',
      'guncel durumu belli degil',
      'el degistirmis olabilir',
      'yasli gozukuyor'
    ].some(signal => normalized.includes(signal));
  }

  detectSoftLoreConfidenceLabel(text) {
    const normalized = this.normalizePromptSearchText(text);
    if (!normalized) return 'dusuk';
    if (/iz yok|bulamiyorsun|net degil|belirsiz|zor/.test(normalized)) return 'dusuk';
    if (/olabilir|gibi|izlenim|hissediliyor|var gibi/.test(normalized)) return 'orta';
    return 'yuksek';
  }

  pickSoftLoreAnchors(target) {
    const rawParts = [
      ...(target?.visible_elements || []),
      ...(target?.interactive_objects || []),
      target?.short_description,
      target?.detailed_description,
      target?.description
    ].filter(Boolean);

    return [...new Set(rawParts.map(part => this.compactText(part, 60)).filter(Boolean))].slice(0, 3);
  }

  isSoftLoreFallbackText(text, interactionType, target) {
    const value = String(text || '').trim();
    if (!value) return true;

    if ((interactionType === 'location_enter' || interactionType === 'location_chat') && target) {
      if (value === this.getSafeLocationFallback(target)) {
        return true;
      }
    }

    if (interactionType === 'clue_examine' && target) {
      if (value === this.getSafeClueFallbackText(target)) {
        return true;
      }
    }

    return value === this.getSafeGeneralFallback(interactionType);
  }

  shouldPersistSoftLore(text, options = {}) {
    const {
      interactionType,
      target,
      userMessage = ''
    } = options;

    const value = String(text || '').trim();
    if (!value) return false;
    if (!this.classifySoftLoreQuery(interactionType, target, userMessage)) return false;
    if (this.isSoftLoreFallbackText(value, interactionType, target)) return false;
    if (this.containsMetaLeak(value)) return false;
    if (interactionType === 'clue_examine' && this.sanitizeClueResponseText(value, target) !== value) return false;
    if (!this.isSoftLoreCandidateText(value)) return false;

    const normalized = this.normalizePromptSearchText(value);
    if (/\bc\d+\b/i.test(value) || /\bunlock\b|\bpipeline\b|\bphase\b/i.test(value)) return false;
    if (/bir sonraki|ileride|daha sonra|gizli kayit|gizli hat|rota degisti|kimin yaptigi belli/.test(normalized)) return false;

    return true;
  }

  getHiddenRevealTextsForClue(scenario, clueId) {
    const texts = [];
    (scenario?.locations || []).forEach(location => {
      (location.hidden_clues || []).forEach(hiddenClue => {
        if (hiddenClue.clue_id === clueId && typeof hiddenClue.reveal_text === 'string') {
          texts.push(hiddenClue.reveal_text);
        }
      });
    });
    return texts;
  }

  getClueSpoilerSignals(scenario, clueId) {
    const clue = (scenario?.clues || []).find(item => item.id === clueId);
    if (!clue) return this.createEmptySpoilerSignals();

    const signals = this.createEmptySpoilerSignals();
    const parts = [
      clue.name,
      clue.short_description,
      clue.detailed_description,
      clue.description,
      clue.examination_hints,
      ...this.getHiddenRevealTextsForClue(scenario, clueId)
    ].filter(Boolean);

    parts.forEach(part => this.mergeSpoilerSignals(signals, this.extractSpoilerSignals(part)));
    return signals;
  }

  getContextSafeTexts(interactionType, target) {
    if (!target) return [];

    if (interactionType === 'location_enter' || interactionType === 'location_chat') {
      return [
        target.name,
        target.description,
        target.atmosphere,
        target.entry_text,
        ...(target.visible_elements || []),
        ...(target.interactive_objects || [])
      ].filter(Boolean);
    }

    if (interactionType === 'character_chat') {
      return [
        target.name,
        target.title,
        target.appearance,
        target.personality,
        target.speech_style
      ].filter(Boolean);
    }

    if (interactionType === 'advisor') {
      return [target.name, target.title, target.personality].filter(Boolean);
    }

    if (interactionType === 'clue_examine') {
      return [target.name, target.short_description, target.detailed_description].filter(Boolean);
    }

    return [];
  }

  findSpoilerLeakClue(text, scenario, interactionType, target, knownClueIds = [], allowedClueIds = [], options = {}) {
    const original = String(text || '').replace(/\s+/g, ' ').trim();
    if (!original) return null;

    const softLoreIntent = options.softLoreIntent || null;
    const stemThreshold = softLoreIntent?.slotKey === 'kurumsal_hava' ? 4 : softLoreIntent ? 3 : 2;
    const phraseThreshold = softLoreIntent ? 2 : 1;

    const responseSignals = this.extractSpoilerSignals(original);
    if (responseSignals.stems.size === 0 && responseSignals.phraseStems.size === 0) {
      return null;
    }

    const knownSet = new Set((knownClueIds || []).filter(Boolean));
    const allowedSet = new Set((allowedClueIds || []).filter(Boolean));
    const safeSignals = this.createEmptySpoilerSignals();

    [...knownSet, ...allowedSet].forEach(clueId => {
      this.mergeSpoilerSignals(safeSignals, this.getClueSpoilerSignals(scenario, clueId));
    });
    this.getContextSafeTexts(interactionType, target).forEach(part => {
      this.mergeSpoilerSignals(safeSignals, this.extractSpoilerSignals(part));
    });
    if (softLoreIntent) {
      this.getSoftLoreSafeTextParts(softLoreIntent).forEach(part => {
        this.mergeSpoilerSignals(safeSignals, this.extractSpoilerSignals(part));
      });
    }

    for (const clue of scenario?.clues || []) {
      if (knownSet.has(clue.id) || allowedSet.has(clue.id)) continue;

      const clueSignals = this.getClueSpoilerSignals(scenario, clue.id);
      const clueNameSignals = this.extractSpoilerSignals(clue.name || '');
      const clueNameHits = [...clueNameSignals.stems].filter(stem =>
        responseSignals.stems.has(stem) && !safeSignals.stems.has(stem)
      );
      const clueNameThreshold = Math.min(2, clueNameSignals.stems.size || 0);
      if (clueNameThreshold > 0 && clueNameHits.length >= clueNameThreshold) {
        return clue;
      }

      const phraseHits = [...clueSignals.phraseStems].filter(phrase =>
        responseSignals.phraseStems.has(phrase) && !safeSignals.phraseStems.has(phrase)
      );
      if (phraseHits.length >= phraseThreshold) {
        return clue;
      }

      const stemHits = [...clueSignals.stems].filter(stem =>
        responseSignals.stems.has(stem) && !safeSignals.stems.has(stem)
      );
      if (stemHits.length >= stemThreshold) {
        return clue;
      }
    }

    return null;
  }

  getSafeLocationFallback(location) {
    const visible = Array.isArray(location?.visible_elements)
      ? location.visible_elements.slice(0, 2).join(', ')
      : '';
    if (visible) {
      return `Şu an yalnızca görünen düzen net: ${visible}. Yeni gizli kayıt veya başka bir hatta açılan sonuç, ayrı bir inceleme olmadan doğrulanmıyor.`;
    }
    return 'Şu an yalnızca görünen düzen net. Yeni gizli kayıt veya başka bir hatta açılan sonuç, ayrı bir inceleme olmadan doğrulanmıyor.';
  }

  getSafeGeneralFallback(interactionType) {
    if (interactionType === 'advisor') {
      return 'Şu an elindeki doğrulanmış deliller bunun ötesine gitmiyor. Önce bulunan kayıtlar ve açık çelişkiler daraltılmalı.';
    }
    if (interactionType === 'character_chat') {
      return 'Bu aşamada doğrulanmamış yeni bir bilgi çıkmıyor. Karakter ancak elindeki net delil kadar açılıyor.';
    }
    return 'Bu aşamada doğrulanmamış yeni bir bilgi çıkmıyor.';
  }

  containsMetaLeak(text) {
    const normalized = this.normalizePromptSearchText(text);
    if (!normalized) return false;

    return [
      'sistem prompt',
      'system prompt',
      'gizli talimat',
      'ek talimat',
      'temel kural',
      'json format',
      'clues found',
      'summary',
      'gpt instruction',
      'rol izolasyonu'
    ].some(signal => normalized.includes(signal));
  }

  sanitizeContextText(text, options = {}) {
    const {
      scenario,
      interactionType,
      target,
      knownClueIds = [],
      allowedClueIds = [],
      userMessage = '',
      artifactType = 'response'
    } = options;

    const original = String(text || '').replace(/\s+/g, ' ').trim();
    if (!original) return '';

    let sanitized = original;
    if (interactionType === 'clue_examine' && target) {
      sanitized = this.sanitizeClueResponseText(sanitized, target);
    }

    const softLoreIntent = this.classifySoftLoreQuery(interactionType, target, userMessage);
    const effectiveSoftLoreIntent = softLoreIntent && this.isSoftLoreCandidateText(sanitized)
      ? softLoreIntent
      : null;

    if (artifactType === 'summary' && softLoreIntent) {
      return '';
    }

    const normalizedSanitized = this.normalizePromptSearchText(sanitized);
    const hasLocalInspectFutureCue = artifactType === 'local-inspect' && [
      'bir sonraki',
      'sonraki kayit',
      'sonraki kayitlar',
      'gelecek kayit',
      'gelecek kayitlar',
      'daha sonra',
      'ileride',
      'sonra acilacak',
      'ileride acilacak'
    ].some(signal => normalizedSanitized.includes(signal));

    if (hasLocalInspectFutureCue) {
      if (interactionType === 'location_enter' || interactionType === 'location_chat') {
        return this.getSafeLocationFallback(target);
      }

      return this.getSafeGeneralFallback(interactionType);
    }

    if (this.containsMetaLeak(sanitized)) {
      if (artifactType === 'summary' || artifactType === 'note') {
        return '';
      }

      if (interactionType === 'location_enter' || interactionType === 'location_chat') {
        return this.getSafeLocationFallback(target);
      }

      return this.getSafeGeneralFallback(interactionType);
    }

    const leakedClue = this.findSpoilerLeakClue(
      sanitized,
      scenario,
      interactionType,
      target,
      knownClueIds,
      allowedClueIds,
      {
        softLoreIntent: effectiveSoftLoreIntent
      }
    );

    if (!leakedClue) {
      return sanitized;
    }

    if (artifactType === 'local-inspect') {
      return sanitized;
    }

    if (artifactType === 'summary' || artifactType === 'note') {
      return '';
    }

    if (interactionType === 'location_enter' || interactionType === 'location_chat') {
      return this.getSafeLocationFallback(target);
    }

    return this.getSafeGeneralFallback(interactionType);
  }

  arePromptKeywordsRelated(left, right) {
    if (!left || !right) return false;
    if (left === right) return true;
    if (left.length >= 4 && right.length >= 4 && left.slice(0, 4) === right.slice(0, 4)) {
      return true;
    }

    const shorter = left.length <= right.length ? left : right;
    const longer = left.length <= right.length ? right : left;
    return shorter.length >= 5 && longer.includes(shorter);
  }

  isHiddenClueTargeted(userMessage, hiddenClue) {
    return this.getHiddenClueTargetMatchScore(userMessage, hiddenClue) > 0;
  }

  getHiddenClueTargetMatchScore(userMessage, hiddenClue) {
    const messageKeywords = this.extractPromptKeywords(userMessage);
    const hintKeywords = this.extractPromptKeywords(hiddenClue?.trigger_hint);

    if (messageKeywords.length === 0 || hintKeywords.length === 0) {
      return 0;
    }

    const matchedHintKeywords = new Set();

    messageKeywords.forEach(messageKeyword => {
      hintKeywords.forEach(hintKeyword => {
        if (this.arePromptKeywordsRelated(messageKeyword, hintKeyword)) {
          matchedHintKeywords.add(hintKeyword);
        }
      });
    });

    return matchedHintKeywords.size;
  }

  buildForcedLocationClueResponse(location, scenario, userMessage = '', allowedClueIds = []) {
    if (!location || !scenario || !Array.isArray(allowedClueIds) || allowedClueIds.length !== 1) {
      return null;
    }

    const clueId = allowedClueIds[0];
    const hiddenClue = (Array.isArray(location.hidden_clues) ? location.hidden_clues : [])
      .find(item => item?.clue_id === clueId);
    if (!hiddenClue) {
      return null;
    }

    if (this.getHiddenClueTargetMatchScore(userMessage, hiddenClue) < 2) {
      return null;
    }

    const clue = (scenario.clues || []).find(item => item.id === clueId);
    const text = String(hiddenClue.reveal_text || clue?.detailed_description || clue?.short_description || '').trim();
    const summary = String(clue?.short_description || this.compactText(text, 110)).trim();
    if (!text) {
      return null;
    }

    return {
      text,
      clues_found: [clueId],
      summary
    };
  }

  buildLocationHiddenClueContext(location, scenario, gameState, userMessage = '') {
    const hiddenClues = Array.isArray(location.hidden_clues) ? location.hidden_clues : [];
    if (hiddenClues.length === 0) return '';
    const targetedClueIds = new Set(this.getAllowedLocationClueIds(location, gameState, userMessage));

    const foundEntries = [];
    const targetedEntries = [];
    let dormantCount = 0;

    hiddenClues.forEach(hiddenClue => {
      const clue = scenario.clues.find(item => item.id === hiddenClue.clue_id);
      const found = gameState.foundClues.some(item => item.id === hiddenClue.clue_id);

      if (found) {
        foundEntries.push({ hiddenClue, clue });
        return;
      }

      if (targetedClueIds.has(hiddenClue.clue_id)) {
        targetedEntries.push({ hiddenClue, clue });
        return;
      }

      dormantCount += 1;
    });

    let ctx = `[GİZLİ İPUCU GÜVENLİĞİ]\n`;
    ctx += `Oyuncu ilgili nesneyi doğrudan araştırmadan açılmamış bir ipucunun içeriğini, sonucunu veya başka mekana açtığı hattı söyleme. clues_found alanına sadece bu mesajda gerçekten tetiklenen ipucuyu yaz.\n`;

    if (foundEntries.length > 0) {
      ctx += `\n[BU MEKANDA ZATEN BULUNAN DELİLLER]\n`;
      foundEntries.forEach(({ clue, hiddenClue }) => {
        ctx += `- ${clue?.name || hiddenClue.clue_id}: ${this.compactText(clue?.short_description || hiddenClue.reveal_text, 110)}\n`;
      });
    }

    if (targetedEntries.length > 0) {
      ctx += `\n[BU MESAJDA DOĞRUDAN ARAŞTIRILAN GİZLİ HATLAR]\n`;
      targetedEntries.forEach(({ hiddenClue, clue }) => {
        ctx += `- ${hiddenClue.clue_id}: Bu tetikleyici şu an doğrudan gündemde.\n`;
        ctx += `  Tetikleyici: ${this.compactText(hiddenClue.trigger_hint, 90)}\n`;
        ctx += `  Açığa çıkarsa verilecek bilgi: ${this.compactText(hiddenClue.reveal_text, 140)}\n`;
        if (clue?.short_description) {
          ctx += `  Kısa kayıt: ${this.compactText(clue.short_description, 90)}\n`;
        }
      });
    }

    if (dormantCount > 0) {
      ctx += `\n[BU MESAJDA GİZLİ KALMASI GEREKEN DELİLLER]\n`;
      ctx += `- ${dormantCount} adet açılmamış delil var. Oyuncu tetik nesnesine doğrudan gelmeden bunların içeriğini kullanma.\n`;
    }

    return ctx + '\n';
  }

  shrinkMessages(messages, profile) {
    if (!Array.isArray(messages)) return [];
    return messages
      .slice(-(profile.maxMessages || messages.length))
      .map(message => ({
        role: message.role,
        content: this.compactText(message.content, profile.maxCharsPerMessage || 800)
      }));
  }

  getInstructionRole(modelName) {
    return String(modelName || '').toLowerCase().startsWith('gpt-5') ? 'developer' : 'system';
  }

  getVisibleOutputBudget(modelName, maxOutputTokens) {
    if (!maxOutputTokens) return 0;
    if (String(modelName || '').startsWith('gpt-5')) {
      return Math.max(1400, maxOutputTokens + 700);
    }
    return maxOutputTokens;
  }

  getTokenLimitPayload(modelName, maxOutputTokens) {
    if (!maxOutputTokens) return {};
    if (String(modelName || '').startsWith('gpt-5')) {
      return { max_completion_tokens: this.getVisibleOutputBudget(modelName, maxOutputTokens) };
    }
    return { max_tokens: maxOutputTokens };
  }

  getTemperaturePayload(modelName, temperature) {
    if (!Number.isFinite(temperature)) return {};
    if (String(modelName || '').toLowerCase().startsWith('gpt-5')) {
      return {};
    }
    return { temperature };
  }

  async performCall(systemPrompt, messages, temperature, modelName, profile) {
    const payload = {
      model: modelName,
      messages: [
        { role: this.getInstructionRole(modelName), content: systemPrompt },
        ...messages
      ],
      response_format: { type: 'json_object' },
      ...this.getTemperaturePayload(modelName, temperature),
      ...this.getTokenLimitPayload(modelName, profile.maxOutputTokens)
    };

    const startedAt = Date.now();

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      this.emitEventLog('gpt', 'api_call_error', {
        mode: 'response',
        model: modelName,
        endpoint: this.endpoint,
        durationMs: Date.now() - startedAt,
        httpStatus: response.status,
        request: {
          instructionRole: this.getInstructionRole(modelName),
          systemPrompt: this.compactText(systemPrompt, 16000),
          messages: this.buildMessageSnapshots(messages, 2600),
          temperature,
          limits: profile
        },
        error: err.error?.message || 'Bilinmeyen hata'
      }, 'error');
      throw new Error(`API Hatası (${response.status}): ${err.error?.message || 'Bilinmeyen hata'}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('GPT boş cevap döndü.');
    }

    const parsed = this.parseResponse(content);
    if (!parsed.text?.trim()) {
      this.emitEventLog('gpt', 'api_call_error', {
        mode: 'response',
        model: modelName,
        endpoint: this.endpoint,
        durationMs: Date.now() - startedAt,
        usage: data.usage || null,
        finishReason: data.choices?.[0]?.finish_reason || '',
        request: {
          instructionRole: this.getInstructionRole(modelName),
          systemPrompt: this.compactText(systemPrompt, 16000),
          messages: this.buildMessageSnapshots(messages, 2600),
          temperature,
          limits: profile
        },
        rawContent: this.compactText(content, 20000),
        error: 'GPT geçerli metin döndürmedi.'
      }, 'error');
      throw new Error('GPT geçerli metin döndürmedi.');
    }

    this.emitEventLog('gpt', 'api_call_complete', {
      mode: 'response',
      model: modelName,
      endpoint: this.endpoint,
      durationMs: Date.now() - startedAt,
      usage: data.usage || null,
      finishReason: data.choices?.[0]?.finish_reason || '',
      request: {
        instructionRole: this.getInstructionRole(modelName),
        systemPrompt: this.compactText(systemPrompt, 16000),
        messages: this.buildMessageSnapshots(messages, 2600),
        temperature,
        limits: profile
      },
      rawContent: this.compactText(content, 20000),
      parsedResponse: parsed
    }, 'success');

    return parsed;
  }

  async performJSONCall(systemPrompt, messages, temperature, modelName, profile) {
    const payload = {
      model: modelName,
      messages: [
        { role: this.getInstructionRole(modelName), content: systemPrompt },
        ...messages
      ],
      response_format: { type: 'json_object' },
      ...this.getTemperaturePayload(modelName, temperature),
      ...this.getTokenLimitPayload(modelName, profile.maxOutputTokens)
    };

    const startedAt = Date.now();

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      this.emitEventLog('gpt', 'api_call_error', {
        mode: 'json',
        model: modelName,
        endpoint: this.endpoint,
        durationMs: Date.now() - startedAt,
        httpStatus: response.status,
        request: {
          instructionRole: this.getInstructionRole(modelName),
          systemPrompt: this.compactText(systemPrompt, 16000),
          messages: this.buildMessageSnapshots(messages, 2600),
          temperature,
          limits: profile
        },
        error: err.error?.message || 'Bilinmeyen hata'
      }, 'error');
      throw new Error(`API Hatası (${response.status}): ${err.error?.message || 'Bilinmeyen hata'}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      this.emitEventLog('gpt', 'api_call_error', {
        mode: 'json',
        model: modelName,
        endpoint: this.endpoint,
        durationMs: Date.now() - startedAt,
        usage: data.usage || null,
        finishReason: data.choices?.[0]?.finish_reason || '',
        request: {
          instructionRole: this.getInstructionRole(modelName),
          systemPrompt: this.compactText(systemPrompt, 16000),
          messages: this.buildMessageSnapshots(messages, 2600),
          temperature,
          limits: profile
        },
        error: 'GPT boş cevap döndü.'
      }, 'error');
      throw new Error('GPT boş cevap döndü.');
    }

    try {
      const parsed = JSON.parse(content);
      this.emitEventLog('gpt', 'api_call_complete', {
        mode: 'json',
        model: modelName,
        endpoint: this.endpoint,
        durationMs: Date.now() - startedAt,
        usage: data.usage || null,
        finishReason: data.choices?.[0]?.finish_reason || '',
        request: {
          instructionRole: this.getInstructionRole(modelName),
          systemPrompt: this.compactText(systemPrompt, 16000),
          messages: this.buildMessageSnapshots(messages, 2600),
          temperature,
          limits: profile
        },
        rawContent: this.compactText(content, 20000),
        parsedResponse: parsed
      }, 'success');
      return parsed;
    } catch {
      this.emitEventLog('gpt', 'api_call_error', {
        mode: 'json',
        model: modelName,
        endpoint: this.endpoint,
        durationMs: Date.now() - startedAt,
        usage: data.usage || null,
        finishReason: data.choices?.[0]?.finish_reason || '',
        request: {
          instructionRole: this.getInstructionRole(modelName),
          systemPrompt: this.compactText(systemPrompt, 16000),
          messages: this.buildMessageSnapshots(messages, 2600),
          temperature,
          limits: profile
        },
        rawContent: this.compactText(content, 20000),
        error: 'GPT geçerli JSON nesnesi döndürmedi.'
      }, 'error');
      throw new Error('GPT geçerli JSON nesnesi döndürmedi.');
    }
  }

  // ----------------------------------------------------------
  // ANA API ÇAĞRISI
  // ----------------------------------------------------------
  async call(type, systemPrompt, messages, temperature = 0.7) {
    const profile = this.getCallProfile(type);
    const compactMessages = this.shrinkMessages(messages, profile);

    this.emitEventLog('gpt', 'call_start', {
      callType: type,
      mode: 'response',
      route: {
        primaryModel: profile.model,
        fallbackModel: profile.fallbackModel || null
      },
      temperature,
      systemPrompt: this.compactText(systemPrompt, 16000),
      messages: this.buildMessageSnapshots(compactMessages, 2600),
      limits: profile
    }, 'info');

    try {
      return await this.performCall(systemPrompt, compactMessages, temperature, profile.model, profile);
    } catch (error) {
      if (!profile.fallbackModel || profile.fallbackModel === profile.model) {
        this.emitEventLog('gpt', 'call_failed', {
          callType: type,
          mode: 'response',
          model: profile.model,
          error: error?.message || 'Bilinmeyen hata'
        }, 'error');
        throw error;
      }

      console.warn(`Birincil model başarısız oldu (${profile.model}). Yedek modele geçiliyor: ${profile.fallbackModel}`);
      this.emitEventLog('gpt', 'fallback_switch', {
        callType: type,
        mode: 'response',
        fromModel: profile.model,
        toModel: profile.fallbackModel,
        error: error?.message || 'Bilinmeyen hata'
      }, 'warning');
      return await this.performCall(systemPrompt, compactMessages, temperature, profile.fallbackModel, profile);
    }
  }

  async callJSON(type, systemPrompt, messages, temperature = 0.2) {
    const profile = this.getCallProfile(type);
    const compactMessages = this.shrinkMessages(messages, profile);

    this.emitEventLog('gpt', 'call_start', {
      callType: type,
      mode: 'json',
      route: {
        primaryModel: profile.model,
        fallbackModel: profile.fallbackModel || null
      },
      temperature,
      systemPrompt: this.compactText(systemPrompt, 16000),
      messages: this.buildMessageSnapshots(compactMessages, 2600),
      limits: profile
    }, 'info');

    try {
      return await this.performJSONCall(systemPrompt, compactMessages, temperature, profile.model, profile);
    } catch (error) {
      if (!profile.fallbackModel || profile.fallbackModel === profile.model) {
        this.emitEventLog('gpt', 'call_failed', {
          callType: type,
          mode: 'json',
          model: profile.model,
          error: error?.message || 'Bilinmeyen hata'
        }, 'error');
        throw error;
      }

      console.warn(`Birincil model başarısız oldu (${profile.model}). Yedek modele geçiliyor: ${profile.fallbackModel}`);
      this.emitEventLog('gpt', 'fallback_switch', {
        callType: type,
        mode: 'json',
        fromModel: profile.model,
        toModel: profile.fallbackModel,
        error: error?.message || 'Bilinmeyen hata'
      }, 'warning');
      return await this.performJSONCall(systemPrompt, compactMessages, temperature, profile.fallbackModel, profile);
    }
  }

  // ----------------------------------------------------------
  // CEVAP PARSE
  // ----------------------------------------------------------
  parseResponse(content) {
    try {
      const parsed = JSON.parse(content);
      return {
        text: String(parsed.text || '').trim(),
        clues_found: Array.isArray(parsed.clues_found) ? parsed.clues_found.filter(Boolean) : [],
        summary: String(parsed.summary || '').trim()
      };
    } catch {
      // JSON parse başarısız olursa ham metni döndür
      return {
        text: String(content || '').trim(),
        clues_found: [],
        summary: ''
      };
    }
  }

  // ----------------------------------------------------------
  // SYSTEM PROMPT OLUŞTURUCU
  // ----------------------------------------------------------
  buildSystemPrompt(type, scenario, gameState, target, userMessage = '') {
    const profile = this.getCallProfile(type);
    let prompt = scenario.gpt_base_instructions + '\n\n';
    prompt += this.buildResponseStyleContext(type, scenario);
    prompt += `[GENEL ORTAM]\n${scenario.setting}\n\n`;

    // Dinamik oyun durumu
    prompt += this.buildDynamicContext(type, target, gameState, scenario, profile);

    // Tipe göre özel bölüm
    switch (type) {
      case 'location_enter':
        prompt += this.buildLocationEnterContext(target, scenario);
        break;
      case 'location_chat':
        prompt += this.buildLocationChatContext(target, scenario, gameState, userMessage);
        prompt += this.buildSoftLoreContext('location_chat', target, gameState, userMessage);
        break;
      case 'character_chat':
        prompt += this.buildCharacterChatContext(target, scenario, gameState);
        break;
      case 'advisor':
        prompt += this.buildAdvisorContext(scenario, gameState);
        break;
      case 'clue_examine':
        prompt += this.buildClueExamineContext(target, scenario, gameState);
        prompt += this.buildSoftLoreContext('clue_examine', target, gameState, userMessage);
        break;
    }

    prompt += this.buildOutputContract(type);

    return prompt;
  }

  buildOutputContract(type) {
    let textRule = 'text alanını kısa ve işlevsel tut.';
    let summaryRule = 'summary alanını yalnızca anlamlı yeni bilgi varsa tek kısa cümleyle doldur; yoksa boş string bırak.';

    switch (type) {
      case 'location_enter':
        textRule = 'text alanı en fazla 2 kısa cümle olsun. Aynı tasviri tekrar etme.';
        summaryRule = 'summary sadece yeni araştırma yönü açıldıysa tek kısa cümle olsun; yoksa boş string.';
        break;
      case 'location_chat':
        textRule = 'text alanı en fazla 3 kısa cümle olsun. İlk cümlede sonucu ver.';
        summaryRule = 'summary sadece yeni bulgu çıktıysa tek kısa cümle olsun; yoksa boş string.';
        break;
      case 'character_chat':
        textRule = 'text alanı en fazla 3 kısa cümle olsun. Karakterin ağzından, doğal ve kesik konuş.';
        summaryRule = 'summary sadece yeni şüphe, yalan veya tutarsızlık doğduysa tek kısa cümle olsun; yoksa boş string.';
        break;
      case 'advisor':
        textRule = 'text alanı en fazla 4 kısa cümle olsun. Sadece oyuncunun bildiği şeylerden akıl yürüt.';
        summaryRule = 'summary sadece yeni soruşturma önceliği netleştiyse tek kısa cümle olsun; yoksa boş string.';
        break;
      case 'clue_examine':
        textRule = 'text alanı en fazla 3 kısa cümle olsun. Önce sonucu, sonra en fazla bir destek detayı ver. İpucu IDsi, açılma zinciri, unlock, phase veya pipeline gibi teknik oyun dili kullanma.';
        summaryRule = 'summary sadece ipucunun anlamı değiştiyse tek kısa cümle olsun; yoksa boş string.';
        break;
    }

    let clueRule = 'sadece gerçekten ortaya çıkan yeni ipucu kimlikleri; aksi halde []';
    if (type === 'location_enter') {
      clueRule = 'her zaman []';
    } else if (type === 'character_chat' || type === 'advisor' || type === 'clue_examine') {
      clueRule = 'her zaman []';
    } else if (type === 'location_chat') {
      clueRule = 'yalnızca oyuncu bu mesajda doğru nesneyi doğrudan araştırıp yeni bir delil gerçekten açtıysa ilgili clue id; aksi halde []';
    }

    return `[ÇIKTI SÖZLEŞMESİ]\nSadece JSON döndür. Anahtarlar yalnızca "text", "clues_found", "summary" olsun.\ntext: ${textRule}\nclues_found: ${clueRule}\nsummary: ${summaryRule}\nJSON dışında ek açıklama yazma.\n\n`;
  }

  buildResponseStyleContext(type, scenario) {
    const style = scenario.response_style;
    if (!style) return '';

    let ctx = `[YANIT ÜSLUBU]\n`;

    if (style.max_sentences) {
      ctx += `- Cevaplarını çoğunlukla ${style.max_sentences} kısa cümle içinde tut.\n`;
    }
    if (style.direct_answer_first) {
      ctx += `- Dar ve net bir soru gelirse ilk cümlede doğrudan cevabı ver.\n`;
    }
    if (style.no_player_emotion_narration) {
      ctx += `- Oyuncunun ne hissettiğini, düşündüğünü veya içinde ne uyandığını yazma.\n`;
    }
    if (style.avoid_repeated_atmosphere) {
      ctx += `- Ortamı sadece işlevsel olduğu kadar an. Aynı yağmur, rüzgar, metal, koku gibi ayrıntıları tekrar etme.\n`;
    }
    if (style.plain_turkish) {
      ctx += `- Basit, sade ve keskin Türkçe kullan. Roman gibi yazma; metafor, iç ses ve duygu süsü ekleme.\n`;
    }
    if (style.single_paragraph_preferred) {
      ctx += `- Gerekmedikçe tek paragraf kullan.\n`;
    }
    if (type === 'location_enter' && style.short_location_entries) {
      ctx += `- Mekan girişinde oyuncu hazır giriş metnini zaten gördü. Aynı tasviri tekrar etme; sadece göze çarpan 1-2 somut noktayı kısaca ekle.\n`;
    }
    if ((type === 'location_chat' || type === 'clue_examine') && style.direct_answer_first) {
      ctx += `- Mekan ve ipucu araştırmasında sonuç odaklı yaz: önce bulguyu söyle, gerekirse tek destek detayı ekle.\n`;
    }
    if (type === 'character_chat' && style.concise_character_intro) {
      ctx += `- Karakter konuşmalarında kısa, doğal ve kesik cevaplar tercih et. Gereksiz sahne anlatımı yapma.\n`;
    }

    return ctx + '\n';
  }

  getScenarioTemperature(type, scenario, fallback) {
    const overrides = scenario.response_style?.temperature_overrides;
    if (!overrides || typeof overrides !== 'object') return fallback;

    const value = overrides[type];
    return typeof value === 'number' ? value : fallback;
  }

  describeBand(value, lowLabel, midLabel, highLabel) {
    if (value >= 70) return highLabel;
    if (value >= 40) return midLabel;
    return lowLabel;
  }

  translatePlayerApproach(value) {
    switch (value) {
      case 'suclayici': return 'suçlayıcı';
      case 'empatik': return 'empatik';
      case 'sorgulayici': return 'sorgulayıcı';
      default: return 'nötr';
    }
  }

  translateUnlockRoute(value) {
    switch (value) {
      case 'evidence': return 'somut delil';
      case 'contradiction': return 'çelişkiyi göstermek';
      case 'calm': return 'sakin ton';
      case 'return_later': return 'ara verip geri dönmek';
      case 'personal_memory': return 'kişisel hafıza / ortak bağ';
      case 'empathy': return 'empati';
      case 'respect': return 'saygılı yaklaşım';
      default: return value || '-';
    }
  }

  describeClosureLevel(value) {
    if (value >= 3) return 'tam kapalı';
    if (value >= 2) return 'sert biçimde temkinli';
    if (value >= 1) return 'ölçülü biçimde kapalı';
    return 'kontrollü açık';
  }

  describeBreakthrough(value) {
    if (value >= 70) return 'kırılma eşiğinde';
    if (value >= 40) return 'doğru yaklaşıma cevap verebilir';
    return 'henüz direniyor';
  }

  describeStressResponse(value) {
    switch (value) {
      case 'fragile_spill': return 'baskıda çatlayabilir ama fazla sertlikte dağılır';
      case 'grief_soften': return 'duygusal ve insani yaklaşımda çözülür';
      case 'stoic_withdraw': return 'baskıda kapanır, sabır ve saygıyla açılır';
      case 'combative_leak': return 'sertleşirken istemeden açık verir';
      case 'performative_mask': return 'köşeye sıkışınca rol yapıp maske takar';
      case 'formal_bargainer': return 'kontrolü korumak için pazarlık ve mesafe kurar';
      default: return 'duruma göre kontrollü tepki verir';
    }
  }

  getClosureRoleHint(level) {
    if (level >= 3) return 'Şu an çok kısa, kaçamak ve savunmalı cevap ver.';
    if (level >= 2) return 'Şu an parçalı bilgi ver, doğrudan itiraftan kaçın.';
    if (level >= 1) return 'Temkinli kal ama doğru yaklaşım görürsen az biraz açıl.';
    return 'Tam rahatlama; yine de karakter filtresini ve gizli bilgileri koru.';
  }

  getSummaryLines(gameState, prefix, maxItems = 4, maxLength = 140) {
    return Object.entries(gameState.gptSummaries || {})
      .filter(([id, summary]) => id.startsWith(prefix) && summary)
      .slice(-maxItems)
      .map(([id, summary]) => `${id.replace(prefix, '')}: ${this.compactText(summary, maxLength)}`);
  }

  getClueNarrativePurpose(clue) {
    if (typeof clue?.narrative_purpose === 'string' && clue.narrative_purpose.trim()) {
      return this.compactText(clue.narrative_purpose, 140);
    }
    return 'Bu ipucu tek başına hüküm vermez; diğer bulgularla birlikte anlam kazanır.';
  }

  getSafeClueFallbackText(clue) {
    const parts = [
      this.compactText(clue?.short_description || clue?.description || '', 120),
      this.getClueNarrativePurpose(clue)
    ].filter(Boolean);

    return parts.join(' ');
  }

  sanitizeClueResponseText(text, clue) {
    const original = String(text || '').replace(/\s+/g, ' ').trim();
    if (!original) return '';

    const lowered = original.toLocaleLowerCase('tr-TR');
    const leaksTechnicalState = /\bc\d+\b/i.test(original)
      || /\bunlock\b|\bpipeline\b|\bphase\b/i.test(original)
      || /ipucu(?:larının|ların|nun|nın)? açıl|açılmasını sağlar|açılmasına yol verir/.test(lowered);

    const leaksFutureGating = /ileride|daha sonra|sonraki aşama|ilerleyen aşama|bundan sonra|bir sonraki|sonraki (?:kayit|kayıt|adim|adım)|gelecek (?:kayit|kayıt)|şimdilik.*(başka|ek) (ipucu|delil|kayıt)|başka (ipucu|delil|kayıt)(?:larla|larla birlikte| bulunca| bulunursa| gerek)|daha fazla (ipucu|delil|kayıt)|ancak .*?(ipucu|delil|kayıt)|netleştirmek için .*?(ipucu|delil|kayıt)/.test(lowered);

    if (!leaksTechnicalState && !leaksFutureGating) {
      return original;
    }

    return this.getSafeClueFallbackText(clue);
  }

  serializeConversationHistory(conversationHistory, maxMessages = 12, maxCharsPerMessage = 260) {
    return (conversationHistory || [])
      .slice(-maxMessages)
      .map(message => `${message.role}: ${this.compactText(message.content, maxCharsPerMessage)}`)
      .join('\n');
  }

  buildCharacterStateContext(character, gameState, scenario) {
    const state = gameState.characterStates?.[character.id];
    if (!state) return '';

    const profile = character.interrogation_profile || {};
    const visible = [];
    const triggerNames = (state.triggeredClues || []).map(clueId => {
      const clue = scenario.clues.find(item => item.id === clueId);
      return clue ? clue.name : clueId;
    });

    const visibleAppearance = Array.isArray(state.visibleAppearance)
      ? state.visibleAppearance.map(item => typeof item === 'string' ? item : item?.text).filter(Boolean)
      : [];
    const voiceTone = Array.isArray(state.voiceTone)
      ? state.voiceTone.map(item => typeof item === 'string' ? item : item?.text).filter(Boolean)
      : [];

    if (visibleAppearance.length) {
      visible.push(`Görünür: ${visibleAppearance.join(', ')}`);
    }
    if (voiceTone.length) {
      visible.push(`Ses: ${voiceTone.join(', ')}`);
    }

    let ctx = `[ANLIK DAVRANIŞ REHBERİ]\n`;
    ctx += `Dış hal: ${state.outwardMood}. İç durum: ${state.innerState}.\n`;
    ctx += `Davranış çizgisi: ${state.currentBehavior}; bilgi verme: ${state.disclosureMode}; tepki: ${state.responseMode || 'temkinli'}.\n`;
    ctx += `Sorgu durumu: ${this.describeClosureLevel(state.closureLevel || 0)}; ${this.describeBreakthrough(state.breakthrough || 0)}; güven ${this.describeBand(state.trust, 'düşük', 'oluşuyor', 'yüksek')}; temkin ${this.describeBand(state.guard, 'gevşek', 'orta', 'sert')}.\n`;
    if (visible.length) {
      ctx += `${visible.join(' | ')}\n`;
    }
    if (profile.stress_response) {
      ctx += `Gizli tepki paterni: ${this.describeStressResponse(profile.stress_response)}.\n`;
    }
    if (Array.isArray(profile.unlock_routes) && profile.unlock_routes.length) {
      ctx += `Daha iyi açılma yolu: ${profile.unlock_routes.map(route => this.translateUnlockRoute(route)).join(', ')}.\n`;
    }
    if (profile.hidden_weak_spot) {
      ctx += `Hassas nokta: ${profile.hidden_weak_spot}.\n`;
    }
    ctx += `Son oyuncu yaklaşımı: ${this.translatePlayerApproach(state.lastPlayerApproach)}.\n`;
    if (state.lastPressureSource) {
      ctx += `Son baskı kaynağı: ${state.lastPressureSource}.\n`;
    }
    if (triggerNames.length) {
      ctx += `Aktif kırılma başlıkları: ${triggerNames.join(', ')}.\n`;
    }
    ctx += `Rol kuralı: Aynı baskıya herkesi aynı tepkiyle oynama. ${this.getClosureRoleHint(state.closureLevel || 0)}\n\n`;
    return ctx;
  }

  // ----------------------------------------------------------
  // DİNAMİK CONTEXT (Oyun durumu)
  // ----------------------------------------------------------
  buildDynamicContext(type, target, gameState, scenario) {
    // Güvenlik: ortak/global özetler sadece danışmana verilir.
    // Karakter, mekan ve ipucu çağrılarında bağlam izole tutulur.
    if (type === 'advisor') {
      let ctx = `[OYUN DURUMU - DANIŞMAN ÖZETİ]\n`;
      ctx += `Aşama: ${gameState.phase}\n`;
      ctx += `Ziyaret edilen mekanlar: ${[...gameState.visitedLocations].join(', ') || 'Henüz yok'}\n`;

      const clues = gameState.foundClues
        .slice(-8)
        .map(clue => `${clue.name}: ${this.compactText(clue.short_description, 72)}`);
      ctx += `Bulunan ipuçları: ${clues.join(' | ') || 'Henüz yok'}\n`;

      const characterSummaries = this.getSummaryLines(gameState, 'char_', 4, 140);
      const locationSummaries = this.getSummaryLines(gameState, 'loc_', 3, 130);
      const clueSummaries = this.getSummaryLines(gameState, 'clue_', 4, 130);

      if (characterSummaries.length) {
        ctx += `Karakter özetleri:\n- ${characterSummaries.join('\n- ')}\n`;
      }
      if (locationSummaries.length) {
        ctx += `Mekan özetleri:\n- ${locationSummaries.join('\n- ')}\n`;
      }
      if (clueSummaries.length) {
        ctx += `İpucu özetleri:\n- ${clueSummaries.join('\n- ')}\n`;
      }

      return ctx + '\n';
    }

    let ctx = `[OYUN DURUMU - İZOLE BAĞLAM]\n`;
    ctx += `Aşama: ${gameState.phase}\n`;
    ctx += `Aktif bağlam: ${type}\n`;

    if (type === 'character_chat' && target?.id) {
      ctx += `Aktif karakter: ${target.id}\n`;
    } else if ((type === 'location_chat' || type === 'location_enter') && target?.id) {
      ctx += `Aktif mekan: ${target.id}\n`;
    } else if (type === 'clue_examine' && target?.id) {
      ctx += `Aktif ipucu: ${target.id}\n`;
    }

    return ctx + '\n';
  }

  getKnownClueIds(gameState) {
    return Array.isArray(gameState?.foundClues)
      ? gameState.foundClues.map(clue => clue?.id).filter(Boolean)
      : [];
  }

  getRankedLocationHiddenClues(location, gameState, userMessage = '') {
    const foundSet = new Set(this.getKnownClueIds(gameState));
    return (Array.isArray(location?.hidden_clues) ? location.hidden_clues : [])
      .filter(hiddenClue => !foundSet.has(hiddenClue.clue_id))
      .map(hiddenClue => ({
        hiddenClue,
        score: this.getHiddenClueTargetMatchScore(userMessage, hiddenClue)
      }))
      .filter(entry => entry.score > 0)
      .sort((left, right) => right.score - left.score);
  }

  getAllowedLocationClueIds(location, gameState, userMessage = '') {
    const rankedEntries = this.getRankedLocationHiddenClues(location, gameState, userMessage);
    if (rankedEntries.length === 0) {
      return [];
    }

    const strongestScore = rankedEntries[0].score;
    return rankedEntries
      .filter(entry => entry.score === strongestScore)
      .map(entry => entry.hiddenClue.clue_id)
      .filter(Boolean);
  }

  sanitizeReturnedClueIds(clueIds, allowedClueIds = []) {
    const allowedSet = new Set((allowedClueIds || []).filter(Boolean));
    if (allowedSet.size === 0) {
      return [];
    }

    return (Array.isArray(clueIds) ? clueIds : []).filter(clueId => allowedSet.has(clueId));
  }

  buildResponseSnapshot(response, textLimit = 360, summaryLimit = 220) {
    return {
      text: this.compactText(response?.text, textLimit),
      summary: this.compactText(response?.summary, summaryLimit),
      clues_found: Array.isArray(response?.clues_found) ? response.clues_found.slice(0, 8) : []
    };
  }

  buildJudgeVerdictSnapshot(verdict) {
    if (!verdict) return null;

    return {
      approved: Boolean(verdict.approved),
      issues: this.normalizeJudgeIssues(verdict.issues),
      reason: this.compactText(verdict.reason, 220),
      retryInstruction: this.compactText(verdict.retryInstruction, 220)
    };
  }

  buildRequestMetaSnapshot(rawRequest = {}) {
    if (!rawRequest || typeof rawRequest !== 'object') return null;

    return {
      temperature: Number.isFinite(rawRequest.temperature) ? rawRequest.temperature : undefined,
      judgeEnabled: Boolean(rawRequest.judgeEnabled),
      maxRetries: Number.isInteger(rawRequest.maxRetries) ? rawRequest.maxRetries : undefined,
      route: rawRequest.route && typeof rawRequest.route === 'object'
        ? {
            primaryModel: this.compactText(rawRequest.route.primaryModel, 80),
            fallbackModel: this.compactText(rawRequest.route.fallbackModel, 80)
          }
        : null,
      baseSystemPrompt: this.compactText(rawRequest.baseSystemPrompt, 16000),
      finalSystemPrompt: this.compactText(rawRequest.finalSystemPrompt || rawRequest.baseSystemPrompt, 18000),
      messages: this.buildMessageSnapshots(rawRequest.messages, 2600)
    };
  }

  getSanitizerFallbackLabel(interactionType, target, text) {
    const value = String(text || '').trim();
    if (!value) return '';

    if ((interactionType === 'location_enter' || interactionType === 'location_chat') && value === this.getSafeLocationFallback(target)) {
      return 'location_safe_fallback';
    }

    if (interactionType === 'clue_examine' && value === this.getSafeClueFallbackText(target)) {
      return 'clue_safe_fallback';
    }

    if (value === this.getSafeGeneralFallback(interactionType)) {
      return 'general_safe_fallback';
    }

    return '';
  }

  buildInteractionEventTrace(options = {}) {
    const {
      interactionType,
      target,
      userMessage = '',
      loreIntent = null,
      allowedClueIds = [],
      attempts = [],
      judgeApplied = false,
      finalAction = 'approved',
      finalResponse = null,
      judge = null,
      requestMeta = null
    } = options;

    return {
      interactionType,
      targetId: target?.id || null,
      targetName: target?.name || null,
      userMessage: this.compactText(userMessage, 260),
      loreIntent: loreIntent
        ? {
            slotKey: loreIntent.slotKey || '',
            label: loreIntent.label || ''
          }
        : null,
      allowedClueIds: Array.isArray(allowedClueIds) ? allowedClueIds.slice(0, 8) : [],
      judgeApplied: Boolean(judgeApplied),
      finalAction,
      request: this.buildRequestMetaSnapshot(requestMeta),
      attempts,
      finalResponse: this.buildResponseSnapshot(finalResponse),
      judge: judge ? this.buildJudgeVerdictSnapshot(judge) : null
    };
  }

  attachEventTrace(response, eventTrace = null) {
    if (!eventTrace) return response;
    return {
      ...response,
      eventTrace
    };
  }

  finalizeResponse(response, options = {}) {
    const {
      interactionType,
      scenario,
      gameState,
      target,
      userMessage = '',
      allowedClueIds = []
    } = options;

    const sanitizedResponse = {
      ...response,
      text: String(response?.text || '').trim(),
      summary: String(response?.summary || '').trim(),
      clues_found: this.sanitizeReturnedClueIds(response?.clues_found, allowedClueIds)
    };
    const forcedLocationClueResponse = interactionType === 'location_chat'
      ? this.buildForcedLocationClueResponse(target, scenario, userMessage, allowedClueIds)
      : null;

    if (forcedLocationClueResponse && sanitizedResponse.clues_found.length === 0) {
      sanitizedResponse.text = forcedLocationClueResponse.text;
      sanitizedResponse.summary = forcedLocationClueResponse.summary;
      sanitizedResponse.clues_found = forcedLocationClueResponse.clues_found.slice();
    }

    const knownClueIds = this.getKnownClueIds(gameState);

    sanitizedResponse.text = this.sanitizeContextText(sanitizedResponse.text, {
      scenario,
      interactionType,
      target,
      knownClueIds,
      userMessage,
      allowedClueIds: sanitizedResponse.clues_found
    });

    sanitizedResponse.summary = this.sanitizeContextText(sanitizedResponse.summary, {
      scenario,
      interactionType,
      target,
      knownClueIds,
      userMessage,
      allowedClueIds: sanitizedResponse.clues_found,
      artifactType: 'summary'
    });

    if (interactionType === 'clue_examine') {
      sanitizedResponse.text = this.sanitizeClueResponseText(sanitizedResponse.text, target);
      sanitizedResponse.summary = this.sanitizeClueResponseText(sanitizedResponse.summary, target);
    }

    if (!sanitizedResponse.text) {
      if (interactionType === 'location_enter' || interactionType === 'location_chat') {
        sanitizedResponse.text = this.getSafeLocationFallback(target);
      } else if (interactionType === 'clue_examine') {
        sanitizedResponse.text = this.getSafeClueFallbackText(target);
      } else {
        sanitizedResponse.text = this.getSafeGeneralFallback(interactionType);
      }
    }

    return sanitizedResponse;
  }

  shouldJudgeInteraction(interactionType) {
    return interactionType === 'location_chat'
      || interactionType === 'character_chat'
      || interactionType === 'clue_examine';
  }

  getJudgeRetryLimit() {
    return 2;
  }

  getJudgeFallbackText(interactionType, loreIntent = null) {
    if (interactionType === 'character_chat') {
      return 'Bu konuda şu an net konuşamıyorum. Başka bir açıdan sorarsan daha sağlıklı cevap verebilirim.';
    }

    if (loreIntent) {
      return 'Bu konuda net ve güvenilir bir lore genişletmesi kuramıyorum. İstersen başka bir açıdan sor.';
    }

    if (interactionType === 'clue_examine') {
      return 'Bu ayrıntıdan şu an net ve güvenilir bir sonuç çıkaramıyorum. İstersen başka bir detayı sor.';
    }

    return 'Bu konuda şu an net bir şey çıkaramıyorum. İstersen başka bir açıdan sor.';
  }

  getDefaultJudgeRetryInstruction(interactionType, loreIntent = null) {
    if (interactionType === 'character_chat') {
      return 'Karakterin mevcut temkin ve açıklık seviyesini koru. Erken itiraf, gizli gerçek veya başkasının iç bilgisini verme.';
    }

    if (loreIntent) {
      return 'Yorumu daha belirsiz, daha ihtiyatlı ve görünür/kamu-izi düzeyinde tut. Sert kanıt ya da kesin hüküm dili kullanma.';
    }

    if (interactionType === 'clue_examine') {
      return 'Yalnızca bu ipucundan şu anda güvenle çıkarılabilecek anlamı söyle. Zincir, gelecek adım veya görünmeyen delile atlama.';
    }

    return 'Yanıtı daralt, daha ihtiyatlı kur ve yalnızca oyuncunun şu anda çıkarabileceği düzeyde tut.';
  }

  normalizeJudgeIssues(values) {
    return [...new Set((Array.isArray(values) ? values : [])
      .map(value => String(value || '').trim())
      .filter(Boolean))].slice(0, 6);
  }

  buildJudgeLorePayload(gameState) {
    const entries = gameState?.loreMemory?.entries || {};

    return {
      location: Object.entries(entries.location || {}).map(([targetId, slotMap]) => ({
        targetId,
        slots: Object.values(slotMap || {}).map(entry => ({
          slotKey: entry.slotKey,
          text: this.compactText(entry.surfaceText || entry.canonicalText, 180),
          confidence: entry.confidence || '',
          traceState: entry.traceState || ''
        }))
      })),
      clue: Object.entries(entries.clue || {}).map(([targetId, slotMap]) => ({
        targetId,
        slots: Object.values(slotMap || {}).map(entry => ({
          slotKey: entry.slotKey,
          text: this.compactText(entry.surfaceText || entry.canonicalText, 180),
          confidence: entry.confidence || '',
          traceState: entry.traceState || ''
        }))
      }))
    };
  }

  buildJudgeScenarioPayload(scenario) {
    return {
      title: this.compactText(scenario?.title || scenario?.case_title || scenario?.name || '', 160),
      setting: this.compactText(scenario?.setting || '', 420),
      phases: (scenario?.phases || []).map(phase => ({
        id: phase.id,
        name: this.compactText(phase.name || '', 80),
        goal: this.compactText(phase.goal || phase.description || '', 140),
        trigger: this.compactText(JSON.stringify(phase.next_phase_trigger || {}), 180)
      })),
      locations: (scenario?.locations || []).map(location => ({
        id: location.id,
        name: location.name,
        description: this.compactText(location.description, 180),
        atmosphere: this.compactText(location.atmosphere, 150),
        entry_text: this.compactText(location.entry_text, 180),
        visible_elements: (location.visible_elements || []).slice(0, 8).map(item => this.compactText(item, 50)),
        interactive_objects: (location.interactive_objects || []).slice(0, 8).map(item => this.compactText(item, 60)),
        hidden_clues: (location.hidden_clues || []).map(hiddenClue => {
          const clue = (scenario?.clues || []).find(item => item.id === hiddenClue.clue_id);
          return {
            clue_id: hiddenClue.clue_id,
            clue_name: clue?.name || hiddenClue.clue_id,
            trigger_hint: this.compactText(hiddenClue.trigger_hint, 100),
            reveal_text: this.compactText(hiddenClue.reveal_text, 120)
          };
        })
      })),
      clues: (scenario?.clues || []).map(clue => ({
        id: clue.id,
        name: clue.name,
        short_description: this.compactText(clue.short_description, 120),
        detailed_description: this.compactText(clue.detailed_description, 180),
        narrative_purpose: this.compactText(clue.narrative_purpose, 140),
        examination_hints: this.compactText(clue.examination_hints, 140),
        connections: this.compactText(JSON.stringify(clue.connections || []), 180)
      })),
      characters: (scenario?.characters || []).map(character => ({
        id: character.id,
        name: character.name,
        title: this.compactText(character.title, 80),
        appearance: this.compactText(character.appearance, 120),
        personality: this.compactText(character.personality, 140),
        speech_style: this.compactText(character.speech_style, 120),
        background: this.compactText(character.background, 200),
        secrets: (character.secrets || []).map(secret => this.compactText(secret, 100)),
        lies: (character.lies || []).map(lie => this.compactText(lie, 100)),
        relationships: Object.fromEntries(Object.entries(character.relationships || {}).map(([key, value]) => [key, this.compactText(value, 100)])),
        triggers: Object.fromEntries(Object.entries(character.triggers || {}).map(([key, value]) => [key, this.compactText(value, 120)])),
        alibi: {
          claimed: this.compactText(character.alibi?.claimed, 130),
          real: this.compactText(character.alibi?.real, 160),
          inconsistencies: this.compactText(character.alibi?.inconsistencies, 140),
          real_timeline_intersection: this.compactText(character.alibi?.real_timeline_intersection, 140)
        },
        interrogation_profile: character.interrogation_profile || {},
        psychological_profile: character.psychological_profile || {},
        gpt_instructions: this.compactText(character.gpt_instructions, 180)
      }))
    };
  }

  buildJudgeProgressPayload(gameState) {
    return {
      phase: gameState?.phase,
      totalTurns: gameState?.totalTurns || 0,
      visitedLocations: [...(gameState?.visitedLocations || [])],
      foundClues: (gameState?.foundClues || []).map(clue => ({
        id: clue.id,
        name: clue.name,
        short_description: this.compactText(clue.short_description, 100)
      })),
      summaries: Object.entries(gameState?.gptSummaries || {}).map(([key, value]) => ({
        key,
        summary: this.compactText(value, 180)
      })),
      playerNotes: (gameState?.playerNotes || []).slice(-18).map(note => ({
        type: note.type,
        title: this.compactText(note.title, 80),
        text: this.compactText(note.text, 160)
      })),
      characterStates: Object.entries(gameState?.characterStates || {}).map(([characterId, state]) => ({
        characterId,
        closureLevel: state.closureLevel,
        breakthrough: state.breakthrough,
        trust: state.trust,
        guard: state.guard,
        outwardMood: state.outwardMood,
        innerState: state.innerState,
        currentBehavior: this.compactText(state.currentBehavior, 100),
        disclosureMode: this.compactText(state.disclosureMode, 100),
        responseMode: this.compactText(state.responseMode, 100),
        lastPlayerApproach: state.lastPlayerApproach,
        lastPressureSource: this.compactText(state.lastPressureSource, 100),
        triggeredClues: state.triggeredClues || []
      })),
      loreMemory: this.buildJudgeLorePayload(gameState)
    };
  }

  buildJudgeConversationPayload(gameState) {
    return Object.entries(gameState?.conversations || {}).map(([key, messages]) => ({
      key,
      messages: (messages || []).slice(-18).map(message => ({
        role: message.role,
        senderName: this.compactText(message.senderName, 50),
        messageKind: message.messageKind || '',
        content: this.compactText(message.content, 180)
      }))
    }));
  }

  buildJudgePayload(options = {}) {
    const {
      interactionType,
      target,
      scenario,
      gameState,
      userMessage = '',
      recentMessages = [],
      candidateResponse,
      loreIntent = null
    } = options;

    const payload = {
      interactionType,
      currentTarget: target ? {
        id: target.id || null,
        name: target.name || null,
        type: interactionType === 'clue_examine' ? 'clue' : interactionType === 'character_chat' ? 'character' : 'location'
      } : null,
      userMessage: this.compactText(userMessage, 260),
      loreIntent: loreIntent ? {
        slotKey: loreIntent.slotKey,
        label: loreIntent.label,
        instruction: this.compactText(loreIntent.instruction, 180),
        confidence: loreIntent.confidence,
        epistemicTone: loreIntent.epistemicTone,
        allowGeneratedNames: Boolean(loreIntent.allowGeneratedNames),
        allowPublicTrace: Boolean(loreIntent.allowPublicTrace)
      } : null,
      candidateResponse: {
        text: this.compactText(candidateResponse?.text, 360),
        summary: this.compactText(candidateResponse?.summary, 220),
        clues_found: Array.isArray(candidateResponse?.clues_found) ? candidateResponse.clues_found.slice(0, 8) : []
      },
      currentConversation: (recentMessages || []).slice(-12).map(message => ({
        role: message.role,
        content: this.compactText(message.content, 220)
      })),
      playerProgress: this.buildJudgeProgressPayload(gameState),
      allConversations: this.buildJudgeConversationPayload(gameState),
      fullStory: this.buildJudgeScenarioPayload(scenario)
    };

    return JSON.stringify(payload, null, 2);
  }

  buildJudgeSystemPrompt() {
    return `Sen dedektif oyununda son yayınlama hakemisin. Sana tüm hikaye, oyuncunun ilerlemesi, tüm konuşma izleri, mevcut etkileşim ve aday yanıt verilecek.

GÖREVİN:
- Aday yanıt oyuncuya şu anda güvenle gösterilebilir mi karar ver.
- Tüm hikayeyi biliyorsun ama kararı yalnızca oyuncunun o ana kadarki bilgi sınırına göre ver.
- Aşağıdaki durumlarda yanıtı REDDET:
  1. Görülmemiş delil, gizli olay, ileride açılacak bilgi veya çözüm zinciri sızdırıyorsa.
  2. Karakter konuşmasında karakterin mevcut güven/baskı durumuna göre çok erken açılıyor, itiraf ediyor veya başka karakterlerin gizli iç bilgisini kullanıyorsa.
  3. Meta teknik oyun dili, prompt/meta sızıntısı veya pipeline/unlock/phase mantığı taşıyorsa.
  4. Soft-lore cevabını sert kanıt, kesin hüküm veya soruşturma kanonu gibi sunuyorsa.
  5. Hard canon ile çelişiyor ya da karakter sesi/rolü bozuluyorsa.

ONAY KRİTERİ:
- Yanıt kısa, güvenli, bağlama uygun ve mevcut bilgi sınırında kalıyorsa onay ver.
- Soft-lore varsa belirsiz, yorumsal ve ihtiyatlı tonda kalmalı.

JSON dışında hiçbir şey yazma. Çıktı şeması tam olarak şu olsun:
{
  "approved": true,
  "issues": [],
  "reason": "kısa gerekçe",
  "retry_instruction": ""
}

Kurallar:
- approved false ise retry_instruction mutlaka dolu olsun.
- issues kısa etiketler olsun: spoiler, early_disclosure, out_of_character, unsafe_lore, canon_conflict, meta_leak gibi.
- retry_instruction ana modele verilecek, kısa ve eylem odaklı bir düzeltme talimatı olsun.`;
  }

  parseJudgeVerdict(rawVerdict, interactionType, loreIntent = null) {
    const approved = Boolean(rawVerdict?.approved);
    const issues = this.normalizeJudgeIssues(rawVerdict?.issues);
    const reason = this.compactText(rawVerdict?.reason, 220);
    const retryInstruction = this.compactText(
      rawVerdict?.retry_instruction || this.getDefaultJudgeRetryInstruction(interactionType, loreIntent),
      260
    );

    return {
      approved,
      issues,
      reason,
      retryInstruction
    };
  }

  async reviewResponseWithJudge(candidateResponse, options = {}) {
    const {
      interactionType,
      target,
      scenario,
      gameState,
      userMessage = '',
      recentMessages = [],
      loreIntent = null
    } = options;

    const payload = this.buildJudgePayload({
      interactionType,
      target,
      scenario,
      gameState,
      userMessage,
      recentMessages,
      candidateResponse,
      loreIntent
    });

    const rawVerdict = await this.callJSON(
      'judge_review',
      this.buildJudgeSystemPrompt(),
      [{ role: 'user', content: payload }],
      0.2
    );

    return this.parseJudgeVerdict(rawVerdict, interactionType, loreIntent);
  }

  buildJudgeRetrySystemPrompt(baseSystemPrompt, rejectedResponse, judgeVerdict) {
    let prompt = `${baseSystemPrompt}[JUDGE GERİ BİLDİRİMİ - ZORUNLU DÜZELTME]\n`;
    prompt += `Önceki taslak kullanıcıya gösterilmedi. Aynı kullanıcı mesajına yeni bir JSON yanıt üret.\n`;
    prompt += `Reddedilen text: ${this.compactText(rejectedResponse?.text, 280)}\n`;
    if (rejectedResponse?.summary) {
      prompt += `Reddedilen summary: ${this.compactText(rejectedResponse.summary, 180)}\n`;
    }
    if (judgeVerdict?.issues?.length) {
      prompt += `Sorun etiketleri: ${judgeVerdict.issues.join(', ')}\n`;
    }
    if (judgeVerdict?.reason) {
      prompt += `Hakem gerekçesi: ${this.compactText(judgeVerdict.reason, 220)}\n`;
    }
    prompt += `Düzeltme talimatı: ${judgeVerdict?.retryInstruction || 'Yanıtı daralt, ihtiyatı artır ve güvenli bilgi sınırında kal.'}\n`;
    prompt += `Bu kez aynı ihlali tekrarlama. Daha dar, daha güvenli ve daha az kesin yaz.\n\n`;
    return prompt;
  }

  attachJudgeMetadata(response, judgeMeta = {}) {
    return {
      ...response,
      judge: {
        applied: Boolean(judgeMeta.applied),
        approved: judgeMeta.approved !== false,
        attempts: judgeMeta.attempts || 1,
        finalAction: judgeMeta.finalAction || 'approved',
        issues: this.normalizeJudgeIssues(judgeMeta.issues),
        reason: this.compactText(judgeMeta.reason, 220),
        retryInstruction: this.compactText(judgeMeta.retryInstruction, 260)
      }
    };
  }

  async generateInteractionResponse(options = {}) {
    const {
      interactionType,
      scenario,
      gameState,
      target,
      userMessage = '',
      messages = [],
      temperature = 0.7,
      allowedClueIds = []
    } = options;

    const baseSystemPrompt = this.buildSystemPrompt(interactionType, scenario, gameState, target, userMessage);
    const profile = this.getCallProfile(interactionType);
    const loreIntent = this.classifySoftLoreQuery(interactionType, target, userMessage);
    const shouldJudge = this.shouldJudgeInteraction(interactionType);
    const maxRetries = this.getJudgeRetryLimit();
    const forcedLocationClueResponse = interactionType === 'location_chat'
      ? this.buildForcedLocationClueResponse(target, scenario, userMessage, allowedClueIds)
      : null;
    const traceAttempts = [];
    let systemPrompt = baseSystemPrompt;
    let attempts = 0;
    let lastVerdict = null;

    while (attempts <= maxRetries) {
      const rawResponse = forcedLocationClueResponse && attempts === 0
        ? forcedLocationClueResponse
        : await this.call(interactionType, systemPrompt, messages, temperature);
      const finalized = this.finalizeResponse(rawResponse, {
        interactionType,
        scenario,
        gameState,
        target,
        userMessage,
        allowedClueIds
      });
      const attemptTrace = {
        attempt: attempts + 1,
        promptStage: attempts === 0 ? 'base' : 'judge_retry',
        systemPrompt: this.compactText(systemPrompt, 16000),
        rawResponse: this.buildResponseSnapshot(rawResponse),
        finalizedResponse: this.buildResponseSnapshot(finalized),
        sanitizerFallback: this.getSanitizerFallbackLabel(interactionType, target, finalized.text)
      };
      traceAttempts.push(attemptTrace);

      if (!shouldJudge) {
        const result = this.attachJudgeMetadata(finalized, {
          applied: false,
          approved: true,
          attempts: attempts + 1,
          finalAction: 'approved'
        });
        return this.attachEventTrace(result, this.buildInteractionEventTrace({
          interactionType,
          target,
          userMessage,
          loreIntent,
          allowedClueIds,
          attempts: traceAttempts,
          judgeApplied: false,
          finalAction: 'approved',
          requestMeta: {
            baseSystemPrompt,
            finalSystemPrompt: systemPrompt,
            messages,
            temperature,
            judgeEnabled: shouldJudge,
            maxRetries,
            route: {
              primaryModel: profile.model,
              fallbackModel: profile.fallbackModel || null
            }
          },
          finalResponse: result
        }));
      }

      let verdict;
      try {
        verdict = await this.reviewResponseWithJudge(finalized, {
          interactionType,
          target,
          scenario,
          gameState,
          userMessage,
          recentMessages: messages,
          loreIntent
        });
        attemptTrace.judgeVerdict = this.buildJudgeVerdictSnapshot(verdict);
      } catch (judgeError) {
        console.warn('Judge değerlendirmesi başarısız oldu:', judgeError);
        const fallbackResponse = this.attachJudgeMetadata({
          text: this.getJudgeFallbackText(interactionType, loreIntent),
          clues_found: [],
          summary: ''
        }, {
          applied: true,
          approved: false,
          attempts: attempts + 1,
          finalAction: 'fallback',
          issues: ['judge_error'],
          reason: judgeError?.message || 'Judge çağrısı tamamlanamadı.',
          retryInstruction: ''
        });
        attemptTrace.judgeVerdict = {
          approved: false,
          issues: ['judge_error'],
          reason: this.compactText(judgeError?.message || 'Judge çağrısı tamamlanamadı.', 220),
          retryInstruction: ''
        };
        return this.attachEventTrace(fallbackResponse, this.buildInteractionEventTrace({
          interactionType,
          target,
          userMessage,
          loreIntent,
          allowedClueIds,
          attempts: traceAttempts,
          judgeApplied: true,
          finalAction: 'fallback',
          requestMeta: {
            baseSystemPrompt,
            finalSystemPrompt: systemPrompt,
            messages,
            temperature,
            judgeEnabled: shouldJudge,
            maxRetries,
            route: {
              primaryModel: profile.model,
              fallbackModel: profile.fallbackModel || null
            }
          },
          finalResponse: fallbackResponse,
          judge: fallbackResponse.judge
        }));
      }

      if (verdict.approved) {
        const result = this.attachJudgeMetadata(finalized, {
          applied: true,
          approved: true,
          attempts: attempts + 1,
          finalAction: 'approved',
          issues: verdict.issues,
          reason: verdict.reason,
          retryInstruction: verdict.retryInstruction
        });
        return this.attachEventTrace(result, this.buildInteractionEventTrace({
          interactionType,
          target,
          userMessage,
          loreIntent,
          allowedClueIds,
          attempts: traceAttempts,
          judgeApplied: true,
          finalAction: 'approved',
          requestMeta: {
            baseSystemPrompt,
            finalSystemPrompt: systemPrompt,
            messages,
            temperature,
            judgeEnabled: shouldJudge,
            maxRetries,
            route: {
              primaryModel: profile.model,
              fallbackModel: profile.fallbackModel || null
            }
          },
          finalResponse: result,
          judge: result.judge
        }));
      }

      lastVerdict = verdict;
      if (attempts === maxRetries) {
        const fallbackResponse = this.attachJudgeMetadata({
          text: this.getJudgeFallbackText(interactionType, loreIntent),
          clues_found: [],
          summary: ''
        }, {
          applied: true,
          approved: false,
          attempts: attempts + 1,
          finalAction: 'fallback',
          issues: verdict.issues,
          reason: verdict.reason,
          retryInstruction: verdict.retryInstruction
        });
        return this.attachEventTrace(fallbackResponse, this.buildInteractionEventTrace({
          interactionType,
          target,
          userMessage,
          loreIntent,
          allowedClueIds,
          attempts: traceAttempts,
          judgeApplied: true,
          finalAction: 'fallback',
          requestMeta: {
            baseSystemPrompt,
            finalSystemPrompt: systemPrompt,
            messages,
            temperature,
            judgeEnabled: shouldJudge,
            maxRetries,
            route: {
              primaryModel: profile.model,
              fallbackModel: profile.fallbackModel || null
            }
          },
          finalResponse: fallbackResponse,
          judge: fallbackResponse.judge
        }));
      }

      systemPrompt = this.buildJudgeRetrySystemPrompt(baseSystemPrompt, finalized, verdict);
      attempts += 1;
    }

    const fallbackResponse = this.attachJudgeMetadata({
      text: this.getJudgeFallbackText(interactionType, loreIntent),
      clues_found: [],
      summary: ''
    }, {
      applied: true,
      approved: false,
      attempts: maxRetries + 1,
      finalAction: 'fallback',
      issues: lastVerdict?.issues,
      reason: lastVerdict?.reason,
      retryInstruction: lastVerdict?.retryInstruction
    });
    return this.attachEventTrace(fallbackResponse, this.buildInteractionEventTrace({
      interactionType,
      target,
      userMessage,
      loreIntent,
      allowedClueIds,
      attempts: traceAttempts,
      judgeApplied: true,
      finalAction: 'fallback',
      requestMeta: {
        baseSystemPrompt,
        finalSystemPrompt: systemPrompt,
        messages,
        temperature,
        judgeEnabled: shouldJudge,
        maxRetries,
        route: {
          primaryModel: profile.model,
          fallbackModel: profile.fallbackModel || null
        }
      },
      finalResponse: fallbackResponse,
      judge: fallbackResponse.judge
    }));
  }

  // ----------------------------------------------------------
  // MEKAN GİRİŞ CONTEXT'İ
  // ----------------------------------------------------------
  buildLocationEnterContext(location, scenario) {
    const shortEntry = Boolean(scenario.response_style?.short_location_entries);
    const visibleElements = Array.isArray(location.visible_elements) ? location.visible_elements : [];
    const interactiveObjects = Array.isArray(location.interactive_objects) ? location.interactive_objects : [];
    let ctx = `[MEVCUT GÖREV: MEKAN TASVİRİ]\n`;
    if (shortEntry) {
      ctx += `Oyuncu "${location.name}" mekanına giriyor. Hazır giriş metnini zaten gördü. Aynı sahneyi yeniden uzun anlatma; araştırmayı yönlendirecek somut ayrıntıları kısa ver.\n\n`;
    } else {
      ctx += `Oyuncu "${location.name}" mekanına giriyor. Mekânı atmosferik bir şekilde tasvir et.\n\n`;
    }
    ctx += `[MEKAN BİLGİLERİ]\n`;
    ctx += `Ad: ${location.name}\n`;
    ctx += `Tanım: ${this.compactText(location.description, 160)}\n`;
    ctx += `Atmosfer: ${this.compactText(location.atmosphere, 170)}\n`;
    ctx += `Hazır giriş sahnesi: ${this.compactText(location.entry_text, 180)}\n`;
    ctx += `Görünür elemanlar: ${visibleElements.slice(0, 6).map(item => this.compactText(item, 32)).join(', ')}\n\n`;
    if (interactiveObjects.length > 0) {
      ctx += `Etkileşimli nesneler: ${interactiveObjects.slice(0, 6).map(item => this.compactText(item, 42)).join(', ')}\n\n`;
    }
    ctx += `[GİZLİLİK KURALI]\nBu mekanda açılmamış deliller var. Oyuncu belirli nesneyi ayrıca araştırmadan bunların içeriğini veya başka mekana açılan sonucunu anma.\n`;

    if (location.gpt_instructions) {
      ctx += `\n[EK TALİMATLAR]\n${location.gpt_instructions}\n`;
    }

    return ctx;
  }

  // ----------------------------------------------------------
  // MEKANDA SOHBET CONTEXT'İ
  // ----------------------------------------------------------
  buildLocationChatContext(location, scenario, gameState, userMessage = '') {
    const directAnswer = Boolean(scenario.response_style?.direct_answer_first);
    const visibleElements = Array.isArray(location.visible_elements) ? location.visible_elements : [];
    const interactiveObjects = Array.isArray(location.interactive_objects) ? location.interactive_objects : [];
    let ctx = `[MEVCUT GÖREV: MEKAN ARAŞTIRMASI]\n`;
    if (directAnswer) {
      ctx += `Oyuncu "${location.name}" mekanında araştırma yapıyor. Sorunun odağına doğrudan cevap ver. İlk cümlede sonucu söyle; gerekiyorsa tek somut detay ekle.\n\n`;
    } else {
      ctx += `Oyuncu "${location.name}" mekanında araştırma yapıyor. Sorularına mekan bağlamında cevap ver.\n\n`;
    }
    ctx += `[MEKAN BİLGİLERİ]\n`;
    ctx += `Ad: ${location.name}\n`;
    ctx += `Tanım: ${this.compactText(location.description, 160)}\n`;
    ctx += `Atmosfer: ${this.compactText(location.atmosphere, 170)}\n`;
    ctx += `Hazır giriş sahnesi: ${this.compactText(location.entry_text, 180)}\n`;
    ctx += `Görünür elemanlar: ${visibleElements.slice(0, 6).map(item => this.compactText(item, 32)).join(', ')}\n`;
    if (interactiveObjects.length > 0) {
      ctx += `Etkileşimli nesneler: ${interactiveObjects.slice(0, 6).map(item => this.compactText(item, 42)).join(', ')}\n`;
    }
    ctx += `\n`;
    ctx += this.buildLocationHiddenClueContext(location, scenario, gameState, userMessage);

    // Mekan özeti
    const locSummary = gameState.gptSummaries['loc_' + location.id];
    if (locSummary) {
      ctx += `\n[BU MEKANDAKI ÖNCEKİ ARAŞTIRMA ÖZETİ]\n${this.compactText(locSummary, 180)}\n`;
    }

    if (location.gpt_instructions) {
      ctx += `\n[EK TALİMATLAR]\n${location.gpt_instructions}\n`;
    }

    return ctx;
  }

  // ----------------------------------------------------------
  // KARAKTER SOHBET CONTEXT'İ
  // ----------------------------------------------------------
  buildCharacterChatContext(character, scenario, gameState) {
    let ctx = `[MEVCUT GÖREV: KARAKTER CANLANDIRMA]\n`;
    ctx += `Sen "${character.name}" karakterini canlandırıyorsun. Onun ağzından, onun kişiliğiyle konuş.\n\n`;
    ctx += `[ROL İZOLASYONU]\n`;
    ctx += `Sadece "${character.name}" bakış açısından konuş. Diğer karakterlerin özel konuşma özetlerini veya onlara ait gizli iç bilgileri kullanma.\n\n`;

    ctx += `[KARAKTERİN PROFİLİ]\n`;
    ctx += `Ad: ${character.name}\n`;
    ctx += `Unvan: ${character.title}\n`;
    ctx += `Görünüm: ${this.compactText(character.appearance, 120)}\n`;
    ctx += `Kişilik: ${this.compactText(character.personality, 160)}\n`;
    ctx += `Konuşma tarzı: ${this.compactText(character.speech_style, 140)}\n`;
    ctx += `Arka plan: ${this.compactText(character.background, 220)}\n`;
    if (character.psychological_profile) {
      const pp = character.psychological_profile;
      ctx += `Psikoloji çekirdeği: korku ${this.compactText(pp.fears || '-', 60)}; istek ${this.compactText(pp.desires || '-', 60)}; maske ${this.compactText(pp.public_mask || '-', 55)}; baskıda ${this.compactText(pp.pressure_response || '-', 55)}; çelişki ${this.compactText(pp.core_contradiction || '-', 65)}.\n`;
      ctx += `Yalan tarzı: ${this.compactText(pp.lying_style || '-', 70)}\n`;
      ctx += `Sakladığı gizli taraf: ${this.compactText(pp.hidden_edge || '-', 70)}\n`;
    }
    ctx += `\n`;

    ctx += this.buildCharacterStateContext(character, gameState, scenario);

    ctx += `[ALİBİ BİLGİSİ]\n`;
    ctx += `İddia ettiği: ${this.compactText(character.alibi.claimed, 160)}\n`;
    ctx += `Gerçek: ${this.compactText(character.alibi.real, 220)}\n`;
    ctx += `Tutarsızlıklar: ${this.compactText(character.alibi.inconsistencies, 170)}\n\n`;
    if (character.alibi.real_timeline_intersection) {
      ctx += `[KRİTİK ZAMAN KESİŞİMİ]\n`;
      ctx += `${this.compactText(character.alibi.real_timeline_intersection, 140)}\n\n`;
    }

    ctx += `[SIRLAR - Oyuncuya kendiliginden söyleme]\n`;
    character.secrets.forEach((s, i) => { ctx += `${i + 1}. ${this.compactText(s, 100)}\n`; });

    ctx += `\n[YALAN SÖYLEDİĞİ KONULAR]\n`;
    character.lies.forEach((l, i) => { ctx += `${i + 1}. ${this.compactText(l, 100)}\n`; });

    // Tetikleyiciler
    if (Object.keys(character.triggers).length > 0) {
      ctx += `\n[TETİKLEYİCİLER - Oyuncu ipucunu konuşmada açıkça gündeme getirirse tepkin]\n`;
      for (const [clueId, reaction] of Object.entries(character.triggers)) {
        ctx += `- ${clueId}: ${this.compactText(reaction, 140)}\n`;
      }
    }

    // Diğer karakterler hakkında bilgi
    if (Object.keys(character.relationships).length > 0) {
      ctx += `\n[DİĞER KARAKTERLER HAKKINDA BİLGİN]\n`;
      for (const [charId, info] of Object.entries(character.relationships)) {
        ctx += `- ${charId}: ${this.compactText(info, 90)}\n`;
      }
    }

    // Önceki konuşma özeti
    const charSummary = gameState.gptSummaries['char_' + character.id];
    if (charSummary) {
      ctx += `\n[ÖNCEKİ KONUŞMA ÖZETİ]\n${this.compactText(charSummary, 220)}\n`;
    }

    if (character.gpt_instructions) {
      ctx += `\n[EK TALİMATLAR]\n${character.gpt_instructions}\n`;
    }

    return ctx;
  }

  // ----------------------------------------------------------
  // DANIŞMAN CONTEXT'İ
  // ----------------------------------------------------------
  buildAdvisorContext(scenario, gameState) {
    const adv = scenario.advisor;
    let ctx = `[MEVCUT GÖREV: DANIŞMAN ROLÜ]\n`;
    ctx += `Sen "${adv.name}" (${adv.title}) rolündesin.\n`;
    ctx += `Kişilik: ${adv.personality}\n\n`;
    ctx += adv.gpt_instructions + '\n\n';

    // Danışman sadece oyuncunun bildiği kadar bilir
    ctx += `[OYUNCUNUN ŞU ANA KADAR BİLDİKLERİ]\n`;
    if (gameState.foundClues.length > 0) {
      ctx += `Bulunan ipuçları:\n`;
      gameState.foundClues.slice(-8).forEach(c => {
        ctx += `- ${c.name}: ${this.compactText(c.short_description, 90)}\n`;
      });
    } else {
      ctx += `Henüz ipucu bulunmamış.\n`;
    }

    ctx += `\nZiyaret edilen mekanlar: ${[...gameState.visitedLocations].join(', ') || 'Henüz yok'}\n`;

    // Karakter notları
    const charNotes = gameState.playerNotes.filter(n => n.type === 'character');
    if (charNotes.length > 0) {
      ctx += `\nKarakter görüşme notları:\n`;
      charNotes.slice(-6).forEach(n => { ctx += `- ${n.title}: ${this.compactText(n.text, 120)}\n`; });
    }

    // Danışman özeti
    const advSummary = gameState.gptSummaries['advisor'];
    if (advSummary) {
      ctx += `\n[ÖNCEKİ DANIŞMA ÖZETİ]\n${this.compactText(advSummary, 220)}\n`;
    }

    return ctx;
  }

  // ----------------------------------------------------------
  // İPUCU İNCELEME CONTEXT'İ
  // ----------------------------------------------------------
  buildClueExamineContext(clue, scenario, gameState) {
    const directAnswer = Boolean(scenario.response_style?.direct_answer_first);
    let ctx = `[MEVCUT GÖREV: İPUCU İNCELEME]\n`;
    if (directAnswer) {
      ctx += `Oyuncu "${clue.name}" ipucunu inceliyor. Sorularına kısa, net ve doğrudan cevap ver. Önce sonucu söyle, gerekiyorsa tek destek detayı ekle.\n\n`;
    } else {
      ctx += `Oyuncu "${clue.name}" ipucunu inceliyor. Sorularına bu ipucu hakkında detaylı cevap ver.\n\n`;
    }

    ctx += `Teknik oyun dili kullanma. İpuçları arasındaki iç zinciri biliyor olsan bile oyuncuya clue ID, unlock, açılma, phase veya pipeline mantığını anlatma. Oyuncuyu ileride açılacak delil, kayıt veya aşamalara havale etme. Sadece bir dedektifin bu nesneden şu anda çıkaracağı anlamı söyle.\n\n`;

    ctx += `[İPUCU BİLGİLERİ]\n`;
    ctx += `Ad: ${clue.name}\n`;
    ctx += `Kısa tanım: ${clue.short_description}\n`;
    ctx += `Detaylı tanım: ${this.compactText(clue.detailed_description, 220)}\n`;
    ctx += `Soruşturmadaki anlamı: ${this.getClueNarrativePurpose(clue)}\n`;
    ctx += `İnceleme detayları: ${this.compactText(clue.examination_hints, 160)}\n`;

    return ctx;
  }

  // ----------------------------------------------------------
  // YÜKSEK SEVİYE METODLAR
  // ----------------------------------------------------------

  // Mekana giriş
  async enterLocation(location, scenario, gameState) {
    const systemPrompt = this.buildSystemPrompt('location_enter', scenario, gameState, location);
    const profile = this.getCallProfile('location_enter');
    const userPrompt = scenario.response_style?.short_location_entries
      ? `${location.name} mekanına girdim. Hazır giriş metni gösterildi. Tekrar etmeden kısa bir devam cevabı ver.`
      : `${location.name} mekanına giriyorum. Mekânı tasvir et.`;
    const messages = [
      { role: 'user', content: userPrompt }
    ];
    const response = await this.call('location_enter', systemPrompt, messages, this.getScenarioTemperature('location_enter', scenario, 0.8));
    const finalized = this.finalizeResponse(response, {
      interactionType: 'location_enter',
      scenario,
      gameState,
      target: location,
      userMessage: userPrompt,
      allowedClueIds: []
    });

    return this.attachEventTrace(finalized, this.buildInteractionEventTrace({
      interactionType: 'location_enter',
      target: location,
      userMessage: userPrompt,
      attempts: [{
        attempt: 1,
        promptStage: 'base',
        systemPrompt: this.compactText(systemPrompt, 16000),
        rawResponse: this.buildResponseSnapshot(response),
        finalizedResponse: this.buildResponseSnapshot(finalized),
        sanitizerFallback: this.getSanitizerFallbackLabel('location_enter', location, finalized.text)
      }],
      judgeApplied: false,
      finalAction: 'approved',
      requestMeta: {
        baseSystemPrompt: systemPrompt,
        finalSystemPrompt: systemPrompt,
        messages,
        temperature: this.getScenarioTemperature('location_enter', scenario, 0.8),
        judgeEnabled: false,
        maxRetries: 0,
        route: {
          primaryModel: profile.model,
          fallbackModel: profile.fallbackModel || null
        }
      },
      finalResponse: finalized
    }));
  }

  // Mekanda soru sorma
  async chatAtLocation(location, userMessage, scenario, gameState, recentMessages) {
    return this.generateInteractionResponse({
      interactionType: 'location_chat',
      scenario,
      gameState,
      target: location,
      userMessage,
      messages: recentMessages,
      temperature: this.getScenarioTemperature('location_chat', scenario, 0.7),
      allowedClueIds: this.getAllowedLocationClueIds(location, gameState, userMessage)
    });
  }

  // Karakterle konuşma - ilk karşılaşma
  async meetCharacter(character, scenario, gameState) {
    const userPrompt = scenario.response_style?.concise_character_intro
      ? `${character.name} ile ilk kez karşılaşıyorum. Kendini kısa tanıt ve tavrını 1-2 kısa cümlede göster.`
      : `${character.name} ile ilk kez karşılaşıyorum. Kendini tanıt ve ilk izlenimi ver.`;
    const messages = [
      { role: 'user', content: userPrompt }
    ];
    return this.generateInteractionResponse({
      interactionType: 'character_chat',
      scenario,
      gameState,
      target: character,
      userMessage: userPrompt,
      messages,
      temperature: this.getScenarioTemperature('character_chat', scenario, 0.8),
      allowedClueIds: []
    });
  }

  // Karakterle sohbet
  async chatWithCharacter(character, userMessage, scenario, gameState, recentMessages) {
    return this.generateInteractionResponse({
      interactionType: 'character_chat',
      scenario,
      gameState,
      target: character,
      userMessage,
      messages: recentMessages,
      temperature: this.getScenarioTemperature('character_chat', scenario, 0.7),
      allowedClueIds: []
    });
  }

  // Danışmana soru sorma
  async askAdvisor(userMessage, scenario, gameState, recentMessages) {
    const systemPrompt = this.buildSystemPrompt('advisor', scenario, gameState, null);
    const profile = this.getCallProfile('advisor');
    const response = await this.call('advisor', systemPrompt, recentMessages, this.getScenarioTemperature('advisor', scenario, 0.7));
    const finalized = this.finalizeResponse(response, {
      interactionType: 'advisor',
      scenario,
      gameState,
      target: null,
      userMessage,
      allowedClueIds: []
    });

    return this.attachEventTrace(finalized, this.buildInteractionEventTrace({
      interactionType: 'advisor',
      target: null,
      userMessage,
      attempts: [{
        attempt: 1,
        promptStage: 'base',
        systemPrompt: this.compactText(systemPrompt, 16000),
        rawResponse: this.buildResponseSnapshot(response),
        finalizedResponse: this.buildResponseSnapshot(finalized),
        sanitizerFallback: this.getSanitizerFallbackLabel('advisor', null, finalized.text)
      }],
      judgeApplied: false,
      finalAction: 'approved',
      requestMeta: {
        baseSystemPrompt: systemPrompt,
        finalSystemPrompt: systemPrompt,
        messages: recentMessages,
        temperature: this.getScenarioTemperature('advisor', scenario, 0.7),
        judgeEnabled: false,
        maxRetries: 0,
        route: {
          primaryModel: profile.model,
          fallbackModel: profile.fallbackModel || null
        }
      },
      finalResponse: finalized
    }));
  }

  // İpucu inceleme
  async examineClue(clue, userMessage, scenario, gameState, recentMessages) {
    return this.generateInteractionResponse({
      interactionType: 'clue_examine',
      scenario,
      gameState,
      target: clue,
      userMessage,
      messages: recentMessages,
      temperature: this.getScenarioTemperature('clue_examine', scenario, 0.7),
      allowedClueIds: []
    });
  }

  // ----------------------------------------------------------
  // ÖZET OLUŞTURMA
  // ----------------------------------------------------------

  // GPT özeti oluştur (GPT'nin kendi kullanımı için)
  async generateGPTSummary(entityType, entityId, scenario, gameState, conversationHistory) {
    const systemPrompt = `Sen bir dedektif oyununun hafıza sistemisin. Türkçe yaz.
Aşağıdaki konuşmayı özetle. Bu özet, gelecek konuşmalarda bağlam olarak kullanılacak.

ÖZETİN İÇERMESİ GEREKENLER:
- Ne soruldu, ne cevaplandı
- Ortaya çıkan önemli bilgiler
- Karakter yalanları veya tutarsızlıklar
- Bulunan ipuçları
- Oyuncunun şüphelendiği konular
- Duygusal ton ve karakter tepkileri

GÜVENLİK KURALLARI:
- Sadece konuşmada açıkça doğrulanmış bilgileri yaz.
- Açılmamış ipucu, gelecekte bulunabilecek delil, başka mekanda saklı kayıt veya model tahmini ekleme.
- clue id, unlock, phase, pipeline gibi teknik oyun dili kullanma.

KISA ve YOĞUN yaz. Maksimum 110 kelime.

Cevabını JSON formatında ver: {"text": "özet metni", "clues_found": [], "summary": ""}`;

    const transcript = this.serializeConversationHistory(conversationHistory, 12, 240);

    const messages = [
      { role: 'user', content: `Şu konuşmayı özetle:\n\n${transcript}` }
    ];

    const response = await this.call('summary_memory', systemPrompt, messages, 0.3);
    return response.text;
  }

  // Oyuncu notu oluştur (oyuncunun göreceği kısa not)
  async generatePlayerNote(entityType, entityId, entityName, conversationHistory) {
    const systemPrompt = `Sen bir dedektif oyununun not sistemisin. Türkçe yaz.
Aşağıdaki konuşmadan oyuncunun hatırlaması gereken ÖNEMLİ noktaları çıkar.

KURALLAR:
- Her önemli nokta için kısa bir başlık ve 1-2 cümle açıklama yaz
- Kronolojik sırada yaz
- Sadece ÖNEMLİ bilgileri dahil et (alibi, ipucu, tutarsızlık, yeni bilgi)
- Sıradan/önemsiz konuşmaları ATLAMA
- Sadece konuşmada açıkça doğrulanmış bilgileri yaz
- Açılmamış ipucu, ileride gidilecek mekan, gizli kayıt veya model tahmini ekleme
- Teknik oyun dili kullanma

Cevabını JSON formatında ver:
{"text": "not1_başlık: not1_açıklama\\nnot2_başlık: not2_açıklama", "clues_found": [], "summary": ""}`;

    const transcript = this.serializeConversationHistory(conversationHistory, 12, 220);

    const messages = [
      { role: 'user', content: `"${entityName}" ile ilgili konuşmadan not çıkar:\n\n${transcript}` }
    ];

    const response = await this.call('player_note', systemPrompt, messages, 0.3);
    return response.text;
  }
}
