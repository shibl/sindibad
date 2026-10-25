"""Local preview for Sindibad Studios, without stale browser asset caches."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
from urllib.parse import urlsplit, urlunsplit


class PreviewHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parts = urlsplit(self.path)
        if parts.path == "/home":
            self.path = urlunsplit((parts.scheme, parts.netloc, "/home/index.html", parts.query, parts.fragment))
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=5321)
    args = parser.parse_args()
    directory = Path(__file__).resolve().parent
    handler = partial(PreviewHandler, directory=str(directory))
    server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    print(f"Sindibad Studios: http://127.0.0.1:{args.port}/home", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
