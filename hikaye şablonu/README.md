# Hikaye Sablonu Kullanimi

Bu klasordeki ornek_senaryo_sablonu.js dosyasi, artik KIRIK ISKELE ile birebir ayni kanonik senaryo sozlesmesini izler.

Amac su:
- yeni hikaye yazarken farkli field isimleri uydurulmamasin
- motorun bekledigi tum modern alanlar ilk gunden var olsun
- mekan inspectable akisi, clue schema'si ve solution yapisi standart kalsin

## Dosyalar

- ornek_senaryo_sablonu.js: KIRIK ISKELE ile ayni field order ve section order'a sahip kanonik ornek.

## Nasil kullanilir

1. ornek_senaryo_sablonu.js dosyasini kopyala.
2. Kopyayi dedektif_v0.3_judge/<Hikaye Adi>/senaryo.js olarak kaydet.
3. Dosyadaki TODO alanlarini kendi hikayene gore doldur.
4. Alan adlarini degistirme.

## Kanonik section sirasi

Senaryo dosyasi su section sirasini korumali:

1. meta
2. intro
3. timeline
4. setting
5. response_style
6. gpt_base_instructions
7. characters
8. locations
9. clues
10. forensic_reports
11. phases
12. advisor
13. accusation
14. solution

## Kritik notlar

- Global degisken adi mutlaka SENARYO olmali.
- Dosyanin sonunda window.SENARYO = SENARYO; satiri kalmali.
- meta icinde title, subtitle, theme, estimated_playtime, target_interactions ve version bulunmali.
- response_style blogu kanonik yapida kalmali; story kartlari ve runtime davranisi buna gore dengeleniyor.
- Her location item'i sensory_atmosphere, interactive_objects, inspectables, visible_elements ve hidden_clues alanlarini tasimali.
- Her clue item'i su alanlari tasimali:
	id, name, icon, tag, found_in, short_description, detailed_description, description, how_to_unlock, narrative_purpose, connections, examination_hints
- solution blogu su alanlari tasimali:
	culprit_id, fatal_flaw, timeline_reconstruction, full_reveal, wrong_accusation
- accusation icinde required_clues dizisi olmali.
- advisor icinde title, personality ve gpt_instructions bos birakilmamali.

## Unlock condition notu

Motor artik sadece clues tipiyle sinirli degil. Su yapilar desteklenir:

- type: "clues"
- type: "visited_locations"
- type: "conversations"
- type: "time"
- type: "phase"
- type: "all"
- type: "any"

Yani kilitli karakter ve mekanlar icin tek yol yerine alternatif acilma zincirleri tanimlayabilirsin.

## Hata almamak icin hizli kontrol

- Tum location.hidden_clues[].clue_id degerleri clues dizisinde var mi?
- Tum inspectables.reveal_clue_id degerleri clues dizisinde var mi?
- phases[].available_locations icindeki id'ler locations dizisinde var mi?
- characters[].unlock_condition ve locations[].unlock_condition icindeki id'ler dogru mu?
- solution.culprit_id characters dizisindeki bir id ile eslesiyor mu?
- forensic_reports[].clue_revealed degeri clues dizisinde var mi?
- accusation.required_clues icindeki clue id'leri clues dizisinde var mi?
