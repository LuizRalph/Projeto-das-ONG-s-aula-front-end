const $=(s,root=document)=>root.querySelector(s);const $$=(s,root=document)=>[...root.querySelectorAll(s)];
const sharedRecords={candidaturas:[],doacoes:[]};
const store={get(k,def=[]){if(k in sharedRecords)return sharedRecords[k];try{return JSON.parse(localStorage.getItem('ongconnect_'+k))??def}catch{return def}},set(k,v){if(k in sharedRecords)throw new Error('Use a API para gravar registros compartilhados.');localStorage.setItem('ongconnect_'+k,JSON.stringify(v));window.dispatchEvent(new CustomEvent('ong:storage-change',{detail:{key:k}}))}};
const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
// Valores compactos nos cartões; valor exato somente ao passar o mouse ou focar.
const compactMoney=n=>{const v=Number(n||0);const abs=Math.abs(v);if(abs<1000)return money(v);const divisor=abs>=1e9?1e9:abs>=1e6?1e6:1e3;const suffix=abs>=1e9?'bi':abs>=1e6?'mi':'mil';const compact=(v/divisor).toLocaleString('pt-BR',{maximumFractionDigits:2});return `R$ ${compact} ${suffix}`};
const moneyStat=n=>`<strong class="stat-money" title="${money(n)}" tabindex="0" aria-label="Arrecadação: ${money(n)}">${compactMoney(n)}</strong>`;
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const base=location.pathname.includes('/pages/')||location.pathname.includes('/dashboard/')?'../':'';
const data={};
let catalogPromise=null;
async function loadData(){
  if(catalogPromise)return catalogPromise;
  catalogPromise=(async()=>{
    const catalog=await apiRequest('catalogo');
    if(!catalog||!['ongs','projetos','oportunidades'].every(key=>Array.isArray(catalog[key])))throw new Error('O catálogo retornado pelo servidor está incompleto.');
    for(const key of ['ongs','projetos','oportunidades'])data[key]=catalog[key];
    data.segmentos=catalog.segmentos||[];
    if(document.body.dataset.page==='transparencia')data.publicTransfersTotal=(await apiRequest('total_repasses_publicos')).totalRecebido;
    const session=await getSession();
    if(location.pathname.includes('/dashboard/')){
      if(!session.usuario){location.replace(base+'pages/login.html');throw new Error('Entre para acessar o painel.');}
      if(session.usuario.perfil==='voluntario'){location.replace(base+'pages/login.html');throw new Error('Use sua área pessoal.');}
      if(session.usuario.perfil==='ong'){
        data.ongs=data.ongs.filter(o=>session.ongs.includes(o.id));
        data.projetos=data.projetos.filter(p=>session.ongs.includes(p.ongId));
        data.oportunidades=data.oportunidades.filter(o=>data.projetos.some(p=>p.id===o.projetoId));
      }
    }
    if(session.usuario)await refreshShared();
  })();
  try{return await catalogPromise}finally{catalogPromise=null}
}
function localPhpUrl(){
  if(!['127.0.0.1','localhost','[::1]'].includes(location.hostname)||location.port==='8080')return '';
  const page=location.pathname.match(/\/(?:pages|dashboard)\/[^/]+\.html$/)?.[0]||'/index.html';
  return 'http://127.0.0.1:8080'+page+(location.search||'')+(location.hash||'');
}

async function apiRequest(resource, method='GET', body, id){
  const [resourceName,pageNumber]=resource.split('__page__');const query=new URLSearchParams({resource:resourceName});if(pageNumber)query.set('page',pageNumber);
  if(id!==undefined)query.set('id',id);
  let response;
  try{response=await fetch(base+'api/index.php?'+query,{
    method,credentials:'same-origin',headers:{'Accept':'application/json',...(method!=='GET'?{'X-CSRF-Token':(await getSession()).csrf}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},
    ...(body!==undefined?{body:JSON.stringify(body)}:{}),cache:'no-store'
  })}catch{throw new Error('Não foi possível conectar ao serviço PHP. Verifique o servidor e sua conexão.')}
  let payload;
  try{payload=await response.json()}catch{throw new Error(localPhpUrl()?'Este servidor não executou a API PHP. Abra a versão PHP do projeto na porta 8080.':'O serviço não retornou JSON. Verifique se a hospedagem executa PHP e se a API está configurada.')}
  if(!response.ok){if(response.status===401){sessionState=null;sharedRecords.candidaturas=[];sharedRecords.doacoes=[];}const error=new Error(payload.error||'Não foi possível concluir a operação.');error.status=response.status;throw error;}
  return payload;
}

function candidaturas(){return store.get('candidaturas',[])}
function normalizarEmail(value){return String(value||'').trim().toLowerCase()}
function diasOportunidade(opportunity){
 if(Array.isArray(opportunity?.diasAtuacao)&&opportunity.diasAtuacao.length)return opportunity.diasAtuacao;
 const period=String(opportunity?.periodo||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const terms={SEG:['segunda','seg'],TER:['terca','ter'],QUA:['quarta','qua'],QUI:['quinta','qui'],SEX:['sexta','sex'],SAB:['sabado','sab'],DOM:['domingo','dom']};
 return Object.entries(terms).filter(([,values])=>values.some(value=>period.includes(value))).map(([day])=>day);
}
function rotuloDias(dias){const labels={SEG:'Segunda',TER:'Terça',QUA:'Quarta',QUI:'Quinta',SEX:'Sexta',SAB:'Sábado',DOM:'Domingo'};return dias.map(day=>labels[day]||day).join(', ')||'Dias a combinar'}
function agendaOportunidadeLabel(opportunity){const start=opportunity.horarioInicio,end=opportunity.horarioFim,time=start&&end?`${start}–${end}`:start||end?`${start||'início a combinar'}–${end||'término a combinar'}`:'horário a combinar';return `${rotuloDias(diasOportunidade(opportunity))} · ${time}`}
function agendaCandidatura(candidate){
 const opportunity=data.oportunidades.find(item=>Number(item.id)===Number(candidate.oportunidadeId));
 return {days:Array.isArray(candidate.agendaDias)?candidate.agendaDias:diasOportunidade(opportunity),start:candidate.agendaInicio||opportunity?.horarioInicio||'00:00',end:candidate.agendaFim||opportunity?.horarioFim||'23:59'};
}
function agendasConflitam(first,second){
 if(!first.days.some(day=>second.days.includes(day)))return false;
 return first.start<second.end&&second.start<first.end;
}
function candidaturaConflitaHorario(candidate,arr,excludedId=null){
 const activeStatuses=['Pendente','Lista de espera','Aprovado'],email=normalizarEmail(candidate.email),schedule=agendaCandidatura(candidate);
 return arr.some(existing=>{
  if(String(existing.id)===String(excludedId??candidate.id)||!activeStatuses.includes(existing.status)||normalizarEmail(existing.email)!==email||Number(existing.oportunidadeId)===Number(candidate.oportunidadeId))return false;
  return agendasConflitam(schedule,agendaCandidatura(existing));
 });
}
function normalizarCnpj(value){return String(value||'').replace(/\D/g,'')}
function cnpjOcupado(value,ignoredRequestId=null,ignoredOngId=null){
 const cnpj=normalizarCnpj(value);
 if(!cnpj)return false;
 const registered=(data.ongs||[]).some(o=>normalizarCnpj(o.cnpj)===cnpj&&String(o.id)!==String(ignoredOngId||''));
 const requested=store.get('solicitacoes_ongs',[]).some(r=>normalizarCnpj(r.cnpj)===cnpj&&r.status!=='Rejeitado'&&String(r.id)!==String(ignoredRequestId||'')&&(ignoredOngId===null||String(r.ongId||'')!==String(ignoredOngId)));
 return registered||requested;
}
function aprovadosOportunidade(id){return Number(data.oportunidades?.find(o=>Number(o.id)===Number(id))?.aprovados||0)}
function vagasDisponiveis(o){return Math.max(0,Number(o.vagas)-aprovadosOportunidade(o.id))}
function candidaturasEmEspera(id){return Number(data.oportunidades?.find(o=>Number(o.id)===Number(id))?.espera||0)}
function candidaturaDuplicada(c,arr){return arr.some(x=>Number(x.oportunidadeId)===Number(c.oportunidadeId)&&String(x.email||'').trim().toLowerCase()===String(c.email||'').trim().toLowerCase()&&['Pendente','Lista de espera','Aprovado'].includes(x.status))}
function ong(id){return data.ongs.find(x=>x.id===Number(id))}function projeto(id){return data.projetos.find(x=>x.id===Number(id))}
// A arrecadação inicial é mantida nos projetos JSON; doações locais são somadas apenas uma vez.
function totalDoacoesProjeto(id){return store.get('doacoes',[]).filter(d=>Number(d.projetoId)===Number(id)&&d.status==='Simulada').reduce((sum,d)=>sum+(Number(d.valor)||0),0)}
function arrecadadoProjeto(p){return Number(p.arrecadado)||0}
function pct(p){return Math.min(100,Math.round(100*arrecadadoProjeto(p)/Math.max(1,Number(p.meta)||1)))}
function demoImagePath(value){
 if(typeof value!=='string')return '';
 if(/^data:image\/(png|jpeg|webp);base64,/.test(value))return value;
 if(/^assets\/images\/demo\/[a-z0-9-]+\.svg$/.test(value))return base+value;
 return '';
}
function projectVisual(p){const src=demoImagePath(p.imagem);return src?`<img class="project-cover-image" src="${src}" alt="Ilustração do projeto ${escapeHtml(p.titulo)}" loading="lazy">`:escapeHtml(p.emoji||'🤝')}
function volunteerAvailabilitySummary(project,compact=false){
 const items=opportunitiesForProject(project.id).filter(oportunidadeRecebeInscricoes);
 if(!items.length)return `<div class="project-volunteer-summary project-volunteer-unavailable">${opportunitiesForProject(project.id).length?'Inscrições de voluntariado pausadas':'Voluntariado ainda não aberto neste projeto'}</div>`;
 const available=items.reduce((sum,item)=>sum+vagasDisponiveis(item),0);
 if(compact)return `<div class="project-volunteer-summary">${available} ${available===1?'vaga':'vagas'} · ${items.length} ${items.length===1?'oportunidade':'oportunidades'}${available===0?' · lista de espera':''}</div>`;
 return `<div class="project-volunteer-summary">${items.length} ${items.length===1?'oportunidade':'oportunidades'} · ${available} ${available===1?'vaga disponível':'vagas disponíveis'}${available===0?' · inscrições na lista de espera':''}</div>`;
}
function projectCardSummary(description){const text=Array.from(String(description||'').trim().split(/\n\s*\n/)[0]);return text.length>140?text.slice(0,139).join('').trimEnd()+'…':text.join('')}
function projectCard(p){return `<article class="card project-directory-card"><div class="card-visual" aria-hidden="true">${projectVisual(p)}</div><div class="card-body"><span class="badge">${escapeHtml(p.categoria)}</span><h3>${escapeHtml(p.titulo)}</h3><div class="project-card-ong small muted">${escapeHtml(ong(p.ongId)?.nome||'ONG')}</div><p class="project-card-description">${escapeHtml(projectCardSummary(p.descricao))}</p>${volunteerAvailabilitySummary(p,true)}<div class="project-card-funding"><div class="project-card-raised"><strong>${money(arrecadadoProjeto(p))}</strong> <span class="small muted">arrecadados</span></div><div class="progress" role="progressbar" aria-label="Progresso da arrecadação" aria-valuenow="${pct(p)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct(p)}%"></span></div><div class="small muted">Meta: ${money(p.meta)}</div></div><div class="project-card-actions"><button type="button" class="btn btn-sm project-details-open" data-project-id="${escapeHtml(p.id)}">Saiba mais</button><button type="button" class="btn btn-sm btn-outline donation-open" data-project-id="${escapeHtml(p.id)}">Apoiar projeto</button></div></div></article>`}
// Cartão resumido exclusivo da página inicial: sem arrecadação ou botão Apoiar.
function homeProjectCard(p){return `<article class="card home-project-card"><div class="card-visual" aria-hidden="true">${projectVisual(p)}</div><div class="card-body"><span class="badge">${escapeHtml(p.categoria)}</span><h3>${escapeHtml(p.titulo)}</h3><p class="home-project-description">${escapeHtml(p.descricao)}</p><div class="small muted home-project-ong">${escapeHtml(ong(p.ongId)?.nome||'ONG responsável')}</div>${volunteerAvailabilitySummary(p)}<button type="button" class="btn btn-sm project-details-open home-project-button" data-project-id="${escapeHtml(p.id)}">${opportunitiesForProject(p.id).length?'Ver oportunidades':'Conhecer projeto'}</button></div></article>`}
function recentProjects(){return [...data.projetos].map((p,index)=>({p,index})).sort((a,b)=>{const ta=Date.parse(a.p.criadoEm||a.p.dataCriacao||a.p.createdAt||'');const tb=Date.parse(b.p.criadoEm||b.p.dataCriacao||b.p.createdAt||'');return (Number.isFinite(tb)?tb:0)-(Number.isFinite(ta)?ta:0)||b.index-a.index}).slice(0,6).map(x=>x.p)}
function updateHomeCarouselControls(){document.querySelectorAll('.home-carousel').forEach(carousel=>{const track=carousel.querySelector('.home-carousel-track');const max=Math.max(0,track.scrollWidth-track.clientWidth);carousel.querySelectorAll('.home-carousel-arrow').forEach(btn=>{btn.disabled=btn.dataset.direction==='prev'?track.scrollLeft<=2:track.scrollLeft>=max-2})})}
function initHomeCarousels(){document.querySelectorAll('.home-carousel').forEach(carousel=>{const track=carousel.querySelector('.home-carousel-track');carousel.addEventListener('click',e=>{const btn=e.target.closest('.home-carousel-arrow');if(!btn)return;const card=track.querySelector('.card');const gap=parseFloat(getComputedStyle(track).columnGap)||22;const distance=card?card.getBoundingClientRect().width+gap:track.clientWidth;track.scrollBy({left:distance*(btn.dataset.direction==='next'?1:-1),behavior:'smooth'})});track.addEventListener('scroll',updateHomeCarouselControls,{passive:true})});window.addEventListener('resize',updateHomeCarouselControls)}
function shortProjectDescription(description){const words=String(description||'').trim().split(/\n\s*\n/)[0].split(/\s+/).filter(Boolean);return words.length?words.slice(0,18).join(' ')+(words.length>18?'…':''):'Resumo ainda não informado.'}
function ongCard(o){
 const color=/^#[0-9a-fA-F]{6}$/.test(o.cor||'')?o.cor:'#087f70';
 const image=demoImagePath(o.imagem);
 const visual=image?`<img class="ong-cover-image" src="${image}" alt="Imagem da ONG ${escapeHtml(o.nome)}" loading="lazy">`:`<span class="ong-cover-initials" aria-hidden="true">${escapeHtml(o.sigla||o.nome?.slice(0,2)||'ONG')}</span>`;
 return `<article class="card ong-directory-card"><div class="ong-cover" style="--ong-accent:${color}">${visual}</div><div class="card-body ong-directory-body"><span class="badge">${escapeHtml(o.categoria)}</span><h3>${escapeHtml(o.nome)}</h3><p class="ong-directory-description" title="${escapeHtml(o.descricao)}">${escapeHtml(o.descricao)}</p><div class="ong-card-location small muted">📍 ${escapeHtml(o.cidade)}</div><div class="ong-card-actions"><button class="btn btn-sm btn-outline ong-details-open" type="button" data-ong-id="${escapeHtml(o.id)}" aria-label="Conhecer ${escapeHtml(o.nome)}">ⓘ Conhecer ONG</button></div></div></article>`;
}

// Informações do projeto e candidatura integradas aos cartões públicos.
let projectModalPreviousFocus=null,selectedProjectDetails=null;
function oportunidadeRecebeInscricoes(item){return item.ativa!==false&&projeto(item.projetoId)?.status==='Ativo'}
function opportunitiesForProject(id){return data.oportunidades.filter(o=>String(o.projetoId)===String(id))}
function ensureProjectDetailsModal(){
 if($('#project-details-modal'))return;
 document.body.insertAdjacentHTML('beforeend',`<div id="project-details-modal" class="modal-overlay" hidden><section class="modal-dialog project-details-dialog" role="dialog" aria-modal="true" aria-labelledby="project-details-title"><div class="modal-header"><div><span class="badge" id="project-details-category"></span><h2 id="project-details-title">Conhecer projeto</h2><p id="project-details-ong"></p></div><button type="button" class="modal-close" id="project-details-close" aria-label="Fechar informações do projeto">×</button></div><div class="modal-scroll" id="project-details-content"></div></section></div>`);
 const overlay=$('#project-details-modal');$('#project-details-close').onclick=closeProjectDetails;
 overlay.addEventListener('click',e=>{const btn=e.target.closest('[data-apply-opportunity]');if(btn){const id=Number(btn.dataset.applyOpportunity);closeProjectDetails(false);openVolunteerModal(id)}});
 overlay.addEventListener('keydown',e=>{if(e.key==='Tab'){const els=[...overlay.querySelectorAll('button:not([disabled]),a[href]')].filter(x=>x.getClientRects().length);if(!els.length)return;const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
}
function openProjectDetails(id){const p=data.projetos.find(x=>String(x.id)===String(id));if(!p)return;ensureProjectDetailsModal();selectedProjectDetails=p;projectModalPreviousFocus=document.activeElement;
 $('#project-details-title').textContent=p.titulo;$('#project-details-category').textContent=p.categoria||'Projeto';$('#project-details-ong').textContent=ong(p.ongId)?.nome||'ONG responsável';
 const ops=opportunitiesForProject(p.id);
 const information=[['Objetivo e impacto esperado',p.objetivo],['Público beneficiado',p.publico_alvo],['Atividades realizadas',p.atividades],['Como você pode ajudar',p.orientacoes_voluntariado],['Como os recursos serão utilizados',p.uso_recursos]].map(([title,text])=>`<section><h3>${escapeHtml(title)}</h3><p style="white-space:pre-line">${escapeHtml(text||'A ONG ainda não informou este detalhe. Consulte os contatos da organização para saber mais.')}</p></section>`).join('');
 $('#project-details-content').innerHTML=`<h3>Sobre o projeto</h3><p style="white-space:pre-line">${escapeHtml(p.descricao||'Descrição não informada.')}</p>${information}<p class="note">As contribuições são demonstrativas. Nenhum pagamento é processado.</p><div class="project-details-metrics"><div><strong>Meta de arrecadação</strong><span>${money(p.meta)}</span></div><div><strong>Arrecadado (simulado)</strong><span>${money(arrecadadoProjeto(p))}</span></div><div><strong>Vagas cadastradas</strong><span>${ops.reduce((sum,o)=>sum+Number(o.vagas||0),0)}</span></div><div><strong>Vagas preenchidas</strong><span>${ops.reduce((sum,o)=>sum+aprovadosOportunidade(o.id),0)}</span></div></div><h3>Voluntariado</h3>${ops.length?ops.map(o=>{const livres=vagasDisponiveis(o),espera=candidaturasEmEspera(o.id),details=[o.modalidade,o.local,o.periodo].filter(Boolean).join(' · ');return `<div class="project-opportunity"><div><strong>${escapeHtml(o.titulo)}</strong><p>${escapeHtml(details)}</p><p>${escapeHtml(agendaOportunidadeLabel(o))}</p>${o.descricao?`<p>${escapeHtml(o.descricao)}</p>`:''}<p>${livres} ${livres===1?'vaga disponível':'vagas disponíveis'} de ${Number(o.vagas)||0} · ${aprovadosOportunidade(o.id)} aprovadas · ${espera} na lista de espera</p></div><button type="button" class="btn btn-sm" data-apply-opportunity="${escapeHtml(o.id)}" ${oportunidadeRecebeInscricoes(o)?'':'disabled'}>${!oportunidadeRecebeInscricoes(o)?'Inscrições pausadas':livres===0?'Entrar na lista de espera':'Inscrever-se como voluntário'}</button></div>`}).join(''):'<p>Este projeto ainda não possui oportunidades de voluntariado cadastradas.</p>'}<div class="project-details-bottom"><button type="button" class="btn btn-outline donation-open" data-project-id="${escapeHtml(p.id)}">Apoiar projeto</button></div>`;
 $('#project-details-modal').hidden=false;document.body.classList.add('modal-open');$('#project-details-close').focus();
}
function closeProjectDetails(restore=true){const overlay=$('#project-details-modal');if(!overlay)return;overlay.hidden=true;document.body.classList.remove('modal-open');if(restore)projectModalPreviousFocus?.focus()}
function initProjectDetails(){document.addEventListener('click',e=>{const btn=e.target.closest('.project-details-open');if(btn)openProjectDetails(btn.dataset.projectId)})}
let ongModalPreviousFocus=null;
function ensureOngDetailsModal(){
 if($('#ong-details-modal'))return;
 document.body.insertAdjacentHTML('beforeend',`<div id="ong-details-modal" class="modal-overlay" hidden><section class="modal-dialog ong-details-dialog" role="dialog" aria-modal="true" aria-labelledby="ong-details-title"><div class="modal-header"><div><h2 id="ong-details-title">Conhecer ONG</h2><p>Informações institucionais públicas</p></div><button type="button" class="modal-close" id="ong-details-close" aria-label="Fechar">×</button></div><div class="modal-scroll"><div id="ong-details-cover" class="ong-details-cover"></div><div id="ong-details-badges" class="ong-details-badges"></div><div class="ong-details-tabs" role="tablist" aria-label="Informações da ONG"><button type="button" role="tab" data-ong-tab="sobre">Sobre</button><button type="button" role="tab" data-ong-tab="projetos">Projetos</button><button type="button" role="tab" data-ong-tab="contato">Contato</button></div><div id="ong-details-panel" class="ong-details-panel" role="tabpanel"></div></div></section></div>`);
 const modal=$('#ong-details-modal');$('#ong-details-close').onclick=closeOngDetails;
 modal.addEventListener('click',e=>{});
 modal.addEventListener('keydown',e=>{if(e.key==='Tab'){const focusable=[...modal.querySelectorAll('button:not([disabled]),a[href]')].filter(x=>x.getClientRects().length);if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
 modal.querySelectorAll('[data-ong-tab]').forEach(btn=>btn.onclick=()=>renderOngDetailsTab(btn.dataset.ongTab));
}
let ongDetailsSelected=null;
function renderOngDetailsTab(tab){
 const o=ongDetailsSelected;if(!o)return;
 $$('#ong-details-modal [data-ong-tab]').forEach(b=>{const active=b.dataset.ongTab===tab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1});
 const panel=$('#ong-details-panel');
 if(tab==='sobre'){panel.innerHTML=`<h3>Sobre a organização</h3><p>${escapeHtml(o.descricao||'Informações não cadastradas.')}</p><h3>Missão</h3><p>${escapeHtml(o.missao||'Não informada.')}</p><div class="ong-details-info"><span><strong>Área de atuação</strong>${escapeHtml(o.categoria||'Não informada')}</span><span><strong>Localização</strong>${escapeHtml([o.cidade,o.estado||o.uf].filter(Boolean).join(' - ')||'Não informada')}</span></div>`}
 else if(tab==='projetos'){const items=data.projetos.filter(p=>String(p.ongId)===String(o.id));panel.innerHTML=`<h3>Projetos da organização (${items.length})</h3>${items.length?`<div class="ong-details-projects">${items.map(p=>`<div class="ong-details-project"><div><strong>${escapeHtml(p.titulo)}</strong><p>${escapeHtml(shortProjectDescription(p.descricao))}</p></div><a class="btn btn-sm btn-outline" href="${base}pages/projetos.html?projeto=${encodeURIComponent(p.id)}">Ver projeto</a></div>`).join('')}</div>`:'<p>Esta ONG ainda não possui projetos cadastrados.</p>'}`}
 else {const contact=[['E-mail',o.email],['Telefone',o.telefone||o.celular],['Site',o.site||o.website],['Cidade',o.cidade],['Estado',o.estado||o.uf]].filter(x=>x[1]);panel.innerHTML=`<h3>Contato institucional</h3>${contact.length?`<dl class="ong-details-contact">${contact.map(([k,v])=>`<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join('')}</dl>`:'<p>Contatos não informados.</p>'}`}
}
function openOngDetails(id){const o=data.ongs.find(x=>String(x.id)===String(id));if(!o)return;ensureOngDetailsModal();ongDetailsSelected=o;ongModalPreviousFocus=document.activeElement;$('#ong-details-title').textContent=o.nome;const color=/^#[0-9a-fA-F]{6}$/.test(o.cor||'')?o.cor:'#087f70';$('#ong-details-cover').style.setProperty('--ong-accent',color);$('#ong-details-cover').innerHTML=demoImagePath(o.imagem)?`<img src="${demoImagePath(o.imagem)}" alt="Imagem da ONG ${escapeHtml(o.nome)}">`:`<span>${escapeHtml(o.sigla||o.nome.slice(0,2))}</span>`;$('#ong-details-badges').innerHTML=`<span class="badge">${escapeHtml(o.categoria||'ONG')}</span>`;renderOngDetailsTab('sobre');$('#ong-details-modal').hidden=false;document.body.classList.add('modal-open');$('#ong-details-close').focus()}
function closeOngDetails(){const modal=$('#ong-details-modal');if(!modal)return;modal.hidden=true;document.body.classList.remove('modal-open');ongModalPreviousFocus?.focus()}
function initOngDetails(){document.addEventListener('click',e=>{const btn=e.target.closest('.ong-details-open');if(btn)openOngDetails(btn.dataset.ongId)})}
function dataTargets(){
 const page=document.body.dataset.page;
 if(page==='home')return $$('#featured-ongs,#featured-projects');
 if(page==='transparencia')return $$('#metrics,#tp-funding,#tp-areas');
 if(page==='dashboard')return $$('#metrics,#content');
 if(['admin-ongs','admin-projects'].includes(page))return $$('#requests-list,#records-list');
 return $$('#content,#admin-volunteers,#admin-donations,#admin-reports');
}
function showLoading(){dataTargets().forEach(el=>{el.setAttribute('aria-busy','true');el.innerHTML='<p class="data-placeholder" role="status">Carregando dados do servidor…</p>'})}
function showError(err){
 const link=localPhpUrl();
 const html=`<div class="data-error" role="alert"><strong>Não foi possível carregar os dados.</strong><p>${escapeHtml(err.message)}</p>${link?`<p>Inicie o ambiente com <code>scripts/start-local.ps1</code> e abra o endereço abaixo.</p><a class="btn btn-sm" href="${escapeHtml(link)}">Abrir versão PHP</a> `:''}<button class="btn btn-sm btn-outline" type="button" onclick="location.reload()">Tentar novamente</button></div>`;
 const targets=dataTargets();
 targets.forEach(el=>{el.removeAttribute('aria-busy');el.innerHTML=html});
 if(!targets.length)toast(err.message,true);
 if(document.body.dataset.page==='home')$$('.home-carousel-arrow').forEach(button=>button.disabled=true);
 const exportButton=$('#export-csv');if(exportButton)exportButton.disabled=true;
}
function initMenu(){
 const button=$('#mobile-toggle'),nav=$('#nav-links');if(!button||!nav)return;
 const setOpen=open=>{nav.classList.toggle('open',open);button.setAttribute('aria-expanded',String(open))};
 button.addEventListener('click',()=>setOpen(!nav.classList.contains('open')));
 document.addEventListener('click',event=>{if(!nav.contains(event.target)&&!button.contains(event.target))setOpen(false)});
 nav.addEventListener('click',event=>{if(event.target.closest('a'))setOpen(false)});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&nav.classList.contains('open')){setOpen(false);button.focus()}});
}
// Confirmação discreta e temporária após operações concluídas com sucesso.
let successNoticeTimer=null;
function successNotice(message){
 let notice=document.getElementById('ong-success-notice');
 if(!notice){notice=document.createElement('div');notice.id='ong-success-notice';notice.className='ong-success-notice';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');document.body.appendChild(notice)}
 notice.textContent=message;notice.hidden=false;
 clearTimeout(successNoticeTimer);
 successNoticeTimer=setTimeout(()=>{notice.hidden=true},4500);
}
function toast(msg,error=false){let el=$('#message');if(!el){el=document.createElement('div');el.id='message';el.setAttribute('role','status');const main=$('main')||document.body;main.prepend(el)}el.className='alert'+(error?' error':'');el.textContent=msg;el.scrollIntoView({behavior:'smooth',block:'nearest'})}
function render(){const page=document.body.dataset.page;const target=$('#content');if(page==='home'){
 const totalOngs=$('#total-ongs'),totalProjetos=$('#total-projetos');
 if(totalOngs)totalOngs.textContent=String(data.ongs.length).padStart(2,'0')+' ONGs';
 if(totalProjetos)totalProjetos.textContent=String(data.projetos.length).padStart(2,'0')+' projetos';
 const projectTrack=$('#featured-projects'),ongTrack=$('#featured-ongs');
 // Cada carrossel é renderizado de forma independente: falha em um não apaga o outro.
 if(projectTrack){try{const items=recentProjects();projectTrack.innerHTML=items.length?items.map(homeProjectCard).join(''):'<p class="empty">Nenhum projeto disponível.</p>'}catch(err){console.error('Falha ao exibir projetos na página inicial:',err);projectTrack.innerHTML='<p class="empty" role="alert">Não foi possível exibir os projetos. Consulte o console do navegador.</p>'}}
 if(ongTrack){try{const items=data.ongs.slice(-6).reverse();ongTrack.innerHTML=items.length?items.map(ongCard).join(''):'<p class="empty">Nenhuma ONG disponível.</p>'}catch(err){console.error('Falha ao exibir ONGs na página inicial:',err);ongTrack.innerHTML='<p class="empty" role="alert">Não foi possível exibir as ONGs. Consulte o console do navegador.</p>'}}
 // Atualiza controles após o navegador calcular a largura dos cartões.
 requestAnimationFrame(updateHomeCarouselControls);return}if(!target)return;
if(page==='ongs'){target.innerHTML=data.ongs.map(ongCard).join('');return}
if(page==='projetos'){const q=($('#search')?.value||'').toLowerCase(),cat=$('#category')?.value||'',oid=Number($('#ong-filter')?.value||0);const items=data.projetos.filter(p=>(!oid||p.ongId===oid)&&(!cat||p.categoria===cat)&&(`${p.titulo} ${p.descricao} ${ong(p.ongId)?.nome}`.toLowerCase().includes(q)));target.innerHTML=items.length?items.map(projectCard).join(''):'<div class="empty">Nenhum projeto encontrado.</div>';return}
if(page==='voluntariado'){
 const q=($('#search')?.value||'').toLowerCase();
 const items=data.oportunidades.filter(o=>`${o.titulo} ${o.local} ${o.modalidade}`.toLowerCase().includes(q));
 target.innerHTML=items.map(o=>{
  const livres=vagasDisponiveis(o),ocupadas=aprovadosOportunidade(o.id),espera=candidaturasEmEspera(o.id);
  return `<article class="card"><div class="card-body"><span class="badge">${escapeHtml(o.modalidade)}</span><h3>${escapeHtml(o.titulo)}</h3><p>${escapeHtml(projeto(o.projetoId)?.titulo)}</p><div class="small muted">📍 ${escapeHtml(o.local)} · ${escapeHtml(o.periodo)} · <strong>${livres} ${livres===1?'vaga disponível':'vagas disponíveis'}</strong> de ${o.vagas}</div><div class="small muted">${ocupadas} ${ocupadas===1?'candidatura aprovada':'candidaturas aprovadas'} · ${espera} ${espera===1?'pessoa na lista de espera':'pessoas na lista de espera'}</div><div class="card-footer"><span class="small">${escapeHtml(ong(projeto(o.projetoId)?.ongId)?.nome)}</span><button class="btn btn-sm apply" data-id="${o.id}" ${oportunidadeRecebeInscricoes(o)?'':'disabled'}>${!oportunidadeRecebeInscricoes(o)?'Inscrições pausadas':livres===0?'Entrar na lista de espera':'Candidatar-se'}</button></div></div></article>`
 }).join('')||'<div class="empty">Nenhuma oportunidade encontrada.</div>';
 $$('.apply').forEach(b=>b.onclick=()=>openVolunteerModal(Number(b.dataset.id)));
 return
}
if(page==='campanhas'){
 const selected=Number(new URLSearchParams(location.search).get('projeto')||0);
 target.innerHTML=data.projetos.filter(p=>!selected||p.id===selected).map(p=>`<article class="card"><div class="card-body"><span class="badge">${escapeHtml(ong(p.ongId)?.nome)}</span><h3>${escapeHtml(p.titulo)}</h3><p>${escapeHtml(p.descricao)}</p><div class="progress"><span style="width:${pct(p)}%"></span></div><div class="small muted">${money(arrecadadoProjeto(p))} arrecadados · Meta ${money(p.meta)}</div><form class="donation-form" data-id="${p.id}"><div class="form-group"><label for="donation-amount-${p.id}">Escolha o valor da contribuição simulada</label><select class="field donation-amount-select" id="donation-amount-${p.id}"><option value="5">R$ 5,00</option><option value="10">R$ 10,00</option><option value="25" selected>R$ 25,00</option><option value="50">R$ 50,00</option><option value="100">R$ 100,00</option><option value="other">Outro valor</option></select></div><div class="form-group donation-other" hidden><label for="amount-${p.id}">Outro valor (R$)</label><input id="amount-${p.id}" class="field" type="number" min="0.01" max="100000" step="0.01" placeholder="Digite o valor"></div><button class="btn btn-sm" type="submit" style="margin-top:12px">Simular doação</button></form></div></article>`).join('');
 $$('.donation-form').forEach(f=>{
  const select=$('.donation-amount-select',f),other=$('.donation-other',f),custom=$('input[type="number"]',f);
  const toggle=()=>{const isOther=select.value==='other';other.hidden=!isOther;custom.required=isOther;if(!isOther)custom.value=''};
  select.addEventListener('change',toggle);toggle();
  f.onsubmit=e=>{e.preventDefault();const val=select.value==='other'?Number(custom.value):Number(select.value);if(!Number.isFinite(val)||val<=0||val>100000)return toast('Informe um valor entre R$ 0,01 e R$ 100.000,00.',true);openDonationModal(Number(f.dataset.id),Math.round(val*100)/100)};
 });return}
if(page==='transparencia'){
 const raised=data.projetos.reduce((sum,p)=>sum+arrecadadoProjeto(p),0);
 const reached=data.projetos.filter(p=>Number(p.meta)>0&&arrecadadoProjeto(p)>=Number(p.meta)).length;
 const metricItems=[['♧',data.ongs.length,'ONGs cadastradas'],['♡',data.projetos.length,'Projetos sociais'],['◇',compactMoney(raised),'Apoios privados simulados'],['◎',reached,'Projetos que atingiram a meta']];
 $('#metrics').innerHTML=metricItems.map(([icon,value,label])=>`<article class="tp-metric"><span class="tp-metric-icon" aria-hidden="true">${icon}</span><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></article>`).join('');
 const pctValue=(v,total)=>total>0?(100*v/total).toLocaleString('pt-BR',{maximumFractionDigits:1}):'0';
 const publicReceived=Math.max(0,Number(data.publicTransfersTotal)||0),totalReceived=publicReceived+raised;
 $('#tp-funding').innerHTML=`<div class="tp-funding-grid"><div class="tp-funding-card"><span>Recursos públicos recebidos — total geral</span><strong id="public-transfers-total">${money(data.publicTransfersTotal)}</strong><small>Montante demonstrativo de todas as organizações, sem valores previstos</small></div><div class="tp-funding-card"><span>Apoios privados simulados</span><strong>${money(raised)}</strong><small>Registrados separadamente dos repasses públicos</small></div></div><p class="tp-footnote">Somente recebimentos válidos, excluindo os cancelados. Os valores são simulados; não há transferência de dinheiro pela plataforma. Documentos, registros individuais e prestação de contas ficam na área administrativa.</p>`;
 const totals=new Map();data.projetos.forEach(p=>{const key=String(p.categoria||'Outras causas').trim()||'Outras causas';totals.set(key,(totals.get(key)||0)+arrecadadoProjeto(p))});
 const palette=['#087f70','#34a58e','#83cabb','#b8dfd5','#4c8f92','#9daeb8'];
 const areas=[['Recursos p\u00fablicos',publicReceived],...[...totals].sort((x,y)=>y[1]-x[1])];
 $('#tp-areas').innerHTML=totalReceived>0?`<div class="tp-segmented tp-area-bar" role="img" aria-label="Recursos públicos gerais e apoios privados por segmento">${areas.map(([name,v],i)=>[name,v,i]).filter(([,v])=>v>0).map(([,v,i])=>`<span style="width:${100*v/totalReceived}%;background:${palette[i%palette.length]}"></span>`).join('')}</div><div class="tp-area-list">${areas.map(([name,value],i)=>`<div class="tp-area-row"><span><i style="background:${palette[i%palette.length]}"></i>${escapeHtml(name)}</span><strong>${money(value)}</strong><small>${pctValue(value,totalReceived)}%</small></div>`).join('')}</div>`:'<div class="tp-empty">Ainda não há contribuições simuladas registradas.</div>';
 return}

if(page==='dashboard'){renderDashboard();return}}
function renderDashboard(){const chosen=Number($('#ong-select')?.value||1),items=data.projetos.filter(p=>p.ongId===chosen),raised=items.reduce((s,p)=>s+arrecadadoProjeto(p),0),vols=items.reduce((s,p)=>s+(p.voluntarios||0),0),sim=store.get('doacoes').filter(d=>items.some(p=>p.id===d.projetoId));$('#metrics').innerHTML=`<div class="stat"><strong>${items.filter(p=>p.status==='Ativo').length}</strong><span>Projetos ativos</span></div><div class="stat"><strong>${vols}</strong><span>Participações aprovadas</span></div><div class="stat">${moneyStat(raised)}<span>Arrecadação fictícia</span></div><div class="stat"><strong>${sim.length}</strong><span>Doações simuladas</span></div>`;$('#content').innerHTML=`<div class="panel"><h2>Projetos da organização</h2><div class="table-wrap"><table class="table"><thead><tr><th>Projeto</th><th>Categoria</th><th>Arrecadado</th><th>Meta</th><th>Status</th></tr></thead><tbody>${items.map(p=>`<tr><td>${escapeHtml(p.titulo)}</td><td>${escapeHtml(p.categoria)}</td><td>${money(arrecadadoProjeto(p))}</td><td>${money(p.meta)}</td><td>${escapeHtml(p.status)}</td></tr>`).join('')}</tbody></table></div></div><div class="panel"><h2>Arrecadação por projeto</h2><div class="bars">${items.map(p=>`<div class="bar-item"><div class="bar" style="height:${Math.max(4,pct(p))}%" title="${escapeHtml(p.titulo)}: ${money(arrecadadoProjeto(p))}"></div><span>${escapeHtml(p.titulo.split(' ')[0])}</span></div>`).join('')}</div></div>`}

let previousModalFocus=null;let selectedOpportunityId=null;
function closeVolunteerModal(){const overlay=$('#volunteer-modal');if(!overlay)return;overlay.hidden=true;const form=$('#volunteer-form');form?.reset();window.ongNavigation?.markClean(form);document.body.classList.remove('modal-open');previousModalFocus?.focus();}
async function openVolunteerModal(id){
 try{
 const session=await getSession(true);
 if(!session.usuario){window.ongAuth.requireVolunteer(()=>openVolunteerModal(id));return;}
 if(session.usuario.perfil!=='voluntario'){toast('Use uma conta de voluntário para se candidatar a esta oportunidade.',true);return;}
 if(!$('#volunteer-form')){location.href=base+'pages/projetos.html?oportunidade='+encodeURIComponent(id);return;}
 }catch(error){toast(error.message,true);return;}
 const opportunity=data.oportunidades.find(o=>o.id===id);if(!opportunity)return;if(!oportunidadeRecebeInscricoes(opportunity))return toast('As inscrições desta vaga estão pausadas.',true);selectedOpportunityId=id;previousModalFocus=document.activeElement;const form=$('#volunteer-form');form.reset();const user=sessionState?.usuario;if(user){const saved={...user.dados_voluntario,nome:user.nome,email:user.email,telefone:user.telefone};for(const [key,value] of Object.entries(saved))if(form.elements[key]&&value!=null)form.elements[key].value=value;}$('#volunteer-success').hidden=true;form.hidden=false;$('#selected-opportunity-title').textContent=opportunity.titulo;$('#selected-opportunity-ong').textContent=ong(projeto(opportunity.projetoId)?.ongId)?.nome||'ONG';const aguardando=vagasDisponiveis(opportunity)===0;$('#volunteer-modal').querySelector('.modal-note').textContent=aguardando?'As vagas estão preenchidas. Sua inscrição ficará na lista de espera para análise manual.':'Sua inscrição será analisada pela organização responsável.';$('#volunteer-modal').hidden=false;document.body.classList.add('modal-open');$('#vol-name').focus();}
function initVolunteerModal(){const overlay=$('#volunteer-modal');if(!overlay)return;const states=['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];$('#vol-state').insertAdjacentHTML('beforeend',states.map(x=>`<option value="${x}">${x}</option>`).join(''));const cancel=()=>{if($('#volunteer-form').dataset.busy){toast('Aguarde a conclusão do envio.',true);return}closeVolunteerModal()};['#close-volunteer-modal','#cancel-volunteer-modal','#finish-volunteer-modal'].forEach(sel=>$(sel).addEventListener('click',cancel));overlay.addEventListener('click',e=>{if(e.target===overlay)cancel()});overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();cancel();return}if(e.key==='Tab'){const els=[...overlay.querySelectorAll('button:not([hidden]),input:not([hidden]),select:not([hidden]),textarea:not([hidden])')].filter(x=>x.getClientRects().length);if(!els.length)return;const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});$('#volunteer-form').addEventListener('submit',e=>{e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;const values=Object.fromEntries(new FormData(form).entries());const birth=new Date(values.nascimento+'T12:00:00');if(Number.isNaN(birth.getTime())||birth>new Date()){toast('Informe uma data de nascimento válida.',true);return}const arr=candidaturas();if(vagasDisponiveis(data.oportunidades.find(o=>o.id===selectedOpportunityId))===0){closeVolunteerModal();render();toast('As vagas foram preenchidas.',true);return}const candidate={id:Date.now(),oportunidadeId:selectedOpportunityId,nome:values.nome.trim(),email:values.email.trim(),telefone:values.telefone.trim(),nascimento:values.nascimento,cidade:values.cidade.trim(),estado:values.estado,disponibilidade:values.disponibilidade,experiencia:values.experiencia,habilidades:(values.habilidades||'').trim(),motivacao:values.motivacao.trim(),consentimento:true,data:new Date().toISOString(),status:'Pendente'};if(candidaturaDuplicada(candidate,arr)){toast('Já existe uma candidatura pendente ou aprovada com este e-mail para esta oportunidade.',true);return}arr.push(candidate);try{store.set('candidaturas',arr)}catch(err){toast('Não foi possível salvar no navegador.',true);return}closeVolunteerModal();render();successNotice('Inscrição enviada com sucesso! Sua candidatura está pendente de análise.')})}
let pendingDonation=null,previousDonationFocus=null;
function closeDonationModal(){const overlay=$('#donation-modal');if(!overlay)return;overlay.hidden=true;document.body.classList.remove('modal-open');$('#donation-billing-form').reset();window.ongNavigation?.markClean($('#donation-billing-form'));$('#donation-choice-custom').value='';$('#donation-choice-amount').value='25';$('#donation-choice-other').hidden=true;pendingDonation=null;previousDonationFocus?.focus()}
function donationStep(step){$('#donation-choose-step').hidden=step!=='choose';$('#donation-billing-step').hidden=step!=='billing';if(step==='choose')$('#donation-choice-amount').focus();else $('#billing-name').focus()}
function openDonationModal(projectId){const p=projeto(projectId),overlay=$('#donation-modal');if(!p||!overlay)return;pendingDonation={projetoId:p.id,valor:null};previousDonationFocus=document.activeElement;$('#donation-choice-project').textContent=p.titulo;$('#donation-choice-ong').textContent=ong(p.ongId)?.nome||'ONG';$('#donation-choice-progress').textContent=`${money(arrecadadoProjeto(p))} arrecadados de ${money(p.meta)}`;$('#donation-modal-project').textContent=p.titulo;$('#donation-modal-ong').textContent=ong(p.ongId)?.nome||'ONG';$('#donation-choice-amount').value='25';$('#donation-choice-custom').value='';$('#donation-choice-other').hidden=true;$('#donation-billing-form').reset();overlay.hidden=false;document.body.classList.add('modal-open');donationStep('choose')}
function initDonationModal(){const overlay=$('#donation-modal');if(!overlay)return;
 document.addEventListener('click',e=>{const btn=e.target.closest('.donation-open');if(btn){if(!$('#donation-modal'))return;if(!$('#project-details-modal')?.hidden)closeProjectDetails(false);openDonationModal(btn.dataset.projectId)}});
 const cancel=()=>{if($('#donation-billing-form').dataset.busy){toast('Aguarde a conclusão do envio.',true);return}closeDonationModal()};['#donation-modal-close','#donation-choice-cancel','#donation-billing-cancel'].forEach(sel=>$(sel)?.addEventListener('click',cancel));$('#donation-modal-cancel').addEventListener('click',()=>donationStep('choose'));
 $('#donation-choice-amount').addEventListener('change',e=>{$('#donation-choice-other').hidden=e.target.value!=='other'});
 $('#donation-choice-next').addEventListener('click',()=>{if(!pendingDonation)return;const choice=$('#donation-choice-amount').value;const amount=choice==='other'?Number($('#donation-choice-custom').value):Number(choice);if(!Number.isFinite(amount)||amount<0.01||amount>100000){toast('Informe um valor entre R$ 0,01 e R$ 100.000,00.',true);return}pendingDonation.valor=Math.round(amount*100)/100;$('#donation-modal-amount').textContent=money(pendingDonation.valor);donationStep('billing')});
 overlay.addEventListener('click',e=>{if(e.target===overlay)cancel()});overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();cancel();return}if(e.key==='Tab'){const section=$('#donation-choose-step').hidden?$('#donation-billing-step'):$('#donation-choose-step');const focusable=[...section.querySelectorAll('input:not([disabled]),select:not([disabled]),button:not([disabled])')].filter(x=>x.getClientRects().length);focusable.unshift($('#donation-modal-close'));const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
 $('#donation-billing-form').addEventListener('submit',async e=>{
 e.preventDefault();const f=e.currentTarget;if(!pendingDonation||!f.reportValidity()||f.dataset.busy)return;
 pendingDonation.chave??=crypto.randomUUID();f.dataset.busy='true';const button=f.querySelector('[type="submit"]');if(button)button.disabled=true;
 try{await apiRequest('doacoes','POST',{...pendingDonation,valor:Number(pendingDonation.valor).toFixed(2)});await loadData();closeDonationModal();render();successNotice('Contribuição simulada registrada no servidor. Nenhuma cobrança foi realizada.');}
 catch(error){toast(error.message,true)}finally{delete f.dataset.busy;if(button)button.disabled=false;}
 });
}

function initMvpNotice(){
 if(!document.querySelector('link[href$="mvp.css"]')){const css=document.createElement('link');css.rel='stylesheet';css.href=base+'assets/css/mvp.css';document.head.append(css)}
 let note=document.querySelector('.mvp-data-note');
 if(!note){note=document.createElement('p');note.className='note mvp-data-note';note.textContent='Cadastros, candidaturas e doações simuladas são compartilhados pelo servidor. Nenhum pagamento é processado.'}
 let footer=document.querySelector('footer');
 if(!footer){footer=document.createElement('footer');footer.className='mvp-data-footer';(document.querySelector('main')||document.body).append(footer)}
 if(!footer.contains(note))footer.append(note);
}

function initOngRequest(){
 const modal=$('#request-ong-modal'),open=$('#request-ong-open');
 if(!modal||!open)return;
 const form=$('#request-ong-form');let prior=null,saving=false;
 const error=document.createElement('p');error.className='alert error';error.setAttribute('role','alert');error.hidden=true;form.prepend(error);
 const close=()=>{if(saving)return;modal.hidden=true;document.body.classList.remove('modal-open');prior?.focus()};
 open.addEventListener('click',()=>{prior=document.activeElement;form.reset();error.hidden=true;$('#request-cnpj').setCustomValidity('');form.hidden=false;$('#request-ong-success').hidden=true;modal.hidden=false;document.body.classList.add('modal-open');$('#request-name').focus()});
 $('#request-ong-close').addEventListener('click',close);$('#request-ong-finish').addEventListener('click',close);
 modal.addEventListener('keydown',e=>{if(e.key==='Escape'){close();return}if(e.key!=='Tab')return;const items=[...modal.querySelectorAll('button,input,textarea,a[href]')].filter(el=>el.getClientRects().length&&!el.disabled);if(!items.length)return;const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}});
 form.addEventListener('submit',async e=>{e.preventDefault();if(saving||!form.reportValidity())return;
  const values=Object.fromEntries(new FormData(form));values.consentimento=form.elements.namedItem('consentimento').checked;error.hidden=true;
  saving=true;const buttons=[...modal.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
  try{const result=await apiRequest('solicitacoes','POST',values);saving=false;close();successNotice('Solicitação nº '+result.id+' salva no servidor. Acesse o painel de demonstração para revisar e publicar a ONG.');form.reset()}
  catch(err){error.textContent=err.message;error.hidden=false;error.scrollIntoView({block:'nearest'})}finally{saving=false;buttons.forEach(b=>b.disabled=false)}
 });
}
async function init(){
 initMvpNotice();initOngRequest();initHomeCarousels();initMenu();initOngDetails();initProjectDetails();initVolunteerModal();initDonationModal();
 const contact=$('#contact-form');if(contact)contact.addEventListener('submit',e=>{e.preventDefault();if(!contact.reportValidity())return;toast('Mensagem de demonstração recebida. Não foi enviada para nenhum servidor.');contact.reset()});
 const login=$('#login-form');if(login)login.addEventListener('submit',e=>{e.preventDefault();location.href=base+'dashboard/index.html'});
 // Painéis têm inicialização própria; contato e acesso não dependem do catálogo.
 if(!['home','ongs','projetos','transparencia','dashboard','voluntariado','campanhas'].includes(document.body.dataset.page))return;
 showLoading();
 try{
  await loadData();
  if($('#category')){const cats=[...new Set(data.projetos.map(p=>p.categoria))].sort();$('#category').innerHTML='<option value="">Todas as categorias</option>'+cats.map(c=>`<option>${escapeHtml(c)}</option>`).join('')}
  if($('#ong-filter')){
   const sel=$('#ong-filter');sel.innerHTML='<option value="">Todas as ONGs</option>'+data.ongs.map(o=>`<option value="${escapeHtml(o.id)}">${escapeHtml(o.nome)}</option>`).join('');
   const requested=new URLSearchParams(location.search).get('ong');if(requested&&data.ongs.some(o=>String(o.id)===requested))sel.value=requested;
   sel.addEventListener('change',()=>{const url=new URL(location.href);if(sel.value)url.searchParams.set('ong',sel.value);else url.searchParams.delete('ong');history.replaceState(null,'',url)})
  }
  if($('#ong-select'))$('#ong-select').innerHTML=data.ongs.map(o=>`<option value="${o.id}">${escapeHtml(o.nome)}</option>`).join('');
  window.ongNavigation?.restoreFilters();
  if($('#ong-filter')){const explicit=new URLSearchParams(location.search).get('ong');if(explicit&&data.ongs.some(o=>String(o.id)===explicit))$('#ong-filter').value=explicit}
  render();const requestedOpportunity=new URLSearchParams(location.search).get('oportunidade');if(requestedOpportunity&&/^[1-9]\d*$/.test(requestedOpportunity)){if(data.oportunidades.some(o=>String(o.id)===requestedOpportunity))await openVolunteerModal(Number(requestedOpportunity));else toast('A oportunidade solicitada não foi encontrada.',true);}else if(document.body.dataset.page==='projetos'){const selected=new URLSearchParams(location.search).get('projeto');if(selected){if(data.projetos.some(p=>String(p.id)===selected))openProjectDetails(selected);else toast('O projeto solicitado não foi encontrado.',true)}}dataTargets().forEach(el=>el.removeAttribute('aria-busy'));
  $$('#search,#category,#ong-filter,#ong-select').forEach(el=>el.addEventListener(el.id==='search'?'input':'change',render));
 }catch(err){showError(err)}
}
async function handleVolunteerSubmission(event){
 const form=event.target;if(form?.id!=='volunteer-form')return;
 event.preventDefault();event.stopImmediatePropagation();if(!form.reportValidity()||form.dataset.busy)return;
 const button=form.querySelector('[type="submit"]');form.dataset.busy='true';if(button)button.disabled=true;
 try{const values=Object.fromEntries(new FormData(form));await apiRequest('candidaturas','POST',{...values,oportunidadeId:selectedOpportunityId,consentimento:true});await loadData();window.ongNavigation?.markClean(form);closeVolunteerModal();render();successNotice('Inscrição registrada no servidor.');}
 catch(error){toast(error.message,true)}finally{delete form.dataset.busy;if(button)button.disabled=false;}
}
document.addEventListener('submit',handleVolunteerSubmission,true);
document.addEventListener('DOMContentLoaded',init);

let sessionState=null,sessionPromise=null;
async function getSession(force=false){
 if(force)sessionState=null;if(sessionState)return sessionState;
 if(!sessionPromise)sessionPromise=fetch(base+'api/index.php?resource=sessao',{credentials:'same-origin',cache:'no-store'}).then(async r=>{const p=await r.json();if(!r.ok)throw new Error(p.error||'Não foi possível consultar a sessão.');sessionState=p;return p}).finally(()=>sessionPromise=null);
 return sessionPromise;
}
async function refreshShared(){
 const load=async resource=>{let page=1,records=[];while(true){const result=await apiRequest(resource+'__page__'+page);records.push(...result[resource]);if(records.length>=result.pagination.total)return records;page++;}};
 const [c,d]=await Promise.all([load('candidaturas'),load('doacoes')]);sharedRecords.candidaturas=c;sharedRecords.doacoes=d;
 window.ongNavigation?.syncLocalNotifications();
}
async function fetchPages(resource){
 let page=1,records=[];while(true){const result=await apiRequest(resource+'__page__'+page);records.push(...result[resource]);if(records.length>=result.pagination.total)return records;page++;}
}
