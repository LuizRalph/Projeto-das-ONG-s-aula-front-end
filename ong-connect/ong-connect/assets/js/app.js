const $=(s,root=document)=>root.querySelector(s);const $$=(s,root=document)=>[...root.querySelectorAll(s)];
const store={get(k,def=[]){try{return JSON.parse(localStorage.getItem('ongconnect_'+k))??def}catch{return def}},set(k,v){localStorage.setItem('ongconnect_'+k,JSON.stringify(v))}};
const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
// Valores compactos nos cartões; valor exato somente ao passar o mouse ou focar.
const compactMoney=n=>{const v=Number(n||0);const abs=Math.abs(v);if(abs<1000)return money(v);const divisor=abs>=1e9?1e9:abs>=1e6?1e6:1e3;const suffix=abs>=1e9?'bi':abs>=1e6?'mi':'mil';const compact=(v/divisor).toLocaleString('pt-BR',{maximumFractionDigits:2});return `R$ ${compact} ${suffix}`};
const moneyStat=n=>`<strong class="stat-money" title="${money(n)}" tabindex="0" aria-label="Arrecadação: ${money(n)}">${compactMoney(n)}</strong>`;
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const base=location.pathname.includes('/pages/')||location.pathname.includes('/dashboard/')?'../':'';
const data={};
async function loadData(){
  // Dados de demonstração vêm embarcados no pacote: portáveis entre computadores.
  // Os JSON permanecem como fontes legíveis para fins acadêmicos.
  const embedded=window.ONG_CONNECT_DEMO_DATA||{};
  for(const k of ['ongs','projetos','oportunidades']){
    if(Array.isArray(embedded[k])){
      data[k]=embedded[k].map(item=>({...item}));
      continue;
    }
    try{
      const res=await fetch(base+'data/'+k+'.json');
      if(!res.ok)throw Error('HTTP '+res.status);
      data[k]=await res.json();
    }catch(e){
      console.error('Falha ao carregar '+k,e);
      throw new Error('Dados demonstrativos indisponíveis. Verifique assets/js/demo-data.js e data/'+k+'.json.');
    }
  }
  const removedOpportunities=new Set(store.get('oportunidades_removidas',[]).map(String));
  data.oportunidades=[...data.oportunidades,...store.get('oportunidades',[])].map(o=>({...o,...(store.get('oportunidades_edicoes',{})[o.id]||{})})).filter(o=>!removedOpportunities.has(String(o.id)));
  data.ongs=[...data.ongs,...store.get('ongs')].map(o=>({...o,...(store.get('ongs_edicoes',{})[o.id]||{})}));
  data.projetos=[...data.projetos,...store.get('projetos')].map(p=>({...p,...(store.get('projetos_edicoes',{})[p.id]||{})}));
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
function aprovadosOportunidade(id){return candidaturas().filter(c=>Number(c.oportunidadeId)===Number(id)&&c.status==='Aprovado').length}
function vagasDisponiveis(o){return Math.max(0,Number(o.vagas)-aprovadosOportunidade(o.id))}
function candidaturasEmEspera(id){return candidaturas().filter(c=>Number(c.oportunidadeId)===Number(id)&&c.status==='Lista de espera').length}
function candidaturaDuplicada(c,arr){return arr.some(x=>Number(x.oportunidadeId)===Number(c.oportunidadeId)&&String(x.email||'').trim().toLowerCase()===String(c.email||'').trim().toLowerCase()&&['Pendente','Lista de espera','Aprovado'].includes(x.status))}
function ong(id){return data.ongs.find(x=>x.id===Number(id))}function projeto(id){return data.projetos.find(x=>x.id===Number(id))}
// A arrecadação inicial é mantida nos projetos JSON; doações locais são somadas apenas uma vez.
function totalDoacoesProjeto(id){return store.get('doacoes',[]).filter(d=>Number(d.projetoId)===Number(id)&&d.status==='Simulada').reduce((sum,d)=>sum+(Number(d.valor)||0),0)}
function arrecadadoProjeto(p){return (Number(p.arrecadado)||0)+totalDoacoesProjeto(p.id)}
function pct(p){return Math.min(100,Math.round(100*arrecadadoProjeto(p)/Math.max(1,Number(p.meta)||1)))}
function demoImagePath(value){
 if(typeof value!=='string')return '';
 if(/^data:image\/(png|jpeg|webp);base64,/.test(value))return value;
 if(/^assets\/images\/demo\/[a-z0-9-]+\.svg$/.test(value))return base+value;
 return '';
}
function projectVisual(p){const src=demoImagePath(p.imagem);return src?`<img class="project-cover-image" src="${src}" alt="Ilustração do projeto ${escapeHtml(p.titulo)}" loading="lazy">`:escapeHtml(p.emoji||'🤝')}
function volunteerAvailabilitySummary(project){
 const items=opportunitiesForProject(project.id);
 if(!items.length)return '<div class="project-volunteer-summary project-volunteer-unavailable">Voluntariado ainda não aberto neste projeto</div>';
 const available=items.reduce((sum,item)=>sum+vagasDisponiveis(item),0);
 return `<div class="project-volunteer-summary">${items.length} ${items.length===1?'oportunidade':'oportunidades'} · ${available} ${available===1?'vaga disponível':'vagas disponíveis'}${available===0?' · inscrições na lista de espera':''}</div>`;
}
function projectCard(p){const volunteers=p.voluntariosNecessarios!==undefined?`${Number(p.voluntariosNecessarios)||0} voluntários necessários`:`${p.voluntarios||0} participações (exemplo)`;return `<article class="card"><div class="card-visual" aria-hidden="true">${projectVisual(p)}</div><div class="card-body"><span class="badge">${escapeHtml(p.categoria)}</span><h3>${escapeHtml(p.titulo)}</h3><p>${escapeHtml(p.descricao)}</p><div class="small muted">${escapeHtml(ong(p.ongId)?.nome||'ONG')}</div>${volunteerAvailabilitySummary(p)}<div class="progress" role="progressbar" aria-label="Progresso da arrecadação" aria-valuenow="${pct(p)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct(p)}%"></span></div><div class="small muted">${money(arrecadadoProjeto(p))} de ${money(p.meta)}</div><div class="card-footer"><span class="small">${escapeHtml(volunteers)}</span><div class="project-card-actions"><button type="button" class="btn btn-sm btn-outline project-details-open" data-project-id="${escapeHtml(p.id)}">${opportunitiesForProject(p.id).length?'Ver oportunidades':'Conhecer projeto'}</button><button type="button" class="btn btn-sm donation-open" data-project-id="${escapeHtml(p.id)}">Apoiar</button></div></div></div></article>`}
// Cartão resumido exclusivo da página inicial: sem arrecadação ou botão Apoiar.
function homeProjectCard(p){return `<article class="card home-project-card"><div class="card-visual" aria-hidden="true">${projectVisual(p)}</div><div class="card-body"><span class="badge">${escapeHtml(p.categoria)}</span><h3>${escapeHtml(p.titulo)}</h3><p class="home-project-description">${escapeHtml(p.descricao)}</p><div class="small muted home-project-ong">${escapeHtml(ong(p.ongId)?.nome||'ONG responsável')}</div>${volunteerAvailabilitySummary(p)}<button type="button" class="btn btn-sm project-details-open home-project-button" data-project-id="${escapeHtml(p.id)}">${opportunitiesForProject(p.id).length?'Ver oportunidades':'Conhecer projeto'}</button></div></article>`}
function recentProjects(){return [...data.projetos].map((p,index)=>({p,index})).sort((a,b)=>{const ta=Date.parse(a.p.criadoEm||a.p.dataCriacao||a.p.createdAt||'');const tb=Date.parse(b.p.criadoEm||b.p.dataCriacao||b.p.createdAt||'');return (Number.isFinite(tb)?tb:0)-(Number.isFinite(ta)?ta:0)||b.index-a.index}).slice(0,6).map(x=>x.p)}
function updateHomeCarouselControls(){document.querySelectorAll('.home-carousel').forEach(carousel=>{const track=carousel.querySelector('.home-carousel-track');const max=Math.max(0,track.scrollWidth-track.clientWidth);carousel.querySelectorAll('.home-carousel-arrow').forEach(btn=>{btn.disabled=btn.dataset.direction==='prev'?track.scrollLeft<=2:track.scrollLeft>=max-2})})}
function initHomeCarousels(){document.querySelectorAll('.home-carousel').forEach(carousel=>{const track=carousel.querySelector('.home-carousel-track');carousel.addEventListener('click',e=>{const btn=e.target.closest('.home-carousel-arrow');if(!btn)return;const card=track.querySelector('.card');const gap=parseFloat(getComputedStyle(track).columnGap)||22;const distance=card?card.getBoundingClientRect().width+gap:track.clientWidth;track.scrollBy({left:distance*(btn.dataset.direction==='next'?1:-1),behavior:'smooth'})});track.addEventListener('scroll',updateHomeCarouselControls,{passive:true})});window.addEventListener('resize',updateHomeCarouselControls)}
function ongCard(o){
 const color=/^#[0-9a-fA-F]{6}$/.test(o.cor||'')?o.cor:'#087f70';
 const image=demoImagePath(o.imagem);
 const visual=image?`<img class="ong-cover-image" src="${image}" alt="Imagem da ONG ${escapeHtml(o.nome)}" loading="lazy">`:`<span class="ong-cover-initials" aria-hidden="true">${escapeHtml(o.sigla||o.nome?.slice(0,2)||'ONG')}</span>`;
 return `<article class="card ong-directory-card"><div class="ong-cover" style="--ong-accent:${color}">${visual}</div><div class="card-body ong-directory-body"><span class="badge">${escapeHtml(o.categoria)}</span><h3>${escapeHtml(o.nome)}</h3><p class="ong-directory-description" title="${escapeHtml(o.descricao)}">${escapeHtml(o.descricao)}</p><div class="ong-card-location small muted">📍 ${escapeHtml(o.cidade)}</div><div class="ong-card-actions"><button class="btn btn-sm btn-outline ong-details-open" type="button" data-ong-id="${escapeHtml(o.id)}" aria-label="Conhecer ${escapeHtml(o.nome)}">ⓘ Conhecer ONG</button><a class="btn btn-sm" href="${base}pages/projetos.html?ong=${encodeURIComponent(o.id)}">Ver projetos</a></div></div></article>`;
}

// Informações do projeto e candidatura integradas aos cartões públicos.
let projectModalPreviousFocus=null,selectedProjectDetails=null;
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
 $('#project-details-content').innerHTML=`<h3>Sobre o projeto</h3><p>${escapeHtml(p.descricao||'Descrição não informada.')}</p><div class="project-details-metrics"><div><strong>Meta de arrecadação</strong><span>${money(p.meta)}</span></div><div><strong>Arrecadado (simulado)</strong><span>${money(arrecadadoProjeto(p))}</span></div><div><strong>Voluntários necessários</strong><span>${p.voluntariosNecessarios===undefined?'Não informado':Number(p.voluntariosNecessarios)||0}</span></div><div><strong>Oportunidades</strong><span>${ops.length}</span></div></div><h3>Voluntariado</h3>${ops.length?ops.map(o=>{const livres=vagasDisponiveis(o),espera=candidaturasEmEspera(o.id),details=[o.modalidade,o.local,o.periodo].filter(Boolean).join(' · ');return `<div class="project-opportunity"><div><strong>${escapeHtml(o.titulo)}</strong><p>${escapeHtml(details)}</p><p>${escapeHtml(agendaOportunidadeLabel(o))}</p><p>${livres} ${livres===1?'vaga disponível':'vagas disponíveis'} de ${Number(o.vagas)||0} · ${aprovadosOportunidade(o.id)} aprovadas · ${espera} na lista de espera</p></div><button type="button" class="btn btn-sm" data-apply-opportunity="${escapeHtml(o.id)}">${livres===0?'Entrar na lista de espera':'Inscrever-se como voluntário'}</button></div>`}).join(''):'<p>Este projeto ainda não possui oportunidades de voluntariado cadastradas.</p>'}<div class="project-details-bottom"><button type="button" class="btn btn-outline donation-open" data-project-id="${escapeHtml(p.id)}">Apoiar projeto</button></div>`;
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
 else if(tab==='projetos'){const items=data.projetos.filter(p=>String(p.ongId)===String(o.id));panel.innerHTML=`<h3>Projetos da organização (${items.length})</h3>${items.length?`<div class="ong-details-projects">${items.map(p=>`<div class="ong-details-project"><div><strong>${escapeHtml(p.titulo)}</strong><p>${escapeHtml(p.descricao||'')}</p></div><a class="btn btn-sm btn-outline" href="${base}pages/projetos.html?ong=${encodeURIComponent(o.id)}">Ver projetos</a></div>`).join('')}</div>`:'<p>Esta ONG ainda não possui projetos cadastrados.</p>'}`}
 else {const contact=[['E-mail',o.email],['Telefone',o.telefone||o.celular],['Site',o.site||o.website],['Cidade',o.cidade],['Estado',o.estado||o.uf]].filter(x=>x[1]);panel.innerHTML=`<h3>Contato institucional</h3>${contact.length?`<dl class="ong-details-contact">${contact.map(([k,v])=>`<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join('')}</dl>`:'<p>Contatos não informados.</p>'}`}
}
function openOngDetails(id){const o=data.ongs.find(x=>String(x.id)===String(id));if(!o)return;ensureOngDetailsModal();ongDetailsSelected=o;ongModalPreviousFocus=document.activeElement;$('#ong-details-title').textContent=o.nome;const color=/^#[0-9a-fA-F]{6}$/.test(o.cor||'')?o.cor:'#087f70';$('#ong-details-cover').style.setProperty('--ong-accent',color);$('#ong-details-cover').innerHTML=demoImagePath(o.imagem)?`<img src="${demoImagePath(o.imagem)}" alt="Imagem da ONG ${escapeHtml(o.nome)}">`:`<span>${escapeHtml(o.sigla||o.nome.slice(0,2))}</span>`;$('#ong-details-badges').innerHTML=`<span class="badge">${escapeHtml(o.categoria||'ONG')}</span>`;renderOngDetailsTab('sobre');$('#ong-details-modal').hidden=false;document.body.classList.add('modal-open');$('#ong-details-close').focus()}
function closeOngDetails(){const modal=$('#ong-details-modal');if(!modal)return;modal.hidden=true;document.body.classList.remove('modal-open');ongModalPreviousFocus?.focus()}
function initOngDetails(){document.addEventListener('click',e=>{const btn=e.target.closest('.ong-details-open');if(btn)openOngDetails(btn.dataset.ongId)})}
function showError(err){const el=$('#content');if(el)el.innerHTML=`<div class="empty" role="alert">${escapeHtml(err.message)}</div>`}
function initMenu(){const b=$('#mobile-toggle'),nav=$('#nav-links');if(b&&nav)b.addEventListener('click',()=>{let open=nav.classList.toggle('open');b.setAttribute('aria-expanded',String(open))})}
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
  return `<article class="card"><div class="card-body"><span class="badge">${escapeHtml(o.modalidade)}</span><h3>${escapeHtml(o.titulo)}</h3><p>${escapeHtml(projeto(o.projetoId)?.titulo)}</p><div class="small muted">📍 ${escapeHtml(o.local)} · ${escapeHtml(o.periodo)} · <strong>${livres} ${livres===1?'vaga disponível':'vagas disponíveis'}</strong> de ${o.vagas}</div><div class="small muted">${ocupadas} ${ocupadas===1?'candidatura aprovada':'candidaturas aprovadas'} · ${espera} ${espera===1?'pessoa na lista de espera':'pessoas na lista de espera'}</div><div class="card-footer"><span class="small">${escapeHtml(ong(projeto(o.projetoId)?.ongId)?.nome)}</span><button class="btn btn-sm apply" data-id="${o.id}">${livres===0?'Entrar na lista de espera':'Candidatar-se'}</button></div></div></article>`
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
 const metricItems=[['♧',data.ongs.length,'ONGs cadastradas'],['♡',data.projetos.length,'Projetos sociais'],['◇',compactMoney(raised),'Contribuições simuladas'],['◎',reached,'Projetos que atingiram a meta']];
 $('#metrics').innerHTML=metricItems.map(([icon,value,label])=>`<article class="tp-metric"><span class="tp-metric-icon" aria-hidden="true">${icon}</span><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></article>`).join('');
 const pctValue=(v,total)=>total>0?(100*v/total).toLocaleString('pt-BR',{maximumFractionDigits:1}):'0';
 $('#tp-funding').innerHTML=`<div class="tp-funding-grid"><div class="tp-funding-card"><span>Recursos públicos registrados</span><strong>${money(0)}</strong><small>Sem repasses públicos cadastrados</small></div><div class="tp-funding-card"><span>Contribuições simuladas (origem privada)</span><strong>${money(raised)}</strong><small>Dados demonstrativos dos projetos</small></div></div><div class="tp-segmented" role="img" aria-label="Sem recursos públicos registrados; contribuições demonstrativas privadas: ${escapeHtml(money(raised))}"><span style="width:100%;background:#86cdbc"></span></div><div class="tp-legend"><span><i style="background:#087f70"></i> Recursos públicos: 0%</span><span><i style="background:#86cdbc"></i> Simulações privadas: ${raised>0?'100':'0'}%</span></div><p class="tp-footnote">A ausência de repasses cadastrados não comprova que as ONGs não recebem recursos públicos. Os valores acima não representam dinheiro efetivamente recebido.</p>`;
 const totals=new Map();data.projetos.forEach(p=>{const key=String(p.categoria||'Outras causas').trim()||'Outras causas';totals.set(key,(totals.get(key)||0)+arrecadadoProjeto(p))});
 const palette=['#087f70','#34a58e','#83cabb','#b8dfd5','#4c8f92','#9daeb8'];
 const areas=[...totals].sort((x,y)=>y[1]-x[1]);
 $('#tp-areas').innerHTML=raised>0?`<div class="tp-segmented tp-area-bar" role="img" aria-label="Distribuição das contribuições simuladas por área">${areas.filter(([,v])=>v>0).map(([,v],i)=>`<span style="width:${100*v/raised}%;background:${palette[i%palette.length]}"></span>`).join('')}</div><div class="tp-area-list">${areas.map(([name,value],i)=>`<div class="tp-area-row"><span><i style="background:${palette[i%palette.length]}"></i>${escapeHtml(name)}</span><strong>${money(value)}</strong><small>${pctValue(value,raised)}%</small></div>`).join('')}</div>`:'<div class="tp-empty">Ainda não há contribuições simuladas registradas.</div>';
 const filter=$('#tp-ong-filter');filter.innerHTML='<option value="">Todas as organizações</option>'+data.ongs.map(o=>`<option value="${escapeHtml(o.id)}">${escapeHtml(o.nome)}</option>`).join('');
 const partnerships=$('#tp-partnerships');const updatePartnerships=()=>{const selected=filter.value;partnerships.innerHTML=`<div class="tp-empty"><span aria-hidden="true">▤</span><strong>Nenhuma parceria pública cadastrada${selected?' para esta organização':''}.</strong><p>Quando houver registros, serão exibidos o órgão público, a finalidade, os valores previstos e os valores efetivamente recebidos, conforme as obrigações legais aplicáveis.</p></div>`};filter.addEventListener('change',updatePartnerships);updatePartnerships();return} 
if(page==='dashboard'){renderDashboard();return}}
function renderDashboard(){const chosen=Number($('#ong-select')?.value||1),items=data.projetos.filter(p=>p.ongId===chosen),raised=items.reduce((s,p)=>s+arrecadadoProjeto(p),0),vols=items.reduce((s,p)=>s+(p.voluntarios||0),0),sim=store.get('doacoes').filter(d=>items.some(p=>p.id===d.projetoId));$('#metrics').innerHTML=`<div class="stat"><strong>${items.length}</strong><span>Projetos ativos</span></div><div class="stat"><strong>${vols}</strong><span>Participações (exemplo)</span></div><div class="stat">${moneyStat(raised)}<span>Arrecadação fictícia</span></div><div class="stat"><strong>${sim.length}</strong><span>Doações simuladas locais</span></div>`;$('#content').innerHTML=`<div class="panel"><h2>Projetos da organização</h2><div class="table-wrap"><table class="table"><thead><tr><th>Projeto</th><th>Categoria</th><th>Arrecadado</th><th>Meta</th><th>Status</th></tr></thead><tbody>${items.map(p=>`<tr><td>${escapeHtml(p.titulo)}</td><td>${escapeHtml(p.categoria)}</td><td>${money(arrecadadoProjeto(p))}</td><td>${money(p.meta)}</td><td>${escapeHtml(p.status)}</td></tr>`).join('')}</tbody></table></div></div><div class="panel"><h2>Arrecadação por projeto</h2><div class="bars">${items.map(p=>`<div class="bar-item"><div class="bar" style="height:${Math.max(4,pct(p))}%" title="${escapeHtml(p.titulo)}: ${money(arrecadadoProjeto(p))}"></div><span>${escapeHtml(p.titulo.split(' ')[0])}</span></div>`).join('')}</div></div>`}

let previousModalFocus=null;let selectedOpportunityId=null;
function closeVolunteerModal(){const overlay=$('#volunteer-modal');if(!overlay)return;overlay.hidden=true;document.body.classList.remove('modal-open');previousModalFocus?.focus();}
function openVolunteerModal(id){const opportunity=data.oportunidades.find(o=>o.id===id);if(!opportunity)return;selectedOpportunityId=id;previousModalFocus=document.activeElement;const form=$('#volunteer-form');form.reset();$('#volunteer-success').hidden=true;form.hidden=false;$('#selected-opportunity-title').textContent=opportunity.titulo;$('#selected-opportunity-ong').textContent=ong(projeto(opportunity.projetoId)?.ongId)?.nome||'ONG';const aguardando=vagasDisponiveis(opportunity)===0;$('#volunteer-modal').querySelector('.modal-note').textContent=aguardando?'As vagas estão preenchidas. Sua inscrição ficará na lista de espera para análise manual.':'Sua inscrição será analisada pela organização responsável.';$('#volunteer-modal').hidden=false;document.body.classList.add('modal-open');$('#vol-name').focus();}
function initVolunteerModal(){const overlay=$('#volunteer-modal');if(!overlay)return;const states=['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];$('#vol-state').insertAdjacentHTML('beforeend',states.map(x=>`<option value="${x}">${x}</option>`).join(''));['#close-volunteer-modal','#finish-volunteer-modal'].forEach(sel=>$(sel).addEventListener('click',closeVolunteerModal));overlay.addEventListener('click',e=>{});overlay.addEventListener('keydown',e=>{if(e.key==='Tab'){const els=[...overlay.querySelectorAll('button:not([hidden]),input:not([hidden]),select:not([hidden]),textarea:not([hidden])')].filter(x=>x.getClientRects().length);if(!els.length)return;const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});$('#volunteer-form').addEventListener('submit',e=>{e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;const values=Object.fromEntries(new FormData(form).entries());const birth=new Date(values.nascimento+'T12:00:00');if(Number.isNaN(birth.getTime())||birth>new Date()){toast('Informe uma data de nascimento válida.',true);return}const arr=candidaturas();if(vagasDisponiveis(data.oportunidades.find(o=>o.id===selectedOpportunityId))===0){closeVolunteerModal();render();toast('As vagas foram preenchidas.',true);return}const candidate={id:Date.now(),oportunidadeId:selectedOpportunityId,nome:values.nome.trim(),email:values.email.trim(),telefone:values.telefone.trim(),nascimento:values.nascimento,cidade:values.cidade.trim(),estado:values.estado,disponibilidade:values.disponibilidade,experiencia:values.experiencia,habilidades:(values.habilidades||'').trim(),motivacao:values.motivacao.trim(),consentimento:true,data:new Date().toISOString(),status:'Pendente'};if(candidaturaDuplicada(candidate,arr)){toast('Já existe uma candidatura pendente ou aprovada com este e-mail para esta oportunidade.',true);return}arr.push(candidate);try{store.set('candidaturas',arr)}catch(err){toast('Não foi possível salvar no navegador.',true);return}closeVolunteerModal();render();successNotice('Inscrição enviada com sucesso! Sua candidatura está pendente de análise.')})}
let pendingDonation=null,previousDonationFocus=null;
function closeDonationModal(){const overlay=$('#donation-modal');if(!overlay)return;overlay.hidden=true;document.body.classList.remove('modal-open');$('#donation-billing-form').reset();pendingDonation=null;previousDonationFocus?.focus()}
function donationStep(step){$('#donation-choose-step').hidden=step!=='choose';$('#donation-billing-step').hidden=step!=='billing';if(step==='choose')$('#donation-choice-amount').focus();else $('#billing-name').focus()}
function openDonationModal(projectId){const p=projeto(projectId),overlay=$('#donation-modal');if(!p||!overlay)return;pendingDonation={projetoId:p.id,valor:null};previousDonationFocus=document.activeElement;$('#donation-choice-project').textContent=p.titulo;$('#donation-choice-ong').textContent=ong(p.ongId)?.nome||'ONG';$('#donation-choice-progress').textContent=`${money(arrecadadoProjeto(p))} arrecadados de ${money(p.meta)}`;$('#donation-modal-project').textContent=p.titulo;$('#donation-modal-ong').textContent=ong(p.ongId)?.nome||'ONG';$('#donation-choice-amount').value='25';$('#donation-choice-custom').value='';$('#donation-choice-other').hidden=true;$('#donation-billing-form').reset();overlay.hidden=false;document.body.classList.add('modal-open');donationStep('choose')}
function initDonationModal(){const overlay=$('#donation-modal');if(!overlay)return;
 document.addEventListener('click',e=>{const btn=e.target.closest('.donation-open');if(btn){if(!$('#donation-modal'))return;if(!$('#project-details-modal')?.hidden)closeProjectDetails(false);openDonationModal(btn.dataset.projectId)}});
 $('#donation-modal-close').addEventListener('click',closeDonationModal);$('#donation-modal-cancel').addEventListener('click',()=>donationStep('choose'));
 $('#donation-choice-amount').addEventListener('change',e=>{$('#donation-choice-other').hidden=e.target.value!=='other'});
 $('#donation-choice-next').addEventListener('click',()=>{if(!pendingDonation)return;const choice=$('#donation-choice-amount').value;const amount=choice==='other'?Number($('#donation-choice-custom').value):Number(choice);if(!Number.isFinite(amount)||amount<0.01||amount>100000){toast('Informe um valor entre R$ 0,01 e R$ 100.000,00.',true);return}pendingDonation.valor=Math.round(amount*100)/100;$('#donation-modal-amount').textContent=money(pendingDonation.valor);donationStep('billing')});
 overlay.addEventListener('click',e=>{});overlay.addEventListener('keydown',e=>{if(e.key==='Tab'){const section=$('#donation-choose-step').hidden?$('#donation-billing-step'):$('#donation-choose-step');const focusable=[...section.querySelectorAll('input:not([disabled]),select:not([disabled]),button:not([disabled])')].filter(x=>x.getClientRects().length);focusable.unshift($('#donation-modal-close'));const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
 $('#donation-billing-form').addEventListener('submit',e=>{e.preventDefault();if(!pendingDonation)return;const f=e.currentTarget;if(!f.reportValidity())return;const donation={id:Date.now()+'-'+Math.random().toString(36).slice(2),projetoId:pendingDonation.projetoId,valor:pendingDonation.valor,data:new Date().toISOString(),status:'Simulada'};const arr=store.get('doacoes',[]);arr.push(donation);try{store.set('doacoes',arr)}catch{toast('Não foi possível armazenar a doação neste navegador.',true);return}const value=money(pendingDonation.valor);closeDonationModal();render();successNotice(`Contribuição de ${value} registrada com sucesso (simulação). Nenhuma cobrança foi realizada.`)});
}

function initOngRequest(){const modal=$('#request-ong-modal'),open=$('#request-ong-open');if(!modal||!open)return;let prior=null;const close=()=>{modal.hidden=true;if(!document.querySelector('.modal-overlay:not([hidden])'))document.body.classList.remove('modal-open');prior?.focus()};open.addEventListener('click',()=>{prior=document.activeElement;$('#request-ong-form').reset();$('#request-cnpj').setCustomValidity('');$('#request-ong-form').hidden=false;$('#request-ong-success').hidden=true;modal.hidden=false;document.body.classList.add('modal-open');$('#request-name').focus()});$('#request-ong-close').addEventListener('click',close);$('#request-ong-finish').addEventListener('click',close);modal.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const items=[...modal.querySelectorAll('button,input,textarea')].filter(el=>el.getClientRects().length&&!el.disabled);if(!items.length)return;const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}});$('#request-cnpj').addEventListener('input',e=>{const field=e.currentTarget;field.setCustomValidity('');field.removeAttribute('aria-invalid')});$('#request-ong-form').addEventListener('submit',e=>{e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;const values=Object.fromEntries(new FormData(form).entries());const cnpj=String(values.cnpj||'').replace(/\D/g,'');if(cnpj.length!==14){const field=$('#request-cnpj');field.setCustomValidity('O CNPJ deve conter exatamente 14 dígitos. Você informou '+cnpj.length+'.');field.reportValidity();field.focus();toast('CNPJ incompleto: informe os 14 dígitos antes de enviar.',true);return}const arr=store.get('solicitacoes_ongs',[]);if(arr.some(r=>r.cnpj===cnpj&&r.status==='Pendente')){toast('Já existe uma solicitação pendente para este CNPJ neste navegador.',true);return}arr.push({id:Date.now(),nome:values.nome.trim(),cnpj,cidade:values.cidade.trim(),responsavel:values.responsavel.trim(),email:values.email.trim(),telefone:values.telefone.trim(),descricao:values.descricao.trim(),data:new Date().toISOString(),status:'Pendente',consentimento:true,historico:[]});try{store.set('solicitacoes_ongs',arr)}catch{toast('Não foi possível salvar a solicitação neste navegador.',true);return}close();successNotice('Solicitação de cadastro enviada com sucesso! Aguarde a análise administrativa.')})}
function init(){initOngRequest();initHomeCarousels();initMenu();initOngDetails();initProjectDetails();initVolunteerModal();initDonationModal();loadData().then(()=>{if($('#category')){const cats=[...new Set(data.projetos.map(p=>p.categoria))].sort();$('#category').innerHTML='<option value="">Todas as categorias</option>'+cats.map(c=>`<option>${escapeHtml(c)}</option>`).join('')}if($('#ong-filter')){const sel=$('#ong-filter');sel.innerHTML='<option value="">Todas as ONGs</option>'+data.ongs.map(o=>`<option value="${escapeHtml(o.id)}">${escapeHtml(o.nome)}</option>`).join('');const requested=new URLSearchParams(location.search).get('ong');if(requested&&data.ongs.some(o=>String(o.id)===requested))sel.value=requested;sel.addEventListener('change',()=>{const url=new URL(location.href);if(sel.value)url.searchParams.set('ong',sel.value);else url.searchParams.delete('ong');history.replaceState(null,'',url)})}if($('#ong-select'))$('#ong-select').innerHTML=data.ongs.map(o=>`<option value="${o.id}">${escapeHtml(o.nome)}</option>`).join('');render();$$('#search,#category,#ong-filter,#ong-select').forEach(el=>el.addEventListener(el.id==='search'?'input':'change',render));}).catch(showError);const contact=$('#contact-form');if(contact)contact.addEventListener('submit',e=>{e.preventDefault();if(!contact.reportValidity())return;toast('Mensagem de demonstração recebida. Não foi enviada para nenhum servidor.');contact.reset()});const login=$('#login-form');if(login)login.addEventListener('submit',e=>{e.preventDefault();toast('Acesso de demonstração: utilize o painel administrativo. Não existe autenticação real nesta versão.');});}
function handleVolunteerSubmission(event){
 const form=event.target;
 if(form?.id!=='volunteer-form')return;
 event.preventDefault();
 event.stopImmediatePropagation();
 if(!form.reportValidity())return;
 const values=Object.fromEntries(new FormData(form).entries());
 const birth=new Date(values.nascimento+'T12:00:00');
 if(Number.isNaN(birth.getTime())||birth>new Date()){toast('Informe uma data de nascimento válida.',true);return}
 const arr=candidaturas(),opportunity=data.oportunidades.find(o=>Number(o.id)===Number(selectedOpportunityId));
 if(!opportunity)return toast('Oportunidade indisponível.',true);
 const timestamp=new Date().toISOString();
 const schedule=agendaCandidatura({oportunidadeId:opportunity.id});
 const candidate={id:Date.now(),oportunidadeId:selectedOpportunityId,nome:values.nome.trim(),email:values.email.trim(),telefone:values.telefone.trim(),nascimento:values.nascimento,cidade:values.cidade.trim(),estado:values.estado,disponibilidade:values.disponibilidade,experiencia:values.experiencia,habilidades:(values.habilidades||'').trim(),motivacao:values.motivacao.trim(),consentimento:true,data:timestamp,status:vagasDisponiveis(opportunity)>0?'Pendente':'Lista de espera',agendaDias:schedule.days,agendaInicio:schedule.start,agendaFim:schedule.end};
 if(candidaturaDuplicada(candidate,arr)){toast('Já existe uma candidatura ativa com este e-mail para esta oportunidade.',true);return}
 if(candidaturaConflitaHorario(candidate,arr)){toast('Você já possui uma candidatura ativa em dias e horários que se sobrepõem.',true);return}
 const anterior=arr.filter(x=>Number(x.oportunidadeId)===Number(candidate.oportunidadeId)&&String(x.email||'').trim().toLowerCase()===candidate.email.toLowerCase()&&x.status==='Rejeitado').sort((a,b)=>new Date(b.data||0)-new Date(a.data||0))[0];
 if(anterior)candidate.candidaturaAnteriorId=anterior.id;
 candidate.historico=[{status:candidate.status,statusAnterior:'',responsavel:'Sistema',justificativa:'Inscrição recebida.',data:timestamp}];
 arr.push(candidate);
 try{store.set('candidaturas',arr)}catch{toast('Não foi possível salvar no navegador.',true);return}
 closeVolunteerModal();
 render();
 successNotice(candidate.status==='Pendente'?'Inscrição enviada e registrada, aguardando análise.':'Inscrição registrada na lista de espera para análise manual.');
}
document.addEventListener('submit',handleVolunteerSubmission,true);
document.addEventListener('submit',event=>{
 const form=event.target;
 if(form?.id!=='request-ong-form')return;
 const field=form.elements.namedItem('cnpj'),cnpj=normalizarCnpj(field.value);
 if(cnpj.length===14&&cnpjOcupado(cnpj)){
  event.preventDefault();
  event.stopImmediatePropagation();
  field.setCustomValidity('Já existe uma solicitação em andamento ou uma ONG cadastrada com este CNPJ.');
  field.reportValidity();
  toast('Este CNPJ já está associado a uma solicitação ativa ou ONG cadastrada.',true);
 }
},true);
document.addEventListener('submit',event=>{
 if(event.target?.id!=='request-ong-form')return;
 const cnpj=normalizarCnpj(event.target.elements.namedItem('cnpj').value),requests=store.get('solicitacoes_ongs',[]);
 const anteriores=requests.filter(r=>normalizarCnpj(r.cnpj)===cnpj&&r.status==='Rejeitado').sort((a,b)=>new Date(b.data||0)-new Date(a.data||0));
 const nova=requests.filter(r=>normalizarCnpj(r.cnpj)===cnpj&&r.status==='Pendente').sort((a,b)=>new Date(b.data||0)-new Date(a.data||0))[0];
 if(!anteriores.length||!nova)return;
 nova.solicitacaoAnteriorId=anteriores[0].id;
 try{store.set('solicitacoes_ongs',requests)}catch{toast('Solicitação criada, mas não foi possível vincular o histórico anterior.',true)}
});
document.addEventListener('DOMContentLoaded',init);
