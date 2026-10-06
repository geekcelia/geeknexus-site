'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
async function copyTests(){
 const button={hidden:true,disabled:false,addEventListener:(_,handler)=>button.click=handler};
 const prompt={value:'public prompt',focus(){this.focused=true},select(){this.selected=true}};
 const status={textContent:''};let copied;
 const navigator={clipboard:{writeText:async text=>{copied=text}}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'ai/ai.js'),'utf8'),{document:{getElementById:id=>({'copy-prompt':button,'agent-prompt':prompt,'copy-status':status})[id]},navigator});
 assert.equal(button.hidden,false);await button.click();assert.equal(copied,prompt.value);assert.match(status.textContent,/已复制/);assert.equal(button.disabled,false);
 await button.click();assert.match(status.textContent,/已复制/);
 navigator.clipboard.writeText=async()=>{throw Error('permission denied')};await button.click();assert.match(status.textContent,/手动复制/);assert.equal(prompt.focused,true);assert.equal(prompt.selected,true);assert.equal(button.disabled,false);
 navigator.clipboard=undefined;await button.click();assert.match(status.textContent,/手动复制/);
 let resolve;let calls=0;navigator.clipboard={writeText:()=>{calls++;return new Promise(r=>resolve=r)}};const pending=button.click();assert.equal(button.disabled,true);await button.click();assert.equal(calls,1);resolve();await pending;assert.equal(button.disabled,false);
}
async function cacheTests(){
 const handlers={};const calls=[];let cacheCalls=0;
 vm.runInNewContext(fs.readFileSync(path.join(root,'service-worker.js'),'utf8'),{self:{location:{origin:'https://www.geeknexus.ai'},addEventListener:(type,fn)=>handlers[type]=fn},caches:{match:()=>{cacheCalls++;return Promise.resolve(null)}},fetch:(request,options)=>{calls.push({request,options});return Promise.resolve({ok:true})},URL});
 for(const suffix of ['/ai/public-info.json','/ai/public-info.md','/llms.txt']){
  let response;const req={method:'GET',url:'https://www.geeknexus.ai'+suffix,mode:'cors'};handlers.fetch({request:req,respondWith:p=>response=p});await response;
  assert.equal(calls.at(-1).options.cache,'no-store');
 }
 assert.equal(cacheCalls,0);let handled=false;handlers.fetch({request:{method:'POST'},respondWith:()=>handled=true});assert.equal(handled,false);
}
(async()=>{await copyTests();await cacheTests();console.log('PASS: clipboard success, repeat, denied/unavailable fallback, overlapping clicks; machine-document cache bypass and POST exclusion. This is a VM test, not a browser visual test.');})().catch(e=>{console.error(e);process.exit(1)});
