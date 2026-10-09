/* Perfil demonstrativo compartilhado pelas paginas administrativas. Sem autenticacao real. */
(function(){
 const KEY='ongconnect_demo_account_v1';
 const defaults={name:'Usuário Demo',email:'admin@ongconnect.com.br',phone:'',role:'Administrador geral',photo:''};
 const $=id=>document.getElementById(id);
 let account={...defaults};
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');account={...defaults,...saved,role:defaults.role}}catch(_e){}
 const trigger=$('account-trigger'),dropdown=$('account-dropdown'),modal=$('account-modal');
 if(!trigger||!dropdown||!modal)return;
 let photoDraft=account.photo;
 const update=()=>{$('account-name-label').textContent=account.name||defaults.name;$('account-email-label').textContent=account.email||defaults.email;$('account-role-label').textContent=account.role;$('account-role-detail').textContent=account.role};
 const menu=(open)=>{dropdown.hidden=!open;trigger.setAttribute('aria-expanded',String(open))};
 const preview=()=>{const el=$('account-avatar-preview');el.replaceChildren();if(photoDraft){const img=document.createElement('img');img.src=photoDraft;img.alt='Pré-visualização da foto';el.appendChild(img)}else el.textContent='Sem foto de perfil'};
 const openModal=()=>{menu(false);$('account-name').value=account.name;$('account-email').value=account.email;$('account-phone').value=account.phone;$('account-role').value=account.role;$('account-photo').value='';photoDraft=account.photo;preview();modal.hidden=false;document.body.classList.add('account-modal-open');$('account-name').focus()};
 const closeModal=()=>{modal.hidden=true;document.body.classList.remove('account-modal-open');trigger.focus()};
 trigger.addEventListener('click',()=>menu(dropdown.hidden));
 document.addEventListener('click',e=>{if(!e.target.closest('.account-menu'))menu(false)});
 $('account-edit').addEventListener('click',openModal);
 $('account-logout').addEventListener('click',()=>{menu(false);sessionStorage.removeItem('ongconnect_demo_session');location.href='../index.html'});
 modal.querySelectorAll('.account-modal-x').forEach(b=>b.addEventListener('click',closeModal));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(modal.hidden)menu(false)}});
 $('account-photo-remove').addEventListener('click',()=>{photoDraft='';$('account-photo').value='';preview()});
 $('account-photo').addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>1024*1024){alert('Escolha uma imagem JPG, PNG ou WebP de até 1 MB.');e.target.value='';return}const reader=new FileReader();reader.onload=()=>{photoDraft=String(reader.result);preview()};reader.readAsDataURL(file)});
 $('account-form').addEventListener('submit',e=>{e.preventDefault();const next={name:$('account-name').value.trim(),email:$('account-email').value.trim(),phone:$('account-phone').value.trim(),role:defaults.role,photo:photoDraft};try{localStorage.setItem(KEY,JSON.stringify(next))}catch(_e){alert('Não foi possível salvar: armazenamento do navegador cheio. Tente remover a foto.');return}account=next;update();closeModal();(()=>{const n=document.createElement('div');n.className='ong-success-notice';n.setAttribute('role','status');n.textContent='Informações atualizadas com sucesso!';document.body.appendChild(n);setTimeout(()=>n.remove(),4500)})()});
 update();
})();
