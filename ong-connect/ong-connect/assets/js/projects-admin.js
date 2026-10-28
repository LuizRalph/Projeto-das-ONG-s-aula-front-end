/* Projetos e vagas: listagem permanente, operações em modais e persistência PHP. */
document.addEventListener('DOMContentLoaded',async()=>{
  const nav=window.ongNavigation,form=$('#mvp-form'),vacancyForm=$('#vacancy-form');
  const search=$('#record-search'),ongFilter=$('#record-ong-filter'),statusFilter=$('#record-status-filter');
  let ready=false,busy=false,editing=null,deleting=null,vacancyProject=null,editingVacancy=null;
  const days=[['SEG','Segunda'],['TER','Terça'],['QUA','Quarta'],['QUI','Quinta'],['SEX','Sexta'],['SAB','Sábado'],['DOM','Domingo']];
  $('#vacancy-days').innerHTML=days.map(([value,label])=>`<label><input name="diasAtuacao" type="checkbox" value="${value}"> ${label}</label>`).join('');
  form.elements.imagem.insertAdjacentHTML('beforeend',Array.from({length:17},(_,i)=>`<option value="assets/images/demo/projeto-${i+1}.svg">Ilustração ${i+1}</option>`).join(''));
  nav.watchForm(form);nav.watchForm(vacancyForm);
  const error=(id,message='')=>{const el=$(id);el.textContent=message;el.hidden=!message};
  const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function modal(id,relatedForm){
    const el=$(id);let previous=null;
    function close(force=false){
      if(!force&&(busy||(relatedForm&&!nav.confirmForm(relatedForm))))return false;
      el.hidden=true;if(relatedForm){relatedForm.reset();nav.markClean(relatedForm)}
      if(!document.querySelector('.modal-overlay:not([hidden])'))document.body.classList.remove('modal-open');
      if(previous?.isConnected)previous.focus();else $('#create-project').focus();return true;
    }
    el.querySelectorAll('[data-close-modal]').forEach(button=>button.addEventListener('click',()=>close()));
    el.addEventListener('click',event=>{if(event.target===el)close()});
    el.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();close();return}
      if(event.key!=='Tab')return;
      const targets=[...el.querySelectorAll('button,input,select,textarea,a[href]')].filter(item=>!item.disabled&&item.getClientRects().length),first=targets[0],last=targets.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    });
    return{el,close,show(selector){previous=document.activeElement;el.hidden=false;document.body.classList.add('modal-open');(selector?el.querySelector(selector):el.querySelector('button')).focus()}};
  }
  const editor=modal('#project-editor-modal',form),removal=modal('#project-delete-modal'),vacancies=modal('#project-vacancies-modal',vacancyForm);
  function fillOngs(select,placeholder){const value=select.value;select.innerHTML=`<option value="">${placeholder}</option>`+data.ongs.map(item=>`<option value="${item.id}">${escapeHtml(item.nome)}</option>`).join('');select.value=data.ongs.some(item=>String(item.id)===value)?value:''}
  function render(){
    const query=normalize(search.value);
    const items=data.projetos.filter(project=>(!ongFilter.value||String(project.ongId)===ongFilter.value)&&(!statusFilter.value||project.status===statusFilter.value)&&normalize([project.titulo,project.categoria,ong(project.ongId)?.nome].join(' ')).includes(query));
    $('#record-summary').textContent=`${items.length} de ${data.projetos.length} projetos exibidos`;
    $('#records-list').innerHTML=items.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Projeto</th><th>ONG</th><th>Situação</th><th>Ações</th></tr></thead><tbody>${items.map(project=>`<tr><td>${escapeHtml(project.titulo)}</td><td>${escapeHtml(ong(project.ongId)?.nome)}</td><td>${escapeHtml(project.status)}</td><td><div class="inline-actions"><button class="btn btn-sm btn-outline" type="button" data-edit="${project.id}">Editar</button><button class="btn btn-sm btn-outline" type="button" data-delete="${project.id}">Excluir</button><button class="btn btn-sm" type="button" data-vacancies="${project.id}">Cadastrar Vagas</button></div></td></tr>`).join('')}</tbody></table></div>`:'<p class="empty">Nenhum projeto corresponde aos filtros. Use Cadastrar Projeto para criar um.</p>';
  }
  async function refresh(){
    const first=!ready;if(first)showLoading();else $('#records-list').setAttribute('aria-busy','true');
    try{
      await loadData();fillOngs(ongFilter,'Todas as ONGs');
      if(editor.el.hidden)fillOngs(form.elements.ongId,'Selecione');
      if(first){
        nav.restoreFilters();const requested=new URLSearchParams(location.search).get('ong');
        if(requested&&data.ongs.some(item=>String(item.id)===requested)){ongFilter.value=requested;form.elements.ongId.value=requested}
        nav.markClean(form);
      }
      ready=true;render();if(!vacancies.el.hidden)renderVacancies();
    }catch(err){if(first)showError(err);throw err}
    finally{$('#records-list').removeAttribute('aria-busy');$('#mvp-save').disabled=!ready;$('#save-vacancy').disabled=!ready}
  }
  async function operation(action,issue='#project-form-error',overlay=null){
    if(busy)return;busy=true;error(issue);
    const controls=overlay?[...overlay.querySelectorAll('input,select,textarea,button')].map(el=>[el,el.disabled]):[];
    controls.forEach(([el])=>el.disabled=true);
    try{await action()}catch(err){error(issue,err.message)}
    finally{controls.forEach(([el,disabled])=>el.disabled=disabled);busy=false;$('#mvp-save').disabled=!ready;$('#save-vacancy').disabled=!ready}
  }
  function openEditor(project=null){
    form.reset();editing=project?.id||null;form.elements.ongId.disabled=false;
    form.elements.segmentoId.innerHTML='<option value="">Selecione o segmento</option>'+(data.segmentos||[]).filter(s=>Number(s.ativo)||Number(s.id)===Number(project?.segmentoId)).map(s=>`<option value="${s.id}">${escapeHtml(s.nome)}${Number(s.ativo)?'':' (desativado)'}</option>`).join('');
    if(ready)fillOngs(form.elements.ongId,'Selecione');
    form.elements.meta.value='0';
    if(project){for(const field of form.elements)if(field.name&&project[field.name]!=null)field.value=project[field.name]}
    else{const requested=new URLSearchParams(location.search).get('ong');if(requested&&data.ongs?.some(item=>String(item.id)===requested))form.elements.ongId.value=requested}
    const linked=project&&data.oportunidades.some(item=>Number(item.projetoId)===project.id);
    form.elements.ongId.disabled=!!linked;
    $('#project-ong-note').textContent=linked?'A ONG é preservada porque este projeto já possui vagas vinculadas.':'';
    $('#editor-title').textContent=project?'Editar Projeto':'Cadastrar Projeto';
    error('#project-form-error',!ready?'Os dados ainda não foram carregados. Atualize a listagem antes de salvar.':!data.ongs.length?'Cadastre uma ONG antes de criar um projeto.':'');
    nav.markClean(form);editor.show(project?'#mvp-titulo':'#mvp-ongId');
  }
  function openRemoval(project){
    deleting=project.id;const linked=data.oportunidades.filter(item=>Number(item.projetoId)===project.id).length;
    const donations=store.get('doacoes',[]).some(item=>Number(item.projetoId)===project.id);
    $('#project-delete-description').textContent=linked?`“${project.titulo}” possui ${linked} registro(s) de vagas. A exclusão é bloqueada para preservar vínculos e inscrições. Você pode pausar o projeto.`:donations?`“${project.titulo}” possui doações simuladas neste navegador. Pause o projeto para preservar o histórico.`:`Excluir definitivamente “${project.titulo}”? Esta ação não pode ser desfeita.`;
    $('#confirm-delete-project').disabled=linked>0||donations;$('#pause-project').hidden=!(linked>0||donations);error('#project-delete-error');removal.show();
  }
  function setVacancyMode(){const remote=vacancyForm.elements.modalidade.value==='Remoto';vacancyForm.elements.local.required=!remote;document.querySelector('label[for="vacancy-place"]').textContent=remote?'Local / plataforma (opcional)':'Local *'}
  function resetVacancy(item=null){
    vacancyForm.reset();editingVacancy=item?.id||null;error('#vacancy-form-error');
    vacancyForm.querySelectorAll('input,select,textarea').forEach(field=>field.disabled=false);
    if(item)for(const field of vacancyForm.elements)if(field.name&&field.type!=='checkbox'&&item[field.name]!=null)field.value=item[field.name];
    vacancyForm.elements.ativa.checked=item?item.ativa!==false:true;
    const selected=item?diasOportunidade(item):[];
    $$('#vacancy-days input').forEach(field=>field.checked=selected.includes(field.value));
    const linked=item&&candidaturas().some(record=>Number(record.oportunidadeId)===Number(item.id));
    for(const field of [...$$('#vacancy-days input'),vacancyForm.elements.horarioInicio,vacancyForm.elements.horarioFim])field.disabled=!!linked;
    vacancyForm.elements.horarioInicio.required=!(item&&!item.horarioInicio&&!item.horarioFim);
    vacancyForm.elements.horarioFim.required=vacancyForm.elements.horarioInicio.required;
    vacancyForm.elements.vagas.min=String(item?Math.max(1,aprovadosOportunidade(item.id)):1);
    $('#vacancy-agenda-note').textContent=linked?'Esta vaga tem candidaturas neste navegador. A agenda aceita será preservada; a quantidade não pode ficar abaixo dos aprovados.':'';
    $('#vacancy-form-title').textContent=item?'Editar vaga':'Cadastrar vaga';setVacancyMode();nav.markClean(vacancyForm);
  }
  function renderVacancies(){
    const items=opportunitiesForProject(vacancyProject);
    $('#vacancy-list').innerHTML=items.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Função</th><th>Quantidade</th><th>Aprovados neste navegador</th><th>Inscrições</th><th>Ação</th></tr></thead><tbody>${items.map(item=>`<tr><td>${escapeHtml(item.titulo)}<br><small>${escapeHtml(agendaOportunidadeLabel(item))}</small></td><td>${item.vagas}</td><td>${aprovadosOportunidade(item.id)}</td><td>${oportunidadeRecebeInscricoes(item)?'Abertas':'Pausadas'}</td><td><button class="btn btn-sm btn-outline" type="button" data-edit-vacancy="${item.id}">Editar vaga</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="empty">Nenhuma vaga cadastrada para este projeto.</p>';
  }
  function openVacancies(project){vacancyProject=project.id;$('#vacancies-project-name').textContent=project.titulo;resetVacancy();renderVacancies();vacancies.show('#vacancy-title')}
  $('#create-project').addEventListener('click',()=>{if(!busy)openEditor()});
  $('#reload-mvp').addEventListener('click',async()=>{if(busy)return;try{await refresh();toast('Listagem atualizada.')}catch(err){toast(err.message,true)}});
  $('#records-list').addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||busy)return;
    const id=Number(button.dataset.edit||button.dataset.delete||button.dataset.vacancies),project=projeto(id);if(!project)return;
    if(button.dataset.edit)openEditor(project);else if(button.dataset.delete)openRemoval(project);else openVacancies(project);
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();if(!ready||busy||!form.reportValidity())return;
    const values=Object.fromEntries(new FormData(form));values.ongId=Number(form.elements.ongId.value);
    const previous=editing?projeto(editing):null;values.emoji=previous?.emoji||'🤝';
    operation(async()=>{
      await apiRequest('projetos',editing?'PUT':'POST',values,editing||undefined);
      editor.close(true);try{await refresh();toast(previous?'Projeto atualizado com sucesso.':'Projeto cadastrado com sucesso. Use Cadastrar Vagas para definir o voluntariado.')}catch{toast('Projeto salvo. Atualize a listagem para consultar as alterações.',true)}
    },'#project-form-error',editor.el);
  });
  $('#confirm-delete-project').addEventListener('click',()=>operation(async()=>{await apiRequest('projetos','DELETE',undefined,deleting);removal.close(true);await refresh();toast('Projeto excluído com sucesso.')},'#project-delete-error',removal.el));
  $('#pause-project').addEventListener('click',()=>{if(busy)return;const project=projeto(deleting);removal.close(true);openEditor(project);queueMicrotask(()=>form.elements.status.value='Pausado')});
  vacancyForm.elements.modalidade.addEventListener('change',setVacancyMode);
  $('#new-vacancy').addEventListener('click',()=>{if(!busy&&nav.confirmForm(vacancyForm))resetVacancy()});
  $('#vacancy-list').addEventListener('click',event=>{const button=event.target.closest('[data-edit-vacancy]');if(!button||busy||!nav.confirmForm(vacancyForm))return;const item=data.oportunidades.find(item=>item.id===Number(button.dataset.editVacancy)&&Number(item.projetoId)===vacancyProject);if(item){resetVacancy(item);$('#vacancy-title').focus()}});
  vacancyForm.addEventListener('submit',event=>{
    event.preventDefault();if(!ready||busy||!vacancyForm.reportValidity())return;
    const previous=data.oportunidades.find(item=>item.id===editingVacancy);
    const values=Object.fromEntries(new FormData(vacancyForm));values.projetoId=vacancyProject;values.vagas=Number(values.vagas);values.ativa=vacancyForm.elements.ativa.checked;
    const locked=previous&&candidaturas().some(record=>Number(record.oportunidadeId)===previous.id);
    values.diasAtuacao=locked?diasOportunidade(previous):$$('#vacancy-days input:checked').map(field=>field.value);
    values.horarioInicio=locked?(previous.horarioInicio||''):vacancyForm.elements.horarioInicio.value;values.horarioFim=locked?(previous.horarioFim||''):vacancyForm.elements.horarioFim.value;
    if(!values.diasAtuacao.length)return error('#vacancy-form-error','Selecione ao menos um dia de atuação.');
    if(values.horarioInicio&&values.horarioFim&&values.horarioInicio>=values.horarioFim)return error('#vacancy-form-error','O término deve ser posterior ao início.');
    if(previous&&values.vagas<aprovadosOportunidade(previous.id))return error('#vacancy-form-error','A quantidade não pode ficar abaixo do número de aprovados neste navegador.');
    operation(async()=>{
      await apiRequest('oportunidades',editingVacancy?'PUT':'POST',values,editingVacancy||undefined);
      nav.markClean(vacancyForm);await refresh();
      error('#vacancy-form-error');$('#vacancy-form-title').textContent='Vaga salva com sucesso. Cadastrar outra vaga';
    },'#vacancy-form-error',vacancies.el).then(()=>{if($('#vacancy-form-error').hidden&&$('#vacancy-form-title').textContent.startsWith('Vaga salva')){resetVacancy();$('#vacancy-form-title').textContent='Vaga salva com sucesso. Cadastrar outra vaga'}});
  });
  search.addEventListener('input',()=>{if(ready)render()});for(const select of [ongFilter,statusFilter])select.addEventListener('change',()=>{if(ready)render()});
  try{await refresh()}catch{}nav.markClean(vacancyForm);
});
