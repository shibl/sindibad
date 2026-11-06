"""Check built entry pages and their local script/style/image dependencies."""
from html.parser import HTMLParser
from pathlib import Path
import sys
from urllib.parse import unquote, urlsplit


class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag in ('script', 'img', 'source', 'iframe') and attrs.get('src'):
            self.urls.append(attrs['src'])
        if tag == 'link' and attrs.get('rel') in ('stylesheet', 'modulepreload', 'preload', 'icon'):
            self.urls.append(attrs.get('href', ''))


def check(root):
    for required in ('index.html', 'ar/index.html'):
        if not (root / required).is_file():
            raise ValueError(f'Missing {required}')
    for page in root.rglob('*.html'):
        parser = References()
        parser.feed(page.read_text())
        for url in parser.urls:
            parts = urlsplit(url)
            if parts.scheme or parts.netloc or not parts.path:
                continue
            path = unquote(parts.path)
            asset = root / path.lstrip('/') if path.startswith('/') else page.parent / path
            if not asset.exists():
                raise ValueError(f'{page.relative_to(root)} references missing {url}')
    print('Built English/Arabic pages and local entry dependencies are valid.')


if __name__ == '__main__':
    check(Path(sys.argv[1]))
