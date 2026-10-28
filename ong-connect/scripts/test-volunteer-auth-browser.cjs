const assert=require('node:assert/strict');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
module.exports=async(c,base)=>{
 await c.send('Page.navigate',{url:base+'/pages/projetos.html'});await pause(1200);
 await c.evaluate(`apiRequest('logout','POST').then(()=>{sessionState=null})`);
 await c.evaluate(`window.authTestId=data.oportunidades.find(o=>oportunidadeRecebeInscricoes(o)).id;openVolunteerModal(window.authTestId)`);await pause(500);
 assert.equal(await c.evaluate(`document.querySelector('[data-existing]').getClientRects().length>0`),true);
 for(const width of [1280,390]){
  await c.send('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<600});
  assert.equal(await c.evaluate(`(()=>{const box=document.querySelector('.auth-choice .modal-dialog').getBoundingClientRect(),a=document.querySelector('[data-existing]').getBoundingClientRect(),b=document.querySelector('[data-new]').getBoundingClientRect();return box.width<=460&&box.left>=16&&box.right<=innerWidth-16&&a.top<b.top&&a.left>box.left+15&&getComputedStyle(document.querySelector('[data-new]')).backgroundColor==='rgb(255, 255, 255)'})()`),true);
  const shot=await c.send('Page.captureScreenshot');require('node:fs').writeFileSync('.runtime/local-modelagem/auth-choice-'+width+'.png',Buffer.from(shot.data,'base64'));
 }
 await c.evaluate(`document.querySelector('[data-existing]').click()`);
 for(const width of [1280,390]){
  await c.send('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<600});
  assert.equal(await c.evaluate(`(()=>{const box=document.querySelector('#login-demo-modal .modal-dialog').getBoundingClientRect(),field=document.querySelector('#auth-email').getBoundingClientRect();return box.width<=460&&box.left>=16&&field.left>box.left+15&&field.right<box.right-15})()`),true);
  const shot=await c.send('Page.captureScreenshot');require('node:fs').writeFileSync('.runtime/local-modelagem/auth-login-'+width+'.png',Buffer.from(shot.data,'base64'));
 }
 await c.evaluate(`document.querySelector('#login-demo-modal [data-close]').click();openVolunteerModal(window.authTestId)`);await pause(300);
 console.log('PASS layout compacto com espaçamento e botões em ordem no desktop e mobile');
 await c.evaluate(`document.querySelector('[data-cancel]').click()`);
 assert.equal(await c.evaluate(`document.querySelector('#volunteer-modal').hidden`),true);
 await c.evaluate(`openVolunteerModal(window.authTestId)`);await pause(300);
 await c.evaluate(`document.querySelector('[data-existing]').click();document.querySelector('#auth-email').value='voluntario@example.com';document.querySelector('#auth-password').value='SenhaFicticia123!';document.querySelector('#auth-form').requestSubmit()`);await pause(1000);
 assert.equal(await c.evaluate(`!document.querySelector('#volunteer-modal').hidden&&selectedOpportunityId===window.authTestId`),true);
 const before=await c.evaluate(`apiRequest('candidaturas').then(r=>r.pagination.total)`);
 await c.evaluate(`closeVolunteerModal();openVolunteerModal(window.authTestId)`);await pause(400);
 assert.equal(await c.evaluate(`document.querySelector('[data-existing]').closest('.modal-overlay').hidden&&!document.querySelector('#volunteer-modal').hidden`),true);
 assert.equal(await c.evaluate(`apiRequest('candidaturas').then(r=>r.pagination.total)`),before);
 console.log('PASS escolha, cancelamento, login, retomada da vaga e acesso direto sem candidatura automática');
 await c.evaluate(`closeVolunteerModal();apiRequest('logout','POST').then(()=>{sessionState=null})`);
 await c.evaluate(`openVolunteerModal(window.authTestId)`);await pause(300);
 await c.evaluate(`document.querySelector('[data-new]').click();document.querySelector('#auth-telefone').value='11999998888';document.querySelector('#auth-nascimento').value='1995-04-10';document.querySelector('#auth-cidade').value='Sao Paulo';document.querySelector('#auth-estado').value='SP';document.querySelector('#auth-disponibilidade').value='Sabados';document.querySelector('#auth-habilidades').value='Informatica';document.querySelector('#auth-name').value='Teste cadastro voluntário';document.querySelector('#auth-email').value='fluxo-'+Date.now()+'@example.com';document.querySelector('#auth-password').value='SenhaFicticia123!';document.querySelector('#auth-form').requestSubmit()`);await pause(800);
 assert.equal(await c.evaluate(`document.querySelector('#auth-title').textContent`),'Entrar');
 await c.evaluate(`document.querySelector('#auth-password').value='SenhaFicticia123!';document.querySelector('#auth-form').requestSubmit()`);await pause(1000);
 assert.equal(await c.evaluate(`!document.querySelector('#volunteer-modal').hidden&&selectedOpportunityId===window.authTestId`),true);
 assert.equal(await c.evaluate(`apiRequest('candidaturas').then(r=>r.pagination.total)`),0);
 assert.equal(await c.evaluate(`sessionState.usuario.dados_voluntario.cidade`),'Sao Paulo');assert.equal(await c.evaluate(`document.querySelector('#volunteer-form').elements.telefone.value`),'11999998888');
 console.log('PASS novo cadastro seguido de login retoma a mesma oportunidade sem enviar candidatura');
};
