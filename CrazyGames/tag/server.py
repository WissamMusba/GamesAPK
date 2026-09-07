#!/usr/bin/env python3
"""
Local development server for Tag Map Editor & Tag Game.
Serves static files and handles auto-saving maps directly to index.html and tag_game.html.
Run:
    python server.py
Then open:
    http://localhost:8000/tag_map_editor.html
"""
import http.server
import json
import os
import re
import sys

PORT = 8000

def format_maps_js(maps_data):
    """Format maps array into clean, human-readable JavaScript code."""
    lines = []
    for m in maps_data:
        name = m.get('name', 'UNTITLED').replace("'", "\\'")
        def fmt_arr(key):
            items = m.get(key, [])
            return ','.join(f"[{','.join(str(v) for v in p)}]" for p in items)
        
        entry = (
            f"  {{\n"
            f"    name: '{name}',\n"
            f"    solids: [{fmt_arr('solids')}],\n"
            f"    speeds: [{fmt_arr('speeds')}],\n"
            f"    drops: [{fmt_arr('drops')}],\n"
            f"    boosts: [{fmt_arr('boosts')}]\n"
            f"  }}"
        )
        lines.append(entry)
    
    return "const MAPS = [\n" + ",\n".join(lines) + "\n];"

def update_file_maps(filepath, maps_js):
    """Replace const MAPS = [...] in the specified file."""
    if not os.path.isfile(filepath):
        return False
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern matches const MAPS = [ ... ];
    pattern = r'const\s+MAPS\s*=\s*\[[\s\S]*?\n\];'
    if not re.search(pattern, content):
        print(f"[WARN] Could not find 'const MAPS = [...]' in {filepath}")
        return False
    
    new_content = re.sub(pattern, maps_js, content, count=1)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"[SAVE] Successfully wrote new MAPS to: {filepath}")
    return True

class TagServerHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Disable caching for seamless dev iterations
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_POST(self):
        if self.path == '/api/save-maps':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                maps_data = json.loads(body)
                if not isinstance(maps_data, list):
                    raise ValueError("Maps payload must be a JSON list")

                maps_js = format_maps_js(maps_data)
                
                cur_dir = os.path.dirname(os.path.abspath(__file__))
                targets = [
                    os.path.join(cur_dir, 'index.html'),
                    os.path.join(cur_dir, 'tag_game.html'),
                    os.path.join(cur_dir, '..', 'tag_game.html'),
                    os.path.join(cur_dir, '..', '..', '..', 'tag_game.html') # Downloads root if present
                ]

                saved_files = []
                for tgt in targets:
                    if update_file_maps(tgt, maps_js):
                        saved_files.append(os.path.basename(tgt))

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                resp = {
                    'ok': True,
                    'saved_files': saved_files,
                    'message': f"Saved {len(maps_data)} maps directly into index.html!"
                }
                self.wfile.write(json.dumps(resp).encode('utf-8'))
                print(f"[SUCCESS] {len(maps_data)} maps written to disk. Ready to git commit & push live!")
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                resp = {'ok': False, 'error': str(e)}
                self.wfile.write(json.dumps(resp).encode('utf-8'))
                print(f"[ERROR] Save failed: {e}")
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == '__main__':
    base_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(base_dir)
    port = PORT
    for try_port in [8000, 8080, 8081, 8088]:
        try:
            server = http.server.ThreadingHTTPServer(('127.0.0.1', try_port), TagServerHandler)
            port = try_port
            break
        except OSError:
            continue

    print("=" * 65)
    print(f"  TAG GAME & MAP EDITOR LOCAL DEV SERVER")
    print(f"  Serving at: http://127.0.0.1:{port}/")
    print(f"  Editor URL: http://127.0.0.1:{port}/tag_map_editor.html")
    print(f"  Game URL:   http://127.0.0.1:{port}/index.html")
    print(f"  Auto-saves directly to index.html on Ctrl+S or 'Quick Save'")
    print("=" * 65)
    server.serve_forever()
