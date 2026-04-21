// ============================================================
// ORNEK SENARYO SABLONU
// ============================================================
// Bu dosya KIRIK ISKELE ile ayni kanonik senaryo sozlesmesini izler.
// Kullanmak icin bu dosyanin bir kopyasini
// dedektif_v0.3_judge/<Hikaye Adi>/senaryo.js olarak kaydet.
//
// ONEMLI:
// - Global degisken adi SENARYO olmali.
// - Alan adlarini degistirme.
// - TODO etiketli metinleri kendi hikayene gore doldur.
// - Metinleri kisa, somut ve sorusturma odakli tut.
// - Bu sablon field-name ve section-order olarak KIRIK ISKELE ile aynidir.
// ============================================================

const SENARYO = {

  meta: {
    title: "TODO: Hikaye Basligi",
    subtitle: "TODO: Kisa alt baslik",
    theme: "TODO: Hikayenin ana temasi ve dunyasi",
    estimated_playtime: "TODO: 10-12 dakika",
    target_interactions: "TODO: 30-34",
    version: "1.0"
  },

  intro: {
    text: `TODO: Oyuncunun gorecegi acilis metni.

TODO: 2-5 kisa paragrafta olay, kurban ve ilk suphe hattini kur.

TODO: Ilk bakista ne normal gorunuyor, ama neden normal olmayabilir?

TODO: Oyuncuya gorev duygusu veren net bir kapanisla bitir.`
  },

  timeline: [
    {
      time: "16:10",
      event: "TODO: Olay oncesi ilk kritik temas"
    },
    {
      time: "19:20",
      event: "TODO: Katilin planinin ilk aktif adimi"
    },
    {
      time: "22:15",
      event: "TODO: Cesedin bulunmasi veya ilk resmi mudahale"
    }
  ],

  setting: `TODO: Hikayenin sehirleri, zamani ve temel sorusturma ekseni. 2-4 kisa paragrafta somut kal. Oyuncuya hangi aglari takip edecegini hissettir: mekan, belge, sistem, aile, para, ulasim, teknik iz gibi.`,

  response_style: {
    max_sentences: 3,
    direct_answer_first: true,
    no_player_emotion_narration: true,
    avoid_repeated_atmosphere: true,
    plain_turkish: true,
    single_paragraph_preferred: true,
    short_location_entries: true,
    concise_character_intro: true,
    temperature_overrides: {
      location_enter: 0.45,
      location_chat: 0.4,
      clue_examine: 0.4,
      character_chat: 0.55,
      advisor: 0.45
    }
  },

  gpt_base_instructions: `Sen bir dedektif oyununda hikaye anlatıcısı ve karakter canlandırıcısısın.

TEMEL KURALLAR:
1. Her zaman Türkçe konuş.
2. Her cevabı sadece şu JSON formatında ver: {"text":"...", "clues_found":[], "summary":"..."}
3. clues_found alanına sadece bu etkileşimde gerçekten açılan yeni ipucu id'lerini yaz.
4. Oyuncunun henüz bulmadığı bilgileri kendiliğinden ifşa etme.
5. Karakterler hemen çözülmesin; önce inkar etsinler, baskı artınca açılmaya başlasınlar.
6. Kısa, net ve sade yaz. Çoğu cevap 1-3 kısa cümle olsun.
7. Ortamı sadece gerekiyorsa an. Aynı atmosfer detaylarını tekrar etme.
8. Oyuncunun ne hissettiğini, ne düşündüğünü veya içinde ne uyandığını yazma.
9. Soru darsa doğrudan cevap ver. Önce sonucu söyle, gerekirse tek somut detay ekle.
10. Basit Türkçe kullan. Roman gibi yazma; metafor, iç ses ve duygusal süs ekleme.
11. Gerekmedikçe tek paragraf kullan.
12. İpuçları kendiliğinden gelmesin; oyuncu araştırmalı, kıyas yapmalı, kayıt istemeli.
13. Kimse kendi gizli suçunu kolayca söylemez. Doğru delil gösterilmeden savunma duvarı yıkılmaz.
14. Katilin kim olduğunu doğrudan açığa çıkarma; yalnızca bulunan ipuçları ve baskı düzeyi kadar bilgi ver.` ,

  // YAZIM NOTU:
  // - Bu bolumde field order'i KIRIK ISKELE ile aynidir.
  // - appearance, personality, speech_style ve background genelde 1-3 cumleyi gecmesin.
  // - psychological_profile, interrogation_profile ve current_state artik kanonik template'in parcasidir.
  // - unlock_phase ve unlock_condition ihtiyaca gore kullanilir.
  characters: [
    {
      id: "supheli_1",
      name: "TODO: Supheli 1",
      title: "TODO: Unvan",
      icon: "🧩",
      unlock_condition: {
        type: "visited_locations",
        required: ["olay_yeri"],
        description: "TODO: Hangi saha hattindan sonra bu karakter acilir?"
      },
      appearance: "TODO: Kisa gorunus tanimi.",
      psychological_profile: {
        fears: "TODO: En cok neyden korkar?",
        desires: "TODO: En cok ne ister?",
        lying_style: "TODO: Yalan soylerken ne yapar?",
        public_mask: "TODO: Disariya gosterdigi maske",
        hidden_edge: "TODO: Gizli beceri veya karanlik taraf",
        pressure_response: "TODO: Baski altinda nasil degisir?",
        core_contradiction: "TODO: Temel ic celiski"
      },
      interrogation_profile: {
        stress_response: "TODO: fragile_spill | grief_soften | stoic_withdraw | combative_leak | performative_mask | formal_bargainer",
        unlock_routes: ["TODO: evidence", "TODO: contradiction"],
        cooldown_turns: 1,
        hidden_weak_spot: "TODO: Kritik zayif nokta",
        pressure_window: "TODO: low | medium | high"
      },
      current_state: {
        outward_mood: "TODO: Disaridan nasil gorunuyor?",
        inner_state: "TODO: Iceride ne tasiyor?",
        energy: 58,
        guard: 76,
        pressure: 40,
        trust: 16,
        mask_integrity: 78,
        openness: 14
      },
      personality: "TODO: Kisa kisilik ozeti.",
      speech_style: "TODO: Kisa konusma tarzi.",
      background: "TODO: Karakterin dosyadaki yeri ve neyi sakladigi.",
      alibi: {
        claimed: "TODO: Oyuncuya anlattigi alibi",
        real: "TODO: Gercek alibi",
        inconsistencies: "TODO: Alibiyi bozan seyler",
        real_timeline_intersection: "TODO: Olay saatine gercek temas noktasi"
      },
      secrets: [
        "TODO: Sir 1",
        "TODO: Sir 2"
      ],
      lies: [
        "TODO: Yalan 1",
        "TODO: Yalan 2"
      ],
      triggers: {
        "c1": "TODO: c1 gosterilince ne olur?",
        "c6": "TODO: Adli rapor veya ikinci halka neyi degistirir?"
      },
      relationships: {
        "supheli_2": "TODO: Supheli 2 hakkinda ne dusunur?",
        "supheli_3": "TODO: Supheli 3 ile baglantisi"
      },
      gpt_instructions: "TODO: Bu karakterin role-play talimati. Delil gelmeden ana sirri acmasin."
    },
    {
      id: "supheli_2",
      name: "TODO: Supheli 2",
      title: "TODO: Unvan",
      icon: "🧪",
      unlock_phase: 2,
      unlock_condition: {
        type: "clues",
        required: ["c3"],
        description: "TODO: Hangi ipucuyla bu karakter devreye girer?"
      },
      appearance: "TODO",
      psychological_profile: {
        fears: "TODO",
        desires: "TODO",
        lying_style: "TODO",
        public_mask: "TODO",
        hidden_edge: "TODO",
        pressure_response: "TODO",
        core_contradiction: "TODO"
      },
      interrogation_profile: {
        stress_response: "TODO",
        unlock_routes: ["TODO: evidence", "TODO: return_later"],
        cooldown_turns: 1,
        hidden_weak_spot: "TODO",
        pressure_window: "TODO"
      },
      current_state: {
        outward_mood: "TODO",
        inner_state: "TODO",
        energy: 50,
        guard: 82,
        pressure: 38,
        trust: 12,
        mask_integrity: 88,
        openness: 10
      },
      personality: "TODO",
      speech_style: "TODO",
      background: "TODO",
      alibi: {
        claimed: "TODO",
        real: "TODO",
        inconsistencies: "TODO",
        real_timeline_intersection: "TODO"
      },
      secrets: ["TODO"],
      lies: ["TODO"],
      triggers: {
        "c4": "TODO",
        "c7": "TODO"
      },
      relationships: {
        "supheli_1": "TODO",
        "supheli_3": "TODO"
      },
      gpt_instructions: "TODO"
    },
    {
      id: "supheli_3",
      name: "TODO: Supheli 3 / Gercek Katil",
      title: "TODO: Unvan",
      icon: "🕯️",
      unlock_phase: 2,
      unlock_condition: {
        type: "any",
        conditions: [
          { type: "clues", required: ["c4"] },
          {
            type: "all",
            conditions: [
              { type: "clues", required: ["c5"] },
              { type: "clues", required: ["c7"] }
            ]
          }
        ],
        description: "TODO: Bu karaktere giden alternatif acilma rotalari"
      },
      appearance: "TODO",
      psychological_profile: {
        fears: "TODO",
        desires: "TODO",
        lying_style: "TODO",
        public_mask: "TODO",
        hidden_edge: "TODO",
        pressure_response: "TODO",
        core_contradiction: "TODO"
      },
      interrogation_profile: {
        stress_response: "TODO",
        unlock_routes: ["TODO: evidence", "TODO: contradiction", "TODO: return_later"],
        cooldown_turns: 2,
        hidden_weak_spot: "TODO",
        pressure_window: "TODO"
      },
      current_state: {
        outward_mood: "TODO",
        inner_state: "TODO",
        energy: 68,
        guard: 88,
        pressure: 42,
        trust: 22,
        mask_integrity: 94,
        openness: 8
      },
      personality: "TODO",
      speech_style: "TODO",
      background: "TODO: Bu karakter gercek katilse burada o bilgiyi yaz, ama oyunda erken ifsa edilmesin.",
      alibi: {
        claimed: "TODO",
        real: "TODO",
        inconsistencies: "TODO",
        real_timeline_intersection: "TODO"
      },
      secrets: ["TODO"],
      lies: ["TODO"],
      triggers: {
        "c5": "TODO",
        "c7": "TODO",
        "c8": "TODO"
      },
      relationships: {
        "supheli_1": "TODO",
        "supheli_2": "TODO"
      },
      gpt_instructions: "TODO: Katil ama bunu erken acma. Delil birikmeden cozulmesin."
    }
  ],

  // YAZIM NOTU:
  // - Bu bolumde field order'i KIRIK ISKELE ile aynidir.
  // - description, sensory_atmosphere, atmosphere ve entry_text birbirini tekrar etmesin.
  // - Her mekanda interactive_objects ve inspectables bulunsun.
  // - inspectables, yerel inceleme pipeline'i icin kanonik alan setidir.
  locations: [
    {
      id: "olay_yeri",
      name: "TODO: Olay Yeri",
      icon: "🏠",
      locked: false,
      unlock_phase: null,
      description: "TODO: Mekanin ciplak tanimi.",
      sensory_atmosphere: "TODO: Koku, ses, hava, fiziksel his.",
      atmosphere: "TODO: Daha genel sahne hissi.",
      entry_text: `TODO: Bu mekana ilk giriste oyuncunun gorecegi kisa acilis metni.`,
      interactive_objects: [
        "TODO: Incelenebilir nesne 1",
        "TODO: Incelenebilir nesne 2"
      ],
      inspectables: [
        {
          id: "olay_yeri_nesne_1",
          label: "TODO: Nesne 1 etiketi",
          tag: "TODO: nesne_1",
          aliases: ["TODO: kisa_alias"],
          inspect_text: "TODO: Ilk bakista ne goruluyor?",
          reveal_clue_id: "c1",
          reveal_text: "TODO: Yeni ipucu acildiginda gorulecek net metin.",
          repeat_text: "TODO: Tekrar bakista gosterilecek metin.",
          reveal_summary_text: "TODO: Ozet 1",
          repeat_summary_text: "TODO: Ozet tekrar 1"
        },
        {
          id: "olay_yeri_nesne_2",
          label: "TODO: Nesne 2 etiketi",
          tag: "TODO: nesne_2",
          aliases: ["TODO: alias_2"],
          inspect_text: "TODO: Bu nesne yeni ipucu vermeyebilir ama sahneyi guclendirir.",
          repeat_text: "TODO: Tekrar bakis metni.",
          no_reveal_text: "TODO: Yeni ipucu cikmiyorsa buna benzer metin yaz.",
          summary_text: "TODO: Ozet 2",
          repeat_summary_text: "TODO: Ozet tekrar 2"
        }
      ],
      visible_elements: [
        "TODO: Gorunur oge 1",
        "TODO: Gorunur oge 2"
      ],
      hidden_clues: [
        {
          clue_id: "c1",
          trigger_hint: "TODO: Oyuncu ne yaparsa bu ipucu acilir?",
          reveal_text: "TODO: Ipucu metni"
        },
        {
          clue_id: "c2",
          trigger_hint: "TODO",
          reveal_text: "TODO"
        }
      ],
      gpt_instructions: "TODO: Mekan icin ekstra sahne talimati. Kisa yazdir."
    },
    {
      id: "mekan_2",
      name: "TODO: Mekan 2",
      icon: "🏛️",
      locked: false,
      unlock_phase: null,
      unlock_condition: {
        type: "any",
        conditions: [
          { type: "clues", required: ["c1"] },
          { type: "visited_locations", required: ["olay_yeri"] }
        ],
        description: "TODO: Hangi iki alternatif rota bu mekani acar?"
      },
      description: "TODO",
      sensory_atmosphere: "TODO",
      atmosphere: "TODO",
      entry_text: `TODO`,
      interactive_objects: ["TODO: Nesne 1", "TODO: Nesne 2"],
      inspectables: [
        {
          id: "mekan_2_nesne_1",
          label: "TODO: Nesne 1",
          tag: "TODO: m2_nesne_1",
          aliases: ["TODO"],
          inspect_text: "TODO",
          reveal_clue_id: "c3",
          reveal_text: "TODO",
          repeat_text: "TODO",
          reveal_summary_text: "TODO",
          repeat_summary_text: "TODO"
        }
      ],
      visible_elements: ["TODO"],
      hidden_clues: [
        {
          clue_id: "c3",
          trigger_hint: "TODO",
          reveal_text: "TODO"
        }
      ],
      gpt_instructions: "TODO"
    },
    {
      id: "mekan_3",
      name: "TODO: Mekan 3",
      icon: "🧭",
      locked: true,
      unlock_phase: 2,
      unlock_condition: {
        type: "clues",
        required: ["c4"],
        description: "TODO: Bu mekan hangi ipucudan sonra acilir?"
      },
      description: "TODO",
      sensory_atmosphere: "TODO",
      atmosphere: "TODO",
      entry_text: `TODO`,
      interactive_objects: ["TODO", "TODO"],
      inspectables: [
        {
          id: "mekan_3_nesne_1",
          label: "TODO",
          tag: "TODO: m3_nesne_1",
          aliases: ["TODO"],
          inspect_text: "TODO",
          reveal_clue_id: "c4",
          reveal_text: "TODO",
          repeat_text: "TODO",
          reveal_summary_text: "TODO",
          repeat_summary_text: "TODO"
        },
        {
          id: "mekan_3_nesne_2",
          label: "TODO",
          tag: "TODO: m3_nesne_2",
          aliases: ["TODO"],
          inspect_text: "TODO",
          repeat_text: "TODO",
          no_reveal_text: "TODO",
          summary_text: "TODO",
          repeat_summary_text: "TODO"
        }
      ],
      visible_elements: ["TODO"],
      hidden_clues: [
        {
          clue_id: "c4",
          trigger_hint: "TODO",
          reveal_text: "TODO"
        }
      ],
      gpt_instructions: "TODO"
    },
    {
      id: "mekan_final",
      name: "TODO: Final Mekan",
      icon: "🔐",
      locked: true,
      unlock_phase: 3,
      unlock_condition: {
        type: "all",
        conditions: [
          { type: "clues", required: ["c5"] },
          { type: "phase", min_phase: 3 }
        ],
        description: "TODO: Final mekana giden son kosul zinciri"
      },
      description: "TODO",
      sensory_atmosphere: "TODO",
      atmosphere: "TODO",
      entry_text: `TODO`,
      interactive_objects: ["TODO", "TODO"],
      inspectables: [
        {
          id: "mekan_final_nesne_1",
          label: "TODO",
          tag: "TODO: final_nesne_1",
          aliases: ["TODO"],
          inspect_text: "TODO",
          reveal_clue_id: "c5",
          reveal_text: "TODO",
          repeat_text: "TODO",
          reveal_summary_text: "TODO",
          repeat_summary_text: "TODO"
        }
      ],
      visible_elements: ["TODO"],
      hidden_clues: [
        {
          clue_id: "c5",
          trigger_hint: "TODO",
          reveal_text: "TODO"
        }
      ],
      gpt_instructions: "TODO"
    }
  ],

  // YAZIM NOTU:
  // - Bu bolumde her clue item'i KIRIK ISKELE ile ayni field setini tasir.
  // - description, how_to_unlock ve narrative_purpose artik kanonik template'in parcasidir.
  clues: [
    {
      id: "c1",
      name: "TODO: Ipucu 1",
      icon: "🔎",
      tag: "TODO: kisa_etiket",
      found_in: "olay_yeri",
      short_description: "TODO",
      detailed_description: "TODO",
      description: "TODO",
      how_to_unlock: "TODO",
      narrative_purpose: "TODO",
      connections: "TODO",
      examination_hints: "TODO"
    },
    {
      id: "c2",
      name: "TODO: Ipucu 2",
      icon: "🧪",
      tag: "TODO: kisa_etiket",
      found_in: "olay_yeri",
      short_description: "TODO",
      detailed_description: "TODO",
      description: "TODO",
      how_to_unlock: "TODO",
      narrative_purpose: "TODO",
      connections: "TODO",
      examination_hints: "TODO"
    },
    {
      id: "c3",
      name: "TODO: Ipucu 3",
      icon: "📓",
      tag: "TODO: kisa_etiket",
      found_in: "mekan_2",
      short_description: "TODO",
      detailed_description: "TODO",
      description: "TODO",
      how_to_unlock: "TODO",
      narrative_purpose: "TODO",
      connections: "TODO",
      examination_hints: "TODO"
    },
    {
      id: "c4",
      name: "TODO: Ipucu 4",
      icon: "📱",
      tag: "TODO: kisa_etiket",
      found_in: "mekan_3",
      short_description: "TODO",
      detailed_description: "TODO",
      description: "TODO",
      how_to_unlock: "TODO",
      narrative_purpose: "TODO",
      connections: "TODO",
      examination_hints: "TODO"
    },
    {
      id: "c5",
      name: "TODO: Ipucu 5",
      icon: "🧬",
      tag: "TODO: kisa_etiket",
      found_in: "mekan_final",
      short_description: "TODO",
      detailed_description: "TODO",
      description: "TODO",
      how_to_unlock: "TODO",
      narrative_purpose: "TODO",
      connections: "TODO",
      examination_hints: "TODO"
    },
    {
      id: "c6",
      name: "TODO: Adli Rapor Ipucu 1",
      icon: "📋",
      tag: "TODO: kisa_etiket",
      found_in: null,
      short_description: "TODO",
      detailed_description: "TODO",
      description: "TODO",
      how_to_unlock: "TODO",
      narrative_purpose: "TODO",
      connections: "TODO",
      examination_hints: "TODO"
    },
    {
      id: "c7",
      name: "TODO: Adli Rapor Ipucu 2",
      icon: "🔬",
      tag: "TODO: kisa_etiket",
      found_in: null,
      short_description: "TODO",
      detailed_description: "TODO",
      description: "TODO",
      how_to_unlock: "TODO",
      narrative_purpose: "TODO",
      connections: "TODO",
      examination_hints: "TODO"
    },
    {
      id: "c8",
      name: "TODO: Adli Rapor Ipucu 3",
      icon: "📡",
      tag: "TODO: kisa_etiket",
      found_in: null,
      short_description: "TODO",
      detailed_description: "TODO",
      description: "TODO",
      how_to_unlock: "TODO",
      narrative_purpose: "TODO",
      connections: "TODO",
      examination_hints: "TODO"
    }
  ],

  forensic_reports: [
    {
      id: "fr1",
      name: "TODO: Rapor 1",
      icon: "🏥",
      clue_revealed: "c6",
      unlock_condition: {
        type: "clues",
        required: ["c1"],
        description: "TODO: Hangi ipucudan sonra bu rapor gelir?"
      },
      notification_text: "TODO: Bildirim metni",
      content: "TODO: Raporun oyuncuya ozet etkisi"
    },
    {
      id: "fr2",
      name: "TODO: Rapor 2",
      icon: "🔬",
      clue_revealed: "c7",
      unlock_condition: {
        type: "all",
        conditions: [
          { type: "clues", required: ["c3"] },
          { type: "phase", min_phase: 2 }
        ],
        description: "TODO: Ikinci raporun kosulu"
      },
      notification_text: "TODO: Bildirim metni",
      content: "TODO"
    },
    {
      id: "fr3",
      name: "TODO: Rapor 3",
      icon: "📡",
      clue_revealed: "c8",
      unlock_condition: {
        type: "clues",
        required: ["c5"],
        description: "TODO: Ucuncu raporun kosulu"
      },
      notification_text: "TODO: Bildirim metni",
      content: "TODO"
    }
  ],

  // ONEMLI:
  // - available_locations kumulatif olmali.
  // - next_phase_trigger artik clues ile sinirli degil; clues, visited_locations, phase, any, all kullanilabilir.
  phases: [
    {
      id: 1,
      name: "Asama 1",
      description: "TODO: Ilk hat veya ilk mekan zinciri.",
      available_locations: ["olay_yeri", "mekan_2"],
      next_phase_trigger: {
        type: "all",
        conditions: [
          { type: "clues", required: ["c1", "c3"] },
          {
            type: "any",
            conditions: [
              { type: "clues", required: ["c2"] },
              { type: "visited_locations", required: ["mekan_2"] }
            ]
          }
        ]
      }
    },
    {
      id: 2,
      name: "Asama 2",
      description: "TODO: Ikinci sorusturma halkasi.",
      available_locations: ["olay_yeri", "mekan_2", "mekan_3"],
      next_phase_trigger: {
        type: "clues",
        required: ["c4", "c5"]
      }
    },
    {
      id: 3,
      name: "Asama 3",
      description: "TODO: Final asamasi.",
      available_locations: ["olay_yeri", "mekan_2", "mekan_3", "mekan_final"]
    }
  ],

  advisor: {
    name: "TODO: Danisman Adi",
    title: "TODO: Danisman Unvani",
    icon: "🎖️",
    personality: "TODO: Kisa ve yonlendirici bir danisman tarifi.",
    gpt_instructions: `Oyuncuya katili veya tam cozumu verme. Sadece bulunan delillere bakarak bir sonraki mantikli boslugu isaret et. Kisa ve net konus.`,
    hints: [
      { condition: "c1 yok", text: "TODO: Erken asama yonlendirmesi" },
      { condition: "c4 yok", text: "TODO: Orta asama yonlendirmesi" },
      { condition: "c7 yok", text: "TODO: Gec asama yonlendirmesi" },
      { condition: "c8 yok", text: "TODO: Finale giderken son yonlendirme" }
    ]
  },

  accusation: {
    intro_text: "TODO: Suclama ekraninin giris metni.",
    confirm_text: "TODO: Oyuncuya son onay sorusu.",
    required_clues: ["TODO: c4", "TODO: c7", "TODO: c8"]
  },

  solution: {
    culprit_id: "supheli_3",
    fatal_flaw: "TODO: Katilin yapip da hesaba katmadigi temel hata.",
    timeline_reconstruction: [
      "TODO: Olay orgusunun 1. adimi",
      "TODO: Olay orgusunun 2. adimi",
      "TODO: Olay orgusunun 3. adimi"
    ],
    full_reveal: "TODO: Dogru suclamada gosterilecek final metni.",
    wrong_accusation: {
      text: "TODO: Yanlis suclama baslik metni",
      missed_info: "TODO: Hangi bilgi kacirildi?",
      real_story: "TODO: Gercek olay orgusu"
    }
  }

};

window.SENARYO = SENARYO;
