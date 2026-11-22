#!/usr/bin/env python3
"""Serve the Voice Receptionist demo locally (stdlib only, no deps).
Usage: python3 server.py [--port 8000]
Then open http://localhost:8000 — Chrome/Edge for voice, any browser for text.
"""
import http.server
import socketserver
import sys
import os

PORT = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[1] == "--port" else 8000
HERE = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=HERE, **kw)

    def log_message(self, fmt, *args):  # keep output quiet
        sys.stderr.write("  %s\n" % (fmt % args))


# Ensure .js is served as JavaScript (needed for ES modules).
Handler.extensions_map.update({".js": "text/javascript", ".mjs": "text/javascript"})

with socketserver.ThreadingTCPServer(("", PORT), Handler) as httpd:
    print(f"Voice Receptionist demo at http://localhost:{PORT}  (Ctrl+C to stop)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")
