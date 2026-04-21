#!/usr/bin/env python3
"""
DEDEKTİF - Otomatik Hikaye Tarayıcı, Kayıt Sistemi ve Sunucu Başlatıcı
Alt klasörleri tarar, senaryo.js içeren klasörleri bulur,
hikayeler.json'ı oluşturur ve HTTP sunucusunu başlatır.
"""
import os
import re
import json
import http.server
import socketserver
import webbrowser
import sys
import signal
import subprocess
import time
from urllib.parse import urlparse, parse_qs

PORT = int(os.environ.get('PORT', '8080'))
GAME_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.abspath(os.path.join(GAME_DIR, '..'))
SAVE_DIRNAME = 'save'
SAVE_FILENAME = 'game_state.json'
LORE_FILENAME = 'lore_genisletme.json'
EVENT_LOG_FILENAME = 'event_log.json'
ALLOW_BROWSER_API_FILE = os.environ.get('DEDEKTIF_ALLOW_BROWSER_API_FILE', '').strip().lower() in {
    '1', 'true', 'yes', 'on'
}

SKIP_FOLDERS = {'GAME', 'hikaye şablonu', 'node_modules', '.git', '__pycache__'}


def extract_meta(senaryo_path):
    """senaryo.js dosyasından meta bilgilerini regex ile çeker."""
    with open(senaryo_path, encoding='utf-8') as f:
        text = f.read()

    def grab(key):
        # "key" sonrası tırnak içini yakalar:  key: "...",  key: '...',  key: `...`
        m = re.search(rf'{key}\s*:\s*["\x27`]([^"\x27`]+)["\x27`]', text)
        return m.group(1).strip() if m else ''

    estimated_playtime = grab('estimated_playtime')
    target_interactions = grab('target_interactions')

    return {
        'title':    grab('title'),
        'subtitle': grab('subtitle'),
        'version':  grab('version'),
        'ikon':     grab('ikon') or grab('icon'),
        'sure':     grab('sure') or estimated_playtime,
        'zorluk':   grab('zorluk') or target_interactions,
    }


def scan_stories():
    """DEDEKTİF klasörünü tarar, senaryo.js içeren alt klasörleri döndürür."""
    stories = []
    for entry in sorted(os.listdir(BASE_DIR)):
        full = os.path.join(BASE_DIR, entry)
        if not os.path.isdir(full):
            continue
        if entry in SKIP_FOLDERS or entry.startswith('.'):
            continue
        senaryo_path = os.path.join(full, 'senaryo.js')
        if not os.path.isfile(senaryo_path):
            continue

        meta = extract_meta(senaryo_path)
        stories.append({
            'klasor':    entry,
            'baslik':    meta['title'] or entry,
            'altbaslik': meta['subtitle'] or '',
            'ikon':      meta['ikon'] or '',
            'sure':      meta['sure'] or '',
            'zorluk':    meta['zorluk'] or '',
        })

    return stories


def write_manifest(stories):
    """hikayeler.json dosyasını yazar."""
    path = os.path.join(GAME_DIR, 'hikayeler.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(stories, f, ensure_ascii=False, indent=2)
    return path


def resolve_story_paths(story_folder):
    """Güvenli hikaye klasörü ve save dosya yollarını döndürür."""
    if not story_folder:
        raise ValueError('Hikaye klasörü belirtilmedi.')

    story_path = os.path.abspath(os.path.join(BASE_DIR, story_folder))
    if not story_path.startswith(BASE_DIR + os.sep):
        raise ValueError('Geçersiz hikaye klasörü.')
    if not os.path.isdir(story_path):
        raise FileNotFoundError('Hikaye klasörü bulunamadı.')
    if not os.path.isfile(os.path.join(story_path, 'senaryo.js')):
        raise FileNotFoundError('Seçilen klasörde senaryo.js bulunamadı.')

    save_dir = os.path.join(story_path, SAVE_DIRNAME)
    save_file = os.path.join(save_dir, SAVE_FILENAME)
    return story_path, save_dir, save_file


def resolve_story_artifact_path(story_folder, artifact_name):
    """Hikaye klasörü içindeki güvenli artifact dosya yolunu döndürür."""
    story_path, save_dir, _ = resolve_story_paths(story_folder)
    safe_name = os.path.basename(artifact_name or '')
    allowed_artifacts = {LORE_FILENAME, EVENT_LOG_FILENAME}
    if safe_name != artifact_name or safe_name not in allowed_artifacts:
        raise ValueError('Geçersiz hikaye artifact adı.')

    if safe_name == EVENT_LOG_FILENAME:
        return story_path, os.path.join(save_dir, safe_name)

    return story_path, os.path.join(story_path, safe_name)


class DedektifRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Statik dosyalar + save/load endpoint'leri."""

    def send_json(self, status_code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def send_redirect(self, location):
        self.send_response(302)
        self.send_header('Location', location)
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()

    def send_text(self, status_code, content, content_type='text/plain; charset=utf-8'):
        body = (content or '').encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def get_story_folder_from_request(self, query, body=None):
        story_folder = query.get('story', [''])[0]
        if not story_folder and isinstance(body, dict):
            story_folder = body.get('storyFolder', '')
        if not story_folder:
            raise ValueError('Hikaye klasörü belirtilmedi.')
        return story_folder

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/':
            self.send_redirect('/GAME/index.html')
            return

        if parsed.path in {'/api', '/GAME/api'}:
            if not ALLOW_BROWSER_API_FILE:
                self.send_error(404)
                return

            api_file = os.path.join(GAME_DIR, 'api')
            if not os.path.isfile(api_file):
                self.send_error(404)
                return

            with open(api_file, 'r', encoding='utf-8') as f:
                self.send_text(200, f.read())
            return

        if parsed.path == '/__save':
            try:
                query = parse_qs(parsed.query)
                story_folder = self.get_story_folder_from_request(query)
                _, _, save_file = resolve_story_paths(story_folder)

                if not os.path.isfile(save_file):
                    self.send_json(404, {'ok': False, 'error': 'Kayıt bulunamadı.'})
                    return

                with open(save_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                self.send_json(200, {'ok': True, 'data': data})
            except ValueError as err:
                self.send_json(400, {'ok': False, 'error': str(err)})
            except FileNotFoundError as err:
                self.send_json(404, {'ok': False, 'error': str(err)})
            except Exception as err:
                self.send_json(500, {'ok': False, 'error': f'Kayıt okunamadı: {err}'})
            return

        if parsed.path in {'/__lore', '/__log'}:
            try:
                query = parse_qs(parsed.query)
                story_folder = self.get_story_folder_from_request(query)
                artifact_name = LORE_FILENAME if parsed.path == '/__lore' else EVENT_LOG_FILENAME
                not_found_message = 'Lore kaydı bulunamadı.' if parsed.path == '/__lore' else 'Olay günlüğü bulunamadı.'
                read_error_prefix = 'Lore kaydı okunamadı' if parsed.path == '/__lore' else 'Olay günlüğü okunamadı'
                _, artifact_file = resolve_story_artifact_path(story_folder, artifact_name)

                if not os.path.isfile(artifact_file):
                    self.send_json(404, {'ok': False, 'error': not_found_message})
                    return

                with open(artifact_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                self.send_json(200, {'ok': True, 'data': data})
            except ValueError as err:
                self.send_json(400, {'ok': False, 'error': str(err)})
            except FileNotFoundError as err:
                self.send_json(404, {'ok': False, 'error': str(err)})
            except Exception as err:
                self.send_json(500, {'ok': False, 'error': f'{read_error_prefix}: {err}'})
            return

        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path not in {'/__save', '/__lore', '/__log'}:
            self.send_error(404)
            return

        try:
            content_length = int(self.headers.get('Content-Length', '0'))
            raw_body = self.rfile.read(content_length) if content_length > 0 else b'{}'
            body = json.loads(raw_body.decode('utf-8') or '{}')
        except json.JSONDecodeError:
            self.send_json(400, {'ok': False, 'error': 'Geçersiz JSON içeriği.'})
            return

        try:
            query = parse_qs(parsed.query)
            story_folder = self.get_story_folder_from_request(query, body)
            data = body.get('data')
            if not isinstance(data, dict):
                raise ValueError('Kaydedilecek veri bulunamadı.')

            if parsed.path == '/__save':
                _, save_dir, save_file = resolve_story_paths(story_folder)
                os.makedirs(save_dir, exist_ok=True)
                with open(save_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)

                self.send_json(200, {
                    'ok': True,
                    'path': os.path.relpath(save_file, BASE_DIR)
                })
                return

            artifact_name = LORE_FILENAME if parsed.path == '/__lore' else EVENT_LOG_FILENAME
            artifact_label = 'Lore' if parsed.path == '/__lore' else 'Event log'
            _, artifact_file = resolve_story_artifact_path(story_folder, artifact_name)
            if parsed.path == '/__log':
                os.makedirs(os.path.dirname(artifact_file), exist_ok=True)
            with open(artifact_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            self.send_json(200, {
                'ok': True,
                'path': os.path.relpath(artifact_file, BASE_DIR),
                'artifact': artifact_label.lower()
            })
        except ValueError as err:
            self.send_json(400, {'ok': False, 'error': str(err)})
        except FileNotFoundError as err:
            self.send_json(404, {'ok': False, 'error': str(err)})
        except Exception as err:
            self.send_json(500, {'ok': False, 'error': f'Kayıt yazılamadı: {err}'})

    def do_DELETE(self):
        parsed = urlparse(self.path)
        if parsed.path not in {'/__save', '/__log'}:
            self.send_error(404)
            return

        try:
            query = parse_qs(parsed.query)
            story_folder = self.get_story_folder_from_request(query)
            if parsed.path == '/__save':
                _, save_dir, artifact_file = resolve_story_paths(story_folder)
            else:
                _, save_dir, _ = resolve_story_paths(story_folder)
                _, artifact_file = resolve_story_artifact_path(story_folder, EVENT_LOG_FILENAME)

            removed = False
            if os.path.isfile(artifact_file):
                os.remove(artifact_file)
                removed = True

            if os.path.isdir(save_dir) and not os.listdir(save_dir):
                os.rmdir(save_dir)

            self.send_json(200, {'ok': True, 'removed': removed})
        except ValueError as err:
            self.send_json(400, {'ok': False, 'error': str(err)})
        except FileNotFoundError as err:
            self.send_json(404, {'ok': False, 'error': str(err)})
        except Exception as err:
            self.send_json(500, {'ok': False, 'error': f'Kayıt silinemedi: {err}'})


class ThreadingTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    # Statik dosya kökü DEDEKTİF klasörü olsun (senaryolar ve GAME birlikte sunulsun)
    os.chdir(BASE_DIR)

    # 1) Tara
    stories = scan_stories()
    if not stories:
        print('⚠️  Hiç hikaye bulunamadı! Alt klasörlere senaryo.js dosyası ekleyin.')
        sys.exit(1)

    # 2) Manifest yaz
    path = write_manifest(stories)
    print(f'✅  {len(stories)} hikaye bulundu → GAME/hikayeler.json güncellendi')
    for s in stories:
        print(f'   📂 {s["klasor"]}/  →  {s["baslik"]}')

    # 3) Meşgul portu temizle
    try:
        result = subprocess.run(
            ['lsof', '-ti', f':{PORT}'],
            capture_output=True, text=True
        )
        if result.stdout.strip():
            for pid in result.stdout.strip().split('\n'):
                pid = pid.strip()
                if pid:
                    os.kill(int(pid), signal.SIGTERM)
                    print(f'⚠️  Port {PORT} meşguldu, eski süreç (PID {pid}) kapatıldı.')
            time.sleep(0.5)
    except Exception:
        pass

    # 4) Sunucu başlat
    with ThreadingTCPServer(('', PORT), DedektifRequestHandler) as httpd:
        url = f'http://localhost:{PORT}/GAME/index.html'
        print(f'\n🌐  Sunucu başlatıldı: {url}')
        print('    Durdurmak için Ctrl+C\n')
        should_open_browser_env = os.environ.get('DEDEKTIF_OPEN_BROWSER')
        should_open_browser = PORT == 8080 if should_open_browser_env is None else (
            should_open_browser_env.strip().lower() in {'1', 'true', 'yes', 'on'}
        )
        if should_open_browser:
            webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n👋  Sunucu kapatıldı.')


if __name__ == '__main__':
    main()
