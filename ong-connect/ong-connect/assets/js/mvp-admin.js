/* Gerenciamento compartilhado com estrutura HTML estável entre carregamentos. */
document.addEventListener('DOMContentLoaded',async()=>{
  const isOng=document.body.dataset.page==='admin-ongs',main=$('main'),form=$('#mvp-form'),nav=window.ongNavigation;
  let requests=[],selectedRequest=null,editing=null,busy=false,ready=false;
  function showOngAccess(access){
    const overlay=document.createElement('div');overlay.className='modal-overlay';
    overlay.innerHTML='<section class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="ong-access-title"><div class="modal-header"><h2 id="ong-access-title">Acesso da ONG</h2><button class="modal-close" type="button" aria-label="Fechar">×</button></div><div class="modal-scroll"><p data-ong></p><p data-note></p><div class="form-group"><label>E-mail de acesso<input class="field" data-email readonly autocomplete="off"></label></div><div class="form-group" data-password-group><label>Senha inicial<input class="field" data-password readonly autocomplete="off"></label></div><p>O responsável pode acessar a página Entrar e gerenciar os projetos e voluntários das ONGs vinculadas à sua conta.</p><button class="btn" type="button" data-done>Concluir</button></div></section>';
    overlay.querySelector('[data-ong]').textContent=access.ongNome;
    overlay.querySelector('[data-email]').value=access.email;
    overlay.querySelector('[data-password-group]').hidden=!access.contaCriada;
    overlay.querySelector('[data-password]').value=access.senhaInicial||'';
    overlay.querySelector('[data-note]').textContent=access.contaCriada?'Conta criada. Anote e entregue estas credenciais ao responsável. A senha é exibida somente nesta confirmação.':'O e-mail já possui uma conta de responsável por ONG. A ONG foi vinculada a ela; a senha existente foi mantida.';
    const previous=document.activeElement;
    const close=()=>{overlay.querySelector('[data-password]').value='';overlay.remove();if(!document.querySelector('.modal-overlay:not([hidden])'))document.body.classList.remove('modal-open');previous?.focus()};
    overlay.querySelector('.modal-close').onclick=close;overlay.querySelector('[data-done]').onclick=close;
    overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){close();return;}if(e.key==='Tab'){const fields=[...overlay.querySelectorAll('button,input')].filter(el=>el.getClientRects().length),first=fields[0],last=fields.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
    document.body.append(overlay);document.body.classList.add('modal-open');overlay.querySelector('[data-email]').focus();
  }
  let requestStatus=nav.get('requestStatus','Pendente');
  const statuses=[['Pendente','Pendentes'],['Cadastrada','Publicadas'],['Rejeitado','Rejeitadas'],['Todas','Todas']];
  if(!statuses.some(([value])=>value===requestStatus))requestStatus='Pendente';
  const search=$('#record-search'),requestSearch=$('#request-search');
  const recordOng=$('#record-ong-filter'),recordStatus=$('#record-status-filter');
  nav.watchForm(form);
  if(!isOng){form.elements.voluntarios.step='1';form.elements.voluntarios.max='100000'}

  function reset(){
    selectedRequest=null;editing=null;form.reset();
    if(isOng){form.elements.cor.value='#087f70';form.elements.cnpj.readOnly=false}
    else{for(const key of ['meta','arrecadado','voluntarios'])form.elements[key].value='0';const requested=new URLSearchParams(location.search).get('ong');if(requested&&data.ongs?.some(o=>String(o.id)===requested))form.elements.ongId.value=requested}
    $('#editor-title').textContent=isOng?'Cadastrar ONG':'Cadastrar projeto';
    $('#mvp-save').textContent=isOng?'Salvar ONG':'Salvar projeto';
    nav.markClean(form);
  }
  function edit(values,request=false){
    if(!values||!nav.confirmForm(form))return;
    reset();for(const field of form.elements)if(field.name&&values[field.name]!=null)field.value=values[field.name];
    if(request){selectedRequest=values.id;form.elements.cnpj.readOnly=true;$('#editor-title').textContent='Revisar e publicar ONG';$('#mvp-save').textContent='Revisar e publicar'}
    else{editing=values.id;$('#editor-title').textContent=isOng?'Editar ONG':'Editar projeto'}
    if(isOng){$('#ong-register-panel').hidden=false;$('#ong-register-panel').open=true;}
    nav.markClean(form);form.scrollIntoView({behavior:'smooth',block:'start'});form.querySelector('input').focus();
  }
  function normalize(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
  function renderRecords(){
    const query=normalize(search.value);
    const items=(isOng?data.ongs:data.projetos).filter(r=>{
      if(recordOng?.value&&String(r.ongId)!==recordOng.value)return false;
      if(recordStatus?.value&&r.status!==recordStatus.value)return false;
      return normalize([r.nome,r.titulo,r.cidade,r.cnpj,r.email,r.categoria,ong(r.ongId)?.nome].join(' ')).includes(query);
    });
    $('#record-summary').textContent=`${items.length} de ${(isOng?data.ongs:data.projetos).length} ${isOng?'ONGs':'projetos'} exibidos`;
    $('#records-list').innerHTML=items.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Nome</th><th>${isOng?'Cidade':'ONG'}</th><th>Ações</th></tr></thead><tbody>${items.map(r=>`<tr><td>${escapeHtml(r.nome||r.titulo)}</td><td>${escapeHtml(isOng?r.cidade:ong(r.ongId)?.nome||'')}</td><td><div class="inline-actions"><button type="button" class="btn btn-sm btn-outline" data-edit="${r.id}">Editar</button>${isOng?`<a class="btn btn-sm btn-outline" href="projetos.html?ong=${r.id}">Cadastrar projeto</a>`:''}<button type="button" class="btn btn-sm btn-outline" data-delete="${r.id}">Excluir</button></div></td></tr>`).join('')}</tbody></table></div>`:'<p class="empty">Nenhum registro corresponde aos filtros.</p>';
  }
  function renderRequests(){
    if(!isOng)return;
    const count=requests.filter(r=>r.status==='Pendente').length,badge=$('#pending-count');
    badge.textContent=count?`${count} pendente${count===1?'':'s'}`:'';badge.hidden=count===0;nav.setPending(count);
    const tabs=$$('#request-tabs [role="tab"]');
    tabs.forEach(tab=>{const active=tab.dataset.status===requestStatus;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;const n=tab.dataset.status==='Todas'?requests.length:requests.filter(r=>r.status===tab.dataset.status).length;tab.querySelector('span').textContent=String(n)});
    $('#requests-list').setAttribute('aria-labelledby',tabs.find(tab=>tab.dataset.status===requestStatus).id);
    const query=normalize(requestSearch.value);
    const visible=requests.filter(r=>(requestStatus==='Todas'||r.status===requestStatus)&&normalize([r.nome,r.cnpj,r.email,r.cidade,r.responsavel].join(' ')).includes(query));
    $('#requests-list').innerHTML=visible.length?visible.map(r=>`<article class="request-review-card"><h3>${escapeHtml(r.nome)} <span class="badge">${r.status==='Cadastrada'?'Publicada':escapeHtml(r.status)}</span></h3><p>CNPJ: ${escapeHtml(r.cnpj)} · Rejeições: ${Number(r.rejeicoes)||0}/3${r.cnpjBloqueado?' · CNPJ bloqueado':''} · ${escapeHtml(r.cidade)} · ${escapeHtml(r.email)}</p><p>${escapeHtml(r.descricao)}</p>${r.motivo?`<p>Justificativa: ${escapeHtml(r.motivo)}</p>`:''}${r.status==='Pendente'?`<div class="inline-actions"><button type="button" class="btn btn-sm" data-approve="${r.id}">Revisar e publicar</button><button type="button" class="btn btn-sm btn-outline" data-reject="${r.id}">Rejeitar</button></div>`:''}${r.ong_id?`<p><a class="btn btn-sm btn-outline" href="projetos.html?ong=${r.ong_id}">Cadastrar projeto para esta ONG</a></p>`:''}<details><summary>Histórico</summary>${r.historico.map(h=>`<p>${escapeHtml(h.criado_em)} — ${escapeHtml(h.status_novo)}: ${escapeHtml(h.justificativa)}</p>`).join('')}</details></article>`).join(''):'<p class="empty">Nenhuma solicitação corresponde à situação e à busca selecionadas.</p>';
  }
  function fillOptions(select,items,label){const current=select.value;select.innerHTML='<option value="">Selecione</option>'+items.map(item=>`<option value="${item.id}">${escapeHtml(item[label])}</option>`).join('');select.value=items.some(item=>String(item.id)===current)?current:''}
  async function refresh(){
    const previouslyReady=ready;
    if(!ready)showLoading();else dataTargets().forEach(el=>el.setAttribute('aria-busy','true'));
    try{
      // Só substitui as tabelas quando as respostas necessárias estão disponíveis.
      await loadData();if(isOng){
        const administrator=(await getSession()).usuario?.perfil==='admin';
        $('#ong-requests-panel').hidden=!administrator;
        if(administrator)requests=await fetchPages('solicitacoes');
        else {requests=[];$('#ong-register-panel').hidden=true;}
      }
      else{
        fillOptions(form.elements.ongId,data.ongs,'nome');
        fillOptions(recordOng,data.ongs,'nome');recordOng.options[0].textContent='Todas as ONGs';
        const requested=new URLSearchParams(location.search).get('ong');
        if(!previouslyReady&&!editing&&requested&&data.ongs.some(o=>String(o.id)===requested))form.elements.ongId.value=requested;
      }
      if(!previouslyReady){nav.restoreFilters(main);if(!isOng&&new URLSearchParams(location.search).has('ong'))recordOng.value=form.elements.ongId.value}
      renderRecords();renderRequests();ready=true;
      if(isOng&&(await getSession()).usuario?.perfil!=='admin')$$('[data-delete]').forEach(button=>button.hidden=true);
      if(!previouslyReady)nav.markClean(form);
    }catch(err){
      if(!previouslyReady){if(isOng)$('#pending-count').hidden=true;showError(err)}
      throw err;
    }finally{dataTargets().forEach(el=>el.removeAttribute('aria-busy'))}
  }
  async function perform(action){
    if(busy)return;busy=true;main.setAttribute('aria-busy','true');
    try{await action()}catch(err){toast(err.message,true)}
    finally{busy=false;main.removeAttribute('aria-busy');$('#mvp-save').disabled=!ready}
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();if(busy||!ready||!form.reportValidity())return;
    perform(async()=>{
      // Inclui valores antes de bloquear a edição, para não perder campos do FormData.
      const values=Object.fromEntries(new FormData(form));
      if(!isOng){values.ongId=Number(values.ongId);values.voluntarios=Number(values.voluntarios);values.emoji=data.projetos.find(r=>r.id===editing)?.emoji||'🤝'}
      const controls=[...form.elements].filter(el=>!el.disabled);controls.forEach(el=>el.disabled=true);
      let result;
      try{result=await apiRequest(selectedRequest?'publicar':isOng?'ongs':'projetos',editing?'PUT':'POST',values,selectedRequest||editing||undefined)}
      finally{controls.forEach(el=>el.disabled=false)}
      nav.markClean(form);const savedOng=isOng?(selectedRequest?null:result.id):null;
      reset();
      if(result.acesso)showOngAccess(result.acesso);
      // A gravação já terminou: eventual falha de atualização não deve parecer falha no salvamento.
      try{await refresh()}catch{toast('Registro salvo. Não foi possível atualizar as listas; tente Atualizar dados.',true);return}
      toast('Registro salvo no servidor.');
      if(isOng){
        const ongId=savedOng||data.ongs.find(o=>o.cnpj===values.cnpj.replace(/\D/g,''))?.id;
        if(ongId){const link=document.createElement('a');link.href=`projetos.html?ong=${ongId}`;link.className='btn btn-sm btn-outline';link.textContent='Cadastrar projeto para esta ONG';$('#message').append(' ',link)}
      }
    });
  });
  main.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||busy)return;const d=button.dataset;
    if(d.edit){edit((isOng?data.ongs:data.projetos).find(r=>r.id===Number(d.edit)));return}
    if(d.approve){edit(requests.find(r=>r.id===Number(d.approve)),true);return}
    if(d.status){requestStatus=d.status;nav.set('requestStatus',requestStatus);renderRequests();return}
    if(d.reject){
      if(selectedRequest===Number(d.reject)&&!nav.confirmForm(form))return;
      const reason=prompt('Justificativa da rejeição:');if(!reason?.trim())return;
      perform(async()=>{await apiRequest('rejeitar','POST',{motivo:reason.trim()},d.reject);if(selectedRequest===Number(d.reject))reset();await refresh();toast('Solicitação rejeitada. Histórico preservado.')});
    }
    if(d.delete){
      if(editing===Number(d.delete)&&!nav.confirmForm(form))return;
      if(!confirm('Excluir este registro compartilhado?'+(!isOng?' As oportunidades demonstrativas vinculadas também serão removidas.':'')))return;
      perform(async()=>{await apiRequest(isOng?'ongs':'projetos','DELETE',undefined,d.delete);if(editing===Number(d.delete))reset();await refresh();toast('Registro excluído.')});
    }
  });
  $('#mvp-cancel').onclick=()=>{if(nav.confirmForm(form))reset()};
  $('#reload-mvp').onclick=()=>perform(async()=>{await refresh();toast('Dados atualizados.')});
  search.addEventListener('input',()=>{if(ready)renderRecords()});
  for(const filter of [recordOng,recordStatus])filter?.addEventListener('change',()=>{if(ready)renderRecords()});
  if(isOng){
    requestSearch.addEventListener('input',()=>{if(ready)renderRequests()});
    $('#request-tabs').addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      const tabs=$$('#request-tabs [role="tab"]'),index=tabs.indexOf(document.activeElement);if(index<0)return;
      event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
      tabs[next].click();tabs[next].focus();
    });
    addEventListener('focus',()=>{if(!busy)perform(refresh)});
  }
  reset();await perform(refresh);
});
