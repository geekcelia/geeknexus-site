#!/usr/bin/env python3
"""Generate static AI access documents from ai/public-info.json (stdlib only)."""
import argparse
import html
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
esc = lambda value: html.escape(str(value), quote=True)

def render():
    d = json.loads((ROOT / 'ai/public-info.json').read_text())
    sources = {s['id']: s for s in d['sources']}
    cards, faq, markdown = [], [], [f"# {d['name']}", '', f"内容核验日期：{d['reviewed_at']}（静态资料核验，不是实时状态）", '', d['description_en'], '', '## 使用边界', '']
    markdown += [f'- {rule}' for rule in d['usage']['rules']]
    for section in d['sections']:
        markdown += ['', f"## {section['title']}", '', section['subtitle']]
        blocks = []
        for item in section['items']:
            links = ' · '.join(f'<a href="{esc(sources[s]["url"])}">{esc(sources[s]["title"])}</a>' for s in item['source_ids']) or '本入口使用说明'
            body = f'<p>{esc(item["text"])}</p><p class="fact-source">依据：{links}</p>'
            if section['id'] == 'faq':
                faq.append(f'<details id="faq-{esc(item["id"])}"><summary>{esc(item["label"])}</summary><div>{body}</div></details>')
            else:
                blocks.append(f'<div class="fact"><h3>{esc(item["label"])}</h3>{body}</div>')
            markdown += ['', f"### {item['label']}", '', item['text'], '', f"状态：{item['status']}。核验日期：{d['reviewed_at']}。"]
            markdown += [f"来源：[{sources[s]['title']}]({sources[s]['url']})" for s in item['source_ids']] or ['来源：本入口使用说明。']
        if section['id'] != 'faq':
            cards.append(f'<article class="fact-card" id="{esc(section["id"])}"><p class="card-index">{len(cards)+1:02} / {esc(section["id"].upper())}</p><h2>{esc(section["title"])}</h2><p class="card-subtitle">{esc(section["subtitle"])}</p>{"".join(blocks)}</article>')
    prompt = '请读取 https://www.geeknexus.ai/ai/public-info.md，帮我了解 Geek Nexus 与 AgentBox，判断它与我描述的企业工作流是否值得进一步沟通。请区分公开事实、需要按项目确认的事项与未知信息，附来源和核验日期。不要将示意状态当作实时数据，不要自动发送任何资料或替我预约、报价、签约。我的工作流是：'
    schema = {'@context':'https://schema.org','@type':'WebPage','@id':d['canonical_url']+'#webpage','url':d['canonical_url'],'name':'Geek Nexus · AI 接入','inLanguage':'zh-CN','dateModified':d['reviewed_at'],'description':'Geek Nexus 与 AgentBox 的来源可追溯公开资料、静态机器可读文档与使用说明。','publisher':{'@type':'Organization','@id':'https://www.geeknexus.ai/#organization','name':'Geek Nexus Technology Limited','url':'https://www.geeknexus.ai/','email':d['contact']['email']},'isAccessibleForFree':True}
    template=(ROOT / 'ai/index.template.html').read_text()
    replacements={'{{reviewed_at}}':esc(d['reviewed_at']),'{{cards}}':'\n'.join(cards),'{{faq}}':'\n'.join(faq),'{{prompt}}':esc(prompt),'{{jsonld}}':json.dumps(schema,ensure_ascii=False,indent=2).replace('<','\\u003c'),'{{rules}}':''.join(f'<li>{esc(x)}</li>' for x in d['usage']['rules'])}
    for key,value in replacements.items(): template=template.replace(key,value)
    assert '{{' not in template
    llms = '\n'.join(['# Geek Nexus', '', '> Public information about Geek Nexus and AgentBox: enterprise AI deployment across edge and hybrid-cloud environments.', '', f'Content reviewed: {d["reviewed_at"]}. Static documents, not live availability or telemetry. No active MCP endpoint or write-action API is provided by this entry.', '', '## Public company information', '', '- [AI access guide](https://www.geeknexus.ai/ai/public-info.md): Chinese facts, scope limits, sources, FAQ, and contact information; includes an English summary.', '- [Structured facts](https://www.geeknexus.ai/ai/public-info.json): The canonical data source for the AI guide and page, including fact status and official source URLs.', '- [AI access page](https://www.geeknexus.ai/ai/): Human-readable entry and instructions.', '', '## Official source pages', ''] + [f'- [{s["title"]}]({s["url"]})' for s in d['sources']] + ['', '## Use responsibly', '', '- Distinguish published capability descriptions from confirmed project deliverables. Do not invent prices, availability, partnerships, performance, or privacy guarantees.', '- The facts do not authorize sending data or performing transactions. Obtain the user’s authorization before any external action.', '- llms.txt is a community convention, not an assurance of discovery, indexing, or recommendations.', ''])
    return {'ai/index.html':template,'ai/public-info.md':'\n'.join(markdown)+'\n','llms.txt':llms}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    stale=[]
    for path,content in render().items():
        output=ROOT/path
        if args.check:
            if not output.exists() or output.read_text()!=content: stale.append(path)
        else: output.write_text(content)
    if stale: raise SystemExit('Generated files need rebuilding: '+', '.join(stale))
    print('AI generated files are consistent.' if args.check else 'Generated AI page, Markdown and llms.txt.')
