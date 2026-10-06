/* Optional visual and interaction regression test. No production service calls. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8765';
  const output = path.join(os.tmpdir(), 'geeknexus-ai-qa'); fs.mkdirSync(output,{recursive:true});
  const context = await browser.newContext({permissions:['clipboard-read','clipboard-write']});
  await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin ? route.continue() : route.abort());
  const page = await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  for(const width of [320,375,390,768,1024,1440]) {
    await page.setViewportSize({width,height:1000}); await page.goto(base+'/ai/',{waitUntil:'networkidle'});
    assert.equal(await page.locator('h1').count(),1);
    const overflow=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>{let r=e.getBoundingClientRect();return r.width && (r.right>innerWidth+1||r.left < -1) && getComputedStyle(e).position!=='fixed'}).map(e=>e.tagName+'.'+e.className));
    assert.deepEqual(overflow,[],`Overflow at ${width}: ${overflow}`);
    if ([390,1440].includes(width)) await page.screenshot({path:path.join(output,`ai-${width}.png`),fullPage:true});
  }
  await page.locator('#copy-prompt').click();
  assert.match(await page.locator('#copy-status').textContent(),/已复制/);
  const copied=await page.evaluate(()=>navigator.clipboard.readText());assert.equal(copied,await page.locator('#agent-prompt').inputValue());
  await page.locator('#copy-prompt').click();assert.match(await page.locator('#copy-status').textContent(),/已复制/);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new DOMException('Denied','NotAllowedError')}},configurable:true}));
  await page.locator('#copy-prompt').click();assert.match(await page.locator('#copy-status').textContent(),/手动复制/);
  assert.equal(await page.locator('#copy-prompt').isEnabled(),true);
  const faq=page.locator('#faq-offline');await faq.locator('summary').click();assert.equal(await faq.getAttribute('open'),'');await faq.locator('summary').click();assert.equal(await faq.getAttribute('open'),null);
  await faq.locator('summary').focus();await page.keyboard.press('Enter');assert.equal(await faq.getAttribute('open'),'');await page.keyboard.press('Enter');assert.equal(await faq.getAttribute('open'),null);
  await page.locator('.ai-hero a[href="/ai/public-info.md"]').click();assert.match(await page.textContent('body'),/Geek Nexus/);await page.goBack();assert.equal(await page.locator('h1').count(),1);
  assert.deepEqual(errors,[]);
  for(const url of ['/ai/public-info.json','/ai/public-info.md','/llms.txt']) {const response=await context.request.get(base+url);assert.equal(response.status(),200);}
  for(const route of ['/','/zh/','/company/','/zh/company/','/commercial/','/zh/commercial/']) {
    for(const width of [390,1440]) {
      await page.setViewportSize({width,height:900});await page.goto(base+route,{waitUntil:'networkidle'});
      assert.ok(await page.locator('a[href="/ai/"]:visible').count(),`AI entry missing: ${route}/${width}`);
    }
  }
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}});const plain=await nojs.newPage();await plain.goto(base+'/ai/');assert.equal(await plain.locator('.fact-card').count(),5);assert.equal(await plain.locator('details').count(),10);assert.equal(await plain.locator('#agent-prompt').isVisible(),true);await nojs.close();
  await browser.close();console.log('PASS: six widths; clipboard success/repeat/denial; FAQ mouse/keyboard; back navigation; document HTTP checks; six site-entry pages; no-JS content. Screenshots: '+output);
})().catch(error=>{console.error(error);process.exit(1)});
