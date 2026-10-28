const {spawn}=require('node:child_process');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');const {CDP}=require('./audit-pages.cjs');
const pause=ms=>new Promise(r=>setTimeout(r,ms));const keep=setInterval(()=>{},1000);
async function main(){
 if(!/^ong_connect_test_[a-z0-9_]+$/.test(process.env.DB_DATABASE||''))throw Error('Defina um banco de testes existente em DB_DATABASE.');
 const root=path.resolve(__dirname,'..'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 require('node:child_process').execFileSync(path.join(root,'.runtime/php/php.exe'),['-n','-d','extension_dir='+path.join(root,'.runtime/php/ext'),'-d','extension=pdo_mysql','-d','extension=mbstring','-d','extension=fileinfo','scripts/cnpj-test-fixtures.php','reset-login'],{cwd:root,env});
 const php=spawn(path.join(root,'.runtime/php/php.exe'),['-n','-d','extension_dir='+path.join(root,'.runtime/php/ext'),'-d','extension=pdo_mysql','-d','extension=mbstring','-d','extension=fileinfo','-S','127.0.0.1:18085','-t','ong-connect'],{cwd:root,env,windowsHide:true,stdio:'ignore'});
 const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=9241','--user-data-dir='+path.join(root,'.runtime/modelagem-browser-'+Date.now()),'about:blank'],{env,windowsHide:true,stdio:'ignore'});let c;
 try{
 let ready=false;for(let i=0;i<80;i++){try{await(await fetch('http://127.0.0.1:9241/json/version')).text();await(await fetch('http://127.0.0.1:18085/api/index.php')).text();ready=true;break;}catch{await pause(250)}}if(!ready)throw Error('Navegador ou PHP não iniciou.');
 const tab=await(await fetch('http://127.0.0.1:9241/json/new?about:blank',{method:'PUT'})).json();c=new CDP(tab.webSocketDebuggerUrl);await c.send('Runtime.enable');await c.send('Page.enable');
 const base='http://127.0.0.1:18085';await c.send('Page.navigate',{url:base+'/dashboard/auditoria.html'});await pause(900);
 for(let attempt=0;attempt<150;attempt++){try{if(await c.evaluate(`location.pathname.endsWith('/pages/login.html')||document.querySelector('#audit-message')?.textContent.includes('exclusivo')`))break;}catch{}await pause(100);}
 assert.ok(await c.evaluate(`location.pathname.endsWith('/pages/login.html')||document.querySelector('#audit-message')?.textContent.includes('exclusivo')`));console.log('PASS auditoria oculta para visitante');
 assert.equal(await c.evaluate(`(async()=>{const s=await(await fetch('../api/index.php?resource=sessao')).json();return (await fetch('../api/index.php?resource=login',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':s.csrf},body:JSON.stringify({email:'admin@example.com',senha:'SenhaFicticia123!'})})).status})()`),200);
 await c.send('Page.navigate',{url:base+'/dashboard/auditoria.html'});await pause(1200);
 for(let attempt=0;attempt<100;attempt++){if(await c.evaluate(`document.querySelector('#audit-content')&&!document.querySelector('#audit-content').hidden&&document.querySelectorAll('#audit-rows tr').length>0`))break;await pause(100);}
 assert.ok(await c.evaluate(`!!document.querySelector('#audit-content')&&!document.querySelector('#audit-content').hidden&&document.querySelectorAll('#audit-rows tr').length>0`),JSON.stringify(await c.evaluate(`({url:location.href,text:document.body.innerText.slice(0,600)})`)));console.log('PASS administrador consulta auditoria no navegador');
 await c.evaluate(`document.querySelector('[name=recurso]').value='login';document.querySelector('#audit-filters').requestSubmit()`);await pause(600);assert.ok(await c.evaluate(`[...document.querySelectorAll('#audit-rows tr')].length>0&&[...document.querySelectorAll('#audit-rows tr')].every(r=>r.cells[2].textContent.startsWith('Login'))`));console.log('PASS filtro de auditoria por recurso');
 fs.mkdirSync(path.join(root,'.runtime/local-modelagem'),{recursive:true});const screenshot=await c.send('Page.captureScreenshot');fs.writeFileSync(path.join(root,'.runtime/local-modelagem/auditoria.png'),Buffer.from(screenshot.data,'base64'));
 c.events=[];await c.send('Page.navigate',{url:base+'/dashboard/ongs.html'});await pause(1800);assert.equal(c.events.filter(e=>e.method==='Runtime.exceptionThrown').length,0);assert.ok(await c.evaluate(`document.querySelector('.sidebar a[href="auditoria.html"]')!==null`));console.log('PASS painel de ONGs sem exceções JavaScript e com link de auditoria');
 assert.ok(await c.evaluate(`document.querySelector('#requests-list').textContent.includes('Rejeições:')`));console.log('PASS painel apresenta contagem de rejeições');
 if(process.env.MODAL_CANCEL_TESTS==='1')await require('./test-modal-cancel.cjs')(c,base);
 if(process.env.PROJECT_DETAILS_TESTS==='1')await require('./test-project-details.cjs')(c,base);
 if(process.env.PUBLIC_TRANSFERS_TESTS==='1')await require('./test-public-transfers-browser.cjs')(c,base);
 if(process.env.VOLUNTEER_AUTH_TESTS==='1')await require('./test-volunteer-auth-browser.cjs')(c,base);
 if(process.env.SEGMENTS_BROWSER_TESTS==='1')await require('./test-segments-browser.cjs')(c,base);
 if(process.env.ADMIN_WORKFLOWS_TESTS==='1')await require('./test-admin-workflows-browser.cjs')(c,base);
 if(process.env.PERFORMANCE_SCAN==='1')await require('./scan-page-performance.cjs')(c,base);
 if(process.env.ADMIN_LAYOUT_TESTS==='1')await require('./test-admin-layout.cjs')(c,base);
 if(process.env.TYPOGRAPHY_TESTS==='1'){
  for(const route of ['index.html','pages/ongs.html','pages/projetos.html','pages/transparencia.html','pages/contato.html','dashboard/index.html','dashboard/ongs.html','dashboard/projetos.html','dashboard/voluntarios.html','dashboard/doacoes.html','dashboard/relatorios.html','dashboard/repasses-publicos.html','dashboard/auditoria.html']){
   await c.send('Page.navigate',{url:base+'/'+route});await pause(800);
   for(const width of [1280,390]){
    await c.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<650});await pause(80);
    const sizes=await c.evaluate(`(()=>{const size=s=>{const e=document.querySelector(s);return e?getComputedStyle(e).fontSize:null};return {body:size('body'),heading:size('.dash-top h1,.page-heading h1'),field:size('.field'),button:size('.btn'),overflow:document.documentElement.scrollWidth>innerWidth}})()`);
    assert.equal(sizes.body,'16px',route);if(sizes.heading)assert.equal(sizes.heading,width<650?'24px':'28px',route);
    if(sizes.field)assert.equal(sizes.field,'16px',route);if(sizes.button)assert.equal(sizes.button,'15px',route);
    assert.equal(sizes.overflow,false,route+' '+width);
   }
   await c.send('Emulation.clearDeviceMetricsOverride');
  }
  console.log('PASS escala tipográfica consistente em 13 páginas, desktop e mobile');
 }
 if(process.env.STICKY_HEADER_TESTS==='1'){
  for(const page of ['index','ongs','projetos','voluntarios','doacoes','relatorios','repasses-publicos','auditoria']){
   await c.send('Page.navigate',{url:base+'/dashboard/'+page+'.html'});await pause(1000);
   for(const width of [1280,390]){
    await c.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<650});await pause(100);
    assert.equal(await c.evaluate(`(()=>{scrollTo(0,0);const h=document.querySelector('.dash-top'),s=getComputedStyle(h);return Math.abs(h.getBoundingClientRect().top-(innerWidth<=650?60:0))<2&&s.paddingTop===s.paddingBottom})()`),true,page+' initial alignment');
    await c.evaluate(`document.querySelector('.dash-main').style.minHeight='2200px';scrollTo(0,500)`);await pause(100);
    assert.equal(await c.evaluate(`(()=>{const h=document.querySelector('.dash-top'),r=h.getBoundingClientRect(),expected=innerWidth<=650?60:0;return getComputedStyle(h).position==='sticky'&&Math.abs(r.top-expected)<2})()`),true,page+' '+width);
    assert.equal(await c.evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,page+' overflow');
    await c.evaluate(`scrollTo(0,0)`);
   }
   await c.send('Emulation.clearDeviceMetricsOverride');
  }
  console.log('PASS cabeçalho permanece visível em todas as oito telas, desktop e mobile');
 }
 if(process.env.FUNDING_IMPACT_TESTS==='1'){
  await c.send('Page.navigate',{url:base+'/pages/transparencia.html'});await pause(1000);
  for(const [publicValue,privateValue,expected] of [[30000,6000,'83,3%'],[0,6000,'0%'],[30000,0,'100%'],[0,0,'0%']]){
   await c.evaluate(`data.publicTransfersTotal=${publicValue};data.projetos=[];data.projetos.push({id:999999,categoria:'Teste',meta:1});window.impactOriginal=window.impactOriginal||arrecadadoProjeto;arrecadadoProjeto=()=>${privateValue};render()`);
   if(publicValue+privateValue>0)assert.equal(await c.evaluate(`document.querySelector('#tp-areas .tp-area-row small').textContent`),expected);
   assert.equal(await c.evaluate(`document.querySelector('#tp-areas').textContent.includes('NaN')`),false);
  }
  console.log('PASS participação financeira pública: origem mista, apenas privada, apenas pública e sem recebimentos');
 }
 }finally{if(c)c.close();chrome.kill();php.kill();}
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>clearInterval(keep));
