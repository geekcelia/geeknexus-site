#!/usr/bin/env python3
"""Focused, dependency-free contract and static regression checks."""
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
import sys
import unittest
from urllib.parse import urlsplit, unquote
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
class Parser(HTMLParser):
 def __init__(self): super().__init__();self.links=[];self.ids=[];self.jsonld=[];self.active=False;self.data=[]
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs)
  for key in ('href','src'):
   if key in attrs:self.links.append(attrs[key])
  if 'id' in attrs:self.ids.append(attrs['id'])
  if tag=='script' and attrs.get('type')=='application/ld+json':self.active=True;self.data=[]
 def handle_data(self,data):
  if self.active:self.data.append(data)
 def handle_endtag(self,tag):
  if tag=='script' and self.active:self.jsonld.append(json.loads(''.join(self.data)));self.active=False
class TestAI(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.data=json.loads((ROOT/'ai/public-info.json').read_text());cls.page=(ROOT/'ai/index.html').read_text();cls.parser=Parser();cls.parser.feed(cls.page)
 def test_generated_consistency(self):subprocess.run([sys.executable,str(ROOT/'tools/build_ai.py'),'--check'],check=True)
 def test_six_categories(self):self.assertEqual([s['id'] for s in self.data['sections']],['company','agentbox','scenarios','process','faq','contact'])
 def test_static_contract(self):
  access=self.data['access'];self.assertEqual(access['mode'],'public_read_only');self.assertEqual(access['mcp_status'],'not_available');self.assertIsNone(access['mcp_endpoint']);self.assertEqual(access['actions_available'],[])
 def test_sources(self):
  sources={s['id']:s for s in self.data['sources']};self.assertEqual(len(sources),5)
  for section in self.data['sections']:
   for item in section['items']:
    self.assertIn(item['status'],['published_description','requires_project_confirmation','not_available_here','usage_guidance'])
    for source in item['source_ids']:self.assertIn(source,sources)
    if not item['source_ids']:self.assertIn(item['status'],['not_available_here','usage_guidance'])
    self.assertIn(html.escape(item['text'],quote=True),self.page);self.assertIn(item['text'],(ROOT/'ai/public-info.md').read_text())
 def test_links_and_unique_ids(self):
  self.assertEqual(len(self.parser.ids),len(set(self.parser.ids)))
  for link in self.parser.links:
   u=urlsplit(link)
   if u.scheme in ('mailto','tel'):continue
   if u.netloc and u.netloc!='www.geeknexus.ai':continue
   if not u.path and u.fragment:self.assertIn(u.fragment,self.parser.ids);continue
   path=ROOT/unquote(u.path.lstrip('/'))
   if path.is_dir():path=path/'index.html'
   self.assertTrue(path.exists(),str(path))
 def test_jsonld(self):
  self.assertEqual(len(self.parser.jsonld),1);ld=self.parser.jsonld[0];self.assertEqual(ld['@type'],'WebPage');self.assertEqual(ld['dateModified'],self.data['reviewed_at']);self.assertNotIn('potentialAction',ld)
 def test_ten_faqs_and_no_form(self):
  self.assertEqual(self.page.count('<details id="faq-'),10);self.assertNotIn('<form',self.page);self.assertNotIn('type="password"',self.page)
 def test_navigation(self):
  for page in ['index.html','company/index.html','commercial/index.html','zh/index.html','zh/company/index.html','zh/commercial/index.html']:
   s=(ROOT/page).read_text();self.assertIn('href="/ai/"',s);self.assertIn('rel="describedby"',s);self.assertEqual(s.count('class="nav-secondary" href="/ai/"'),1)
 def test_sitemap(self):
  root=ET.fromstring((ROOT/'sitemap.xml').read_text());urls=[e.text for e in root.iter() if e.tag.endswith('loc')];self.assertIn('https://www.geeknexus.ai/ai/',urls);self.assertEqual(len(urls),len(set(urls)))
 def test_freshness(self):
  sw=(ROOT/'service-worker.js').read_text();self.assertIn('fetch(request, { cache: "no-store" })',sw)
  for path in ['/ai/public-info.json','/ai/public-info.md','/llms.txt']:self.assertIn(path,sw)
 def test_scope_protections(self):
  for phrase in ['MCP 服务尚未开放','不保证任何平台自动发现','不是自动可约时段','前雇主经历','发送邮件不代表预约成功']:
   self.assertIn(phrase,self.page)
if __name__=='__main__':unittest.main(verbosity=2)
