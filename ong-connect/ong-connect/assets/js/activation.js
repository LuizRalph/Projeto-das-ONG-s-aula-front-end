'use strict';
const activationToken=new URLSearchParams(location.hash.slice(1)).get('token')||'';
history.replaceState(null,'',location.pathname+location.search);
const activationForm=document.querySelector('#activation-form'),activationMessage=document.querySelector('#activation-message');
if(!/^[a-f0-9]{64}$/.test(activationToken)){activationMessage.textContent='Convite inválido. Solicite um novo link à administração.';activationForm.querySelector('button').disabled=true;}
activationForm.addEventListener('submit',async event=>{
 event.preventDefault();const button=activationForm.querySelector('button');
 const password=document.querySelector('#password').value;
 if(password!==document.querySelector('#confirmation').value){activationMessage.textContent='As senhas devem ser iguais.';return;}
 button.disabled=true;activationMessage.textContent='Ativando conta…';
 try{
  const sessionResponse=await fetch('../api/index.php?resource=sessao',{credentials:'same-origin',cache:'no-store'});const session=await sessionResponse.json();if(!sessionResponse.ok)throw new Error(session.error||'Não foi possível iniciar a sessão.');
  const response=await fetch('../api/index.php?resource=ativacao',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrf},body:JSON.stringify({token:activationToken,senha:password})});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Não foi possível ativar a conta.');
  activationForm.reset();activationMessage.textContent='Conta ativada. Acesse o link abaixo para entrar.';
 }catch(error){activationMessage.textContent=error.message;button.disabled=false;}
});
