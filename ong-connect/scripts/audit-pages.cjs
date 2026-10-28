// Auditoria no Chrome instalado, sem bibliotecas externas.
// node scripts/audit-pages.cjs [http://127.0.0.1:8080]
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const assert=require('node:assert/strict');
const base=(process.argv[2]||'http://127.0.0.1:8080').replace(/\/$/,'');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const root=path.resolve(__dirname,'..');
fs.mkdirSync(path.join(root,'.runtime'),{recursive:true});
class CDP{
 constructor(url){this.socket=new WebSocket(url);this.next=1;this.pending=new Map();this.events=[];this.socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=this.pending.get(m.id);this.pending.delete(m.id);if(m.error)p.reject(Error(JSON.stringify(m.error)));else p.resolve(m.result)}else{this.events.push(m);if(this.onEvent)this.onEvent(m)}});this.ready=new Promise((resolve,reject)=>{this.socket.addEventListener('open',resolve);this.socket.addEventListener('error',reject)})}
 async send(method,params={}){await this.ready;return new Promise((resolve,reject)=>{const id=this.next++;this.pending.set(id,{resolve,reject});this.socket.send(JSON.stringify({id,method,params}))})}
 async evaluate(expression){const r=await this.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
 close(){this.socket.close()}
}
async function main(){
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const executable=process.env.CHROME_PATH||path.join(process.env.ProgramFiles||'C:/Program Files','Google/Chrome/Application/chrome.exe');
 const log=fs.openSync(path.join(root,'.runtime/browser-audit.log'),'w');
 let chrome=null;
 try{await fetch('http://127.0.0.1:9223/json/version')}catch{chrome=spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=9223','--user-data-dir='+path.join(os.tmpdir(),'ong-audit-'+Date.now()),'about:blank'],{env,windowsHide:true,stdio:['ignore','ignore',log]})}
 let client;
 try{
  let ready=false;
  for(let attempt=0;attempt<60;attempt++){try{await fetch('http://127.0.0.1:9223/json/version');ready=true;break}catch{await pause(250)}}
  if(!ready)throw Error('Chrome não iniciou. Consulte .runtime/browser-audit.log.');
  const tab=await(await fetch('http://127.0.0.1:9223/json/new?about:blank',{method:'PUT'})).json();
  client=new CDP(tab.webSocketDebuggerUrl);await client.send('Runtime.enable');await client.send('Page.enable');
  await client.send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
  const catalog=await(await fetch(base+'/api/index.php?resource=catalogo')).json();
  const checks=[
   ['index.html','#featured-ongs .card',Math.min(6,catalog.ongs.length)],
   ['pages/ongs.html','#content .card',catalog.ongs.length],
   ['pages/projetos.html','#content .card',catalog.projetos.length],
   ['pages/transparencia.html','.tp-metric',4],
   ['dashboard/index.html','#metrics .stat',4],
   ['dashboard/ongs.html','#records-list tbody tr',catalog.ongs.length],
   ['dashboard/projetos.html','#records-list tbody tr',catalog.projetos.length],
   ['dashboard/voluntarios.html','#admin-volunteers',1],
   ['dashboard/doacoes.html','#admin-donations',1],
   ['dashboard/relatorios.html','#admin-reports tbody tr',catalog.ongs.length],
   ['pages/contato.html','#contact-form',1],
   ['pages/login.html','a[href="../dashboard/index.html"]',1],
   ['pages/complementar-ong.html','#completion-message a',1],
   ['pages/voluntariado.html','#content .card',catalog.projetos.length],
   ['pages/campanhas.html','#content .card',catalog.projetos.length]
  ];
  const results=[];
  for(const [page,selector,expected] of checks){
   client.events=[];await client.send('Page.navigate',{url:base+'/'+page});await pause(300);
   const result=await client.evaluate(`(async()=>{for(let i=0;i<100;i++){if(document.readyState==='complete'&&document.querySelector(${JSON.stringify(selector)})&&!document.querySelector('.data-placeholder')&&(!globalThis.catalogPromise))break;await new Promise(r=>setTimeout(r,100))}return {url:location.href,count:document.querySelectorAll(${JSON.stringify(selector)}).length,errors:[...document.querySelectorAll('.data-error,.alert.error')].filter(e=>!e.hidden&&e.getClientRects().length).map(e=>e.textContent),brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src),overflow:document.documentElement.scrollWidth>innerWidth+1}})()`);
   const exceptions=client.events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params.exceptionDetails.text+': '+(e.params.exceptionDetails.exception?.description||''));
   results.push({page,...result,exceptions});
   fs.writeFileSync(path.join(root,'.runtime/page-audit.json'),JSON.stringify(results,null,2));
   assert.equal(result.count,expected,page+' quantidade de elementos');assert.deepEqual(result.errors,[],page+' erro de interface');assert.deepEqual(exceptions,[],page+' erro JavaScript');assert.equal(result.brokenImages.length,0,page+' imagem quebrada');
   if(['index.html','pages/transparencia.html'].includes(page)){const image=await client.send('Page.captureScreenshot',{captureBeyondViewport:true});fs.writeFileSync(path.join(root,'.runtime/audit-'+path.basename(page,'.html')+'.png'),Buffer.from(image.data,'base64'))}
   console.log('OK',page,result.count);
  }
  // Navegação e modais sem alterar os registros do banco.
  await client.send('Page.navigate',{url:base+'/pages/projetos.html'});await pause(700);
  assert.equal(await client.evaluate(`document.querySelector('.project-details-open').click();!document.querySelector('#project-details-modal').hidden`),true,'Modal de projeto');
  await client.evaluate('closeProjectDetails()');
  await client.send('Page.navigate',{url:base+'/pages/ongs.html'});await pause(700);
  assert.equal(await client.evaluate(`document.querySelector('.ong-details-open').click();renderOngDetailsTab('projetos');document.querySelectorAll('.ong-details-project').length>0`),true,'Modal de ONG e seus projetos');
  await client.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  for(const page of ['index.html','pages/projetos.html','pages/transparencia.html','dashboard/ongs.html','dashboard/projetos.html']){
   await client.send('Page.navigate',{url:base+'/'+page});await pause(800);
   const overflow=await client.evaluate('document.documentElement.scrollWidth>innerWidth+1');
   assert.equal(overflow,false,page+' overflow no celular');console.log('OK celular',page);
  }
  await require('./test-navigation.cjs')(client,base,catalog);
  await require('./test-login.cjs')(client,base);
  if(process.env.PROJECTS_WRITE_TESTS==='1')await require('./test-projects.cjs')(client,base,catalog);
  await require('./test-waitlist.cjs')(client,base);
  // Simula indisponibilidade do banco para verificar TODAS as áreas dinâmicas.
  client.onEvent=event=>{if(event.method==='Fetch.requestPaused')client.send('Fetch.fulfillRequest',{requestId:event.params.requestId,responseCode:503,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify({error:'Banco indisponível no teste.'})).toString('base64')}).catch(console.error)};
  await client.send('Fetch.enable',{patterns:[{urlPattern:'*api/index.php*'}]});
  for(const [page,count] of [['index.html',2],['pages/transparencia.html',4],['dashboard/ongs.html',2],['dashboard/doacoes.html',1]]){
   await client.send('Page.navigate',{url:base+'/'+page});await pause(700);
   assert.equal(await client.evaluate("document.querySelectorAll('.data-error').length"),count,page+' tratamento de falha');console.log('OK falha da API',page);
  }
  await client.send('Fetch.disable');client.onEvent=null;
  // Reproduz a origem das capturas enviadas: Live Server na porta 5500.
  let liveServer=false;try{liveServer=(await fetch('http://127.0.0.1:5500/ong-connect/index.html')).ok}catch{}
  if(liveServer){
   for(const [page,count] of [['index.html',2],['pages/transparencia.html',4]]){
    await client.send('Page.navigate',{url:'http://127.0.0.1:5500/ong-connect/'+page});await pause(800);
    assert.equal(await client.evaluate("document.querySelectorAll('.data-error').length"),count,page+' diagnóstico Live Server');
    assert.equal(await client.evaluate("document.querySelectorAll('#mvp-notice').length"),0,page+' sem aviso superior');
    console.log('OK Live Server',page);
   }
  }
  fs.writeFileSync(path.join(root,'.runtime/page-audit.json'),JSON.stringify(results,null,2));
  console.log('OK: 15 páginas, modais, celular e tratamento de falhas.');
 }finally{if(client)client.close();if(chrome){if(process.env.AUDIT_KEEP_BROWSER)chrome.unref();else chrome.kill()}fs.closeSync(log)}
}
module.exports={CDP};
if(require.main===module){
 const keepAlive=setInterval(()=>{},1000);
 main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>clearInterval(keepAlive));
}
