const assert=require('node:assert/strict');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
module.exports=async(c,base)=>{
 await c.send('Network.enable');c.events=[];let checked=0;
 for(const page of ['index.html','pages/ongs.html','pages/projetos.html','pages/transparencia.html']){
  await c.send('Page.navigate',{url:base+'/'+page});await pause(1000);
  for(const action of ['choose','billing','back','x','escape','backdrop']){
   const result=await c.evaluate(`(()=>{
    openDonationModal(data.projetos[0].id);const modal=document.querySelector('#donation-modal');
    if(${JSON.stringify(action)}==='billing'){document.querySelector('#donation-choice-next').click();document.querySelector('#billing-name').value='Descartar este rascunho';document.querySelector('#donation-billing-cancel').click();}
    else if(${JSON.stringify(action)}==='back'){document.querySelector('#donation-choice-next').click();document.querySelector('#donation-modal-cancel').click();if(modal.hidden||document.querySelector('#donation-choose-step').hidden)return false;document.querySelector('#donation-choice-cancel').click();}
    else if(${JSON.stringify(action)}==='x')document.querySelector('#donation-modal-close').click();
    else if(${JSON.stringify(action)}==='escape')modal.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    else if(${JSON.stringify(action)}==='backdrop')modal.click();
    else {const button=document.querySelector('#donation-choice-cancel');if(!button.getClientRects().length)return false;button.click();}
    return modal.hidden&&pendingDonation===null&&document.querySelector('#billing-name').value==='';
   })()`);assert.equal(result,true,page+' doação '+action);checked++;
  }
  if(await c.evaluate(`Boolean(document.querySelector('#volunteer-form'))`))for(const action of ['cancel','x','escape','backdrop']){
   assert.equal(await c.evaluate(`(()=>{openVolunteerModal(data.oportunidades.find(o=>oportunidadeRecebeInscricoes(o)).id);const modal=document.querySelector('#volunteer-modal');if(modal.hidden)return false;document.querySelector('#vol-name').value='Rascunho';
    if(${JSON.stringify(action)}==='escape')modal.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));else if(${JSON.stringify(action)}==='backdrop')modal.click();else {const button=document.querySelector(${JSON.stringify(action==='x'?'#close-volunteer-modal':'#cancel-volunteer-modal')});if(!button.getClientRects().length)return false;button.click();}
    return modal.hidden&&document.querySelector('#vol-name').value==='';})()`),true,page+' candidatura '+action);checked++;
  }
 }
 for(const page of ['index','ongs','projetos','voluntarios','doacoes','relatorios']){
  await c.send('Page.navigate',{url:base+'/dashboard/'+page+'.html'});await pause(1000);
  assert.equal(await c.evaluate(`(()=>{document.querySelector('#account-edit').click();const modal=document.querySelector('#account-modal');if(modal.hidden)return false;document.querySelector('#account-name').value='Rascunho descartável';document.querySelector('#account-form [data-account-close]').click();return modal.hidden&&!window.ongNavigation.isDirty(document.querySelector('#account-form'));})()`),true,'perfil '+page);checked++;
 }
 const writes=c.events.filter(e=>e.method==='Network.requestWillBeSent'&&['POST','PUT','DELETE','PATCH'].includes(e.params.request.method));assert.equal(writes.length,0,'cancelamento não pode enviar escrita para API');
 assert.equal(c.events.filter(e=>e.method==='Runtime.exceptionThrown').length,0,'sem erros JavaScript');
 console.log(`PASS ${checked} cancelamentos/fechamentos em modais; nenhuma escrita na API`);
};
