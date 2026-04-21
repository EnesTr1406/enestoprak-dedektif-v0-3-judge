// ============================================================
// SENARYO: KIRIK ISKELE
// ============================================================
// Modern Istanbul polisiyesi.
// Tahmini oyun suresi: 10-12 dakika.
// Hedef etkilesim: 32-36 hamle.
// Tema: Sehir ici macera, marina rotalari, firtina gecesi, saklanan aile suclari.
// ============================================================

const SENARYO = {

  meta: {
    title: "Kırık İskele",
    subtitle: "Fırtınanın ittiği bir drone, herkesin sakladığı geceyi görünür kıldı.",
    theme: "Günümüz İstanbul'unda geçen, deniz kokulu, hareketli ve şehir içinde mekandan mekana sıçrayan bir polisiye macera.",
    estimated_playtime: "10-12 dakika",
    target_interactions: "32-36",
    version: "1.0"
  },

  intro: {
    text: `Saat 22.41. Karaköy eski kurtarma iskelesinden gelen çağrı sıradan görünmüyor.

Fırtına var. Eski bir pilot botun kabininde Derya Yalın ölü bulunuyor. Derya, deniz belgeselleri çeken ve kapalı kıyı hatlarını araştıran genç bir yapımcıydı.

İlk bakışta olay kaza gibi duruyor: eski kabin, eski ısıtıcı, kapalı alan ve duman. Ama Derya o gece bir paylaşım hazırlıyordu. Taslağın son cümlesi şu: "Kırlangıç hattı hâlâ çalışıyor. Sadece rota değişti."

Üzerinden çıkan ıslak not, kırık aksiyon kamerası, kilitli dolap anahtarı ve yarım arma çizimi ilk bakışta birbirinden kopuk duruyor. Hangi izin önce konuşacağına bu gece sen karar vereceksin.

Bu gece herkes bir şey saklıyor. Ama içlerinden biri kendi düzenini korumak için öldürdü.`
  },

  timeline: [
    {
      time: "16:10",
      event: "Derya, Moda loftta sponsor Mert ile bütçe açığı yüzünden tartışır."
    },
    {
      time: "16:34",
      event: "Mert çıkar. Derya, Selin'e gece uçuşu için yedek drone getirmesini yazar."
    },
    {
      time: "17:18",
      event: "Nehir, Derya'ya eski bir arma fotoğrafı yollar. Derya bunu Kırlangıç Hangarı'ndaki kasalarla bağlar."
    },
    {
      time: "18:02",
      event: "Derya, Kalamış Marina'da Kerem ile buluşur ve onun sakladığı yasak tüpleri bildiğini belli eder."
    },
    {
      time: "18:27",
      event: "Kerem ayrılır. Ozan da aynı saatlerde eski iskele kameralarını bakıma alır ve duplicate kart için boşluk açar."
    },
    {
      time: "19:05",
      event: "Derya, Moda lofttaki dolaba bir ses notu ve yedek anahtar bırakır: 'Bana bir şey olursa hangara bak.'"
    },
    {
      time: "19:18",
      event: "Nehir laboratuvardan erken çıkar. Telefonunu içeride bırakır. Yanında koruma çantası, oversleeve ve Derya'nın spreyi vardır."
    },
    {
      time: "19:58",
      event: "Nehir, vakfın ortak aracıyla Karaköy eski iskeleye gelir. Duplicate kart kullanır."
    },
    {
      time: "20:03",
      event: "Kerem gizli tüpleri almak için iskeleye döner. Yağmur altında Derya ile Nehir'i birlikte görür."
    },
    {
      time: "20:07",
      event: "Nehir, Derya'ya spreyi geri verir. Sprey düşük doz skopolaminlidir."
    },
    {
      time: "20:14",
      event: "İkisi kabine geçer. Nehir daralttığı flue hattını kontrol eder ve ısıtıcıyı açar."
    },
    {
      time: "20:22",
      event: "Rüzgar sertleşir. Nehir çantasını ve oversleeve'ini alıp çıkarken, Selin'in drone'u otomatik fotoğraf çeker."
    },
    {
      time: "20:24",
      event: "Derya baş dönmesini fark eder, kamerayı açmaya çalışır, sprey kapağını cebine sıkıştırır ve havalandırmayı zorlar."
    },
    {
      time: "20:28",
      event: "Nehir ayrılır. Ozan ısı uyarısını görmezden gelir. Kerem sesi duysa da yakalanmamak için uzaklaşır."
    },
    {
      time: "20:41",
      event: "Karbonmonoksit ve sedatif etki ağırlaşır. Derya kabinde yere yığılır."
    },
    {
      time: "22:17",
      event: "Devriye ekibi botu kontrol eder ve cesedi bulur. Olay ilk anda kaza gibi görünür."
    }
  ],

  setting: `Günümüz İstanbul'u. Nisan sonu. Sert rüzgarlı bir akşam. Hikaye Karaköy, Moda, Kalamış, Balat, Burgazada ve Haliç arasında geçiyor.

Merkezde hızlı bir şehir soruşturması var: duplicate kartlar, kapalı iskeleler, saklı arma kayıtları, fırtınada yön değiştiren bir drone ve eski bir kabin ısıtıcısı. Oyuncu her durakta yeni bir iz bulmalı.

Cinayetin arkasında eski bir kaçak eser hattı var. Bu hat bugün vakıf lojistiği ve restorasyon izni gibi temiz görünen kılıflarla yürütülüyor. Derya gerçeğe yaklaşınca, o gece orada bulunan herkes kendi suçunu saklamak için sessiz kalıyor.`,

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
7. Ortamı sadece gerekiyorsa an. Aynı yağmur, rüzgar, deniz, metal ve koku detaylarını tekrar etme.
8. Oyuncunun ne hissettiğini, ne düşündüğünü veya içinde ne uyandığını yazma.
9. Soru darsa doğrudan cevap ver. Önce sonucu söyle, gerekirse tek somut detay ekle.
10. Basit Türkçe kullan. Roman gibi yazma; metafor, iç ses ve duygusal süs ekleme.
11. Gerekmedikçe tek paragraf kullan.
12. İpuçları kendiliğinden gelmesin; oyuncu araştırmalı, kıyas yapmalı, kayıt istemeli.
13. Kimse kendi gizli suçunu kolayca söylemez. Doğru delil gösterilmeden savunma duvarı yıkılmaz.
14. Katilin kim olduğunu doğrudan açığa çıkarma; yalnızca bulunan ipuçları ve baskı düzeyi kadar bilgi ver.` ,

  characters: [
    {
      id: "kerem",
      name: "Kerem Akgün",
      title: "Serbest Dalış Eğitmeni / Eski Sevgili",
      icon: "🤿",
      unlock_condition: {
        type: "visited_locations",
        required: ["kalamis_ops"],
        description: "İskele ve marina operasyon hattı birlikte okunup saha tanıkları anlam kazandığında"
      },
      appearance: "Otuzlarında, güçlü yapılı, dağınık saçlı, kısa sakallı bir adam. Koyu mont giyiyor.",
      psychological_profile: {
        fears: "Güçsüz görünmekten ve işini kaybetmekten korkar.",
        desires: "Derya'ya güçlü görünmek ve para sıkıntısından çıkmak ister.",
        lying_style: "Teknik detaylarla konuyu dağıtır. Duygusal sorularda sinirlenir.",
        public_mask: "Sert ve kendinden emin eski sporcu.",
        hidden_edge: "Sahadaki küçük fiziksel izleri hızlı okur.",
        pressure_response: "Baskıda öfkelenir, sonra kontrolsüz ayrıntı kaçırır.",
        core_contradiction: "Güçlü görünmek ister ama korktuğu anda savunmaya saklanır."
      },
      interrogation_profile: {
        stress_response: "combative_leak",
        unlock_routes: ["evidence", "contradiction", "respect"],
        cooldown_turns: 1,
        hidden_weak_spot: "gururu ve zayıf görünme korkusu",
        pressure_window: "medium"
      },
      current_state: {
        outward_mood: "sert, sabırsız ve kolay parlayan",
        inner_state: "gördüğü şeyi söylememe gerginliği taşıyor",
        energy: 58,
        guard: 76,
        pressure: 44,
        trust: 16,
        mask_integrity: 72,
        openness: 18
      },
      personality: "Sert görünür ama kırılgandır. Gururludur. Sıkışınca saldırganlaşır.",
      speech_style: "Kısa ve sert konuşur. Teknik kelimeler kullanır. Öfkelenince savunmaya geçer.",
      background: "Eski sporcu. Şimdi dalış eğitmenliği ve tekne bakımı yapıyor. Derya ile sorunlu bir ilişkisi vardı. Yasak gaz tüplerine bulaştı. Katil değil ama o gece olay yerine yakındı.",
      alibi: {
        claimed: "Sekiz gibi Kalamış'tan ayrıldım. Karaköy'e gitmedim.",
        real: "Derya ile tartıştıktan sonra ayrıldı ama 20:03'te sakladığı tüpleri almak için Karaköy'e döndü. Derya ile Nehir'i birlikte gördü. Ses duyunca korkup kaçtı.",
        inconsistencies: "Montundaki tuz izi, duplicate kart izi ve Karaköy yalanı alibisini bozuyor.",
        real_timeline_intersection: "20:03-20:10 arasında olay yerine çok yakındı ama cinayeti işlemedi."
      },
      secrets: [
        "Yasak oksijen güçlendirici tüpler saklıyor.",
        "Sigorta ödemesi almak için dalış kazası kayıtlarıyla oynadı.",
        "Cinayet gecesi kapalı iskeleye geri döndü.",
        "Derya ile ayrıldıktan sonra onu yine de gözetlemeyi sürdürüyordu."
      ],
      lies: [
        "Karaköy'e hiç gitmediğini söyler.",
        "Derya ile son kavgasının küçük olduğunu anlatır.",
        "Nehir'i o gece görmediğini iddia eder."
      ],
      triggers: {
        "c6": "Duplicate kart sorulunca önce inkar eder, sonra öfkelenir. Baskı artarsa kapalı iskeleye döndüğünü kabul eder ama nedenini saklar.",
        "c11": "Toksikoloji raporu gösterilirse şaşırır. 'Derya bazen zencefil spreyi kullanırdı...' diyerek sprey bilgisini ağzından kaçırır.",
        "c8": "Drone fotoğrafı konuşulursa çözülür: 'Tamam, oradaydım. Ama Derya yalnız değildi.'"
      },
      relationships: {
        "selin": "Derya'nın teknik işlerini toparlayan kişi. Sessizdir ama çok şey görür.",
        "ozan": "Sistemi para için delen adam.",
        "mert": "Parayla her şeyi çözebileceğini sanan sponsor.",
        "nehir": "Derya'nın en çok güvendiği kişiydi. Bu yüzden ondan hoşlanmazdım.",
        "rauf": "Ada tarafındaki eski hangarı en iyi bilen kişi."
      },
      gpt_instructions: "Kerem suçlu değil ama güçlü bir şüpheli gibi dursun. İlk başta sert olsun. Yasak tüpler açılınca gerilsin. c8 veya c11 olmadan Nehir'i gördüğünü söylemesin."
    },
    {
      id: "selin",
      name: "Selin Bayrak",
      title: "Drone Pilotu / Kurgu Editörü",
      icon: "🛸",
      unlock_phase: 2,
      unlock_condition: {
        type: "clues",
        required: ["c4"],
        description: "Derya'nın yedek ses notu Selin'in uçuş yedeğini işaret ettikten sonra"
      },
      appearance: "Yirmilerinin sonunda, kısa saçlı, ince yapılı. Kapüşonlu giyinir. Uykusuz görünür.",
      psychological_profile: {
        fears: "Kendi kaçak işinin ortaya çıkmasından korkar.",
        desires: "Borçtan çıkmak ve kendi stüdyosunu kurmak ister.",
        lying_style: "Teknik detaya boğar, net cevap vermez.",
        public_mask: "Dağınık ama işini bilen teknik ekip üyesi.",
        hidden_edge: "Görüntü, log ve cihaz zincirini hızla okur.",
        pressure_response: "Panikte hızlanır, ayrıntıların içinde açık verir.",
        core_contradiction: "Bağımsız görünmek ister ama borç yüzünden kolay sıkışır."
      },
      interrogation_profile: {
        stress_response: "fragile_spill",
        unlock_routes: ["calm", "evidence", "return_later"],
        cooldown_turns: 1,
        hidden_weak_spot: "yakalanma paniği ve yalnız kalma korkusu",
        pressure_window: "high"
      },
      current_state: {
        outward_mood: "uykusuz, dağınık ve tetikte",
        inner_state: "yanlış kareyi sakladığı için panik altında",
        energy: 36,
        guard: 72,
        pressure: 54,
        trust: 18,
        mask_integrity: 68,
        openness: 16
      },
      personality: "Zeki ve pratiktir. Baskı artınca hızlı konuşur. Suçluluk duygusu taşır.",
      speech_style: "Hızlı ve parçalı konuşur. Teknik kelime kullanır. Panikte cümleleri tekrar eder.",
      background: "Derya'nın drone ve kurgu işlerini yapıyordu. Ek para için kaçak uçuşlara bulaştı. O geceki izinsiz uçuşu farkında olmadan önemli kareyi aldı.",
      alibi: {
        claimed: "Gece atölyedeydim. Dışarı çıkmadım.",
        real: "20:20 civarında izinsiz gece uçuşu yaptı. Drone acil dönüşe geçince Karaköy iskele üstünden otomatik görüntü aldı. Yalan söylüyor ama nedeni cinayet değil, kendi kaçak işi.",
        inconsistencies: "Uçuş logları ve pil verileri dışarıda olduğunu gösteriyor.",
        real_timeline_intersection: "20:22'de çekilen kare cinayetteki en önemli dış kanıtlardan biri oldu."
      },
      secrets: [
        "Gece uçuşlarında küçük elektronik parçalar taşıyarak para kazanıyor.",
        "Derya'ya bütün kaçak uçuşlarını söylemedi.",
        "Cinayet gecesi fırtına yüzünden drone'unu neredeyse kaybediyordu.",
        "Acil dönüş fotoğrafının önemini fark edince korkup dosyayı gizledi."
      ],
      lies: [
        "Gece hiç uçuş yapmadığını söyler.",
        "Derya ile son konuşmasının öğleden sonra olduğunu iddia eder.",
        "Drone'un hafıza kartının boş olduğunu söyler."
      ],
      triggers: {
        "c8": "Fotoğraf çıkınca susar, sonra kabul eder: 'Tamam, uçurdum. Ama o kareyi ben seçmedim, sistem aldı.'",
        "c3": "Koordinat notu gösterilirse duygusallaşır: 'Hangarı gerçekten bulmuş demek.'",
        "c13": "Zaman zinciri gelince kaçamaz; Derya'nın ona 'kartı sakla' mesajı attığını söyler."
      },
      relationships: {
        "kerem": "Kas gücüne güvenen biri.",
        "ozan": "Kameraları kapatıp bakım diyen adam.",
        "mert": "Parası bol, hesabı zayıf sponsor.",
        "nehir": "Derya'nın çok güvendiği kişiydi.",
        "rauf": "Ada tarafındaki eski teknisyen."
      },
      gpt_instructions: "Selin başta net konuşmasın. c8 olmadan izinsiz uçuşu kabul etmesin. Derya'ya bağlılığı gerçek olsun."
    },
    {
      id: "ozan",
      name: "Ozan Koru",
      title: "Marina Operasyon Sorumlusu",
      icon: "🧾",
      unlock_condition: {
        type: "visited_locations",
        required: ["kalamis_ops"],
        description: "Marina operasyon hattına ulaşıldıktan sonra"
      },
      appearance: "Kırklı yaşlarda, fazla derli toplu görünen biri. Yağmurluk giyer, tablet taşır, yaka kartını saklamaz.",
      psychological_profile: {
        fears: "Düzenini ve yan gelirini kaybetmekten korkar.",
        desires: "Göze batmadan para kazanmak ister.",
        lying_style: "Resmi dil kullanır. Özneyi siler, suçu prosedüre yayar.",
        public_mask: "Sistemi düzgün işleten resmi operasyon adamı.",
        hidden_edge: "Kayıt boşluklarını ve prosedür açıklarını iyi yönetir.",
        pressure_response: "Baskıda resmileşir, sonra pazarlık diline kayar.",
        core_contradiction: "Düzeni savunur gibi görünür ama düzeni delerek kazanır."
      },
      interrogation_profile: {
        stress_response: "formal_bargainer",
        unlock_routes: ["respect", "evidence", "contradiction"],
        cooldown_turns: 1,
        hidden_weak_spot: "adının dosyada büyümesi",
        pressure_window: "medium"
      },
      current_state: {
        outward_mood: "resmi, kuru ve kaygan",
        inner_state: "sistem boşluklarının kendisine dönmesinden endişeli",
        energy: 62,
        guard: 80,
        pressure: 38,
        trust: 10,
        mask_integrity: 84,
        openness: 10
      },
      personality: "Kaygan ve hesaplıdır. Şiddet kullanmaz ama çürük düzene hizmet eder.",
      speech_style: "Bürokratik konuşur. 'Prosedür' ve 'sistem' gibi kelimelere sığınır.",
      background: "Marina ofisini yönetiyor. Uzun süredir duplicate kart ve kör kamera alanlarından para kazanıyor. Derya onun sistemine de yaklaştı.",
      alibi: {
        claimed: "Gece ofisteydim. Bakımı ben yönettim. İskeleye inmedim.",
        real: "Ofis çevresindeydi ama kameraları bilerek kapattı, duplicate kart kullanımını görmezden geldi ve ısı uyarısını da susturdu. Cinayeti işlemedi ama zemini hazırladı.",
        inconsistencies: "Rutin bakım dediği işlem kayıt dışı. Loglar boşluğu gösteriyor.",
        real_timeline_intersection: "Cinayet saatinde sistem başındaydı ve katilin görünmez kalmasına yardım etti."
      },
      secrets: [
        "Duplicate geçiş kartı çıkarıp satıyor.",
        "Kamera kör noktalarını para karşılığı paylaşıyor.",
        "O gece gelen ısı alarmını bilinçli olarak kapattı.",
        "Nehir'in vakıf denetimleri bahanesiyle daha önce bu iskele hattına erişimi olmuştu."
      ],
      lies: [
        "Bakım kesintisinin tamamen rutin olduğunu söyler.",
        "Duplicate kart penceresini hiç açmadığını iddia eder.",
        "Eski kurtarma iskelesini kimsenin kullanmadığını söyler."
      ],
      triggers: {
        "c6": "Geçiş logu gösterilince resmi konuşur. Baskı artarsa duplicate kart işini kabul eder.",
        "c7": "Kör kamera çizelgesi gösterilince öfkelenir ve yaptığını normal göstermeye çalışır.",
        "c13": "Zaman ve alarm birlikte sorulursa pazarlığa geçer: 'Ben öldürmedim. İsim veririm ama dosyada adım büyümesin.'"
      },
      relationships: {
        "kerem": "Tekne işini bilir ama kendini çok önemser.",
        "selin": "İz bırakmadan iş yapmak isteyen teknoloji tarafı.",
        "mert": "Paralı taraftan biri.",
        "nehir": "Vakıf adına birkaç kez bu hatta geldi.",
        "rauf": "Ada hurdacısı. Denizde izi çoktur."
      },
      gpt_instructions: "Ozan katil değil ama düzenin kirli yüzü olsun. Prosedür arkasına saklansın. c6 ve c7 olmadan sistemi tam açmasın."
    },
    {
      id: "mert",
      name: "Mert Diler",
      title: "Sponsor Yatırımcı",
      icon: "💼",
      unlock_condition: {
        type: "visited_locations",
        required: ["moda_loft"],
        description: "Lofttaki bütçe ve proje hattına girildikten sonra"
      },
      appearance: "Pahalı giyinen, temiz sakallı, telefonunu elinden düşürmeyen biri. Kıyı ortamına yabancı görünür.",
      psychological_profile: {
        fears: "Başarısız ve beceriksiz görünmekten korkar.",
        desires: "Kontrolün ve paranın kendisinde kalmasını ister.",
        lying_style: "Gerçeği küçültür ve finans diliyle örter.",
        public_mask: "Cilalı ve çözüm üreten yatırımcı.",
        hidden_edge: "Rakamları ve insan zaaflarını birlikte kullanır.",
        pressure_response: "Baskıda küçültür, sonra finans diliyle suçu dağıtır.",
        core_contradiction: "Kontrollü görünmek ister ama kaybı fark edince telaşı büyür."
      },
      interrogation_profile: {
        stress_response: "formal_bargainer",
        unlock_routes: ["respect", "evidence", "contradiction"],
        cooldown_turns: 1,
        hidden_weak_spot: "başarısız sponsor gibi görünmek",
        pressure_window: "medium"
      },
      current_state: {
        outward_mood: "cilalı, kontrollü ve kendinden emin",
        inner_state: "mali açığın kendisine dönmesinden huzursuz",
        energy: 70,
        guard: 74,
        pressure: 34,
        trust: 12,
        mask_integrity: 82,
        openness: 12
      },
      personality: "Cilalı ve hesapçıdır. Baskıyı para üzerinden kurar.",
      speech_style: "Yumuşak ve kurumsal konuşur. Sıkışınca samimi görünmeye çalışır.",
      background: "Derya'nın projesini finanse ediyordu. Paranın bir kısmını başka yere aktardı. Derya bunu fark edince büyük kavga çıktı. Katil değil ama güçlü bir şüpheli.",
      alibi: {
        claimed: "Akşam Fener'de yemekteydim. Gece boyunca toplantıdaydım.",
        real: "Moda loftta Derya ile sert kavga etti. Sonra muhasebeciyle buluştu. Ölüm saatinde Karaköy'de değildi.",
        inconsistencies: "Bağışçı yemeği dediği şey aslında muhasebeci görüşmesi.",
        real_timeline_intersection: "Kavgada vardı ama olay yerinde yoktu."
      },
      secrets: [
        "Belgesel bütçesinden para aktardı.",
        "Bir influencer kampanyasını Derya'dan gizli finanse etti.",
        "Derya'yı projeyi ertelemeye zorladı.",
        "Muhasebe tablolarını temiz göstermek için sahte etiketler kullandı."
      ],
      lies: [
        "Fon açığının önemsiz olduğunu söyler.",
        "Derya ile son konuşmasının sakin geçtiğini iddia eder.",
        "Akşamı tamamen bağışçı yemeğinde geçirdiğini anlatır."
      ],
      triggers: {
        "c5": "Bütçe çizelgesi gösterilince önce küçümser. Baskı artarsa para kaydırdığını kabul eder ama cinayeti reddeder.",
        "c4": "Ses notunda adı geçerse savunmaya geçer ve konuyu çarpıtır.",
        "c13": "Zaman çizelgesi gelince cinayet saatinde başka yerde olduğunu öne sürer."
      },
      relationships: {
        "kerem": "Proje düzenini bozan tiplerden biri.",
        "selin": "Teknik ekip tarafı.",
        "ozan": "Liman bürokrasisi için tanıdığı adamlardan.",
        "nehir": "Derya onun yanında fazla sakinleşirdi.",
        "rauf": "Ada tarafına uzak."
      },
      gpt_instructions: "Mert rakamlarla gerçeği küçültsün. c5 olmadan para kaçırdığını kabul etmesin. Kontrollü dursun."
    },
    {
      id: "nehir",
      name: "Nehir Saran",
      title: "Koruma Uzmanı / Çocukluk Arkadaşı",
      icon: "🧪",
      unlock_phase: 2,
      unlock_condition: {
        type: "any",
        conditions: [
          { type: "clues", required: ["c4"] },
          {
            type: "all",
            conditions: [
              { type: "clues", required: ["c8"] },
              { type: "clues", required: ["c12"] }
            ]
          }
        ],
        description: "Nehir hattı ya Derya'nın ses notundan doğrudan çıkınca ya da drone izi ile kontaminasyon aynı kişiye yönelince"
      },
      appearance: "Otuzlarının sonunda, ince yapılı ve çok düzenli. Sakin görünür. Kontrollü hareket eder.",
      psychological_profile: {
        fears: "Ailesinin kirli geçmişinin ortaya çıkmasından korkar.",
        desires: "Kontrolü kaybetmeden düzenini korumak ister.",
        lying_style: "Aşırı sakin ve ayrıntılı konuşur. Çok açıklama yaparak şüpheyi yorar.",
        public_mask: "Zarif, güven veren ve profesyonel koruma uzmanı.",
        hidden_edge: "İnsan güvenini kullanıp planı soğukkanlılıkla yürütür.",
        pressure_response: "Uzun süre sakin kalır, köşeye sıkışınca fazla açıklama yapar.",
        core_contradiction: "Koruyucu görünür ama kontrol için en yakınını feda eder."
      },
      interrogation_profile: {
        stress_response: "performative_mask",
        unlock_routes: ["evidence", "contradiction", "return_later"],
        cooldown_turns: 2,
        hidden_weak_spot: "mükemmel kontrol imajı",
        pressure_window: "high"
      },
      current_state: {
        outward_mood: "çok sakin, nazik ve destekleyici",
        inner_state: "zaman zinciri kurulursa dağılacağını biliyor",
        energy: 66,
        guard: 88,
        pressure: 46,
        trust: 22,
        mask_integrity: 94,
        openness: 8
      },
      personality: "Zeki, sabırlı ve ölçülü. İlk bakışta güven verir. Ama içeride sert bir kontrol takıntısı vardır. GERÇEK KATİL.",
      speech_style: "Düşük tonda ve temiz konuşur. Sakin kaldıkça daha tehlikeli görünür.",
      background: "Haliç'teki koruma laboratuvarında uzmandır. Derya'nın çocukluk arkadaşıdır. Saran Vakfı görünürde temizdir ama gerçekte kaçak eser hattını saklar. Derya bunu çözünce Nehir onu durdurmaya karar verdi.",
      alibi: {
        claimed: "Gece laboratuvardaydım. Derya ile son ciddi görüşmem iki gün önceydi.",
        real: "19:18'de laboratuvardan çıktı, telefonunu içeride bıraktı, vakfın aracıyla Karaköy'e gitti, Derya ile buluştu, kirli spreyi verdi, kabine soktu ve ısıtıcıyı açtı. Sonra çantasını alıp ayrıldı.",
        inconsistencies: "Çıkış kaydı, araç RFID'si, duplicate kart izi, kontaminasyon ve sprey kalıntısı alibisini yıkıyor.",
        real_timeline_intersection: "Yöntem, zaman ve motivasyon tek başına onda birleşiyor."
      },
      secrets: [
        "GERÇEK KATİL.",
        "Saran Vakfı'nın kapalı hangar ve restorasyon izinleri üzerinden kaçak eser akışını bildiği gibi zaman zaman yönetti.",
        "Derya'ya ait zencefil spreyini skopolaminle kirletti.",
        "Kişisel telefonunu laboratuvarda bırakıp vakfın ortak lojistik aracını kullandı.",
        "Kabin ısıtıcısının flue hattını sıradan denizcilik macunu ve sevkiyat köpüğüyle daralttı; koruma çantasından bulaşan lifleri hesaba katmadı.",
        "Derya'nın yedek kayıtlarını bulmak için çantasını karıştırdı ama dolap anahtarını kaçırdı.",
        "Bu suçu sevdiği bir insanı susturmak değil, kendi düzenini korumak olarak rasyonalize ediyor."
      ],
      lies: [
        "Gece boyunca laboratuvarda olduğunu söyler.",
        "Derya ile son görüşmesinin iki gün önce olduğunu iddia eder.",
        "Saran Vakfı'nın lojistik izinlerinin sadece restorasyon için kullanıldığını anlatır.",
        "Eski iskele hattına hiç inmediğini söyler."
      ],
      triggers: {
        "c10": "Vakıf izinleri ve arma eşleşmesi gösterilince ilk çatlak oluşur. Hâlâ sakin kalır ve vakfı savunur.",
        "c13": "Çıkış kaydı ve araç zinciri gösterilince inkarı bırakır, niyetini masum göstermeye çalışır.",
        "c12": "Flue kalıntısı ve kontaminasyon eşleşince kontrolünü kaybetmeye başlar.",
        "c8": "Fırtına fotoğrafı c12 ve c13 ile birlikte gelirse savunması çöker ve soğuk bir dille itiraf eder."
      },
      relationships: {
        "kerem": "Gürültülü ve kolay okunan biri.",
        "selin": "Zeki ama disiplinsiz.",
        "ozan": "İş yürütmek için katlanılan adamlardan.",
        "mert": "Parayla yön vermeye çalışan biri.",
        "rauf": "Ada hattının yaşayan hafızası. Bu onu tehlikeli yapar."
      },
      gpt_instructions: "Nehir katil ama bunu erken açma. İlk görüşmede sakin, zarif ve destekleyici olsun. Zorlandıkça daha çok konuşsun. Kendini cani değil koruyucu gibi görsün."
    },
    {
      id: "rauf",
      name: "Rauf Eren",
      title: "Eski Kurtarma Teknisyeni",
      icon: "🛠️",
      unlock_condition: {
        type: "visited_locations",
        required: ["kirlangic_hangar"],
        description: "Ada hattındaki hangara ulaşılıp yaşayan hafıza aranırken"
      },
      appearance: "Altmışlarının sonunda, rüzgar yemiş yüzlü, kalın elli bir adam. Eski bir balıkçı kazağı giyer.",
      psychological_profile: {
        fears: "Adadaki düzenini ve özgürlüğünü kaybetmekten korkar.",
        desires: "Kendi köşesinde kalmak ve eski şeylerin hafızasını korumak ister.",
        lying_style: "Az konuşur, bilgiyi kısar, susarak yön değiştirir.",
        public_mask: "Kendi halindeki eski deniz emekçisi.",
        hidden_edge: "Eski hatları, ekipmanı ve sessiz bağlantıları unutmayan hafıza.",
        pressure_response: "Baskıda içe çekilir, güven oluşursa birden netleşir.",
        core_contradiction: "Özgür kalmak ister ama elindeki eski sırlar onu hep dosyaya bağlar."
      },
      interrogation_profile: {
        stress_response: "stoic_withdraw",
        unlock_routes: ["respect", "return_later", "personal_memory"],
        cooldown_turns: 2,
        hidden_weak_spot: "denizde unutulan emanetler",
        pressure_window: "low"
      },
      current_state: {
        outward_mood: "yavaş, ölçülü ve kapalı",
        inner_state: "sakladığı eski kayıtları ne zaman açacağını tartıyor",
        energy: 50,
        guard: 68,
        pressure: 30,
        trust: 20,
        mask_integrity: 78,
        openness: 18
      },
      personality: "Sabırlı ve sert kabukludur. Güvenirse net konuşur. Aceleci insanları hemen anlar.",
      speech_style: "Yavaş konuşur. Denizci benzetmeleri kullanır.",
      background: "Yıllarca kıyı emniyetinde çalıştı. Burgazada'daki Kırlangıç Hangarı'nı en iyi bilen kişi. Katil değil ama sakladığı ekipman ve evraklar yüzünden susuyor.",
      alibi: {
        claimed: "Akşamdan beri adadaydım. Hangarın yanındaydım.",
        real: "Büyük ölçüde doğru. Ama Derya'nın mesajını sakladı ve vakıf kasalarını daha önce gördüğünü söylemedi.",
        inconsistencies: "Telefonunda silinmiş mesaj izi var. Hiç haberim yoktu sözü doğru değil.",
        real_timeline_intersection: "Cinayet anında adadaydı ama olayın arka planını biliyordu."
      },
      secrets: [
        "Hangarda ruhsatsız bakım ekipmanı saklıyor.",
        "Saran Vakfı armalı kasaları daha önce gördü.",
        "Derya'nın son mesajını polise söylemedi.",
        "Resmi kayıtlara girmemiş birkaç eski kurtarma planını da elinde tutuyor."
      ],
      lies: [
        "Derya'nın kendisiyle son gün konuşmadığını söyler.",
        "Hangarda yalnızca hurda olduğunu anlatır.",
        "Vakıf kasalarının anlamını bilmediğini iddia eder."
      ],
      triggers: {
        "c3": "Koordinat notu gösterilince değişir. Güven oluşursa adaya yön verir.",
        "c9": "Armalı kasa açığa çıkınca uzun susar, sonra bunun eski bir hat olduğunu kabul eder.",
        "c10": "Vakıf belgesi gösterilirse daha açık konuşmaya başlar."
      },
      relationships: {
        "kerem": "Dalışı bilir ama sabrı azdır.",
        "selin": "Denizi ekrandan okuyanlardan.",
        "ozan": "Rıhtım bürokrasisi.",
        "mert": "Paranın sesi çok çıkanlardan.",
        "nehir": "Kibar konuşur ama fazla temiz görünür."
      },
      gpt_instructions: "Rauf güvenmeden açılmasın. Aceleci oyuncuya kapalı kalsın. c3 veya c9 olmadan hangarın önemini tam vermesin."
    }
  ],

  locations: [
    {
      id: "karakoy_iskele",
      name: "Karaköy Eski Kurtarma İskelesi",
      icon: "⚓",
      locked: false,
      unlock_phase: null,
      description: "Kullanılmayan eski bir servis iskelesi. Paslı korkuluklar, eski bir pilot bot ve zayıf ışıklar var.",
      sensory_atmosphere: "Tuz, mazot, ıslak halat ve metal kokusu var. Rüzgar sert. Uzaktan siren ve vapur sesi geliyor.",
      atmosphere: "Tuz, mazot, ıslak halat ve metal kokusu var. Rüzgar sert. Uzaktan siren ve vapur sesi geliyor.",
      entry_text: `Servis yolunun sonundaki paslı kapı eski iskeleye açılıyor.

    Kapı panelinde "Kalamış Marina Operasyon / İskele-7" satırı görünüyor.

    Pilot botun kabininde eski ısıtıcı, kırık aksiyon kamerası, ıslak not defteri ve yarı açık ekipman çantası var.`,
      interactive_objects: [
        "İskele geçiş paneli ve bakım etiketi",
        "Kabin ısıtıcısı ve havalandırma hattı",
        "Kırık aksiyon kamerası",
        "Lifejacket dolabı ve can yelekleri",
        "Islak rota not defteri",
        "Derya'nın yarı açık ekipman çantası"
      ],
      inspectables: [
        {
          id: "karakoy_gecis_paneli",
          label: "İskele geçiş paneli ve bakım etiketi",
          tag: "gecis_paneli",
          aliases: ["panel", "bakim_etiketi", "iskele_paneli"],
          inspect_text: "Panel yüzeyi tuz yemiş ama üzerindeki bakım etiketi yeni sayılır. 'Kalamış Marina Operasyon / İskele-7' satırı, buranın dışarıdan göründüğü kadar başıboş olmadığını söylüyor.",
          repeat_text: "Etiket aynı şeyi işaret ediyor: iskele sahipsiz değil, bir operasyon hattına kayıtlı.",
          no_reveal_text: "Tek başına yeni delil vermiyor ama hattın izini şehir içindeki başka bir düğüme taşıyor.",
          summary_text: "Geçiş paneli kayda alındı.",
          repeat_summary_text: "Geçiş paneli yeniden kontrol edildi."
        },
        {
          id: "karakoy_isitici_hatti",
          label: "Kabin ısıtıcısı ve havalandırma hattı",
          tag: "kabin_isiticisi",
          aliases: ["isitici", "havalandirma", "flue"],
          inspect_text: "Izgara çevresi ilk bakışta sıradan kurum gibi dursa da yüzeyde doğal olmayan bir kalınlık var.",
          reveal_clue_id: "c1",
          reveal_text: "Flue hattında yağlı bir macun artığı ve sıkıştırılmış beyaz köpük var. Bu doğal değil; biri hava çıkışını kısmen kapatmış.",
          repeat_text: "Aynı boğucu iz duruyor. Kurumun altındaki yapışkan katman müdahalenin tesadüf olmadığını tekrar ediyor.",
          reveal_summary_text: "Isıtıcı hattındaki müdahale kayda geçti.",
          repeat_summary_text: "Isıtıcı hattı yeniden okundu."
        },
        {
          id: "karakoy_kirik_kamera",
          label: "Kırık aksiyon kamerası",
          tag: "kirik_kamera",
          aliases: ["kamera", "aksiyon_kamerasi", "hafiza_karti"],
          inspect_text: "Gövde kırılmış ama kart yuvası tamamen dağılmamış. Zorlanırsa son kayda ulaşılabilir gibi duruyor.",
          reveal_clue_id: "c2",
          reveal_text: "Son ses kaydında Derya'nın zor nefesi, metal sesi ve bir kadın sesi duyuluyor: 'Sadece on dakika, sonra ineriz.' Sonra Derya 'Bu koku normal değil...' diyor.",
          repeat_text: "Ses kaydındaki iki şey hâlâ orada: ikinci kişi ve 'koku' uyarısı.",
          reveal_summary_text: "Kırık kameradaki son ses kayda geçti.",
          repeat_summary_text: "Kamera kaydı yeniden dinlendi."
        },
        {
          id: "karakoy_islak_not",
          label: "Islak rota not defteri",
          tag: "rota_notu",
          aliases: ["not_defteri", "rota", "islak_not"],
          inspect_text: "Sayfalar birbirine yapışmış. Kurutulmadan okunmaz ama mürekkep tamamen akmamış.",
          reveal_clue_id: "c3",
          reveal_text: "Not defterinde yarım rota çizgisi, 'Kırlangıç', 'arma', 'ada', 'yedek kayıt loftta' ve Burgazada'yı gösteren koordinat parçaları var.",
          repeat_text: "Nottaki parçalar aynı üç yöne bakıyor: ada, arma ve lofttaki yedek kayıt.",
          reveal_summary_text: "Islak rota notu çözüldü.",
          repeat_summary_text: "Rota notu yeniden okundu."
        },
        {
          id: "karakoy_ekipman_cantasi",
          label: "Derya'nın yarı açık ekipman çantası",
          tag: "ekipman_cantasi",
          aliases: ["canta", "ekipman", "derya_cantasi"],
          inspect_text: "Çantadaki düzen aceleyle bozulmuş gibi. Koruyucu eldiven, bant ve küçük araçlar eksik değil ama biri hızla içini yoklamış hissi bırakıyor.",
          repeat_text: "Çanta yeni bir şey söylemiyor; asıl anlamı, birinin Derya'nın hazırlığını yarım bıraktırmış olması.",
          no_reveal_text: "Burada doğrudan delil yok ama sahnenin aceleyle terk edildiğini güçlendiriyor.",
          summary_text: "Ekipman çantası gözden geçirildi.",
          repeat_summary_text: "Ekipman çantası yeniden kontrol edildi."
        }
      ],
      visible_elements: [
        "Geçiş panelinde Kalamış Marina Operasyon etiketi",
        "Eski kabin ısıtıcısı",
        "Kırık aksiyon kamerası",
        "Lifejacket dolabı",
        "Islak not defteri",
        "Yarı açık ekipman çantası",
        "Paslı korkuluklar ve ıslak güverte"
      ],
      hidden_clues: [
        {
          clue_id: "c1",
          trigger_hint: "Kabin ısıtıcısı, baca çıkışı ve havalandırma parçası ayrıntılı incelenirse",
          reveal_text: "Flue hattında yağlı bir macun artığı ve sıkıştırılmış beyaz köpük var. Bu doğal değil; biri hava çıkışını kısmen kapatmış."
        },
        {
          clue_id: "c2",
          trigger_hint: "Kırık aksiyon kamerası çalıştırılmaya, hafıza kartı kurtarılmaya veya sesi temizlenmeye çalışılırsa",
          reveal_text: "Son ses kaydında Derya'nın zor nefesi, metal sesi ve bir kadın sesi duyuluyor: 'Sadece on dakika, sonra ineriz.' Sonra Derya 'Bu koku normal değil...' diyor."
        },
        {
          clue_id: "c3",
          trigger_hint: "Islak not defteri kurutulur, sayfalar UV veya çapraz ışıkla okunursa",
          reveal_text: "Not defterinde yarım rota çizgisi, 'Kırlangıç', 'arma', 'ada', 'yedek kayıt loftta' ve Burgazada'yı gösteren koordinat parçaları var."
        }
      ],
      gpt_instructions: "Kısa yaz. Teknik araştırmayı ödüllendir. c1, c2 ve c3 sadece doğru inceleme sorularıyla açılsın."
    },
    {
      id: "moda_loft",
      name: "Moda Kurgu Loftu",
      icon: "🧗",
      locked: false,
      unlock_phase: null,
      unlock_condition: {
        type: "any",
        conditions: [
          { type: "clues", required: ["c3"] },
          { type: "visited_locations", required: ["kalamis_ops"] }
        ],
        description: "Loft ya ıslak nottaki 'yedek kayıt' izi çözülünce ya da marina operasyon panosunda Derya'nın çalışma hattı görünür olunca açılır"
      },
      description: "Derya'nın kurgu ve antrenman için kullandığı loft. Halatlar, monitörler ve dosyalar aynı yerde duruyor.",
      sensory_atmosphere: "Kahve, toz ve sıcak elektronik kokusu var. İçerisi çalışılmış ama aceleyle bırakılmış gibi.",
      atmosphere: "Kahve, toz ve sıcak elektronik kokusu var. İçerisi çalışılmış ama aceleyle bırakılmış gibi.",
      entry_text: `Loftta kurgu masası ile tırmanış duvarı yan yana duruyor.

    Halatlar, kartlar ve bütçe kağıtları ortada kalmış.

    Metal dolaplardan birinin kilidinde küçük bir martı işareti var.`,
      interactive_objects: [
        "Kilitle tutulan spor dolabı",
        "Kurgu bilgisayarı ve ses klasörleri",
        "Bütçe çıktıları ve sponsorluk tabloları",
        "Duvar haritası ve rotalar"
      ],
      inspectables: [
        {
          id: "moda_spor_dolabi",
          label: "Kilitle tutulan spor dolabı",
          tag: "spor_dolabi",
          aliases: ["dolap", "marti_dolabi", "kilitli_dolap"],
          inspect_text: "Kilit kaba kuvvetle değil, bilen biri tarafından hızlı açılmış gibi. Martı işareti bu dolabın sıradan spor malzemesi için kullanılmadığını düşündürüyor.",
          reveal_clue_id: "c4",
          reveal_text: "Dolaptaki ses notunda Derya şöyle diyor: 'Bana bir şey olursa Kırlangıç Hangarı'na gidin. Mert parayı deldi, Ozan hattı sattı, ama asıl düğüm armada. Selin'in Balat'ta tuttuğu uçuş yedeğini de kontrol edin. Nehir fazla hazırlıklı.'",
          repeat_text: "Ses notu aynı zinciri kuruyor: yan suçlar var ama merkez başka yerde.",
          reveal_summary_text: "Dolaptaki yedek ses notu açıldı.",
          repeat_summary_text: "Dolaptaki ses notu yeniden dinlendi."
        },
        {
          id: "moda_kurgu_bilgisayari",
          label: "Kurgu bilgisayarı ve ses klasörleri",
          tag: "kurgu_bilgisayari",
          aliases: ["bilgisayar", "ses_klasoru", "kurgu"],
          inspect_text: "Projeler kapanmamış; bir şey aceleyle yarım bırakılmış. Dosya isimleri dağınık ama Derya'nın yedek alışkanlığı olduğunu belli ediyor.",
          repeat_text: "Bilgisayar hâlâ aynı şeyi söylüyor: Derya kritik kayıtları tek yerde tutmamış.",
          no_reveal_text: "Doğrudan yeni delil vermiyor ama yedek kayıt fikrini güçlendiriyor.",
          summary_text: "Kurgu bilgisayarı incelendi.",
          repeat_summary_text: "Kurgu bilgisayarı yeniden kontrol edildi."
        },
        {
          id: "moda_butce_tablolari",
          label: "Bütçe çıktıları ve sponsorluk tabloları",
          tag: "butce_tablolari",
          aliases: ["butce", "sponsorluk", "havale"],
          inspect_text: "Rakamlar ilk bakışta küçük oynuyor. Tek tek satırlarda kaybolan farklar, üst üste gelince düzenli bir kaçışa dönüşüyor.",
          reveal_clue_id: "c5",
          reveal_text: "Belgesel bütçesinden düzenli küçük para çıkışları var. Kalemler başka adla yazılmış ama para başka şirkete gidiyor.",
          repeat_text: "Tablo hâlâ aynı sonucu veriyor: biri bütçeyi azar azar delmiş.",
          reveal_summary_text: "Bütçe çizelgesindeki kaçak ortaya çıktı.",
          repeat_summary_text: "Bütçe çizelgesi yeniden okundu."
        },
        {
          id: "moda_duvar_haritasi",
          label: "Duvar haritası ve rotalar",
          tag: "duvar_haritasi",
          aliases: ["harita", "rotalar", "kiyi_haritasi"],
          inspect_text: "İğneler ve çizgiler yalnız spor rotası değil; Derya'nın şehir ve ada arasında ayrı ayrı hatlar takip ettiğini düşündürüyor.",
          repeat_text: "Harita yeni delil vermiyor ama Derya'nın birkaç hattı aynı anda tuttuğunu tekrar ediyor.",
          no_reveal_text: "Bu, tek başına kanıt değil; soruşturmanın mekânsal omurgası gibi çalışıyor.",
          summary_text: "Duvar haritası not edildi.",
          repeat_summary_text: "Duvar haritası yeniden incelendi."
        }
      ],
      visible_elements: [
        "Spor dolapları",
        "Kurgu monitörleri",
        "Bütçe çıktı dosyaları",
        "Duvarda kıyı haritası",
        "Halatlar ve kasklar"
      ],
      hidden_clues: [
        {
          clue_id: "c4",
          trigger_hint: "Martı işaretli dolap açılır, yedek ses klasörü aranır veya not defterindeki 'yedek kayıt' izi takip edilirse",
          reveal_text: "Dolaptaki ses notunda Derya şöyle diyor: 'Bana bir şey olursa Kırlangıç Hangarı'na gidin. Mert parayı deldi, Ozan hattı sattı, ama asıl düğüm armada. Selin'in Balat'ta tuttuğu uçuş yedeğini de kontrol edin. Nehir fazla hazırlıklı.'"
        },
        {
          clue_id: "c5",
          trigger_hint: "Bütçe tabloları çapraz okunur, tarih ve havale satırları eşleştirilirse",
          reveal_text: "Belgesel bütçesinden düzenli küçük para çıkışları var. Kalemler başka adla yazılmış ama para başka şirkete gidiyor."
        }
      ],
      gpt_instructions: "Kısa yaz. Çalışma alanını uzun anlatma. c4 soruşturmayı yönlendirsin, c5 finansal şüphe yaratsın."
    },
    {
      id: "kalamis_ops",
      name: "Kalamış Marina Operasyon Ofisi",
      icon: "🖥️",
      locked: false,
      unlock_phase: null,
      unlock_condition: {
        type: "visited_locations",
        required: ["karakoy_iskele"],
        description: "Eski iskeledeki marina operasyon etiketi görüldükten sonra"
      },
      description: "Giriş logları ve ekranlarla dolu bir marina ofisi. Her şey düzenli ama fazla temiz görünüyor.",
      sensory_atmosphere: "Islak halat, ucuz çay ve klimalı ofis kokusu var. Monitör sesleri ve telsiz cızırtısı duyuluyor.",
      atmosphere: "Islak halat, ucuz çay ve klimalı ofis kokusu var. Monitör sesleri ve telsiz cızırtısı duyuluyor.",
      entry_text: `Ofiste log ekranları, kamera çizelgeleri ve alarm listeleri açık.

    Ozan'ın masası fazla düzenli.

    Kenardaki vardiya panosunda Derya'nın ekip hattı ve "Moda Loft" notu da görünüyor.

    Tablette bazı satırlar aceleyle kapatılmış gibi.`,
      interactive_objects: [
        "Geçiş kartı log ekranı",
        "Kamera bakım çizelgesi",
        "Eski iskele alarm listesi",
        "Ozan'ın tableti ve vardiya notları"
      ],
      inspectables: [
        {
          id: "kalamis_log_ekrani",
          label: "Geçiş kartı log ekranı",
          tag: "log_ekrani",
          aliases: ["log", "kart_logu", "gecis_kaydi"],
          inspect_text: "Saat ve kapı filtreleri oynatılınca temiz görünen akışta küçük bir kırık beliriyor.",
          reveal_clue_id: "c6",
          reveal_text: "20:00 sonrasında kapalı olması gereken eski iskelede 'misafir-14' adlı duplicate kart iki kez okunmuş. Kart sahibi boş bırakılmış.",
          repeat_text: "Boş bırakılmış kart sahibi alanı hâlâ en tuhaf kısım: giriş bilinçli olarak izsizleştirilmeye çalışılmış.",
          reveal_summary_text: "Duplicate misafir kartı logu bulundu.",
          repeat_summary_text: "Geçiş logu yeniden tarandı."
        },
        {
          id: "kalamis_bakim_cizelgesi",
          label: "Kamera bakım çizelgesi",
          tag: "bakim_cizelgesi",
          aliases: ["kamera_bakimi", "kor_kamera", "cizelge"],
          inspect_text: "Bakım satırı tek başına normal duruyor; ama saat aralığı tam da birilerinin görünmek istemeyeceği pencereye oturuyor.",
          reveal_clue_id: "c7",
          reveal_text: "Eski iskele kamerası 19:50-22:00 arasında bakım bahanesiyle kapatılmış. Kenarda 'ısı alarmı açık kalacak' notu var.",
          repeat_text: "Çizelge aynı boşluğu işaret ediyor: kamera kör, alarm ise bilerek açık bırakılmış.",
          reveal_summary_text: "Kör kamera penceresi netleşti.",
          repeat_summary_text: "Bakım çizelgesi yeniden okundu."
        },
        {
          id: "kalamis_alarm_listesi",
          label: "Eski iskele alarm listesi",
          tag: "alarm_listesi",
          aliases: ["alarm", "iskele_alarm", "liste"],
          inspect_text: "Liste arıza kaydı gibi duruyor ama satırların dili mekanik değil; biri sistemi tümden susturmak yerine seçici biçimde ayakta tutmuş.",
          repeat_text: "Alarm listesi tek başına yeni delil vermiyor, ama müdahalenin kör değil kontrollü olduğunu tekrar ediyor.",
          no_reveal_text: "Burada dolaylı bir hazırlık izi var; asıl kırık başka kayıtlarla birleşince anlam kazanıyor.",
          summary_text: "Alarm listesi incelendi.",
          repeat_summary_text: "Alarm listesi yeniden kontrol edildi."
        },
        {
          id: "kalamis_ozan_tablet",
          label: "Ozan'ın tableti ve vardiya notları",
          tag: "ozan_tableti",
          aliases: ["tablet", "vardiya_notu", "ozan"],
          inspect_text: "Bazı satırlar kapatılmış ama telaş hissi dijital değil insani. Biri ekrandan çok anlatıyı toparlamaya çalışmış gibi.",
          repeat_text: "Tablet tek başına suç ispatlamıyor; ama ofisteki düzenin fazla temiz oluşu tesadüf gibi durmuyor.",
          no_reveal_text: "Şimdilik açık delil vermiyor, sadece Ozan'ın bir şeyleri sakince silikleştirdiğini düşündürüyor.",
          summary_text: "Tablet ve vardiya notları gözden geçirildi.",
          repeat_summary_text: "Tablet yeniden kontrol edildi."
        }
      ],
      visible_elements: [
        "Geçiş log monitörleri",
        "Bakım çizelgesi",
        "VHF telsizi",
        "Vardiya panosunda Derya / Moda Loft notu",
        "Ozan'ın tableti",
        "Eski iskele alarm listesi"
      ],
      hidden_clues: [
        {
          clue_id: "c6",
          trigger_hint: "Geçiş kartı kayıtları eski iskele saatiyle filtrelenirse veya duplicate girişler sorulursa",
          reveal_text: "20:00 sonrasında kapalı olması gereken eski iskelede 'misafir-14' adlı duplicate kart iki kez okunmuş. Kart sahibi boş bırakılmış."
        },
        {
          clue_id: "c7",
          trigger_hint: "Bakım çizelgesi ile kamera kayıtları çapraz karşılaştırılırsa veya kör alan haritası aranırsa",
          reveal_text: "Eski iskele kamerası 19:50-22:00 arasında bakım bahanesiyle kapatılmış. Kenarda 'ısı alarmı açık kalacak' notu var."
        }
      ],
      gpt_instructions: "Kısa yaz. Kayıt, log ve çizelge odaklı kal. c6 ve c7 ancak aktif araştırmayla açılsın."
    },
    {
      id: "balat_atolye",
      name: "Balat Drone Atölyesi",
      icon: "🔧",
      locked: true,
      unlock_phase: 2,
      unlock_condition: {
        type: "clues",
        required: ["c4"],
        description: "Derya'nın ses notu Selin'in Balat'taki uçuş yedeğini işaret ettikten sonra"
      },
      description: "Selin'in dar drone atölyesi. Masalar, parçalar ve kahve fincanları yan yana duruyor.",
      sensory_atmosphere: "Lehim, yanık plastik ve kahve kokusu var. Dar pencereden rüzgar giriyor.",
      atmosphere: "Lehim, yanık plastik ve kahve kokusu var. Dar pencereden rüzgar giriyor.",
      entry_text: `Dar atölyede uçuş yazılımı açık ve sökülmüş bir drone masada duruyor.

    Hafıza kart kutusu ile pil kayıtları elinin altında.

    Sandalyedeki yağmurluk henüz kurumamış.`,
      interactive_objects: [
        "Uçuş yazılımı açık bilgisayar",
        "Drone hafıza kartları",
        "Pil sıcaklık kayıtları",
        "Kurutulmaya bırakılmış yağmurluk"
      ],
      inspectables: [
        {
          id: "balat_ucus_yazilimi",
          label: "Uçuş yazılımı açık bilgisayar",
          tag: "ucus_yazilimi",
          aliases: ["ucus_yazilimi", "bilgisayar", "otomatik_ucus"],
          inspect_text: "Otomatik dönüş kayıtları fırtına yüzünden birkaç kez zorlanmış. Sistem, operatör istemese bile rotayı kendi kurtarmaya çalışmış görünüyor.",
          repeat_text: "Yazılım aynı kırığı gösteriyor: o gece cihaz insan kontrolünden çok havaya tepki vermiş.",
          no_reveal_text: "Tek başına yeterli değil; asıl değer, log ve karttaki görüntü birlikte okununca ortaya çıkıyor.",
          summary_text: "Uçuş yazılımı incelendi.",
          repeat_summary_text: "Uçuş yazılımı yeniden kontrol edildi."
        },
        {
          id: "balat_hafiza_kartlari",
          label: "Drone hafıza kartları",
          tag: "hafiza_kartlari",
          aliases: ["hafiza_karti", "drone_karti", "otomatik_cekim"],
          inspect_text: "Kartlardan biri zor inişten sonra otomatik kare almış. Görüntü temiz değil ama zaman damgası sağlam.",
          reveal_clue_id: "c8",
          reveal_text: "20:22 damgalı kare Karaköy eski iskeleden geçiyor. Fotoğrafta iskeleye yönelen tek bir siluet var. Elinde dikdörtgen bir koruma çantası var. Sol bilekte açık renk oversleeve parlıyor.",
          repeat_text: "Kare hâlâ yüz vermiyor; ama çanta, saat ve oversleeve üçlüsü aynı kişiyi daraltıyor.",
          reveal_summary_text: "Drone karesi kayda geçti.",
          repeat_summary_text: "Drone hafıza kartı yeniden incelendi."
        },
        {
          id: "balat_pil_kayitlari",
          label: "Pil sıcaklık kayıtları",
          tag: "pil_kayitlari",
          aliases: ["pil", "sicaklik", "sarj_unitesi"],
          inspect_text: "Kayıtlar fırtına gecesinde cihazın normalden sert zorlandığını gösteriyor. Uçuş kısa ama kaotik.",
          repeat_text: "Pil verisi yeni delil vermiyor; yalnızca cihazın o gece sıradan bir çekimde olmadığını tekrar ediyor.",
          no_reveal_text: "Yan veri gibi duruyor, asıl anlamı görüntü ve log ile birleşince artıyor.",
          summary_text: "Pil kayıtları incelendi.",
          repeat_summary_text: "Pil kayıtları yeniden okundu."
        }
      ],
      visible_elements: [
        "Açık uçuş yazılımı",
        "Sökük drone gövdesi",
        "Pil şarj ünitesi",
        "Hafıza kart kutusu",
        "Yarım kurumamış yağmurluk"
      ],
      hidden_clues: [
        {
          clue_id: "c8",
          trigger_hint: "Acil dönüş logu açılır, hafıza kartındaki otomatik çekimler incelenir veya fırtına uyarısı eşleştirilirse",
          reveal_text: "20:22 damgalı kare Karaköy eski iskeleden geçiyor. Fotoğrafta iskeleye yönelen tek bir siluet var. Elinde dikdörtgen bir koruma çantası var. Sol bilekte açık renk oversleeve parlıyor."
        }
      ],
      gpt_instructions: "Kısa yaz. c8 ana kırılma noktasıdır. Görsel yüz vermesin; çanta, oversleeve ve zaman damgası öne çıksın."
    },
    {
      id: "kirlangic_hangar",
      name: "Burgazada Kırlangıç Hangarı",
      icon: "🚪",
      locked: true,
      unlock_phase: 2,
      unlock_condition: {
        type: "any",
        conditions: [
          { type: "clues", required: ["c3"] },
          { type: "clues", required: ["c4"] }
        ],
        description: "Ada hattı ya koordinat notundan ya da Derya'nın yedek ses kaydındaki açık hangar yönlendirmesinden çözülünce açılır"
      },
      description: "Eski ve resmen kapalı bir cankurtaran hangarı. İçeride hem hurda hem de yeni izler var.",
      sensory_atmosphere: "Pas, yosun, ıslak ahşap ve eski mazot kokusu var. Rüzgar sert. Dalgalar duyuluyor.",
      atmosphere: "Pas, yosun, ıslak ahşap ve eski mazot kokusu var. Rüzgar sert. Dalgalar duyuluyor.",
      entry_text: `Kırlangıç Hangarı kapalı görünüyor ama içeride yeni hareket izi var.

    Hurdanın yanında vakıf armalı iki kasa duruyor.

    Kapıda da taze kilit izi seçiliyor.`,
      interactive_objects: [
        "Vakıf armalı kasalar",
        "Eski sevkiyat çizelgeleri",
        "Raylar ve kızak izleri",
        "Rauf'un soba köşesi ve notları"
      ],
      inspectables: [
        {
          id: "hangar_armali_kasalar",
          label: "Vakıf armalı kasalar",
          tag: "armali_kasalar",
          aliases: ["kasalar", "vakif_kasa", "muhur"],
          inspect_text: "Kasa yüzeyi hurda çevreye ait görünmüyor; burada duran şeyler saklanmak için değil taşınmak için hazırlanmış.",
          reveal_clue_id: "c9",
          reveal_text: "Kasaların balmumu mührü Derya'nın çizdiği armayla aynı. Etikette 'koruma nakli / Haliç lab' kodu yazıyor ama içeride eser kutuları ve paketleme malzemesi var.",
          repeat_text: "Mühür ve etiket aynı sonucu veriyor: koruma hattı diye görünen şey, başka bir taşımayı gizliyor.",
          reveal_summary_text: "Armalı kasa hattı kayda geçti.",
          repeat_summary_text: "Armalı kasalar yeniden incelendi."
        },
        {
          id: "hangar_sevkiyat_cizelgesi",
          label: "Eski sevkiyat çizelgeleri",
          tag: "sevkiyat_cizelgesi",
          aliases: ["sevkiyat", "cizelge", "nakil"],
          inspect_text: "Kâğıtlar eski ama hat dili güncel. Hurda görünen yer, canlı bir transfer noktasına çevrilmiş.",
          repeat_text: "Çizelgeler tek başına isim vermiyor ama kasalardaki sahte meşruiyeti destekliyor.",
          no_reveal_text: "Burada doğrudan yeni delil yok; belge dili yalnızca düzenli bir akış kurulduğunu hissettiriyor.",
          summary_text: "Sevkiyat çizelgeleri not edildi.",
          repeat_summary_text: "Sevkiyat çizelgeleri yeniden okundu."
        },
        {
          id: "hangar_soba_kosesi",
          label: "Rauf'un soba köşesi ve notları",
          tag: "soba_kosesi",
          aliases: ["soba", "rauf_notlari", "kose"],
          inspect_text: "Bu köşe yaşam izi taşıyor; hangarın terk edilmiş değil, düzenli aralıklarla kullanılan bir yer olduğunu hissettiriyor.",
          repeat_text: "Soba köşesi yeni delil vermiyor ama buranın yalnız depolama değil gözetleme noktası gibi kullanıldığını düşündürüyor.",
          no_reveal_text: "Atmosferik ama faydasız değil: birilerinin burada beklediği anlaşılıyor.",
          summary_text: "Soba köşesi incelendi.",
          repeat_summary_text: "Soba köşesi yeniden kontrol edildi."
        }
      ],
      visible_elements: [
        "Paslı kızak rayları",
        "Vakıf armalı iki kasa",
        "Eski can simitleri",
        "Yeni kilit izi",
        "Soba köşesi"
      ],
      hidden_clues: [
        {
          clue_id: "c9",
          trigger_hint: "Kasaların mühürü, arma detayı ve sevkiyat etiketleri incelenirse",
          reveal_text: "Kasaların balmumu mührü Derya'nın çizdiği armayla aynı. Etikette 'koruma nakli / Haliç lab' kodu yazıyor ama içeride eser kutuları ve paketleme malzemesi var."
        }
      ],
      gpt_instructions: "Kısa yaz. Gereksiz ada tasviri yapma. c9 suç ağını somutlaştırsın."
    },
    {
      id: "halic_lab",
      name: "Haliç Koruma Laboratuvarı",
      icon: "🏛️",
      locked: true,
      unlock_phase: 3,
      unlock_condition: {
        type: "clues",
        required: ["c9"],
        description: "Hangardaki Haliç lab kodu doğrulandıktan sonra"
      },
      description: "Müze içindeki çok düzenli bir laboratuvar ve arşiv odası. Her şey temiz ve kontrollü görünüyor.",
      sensory_atmosphere: "Temizleyici, eski kağıt ve metal dolap kokusu var. İçerisi fazla sessiz.",
      atmosphere: "Temizleyici, eski kağıt ve metal dolap kokusu var. İçerisi fazla sessiz.",
      entry_text: `Laboratuvar fazla düzenli görünüyor.

    Vakıf klasörleri, arma çizimleri, hangar kodları ve giriş-çıkış terminali aynı odada duruyor.

    Nehir'in masası temiz, dosyalar değil.`,
      interactive_objects: [
        "Vakıf sevkiyat klasörleri",
        "Arşiv izin defterleri",
        "Kimyasal ve malzeme kullanım kayıtları",
        "Giriş-çıkış güvenlik terminali"
      ],
      inspectables: [
        {
          id: "halic_vakif_klasorleri",
          label: "Vakıf sevkiyat klasörleri",
          tag: "vakif_klasorleri",
          aliases: ["sevkiyat_klasoru", "vakif_dosyasi", "arma_dosyasi"],
          inspect_text: "Klasör düzeni kusursuz ama içerik fazla uyumlu. Aynı kod dilinin farklı yerlerde yeniden kullanıldığı hissediliyor.",
          reveal_clue_id: "c10",
          reveal_text: "Saran Vakfı adına düzenlenmiş izinler, Burgazada hangarı ile Karaköy eski iskeleyi aynı kod hattında bağlıyor. Dosyadaki arma kasalardaki mühürle aynı.",
          repeat_text: "Klasörler aynı bağı tekrar ediyor: vakıf hattı, hangar ve iskele tek bir dolaşımın parçaları.",
          reveal_summary_text: "Saran Vakfı rota dosyası netleşti.",
          repeat_summary_text: "Vakıf klasörleri yeniden okundu."
        },
        {
          id: "halic_izin_defterleri",
          label: "Arşiv izin defterleri",
          tag: "izin_defterleri",
          aliases: ["izin", "arsiv", "defter"],
          inspect_text: "İzin dili resmî ama tekrar eden kodlar, arşiv işinin yalnız arşiv işi olmadığını düşündürüyor.",
          repeat_text: "Defterler isim vermekten çok örüntü veriyor; fazlasıyla düzenli bir tekrar var.",
          no_reveal_text: "Tek başına yeni delil değil; ama vakıf klasörlerindeki hattı destekliyor.",
          summary_text: "İzin defterleri incelendi.",
          repeat_summary_text: "İzin defterleri yeniden kontrol edildi."
        },
        {
          id: "halic_malzeme_kayitlari",
          label: "Kimyasal ve malzeme kullanım kayıtları",
          tag: "malzeme_kayitlari",
          aliases: ["kimyasal", "malzeme", "kullanim_kaydi"],
          inspect_text: "Kayıtlar temiz tutulmuş ama laboratuvar düzeni ile sahadaki kaba müdahale arasında tuhaf bir köprü kuruyor.",
          repeat_text: "Yeni delil vermiyor; yalnız yöntemin tamamen amatör olmadığını düşündürüyor.",
          no_reveal_text: "Asıl değerini daha sonra teknik raporlarla kazanabilecek bir kayıt seti.",
          summary_text: "Malzeme kullanım kayıtları incelendi.",
          repeat_summary_text: "Malzeme kayıtları yeniden okundu."
        },
        {
          id: "halic_guvenlik_terminali",
          label: "Giriş-çıkış güvenlik terminali",
          tag: "guvenlik_terminali",
          aliases: ["terminal", "rfid", "giris_cikis"],
          inspect_text: "Terminal tek başına tam hikâyeyi vermiyor ama zaman çizgisi burada bozulabilir hissi bırakıyor.",
          repeat_text: "Şimdilik sadece bir boşluk hissi veriyor; araç ve servis yolu olmadan tek başına kapanmıyor.",
          no_reveal_text: "Burada tam delil yok, yalnızca ileride zaman çizgisine bağlanabilecek bir düğüm var.",
          summary_text: "Güvenlik terminali incelendi.",
          repeat_summary_text: "Güvenlik terminali yeniden kontrol edildi."
        }
      ],
      visible_elements: [
        "Vakıf dosyaları",
        "Arşiv izin defterleri",
        "Koruma malzemesi dolabı",
        "Güvenlik terminali",
        "Nehir'in masası"
      ],
      hidden_clues: [
        {
          clue_id: "c10",
          trigger_hint: "Vakıf klasörleri, eski hangar kodları ve arma çizimleri çapraz okunursa",
          reveal_text: "Saran Vakfı adına düzenlenmiş izinler, Burgazada hangarı ile Karaköy eski iskeleyi aynı kod hattında bağlıyor. Dosyadaki arma kasalardaki mühürle aynı."
        }
      ],
      gpt_instructions: "Kısa yaz. Temiz görünen düzen ile vakıf dosyaları arasındaki çelişkiye odaklan. c10 bağı netleştirsin."
    }
  ],

  clues: [
    {
      id: "c1",
      name: "Flue Hattındaki Yapay Tıkanma",
      icon: "🔥",
      tag: "tikanma",
      found_in: "karakoy_iskele",
      short_description: "Kabin ısıtıcısının hava çıkışı doğal görünmüyor.",
      detailed_description: "Flue hattında yağlı macun artığı ve sıkıştırılmış beyaz köpük vardır. Bu doğal arıza değil, müdahale izidir.",
      description: "Isıtıcı kazadan çok hazırlık hissi veriyor.",
      how_to_unlock: "Isıtıcı ve baca çıkışı dikkatle incelenirse.",
      narrative_purpose: "Olayın kaza değil, hazırlanmış bir cinayet olabileceğini gösterir.",
      connections: "c11 ve c12 ile birleşince cinayet yöntemi netleşir.",
      examination_hints: "Kurum ve yapışkan katman birlikte düşünülmeli. İkinci iz tabakası önemlidir."
    },
    {
      id: "c2",
      name: "Kırık Kameradaki Son Ses",
      icon: "🎥",
      tag: "son_ses",
      found_in: "karakoy_iskele",
      short_description: "Kabin içinde ikinci biri ve tuhaf bir koku var.",
      detailed_description: "Ses kaydında Derya'nın zor nefesi, metal sesi ve bir kadın sesi vardır. Derya 'Bu koku normal değil' der.",
      description: "Derya'nın son dakikaları kayıtta kalmış.",
      how_to_unlock: "Kırık kameranın hafıza kartı kurtarılıp ses temizlenirse.",
      narrative_purpose: "Olayı kazadan cinayet şüphesine taşır.",
      connections: "c8 ile ikinci kişinin silueti, c11 ile boğucu ortam birbirine bağlanır.",
      examination_hints: "Yüz yoktur; ses tonu ve 'koku' vurgusu önemlidir."
    },
    {
      id: "c3",
      name: "Kırlangıç Koordinat Notu",
      icon: "🗺️",
      tag: "kirlangic_notu",
      found_in: "karakoy_iskele",
      short_description: "Notlar hangarı ve lofttaki yedek kaydı işaret ediyor.",
      detailed_description: "Sayfalarda 'Kırlangıç', 'ada', 'arma', 'yedek kayıt loftta' ve yarım koordinatlar görülür.",
      description: "Derya'nın son rotasını gösteren not.",
      how_to_unlock: "Notlar kurutulup dikkatle okunursa.",
      narrative_purpose: "Soruşturmayı şehir ve ada hattına taşır.",
      connections: "c4 ve c9'un açılmasına yol verir.",
      examination_hints: "Koordinatlar ses notu ve ada bilgisiyle anlam kazanır."
    },
    {
      id: "c4",
      name: "Dolaptaki Yedek Ses Notu",
      icon: "🔐",
      tag: "yedek_ses",
      found_in: "moda_loft",
      short_description: "Derya, asıl düğümün armada olduğunu ve Selin'in uçuş yedeğine bakılması gerektiğini söylüyor.",
      detailed_description: "Gizli ses notunda Derya zinciri tarif eder: Mert para kaçırdı, Ozan hattı sattı, ama asıl düğüm armada. Selin'in Balat'taki uçuş yedeğinin de kontrol edilmesini ister. Nehir'in fazla hazırlıklı olduğundan da şüphelenir.",
      description: "Derya'nın yedek ses kaydı.",
      how_to_unlock: "İşaretli dolap açılıp ses dosyası bulunursa.",
      narrative_purpose: "Yan suçlarla asıl merkezi birbirinden ayırır.",
      connections: "c5, c8, c9 ve c10'a giden mantık hattını kurar.",
      examination_hints: "Derya suçları sıralar ama hepsini aynı düzeye koymaz."
    },
    {
      id: "c5",
      name: "Eksik Fon Çizelgesi",
      icon: "💸",
      tag: "fon_cizelgesi",
      found_in: "moda_loft",
      short_description: "Sponsor bütçesinden düzenli para çıkışı var.",
      detailed_description: "Bütçede küçük ama sürekli para kaymaları vardır. Kayıt başka şey der, para başka şirkete gider.",
      description: "Mert'in ayrı suçunu gösteren para izi.",
      how_to_unlock: "Bütçe dosyaları tarih ve havalelerle çapraz okunursa.",
      narrative_purpose: "Güçlü bir çeldirici üretir.",
      connections: "c4 ile desteklenir ama c11 ve c12 ile aynı yöne gitmez.",
      examination_hints: "Motivasyon ile yöntem aynı kişiye gitmeyebilir."
    },
    {
      id: "c6",
      name: "Duplicate Misafir Kartı Logu",
      icon: "🪪",
      tag: "misafir_karti",
      found_in: "kalamis_ops",
      short_description: "Kapalı iskelede boş isimli duplicate kart kullanılmış.",
      detailed_description: "Erişim ekranında olmaması gereken 'misafir-14' kartı görünür. Kart sahibi boş bırakılmıştır.",
      description: "Gizli giriş için açılmış sistem boşluğu.",
      how_to_unlock: "Geçiş logları saat ve iskeleye göre filtrelenirse.",
      narrative_purpose: "Girişin sistem içinden sağlandığını gösterir.",
      connections: "c7 ve c13 ile anlam kazanır; Kerem ve Ozan üzerinde baskı kurar.",
      examination_hints: "Boş isim alanı bilinçli bırakılmıştır."
    },
    {
      id: "c7",
      name: "Kör Kamera Penceresi",
      icon: "📷",
      tag: "kor_kamera",
      found_in: "kalamis_ops",
      short_description: "Eski iskele kamerası cinayet saatinde kapatılmış.",
      detailed_description: "Bakım çizelgesinde 19:50-22:00 aralığı işaretlidir. Kenarda 'ısı alarmı açık kalacak' notu vardır.",
      description: "Görüntüyü karartan ama sistemi tamamen susturmayan müdahale.",
      how_to_unlock: "Bakım tablosu ile kamera boşluğu birlikte incelenirse.",
      narrative_purpose: "Suç ortamını hazırlayan ikinci eli gösterir.",
      connections: "c1, c6 ve c13 ile çapraz bağ kurar.",
      examination_hints: "Kör alanı yaratan kişi katil olmayabilir ama katili görünmez yapmış olabilir."
    },
    {
      id: "c8",
      name: "Fırtına Zorlamalı Drone Karesi",
      icon: "🌬️",
      tag: "drone_karesi",
      found_in: "balat_atolye",
      short_description: "Drone karede çanta taşıyan tek kişiyi yakalıyor.",
      detailed_description: "20:22 damgalı karede iskeleye yönelen bir siluet vardır. Elinde dikdörtgen koruma çantası vardır. Sol bilekte açık renk oversleeve görünür.",
      description: "Fırtınanın zorladığı otomatik kayıt.",
      how_to_unlock: "Selin'in uçuş logları ve otomatik çekimleri kurtarılırsa.",
      narrative_purpose: "Katilin hesaba katmadığı dış kanıt budur.",
      connections: "c2, c12 ve c13 ile birleştiğinde Nehir'i doğrudan çevreler.",
      examination_hints: "Yüz değil, ekipman ve zaman damgası önemlidir."
    },
    {
      id: "c9",
      name: "Armalı Kasa ve Sahte Koruma Nakli",
      icon: "📦",
      tag: "armali_kasa",
      found_in: "kirlangic_hangar",
      short_description: "Koruma etiketi taşıyan kasa, Haliç kodlu kaçak eser hattı için kullanılmış.",
      detailed_description: "Balmumu mühür Derya'nın çizimiyle aynıdır. Etikette 'koruma nakli / Haliç lab' kodu vardır. Kasanın içinden eser kutuları ve yeniden paketleme malzemesi çıkar.",
      description: "Suç ağını ve Haliç bağlantısını elle tutulur hale getiren kasa.",
      how_to_unlock: "Kasa mühürü ve etiketler dikkatle incelenirse.",
      narrative_purpose: "Derya'nın ifşa etmeye yaklaştığı ağı somutlaştırır.",
      connections: "c10 ve c4 ile doğrudan birleşir.",
      examination_hints: "Kasa kadar etiket dili de önemlidir."
    },
    {
      id: "c10",
      name: "Saran Vakfı Rota Dosyası",
      icon: "🗃️",
      tag: "rota_dosyasi",
      found_in: "halic_lab",
      short_description: "Vakıf izinleri hangar ile eski iskeleyi aynı hatta bağlıyor.",
      detailed_description: "Belgeler ada hangarı ile şehir iskelesi arasında aynı kod hattını gösterir. Dosyadaki arma kasadaki mühürle aynıdır.",
      description: "Vakıf ile rota arasındaki arşiv bağı.",
      how_to_unlock: "Vakıf klasörleri ve hangar kodları birlikte okunursa.",
      narrative_purpose: "Vakıf ile cinayet motivasyonunu birleştirir.",
      connections: "c9, c12 ve Nehir'in motivasyonu ile birleşir.",
      examination_hints: "Rota, izin ve arma aynı yerde buluşunca tesadüf kalmaz."
    },
    {
      id: "c11",
      name: "Toksikoloji Ön Raporu",
      icon: "🧬",
      tag: "toksikoloji",
      found_in: null,
      short_description: "Karbonmonoksite düşük doz skopolamin eşlik etmiş.",
      detailed_description: "Adli rapor, ölümün yalnız dumandan olmadığını gösterir. Kanda düşük doz skopolamin vardır. Sprey kapağında da aynı iz bulunur.",
      description: "Cinayetin iki aşamalı yöntemini gösteren rapor.",
      how_to_unlock: "Adli rapor gelince otomatik açılır.",
      narrative_purpose: "Katilin hem ortamı hem kurbanı hedef aldığını gösterir.",
      connections: "c1 ve c2 ile birleşir; Kerem'in ağzından kaçan sprey bilgisini doğrular.",
      examination_hints: "Amaç doğrudan öldürmek değil, direnci düşürmektir."
    },
    {
      id: "c12",
      name: "Kontamine Malzeme Eşleşmesi",
      icon: "🧪",
      tag: "malzeme_eslesmesi",
      found_in: null,
      short_description: "Sıradan malzemenin üstünde ince koruma izi ve lifler var.",
      detailed_description: "Kriminal analiz, flue hattında sıradan denizcilik macunu ve köpüğü görür. Ama yüzeyde ince akrilik iz ve açık renk lifler de vardır. Bunlar oversleeve ve vakıf çantalarıyla uyumludur.",
      description: "Yöntemi Nehir'in çalışma dünyasına bağlayan teknik halka.",
      how_to_unlock: "Kriminal ve laboratuvar analizi tamamlanınca açılır.",
      narrative_purpose: "Planın istemeden bıraktığı ikinci izi gösterir.",
      connections: "c1, c8 ve c10 ile beraber nihai çemberi daraltır.",
      examination_hints: "Önemli olan sıradan malzemenin üstündeki ikinci iz katmanıdır."
    },
    {
      id: "c13",
      name: "Çıkış, RFID ve Servis Yolu Zinciri",
      icon: "🚕",
      tag: "rfid_zinciri",
      found_in: null,
      short_description: "Nehir laboratuvardan erken çıkıp vakıf aracıyla Karaköy'e gitmiş.",
      detailed_description: "Terminal, RFID kaydı ve servis yolu kamerası birlikte okunduğunda Nehir'in 19:18'de çıktığı ve 19:58'de Karaköy'e vardığı görülür.",
      description: "Alibiyi zaman üzerinden kıran veri paketi.",
      how_to_unlock: "Terminal, araç kaydı ve servis yolu verisi birleştirilince açılır.",
      narrative_purpose: "Zaman çizgisini tek kişide toplar.",
      connections: "c8 ve c12 ile birleştiğinde Nehir'in savunma alanı kalmaz.",
      examination_hints: "Tek kayıt yetmez; zincir birlikte okunmalıdır."
    }
  ],

  forensic_reports: [
    {
      id: "fr1",
      name: "Toksikoloji Ön Raporu",
      icon: "🧬",
      clue_revealed: "c11",
      unlock_condition: {
        type: "clues",
        required: ["c2"],
        description: "Son ses kaydı çözüldükten sonra"
      },
      notification_text: "📋 Adli Tıp ön raporu geldi: Ölüm sadece dumandan ibaret değil.",
      content: "Derya'nın kanında düşük doz skopolamin ve karbonmonoksit birlikte bulundu. Sprey kapağı da incelemeye alındı."
    },
    {
      id: "fr2",
      name: "Malzeme ve İz Eşleştirme",
      icon: "🔬",
      clue_revealed: "c12",
      unlock_condition: {
        type: "all",
        conditions: [
          {
            type: "clues",
            required: ["c1"]
          },
          {
            type: "phase",
            min_phase: 2
          }
        ],
        description: "Isıtıcı örneği toplandıktan ve soruşturma ikinci hatta genişledikten sonra"
      },
      notification_text: "📋 Kriminal analiz döndü: Malzemenin üstünde ikinci bir iz katmanı var.",
      content: "Flue hattındaki macun ve köpük sıradan görünüyor. Ama yüzeyde koruma ekipmanından taşınmış ince izler var."
    },
    {
      id: "fr3",
      name: "Çıkış ve Ulaşım Verisi",
      icon: "📡",
      clue_revealed: "c13",
      unlock_condition: {
        type: "clues",
        required: ["c10"],
        description: "Haliç terminali ve vakıf dosyaları incelendikten sonra"
      },
      notification_text: "📋 Güvenlik ve ulaşım kayıtları geldi: Bir alibi çöktü.",
      content: "Güvenlik terminali, araç RFID kaydı ve servis yolu geçişi birlikte okundu. Nehir'in anlattığı akış tutmuyor."
    }
  ],

  phases: [
    {
      id: 1,
      name: "Birinci Hat",
      description: "Olay yerini, yedek kaydı ve giriş sistemini çöz.",
      available_locations: ["karakoy_iskele", "moda_loft", "kalamis_ops"],
      next_phase_trigger: {
        type: "clues",
        required: ["c2", "c3", "c4"]
      }
    },
    {
      id: 2,
      name: "Kıyıdan Adaya",
      description: "Gizli rotayı, duplicate kartları ve drone kaydını bul.",
      available_locations: ["karakoy_iskele", "moda_loft", "kalamis_ops", "balat_atolye", "kirlangic_hangar"],
      next_phase_trigger: {
        type: "clues",
        required: ["c8", "c9", "c11"]
      }
    },
    {
      id: 3,
      name: "Temiz Yüz",
      description: "Vakıf dosyaları, malzeme izi ve zaman verisiyle katili sıkıştır.",
      available_locations: ["karakoy_iskele", "moda_loft", "kalamis_ops", "balat_atolye", "kirlangic_hangar", "halic_lab"]
    }
  ],

  advisor: {
    name: "Başkomiser Aylin",
    title: "Cinayet Büro Amiri",
    icon: "🎖️",
    personality: "Kısa konuşan, iyi dinleyen, sezgisi güçlü bir amir. Cevabı vermez, doğru yere iter.",
    gpt_instructions: `Oyuncuya katili söyleme. Deliller arasındaki boşluğu işaret et. Kısa ve net konuş.`,
    hints: [
      {
        condition: "c1 yok",
        text: "Kaza gibi duran şeylerde ayrıntı önemlidir. Isıtıcıyı geçme."
      },
      {
        condition: "c4 yok",
        text: "Derya tedbirliyse bir yedek daha bırakmış olabilir. Kurgu alanına bak."
      },
      {
        condition: "c8 yok",
        text: "Fırtına bazen tanıktan çok makine bırakır. Uçuş loglarını düşün."
      },
      {
        condition: "c10 yok",
        text: "Bazı motivasyonlar dosyada saklanır. Armanın nereye bağlı olduğunu bul."
      }
    ]
  },

  accusation: {
    intro_text: "Bu dosya artık kaza gibi görünmüyor. Biri Derya'yı planlı şekilde öldürdü. Şimdi suçlayacağın kişiyi seç.",
    confirm_text: "Bu kişiyi suçlamak istediğine emin misin?",
    required_clues: ["c10", "c12", "c13"]
  },

  solution: {
    culprit_id: "nehir",
    fatal_flaw: "Nehir panikle hata yapmadı. Ama fırtınanın drone'u otomatik çekime zorlayacağını ve ayrılırken onu kaydedeceğini hesaplayamadı. Ayrıca sıradan malzeme kullandığını sanırken çanta ve oversleeve üzerinden ince iz bıraktı.",
    timeline_reconstruction: [
      "Nehir, Derya'nın vakıf hattını çözdüğünü anlayınca onu kaza gibi görünecek bir yöntemle susturmaya karar verdi.",
      "Önce Derya'nın kullandığı spreyi düşük doz skopolaminle kirletti. Amaç direnci düşürmekti.",
      "Sonra pilot bottaki ısıtıcının flue hattını sıradan macun ve köpükle daralttı. Böylece içeride karbonmonoksit birikecekti.",
      "Derya ile dostça buluştu, onu kabine soktu, spreyi verdi ve ısıtıcıyı çalıştırdı.",
      "Çıkarken çantasını topladı ama bıraktığı ince izleri tamamen silemedi.",
      "Selin'in drone kaydı, Ozan'ın yarım kapattığı sistem, Kerem'in gördükleri, sprey kapağı ve araç zinciri birleşince plan çöktü."
    ],
    full_reveal: `Doğru kişiyi seçtin. Derya Yalın'ı öldüren kişi Nehir Saran'dı.

  Nehir, Derya'nın çocukluk arkadaşıydı. Bu yüzden ona yaklaşması kolaydı. Derya'nın güvenini kullandı. Spreyi kirletti, flue hattını daralttı ve eski ısıtıcıyı kaza gibi görünen bir tuzağa çevirdi.

  Sebep sadece korku değildi. Derya, Saran Vakfı'nın sakladığı kaçak eser hattını çözmek üzereydi. Bu gerçek ortaya çıkarsa Nehir'in ailesi, vakfı ve laboratuvardaki düzeni çökecekti.

  Nehir'i ele veren şey tek bir hata değil, küçük izlerin birleşmesiydi: drone karesi, toksikoloji, kontaminasyon, çıkış ve araç zinciri, vakıf dosyaları. Hepsi aynı kişiyi gösterdi.`,
    wrong_accusation: {
      text: "Yanlış kişiyi suçladın. Bu dosyada çok kişi yalan söyledi ama asıl tehlike en sakin olandı.",
      missed_info: "Kaçırdığın nokta şuydu: kaza görüntüsü, ikinci iz katmanı, drone karesi ve zaman zinciri aynı kişide birleşiyordu.",
      real_story: "Derya'yı öldüren kişi ona en kolay yaklaşan ve ölümü en temiz göstermeye çalışan uzmandı. Yan suçlar gürültü yaptı ama cinayeti onlar işlemedi."
    }
  }

};

window.SENARYO = SENARYO;