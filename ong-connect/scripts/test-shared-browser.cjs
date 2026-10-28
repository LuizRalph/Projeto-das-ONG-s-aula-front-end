const {spawn}=require('child_process');const path=require('path');const os=require('os');const assert=require('assert/strict');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
class CDP{
 constructor(url){this.ws=new WebSocket(url);this.id=0;this.pending=new Map();this.errors=[];this.ready=new Promise((r,j)=>{this.ws.onopen=r;this.ws.onerror=j});this.ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=this.pending.get(m.id);this.pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown')this.errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text)};}
 async send(method,params={}){await this.ready;return new Promise((resolve,reject)=>{const id=++this.id;this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}))})}
 async evaluate(expression){const r=await this.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
}
module.exports=async base=>{
 const chromePath=process.env.CHROME_PATH||path.join(process.env.ProgramFiles||'C:/Program Files','Google/Chrome/Application/chrome.exe');
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const processChrome=spawn(chromePath,['--headless=new','--disable-gpu','--remote-debugging-port=19229','--no-first-run','--user-data-dir='+path.join(os.tmpdir(),'ong-shared-'+Date.now()),'about:blank'],{windowsHide:true,env,stdio:'ignore'});
 let client;
 try{
 for(let i=0;i<60;i++){try{await fetch('http://127.0.0.1:19229/json/version');break}catch{await pause(100)}}
 const tab=await(await fetch('http://127.0.0.1:19229/json/new?about:blank',{method:'PUT'})).json();client=new CDP(tab.webSocketDebuggerUrl);await client.send('Runtime.enable');await client.send('Page.enable');
 const navigate=async page=>{client.errors=[];await client.send('Page.navigate',{url:base+'/'+page});await pause(500);await client.evaluate(`(async()=>{for(let i=0;i<60;i++){if(document.readyState==='complete'&&!document.querySelector('.data-placeholder')&&!catalogPromise)return;await new Promise(r=>setTimeout(r,100));}})()`);assert.deepEqual(client.errors,[],page+' exceções JS');};
 await navigate('index.html');assert.ok(await client.evaluate("document.querySelectorAll('#featured-ongs .card').length>0"));
 await client.evaluate("document.querySelector('[data-login-open]').click();document.querySelector('#auth-email').value='admin@example.com';document.querySelector('#auth-password').value='SenhaFicticia123!';document.querySelector('#auth-form').requestSubmit()");await pause(800);
 assert.equal(await client.evaluate('location.pathname'),'/dashboard/index.html');assert.equal(await client.evaluate("document.querySelectorAll('#metrics .stat').length"),4);assert.deepEqual(client.errors,[]);console.log('PASS navegador: login real e dashboard');
 for(const page of ['dashboard/ongs.html','dashboard/projetos.html','dashboard/voluntarios.html','dashboard/doacoes.html','dashboard/relatorios.html']){await navigate(page);assert.deepEqual(await client.evaluate("[...document.querySelectorAll('.data-error,.alert.error')].filter(e=>!e.hidden&&e.getClientRects().length).map(e=>e.textContent)"),[],page);assert.equal(await client.evaluate("document.querySelector('#account-name-label').textContent"),'Pessoa Fictícia admin');console.log('PASS navegador: '+page);}
 await client.evaluate("document.querySelector('#account-logout').click()");await pause(400);await navigate('pages/login.html');
 await client.evaluate("document.querySelector('[data-login-open]').click();document.querySelector('#auth-email').value='ong@example.com';document.querySelector('#auth-password').value='SenhaFicticia123!';document.querySelector('#auth-form').requestSubmit()");await pause(700);
 await navigate('dashboard/ongs.html');assert.deepEqual(await client.evaluate("[...document.querySelectorAll('.data-error,.alert.error')].filter(e=>!e.hidden&&e.getClientRects().length).map(e=>e.textContent)"),[]);assert.equal(await client.evaluate("document.querySelector('#ong-requests-panel').hidden"),true);assert.equal(await client.evaluate('data.ongs.length'),1);console.log('PASS navegador: contexto do responsável por ONG');
 await client.evaluate("document.querySelector('#account-logout').click()");await pause(400);await navigate('pages/login.html');
 await client.evaluate("document.querySelector('[data-login-open]').click();document.querySelector('#auth-email').value='voluntario@example.com';document.querySelector('#auth-password').value='SenhaFicticia123!';document.querySelector('#auth-form').requestSubmit()");await pause(700);
 assert.ok(await client.evaluate("document.querySelector('main .panel').textContent.includes('Candidatura #')"));assert.deepEqual(client.errors,[]);console.log('PASS navegador: área pessoal do voluntário');
 }finally{client?.ws.close();processChrome.kill();}
};
