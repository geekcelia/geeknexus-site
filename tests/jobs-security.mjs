import assert from 'node:assert/strict';
const {default:worker,JobsRateLimiter}=await import(new URL('../workers/jobs-api.mjs', import.meta.url));
const origin='https://api.geeknexus.ai';
const secret='unit-test-admin-only';
const code='WLB-LOCAL-TEST';
function environment(){
 const rows=new Map([['premium:unlock:'+code,JSON.stringify({code,usedCount:0})],['premium:wlb:content',JSON.stringify({items:[{company:'Fixture',role:'Test',code:'local-only'}]})]]);
 return {rows,JOBS_ADMIN_KEY:secret,JOBS_RATE_LIMITER:{idFromName:ip=>ip,get:()=>({fetch:async()=>new Response(null,{status:204})})},JOBS_KV:{
 async get(key,type){const value=rows.get(key);return type==='json'?(value?JSON.parse(value):null):value??null;},
 async put(key,value){rows.set(key,value);},async delete(key){rows.delete(key);},
 async list({prefix}){return{keys:[...rows.keys()].filter(key=>key.startsWith(prefix)).map(name=>({name})),list_complete:true};}
 }};
}
const call=(path,env,options={})=>worker.fetch(new Request(origin+path,options),env);
const results={};
{
 const env=environment();
 results.queryAdmin=(await call('/jobs/admin/pending?key='+secret,env)).status;
 results.headerAdmin=(await call('/jobs/admin/pending',env,{headers:{'x-admin-key':secret}})).status;
 results.anonymous=(await call('/jobs/admin/pending',env)).status;
 results.noStore=(await call('/jobs/admin/pending',env,{headers:{'x-admin-key':secret}})).headers.get('cache-control');
}
{
 const env=environment();const form=new FormData();
 for(const [key,value] of Object.entries({role:'Engineer',location:'Test',salary:'Test',companyType:'Test'}))form.set(key,value);
 form.set('resume',new Blob(['%PDF-1.7 local fixture'],{type:'application/pdf'}),'test.pdf');
 form.set('unused','x'.repeat(11*1024*1024));
 results.multipartStatus=(await call('/jobs/intents',env,{method:'POST',body:form})).status;
 results.multipartStored=[...env.rows.keys()].some(k=>k.startsWith('intent:pending:'));
}
{
 const env=environment();
 results.jsonStatus=(await call('/jobs/referrals',env,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({company:'Test',role:'Test',location:'Test',code:'Test',unused:'x'.repeat(128*1024)})})).status;
}
{
 const env=environment();const put=env.JOBS_KV.put.bind(env.JOBS_KV);
 let release,started;const gate=new Promise(r=>release=r);const reached=new Promise(r=>started=r);let intercepted=false;
 env.JOBS_KV.put=async(key,value)=>{
   if(!intercepted&&(key==='premium:unlock:'+code||key==='premium:usage:'+code)&&!JSON.parse(value).revoked){
     intercepted=true;started();await gate;
   }return put(key,value);
 };
 const unlock=call('/jobs/premium/unlock',env,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code})});
 await reached;
 const revoke=await call('/jobs/admin/unlock-revoke',env,{method:'POST',headers:{'content-type':'application/json','x-admin-key':secret},body:JSON.stringify({code})});
 assert.equal(revoke.status,200);
 release();await unlock;
 results.revocationSurvives=JSON.parse(env.rows.get('premium:unlock:'+code)).revoked===true;
 results.nextUnlock=(await call('/jobs/premium/unlock',env,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code})})).status;
}
{
 const env=environment();
 const r=await call('/jobs/admin/unlock',env,{method:'POST',headers:{'x-admin-key':secret,'content-type':'application/json'},body:JSON.stringify({count:3})});
 const data=await r.json();results.strongNewCodes=data.codes.every(c=>/^WLB-[A-F0-9]{32}$/.test(c.code))&&new Set(data.codes.map(c=>c.code)).size===3;
}
{
 let tail=Promise.resolve(),writes=0;const rows=new Map();
 const txn={get:async k=>rows.get(k),put:async(k,v)=>{writes++;rows.set(k,v)}};
 const storage={transaction(fn){const next=tail.then(()=>fn(txn));tail=next.catch(()=>{});return next;}};
 const limiter=new JobsRateLimiter({storage});
 const replies=await Promise.all(Array.from({length:45},()=>limiter.fetch(new Request('https://internal/allow',{method:'POST'}))));
 results.allowedConcurrent=replies.filter(r=>r.status===204).length;results.deniedConcurrent=replies.filter(r=>r.status===429).length;results.limiterWrites=writes;
}
{
 const env=environment();
 results.falseLengthStatus=(await call('/jobs/referrals',env,{method:'POST',headers:{'content-type':'application/json','content-length':'1'},body:' '.repeat(128*1024)})).status;
}
console.log(JSON.stringify(results,null,2));
{
 assert.equal(results.queryAdmin,401);assert.equal(results.headerAdmin,200);assert.equal(results.anonymous,401);
 assert.match(results.noStore,/no-store/);assert.equal(results.multipartStatus,413);assert.equal(results.multipartStored,false);
 assert.equal(results.jsonStatus,413);assert.equal(results.revocationSurvives,true);assert.equal(results.nextUnlock,403);
 assert.equal(results.strongNewCodes,true);assert.equal(results.allowedConcurrent,30);assert.equal(results.deniedConcurrent,15);assert.equal(results.limiterWrites,30);assert.equal(results.falseLengthStatus,413);console.log('All security regression checks passed.');
}
