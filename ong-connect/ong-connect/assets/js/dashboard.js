function adminTable(headers,rows){return `<div class="table-wrap"><table class="table"><thead><tr>${headers.map(h=>`<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
async function adminInit(){const page=document.body.dataset.page;if(page==='dashboard')return;showLoading();try{await loadData()}catch(e){showError(e);return}dataTargets().forEach(el=>el.removeAttribute('aria-busy'));
if(page==='admin-ongs'){
 const requestList=$('#ong-requests-list');
 let approvedRequestId=null;
 const requestsPanel=$('#ong-requests-panel'),registerPanel=$('#ong-register-panel');
 const draftKey='ongs_cadastro_rascunhos';
 const drafts=()=>store.get(draftKey,{});
 const saveDraftRecord=(id,values)=>{const all=drafts();all[String(id)]={...values,atualizadoEm:new Date().toISOString()};store.set(draftKey,all)};
 const fillRequest=(r)=>{approvedRequestId=r.id;$('#edit-ong-id').value='';$('#ong-form').reset();uploadVersao++;imagemAtual='';imagemInvalida=false;imagemEmAnalise=false;preview();const draft={...(drafts()[String(r.id)]||{}),...(r.complementacao||{})};$('#ong-nome').value=draft.nome||r.nome||'';$('#ong-cidade').value=draft.cidade||r.cidade||'';$('#ong-email').value=draft.email||r.email||'';$('#ong-descricao').value=draft.descricao||r.descricao||'';$('#ong-sigla').value=draft.sigla||'';$('#ong-missao').value=draft.missao||'';fillExtras({...r,...draft,cnpj:draft.cnpj||r.cnpj||'',representante:draft.representante||r.responsavel||'',telefone:draft.telefone||r.telefone||''});if(draft.categoria)$('#ong-categoria').value=draft.categoria;if(draft.cor)$('#ong-cor').value=draft.cor;imagemAtual=draft.imagem||'';preview();$('#ong-form-title').textContent='Cadastrar ONG aprovada — '+r.nome;$('#ong-draft-notice').hidden=false;$('#ong-draft-notice').textContent='Solicitação aprovada. Complete os campos restantes, salve como rascunho ou publique quando estiver pronta.';$('#save-ong-draft').hidden=false;$('#cancel-ong').hidden=false;$('#save-ong').textContent='Concluir cadastro e publicar';registerPanel.open=true;registerPanel.scrollIntoView({behavior:'smooth',block:'start'})};
 
 const refreshRequests=()=>{if(!requestList)return;const arr=store.get('solicitacoes_ongs',[]);const pending=arr.filter(r=>r.status==='Pendente').length;const preapproved=arr.filter(r=>['Aprovado','Aguardando complementação','Aguardando revisão'].includes(r.status)).length;const pendingBadge=$('#pending-count'),preapprovedBadge=$('#preapproved-count');pendingBadge.textContent=pending?`${pending} pendente${pending===1?'':'s'}`:'';pendingBadge.hidden=!pending;preapprovedBadge.textContent=preapproved?`${preapproved} pré-aprovada${preapproved===1?'':'s'}`:'';preapprovedBadge.hidden=!preapproved;requestList.innerHTML=arr.length?arr.slice().reverse().map(r=>`<article class="request-review-card"><h3>${escapeHtml(r.nome)} <span class="status-pill status-${['Aprovado','Aguardando complementação','Aguardando revisão'].includes(r.status)?'aprovado':r.status==='Rejeitado'?'rejeitado':r.status==='Cadastrada'?'aprovado':'pendente'}">${escapeHtml(r.status)}</span></h3><p><strong>CNPJ:</strong> ${escapeHtml(r.cnpj)} · <strong>Cidade:</strong> ${escapeHtml(r.cidade)}</p><p><strong>Responsável:</strong> ${escapeHtml(r.responsavel)} · <strong>E-mail:</strong> ${escapeHtml(r.email)} · <strong>Telefone:</strong> ${escapeHtml(r.telefone)}</p><p>${escapeHtml(r.descricao)}</p><p><small>Recebido em ${new Date(r.data).toLocaleString('pt-BR')}${r.motivo?' · Justificativa: '+escapeHtml(r.motivo):''}</small></p>${['Aprovado','Aguardando complementação','Aguardando revisão'].includes(r.status)?`<div class="request-review-actions"><button class="btn btn-sm" type="button" data-request-id="${r.id}" data-request-action="Continuar">${r.status==='Aguardando revisão'?'Revisar e publicar':'Continuar cadastro'}</button><button class="btn btn-sm btn-outline" type="button" data-request-id="${r.id}" data-request-action="SolicitarComplementacao">Solicitar informações restantes</button></div>${r.linkComplementacao?`<p class="note">Link demonstrativo para o cadastrante: <a href="../pages/complementar-ong.html?pedido=${encodeURIComponent(r.id)}" target="_blank">Abrir formulário de complementação</a> (mesmo navegador)</p>`:''}`:''}${r.status==='Pendente'?`<div class="request-review-actions"><button class="btn btn-sm" type="button" data-request-id="${r.id}" data-request-action="Aprovado">Aprovar solicitação</button><button class="btn btn-sm btn-outline" type="button" data-request-id="${r.id}" data-request-action="Rejeitado">Rejeitar</button></div>`:''}</article>`).join(''):'<p class="muted">Nenhuma solicitação registrada neste navegador.</p>'};
 requestList?.addEventListener('click',e=>{const btn=e.target.closest('[data-request-action]');if(!btn)return;const arr=store.get('solicitacoes_ongs',[]),r=arr.find(x=>String(x.id)===btn.dataset.requestId);if(!r)return;if(btn.dataset.requestAction==='Continuar'){fillRequest(r);return}if(btn.dataset.requestAction==='SolicitarComplementacao'){r.status='Aguardando complementação';r.linkComplementacao=true;r.dataSolicitacaoComplementacao=new Date().toISOString();try{store.set('solicitacoes_ongs',arr)}catch{toast('Falha ao salvar solicitação.',true);return}refreshRequests();toast('Complementação solicitada. Compartilhe o link exibido com o cadastrante (demonstração no mesmo navegador).');return}if(r.status!=='Pendente')return;const status=btn.dataset.requestAction;const motivo=status==='Rejeitado'?prompt('Informe o motivo da rejeição:'):'';if(status==='Rejeitado'&&(!motivo||!motivo.trim()))return;r.status=status;r.motivo=motivo||'';r.dataAnalise=new Date().toISOString();try{store.set('solicitacoes_ongs',arr)}catch{toast('Falha ao salvar análise.',true);return}refreshRequests();if(status==='Aprovado'){fillRequest(r);toast('Solicitação pré-aprovada. Use Solicitar informações restantes para disponibilizar o formulário ao cadastrante.')}else{toast('Solicitação rejeitada.')}});refreshRequests();requestsPanel.open=false;registerPanel.open=false;window.addEventListener('storage',e=>{if(e.key&&e.key.includes('solicitacoes_ongs'))refreshRequests()});window.addEventListener('focus',refreshRequests);

 const extraFields=()=>Object.fromEntries([...document.querySelectorAll('[data-extra]')].map(el=>[el.dataset.extra,el.value.trim()]));
 const fillExtras=v=>document.querySelectorAll('[data-extra]').forEach(el=>{el.value=v?.[el.dataset.extra]||''});
 const fields={nome:'#ong-nome',sigla:'#ong-sigla',categoria:'#ong-categoria',cidade:'#ong-cidade',email:'#ong-email',cor:'#ong-cor',descricao:'#ong-descricao',missao:'#ong-missao'};
 $('#ong-form').addEventListener('submit',e=>{
  const form=e.currentTarget,field=form.querySelector('[data-extra="cnpj"]');
  if(!field)return;
  const currentOngId=Number($('#edit-ong-id').value)||null;
  if(cnpjOcupado(field.value,currentOngId?null:approvedRequestId,currentOngId)){
   e.preventDefault();
   e.stopImmediatePropagation();
   toast('Este CNPJ já está associado a outra solicitação ativa ou ONG cadastrada.',true);
  }
 },true);
 let imagemAtual='';
 let imagemEmAnalise=false;
 let imagemInvalida=false;
 let uploadVersao=0;
 const preview=()=>{const area=$('#ong-imagem-preview');area.innerHTML='';if(imagemAtual){const img=document.createElement('img');img.src=imagemAtual;img.alt='Prévia da identidade visual';img.className='ong-preview-image';area.append(img)}else area.textContent='Nenhuma imagem selecionada. Serão exibidas as iniciais.';$('#ong-remover-imagem').hidden=!imagemAtual};
 $('#ong-imagem').addEventListener('change',async e=>{
   const file=e.target.files[0];
   const versao=++uploadVersao;
   if(!file){imagemInvalida=false;return;}
   imagemEmAnalise=true;
   imagemInvalida=true;
   const input=e.target;
   const falha=(mensagem)=>{if(versao!==uploadVersao)return;input.value='';imagemInvalida=true;toast(mensagem,true);};
   try{
     if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>1024*1024){
       falha('Selecione uma imagem JPG, PNG ou WebP de até 1 MB.');return;
     }
     // Examina as dimensões originais do arquivo, sem redimensioná-lo.
     const dimensoes=await new Promise((resolve,reject)=>{
       const url=URL.createObjectURL(file);
       const img=new Image();
       img.onload=()=>{const resultado={largura:img.naturalWidth,altura:img.naturalHeight};URL.revokeObjectURL(url);resolve(resultado)};
       img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Imagem inválida'))};
       img.src=url;
     });
     if(versao!==uploadVersao)return;
     if(dimensoes.largura!==1200||dimensoes.altura!==600){
       falha(`Imagem recusada: ${dimensoes.largura} × ${dimensoes.altura} px. É obrigatório usar exatamente 1200 × 600 px.`);return;
     }
     const result=await new Promise((resolve,reject)=>{
       const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);
     });
     if(versao!==uploadVersao)return;
     imagemAtual=result;
     imagemInvalida=false;
     preview();
     toast('Imagem de 1200 × 600 px aceita.');
   }catch{
     falha('Não foi possível verificar a imagem. Selecione outro arquivo JPG, PNG ou WebP.');
   }finally{if(versao===uploadVersao)imagemEmAnalise=false;}
 });
 $('#ong-remover-imagem').onclick=()=>{uploadVersao++;imagemEmAnalise=false;imagemInvalida=false;imagemAtual='';$('#ong-imagem').value='';preview()};
 const reset=()=>{approvedRequestId=null;$('#ong-draft-notice').hidden=true;$('#save-ong-draft').hidden=true;uploadVersao++;imagemEmAnalise=false;imagemInvalida=false;$('#ong-form').reset();imagemAtual='';preview();$('#edit-ong-id').value='';$('#ong-form-title').textContent='Cadastrar ONG';$('#save-ong').textContent='Cadastrar ONG';$('#cancel-ong').hidden=true};
 const refresh=()=>{$('#admin-ongs').innerHTML=adminTable(['Organização','Categoria','Cidade','E-mail','Ações'],data.ongs.map(o=>[escapeHtml(o.nome),escapeHtml(o.categoria),escapeHtml(o.cidade),escapeHtml(o.email),`<button type="button" class="btn btn-sm btn-outline edit-ong" data-id="${o.id}">Editar</button>`]));$$('.edit-ong').forEach(b=>b.onclick=()=>{const o=ong(b.dataset.id);$('#edit-ong-id').value=o.id;for(const [key,sel] of Object.entries(fields))$(sel).value=o[key]|| (key==='cor'?'#087f70':'');fillExtras(o);uploadVersao++;imagemEmAnalise=false;imagemInvalida=false;imagemAtual=o.imagem||'';$('#ong-imagem').value='';preview();$('#ong-form-title').textContent='Editar ONG';$('#save-ong').textContent='Salvar alterações';$('#cancel-ong').hidden=false;registerPanel.open=true;$('#ong-form').scrollIntoView({behavior:'smooth',block:'start'});$('#ong-nome').focus()})};
 $('#save-ong-draft').onclick=()=>{if(approvedRequestId===null)return;const values={...Object.fromEntries(Object.entries(fields).map(([key,sel])=>[key,$(sel).value.trim()])),...extraFields(),imagem:imagemAtual};try{saveDraftRecord(approvedRequestId,values);toast('Rascunho salvo. Você poderá continuar o cadastro depois.')}catch{toast('Não foi possível salvar o rascunho.',true)}};
 $('#cancel-ong').onclick=reset;refresh();$('#ong-form').onsubmit=e=>{e.preventDefault();if(imagemEmAnalise)return toast('Aguarde a verificação das dimensões da imagem.',true);if(imagemInvalida)return toast('A imagem selecionada foi recusada. Escolha uma imagem de 1200 × 600 px ou remova a seleção inválida.',true);if(!e.currentTarget.reportValidity())return;const id=Number($('#edit-ong-id').value);const values={...Object.fromEntries(Object.entries(fields).map(([key,sel])=>[key,$(sel).value.trim()])),...extraFields(),imagem:imagemAtual};if(!values.nome||!values.sigla||!values.cidade)return toast('Preencha os campos obrigatórios.',true);if(values.cnpj&&!/^\d{14}$/.test(values.cnpj.replace(/\D/g,'')))return toast('Informe um CNPJ com 14 dígitos.',true);if(values.possuiParcerias==='Sim'&&(!values.orgaoParceiro||!values.identificacaoParceria))return toast('Informe o órgão e a identificação da parceria pública.',true);try{if(id){const changes=store.get('ongs_edicoes',{});changes[id]=values;store.set('ongs_edicoes',changes);Object.assign(ong(id),values)}else{const novo={id:Math.max(0,...data.ongs.map(o=>o.id))+1,...values};const extras=store.get('ongs');extras.push(novo);store.set('ongs',extras);data.ongs.push(novo);if(approvedRequestId!==null){const pedidos=store.get('solicitacoes_ongs',[]);const pedido=pedidos.find(p=>String(p.id)===String(approvedRequestId));if(pedido){pedido.status='Cadastrada';pedido.ongId=novo.id;const all=drafts();delete all[String(approvedRequestId)];store.set(draftKey,all);pedido.dataCadastro=new Date().toISOString();store.set('solicitacoes_ongs',pedidos)}}}}catch(err){return toast('Não foi possível salvar. O armazenamento do navegador pode estar cheio; tente uma imagem menor.',true)}refresh();refreshRequests();reset();toast(id?'ONG atualizada com sucesso.':'ONG cadastrada com sucesso.')};
}
if(page==='admin-projects'){
 const fields={ongId:'#ong',titulo:'#titulo',categoria:'#categoria',meta:'#meta',descricao:'#descricao'};
 const legacyDays=period=>{const value=String(period||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),terms={SEG:['segunda','seg'],TER:['terca','ter'],QUA:['quarta','qua'],QUI:['quinta','qui'],SEX:['sexta','sex'],SAB:['sabado','sab'],DOM:['domingo','dom']};return dayOptions.filter(([day])=>terms[day].some(term=>value.includes(term))).map(([day])=>day)};
 const projectDays=()=>$$('.project-day',editor).filter(input=>input.checked).map(input=>input.value);
 const setProjectDays=days=>$$('.project-day',editor).forEach(input=>{input.checked=days.includes(input.value)});
 const reset=()=>{$('#project-form').reset();$('#ong').value='';$('#edit-project-id').value='';$('#project-volunteers-needed').value='0';setProjectDays([]);$('#project-opportunity-list').replaceChildren();$('#project-form-title').textContent='Novo projeto (demonstração)';$('#save-project').textContent='Cadastrar projeto';$('#cancel-project').hidden=true};
 $('#ong').innerHTML='<option value="" selected disabled>Selecione a ONG responsável</option>'+data.ongs.map(o=>`<option value="${o.id}">${escapeHtml(o.nome)}</option>`).join('');
 const projectForm=$('#project-form'),dayOptions=[['SEG','Segunda-feira'],['TER','Terça-feira'],['QUA','Quarta-feira'],['QUI','Quinta-feira'],['SEX','Sexta-feira'],['SAB','Sábado'],['DOM','Domingo']];
 const editor=document.createElement('section');editor.className='form-group full project-volunteer-editor';
 editor.innerHTML=`<h3>Planejamento de voluntariado</h3><p class="note">A meta conta pessoas únicas; vagas e horários são definidos por oportunidade.</p><div class="form-group"><label for="project-volunteers-needed">Voluntários necessários</label><input class="field" id="project-volunteers-needed" type="number" min="0" max="10000" step="1" value="0"><small class="muted">Use 0 quando o projeto não precisar de voluntários.</small></div><fieldset class="project-days"><legend>Dias de atuação padrão</legend><div class="project-day-options">${dayOptions.map(([value,label])=>`<label><input type="checkbox" class="project-day" value="${value}"> ${label}</label>`).join('')}</div></fieldset><div class="project-opportunities"><div class="project-opportunities-heading"><div><h4>Oportunidades</h4><p class="muted">Cada oportunidade tem vagas e horário próprios; os dias padrão vêm do projeto.</p></div><button type="button" class="btn btn-outline btn-sm" id="add-project-opportunity">Adicionar oportunidade</button></div><div id="project-opportunity-list"></div></div>`;
 $('#save-project').parentElement.before(editor);
 let opportunityRowId=0;
 const addOpportunityRow=(item={})=>{
  const rowId=++opportunityRowId,existing=item.id!==undefined&&item.id!==null,container=$('#project-opportunity-list');
  const hasApplications=existing&&store.get('candidaturas',[]).some(c=>Number(c.oportunidadeId)===Number(item.id));
  const row=document.createElement('fieldset');row.className='project-opportunity-row';row.dataset.opportunityId=existing?String(item.id):'';
  row.innerHTML=`<legend>${existing?'Oportunidade cadastrada':'Nova oportunidade'}</legend><div class="form-grid"><div class="form-group"><label for="opportunity-title-${rowId}">Função / oportunidade *</label><input id="opportunity-title-${rowId}" class="field opportunity-title" maxlength="100" required value="${escapeHtml(item.titulo||'')}"></div><div class="form-group"><label for="opportunity-vacancies-${rowId}">Vagas *</label><input id="opportunity-vacancies-${rowId}" class="field opportunity-vacancies" type="number" min="1" max="10000" step="1" required value="${escapeHtml(item.vagas??1)}"></div><div class="form-group"><label for="opportunity-modality-${rowId}">Modalidade *</label><select id="opportunity-modality-${rowId}" class="field opportunity-modality" required><option value="">Selecione</option><option value="Presencial">Presencial</option><option value="Híbrido">Híbrido</option><option value="Remoto">Remoto</option></select></div><div class="form-group"><label for="opportunity-location-${rowId}">Local *</label><input id="opportunity-location-${rowId}" class="field opportunity-location" maxlength="100" required value="${escapeHtml(item.local||'')}"></div><fieldset class="form-group full opportunity-days"><legend>Dias específicos (opcional; em branco usa os dias padrão do projeto)</legend><div>${dayOptions.map(([value,label])=>`<label><input type="checkbox" class="opportunity-day" value="${value}" ${Array.isArray(item.diasAtuacao)&&item.diasAtuacao.includes(value)?'checked':''}> ${label}</label>`).join('')}</div></fieldset><div class="form-group"><label for="opportunity-start-${rowId}">Início *</label><input id="opportunity-start-${rowId}" class="field opportunity-start" type="time" required value="${escapeHtml(item.horarioInicio||'09:00')}"></div><div class="form-group"><label for="opportunity-end-${rowId}">Término *</label><input id="opportunity-end-${rowId}" class="field opportunity-end" type="time" required value="${escapeHtml(item.horarioFim||'12:00')}"></div><div class="form-group"><label for="opportunity-period-${rowId}">Período / observação</label><input id="opportunity-period-${rowId}" class="field opportunity-period" maxlength="100" value="${escapeHtml(item.periodo||'')}"></div><div class="form-group opportunity-remove-wrap"><button type="button" class="btn btn-outline btn-sm remove-project-opportunity" ${hasApplications?'disabled title="Não é possível remover: há candidaturas vinculadas a esta oportunidade."':''}>Remover</button></div></div>${existing&&(!item.horarioInicio||!item.horarioFim)?'<small class="muted">Horários sugeridos para dados antigos; revise antes de salvar.</small>':''}`;
  container.append(row);
  $(`#opportunity-modality-${rowId}`).value=item.modalidade||'';
 };
 $('#add-project-opportunity').addEventListener('click',()=>addOpportunityRow());
 $('#project-opportunity-list').addEventListener('click',e=>{const button=e.target.closest('.remove-project-opportunity');if(button&&!button.disabled)button.closest('.project-opportunity-row').remove()});
 const readOpportunityRows=defaults=>{
  const rows=$$('.project-opportunity-row',$('#project-opportunity-list')),result=[];
  for(const row of rows){
   const days=$$('.opportunity-day',row).filter(input=>input.checked).map(input=>input.value),effectiveDays=days.length?days:defaults;
   const record={id:row.dataset.opportunityId?Number(row.dataset.opportunityId):null,titulo:$('.opportunity-title',row).value.trim(),vagas:Number($('.opportunity-vacancies',row).value),modalidade:$('.opportunity-modality',row).value,local:$('.opportunity-location',row).value.trim(),diasAtuacao:effectiveDays,horarioInicio:$('.opportunity-start',row).value,horarioFim:$('.opportunity-end',row).value,periodo:$('.opportunity-period',row).value.trim()};
   if(!record.titulo||!Number.isInteger(record.vagas)||record.vagas<1||!record.modalidade||!record.local)return {error:'Preencha função, vagas, modalidade e local de cada oportunidade.'};
   if(!record.diasAtuacao.length)return {error:'Defina dias padrão no projeto ou dias específicos em cada oportunidade.'};
   if(!record.horarioInicio||!record.horarioFim||record.horarioFim<=record.horarioInicio)return {error:'O término de cada oportunidade deve ser posterior ao horário de início.'};
   result.push(record);
  }
  return {rows:result};
 };
 const refresh=()=>{
  $('#admin-projects').innerHTML=adminTable(['Projeto','ONG','Categoria','Meta (R$)','Pessoas necessárias','Vagas','Oportunidades','Ações'],data.projetos.map(p=>{
   const opportunities=data.oportunidades.filter(o=>Number(o.projetoId)===Number(p.id));
   return [escapeHtml(p.titulo),escapeHtml(ong(p.ongId)?.nome),escapeHtml(p.categoria),money(p.meta),String(p.voluntariosNecessarios??'—'),String(opportunities.reduce((sum,item)=>sum+(Number(item.vagas)||0),0)),String(opportunities.length),`<button type="button" class="btn btn-sm btn-outline edit-project" data-id="${p.id}">Editar</button>`];
  }));
  $$('.edit-project').forEach(button=>button.onclick=()=>{
   const p=projeto(button.dataset.id),linked=data.oportunidades.filter(o=>Number(o.projetoId)===Number(p.id));
   $('#edit-project-id').value=p.id;
   for(const [key,selector] of Object.entries(fields))$(selector).value=p[key]??'';
   $('#project-volunteers-needed').value=Number(p.voluntariosNecessarios)||0;
   const defaultDays=Array.isArray(p.diasAtuacao)&&p.diasAtuacao.length?p.diasAtuacao:[...new Set(linked.flatMap(o=>Array.isArray(o.diasAtuacao)&&o.diasAtuacao.length?o.diasAtuacao:legacyDays(o.periodo)))];
   setProjectDays(defaultDays);
   $('#project-opportunity-list').replaceChildren();
  linked.forEach(item=>addOpportunityRow({...item,diasAtuacao:Array.isArray(item.diasEspecificos)?item.diasEspecificos:Array.isArray(item.diasAtuacao)?item.diasAtuacao:legacyDays(item.periodo)}));
   $('#project-form-title').textContent='Editar projeto';
   $('#save-project').textContent='Salvar alterações';
   $('#cancel-project').hidden=false;
   $('#project-form').scrollIntoView({behavior:'smooth',block:'start'});
   $('#titulo').focus();
  });
 };
 $('#cancel-project').onclick=reset;
 refresh();
 projectForm.addEventListener('submit',e=>{
  e.preventDefault();
  if(!projectForm.reportValidity())return;
  const editingId=Number($('#edit-project-id').value)||null,volunteersNeeded=Number($('#project-volunteers-needed').value),defaultDays=projectDays();
  if(!Number.isInteger(volunteersNeeded)||volunteersNeeded<0)return toast('Informe uma meta inteira de voluntários igual ou maior que zero.',true);
  const parsed=readOpportunityRows(defaultDays);
  if(parsed.error)return toast(parsed.error,true);
  if(volunteersNeeded>0&&!parsed.rows.length)return toast('Cadastre ao menos uma oportunidade para receber voluntários.',true);
  const values={ongId:Number($('#ong').value),titulo:$('#titulo').value.trim(),categoria:$('#categoria').value,meta:Number($('#meta').value),descricao:$('#descricao').value.trim(),voluntariosNecessarios:volunteersNeeded,diasAtuacao:defaultDays};
  if(!values.titulo||!values.descricao||values.meta<=0||!ong(values.ongId))return toast('Confira os dados do projeto.',true);
  const previousProject=editingId?projeto(editingId):null;
  if(editingId&&!previousProject)return toast('O projeto selecionado não foi encontrado.',true);
  const currentLinked=editingId?data.oportunidades.filter(o=>Number(o.projetoId)===editingId):[];
  const submittedIds=new Set(parsed.rows.filter(o=>o.id!==null).map(o=>String(o.id)));
  const removed=currentLinked.filter(o=>!submittedIds.has(String(o.id)));
  const candidateRecords=store.get('candidaturas',[]);
  if(removed.some(o=>candidateRecords.some(c=>Number(c.oportunidadeId)===Number(o.id))))return toast('Não é possível remover uma oportunidade com candidaturas vinculadas.',true);
  let projectRecord;
  if(previousProject)projectRecord={...previousProject,...values};
  else projectRecord={id:Math.max(0,...data.projetos.map(p=>Number(p.id)||0))+1,...values,arrecadado:0,voluntarios:0,status:'Ativo',emoji:'🤝',criadoEm:new Date().toISOString()};
  let nextOpportunityId=Math.max(0,...data.oportunidades.map(o=>Number(o.id)||0),...store.get('oportunidades_removidas',[]).map(Number))+1;
  const opportunityRows=$$('.project-opportunity-row',$('#project-opportunity-list'));
  const opportunityRecords=parsed.rows.map((row,index)=>{
   const specificDays=opportunityRows[index];
   const selectedDays=specificDays?$$('.opportunity-day',specificDays).filter(input=>input.checked).map(input=>input.value):[];
   return {...row,id:row.id??nextOpportunityId++,projetoId:projectRecord.id,diasEspecificos:selectedDays};
  });
  const keys=['projetos','projetos_edicoes','oportunidades','oportunidades_edicoes','oportunidades_removidas'],snapshots=Object.fromEntries(keys.map(key=>[`ongconnect_${key}`,localStorage.getItem(`ongconnect_${key}`)]));
  const localProjects=store.get('projetos',[]),projectEdits=store.get('projetos_edicoes',{}),localOpportunities=store.get('oportunidades',[]),opportunityEdits=store.get('oportunidades_edicoes',{}),removedIds=new Set(store.get('oportunidades_removidas',[]).map(String));
  if(previousProject)projectEdits[editingId]=values;else localProjects.push(projectRecord);
  for(const item of opportunityRecords){
   if(parsed.rows.find(row=>Number(row.id)===Number(item.id)))opportunityEdits[item.id]=item;
   else localOpportunities.push(item);
  }
  for(const item of removed){removedIds.add(String(item.id));delete opportunityEdits[item.id]}
  try{
   store.set('projetos',localProjects);store.set('projetos_edicoes',projectEdits);store.set('oportunidades',localOpportunities);store.set('oportunidades_edicoes',opportunityEdits);store.set('oportunidades_removidas',[...removedIds]);
  }catch(error){
   for(const [key,value] of Object.entries(snapshots)){if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value)}
   return toast('Não foi possível salvar projeto e oportunidades. Libere espaço no navegador e tente novamente.',true);
  }
  if(previousProject)Object.assign(previousProject,values);else data.projetos.push(projectRecord);
  data.oportunidades=data.oportunidades.filter(o=>!removedIds.has(String(o.id)));
  for(const item of opportunityRecords){const existing=data.oportunidades.find(o=>Number(o.id)===Number(item.id));if(existing)Object.assign(existing,item);else data.oportunidades.push(item)}
  refresh();reset();toast(editingId?'Projeto e oportunidades atualizados.':'Projeto e oportunidades cadastrados.');
 });
}
if(page==='admin-volunteers'){
 const opportunity=id=>data.oportunidades.find(o=>Number(o.id)===Number(id));
 const history=c=>Array.isArray(c.historico)?c.historico:[];
 const fmtDate=d=>{const dt=new Date(d);return Number.isNaN(dt.getTime())?'—':dt.toLocaleString('pt-BR')};
 const close=(id)=>{const el=$(id);el.hidden=true;if(!$$('.modal-overlay:not([hidden])').length)document.body.classList.remove('modal-open')};
 const open=(id)=>{$(id).hidden=false;document.body.classList.add('modal-open');if(id==='#decision-modal')window.ongNavigation?.markClean($('#decision-form'))};
 const filters=document.createElement('div');filters.className='filters volunteer-filters';filters.innerHTML='<label for="volunteer-filter-project">Projeto</label><select class="field" id="volunteer-filter-project"><option value="">Todos</option></select><label for="volunteer-filter-opportunity">Oportunidade</label><select class="field" id="volunteer-filter-opportunity"><option value="">Todas</option></select><label for="volunteer-filter-status">Status</label><select class="field" id="volunteer-filter-status"><option value="">Todos</option></select>';
 $('#admin-volunteers').before(filters);
 filters.querySelector('#volunteer-filter-project').insertAdjacentHTML('beforeend',data.projetos.map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.titulo)}</option>`).join(''));
 filters.querySelector('#volunteer-filter-opportunity').insertAdjacentHTML('beforeend',data.oportunidades.map(o=>`<option value="${escapeHtml(o.id)}">${escapeHtml(o.titulo)}</option>`).join(''));
 filters.querySelector('#volunteer-filter-status').insertAdjacentHTML('beforeend',['Pendente','Lista de espera','Aprovado','Cancelado','Rejeitado'].map(status=>`<option>${escapeHtml(status)}</option>`).join(''));
 filters.querySelectorAll('select').forEach(el=>el.addEventListener('change',()=>refresh()));
 window.ongNavigation?.restoreFilters(filters);
 const refresh=()=>{
  const openGroups=new Set($$('#admin-volunteers .volunteer-project-group[open]').map(group=>group.dataset.projectId));
  const selectedOpportunity=$('#volunteer-filter-opportunity').value,selectedStatus=$('#volunteer-filter-status').value;
    const selectedProject=$('#volunteer-filter-project').value,all=candidaturas();
    const projects=data.projetos.filter(p=>!selectedProject||String(p.id)===selectedProject).map(project=>{
     const opportunities=data.oportunidades.filter(item=>Number(item.projetoId)===Number(project.id));
     if(!opportunities.length)return '';
     const projectCandidates=all.filter(candidate=>opportunities.some(item=>Number(item.id)===Number(candidate.oportunidadeId)));
     const approvedUnique=new Set(projectCandidates.filter(candidate=>candidate.status==='Aprovado').map(candidate=>normalizarEmail(candidate.email))).size;
     const goal=Number(project.voluntariosNecessarios)||0;
     const statusSummary=['Aprovado','Pendente','Lista de espera','Desistente','Rejeitado'].map(status=>{
      const count=projectCandidates.filter(candidate=>candidate.status===status).length;
      const label={Aprovado:'Aprovados',Pendente:'Pendentes','Lista de espera':'Lista de espera',Desistente:'Desistentes',Rejeitado:'Rejeitados'}[status];
      return count?`<span class="volunteer-summary-status status-${status==='Aprovado'?'aprovado':status==='Pendente'?'pendente':status==='Lista de espera'?'espera':'outros'}">${escapeHtml(label)}: ${count}</span>`:'';
     }).join('');
     const opportunitySections=opportunities.filter(item=>!selectedOpportunity||String(item.id)===selectedOpportunity).map(item=>{
      const dayLabels={SEG:'Seg',TER:'Ter',QUA:'Qua',QUI:'Qui',SEX:'Sex',SAB:'Sáb',DOM:'Dom'};
      const days=diasOportunidade(item).map(day=>dayLabels[day]||day).join(', ')||'Dias não definidos';
      const approved=aprovadosOportunidade(item.id),available=vagasDisponiveis(item),waiting=candidaturasEmEspera(item.id);
      const records=projectCandidates.filter(candidate=>Number(candidate.oportunidadeId)===Number(item.id)&&(!selectedStatus||candidate.status===selectedStatus));
      const rows=records.map(candidate=>{
       const reviewable=['Pendente','Lista de espera'].includes(candidate.status);
       const action=reviewable?`<button type="button" class="btn btn-sm approve-candidate" data-id="${candidate.id}" ${available<=0?'disabled':''}>${candidate.status==='Lista de espera'?'Promover':'Aprovar'}</button><button type="button" class="btn btn-sm btn-outline reject-candidate" data-id="${candidate.id}">Rejeitar</button>`:candidate.status==='Aprovado'?`<button type="button" class="btn btn-sm btn-outline withdraw-candidate" data-id="${candidate.id}">Registrar desistência</button>`:'';
       return [escapeHtml(candidate.nome),escapeHtml(candidate.email),escapeHtml(candidate.cidade||'—'),fmtDate(candidate.data),`<span class="status-pill status-${escapeHtml(String(candidate.status).toLowerCase().replaceAll(' ','-'))}">${escapeHtml(candidate.status)}</span>`,`<div class="inline-actions"><button type="button" class="btn btn-sm btn-outline view-candidate" data-id="${candidate.id}">Visualizar</button>${action}</div>`];
      });
      return `<section class="volunteer-opportunity-group"><div class="volunteer-opportunity-heading"><div><h3>${escapeHtml(item.titulo)}</h3><p>${escapeHtml(item.modalidade)} · ${escapeHtml(item.local)} · ${escapeHtml(days)} · ${escapeHtml(item.horarioInicio||'—')}–${escapeHtml(item.horarioFim||'—')}</p></div><div class="volunteer-opportunity-capacity">${approved}/${Number(item.vagas)||0} aprovados · ${available} vagas · ${waiting} em espera</div></div>${rows.length?adminTable(['Voluntário','E-mail','Cidade','Candidatura','Status','Ações'],rows):'<p class="empty volunteer-opportunity-empty">Nenhuma candidatura para esta oportunidade com os filtros selecionados.</p>'}</section>`;
     }).join('');
     const organization=ong(project.ongId)?.nome||'ONG não identificada';
    return `<details class="volunteer-project-group" data-project-id="${project.id}"><summary><span class="volunteer-project-heading"><span class="volunteer-project-name">${escapeHtml(organization)} · ${escapeHtml(project.titulo)}</span><span class="volunteer-project-statuses">${statusSummary||'<span class="volunteer-summary-status">Sem candidaturas</span>'}</span><span class="volunteer-project-progress">${approvedUnique}${goal?` / ${goal}`:''} pessoas únicas aprovadas${goal?' (meta)':''}</span></span><span class="volunteer-project-toggle" aria-hidden="true"></span></summary><div class="volunteer-project-content">${opportunitySections}</div></details>`;
    }).filter(Boolean);
    $('#admin-volunteers').innerHTML=projects.length?projects.join(''):'<div class="empty">Nenhum projeto com oportunidades corresponde aos filtros.</div>';
 $$('#admin-volunteers .volunteer-project-group').forEach(group=>group.open=openGroups.has(group.dataset.projectId));
 $$('.view-candidate').forEach(b=>b.onclick=()=>{const c=candidaturas().find(x=>String(x.id)===b.dataset.id);if(!c)return;const fields=[['Nome',c.nome],['Oportunidade',opportunity(c.oportunidadeId)?.titulo],['ONG',ong(projeto(opportunity(c.oportunidadeId)?.projetoId)?.ongId)?.nome],['Status',c.status],['E-mail',c.email],['Telefone / WhatsApp',c.telefone],['Nascimento',c.nascimento],['Cidade',c.cidade],['Estado',c.estado],['Disponibilidade',c.disponibilidade],['Experiência',c.experiencia],['Habilidades',c.habilidades],['Motivação',c.motivacao],['Data da candidatura',fmtDate(c.data)],['Motivo da rejeição',c.motivoRejeicao],['Motivo da desistência',c.motivoDesistencia],['Tentativa anterior',c.candidaturaAnteriorId]];const logs=history(c);$('#candidate-details').innerHTML=fields.filter(([,v])=>v!==undefined&&v!==null&&v!=='').map(([k,v])=>`<div class="detail-field"><strong>${escapeHtml(k)}</strong><span>${escapeHtml(v)}</span></div>`).join('')+`<div class="full"><h3>Histórico de decisões</h3>${logs.length?'<ol class="audit-list">'+logs.map(h=>`<li><strong>${escapeHtml(h.status)}</strong> — ${escapeHtml(fmtDate(h.data))}<div>Responsável: ${escapeHtml(h.responsavel)}</div><div>Justificativa: ${escapeHtml(h.justificativa)}</div><div class="muted">Anterior: ${escapeHtml(h.statusAnterior||'—')}</div></li>`).join('')+'</ol>':'<p class="muted">Nenhuma decisão registrada nesta versão.</p>'}</div>`;open('#candidate-modal');$('#close-candidate-modal').focus()});
 $$('.approve-candidate,.reject-candidate,.withdraw-candidate').forEach(b=>b.onclick=()=>{
  const c=candidaturas().find(x=>String(x.id)===b.dataset.id);
  if(!c)return;
  const status=b.classList.contains('withdraw-candidate')?'Desistente':b.classList.contains('approve-candidate')?'Aprovado':'Rejeitado';
  if(status==='Desistente'&&c.status!=='Aprovado')return toast('Somente voluntários aprovados podem registrar desistência.',true);
  if(status==='Rejeitado'&&!['Pendente','Lista de espera'].includes(c.status))return toast('Esta candidatura não pode mais ser rejeitada.',true);
  if(status==='Aprovado'&&!['Pendente','Lista de espera'].includes(c.status))return toast('Esta candidatura não está aguardando aprovação.',true);
  if(status==='Aprovado'&&vagasDisponiveis(opportunity(c.oportunidadeId))<=0)return toast('Não há vagas disponíveis para esta promoção.',true);
  $('#decision-form').reset();
  $('#decision-id').value=c.id;
  $('#decision-status').value=status;
  $('#decision-title').textContent=status==='Aprovado'?(c.status==='Lista de espera'?'Promover da lista de espera':'Aprovar candidatura'):status==='Desistente'?'Registrar desistência':'Rejeitar candidatura';
  $('#decision-subtitle').textContent=`${c.nome} — ${opportunity(c.oportunidadeId)?.titulo||'Oportunidade'}`;
  $('#confirm-decision').textContent=status==='Aprovado'?'Confirmar aprovação':status==='Desistente'?'Confirmar desistência':'Confirmar rejeição';
  open('#decision-modal');
  $('#decision-reviewer').focus();
 });
 };
 $('#decision-form').onsubmit=async e=>{
 e.preventDefault();const form=e.currentTarget;if(!form.reportValidity()||form.dataset.busy)return;
 form.dataset.busy='true';const button=$('#confirm-decision');button.disabled=true;
 try{await apiRequest('candidaturas','PUT',{status:$('#decision-status').value==='Desistente'?'Cancelado':$('#decision-status').value,justificativa:$('#decision-reason').value.trim()},$('#decision-id').value);
 await loadData();window.ongNavigation?.markClean(form);close('#decision-modal');refresh();document.dispatchEvent(new Event('ong:volunteer-decision'));toast('Decisão registrada no servidor.');}
 catch(error){toast(error.message,true)}finally{delete form.dataset.busy;button.disabled=false;}
 };
 document.addEventListener('ong:volunteer-test-data',event=>{
  if(event.detail?.resetFilters!==false){
  filters.querySelectorAll('select').forEach(select=>select.value='');
  const search=$('#volunteer-search');if(search){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}))}
  window.ongNavigation?.rememberFilters();
  }
  refresh();
  // As listas iniciam recolhidas; apenas a escolha do visitante abre os grupos.
 });
 $('#close-candidate-modal').onclick=()=>close('#candidate-modal');$('#close-decision').onclick=()=>close('#decision-modal');refresh();
}
if(page==='admin-donations'){
 const all=store.get('doacoes');
 const pageSize=50;
 let currentPage=Math.max(1,Number(window.ongNavigation?.get('donationPage',1))||1);
 const searchControls=document.createElement('div');searchControls.className='filters record-filters';
 searchControls.innerHTML='<label for="donation-search">Buscar doação</label><input id="donation-search" class="field" type="search" data-remember placeholder="ONG, projeto, valor, data ou status">';
 const pagination=document.createElement('nav');pagination.className='donation-pagination';pagination.setAttribute('aria-label','Páginas do histórico de doações');
 pagination.innerHTML='<button type="button" class="btn btn-outline" id="donation-prev" aria-controls="admin-donations">Anterior</button><label for="donation-page">Página</label><select id="donation-page" class="field" aria-controls="admin-donations"></select><button type="button" class="btn btn-outline" id="donation-next" aria-controls="admin-donations">Próxima</button>';
 $('#admin-donations').before(searchControls);$('#admin-donations').after(pagination);
 const search=$('#donation-search'),pageSelect=$('#donation-page');
 const ongFilter=$('#filter-donation-ong'),projectFilter=$('#filter-donation-project'),statusFilter=$('#filter-donation-status');
 const startFilter=$('#filter-donation-start'),endFilter=$('#filter-donation-end');
 const details=all.map(d=>{const p=projeto(d.projetoId),o=p?ong(p.ongId):null;return {donation:d,project:p,organization:o}});
 const unique=(items)=>[...new Map(items.map(x=>[String(x.id),x])).values()].sort((a,b)=>String(a.nome||a.titulo).localeCompare(String(b.nome||b.titulo),'pt-BR'));
 const fill=(el,items,placeholder,caption)=>{const selected=el.value;el.innerHTML=`<option value="">${placeholder}</option>`+items.map(x=>`<option value="${escapeHtml(x.id)}">${escapeHtml(x[caption])}</option>`).join('');el.value=[...el.options].some(o=>o.value===selected)?selected:''};
 fill(ongFilter,unique(details.filter(x=>x.organization).map(x=>x.organization)),'Todas as ONGs','nome');
 const updateProjects=()=>{const ongId=ongFilter.value;fill(projectFilter,unique(details.filter(x=>x.project&&(!ongId||String(x.organization?.id)===ongId)).map(x=>x.project)),'Todos os projetos','titulo')};
 updateProjects();
 const statuses=[...new Set(all.map(d=>String(d.status||'Não informado')))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 statusFilter.innerHTML='<option value="">Todos os status</option>'+statuses.map(st=>`<option value="${escapeHtml(st)}">${escapeHtml(st)}</option>`).join('');
 window.ongNavigation?.restoreFilters();updateProjects();window.ongNavigation?.restoreFilters();
 const render=()=>{
  const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const query=normalize(search.value.trim());
  const result=details.filter(({donation:d,project:p,organization:o})=>{
   if(ongFilter.value&&String(o?.id)!==ongFilter.value)return false;
   if(projectFilter.value&&String(p?.id)!==projectFilter.value)return false;
   if(statusFilter.value&&String(d.status||'Não informado')!==statusFilter.value)return false;
   if(query&&!normalize([o?.nome||'ONG não identificada',p?.titulo||'Projeto não encontrado',money(d.valor),new Date(d.data).toLocaleDateString('pt-BR'),d.status||'Não informado'].join(' ')).includes(query))return false;
   const date=new Date(d.data);if((startFilter.value||endFilter.value)&&Number.isNaN(date.getTime()))return false;
   const day=!Number.isNaN(date.getTime())?`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`:'';
   return (!startFilter.value||day>=startFilter.value)&&(!endFilter.value||day<=endFilter.value);
  }).sort((a,b)=>(Date.parse(b.donation.data)||0)-(Date.parse(a.donation.data)||0));
  const pages=Math.max(1,Math.ceil(result.length/pageSize));currentPage=Math.min(pages,currentPage);
  const start=(currentPage-1)*pageSize;
  const rows=result.slice(start,start+pageSize).map(({donation:d,project:p,organization:o})=>[escapeHtml(o?.nome||'ONG não identificada'),escapeHtml(p?.titulo||'Projeto não encontrado'),money(d.valor),Number.isNaN(new Date(d.data).getTime())?'—':new Date(d.data).toLocaleDateString('pt-BR'),escapeHtml(d.status||'Não informado')]);
  $('#admin-donations').innerHTML=rows.length?adminTable(['ONG responsável','Projeto','Valor','Data','Status'],rows):'<div class="empty">Nenhuma doação encontrada para os filtros selecionados.</div>';
  $('#donation-filter-summary').textContent=`${result.length?start+1:0}–${Math.min(start+pageSize,result.length)} de ${result.length} doações encontradas (${all.length} no histórico) · Página ${currentPage} de ${pages} · Total filtrado: ${money(result.reduce((sum,x)=>sum+Number(x.donation.valor||0),0))}`;
  pageSelect.innerHTML=Array.from({length:pages},(_,index)=>`<option value="${index+1}">${index+1} de ${pages}</option>`).join('');pageSelect.value=String(currentPage);
  $('#donation-prev').disabled=currentPage===1;$('#donation-next').disabled=currentPage===pages;pageSelect.disabled=pages===1;
  window.ongNavigation?.set('donationPage',currentPage);
 };
 const resetPage=()=>{currentPage=1;render()};
 ongFilter.addEventListener('change',()=>{updateProjects();resetPage()});
 for(const el of [projectFilter,statusFilter,startFilter,endFilter])el.addEventListener('change',resetPage);
 search.addEventListener('input',resetPage);
 $('#donation-prev').addEventListener('click',()=>{currentPage--;render()});
 $('#donation-next').addEventListener('click',()=>{currentPage++;render()});
 pageSelect.addEventListener('change',()=>{currentPage=Number(pageSelect.value);render()});
 $('#clear-donation-filters').addEventListener('click',()=>{for(const el of [ongFilter,projectFilter,statusFilter,startFilter,endFilter,search])el.value='';updateProjects();window.ongNavigation?.rememberFilters();resetPage()});
 render();
 window.ongNavigation?.markDonationsViewed(all);
}
}
document.addEventListener('DOMContentLoaded',async()=>{await adminInit();const names={'admin-volunteers':['#admin-volunteers','volunteer-search','Buscar voluntário']};const item=names[document.body.dataset.page];if(item)window.ongNavigation?.addTableSearch($(item[0]),item[1],item[2]);});
