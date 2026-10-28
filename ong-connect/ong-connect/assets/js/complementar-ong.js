/* O MVP simplifica a complementação para uma revisão no painel público. */
const info=document.querySelector('#request-info'),form=document.querySelector('#completion-form'),message=document.querySelector('#completion-message');
if(info)info.textContent='Neste MVP, a revisão e a publicação são feitas diretamente no painel de demonstração.';
if(form)form.hidden=true;
if(message){const link=document.createElement('a');link.href='../dashboard/ongs.html';link.className='btn';link.textContent='Abrir solicitações de ONGs';message.replaceChildren(link)}