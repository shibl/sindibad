"""Local preview for Sindibad Studios, without stale browser asset caches."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
from urllib.parse import urlsplit, urlunsplit


class PreviewHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parts = urlsplit(self.path)
        if not parts.path.startswith("/Studio/"):
            if parts.path == "/lab.html":
                target = "/Studio/TheCurriculum/Classes/Grade10/Chemistry/Web/lab.html"
            else:
                target = "/Studio/Website/Web" + ("/home/" if parts.path == "/" else parts.path)
            self.send_response(302)
            self.send_header("Location", urlunsplit(("", "", target, parts.query, parts.fragment)))
            self.end_headers()
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=5321)
    args = parser.parse_args()
    # Both projects are siblings; serve the checkout so their links resolve.
    directory = Path(__file__).resolve().parents[3]
    handler = partial(PreviewHandler, directory=str(directory))
    server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    print(f"Sindibad Studios: http://127.0.0.1:{args.port}/Studio/Website/Web/home/", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
