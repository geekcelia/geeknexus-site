import {lookup} from './knowledge.mjs';
if (!document.querySelector('.gn-rail')) {
  const zh=document.documentElement.lang.toLowerCase().startsWith('zh');
  const t=(cn,en)=>zh?cn:en;
  const base=new URL('../',import.meta.url);
  const asset=path=>new URL(path,base).href;
  const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('widget.css',import.meta.url).href;document.head.append(css);
  const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el;};
  const button=(label,action,cls='gn-secondary')=>{const b=make('button',cls,label);b.type='button';b.addEventListener('click',action);return b;};
  const rail=make('aside','gn-rail');rail.setAttribute('aria-label',t('快捷服务','Quick services'));
  const dialog=make('dialog','gn-dialog');dialog.setAttribute('aria-labelledby','gn-title');
  const shell=make('div','gn-shell'),head=make('header','gn-head'),logo=make('img');logo.src=asset('assets/geekcelia-assistant.png');logo.alt=t('极客寰宇小蜜蜂助手','Geek Nexus bee assistant');
  const titles=make('div'),title=make('h2','',t('极客寰宇 · 公司助手','Geek Nexus Assistant'));title.id='gn-title';
  titles.append(title,make('p','',t('了解服务，把想法变成下一步','Explore services. Find your next step.')));
  const close=button('×',()=>dialog.close(),'gn-close');close.setAttribute('aria-label',t('关闭','Close'));head.append(logo,titles,close);
  const body=make('div','gn-body'),compose=make('div','gn-compose'),form=make('form'),input=make('input');input.maxLength=800;input.required=true;input.placeholder=t('你想了解什么？','What would you like to know?');input.setAttribute('aria-label',input.placeholder);
  const send=make('button','gn-primary',t('发送','Send'));send.type='submit';form.append(input,send);
  compose.append(form,make('small','',t('基于公开资料答疑。请勿输入密码或敏感资料。','Answers use public information. Do not enter passwords or sensitive data.')));
  shell.append(head,body,compose);dialog.append(shell);document.body.append(rail,dialog);
  let transcript=[];
  const message=(text,user=false,source=null)=>{const m=make('div',`gn-msg${user?' gn-user':''}`,text);if(source){const a=make('a','',t('查看相关页面','View related page'));a.href=asset(zh&&['/company/','/commercial/'].includes(source)?`zh${source}`:source.slice(1));m.append(a);}body.append(m);body.scrollTop=body.scrollHeight;};
  const reset=()=>{body.replaceChildren();compose.hidden=true;body.removeAttribute('role');body.removeAttribute('aria-live');};
  function open(mode){if(!dialog.open)dialog.showModal();reset();if(mode==='wechat')wechat();else if(mode==='contact')contact();else chat(mode==='cloud');}
  function chat(cloud=false){compose.hidden=false;body.setAttribute('role','log');body.setAttribute('aria-live','polite');message(t('你好，我可以帮你了解服务、咨询云资源，或安排下一次沟通。','Hello. I can help you explore our services, discuss cloud requirements or plan a conversation.'));
    const chips=make('div','gn-chips');for(const q of [t('你们提供哪些服务？','What services do you offer?'),t('云服务怎么买？','How can I buy cloud services?'),t('能给几折？','What discounts are available?'),t('公司在哪里？','Where is your office?')])chips.append(button(q,()=>ask(q)));
    chips.append(button(t('关注公众号有礼','Follow on WeChat'),()=>open('wechat')),button(t('整理咨询需求','Prepare an inquiry'),()=>open('contact')));body.append(chips);
    for(const entry of transcript){message(entry.q,true);for(const a of entry.answers)message(a.text,false,a.source);}
    if(cloud)ask(t('云服务怎么买？','How can I buy cloud services?'));input.focus();}
  function ask(q){q=q.trim().slice(0,800);if(!q)return;message(q,true);let answers=lookup(q,zh?'zh':'en');if(!answers.length)answers=[{text:t('这项信息目前没有确认。可以点击「整理咨询需求」把问题发给团队，或拨打 +86 16602146315。','This information is not confirmed. Use “Prepare an inquiry” to contact the team, or call +86 16602146315.')}];for(const a of answers)message(a.text,false,a.source);transcript.push({q,answers});if(transcript.length>20)transcript.shift();input.value='';}
  form.addEventListener('submit',event=>{event.preventDefault();ask(input.value);});
  function wechat(){body.append(make('h3','',t('关注公众号有礼','Follow on WeChat')),make('p','','Geekcelia'),make('p','',t('云计算、AI 与游戏产业的一线观察。','Perspectives on cloud computing, AI and the games industry.')));const qr=make('img','gn-qr');qr.src=asset('assets/geekcelia-wechat-qr.jpg');qr.alt=t('Geekcelia 公众号二维码','Geekcelia WeChat official account QR code');qr.width=430;qr.height=430;body.append(qr,make('p','',t('微信扫码关注；手机上可长按图片保存后，在微信中识别。','Scan in WeChat, or save the image and open it in WeChat.')),make('p','gn-status',t('活动及礼品详情以公众号发布的信息为准。','Refer to the official account for promotion and gift details.')),button(t('返回助手','Back to assistant'),()=>open('chat')));}
  function contact(){body.append(make('h3','',t('聊聊你的需求','Tell us what you need')),make('p','',t('先整理需求，再通过邮件或电话联系。','Prepare your requirements, then contact us by email or phone.')));const label=make('label','',t('咨询摘要（可编辑）','Inquiry summary (editable)'));label.htmlFor='gn-summary';const summary=make('textarea');summary.id='gn-summary';summary.maxLength=1800;summary.value=(transcript.length?transcript.map(e=>e.q).join('\n')+'\n\n':'')+t('公司 / 行业：\n业务场景：\n云厂商 / 地区：\n月用量或预算：\n期望上线时间：','Company / industry:\nUse case:\nCloud provider / region:\nMonthly usage or budget:\nTarget date:');summary.value=summary.value.slice(0,1800);body.append(label,summary);const actions=make('div','gn-actions');const email=make('a','gn-primary',t('打开邮件草稿','Open email draft'));const update=()=>{email.href='mailto:hello@geeknexus.ai?subject='+encodeURIComponent(t('官网咨询需求','Website inquiry'))+'&body='+encodeURIComponent(summary.value);};update();summary.addEventListener('input',update);const phone=make('a','gn-secondary','+86 16602146315');phone.href='tel:+8616602146315';actions.append(email,phone);body.append(actions,make('p','gn-status',t('点击后打开你的邮件应用，需自行发送；此处不会自动提交。','Opens your email app. Review and send the draft yourself; nothing is submitted automatically.')),button(t('返回助手','Back to assistant'),()=>open('chat')));}
  const items=[['AI',t('公司助手','Assistant'),'chat'],['礼',t('关注公众号有礼','WeChat'),'wechat'],['云',t('云服务咨询','Cloud'),'cloud'],['联',t('联系我','Contact'),'contact'],['↑',t('返回顶部','Top'),'top']];
  for(const [symbol,label,mode]of items){const b=button('',()=>mode==='top'?window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}):open(mode),'');b.setAttribute('aria-label',label);if(mode==='chat'){const im=make('img');im.src=logo.src;im.alt='';b.append(im);}else b.append(make('span',`gn-letter${mode==='wechat'?' gn-gift':''}`,zh?symbol:({wechat:'W',cloud:'C',contact:'@',top:'↑'})[mode]));b.append(make('span','',label));rail.append(b);}
}
