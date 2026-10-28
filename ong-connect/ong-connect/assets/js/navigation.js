/* Preferências de navegação desta aba. Os cadastros continuam no MariaDB. */
window.ongNavigation=(()=>{
  const key='ongconnect_navigation:'+location.pathname;
  let state={};try{const stored=JSON.parse(sessionStorage.getItem(key)||'{}');if(stored&&typeof stored==='object'&&!Array.isArray(stored))state=stored}catch{}
  const forms=new Map();let approvedNavigation=false,pendingRequest=null;
  const save=()=>{try{sessionStorage.setItem(key,JSON.stringify(state))}catch{}};
  const snapshot=form=>JSON.stringify([...form.elements].filter(el=>el.matches('input,textarea,select')).map((el,index)=>[
    el.name||el.id||index,
    el.type==='file'?[...el.files].map(file=>`${file.name}:${file.size}:${file.lastModified}`):
      ['checkbox','radio'].includes(el.type)?(el.checked?el.value:null):el.value
  ]));
  const dirty=form=>forms.has(form)&&form.isConnected&&snapshot(form)!==forms.get(form);
  const api={
    get:(name,fallback)=>state[name]??fallback,
    set(name,value){state[name]=value;save()},
    watchForm(form){if(!form||forms.has(form))return;forms.set(form,snapshot(form));form.addEventListener('reset',()=>queueMicrotask(()=>api.markClean(form)))},
    markClean(form){if(form)forms.set(form,snapshot(form))},
    isDirty:dirty,
    confirmForm(form){return !dirty(form)||confirm('Há alterações não salvas. Deseja descartá-las?')},
    restoreFilters(scope=document){
      scope.querySelectorAll('[data-remember],.filters input[id],.filters select[id],.donation-filters input[id],.donation-filters select[id]').forEach(el=>{
        const value=state.filters?.[el.id];
        if(value!==undefined&&(!el.options||[...el.options].some(o=>o.value===value)))el.value=value;
      });
    },
    rememberFilters(){
      state.filters={};document.querySelectorAll('[data-remember],.filters input[id],.filters select[id],.donation-filters input[id],.donation-filters select[id]').forEach(el=>{if(el.id)state.filters[el.id]=el.value});save();
    },
    addTableSearch(container,id,label){
      if(!container||document.getElementById(id))return;
      const controls=document.createElement('div');controls.className='filters record-filters';
      const caption=document.createElement('label');caption.htmlFor=id;caption.textContent=label;
      const input=document.createElement('input');input.id=id;input.type='search';input.className='field';input.setAttribute('data-remember','');
      const summary=document.createElement('span');summary.className='small muted';summary.setAttribute('role','status');
      controls.append(caption,input,summary);container.before(controls);api.restoreFilters(controls);
      const normalize=v=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      const apply=()=>{
        const query=normalize(input.value),rows=[...container.querySelectorAll('tbody tr')];
        rows.forEach(row=>row.hidden=!normalize(row.textContent).includes(query));
        summary.textContent=`${rows.filter(row=>!row.hidden).length} de ${rows.length} registros exibidos`;
        container.querySelectorAll('.volunteer-project-group').forEach(group=>{group.hidden=!!query&&![...group.querySelectorAll('tbody tr')].some(row=>!row.hidden);if(query&&!group.hidden)group.open=true});
      };
      input.addEventListener('input',apply);new MutationObserver(apply).observe(container,{childList:true});apply();
    },
    setPending(count){
      const badge=document.querySelector('#nav-pending-count');if(!badge)return;
      badge.textContent=String(count);badge.hidden=count===0;
      badge.setAttribute('aria-label',`${count} solicitaç${count===1?'ão pendente':'ões pendentes'}`);
    },
    donationNotificationKey(item){return item.id!=null?'id:'+String(item.id):'record:'+JSON.stringify(item)},
    markDonationsViewed(items){
      const saved=store.get('doacoes_visualizadas',[]);
      const seen=new Set(Array.isArray(saved)?saved:[]);
      items.forEach(item=>seen.add(api.donationNotificationKey(item)));
      try{store.set('doacoes_visualizadas',[...seen]);api.syncLocalNotifications()}catch{}
    },
    syncLocalNotifications(){
      const candidates=store.get('candidaturas',[]),donations=store.get('doacoes',[]);
      const saved=store.get('doacoes_visualizadas',[]),seen=new Set(Array.isArray(saved)?saved:[]);
      const items=[
        ['voluntarios.html','nav-volunteers-count',Array.isArray(candidates)?candidates.filter(item=>item.status==='Pendente').length:0,'candidaturas pendentes de análise'],
        ['doacoes.html','nav-donations-count',Array.isArray(donations)?donations.filter(item=>item.status==='Simulada'&&!seen.has(api.donationNotificationKey(item))).length:0,'doações simuladas não visualizadas']
      ];
      for(const [page,id,count,label] of items){
        const link=document.querySelector(`.sidebar nav a[href$="${page}"]`);if(!link)continue;
        let badge=document.getElementById(id);
        if(!badge){badge=document.createElement('span');badge.id=id;badge.className='nav-pending-count';badge.setAttribute('role','status');link.append(badge)}
        badge.textContent=String(count);badge.hidden=count===0;
        badge.setAttribute('aria-label',`${count} ${label}`);badge.title=`${count} ${label}`;
      }
    },
    async syncPending(){
      if(pendingRequest)return pendingRequest;
      pendingRequest=(async()=>{try{if((await getSession()).usuario?.perfil!=='admin')return;const rows=await fetchPages('solicitacoes');api.setPending(rows.filter(r=>r.status==='Pendente').length)}catch{const badge=document.querySelector('#nav-pending-count');if(badge)badge.hidden=true}})();
      try{await pendingRequest}finally{pendingRequest=null}
    }
  };
  addEventListener('beforeunload',event=>{if(!approvedNavigation&&[...forms.keys()].some(dirty)){event.preventDefault();event.returnValue=''}});
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href]');
    if(!link||link.hasAttribute('data-login-open')||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||link.target==='_blank'||link.hasAttribute('download'))return;
    const next=new URL(link.href,location.href);
    if(!['http:','https:'].includes(next.protocol)||(next.origin===location.origin&&next.pathname===location.pathname&&next.search===location.search))return;
    if([...forms.keys()].some(dirty)&&!confirm('Há alterações não salvas. Deseja sair desta página e descartá-las?')){event.preventDefault();event.stopImmediatePropagation();return}
    approvedNavigation=true;setTimeout(()=>{approvedNavigation=false},1000);
  },true);
  for(const type of ['input','change'])document.addEventListener(type,event=>{
    if(event.target.matches('[data-remember],.filters input[id],.filters select[id],.donation-filters input[id],.donation-filters select[id]'))queueMicrotask(api.rememberFilters);
  });
  document.addEventListener('DOMContentLoaded',()=>{
    if(document.querySelector('.sidebar nav')&&typeof getSession==='function')getSession().then(session=>{
      const nav=document.querySelector('.sidebar nav');
      for(const [page,label,icon,allowed] of [
        ['repasses-publicos.html','Repasses p\u00fablicos','\u25a7',['admin','ong'].includes(session.usuario?.perfil)],
        ['auditoria.html','Auditoria','\u2637',session.usuario?.perfil==='admin']
      ]){
        const matches=[...nav.querySelectorAll('a[href]')].filter(a=>new URL(a.href,location.href).pathname.endsWith('/'+page));
        let link=matches.shift();matches.forEach(a=>a.remove());
        if(!allowed){link?.remove();continue;}
        if(!link){link=document.createElement('a');link.href=page;nav.append(link);}
        link.hidden=false;link.replaceChildren();
        const mark=document.createElement('span');mark.className='admin-nav-icon';mark.setAttribute('aria-hidden','true');mark.textContent=icon;
        link.append(mark,document.createTextNode(label));
        const active=location.pathname.endsWith('/'+page);link.classList.toggle('active',active);
        if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
      }
      const menuItems={
        'index.html':['Dashboard','<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'],
        'ongs.html':['ONGs','<path d="M3 21h18M5 21V5h14v16M9 9h1m4 0h1M9 13h1m4 0h1M10 21v-4h4v4"/>'],
        'projetos.html':['Projetos','<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M8 6V3h8v3M3 11h18"/>'],
        'voluntarios.html':['Volunt\u00e1rios','<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5"/>'],
        'doacoes.html':['Doa\u00e7\u00f5es','<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>'],
        'relatorios.html':['Relat\u00f3rios','<path d="M4 3v18h17M8 17v-5m5 5V8m5 9V5"/>'],
        'repasses-publicos.html':['Repasses p\u00fablicos','<path d="m3 9 9-6 9 6M4 21h16M6 10v7m6-7v7m6-7v7M3 18h18"/>'],
        'auditoria.html':['Auditoria','<rect x="4" y="3" width="14" height="18" rx="2"/><path d="M8 7h6M8 11h4m3 4 2 2 4-4"/>']
      };
      for(const link of nav.querySelectorAll('a[href]')){
        const item=menuItems[new URL(link.href,location.href).pathname.split('/').pop()];if(!item)continue;
        const badges=[...link.querySelectorAll('.nav-pending-count')];
        const icon=document.createElement('span');icon.className='admin-nav-icon';icon.setAttribute('aria-hidden','true');
        icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+item[1]+'</svg>';
        const label=document.createElement('span');label.className='admin-nav-label';label.textContent=item[0];
        link.replaceChildren(icon,label,...badges);
      }
    }).catch(()=>{});
    const helpers=[...document.querySelectorAll('.page-help')];
    const closeHelp=helper=>{clearTimeout(helper.hideTimer);helper.querySelector('[role="tooltip"]').hidden=true;helper.querySelector('button').setAttribute('aria-expanded','false');helper.pinned=false};
    for(const helper of helpers){
      const button=helper.querySelector('button'),tip=helper.querySelector('[role="tooltip"]');
      const show=()=>{
        clearTimeout(helper.hideTimer);helpers.filter(item=>item!==helper).forEach(closeHelp);
        tip.hidden=false;button.setAttribute('aria-expanded','true');
        const rect=button.getBoundingClientRect(),width=tip.getBoundingClientRect().width;
        tip.style.left=Math.max(12,Math.min(rect.left,innerWidth-width-12))+'px';
        tip.style.top=Math.max(12,Math.min(rect.bottom+10,innerHeight-tip.offsetHeight-12))+'px';
      };
      helper.positionHelp=show;
      helper.addEventListener('pointerenter',show);
      helper.addEventListener('pointerleave',()=>{helper.hideTimer=setTimeout(()=>{if(!helper.pinned&&!helper.contains(document.activeElement))closeHelp(helper)},160)});
      button.addEventListener('focus',show);
      helper.addEventListener('focusout',event=>{if(!helper.contains(event.relatedTarget))closeHelp(helper)});
      button.addEventListener('click',()=>{if(helper.pinned)closeHelp(helper);else{show();helper.pinned=true}});
    }
    document.addEventListener('pointerdown',event=>{helpers.filter(helper=>!helper.contains(event.target)).forEach(closeHelp)});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&helpers.some(helper=>!helper.querySelector('[role="tooltip"]').hidden)){helpers.forEach(closeHelp);event.preventDefault()}});
    addEventListener('resize',()=>helpers.forEach(closeHelp));
    document.addEventListener('scroll',event=>{helpers.filter(helper=>!helper.querySelector('[role="tooltip"]').hidden&&!helper.contains(event.target)).forEach(helper=>helper.positionHelp())},true);
    document.querySelectorAll('#mvp-form,#account-form,#decision-form,#request-ong-form,#contact-form,#volunteer-form,#donation-billing-form').forEach(api.watchForm);
    const sidebar=document.querySelector('.sidebar'),toggle=document.querySelector('#dashboard-menu-toggle');
    if(toggle&&sidebar){
      const modern=()=>!!document.querySelector('.admin-header');
      const mobile=matchMedia('(max-width:650px)');
      const setOpen=open=>{
        sidebar.classList.toggle('is-open',open);toggle.setAttribute('aria-expanded',String(open));
        toggle.setAttribute('aria-label',open?'Fechar menu administrativo':'Abrir menu administrativo');
        if(modern()){
          sidebar.inert=mobile.matches&&!open;
          toggle.innerHTML='<span class="admin-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">'+(open?'<path d="m6 6 12 12M18 6 6 18"/>':'<path d="M4 6h16M4 12h16M4 18h16"/>')+'</svg></span><span class="admin-menu-label">Menu</span>';
        }else toggle.textContent=open?'× Recolher menu':'☰ Abrir menu';
      };
      const close=()=>setOpen(false);
      close();
      toggle.addEventListener('click',()=>setOpen(!sidebar.classList.contains('is-open')));
      toggle.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();setOpen(true);sidebar.querySelector('nav a')?.focus()}});
      document.addEventListener('keydown',event=>{if(event.key==='Escape'&&sidebar.classList.contains('is-open')){close();toggle.focus()}});
      sidebar.querySelector('nav').addEventListener('click',event=>{if(event.target.closest('a'))close()});
      {
        document.addEventListener('click',event=>{if(!sidebar.contains(event.target)&&!toggle.contains(event.target))close()});
        document.addEventListener('focusin',event=>{if(!sidebar.contains(event.target)&&!toggle.contains(event.target))close()});
      }
      mobile.addEventListener('change',close);
    }
    document.querySelectorAll('details.ong-accordion[id]').forEach(panel=>{
      panel.open=api.get('panel:'+panel.id,panel.open);
      panel.addEventListener('toggle',()=>api.set('panel:'+panel.id,panel.open));
    });
    if(sidebar){
      api.syncLocalNotifications();
      addEventListener('focus',api.syncLocalNotifications);
      addEventListener('storage',api.syncLocalNotifications);
      addEventListener('ong:storage-change',api.syncLocalNotifications);
    }
    if(sidebar&&document.body.dataset.page!=='admin-ongs'){
      api.syncPending();addEventListener('focus',api.syncPending);
    }
  });
  return api;
})();
