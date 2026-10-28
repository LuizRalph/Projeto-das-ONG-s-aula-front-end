document.addEventListener('DOMContentLoaded',async()=>{
 const form=document.querySelector('#transfer-form'),fields=document.querySelector('#transfer-fields'),message=document.querySelector('#transfers-message');
 const docForm=document.querySelector('#transfer-document-form'),docFields=document.querySelector('#transfer-document-fields');
 let context={ongs:[],projetos:[]},editing=null,documentRepasse=null,page=1,busy=false,key=null;
 const editor=document.querySelector('#transfer-editor'),filters=document.querySelector('#transfer-filters');let isAdmin=false;
 const closeEditor=()=>{if(busy)return;if(window.ongNavigation&&!window.ongNavigation.confirmForm(form))return;editor.close();reset();window.ongNavigation?.markClean(form)};
 document.querySelector('#transfer-editor-close').onclick=closeEditor;
 editor.addEventListener('cancel',e=>{e.preventDefault();closeEditor()});
 document.querySelector('#transfer-create').onclick=()=>{if(busy)return;reset();window.ongNavigation?.markClean(form);editor.showModal();form.elements.ong_id.focus()};
 filters.onsubmit=e=>{e.preventDefault();if(!busy){page=1;work(load)}};
 for(const key of ['inicio','fim']){const value=new URLSearchParams(location.search).get(key);if(value)filters.elements[key].value=value;}
 const stateLabels={Pendente:'Pendente',Em_preparacao:'Em preparação',Enviada:'Enviada',Conferida_internamente:'Conferida internamente'};
 const say=(text,error=false)=>{message.textContent=text;message.className=error?'alert error':'note';const issue=document.querySelector('#transfer-editor-error');issue.hidden=!error;issue.textContent=error?text:'';};
 const option=(value,text)=>{const el=document.createElement('option');el.value=value;el.textContent=text;return el;};
 const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const newKey=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
 function projects(selected=''){const select=form.elements.projeto_id;select.replaceChildren(option('','Sem vínculo com projeto'));for(const p of context.projetos.filter(p=>String(p.ong_id)===form.elements.ong_id.value))select.append(option(p.id,p.titulo));select.value=selected;}
 function reset(){form.reset();editing=null;key=null;form.elements.ong_id.disabled=false;if(context.ongs.length===1)form.elements.ong_id.value=String(context.ongs[0].id);projects();document.querySelector('#transfer-editor-title').textContent='Registrar recebimento';document.querySelector('#transfer-save').textContent='Registrar recebimento';}
 async function work(action){if(busy)return;busy=true;fields.disabled=true;docFields.disabled=true;document.querySelectorAll('#transfer-reload,#transfer-export,#transfer-prev,#transfer-next').forEach(b=>b.disabled=true);
  try{await action();}catch(error){say(error.message,true);}finally{busy=false;fields.disabled=false;form.elements.ong_id.disabled=Boolean(editing);docFields.disabled=Boolean(documentRepasse?.status==='Cancelado');updatePages();}}
 let total=0;
 function updatePages(){document.querySelector('#transfer-prev').disabled=busy||page===1;document.querySelector('#transfer-next').disabled=busy||page*20>=total;document.querySelector('#transfer-reload').disabled=busy;document.querySelector('#transfer-export').disabled=busy;}
 async function load(){const params=new URLSearchParams({resource:'repasses_publicos',page});for(const [key,value] of new FormData(filters))if(value)params.set(key,value);
  const response=await fetch('../api/index.php?'+params,{credentials:'same-origin',cache:'no-store'});const result=await response.json();if(!response.ok)throw Error(result.error||'Falha ao consultar recebimentos.');total=result.pagination.total;
  const summary=document.querySelector('#transfer-summary');summary.replaceChildren();for(const [label,value] of [['Recebido nos filtros',money(result.resumo.recebido)],['Prestações pendentes',result.resumo.prestacoes_pendentes],['Recebimentos sem documentos',result.resumo.sem_documentos]]){const card=document.createElement('div');card.className='stat';const amount=document.createElement('strong');amount.textContent=value;const title=document.createElement('span');title.textContent=label;card.append(amount,title);summary.append(card);}
  const query=new URLSearchParams();for(const key of ['inicio','fim','ongId'])if(filters.elements[key].value)query.set(key,filters.elements[key].value);document.querySelector('#transfer-export').href='relatorios.html?'+query;
  const tbody=document.querySelector('#transfer-rows');tbody.replaceChildren();
  for(const row of result.repasses){const tr=document.createElement('tr');
   for(const text of [row.recebido_em+' / '+row.ong+(row.projeto?' / '+row.projeto:''),row.orgao_origem+' / '+row.instrumento,money(row.valor_recebido),row.status,stateLabels[row.prestacao_situacao],Number(row.documentos)?row.documentos+' documento(s)':'Documentação pendente']){const td=document.createElement('td');td.textContent=text;tr.append(td);}
   const actions=document.createElement('td');const group=document.createElement('div');group.className='inline-actions';
   if(isAdmin){const history=document.createElement('a');history.className='btn btn-sm btn-outline';history.href='auditoria.html?recurso=repasses_publicos&registroId='+row.id;history.textContent='Histórico';group.append(history);}
   for(const [action,label] of [['editar','Editar'],['documentos','Documentos'],['cancelar','Cancelar recebimento']]){if(row.status==='Cancelado'&&action!=='documentos')continue;const button=document.createElement('button');button.type='button';button.className='btn btn-sm btn-outline';button.dataset.action=action;button.dataset.id=row.id;button.textContent=label;group.append(button);}actions.append(group);tr.append(actions);tbody.append(tr);
  }
  document.querySelector('#transfer-pagination').textContent=`Página ${page} · ${total} registro(s)`;updatePages();
 }
 async function showDocuments(id){const {repasse}=await apiRequest('repasses_publicos','GET',undefined,id);documentRepasse=repasse;document.querySelector('#transfer-documents').hidden=false;
  document.querySelector('#transfer-document-title').textContent=`Documentos do recebimento #${repasse.id}`;docFields.disabled=repasse.status==='Cancelado';
  const list=document.querySelector('#transfer-document-list');list.replaceChildren();
  for(const doc of repasse.documentos){const li=document.createElement('li'),link=document.createElement('a');link.href=`../api/index.php?resource=documentos_repasses_publicos&id=${doc.id}`;link.textContent=doc.nome_original+' — '+doc.tipo.replaceAll('_',' ');link.className='btn btn-sm btn-outline';li.append(link);const remove=document.createElement('button');remove.type='button';remove.className='btn btn-sm btn-outline';remove.dataset.documentId=doc.id;remove.textContent='Remover';li.append(remove);list.append(li);}
  if(!repasse.documentos.length){const li=document.createElement('li');li.textContent='Nenhum documento vinculado. Conferência documental pendente.';list.append(li);}
 }
 try{const session=await getSession();if(!session.usuario||!['admin','ong'].includes(session.usuario.perfil)){say('Entre com uma conta de administrador ou responsável pela ONG para acessar esta área.',true);return;}
  isAdmin=session.usuario.perfil==='admin';window.ongNavigation?.watchForm(form);
  context=await apiRequest('contexto_repasses_publicos');form.elements.ong_id.replaceChildren(option('','Selecione a ONG'));for(const ong of context.ongs)form.elements.ong_id.append(option(ong.id,ong.nome));
  for(const ong of context.ongs)filters.elements.ongId.append(option(ong.id,ong.nome));filters.elements.ongId.value=new URLSearchParams(location.search).get('ongId')||'';
  document.querySelector('#transfer-date').max=today();reset();document.querySelector('#transfers-content').hidden=false;await load();say('Registre somente recebimentos demonstrativos. Documentos e prestação de contas são restritos à administração.');
 }catch(error){say(error.message,true);return;}
 form.elements.ong_id.addEventListener('change',()=>projects());form.addEventListener('input',()=>{key=null;});document.querySelector('#transfer-reset').addEventListener('click',closeEditor);
 form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;const input=Object.fromEntries(new FormData(form));input.ong_id=Number(form.elements.ong_id.value);input.projeto_id=input.projeto_id?Number(input.projeto_id):null;input.simulado=true;
  key??=newKey();input.chave=key;work(async()=>{const result=await apiRequest('repasses_publicos',editing?'PUT':'POST',input,editing||undefined);editor.close();reset();window.ongNavigation?.markClean(form);page=1;await load();await showDocuments(result.id);document.querySelector('#transfer-documents').scrollIntoView({block:'start'});say('Recebimento simulado salvo. Vincule os documentos para a conferência administrativa.');});});
 document.querySelector('#transfer-rows').addEventListener('click',event=>{const button=event.target.closest('button[data-action]');if(!button||busy)return;const id=Number(button.dataset.id);
  if(button.dataset.action==='cancelar'){const reason=prompt('Justifique o cancelamento (mínimo de 10 caracteres). O valor deixará de compor o total público.');if(reason===null)return;work(async()=>{await apiRequest('repasses_publicos','PUT',{acao:'cancelar',justificativa:reason},id);if(editing===id)reset();if(Number(documentRepasse?.id)===id)await showDocuments(id);await load();say('Recebimento cancelado e total público atualizado.');});return;}
  work(async()=>{if(button.dataset.action==='documentos'){await showDocuments(id);document.querySelector('#transfer-documents').scrollIntoView({block:'start'});return;}
   const {repasse}=await apiRequest('repasses_publicos','GET',undefined,id);reset();editing=id;form.elements.ong_id.value=String(repasse.ong_id);projects(repasse.projeto_id?String(repasse.projeto_id):'');for(const field of form.elements)if(field.name&&repasse[field.name]!=null&&field.type!=='checkbox')field.value=repasse[field.name];form.elements.ong_id.disabled=true;document.querySelector('#transfer-demo').checked=true;document.querySelector('#transfer-editor-title').textContent='Editar recebimento #'+id;document.querySelector('#transfer-save').textContent='Salvar alterações';window.ongNavigation?.markClean(form);editor.showModal();form.elements.orgao_origem.focus();
  });
 });
 docForm.addEventListener('submit',event=>{event.preventDefault();if(!documentRepasse||!docForm.reportValidity())return;const file=docForm.elements.arquivo.files[0];if(file.size>2097152){say('O arquivo deve ter até 2 MB.',true);return;}const body=new FormData(docForm);body.set('repasse_id',documentRepasse.id);
  work(async()=>{const response=await fetch('../api/index.php?resource=documentos_repasses_publicos',{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':(await getSession()).csrf},body});const result=await response.json();if(!response.ok)throw new Error(result.error||'Falha ao enviar documento.');docForm.reset();await showDocuments(documentRepasse.id);await load();say('Documento vinculado com acesso restrito.');});
 });
 document.querySelector('#transfer-document-list').addEventListener('click',event=>{const button=event.target.closest('[data-document-id]');if(!button||busy||!confirm('Remover o documento da consulta? A ação ficará registrada na auditoria.'))return;work(async()=>{await apiRequest('documentos_repasses_publicos','DELETE',undefined,Number(button.dataset.documentId));await showDocuments(documentRepasse.id);await load();say('Documento removido da consulta.');});});
 document.querySelector('#transfer-reload').addEventListener('click',()=>work(async()=>{await load();say('Registros atualizados.');}));for(const [id,step] of [['transfer-prev',-1],['transfer-next',1]])document.querySelector('#'+id).addEventListener('click',()=>{if(!busy){page+=step;work(load);}});

});
