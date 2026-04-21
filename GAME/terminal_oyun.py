#!/usr/bin/env python3
import argparse
import json
import os
import re
import signal
import socket
import subprocess
import sys
import tempfile
import textwrap
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence, Set, Tuple

from baslat import BASE_DIR, SAVE_DIRNAME, scan_stories


STOP_WORDS = {
    've', 'veya', 'ile', 'icin', 'gibi', 'olan', 'olarak', 'bir', 'bu', 'su', 'o', 'da', 'de',
    'mi', 'mu', 'muu', 'diye', 'gore', 'kadar', 'daha', 'sonra', 'yer', 'sey', 'seyler',
    'bak', 'bakarsa', 'bakilirsa', 'bakilir', 'bakinca', 'incelenirse', 'incelenir', 'incelenince',
    'aranirsa', 'aranir', 'acilirsa', 'acilir', 'acilinca', 'sorulursa', 'edilirse', 'edilir',
    'olursa', 'olur', 'yapilirse', 'yapilir', 'takip', 'gorulurse', 'eslestirilirse', 'capraz',
    'dogru', 'yanlis', 'ayri', 'birlikte', 'arti', 'eksi', 'kisa', 'uzun', 'son', 'ilk', 'var',
    'yok', 'ama', 'fakat', 'ancak', 'burada', 'orada', 'sadece', 'bile', 'karsi', 'uzerinden',
}

AUTHOR_NOTE_SIGNALS = {
    'olmadan', 'gosterilince', 'gosterilirse', 'sorulunca', 'sorulursa', 'baski artarsa',
    'once', 'sonra', 'cozulur', 'kacar', 'resmi konusur', 'agzindan kacirir', 'kabul eder',
    'inkar eder', 'savunmaya gecer', 'susar', 'cikinca', 'konusulursa', 'gelince'
}

SEMANTIC_TOPICS = {
    'timeline': {'alibi', 'gece', 'aksam', 'saat', 'zaman', 'nerede', 'nereye', 'neredeydin', 'gitti', 'gitmis', 'cikis', 'cikip', 'rfid', 'servis', 'ulasim', 'yol', 'vardi'},
    'file': {'dosya', 'dosyasi', 'dosyalari', 'klasor', 'klasorleri', 'arsiv', 'evrak', 'izin'},
    'alarm': {'alarm', 'alarmi', 'uyari', 'isi'},
    'camera': {'kamera', 'kamerasi', 'goruntu', 'bakim', 'cizelge', 'kor'},
    'card': {'kart', 'karti', 'gecis', 'misafir', 'duplicate', 'log'},
    'locker': {'dolap', 'dolabi', 'kilit', 'anahtar'},
    'notebook': {'not', 'defter', 'rota', 'koordinat', 'sayfa'},
    'heater': {'isitici', 'baca', 'havalandirma', 'flue', 'kopuk', 'macun'},
    'drone': {'drone', 'ucus', 'hafiza', 'fotograf', 'kare', 'pil'},
    'cargo': {'kasa', 'kasalar', 'muhr', 'sevkiyat', 'nakil', 'arma'},
    'lab': {'laboratuvar', 'lab', 'kimyasal', 'malzeme', 'kontaminasyon', 'lif', 'sprey'},
}

OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions'
OPENAI_REQUEST_TIMEOUT_SECONDS = 35
BRIDGE_TIMEOUT_SECONDS = 12


def compact_text(value: object, max_length: int = 180) -> str:
    text = ' '.join(str(value or '').split())
    if len(text) <= max_length:
        return text
    return text[: max(0, max_length - 3)].rstrip() + '...'


def normalize_text(value: object) -> str:
    return (
        str(value or '')
        .lower()
        .replace('ğ', 'g')
        .replace('ü', 'u')
        .replace('ş', 's')
        .replace('ı', 'i')
        .replace('i̇', 'i')
        .replace('ö', 'o')
        .replace('ç', 'c')
    )


def slugify(value: object) -> str:
    text = normalize_text(value)
    text = re.sub(r'[^a-z0-9]+', '_', text)
    return re.sub(r'_+', '_', text).strip('_')


def extract_keywords(value: object) -> List[str]:
    tokens = re.split(r'[^a-z0-9]+', normalize_text(value))
    return [token for token in tokens if len(token) >= 3 and token not in STOP_WORDS]


def are_keywords_related(left: str, right: str) -> bool:
    if not left or not right:
        return False
    if left == right:
        return True
    if len(left) >= 4 and len(right) >= 4 and left[:4] == right[:4]:
        return True
    shorter, longer = (left, right) if len(left) <= len(right) else (right, left)
    return len(shorter) >= 5 and shorter in longer


def semantic_topics(value: object) -> Set[str]:
    keywords = extract_keywords(value)
    if not keywords:
        return set()

    topics = set()
    for topic, aliases in SEMANTIC_TOPICS.items():
        if any(
            are_keywords_related(keyword, alias)
            for keyword in keywords
            for alias in aliases
        ):
            topics.add(topic)
    return topics


def keyword_overlap_score(query_keywords: Sequence[str], target_keywords: Sequence[str]) -> int:
    if not query_keywords or not target_keywords:
        return 0

    score = 0
    unique_targets = list(dict.fromkeys(target_keywords))
    for query_keyword in dict.fromkeys(query_keywords):
        best = 0
        for target_keyword in unique_targets:
            if query_keyword == target_keyword:
                best = 2
                break
            if are_keywords_related(query_keyword, target_keyword):
                best = max(best, 1)
        score += best
    return score


def semantic_match_score(query: str, *targets: object) -> int:
    query_keywords = extract_keywords(query)
    if not query_keywords:
        return 0

    target_keywords: List[str] = []
    target_topics: Set[str] = set()
    for target in targets:
        target_keywords.extend(extract_keywords(target))
        target_topics.update(semantic_topics(target))

    score = keyword_overlap_score(query_keywords, target_keywords)
    score += 2 * len(semantic_topics(query) & target_topics)
    return score


def matches_trigger_hint(query: str, trigger_hint: str) -> bool:
    return semantic_match_score(query, trigger_hint) > 0


def parse_condition_text(condition_text: str) -> Tuple[Optional[str], Optional[str]]:
    text = normalize_text(condition_text)
    match = re.match(r'^(c\d+)\s+(yok|var)$', text)
    if not match:
        return None, None
    return match.group(1), match.group(2)


def split_terminal_command(raw_command: str) -> Tuple[str, str]:
    stripped = str(raw_command or '').strip()
    if not stripped:
        return '', ''
    command, _, rest = stripped.partition(' ')
    return normalize_text(command), rest.strip()


def split_target_and_message(raw_value: str) -> Tuple[str, str]:
    stripped = str(raw_value or '').strip()
    if not stripped:
        return '', ''
    target, _, message = stripped.partition(' ')
    return target.strip(), message.strip()


def looks_like_freeform_location_query(raw_command: str) -> bool:
    normalized = normalize_text(raw_command)
    if not normalized:
        return False
    return any(
        token in normalized
        for token in (
            'icerde',
            'iceride',
            'ne var',
            'gorunuyor',
            'gorebiliyor',
            'gorebiliyo',
            'gorebiliyorsun',
            'gorebiliyosun',
            'hangi',
        )
    )


def extract_direct_quote(text: str) -> Optional[str]:
    for pattern in (r":\s*'([^']+)'", r':\s*"([^"]+)"'):
        match = re.search(pattern, str(text or ''))
        if match:
            return match.group(1).strip()
    return None


def looks_like_author_note(text: str) -> bool:
    normalized = normalize_text(text)
    if not normalized:
        return False
    if extract_direct_quote(text):
        return False
    return any(signal in normalized for signal in AUTHOR_NOTE_SIGNALS)


def inspection_clue_score(query: str, hidden_clue: Dict[str, object], clue: Dict[str, object]) -> int:
    return semantic_match_score(
        query,
        hidden_clue.get('trigger_hint', ''),
        clue.get('name', ''),
        clue.get('tag', ''),
        clue.get('short_description', ''),
        clue.get('detailed_description', ''),
        clue.get('how_to_unlock', ''),
    )


def clue_match_score(
    message: str,
    clue_id: str,
    clue: Dict[str, object],
    reaction: str = '',
    character: Optional[Dict[str, object]] = None,
) -> int:
    normalized_message = normalize_text(message)
    direct_tokens = {
        normalize_text(clue_id),
        normalize_text(clue.get('name', '')),
        entity_tag(clue).replace('_', ' '),
    }
    score = 0
    for token in direct_tokens:
        if token and token in normalized_message:
            score += max(3, len(extract_keywords(token)) + 2)

    score += semantic_match_score(
        message,
        clue_id,
        clue.get('name', ''),
        clue.get('tag', ''),
        clue.get('short_description', ''),
        clue.get('detailed_description', ''),
        clue.get('how_to_unlock', ''),
        reaction,
    )

    if character:
        related_topics = semantic_topics(' '.join([
            str(clue_id),
            str(clue.get('name', '')),
            str(clue.get('tag', '')),
            str(clue.get('short_description', '')),
            str(clue.get('detailed_description', '')),
            str(reaction or ''),
        ]))
        if 'timeline' in related_topics:
            alibi = character.get('alibi') or {}
            score += semantic_match_score(
                message,
                alibi.get('claimed', ''),
                alibi.get('real', ''),
                alibi.get('inconsistencies', ''),
            )
    return score


def read_scenario(scenario_path: str) -> Dict[str, object]:
    jxa = f"""
ObjC.import('Foundation');
function read(path) {{
  const text = $.NSString.stringWithContentsOfFileEncodingError($(path), $.NSUTF8StringEncoding, null);
  if (!text) throw new Error('senaryo.js okunamadi');
  return ObjC.unwrap(text);
}}
const source = read({json.dumps(scenario_path)});
const wrapped = '(function(){{ var window = {{}}; ' + source + '; return JSON.stringify(SENARYO); }})()';
const result = eval(wrapped);
$.NSFileHandle.fileHandleWithStandardOutput.writeData($(result).dataUsingEncoding($.NSUTF8StringEncoding));
"""

    completed = subprocess.run(
        ['osascript', '-l', 'JavaScript', '-e', jxa],
        capture_output=True,
        text=True,
        check=False,
        timeout=BRIDGE_TIMEOUT_SECONDS,
    )
    if completed.returncode != 0:
        error_text = completed.stderr.strip() or completed.stdout.strip() or 'Bilinmeyen hata'
        raise RuntimeError(f'Senaryo okunamadi: {error_text}')
    return json.loads(completed.stdout)


def print_block(title: str, body: str = '') -> None:
    print(f'\n[{title}]')
    if body:
        print(body)


def format_list_line(label: str, value: str) -> str:
    return f'- {label}: {value}' if value else f'- {label}'


def entity_tag(entity: Dict[str, object]) -> str:
    return slugify(entity.get('tag') or entity.get('id') or entity.get('name') or '')


def resolve_entity(items: Sequence[Dict[str, object]], raw_value: str) -> Optional[Dict[str, object]]:
    query = slugify(str(raw_value or '').lstrip('#'))
    if not query:
        return None

    exact_matches = []
    prefix_matches = []
    fuzzy_matches = []
    for item in items:
        keys = {
            slugify(item.get('id') or ''),
            slugify(item.get('name') or ''),
            entity_tag(item),
        }
        keys.discard('')
        if query in keys:
            exact_matches.append(item)
            continue
        if any(key.startswith(query) for key in keys):
            prefix_matches.append(item)
            continue
        if any(query in key for key in keys):
            fuzzy_matches.append(item)

    for candidate_group in (exact_matches, prefix_matches, fuzzy_matches):
        if candidate_group:
            return candidate_group[0]
    return None


@dataclass
class TerminalState:
    story_folder: str
    phase: int = 1
    current_location: Optional[str] = None
    visited_locations: Set[str] = field(default_factory=set)
    found_clue_ids: Set[str] = field(default_factory=set)
    unlocked_report_ids: Set[str] = field(default_factory=set)
    talked_character_ids: Set[str] = field(default_factory=set)
    turn_count: int = 0
    accusation_made: bool = False
    conversations: Dict[str, List[Dict[str, object]]] = field(default_factory=dict)
    gpt_summaries: Dict[str, str] = field(default_factory=dict)
    character_states: Dict[str, Dict[str, object]] = field(default_factory=dict)
    player_notes: List[Dict[str, object]] = field(default_factory=list)
    lore_memory: Dict[str, object] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, object]:
        return {
            'story_folder': self.story_folder,
            'phase': self.phase,
            'current_location': self.current_location,
            'visited_locations': sorted(self.visited_locations),
            'found_clue_ids': sorted(self.found_clue_ids),
            'unlocked_report_ids': sorted(self.unlocked_report_ids),
            'talked_character_ids': sorted(self.talked_character_ids),
            'turn_count': self.turn_count,
            'accusation_made': self.accusation_made,
            'conversations': self.conversations,
            'gpt_summaries': self.gpt_summaries,
            'character_states': self.character_states,
            'player_notes': self.player_notes,
            'lore_memory': self.lore_memory,
        }

    @classmethod
    def from_dict(cls, payload: Dict[str, object], story_folder: str) -> 'TerminalState':
        return cls(
            story_folder=story_folder,
            phase=int(payload.get('phase', 1) or 1),
            current_location=payload.get('current_location') or None,
            visited_locations=set(payload.get('visited_locations') or []),
            found_clue_ids=set(payload.get('found_clue_ids') or []),
            unlocked_report_ids=set(payload.get('unlocked_report_ids') or []),
            talked_character_ids=set(payload.get('talked_character_ids') or []),
            turn_count=int(payload.get('turn_count', 0) or 0),
            accusation_made=bool(payload.get('accusation_made', False)),
            conversations=payload.get('conversations') if isinstance(payload.get('conversations'), dict) else {},
            gpt_summaries=payload.get('gpt_summaries') if isinstance(payload.get('gpt_summaries'), dict) else {},
            character_states=payload.get('character_states') if isinstance(payload.get('character_states'), dict) else {},
            player_notes=payload.get('player_notes') if isinstance(payload.get('player_notes'), list) else [],
            lore_memory=payload.get('lore_memory') if isinstance(payload.get('lore_memory'), dict) else {},
        )


class TerminalGame:
    def __init__(self, story_folder: str, scenario: Dict[str, object], mode: str = 'interactive'):
        self.story_folder = story_folder
        self.scenario = scenario
        self.mode = mode
        self.game_dir = os.path.dirname(os.path.abspath(__file__))
        self.story_path = os.path.join(BASE_DIR, story_folder)
        self.save_dir = os.path.join(self.story_path, SAVE_DIRNAME)
        self.save_path = os.path.join(self.save_dir, 'terminal_state.json')
        self.lore_path = os.path.join(self.story_path, 'lore_genisletme.json')
        self.bridge_path = os.path.join(self.game_dir, 'terminal_bridge.js')
        self.api_key_path = os.path.join(self.game_dir, 'api')
        self.api_key = self._load_api_key()
        self.model = os.environ.get('DEDEKTIF_MODEL', 'smart-low-cost').strip() or 'smart-low-cost'
        self.locations = scenario.get('locations', [])
        self.characters = scenario.get('characters', [])
        self.clues = scenario.get('clues', [])
        self.reports = scenario.get('forensic_reports', [])
        self.phases = scenario.get('phases', [])
        self.meta = scenario.get('meta', {})
        self.advisor = scenario.get('advisor', {})
        self.accusation = scenario.get('accusation', {})
        self.solution = scenario.get('solution', {})
        self.locations_by_id = {item['id']: item for item in self.locations}
        self.characters_by_id = {item['id']: item for item in self.characters}
        self.clues_by_id = {item['id']: item for item in self.clues}
        self.reports_by_id = {item['id']: item for item in self.reports}
        self.state = TerminalState(story_folder=story_folder)
        self.state.lore_memory = self._load_lore_memory()
        self._ensure_runtime_state()

    def _load_api_key(self) -> str:
        env_key = os.environ.get('OPENAI_API_KEY', '').strip()
        if env_key:
            return env_key
        if os.path.isfile(self.api_key_path):
            with open(self.api_key_path, 'r', encoding='utf-8') as handle:
                return handle.read().strip()
        return ''

    def gpt_enabled(self) -> bool:
        return bool(self.api_key)

    def _build_empty_lore_memory(self) -> Dict[str, object]:
        return {
            'version': 1,
            'storyFolder': self.story_folder,
            'updatedAt': 0,
            'entries': {
                'location': {},
                'clue': {},
            },
        }

    def _load_lore_memory(self) -> Dict[str, object]:
        if os.path.isfile(self.lore_path):
            with open(self.lore_path, 'r', encoding='utf-8') as handle:
                payload = json.load(handle)
            if isinstance(payload, dict):
                payload.setdefault('entries', {'location': {}, 'clue': {}})
                payload['entries'].setdefault('location', {})
                payload['entries'].setdefault('clue', {})
                payload.setdefault('storyFolder', self.story_folder)
                payload.setdefault('version', 1)
                payload.setdefault('updatedAt', 0)
                return payload
        return self._build_empty_lore_memory()

    def _save_lore_memory(self) -> None:
        os.makedirs(self.story_path, exist_ok=True)
        with open(self.lore_path, 'w', encoding='utf-8') as handle:
            json.dump(self.state.lore_memory, handle, ensure_ascii=False, indent=2)

    def _ensure_runtime_state(self) -> None:
        if not isinstance(self.state.lore_memory, dict) or not self.state.lore_memory:
            self.state.lore_memory = self._load_lore_memory()
        if self.gpt_enabled() and not self.state.character_states:
            try:
                bridge_result = self._run_bridge('init_character_states', rawCharacterStates=self.state.character_states)
                self.state.character_states = bridge_result.get('characterStates') or {}
            except Exception:
                self.state.character_states = {}

    def _conversation_key(self, entity_type: str, entity_id: Optional[str] = None) -> str:
        if entity_type == 'location':
            return f'loc_{entity_id}'
        if entity_type == 'character':
            return f'char_{entity_id}'
        if entity_type == 'advisor':
            return 'advisor'
        if entity_type == 'clue':
            return f'clue_{entity_id}'
        return entity_id or entity_type

    def _add_message(
        self,
        key: str,
        role: str,
        content: str,
        *,
        sender_name: Optional[str] = None,
        is_clue_found: bool = False,
        found_clue_ids: Optional[Sequence[str]] = None,
        message_kind: Optional[str] = None,
    ) -> None:
        entry = {
            'role': role,
            'content': str(content or '').strip(),
            'timestamp': int(__import__('time').time() * 1000),
            'senderName': sender_name,
            'isClueFound': bool(is_clue_found),
            'foundClueIds': [clue_id for clue_id in (found_clue_ids or []) if clue_id],
            'messageKind': message_kind if isinstance(message_kind, str) else None,
        }
        self.state.conversations.setdefault(key, []).append(entry)

    def _recent_messages(self, key: str, limit: int = 15) -> List[Dict[str, str]]:
        messages = self.state.conversations.get(key, [])
        filtered = [
            {'role': msg['role'], 'content': msg['content']}
            for msg in messages
            if msg.get('role') in {'user', 'assistant'} and isinstance(msg.get('content'), str)
        ]
        return filtered[-limit:]

    def _append_summary(self, key: str, summary_text: str) -> None:
        summary = str(summary_text or '').strip()
        if not summary:
            return
        existing = self.state.gpt_summaries.get(key, '')
        self.state.gpt_summaries[key] = f'{existing} | {summary}' if existing else summary

    def _build_found_clues(self) -> List[Dict[str, object]]:
        return [self.clues_by_id[clue_id] for clue_id in sorted(self.state.found_clue_ids) if clue_id in self.clues_by_id]

    def _build_bridge_payload(self, **extra: object) -> Dict[str, object]:
        payload = {
            'baseDir': self.game_dir,
            'storyFolder': self.story_folder,
            'model': self.model,
            'scenario': self.scenario,
            'gameState': {
                'phase': self.state.phase,
                'totalTurns': self.state.turn_count,
                'visitedLocations': sorted(self.state.visited_locations),
                'foundClues': self._build_found_clues(),
                'conversations': self.state.conversations,
                'gptSummaries': self.state.gpt_summaries,
                'characterStates': self.state.character_states,
                'playerNotes': self.state.player_notes,
                'loreMemory': self.state.lore_memory,
                'uniqueCharConversations': sorted(self.state.talked_character_ids),
            },
        }
        payload.update(extra)
        return payload

    def _run_bridge(self, command: str, **kwargs: object) -> Dict[str, object]:
        payload = self._build_bridge_payload(command=command, **kwargs)
        with tempfile.NamedTemporaryFile('w', encoding='utf-8', suffix='.json', delete=False) as handle:
            json.dump(payload, handle, ensure_ascii=False)
            payload_path = handle.name

        try:
            completed = subprocess.run(
                ['osascript', '-l', 'JavaScript', self.bridge_path, payload_path],
                capture_output=True,
                text=True,
                check=False,
                timeout=BRIDGE_TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired as err:
            raise RuntimeError(f'Bridge zaman asimina ugradi: {command}') from err
        finally:
            try:
                os.unlink(payload_path)
            except OSError:
                pass

        if completed.returncode != 0:
            error_text = completed.stderr.strip() or completed.stdout.strip() or 'Bilinmeyen bridge hatasi'
            raise RuntimeError(error_text)

        stdout = completed.stdout.strip()
        return json.loads(stdout) if stdout else {}

    def _shrink_messages(self, messages: Sequence[Dict[str, str]], call_profile: Dict[str, object]) -> List[Dict[str, str]]:
        max_messages = int(call_profile.get('maxMessages', 8) or 8)
        max_chars = int(call_profile.get('maxCharsPerMessage', 800) or 800)
        compacted = []
        for message in list(messages or [])[-max_messages:]:
            content = compact_text(message.get('content', ''), max_chars)
            compacted.append({'role': message.get('role', 'user'), 'content': content})
        return compacted

    def _instruction_role(self, model_name: str) -> str:
        return 'developer' if str(model_name or '').lower().startswith('gpt-5') else 'system'

    def _visible_output_budget(self, model_name: str, max_output_tokens: int) -> int:
        if str(model_name or '').startswith('gpt-5'):
            return max(1400, int(max_output_tokens) + 700)
        return int(max_output_tokens)

    def _build_token_limit_payload(self, model_name: str, max_output_tokens: int) -> Dict[str, int]:
        if not max_output_tokens:
            return {}
        if str(model_name or '').startswith('gpt-5'):
            return {'max_completion_tokens': self._visible_output_budget(model_name, int(max_output_tokens))}
        return {'max_tokens': int(max_output_tokens)}

    def _build_temperature_payload(self, model_name: str, temperature: Optional[float]) -> Dict[str, float]:
        if temperature is None:
            return {}
        if str(model_name or '').lower().startswith('gpt-5'):
            return {}
        return {'temperature': float(temperature)}

    def _perform_openai_json_call(
        self,
        *,
        system_prompt: str,
        messages: Sequence[Dict[str, str]],
        model_name: str,
        call_profile: Dict[str, object],
        temperature: Optional[float],
        expect_text_response: bool,
    ) -> Dict[str, object]:
        compact_messages = self._shrink_messages(messages, call_profile)
        payload: Dict[str, Any] = {
            'model': model_name,
            'messages': [
                {'role': self._instruction_role(model_name), 'content': system_prompt},
                *compact_messages,
            ],
            'response_format': {'type': 'json_object'},
        }
        payload.update(self._build_temperature_payload(model_name, temperature))
        payload.update(self._build_token_limit_payload(model_name, int(call_profile.get('maxOutputTokens', 0) or 0)))

        request = urllib.request.Request(
            OPENAI_ENDPOINT,
            data=json.dumps(payload).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.api_key}',
            },
            method='POST',
        )

        try:
            with urllib.request.urlopen(request, timeout=OPENAI_REQUEST_TIMEOUT_SECONDS) as response:
                data = json.loads(response.read().decode('utf-8'))
        except urllib.error.HTTPError as err:
            body = err.read().decode('utf-8', errors='ignore')
            try:
                parsed = json.loads(body)
                detail = parsed.get('error', {}).get('message') or body
            except json.JSONDecodeError:
                detail = body or 'Bilinmeyen hata'
            raise RuntimeError(f'API Hatasi ({err.code}): {detail}') from err
        except urllib.error.URLError as err:
            reason = getattr(err, 'reason', err)
            if isinstance(reason, socket.timeout):
                raise RuntimeError(f'API zaman asimina ugradi ({model_name}).') from err
            raise RuntimeError(f'API baglanti hatasi ({model_name}): {reason}') from err
        except TimeoutError as err:
            raise RuntimeError(f'API zaman asimina ugradi ({model_name}).') from err

        content = (((data.get('choices') or [{}])[0].get('message') or {}).get('content') or '').strip()
        if not content:
            raise RuntimeError('GPT bos cevap dondurdu.')

        parsed_content = json.loads(content)
        if not expect_text_response:
            return parsed_content

        text = str(parsed_content.get('text', '')).strip()
        if not text:
            raise RuntimeError('GPT gecerli metin dondurmedi.')
        return {
            'text': text,
            'clues_found': [clue_id for clue_id in parsed_content.get('clues_found', []) if clue_id] if isinstance(parsed_content.get('clues_found'), list) else [],
            'summary': str(parsed_content.get('summary', '')).strip(),
        }

    def _call_openai_with_fallback(
        self,
        *,
        system_prompt: str,
        messages: Sequence[Dict[str, str]],
        call_profile: Dict[str, object],
        temperature: Optional[float],
        expect_text_response: bool,
    ) -> Dict[str, object]:
        model_name = str(call_profile.get('model') or self.model)
        fallback_model = call_profile.get('fallbackModel')
        try:
            return self._perform_openai_json_call(
                system_prompt=system_prompt,
                messages=messages,
                model_name=model_name,
                call_profile=call_profile,
                temperature=temperature,
                expect_text_response=expect_text_response,
            )
        except Exception:
            if not fallback_model or fallback_model == model_name:
                raise
            retry_profile = dict(call_profile)
            retry_profile['model'] = fallback_model
            return self._perform_openai_json_call(
                system_prompt=system_prompt,
                messages=messages,
                model_name=str(fallback_model),
                call_profile=retry_profile,
                temperature=temperature,
                expect_text_response=expect_text_response,
            )

    def _prepare_action(self, action: str, target_id: Optional[str], user_message: str = '') -> Dict[str, object]:
        return self._run_bridge('prepare_action', action=action, targetId=target_id, userMessage=user_message)

    def _finalize_action(
        self,
        *,
        interaction_type: str,
        target_id: Optional[str],
        user_message: str,
        allowed_clue_ids: Sequence[str],
        raw_response: Dict[str, object],
    ) -> Dict[str, object]:
        return self._run_bridge(
            'finalize_action',
            interactionType=interaction_type,
            targetId=target_id,
            userMessage=user_message,
            allowedClueIds=list(allowed_clue_ids),
            rawResponse=raw_response,
        )

    def _judge_types(self) -> Set[str]:
        return {'location_chat', 'character_chat', 'clue_examine'}

    def _execute_gpt_action(
        self,
        *,
        action: str,
        target_id: Optional[str],
        recent_messages: Sequence[Dict[str, str]],
        user_message: str = '',
        prepared: Optional[Dict[str, object]] = None,
    ) -> Tuple[Dict[str, object], str, Optional[Dict[str, object]]]:
        prepared = prepared or self._prepare_action(action, target_id, user_message)
        interaction_type = str(prepared.get('interactionType') or action)
        effective_user_message = str(prepared.get('userMessage') or user_message)
        base_system_prompt = str(prepared.get('systemPrompt') or '')
        current_system_prompt = base_system_prompt
        allowed_clue_ids = prepared.get('allowedClueIds') if isinstance(prepared.get('allowedClueIds'), list) else []
        lore_intent = prepared.get('loreIntent') if isinstance(prepared.get('loreIntent'), dict) else None
        call_profile = prepared.get('callProfile') if isinstance(prepared.get('callProfile'), dict) else {'model': self.model}
        forced_response = prepared.get('forcedResponse') if isinstance(prepared.get('forcedResponse'), dict) else None
        temperature = prepared.get('temperature')
        messages = list(recent_messages)
        if action in {'location_enter', 'character_meet'} and not messages:
            messages = [{'role': 'user', 'content': effective_user_message}]
        max_retries = 2 if interaction_type in self._judge_types() else 0
        attempts = 0
        last_verdict: Dict[str, object] = {}

        while True:
          if forced_response and attempts == 0:
              raw_response = forced_response
          else:
              raw_response = self._call_openai_with_fallback(
                  system_prompt=current_system_prompt,
                  messages=messages,
                  call_profile=call_profile,
                  temperature=temperature if isinstance(temperature, (int, float)) else None,
                  expect_text_response=True,
              )
          finalized = self._finalize_action(
              interaction_type=interaction_type,
              target_id=target_id,
              user_message=effective_user_message,
              allowed_clue_ids=allowed_clue_ids,
              raw_response=raw_response,
          )

          if interaction_type not in self._judge_types():
              finalized['judge'] = {
                  'applied': False,
                  'approved': True,
                  'attempts': attempts + 1,
                  'finalAction': 'approved',
                  'issues': [],
                  'reason': '',
                  'retryInstruction': '',
              }
              return finalized, effective_user_message, lore_intent

          try:
              judge_prepared = self._run_bridge(
                  'judge_prepare',
                  interactionType=interaction_type,
                  targetId=target_id,
                  userMessage=effective_user_message,
                  recentMessages=messages,
                  candidateResponse=finalized,
              )
              raw_verdict = self._call_openai_with_fallback(
                  system_prompt=str(judge_prepared.get('systemPrompt') or ''),
                  messages=[{'role': 'user', 'content': str(judge_prepared.get('userPayload') or '')}],
                  call_profile=judge_prepared.get('callProfile') if isinstance(judge_prepared.get('callProfile'), dict) else {'model': self.model},
                  temperature=0.2,
                  expect_text_response=False,
              )
              verdict = self._run_bridge(
                  'normalize_judge_verdict',
                  interactionType=interaction_type,
                  loreIntent=judge_prepared.get('loreIntent') if isinstance(judge_prepared.get('loreIntent'), dict) else lore_intent,
                  rawVerdict=raw_verdict,
              )
          except Exception as err:
              fallback_text = self._run_bridge(
                  'judge_fallback_text',
                  interactionType=interaction_type,
                  loreIntent=lore_intent,
              ).get('text', 'Bu konuda su an net bir sey cikaramiyorum. Istersen baska bir acidan sor.')
              return {
                  'text': fallback_text,
                  'clues_found': [],
                  'summary': '',
                  'judge': {
                      'applied': True,
                      'approved': False,
                      'attempts': attempts + 1,
                      'finalAction': 'fallback',
                      'issues': ['judge_error'],
                      'reason': str(err),
                      'retryInstruction': '',
                  },
              }, effective_user_message, lore_intent

          if verdict.get('approved'):
              finalized['judge'] = {
                  'applied': True,
                  'approved': True,
                  'attempts': attempts + 1,
                  'finalAction': 'approved',
                  'issues': verdict.get('issues', []),
                  'reason': verdict.get('reason', ''),
                  'retryInstruction': verdict.get('retryInstruction', ''),
              }
              return finalized, effective_user_message, lore_intent

          last_verdict = verdict
          if attempts >= max_retries:
              fallback_text = self._run_bridge(
                  'judge_fallback_text',
                  interactionType=interaction_type,
                  loreIntent=lore_intent,
              ).get('text', 'Bu konuda su an net bir sey cikaramiyorum. Istersen baska bir acidan sor.')
              return {
                  'text': fallback_text,
                  'clues_found': [],
                  'summary': '',
                  'judge': {
                      'applied': True,
                      'approved': False,
                      'attempts': attempts + 1,
                      'finalAction': 'fallback',
                      'issues': verdict.get('issues', []),
                      'reason': verdict.get('reason', ''),
                      'retryInstruction': verdict.get('retryInstruction', ''),
                  },
              }, effective_user_message, lore_intent

          retry_payload = self._run_bridge(
              'judge_retry_prompt',
              baseSystemPrompt=base_system_prompt,
              rejectedResponse=finalized,
              judgeVerdict=verdict,
          )
          current_system_prompt = str(retry_payload.get('systemPrompt') or base_system_prompt)
          attempts += 1

    def _apply_character_passive_drift(self, character_id: str) -> None:
        if not self.gpt_enabled():
            return
        bridge_result = self._run_bridge('character_passive_drift', interactionType='character_chat', targetId=character_id)
        self.state.character_states = bridge_result.get('characterStates') or self.state.character_states

    def _apply_character_player_message(self, character_id: str, user_message: str) -> None:
        if not self.gpt_enabled():
            return
        bridge_result = self._run_bridge(
            'character_before_message',
            interactionType='character_chat',
            targetId=character_id,
            userMessage=user_message,
        )
        self.state.character_states = bridge_result.get('characterStates') or self.state.character_states

    def _finalize_character_state(self, character_id: str, response: Dict[str, object]) -> None:
        if not self.gpt_enabled():
            return
        bridge_result = self._run_bridge(
            'character_after_response',
            interactionType='character_chat',
            targetId=character_id,
            response=response,
        )
        self.state.character_states = bridge_result.get('characterStates') or self.state.character_states

    def _upsert_lore_entry(self, entry: Dict[str, object]) -> None:
        entries = self.state.lore_memory.setdefault('entries', {'location': {}, 'clue': {}})
        entries.setdefault('location', {})
        entries.setdefault('clue', {})
        bucket = entries[entry['targetType']].setdefault(entry['targetId'], {})
        existing = bucket.get(entry['slotKey'])
        if existing:
            hints = existing.get('questionHints', []) + entry.get('questionHints', [])
            deduped_hints: List[str] = []
            for hint in hints:
                if hint and hint not in deduped_hints:
                    deduped_hints.append(hint)
            entry['questionHints'] = deduped_hints[-6:]
            entry['createdAt'] = existing.get('createdAt', entry.get('createdAt'))
        bucket[entry['slotKey']] = entry
        self.state.lore_memory['updatedAt'] = entry.get('updatedAt', 0)
        self.state.lore_memory['storyFolder'] = self.story_folder
        self._save_lore_memory()

    def _process_found_clues(self, clue_ids: Sequence[str]) -> None:
        for clue_id in clue_ids:
            if clue_id in self.state.found_clue_ids:
                continue
            self.state.found_clue_ids.add(clue_id)
            clue = self.clues_by_id.get(clue_id)
            if clue:
                print(f"🔍 Yeni ipucu: {clue['name']} — {clue.get('short_description', '')}")
        self.sync_progress(verbose=True)

    def load_terminal_save(self) -> bool:
        if not os.path.isfile(self.save_path):
            return False
        with open(self.save_path, 'r', encoding='utf-8') as handle:
            payload = json.load(handle)
        self.state = TerminalState.from_dict(payload, self.story_folder)
        self._sanitize_state()
        return True

    def _sanitize_state(self) -> None:
        self.state.found_clue_ids &= set(self.clues_by_id)
        self.state.unlocked_report_ids &= set(self.reports_by_id)
        self.state.visited_locations &= set(self.locations_by_id)
        self.state.talked_character_ids &= set(self.characters_by_id)
        if self.state.current_location and self.state.current_location not in self.locations_by_id:
            self.state.current_location = None
        self.state.phase = max(1, min(self.state.phase, max((phase.get('id', 1) for phase in self.phases), default=1)))
        self._ensure_runtime_state()
        self.sync_progress(verbose=False)

    def save_terminal_state(self) -> None:
        os.makedirs(self.save_dir, exist_ok=True)
        with open(self.save_path, 'w', encoding='utf-8') as handle:
            json.dump(self.state.to_dict(), handle, ensure_ascii=False, indent=2)
        self._save_lore_memory()

    def current_phase(self) -> Dict[str, object]:
        return next((phase for phase in self.phases if phase.get('id') == self.state.phase), self.phases[0])

    def is_unlock_condition_met(self, condition: Optional[Dict[str, object]]) -> bool:
        if not condition:
            return True

        condition_type = condition.get('type')
        if condition_type == 'clues':
            return all(clue_id in self.state.found_clue_ids for clue_id in condition.get('required', []))
        if condition_type == 'visited_locations':
            return all(loc_id in self.state.visited_locations for loc_id in condition.get('required', []))
        if condition_type == 'conversations':
            return len(self.state.talked_character_ids) >= int(condition.get('min_count', 0) or 0)
        if condition_type == 'phase':
            return self.state.phase >= int(condition.get('min_phase', 1) or 1)
        if condition_type == 'all':
            return all(self.is_unlock_condition_met(item) for item in condition.get('conditions', []))
        if condition_type == 'any':
            return any(self.is_unlock_condition_met(item) for item in condition.get('conditions', []))
        return False

    def is_location_available(self, location_id: str) -> bool:
        location = self.locations_by_id.get(location_id)
        if not location:
            return False
        phase = self.current_phase()
        if location_id not in phase.get('available_locations', []):
            return False
        unlock_phase = location.get('unlock_phase')
        if unlock_phase is not None and self.state.phase < unlock_phase:
            return False
        return self.is_unlock_condition_met(location.get('unlock_condition'))

    def is_character_available(self, character_id: str) -> bool:
        character = self.characters_by_id.get(character_id)
        if not character:
            return False
        unlock_phase = character.get('unlock_phase')
        if unlock_phase is not None and self.state.phase < unlock_phase:
            return False
        return self.is_unlock_condition_met(character.get('unlock_condition'))

    def available_locations(self) -> List[Dict[str, object]]:
        return [location for location in self.locations if self.is_location_available(location['id'])]

    def available_characters(self) -> List[Dict[str, object]]:
        return [character for character in self.characters if self.is_character_available(character['id'])]

    def sync_progress(self, verbose: bool = True) -> List[str]:
        events: List[str] = []
        changed = True
        while changed:
            changed = False

            for report in self.reports:
                if report['id'] in self.state.unlocked_report_ids:
                    continue
                if not self.is_unlock_condition_met(report.get('unlock_condition')):
                    continue

                self.state.unlocked_report_ids.add(report['id'])
                changed = True
                message = report.get('notification_text') or f"{report['name']} raporu geldi."
                events.append(f'📋 {message}')
                clue_id = report.get('clue_revealed')
                if clue_id and clue_id not in self.state.found_clue_ids:
                    self.state.found_clue_ids.add(clue_id)
                    clue = self.clues_by_id.get(clue_id)
                    if clue:
                        events.append(f"🔍 Yeni ipucu: {clue['name']} — {clue.get('short_description', '')}")

            phase = self.current_phase()
            trigger = phase.get('next_phase_trigger')
            next_phase = next((item for item in self.phases if item.get('id') == self.state.phase + 1), None)
            if trigger and next_phase and self.is_unlock_condition_met(trigger):
                self.state.phase += 1
                changed = True
                events.append(f"📢 Faz ilerledi: {next_phase.get('name')} — {next_phase.get('description', '')}")

        if verbose and events:
            for event in events:
                print(event)
        return events

    def begin_new_game(self) -> None:
        self.state = TerminalState(story_folder=self.story_folder)
        self.state.lore_memory = self._load_lore_memory()
        self._ensure_runtime_state()
        self.save_terminal_state()

    def intro_text(self) -> str:
        intro = self.scenario.get('intro', {})
        return intro.get('text', '').strip()

    def choose_default_location(self) -> None:
        if self.state.current_location and self.is_location_available(self.state.current_location):
            self.state.visited_locations.add(self.state.current_location)
            return
        available = self.available_locations()
        self.state.current_location = available[0]['id'] if available else None
        if self.state.current_location:
            self.state.visited_locations.add(self.state.current_location)

    def describe_story(self) -> None:
        title = self.meta.get('title', self.story_folder)
        subtitle = self.meta.get('subtitle', '')
        print_block(title, subtitle)
        if self.intro_text():
            print(textwrap.dedent(self.intro_text()).strip())
        self.choose_default_location()
        self.print_status()

    def print_status(self) -> None:
        phase = self.current_phase()
        current_location = self.locations_by_id.get(self.state.current_location or '')
        missing = []
        trigger = phase.get('next_phase_trigger')
        if trigger and trigger.get('type') == 'clues':
            missing = [clue_id for clue_id in trigger.get('required', []) if clue_id not in self.state.found_clue_ids]

        lines = [
            format_list_line('Faz', f"{phase.get('id')} · {phase.get('name') or 'Bilinmeyen'}"),
            format_list_line('Bulunan ipucu', f"{len(self.state.found_clue_ids)} / {len(self.clues)}"),
            format_list_line('Bulunulan mekan', current_location.get('name') if current_location else 'Henüz seçilmedi'),
            format_list_line('Açık mekan', ', '.join(location['id'] for location in self.available_locations())),
        ]
        if missing:
            lines.append(format_list_line('Sonraki faz için eksik', ', '.join(missing)))
        if self.state.unlocked_report_ids:
            lines.append(format_list_line('Açılan rapor', ', '.join(sorted(self.state.unlocked_report_ids))))
        print_block('Durum', '\n'.join(lines))

    def list_locations(self) -> None:
        lines = []
        for location in self.available_locations():
            marker = '→' if location['id'] == self.state.current_location else ' '
            tag = entity_tag(location)
            lines.append(
                f"{marker} {location['id']} ({tag}) · {location.get('name')} — {compact_text(location.get('description', ''), 90)}"
            )
        print_block('Mekanlar', '\n'.join(lines) if lines else 'Bu fazda acik mekan yok.')

    def list_characters(self) -> None:
        lines = []
        for character in self.available_characters():
            tag = entity_tag(character)
            lines.append(
                f"- {character['id']} ({tag}) · {character.get('name')} — {character.get('title', '')}"
            )
        print_block('Supheliler', '\n'.join(lines) if lines else 'Bu asamada gorusulebilir supheli yok.')

    def list_clues(self) -> None:
        lines = []
        for clue_id in sorted(self.state.found_clue_ids):
            clue = self.clues_by_id.get(clue_id)
            if not clue:
                continue
            lines.append(f"- {clue_id} ({entity_tag(clue)}) · {clue['name']} — {clue.get('short_description', '')}")
        print_block('Ipuclari', '\n'.join(lines) if lines else 'Henuz bulunmus ipucu yok.')

    def _judge_allows_lore(self, response: Dict[str, object]) -> bool:
        judge = response.get('judge') if isinstance(response.get('judge'), dict) else {}
        return judge.get('approved') is not False and judge.get('finalAction') != 'fallback'

    def _maybe_persist_lore(
        self,
        *,
        interaction_type: str,
        target_id: Optional[str],
        user_message: str,
        response: Dict[str, object],
        lore_intent: Optional[Dict[str, object]],
    ) -> None:
        if not lore_intent or not self._judge_allows_lore(response):
            return
        bridge_result = self._run_bridge(
            'build_lore_entry',
            interactionType=interaction_type,
            targetId=target_id,
            userMessage=user_message,
            responseText=response.get('text', ''),
        )
        entry = bridge_result.get('entry')
        if isinstance(entry, dict):
            self._upsert_lore_entry(entry)

    def _record_assistant_response(
        self,
        *,
        key: str,
        sender_name: str,
        response: Dict[str, object],
        interaction_type: str,
        target_id: Optional[str],
        user_message: str,
        lore_intent: Optional[Dict[str, object]] = None,
        message_kind: Optional[str] = None,
    ) -> None:
        self._add_message(
            key,
            'assistant',
            str(response.get('text', '')).strip(),
            sender_name=sender_name,
            is_clue_found=bool(response.get('clues_found')),
            found_clue_ids=response.get('clues_found', []),
            message_kind=message_kind,
        )
        print_block(sender_name, compact_text(response.get('text', ''), 420))
        self._process_found_clues(response.get('clues_found', []))
        if lore_intent:
            self._maybe_persist_lore(
                interaction_type=interaction_type,
                target_id=target_id,
                user_message=user_message,
                response=response,
                lore_intent=lore_intent,
            )
        else:
            self._append_summary(key, str(response.get('summary', '') or ''))

    def visit_location(self, raw_value: str) -> None:
        location = resolve_entity(self.available_locations(), raw_value)
        if not location:
            print('Acik mekan bulunamadi. `mekanlar` komutuyla listeyi gor.')
            return

        key = self._conversation_key('location', location['id'])
        has_history = bool(self.state.conversations.get(key))
        self.state.current_location = location['id']
        self.state.visited_locations.add(location['id'])
        self.state.turn_count += 1
        self.sync_progress(verbose=True)
        if not has_history:
            entry_text = compact_text(location.get('entry_text', ''), 420)
            if entry_text:
                self._add_message(key, 'system', entry_text)
                print_block(location.get('name', location['id']), entry_text)

            if self.gpt_enabled():
                try:
                    response, effective_user_message, _ = self._execute_gpt_action(
                        action='location_enter',
                        target_id=location['id'],
                        recent_messages=[],
                    )
                    self._record_assistant_response(
                        key=key,
                        sender_name='📍 ' + location.get('name', location['id']),
                        response=response,
                        interaction_type='location_enter',
                        target_id=location['id'],
                        user_message=effective_user_message,
                    )
                except Exception as err:
                    print(f'⚠️ Hata: {err}')
            else:
                lines = [format_list_line('Gorunur', ', '.join(location.get('visible_elements', [])[:6]))]
                if location.get('interactive_objects'):
                    lines.append(format_list_line('Etkilesimli', ', '.join(location.get('interactive_objects', [])[:6])))
                extra = '\n'.join(line for line in lines if line)
                if extra:
                    print(extra)
        else:
            lines = [format_list_line('Gorunur', ', '.join(location.get('visible_elements', [])[:6]))]
            if location.get('interactive_objects'):
                lines.append(format_list_line('Etkilesimli', ', '.join(location.get('interactive_objects', [])[:6])))
            print_block(location.get('name', location['id']), '\n'.join(line for line in lines if line))

        self.save_terminal_state()

    def _visible_match_response(self, location: Dict[str, object], query: str) -> str:
        normalized_query = normalize_text(query)
        visible = location.get('visible_elements', [])
        interactive = location.get('interactive_objects', [])
        if any(keyword in normalized_query for keyword in ('icerde', 'iceride', 'ne var', 'gorunuyor', 'ortam')):
            pieces = []
            if visible:
                pieces.append('Gorunenler: ' + ', '.join(visible[:6]))
            if interactive:
                pieces.append('Elle bakilabilecek seyler: ' + ', '.join(interactive[:6]))
            return '. '.join(pieces) if pieces else 'Bu alanda hemen dikkat ceken yeni bir sey yok.'

        searchable = visible + interactive
        best_item = None
        best_score = 0
        for item in searchable:
            score = semantic_match_score(query, item)
            if score > best_score:
                best_item = item
                best_score = score
        if best_item:
            return f"{best_item} burada gorunuyor. Ama gizli bir delile donusmesi icin daha net bir inceleme yapman gerekiyor."

        return 'Gorunurde dogrulanan seyler bunlarla sinirli. Yeni bir delil icin belirli nesneye daha net yonel.'

    def inspect_current_location(self, query: str) -> None:
        if not self.state.current_location:
            print('Once bir mekana git. `mekanlar` ve `git <mekan_id>` kullanabilirsin.')
            return
        location = self.locations_by_id[self.state.current_location]

        if self.gpt_enabled():
            key = self._conversation_key('location', location['id'])
            prepared = self._prepare_action('location_chat', location['id'], query)
            lore_intent = prepared.get('loreIntent') if isinstance(prepared.get('loreIntent'), dict) else None
            self._add_message(key, 'user', query, message_kind='soft-lore' if lore_intent else None)
            self.state.turn_count += 1
            try:
                response, effective_user_message, lore_intent = self._execute_gpt_action(
                    action='location_chat',
                    target_id=location['id'],
                    recent_messages=self._recent_messages(key),
                    user_message=query,
                    prepared=prepared,
                )
                self._record_assistant_response(
                    key=key,
                    sender_name='📍 ' + location.get('name', location['id']),
                    response=response,
                    interaction_type='location_chat',
                    target_id=location['id'],
                    user_message=effective_user_message,
                    lore_intent=lore_intent,
                    message_kind='soft-lore' if lore_intent else None,
                )
            except Exception as err:
                print(f'⚠️ Hata: {err}')
            self.save_terminal_state()
            return

        hidden_clues = location.get('hidden_clues', [])
        best_hidden_clue = None
        best_match_score = 0
        for hidden_clue in hidden_clues:
            clue_id = hidden_clue.get('clue_id')
            if clue_id in self.state.found_clue_ids:
                continue
            clue = self.clues_by_id.get(clue_id, {})
            match_score = inspection_clue_score(query, hidden_clue, clue)
            if match_score > best_match_score:
                best_hidden_clue = (hidden_clue, clue)
                best_match_score = match_score

        matched_any = best_hidden_clue is not None and best_match_score >= 2
        if matched_any:
            hidden_clue, clue = best_hidden_clue
            clue_id = hidden_clue.get('clue_id')
            self.state.found_clue_ids.add(clue_id)
            print(hidden_clue.get('reveal_text', '').strip())
            if clue:
                print(f"🔍 Yeni ipucu: {clue.get('name')} — {clue.get('short_description', '')}")

        self.state.turn_count += 1
        self.sync_progress(verbose=True)
        self.save_terminal_state()

        if not matched_any:
            print(self._visible_match_response(location, query))

    def inspect_clue(self, raw_value: str) -> None:
        target_value, message = split_target_and_message(raw_value)
        lookup_value = target_value or raw_value
        items = [self.clues_by_id[clue_id] for clue_id in self.state.found_clue_ids if clue_id in self.clues_by_id]
        clue = resolve_entity(items, lookup_value)
        if not clue:
            print('Bulunmus ipucu bulunamadi. `ipuclari` ile listeyi gor.')
            return

        key = self._conversation_key('clue', clue['id'])
        has_history = bool(self.state.conversations.get(key))

        if not has_history:
            system_text = f"{clue.get('name', clue['id'])} ipucunu inceliyorsun.\n{clue.get('short_description', '')}".strip()
            self._add_message(key, 'system', system_text)
            print_block(clue.get('name', clue['id']), system_text)

        if self.gpt_enabled() and message:
            prepared = self._prepare_action('clue_examine', clue['id'], message)
            lore_intent = prepared.get('loreIntent') if isinstance(prepared.get('loreIntent'), dict) else None
            self._add_message(key, 'user', message, message_kind='soft-lore' if lore_intent else None)
            self.state.turn_count += 1
            try:
                response, effective_user_message, lore_intent = self._execute_gpt_action(
                    action='clue_examine',
                    target_id=clue['id'],
                    recent_messages=self._recent_messages(key),
                    user_message=message,
                    prepared=prepared,
                )
                self._record_assistant_response(
                    key=key,
                    sender_name='🔍 ' + clue.get('name', clue['id']),
                    response=response,
                    interaction_type='clue_examine',
                    target_id=clue['id'],
                    user_message=effective_user_message,
                    lore_intent=lore_intent,
                    message_kind='soft-lore' if lore_intent else None,
                )
            except Exception as err:
                print(f'⚠️ Hata: {err}')
            self.save_terminal_state()
            return

        lines = [
            format_list_line('Kisa', clue.get('short_description', '')),
            format_list_line('Detay', clue.get('detailed_description', '')),
            format_list_line('Baglam', clue.get('narrative_purpose', '') or clue.get('description', '')),
            format_list_line('Inceleme notu', clue.get('examination_hints', '')),
        ]
        print_block(clue.get('name', clue['id']), '\n'.join(line for line in lines if line))

    def show_character_profile(self, raw_value: str) -> None:
        character = resolve_entity(self.available_characters(), raw_value)
        if not character:
            print('Gorulebilir supheli bulunamadi. `supheliler` ile listeyi gor.')
            return

        lines = [
            format_list_line('Unvan', character.get('title', '')),
            format_list_line('Gorunum', character.get('appearance', '')),
            format_list_line('Kisilik', character.get('personality', '')),
            format_list_line('Konusma', character.get('speech_style', '')),
            format_list_line('Iddia ettigi alibi', (character.get('alibi') or {}).get('claimed', '')),
        ]
        print_block(character.get('name', character['id']), '\n'.join(line for line in lines if line))

    def talk_to_character(self, raw_value: str, message: str = '') -> None:
        character = resolve_entity(self.available_characters(), raw_value)
        if not character:
            print('Gorusebilir supheli bulunamadi. `supheliler` ile listeyi gor.')
            return

        key = self._conversation_key('character', character['id'])
        has_history = bool(self.state.conversations.get(key))

        if self.gpt_enabled():
            self.state.talked_character_ids.add(character['id'])
            self._apply_character_passive_drift(character['id'])

            if not has_history:
                self.state.turn_count += 1
                try:
                    response, effective_user_message, _ = self._execute_gpt_action(
                        action='character_meet',
                        target_id=character['id'],
                        recent_messages=[],
                    )
                    state = self.state.character_states.get(character['id'])
                    if isinstance(state, dict):
                        state['lastInteractionTurn'] = self.state.turn_count
                    self._record_assistant_response(
                        key=key,
                        sender_name=character.get('name', character['id']),
                        response=response,
                        interaction_type='character_chat',
                        target_id=character['id'],
                        user_message=effective_user_message,
                    )
                except Exception as err:
                    print(f'⚠️ Hata: {err}')
                    self.save_terminal_state()
                    return
                if not message:
                    self.save_terminal_state()
                    return

            if not message:
                print('Bu kisiyle konusmak icin bir soru yazabilirsin: `konus <char_id> mesaj`')
                self.save_terminal_state()
                return

            prepared = self._prepare_action('character_chat', character['id'], message)
            self._add_message(key, 'user', message)
            self._apply_character_player_message(character['id'], message)
            self.state.turn_count += 1
            try:
                response, effective_user_message, _ = self._execute_gpt_action(
                    action='character_chat',
                    target_id=character['id'],
                    recent_messages=self._recent_messages(key),
                    user_message=message,
                    prepared=prepared,
                )
                self._finalize_character_state(character['id'], response)
                self._record_assistant_response(
                    key=key,
                    sender_name=character.get('name', character['id']),
                    response=response,
                    interaction_type='character_chat',
                    target_id=character['id'],
                    user_message=effective_user_message,
                )
            except Exception as err:
                print(f'⚠️ Hata: {err}')
            self.save_terminal_state()
            return

        self.state.talked_character_ids.add(character['id'])
        self.state.turn_count += 1
        self.sync_progress(verbose=False)

        normalized_message = normalize_text(message)
        response = None

        def build_safe_reaction(raw_reaction: str, clue: Dict[str, object]) -> str:
            quoted = extract_direct_quote(raw_reaction)
            if quoted:
                return quoted
            if looks_like_author_note(raw_reaction):
                inconsistency = compact_text((character.get('alibi') or {}).get('inconsistencies', ''), 140)
                if inconsistency:
                    return f"{character.get('name')} delile bakinca temkinleniyor. Anlattigi cizgide bosluk oldugu belli: {inconsistency}"
                return f"{character.get('name')} delile bakinca savunmaya kapanıyor. Net itirafa gitmiyor."
            return raw_reaction

        best_trigger = None
        best_trigger_score = 0
        for clue_id, reaction in (character.get('triggers') or {}).items():
            clue = self.clues_by_id.get(clue_id)
            if clue_id not in self.state.found_clue_ids:
                continue
            match_score = clue_match_score(message, clue_id, clue, str(reaction or ''), character)
            if match_score > best_trigger_score:
                best_trigger = (reaction, clue)
                best_trigger_score = match_score

        if best_trigger and best_trigger_score >= 2:
            reaction, clue = best_trigger
            response = build_safe_reaction(str(reaction or ''), clue)

        if response is None and any(token in normalized_message for token in ('alibi', 'neredeydin', 'o gece', 'gece')):
            response = (character.get('alibi') or {}).get('claimed')

        if response is None:
            for other_id, info in (character.get('relationships') or {}).items():
                other_character = self.characters_by_id.get(other_id)
                keys = [normalize_text(other_id), normalize_text((other_character or {}).get('name', ''))]
                if any(key and key in normalized_message for key in keys):
                    response = info
                    break

        if response is None and message:
            alibi_claim = (character.get('alibi') or {}).get('claimed', '')
            if any(token in normalized_message for token in ('neden', 'niye', 'ne', 'hangi', 'kim')):
                if alibi_claim:
                    response = f"{character.get('name')} savunmada kaliyor. Simdilik cizgisini bozmuyor: {alibi_claim}"
                else:
                    response = f"{character.get('name')} savunmaya geciyor. Bu konuda net konusmuyor."
            elif alibi_claim:
                response = f"{character.get('name')} ayni cizgide kaliyor: {alibi_claim}"
            else:
                response = f"{character.get('name')} bu konuda agzini sikiyor. Daha somut bir delil gormek istiyor."
        if response is None:
            response = f"{character.get('name')} seni olcuyor. Ilk anda sadece su kadar aciliyor: {(character.get('alibi') or {}).get('claimed', 'Konusmak istemiyor.')}"

        self.save_terminal_state()
        print_block(character.get('name', character['id']), compact_text(response, 320))

    def show_advisor_hint(self, message: str = '') -> None:
        key = self._conversation_key('advisor', None)
        has_history = bool(self.state.conversations.get(key))

        if self.gpt_enabled():
            if not has_history:
                system_text = f"{self.advisor.get('name', 'Danisman')} ile gorusmeye basladin. Takildigin konulari sor."
                self._add_message(key, 'system', system_text)
                print_block(self.advisor.get('name', 'Danisman'), system_text)
                if not message:
                    self.save_terminal_state()
                    return

            if message:
                prepared = self._prepare_action('advisor', None, message)
                self._add_message(key, 'user', message)
                self.state.turn_count += 1
                try:
                    response, effective_user_message, _ = self._execute_gpt_action(
                        action='advisor',
                        target_id=None,
                        recent_messages=self._recent_messages(key),
                        user_message=message,
                        prepared=prepared,
                    )
                    self._record_assistant_response(
                        key=key,
                        sender_name=self.advisor.get('name', 'Danisman'),
                        response=response,
                        interaction_type='advisor',
                        target_id=None,
                        user_message=effective_user_message,
                    )
                    self.save_terminal_state()
                    return
                except Exception as err:
                    print(f'⚠️ Hata: {err}')

        for hint in self.advisor.get('hints', []):
            clue_id, condition = parse_condition_text(hint.get('condition', ''))
            if not clue_id:
                continue
            has_clue = clue_id in self.state.found_clue_ids
            if condition == 'yok' and not has_clue:
                print_block(self.advisor.get('name', 'Danisman'), hint.get('text', ''))
                return
            if condition == 'var' and has_clue:
                print_block(self.advisor.get('name', 'Danisman'), hint.get('text', ''))
                return

        missing_required = [clue_id for clue_id in self.accusation.get('required_clues', []) if clue_id not in self.state.found_clue_ids]
        if missing_required:
            print_block(
                self.advisor.get('name', 'Danisman'),
                'Su an dosyayi kapatacak zincir tamam degil. Eksik hatlar: ' + ', '.join(missing_required),
            )
            return
        print_block(self.advisor.get('name', 'Danisman'), 'Dosya teknik olarak suclama asamasina hazir. Son kez delil zincirini oku.')

    def can_accuse(self) -> Tuple[bool, List[str]]:
        required = self.accusation.get('required_clues', [])
        missing = [clue_id for clue_id in required if clue_id not in self.state.found_clue_ids]
        return len(missing) == 0, missing

    def accuse(self, raw_value: str) -> None:
        ok, missing = self.can_accuse()
        if not ok:
            print('Suclama icin dosya hazir degil. Eksik deliller: ' + ', '.join(missing))
            return

        character = resolve_entity(self.characters, raw_value)
        if not character:
            print('Suclanacak isim bulunamadi.')
            return

        self.state.accusation_made = True
        self.state.turn_count += 1
        self.save_terminal_state()

        if character['id'] == self.solution.get('culprit_id'):
            print_block('Sonuc', self.solution.get('full_reveal', 'Dogru kisiyi sectin.'))
        else:
            wrong = self.solution.get('wrong_accusation', {})
            text = '\n'.join(filter(None, [wrong.get('text'), wrong.get('missed_info'), wrong.get('real_story')]))
            print_block('Sonuc', text or 'Yanlis kisiyi sectin.')

    def auto_play(self, story_choice: Optional[str] = None) -> None:
        print_block('Oto Mod', 'Bu mod hic GPT kullanmaz. Lokal tetikleyicilerle dosyayi ilerletir.')
        self.describe_story()
        seen_locations: Set[str] = set()

        while True:
            progress = False
            for location in self.available_locations():
                if location['id'] not in seen_locations or self.state.current_location != location['id']:
                    self.visit_location(location['id'])
                    seen_locations.add(location['id'])
                    progress = True

                for hidden_clue in location.get('hidden_clues', []):
                    clue_id = hidden_clue.get('clue_id')
                    if clue_id in self.state.found_clue_ids:
                        continue
                    before = set(self.state.found_clue_ids)
                    self.inspect_current_location(hidden_clue.get('trigger_hint', ''))
                    if self.state.found_clue_ids != before:
                        progress = True

            ready, _ = self.can_accuse()
            if ready:
                culprit_id = self.solution.get('culprit_id')
                culprit = self.characters_by_id.get(culprit_id or '')
                if culprit:
                    self.accuse(culprit.get('id', ''))
                return

            if not progress:
                print_block('Oto Mod', 'Lokal olarak ilerleyebildigim butun hatlari tukkettim. Buradan sonra manuel bakis gerekebilir.')
                return

    def print_help(self) -> None:
        lines = [
            'yardim                        Komutlari gosterir',
            'durum                         Faz, acik mekan ve delil ozetini gosterir',
            'mekanlar                      Acik mekanlari listeler',
            'git <mekan_id|#tag>           Mekana gider',
            'bak <serbest metin>           Bulundugun mekanda arastirma yapar',
            'ara <serbest metin>           bak ile ayni',
            'ipuclari                      Bulunmus ipuclari listeler',
            'ipucu <clue_id|#tag> [mesaj]  Ipucunu acar; mesaj varsa GPT ile inceler',
            'supheliler                    Acik suphelileri listeler',
            'profil <char_id|#tag>         Suphelinin acik profilini gosterir',
            'konus <char_id> [mesaj]       Supheliyle HTML hattiyla ayni GPT akisinda konusur',
            'danisman [mesaj]              Mesaj varsa GPT danisman, yoksa temel yonlendirme verir',
            'sucla <char_id>               Final suclamayi yapar',
            'kaydet                        Terminal kaydini yazar',
            'cikis                         Kaydedip cikar',
        ]
        print_block('Yardim', '\n'.join(lines))


def choose_story(story_arg: Optional[str]) -> str:
    stories = scan_stories()
    if not stories:
        raise RuntimeError('Hic hikaye bulunamadi.')

    if story_arg:
        direct = resolve_entity([
            {'id': story['klasor'], 'name': story['baslik'], 'tag': story['klasor']} for story in stories
        ], story_arg)
        if direct:
            return direct['id']
        raise RuntimeError(f'Hikaye bulunamadi: {story_arg}')

    print_block('Hikaye Sec', '\n'.join(
        f"{index + 1}. {story['baslik']} ({story['klasor']})" for index, story in enumerate(stories)
    ))
    while True:
        choice = input('Secim: ').strip()
        if choice.isdigit():
            index = int(choice) - 1
            if 0 <= index < len(stories):
                return stories[index]['klasor']
        direct = resolve_entity([
            {'id': story['klasor'], 'name': story['baslik'], 'tag': story['klasor']} for story in stories
        ], choice)
        if direct:
            return direct['id']
        print('Gecerli bir hikaye sec.')


def handle_interrupt(game: TerminalGame, signum, frame) -> None:
    game.save_terminal_state()
    print('\nKayit yazildi. Ctrl+C ile cikis yapildi.')
    raise SystemExit(0)


def run_interactive(game: TerminalGame, start_new: bool) -> None:
    resumed = False
    if not start_new and game.load_terminal_save():
        resumed = True
    if not resumed:
        game.begin_new_game()

    signal.signal(signal.SIGINT, lambda signum, frame: handle_interrupt(game, signum, frame))
    game.describe_story()
    if resumed:
        print_block('Terminal Kaydi', 'Terminal kaydi yuklendi. `durum` ile devam hattini gorebilirsin.')
    game.print_help()

    while True:
        try:
            raw_command = input('\ndedektif> ').strip()
        except EOFError:
            game.save_terminal_state()
            print('\nKayit yazildi. Cikis yapiliyor.')
            return

        if not raw_command:
            continue
        command, rest = split_terminal_command(raw_command)
        args = rest.split() if rest else []

        if command in {'yardim', 'help'}:
            game.print_help()
        elif command == 'durum':
            game.print_status()
        elif command == 'mekanlar':
            game.list_locations()
        elif command == 'git':
            if not rest:
                print('Kullanim: git <mekan_id|#tag>')
                continue
            game.visit_location(rest)
        elif command in {'bak', 'ara'}:
            if not rest:
                print('Kullanim: bak <serbest metin>')
                continue
            game.inspect_current_location(rest)
        elif command == 'ipuclari':
            game.list_clues()
        elif command == 'ipucu':
            if not rest:
                print('Kullanim: ipucu <clue_id|#tag>')
                continue
            game.inspect_clue(rest)
        elif command == 'supheliler':
            game.list_characters()
        elif command == 'profil':
            if not rest:
                print('Kullanim: profil <char_id|#tag>')
                continue
            game.show_character_profile(rest)
        elif command == 'konus':
            target, message = split_target_and_message(rest)
            if not target:
                print('Kullanim: konus <char_id> [mesaj]')
                continue
            game.talk_to_character(target, message)
        elif command == 'danisman':
            game.show_advisor_hint(rest)
        elif command == 'sucla':
            if not rest:
                print('Kullanim: sucla <char_id>')
                continue
            game.accuse(rest)
        elif command == 'kaydet':
            game.save_terminal_state()
            print('Terminal kaydi yazildi.')
        elif command in {'cikis', 'quit', 'exit'}:
            game.save_terminal_state()
            print('Terminal kaydi yazildi. Cikis yapiliyor.')
            return
        else:
            if game.state.current_location and looks_like_freeform_location_query(raw_command):
                game.inspect_current_location(raw_command)
                continue
            print('Bilinmeyen komut. `yardim` yaz.')


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description='DEDEKTIF terminal oyunu')
    parser.add_argument('--mode', choices=['interactive', 'auto'], default='interactive')
    parser.add_argument('--story', help='Hikaye klasoru veya basligi')
    parser.add_argument('--new', action='store_true', help='Terminal kaydini sifirdan baslat')
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    story_folder = choose_story(args.story)
    scenario_path = os.path.join(BASE_DIR, story_folder, 'senaryo.js')
    scenario = read_scenario(scenario_path)
    game = TerminalGame(story_folder=story_folder, scenario=scenario, mode=args.mode)

    if args.mode == 'auto':
        if args.new or not game.load_terminal_save():
            game.begin_new_game()
        signal.signal(signal.SIGINT, lambda signum, frame: handle_interrupt(game, signum, frame))
        game.auto_play(story_choice=story_folder)
        game.save_terminal_state()
        return 0

    run_interactive(game, start_new=args.new)
    return 0


if __name__ == '__main__':
    sys.exit(main())
