/* Perfil autenticado; a foto permanece como preferência local. */
(async function(){
 const KEY='ongconnect_profile_preferences';
 const session=await getSession();if(!session.usuario){location.replace(base+'pages/login.html');return;}
 const roles={admin:'Administrador geral',ong:'Responsável por ONG',voluntario:'Voluntário'};
 const defaults={name:session.usuario.nome,email:session.usuario.email,phone:session.usuario.telefone,role:roles[session.usuario.perfil],photo:''};
 const $=id=>document.getElementById(id);
 let account={...defaults};
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');account={...defaults,photo:saved.photo||''}}catch(_e){}
 const trigger=$('account-trigger'),dropdown=$('account-dropdown'),modal=$('account-modal');
 if(!trigger||!dropdown||!modal)return;
 const avatar=document.createElement('span');
 avatar.className='account-trigger-avatar';
 avatar.setAttribute('aria-hidden','true');
 trigger.prepend(avatar);
 const avatarFallback=()=>{avatar.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>'};
 let photoDraft=account.photo;
 const update=()=>{
  $('account-name-label').textContent=account.name||defaults.name;$('account-email-label').textContent=account.email||defaults.email;$('account-role-label').textContent=account.role;$('account-role-detail').textContent=account.role;
  const label='Abrir menu de '+(account.name||defaults.name);
  trigger.setAttribute('aria-label',label);trigger.title=label;
  avatarFallback();
  if(account.photo){const img=document.createElement('img');img.alt='';img.src=account.photo;img.addEventListener('error',avatarFallback,{once:true});avatar.replaceChildren(img)}
 };
 const menu=(open)=>{dropdown.hidden=!open;trigger.setAttribute('aria-expanded',String(open))};
 trigger.setAttribute('aria-controls',dropdown.id);
 const accountMenu=trigger.closest('.account-menu'),sidebar=document.querySelector('.sidebar');
 if(accountMenu&&sidebar){
  const header=document.createElement('header'),actions=document.createElement('div');
  header.className='admin-header';actions.className='admin-header-controls';
  const brand=sidebar.querySelector('.brand');
  const toggle=document.querySelector('#dashboard-menu-toggle');
  const originals=[brand,toggle,accountMenu].filter(Boolean).map(element=>{
   const marker=document.createComment('Posicao original no desktop');element.before(marker);return {element,marker};
  });
  header.append(actions);
  sidebar.before(header);
  const mobile=window.matchMedia('(max-width:650px)');
  const positionHeader=()=>{
   menu(false);header.hidden=!mobile.matches;
   sidebar.closest('.dashboard-shell').classList.toggle('has-admin-header',mobile.matches);
   if(mobile.matches){header.prepend(brand);if(toggle)header.prepend(toggle);actions.append(accountMenu)}
   else originals.forEach(({element,marker})=>marker.after(element));
  };
  mobile.addEventListener('change',positionHeader);positionHeader();
 }
 const preview=()=>{const el=$('account-avatar-preview');el.replaceChildren();if(photoDraft){const img=document.createElement('img');img.src=photoDraft;img.alt='Pré-visualização da foto';el.appendChild(img)}else el.textContent='Sem foto de perfil'};
 const openModal=()=>{menu(false);$('account-name').value=account.name;$('account-email').value=account.email;$('account-phone').value=account.phone;$('account-role').value=account.role;$('account-photo').value='';photoDraft=account.photo;preview();window.ongNavigation?.markClean($('account-form'));modal.hidden=false;document.body.classList.add('account-modal-open');$('account-name').focus()};
 const closeModal=()=>{$('account-form').reset();photoDraft=account.photo;window.ongNavigation?.markClean($('account-form'));modal.hidden=true;document.body.classList.remove('account-modal-open');trigger.focus()};
 trigger.addEventListener('click',()=>menu(dropdown.hidden));
 document.addEventListener('click',e=>{if(!e.target.closest('.account-menu'))menu(false)});
 $('account-edit').addEventListener('click',openModal);
 $('account-logout').addEventListener('click',async()=>{try{await apiRequest('logout','POST');sessionState=null;location.href='../index.html'}catch(error){alert(error.message)}});
 modal.querySelectorAll('.account-modal-x,[data-account-close]').forEach(b=>b.addEventListener('click',closeModal));
 modal.querySelector('.account-modal-backdrop')?.addEventListener('click',closeModal);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden){e.preventDefault();closeModal();return}if(e.key==='Escape'&&modal.hidden&&!dropdown.hidden){menu(false);trigger.focus()}});
 accountMenu.addEventListener('focusout',e=>{if(!accountMenu.contains(e.relatedTarget))menu(false)});
 $('account-photo-remove').addEventListener('click',()=>{photoDraft='';$('account-photo').value='';preview()});
 $('account-photo').addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>1024*1024){alert('Escolha uma imagem JPG, PNG ou WebP de até 1 MB.');e.target.value='';return}const reader=new FileReader();reader.onload=()=>{photoDraft=String(reader.result);preview()};reader.readAsDataURL(file)});
 $('account-email').readOnly=true;
 $('account-form').addEventListener('submit',async e=>{e.preventDefault();const next={name:$('account-name').value.trim(),email:$('account-email').value.trim(),phone:$('account-phone').value.trim(),role:defaults.role,photo:photoDraft};try{await apiRequest('perfil','PUT',{nome:next.name,telefone:next.phone});sessionState=null;localStorage.setItem(KEY,JSON.stringify({photo:next.photo}))}catch(_e){alert('Não foi possível salvar o perfil. Verifique a sessão e tente novamente.');return}account=next;update();window.ongNavigation?.markClean($('account-form'));closeModal();(()=>{const n=document.createElement('div');n.className='ong-success-notice';n.setAttribute('role','status');n.textContent='Informações atualizadas com sucesso!';document.body.appendChild(n);setTimeout(()=>n.remove(),4500)})()});
 update();
})();
