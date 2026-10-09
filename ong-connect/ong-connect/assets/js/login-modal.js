/* Acesso demonstrativo: não autentica nem transmite credenciais. */
(()=>{
  const triggers=[...document.querySelectorAll('[data-login-open]')];
  if(!triggers.length)return;
  const dashboard=location.pathname.includes('/pages/')?'../dashboard/index.html':'dashboard/index.html';
  const overlay=document.createElement('div');
  overlay.id='login-demo-modal';
  overlay.className='modal-overlay';
  overlay.hidden=true;
  overlay.innerHTML=`<section class="modal-dialog login-demo-dialog" role="dialog" aria-modal="true" aria-labelledby="login-demo-title">
    <div class="modal-header"><div><h2 id="login-demo-title">Entrar no ONG Connect</h2><p>Acesso demonstrativo ao painel administrativo.</p></div><button class="modal-close" type="button" data-login-close aria-label="Fechar">×</button></div>
    <form class="login-demo-form" id="login-demo-form" novalidate>
      <div class="form-group"><label for="login-demo-email">E-mail</label><input class="field" type="email" id="login-demo-email" placeholder="seuemail@exemplo.com" autocomplete="off"></div>
      <div class="form-group"><label for="login-demo-password">Senha</label><input class="field" type="password" id="login-demo-password" placeholder="Digite sua senha" autocomplete="off"></div>
      <p class="small muted">Demonstração: não utilize senhas reais. Nenhum dado é validado, salvo ou enviado.</p>
      <div class="modal-actions"><button type="button" class="btn btn-outline" data-login-close hidden>Cancelar</button><button type="submit" class="btn">Entrar</button></div>
    </form></section>`;
  document.body.appendChild(overlay);
  let previousFocus=null;
  const close=()=>{overlay.hidden=true;document.body.classList.remove('modal-open');previousFocus?.focus()};
  const open=()=>{previousFocus=document.activeElement;overlay.hidden=false;document.body.classList.add('modal-open');overlay.querySelector('#login-demo-email').focus()};
  triggers.forEach(btn=>btn.addEventListener('click',open));
  overlay.querySelectorAll('.modal-close').forEach(btn=>btn.addEventListener('click',close));
  
  document.addEventListener('keydown',e=>{if(overlay.hidden)return;if(e.key==='Tab'){const els=[...overlay.querySelectorAll('button,input')];const first=els[0],last=els[els.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
  overlay.querySelector('form').addEventListener('submit',e=>{e.preventDefault();window.location.assign(dashboard)});
})();
