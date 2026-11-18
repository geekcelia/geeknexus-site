import unittest
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
class Parser(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.tags=[]; self.feed(text)
    def handle_starttag(self, tag, attrs):
        self.tags.append((tag,dict(attrs)))

class GoodsTests(unittest.TestCase):
    def test_locales_assets_canonical_and_security(self):
        for path,lang in [('goods','zh-CN'),('en/goods','en')]:
            with self.subTest(path=path):
                text=(ROOT/path/'index.html').read_text()
                nodes=Parser(text).tags
                self.assertIn(('html',{'lang':lang}),nodes)
                self.assertTrue(any(t=='link' and a.get('rel')=='canonical' and a.get('href')==f'https://www.geeknexus.ai/{path}/' for t,a in nodes))
                csp=next(a['content'] for t,a in nodes if t=='meta' and a.get('http-equiv')=='Content-Security-Policy')
                for rule in ["default-src 'none'","connect-src 'none'","form-action 'none'","object-src 'none'"]:
                    self.assertIn(rule,csp)
                for t,a in nodes:
                    self.assertNotIn(t,('form','iframe','input','object'))
                    self.assertFalse(any(k.startswith('on') for k in a))
                    if t=='script': self.assertTrue(a.get('src','').startswith('/'))
                    for k in ('href','src'):
                        u=a.get(k,'')
                        self.assertFalse(u.startswith('javascript:'))
                        if u.startswith('/') and not u.startswith('//'):
                            self.assertTrue((ROOT/urlsplit(u).path.lstrip('/')).exists(),u)
                self.assertEqual(text.count('data-product='),2)
    def test_safe_client_logic(self):
        js=(ROOT/'goods/goods.mjs').read_text()
        for unsafe in ['innerHTML','eval(', 'fetch(', 'XMLHttpRequest', 'document.write']:
            self.assertNotIn(unsafe,js)
        self.assertIn('textContent',js)
        self.assertIn('showModal()',js)
    def test_sitemap(self):
        tree=ET.parse(ROOT/'sitemap.xml')
        urls=[n.text for n in tree.iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
        self.assertIn('https://www.geeknexus.ai/goods/',urls)
        self.assertIn('https://www.geeknexus.ai/en/goods/',urls)

if __name__=='__main__': unittest.main()
