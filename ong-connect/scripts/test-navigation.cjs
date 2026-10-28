// Testes de interação sem gravar ou excluir dados do banco.
const assert=require('node:assert/strict');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
module.exports=async(client,base,catalog)=>{
  const go=async route=>{
    await client.send('Page.navigate',{url:base+'/'+route});await pause(300);
    await client.evaluate(`(async()=>{for(let i=0;i<100;i++){if(document.readyState==='complete'&&!document.querySelector('.data-placeholder')&&(!document.querySelector('#mvp-save')||!document.querySelector('#mvp-save').disabled))return;await new Promise(r=>setTimeout(r,100))}throw Error('Tela não ficou pronta')})()`);
  };
  let accept=false,dialogs=0;
  client.onEvent=event=>{if(event.method==='Page.javascriptDialogOpening'){dialogs++;client.send('Page.handleJavaScriptDialog',{accept}).catch(console.error)}};
  try{
    await go('dashboard/ongs.html');
    assert.equal(await client.evaluate(`ongNavigation.isDirty(document.querySelector('#mvp-form'))`),false,'Formulário inicial limpo');
    await client.evaluate(`const search=document.querySelector('#record-search');search.value='zzzz-nao-existe';search.dispatchEvent(new Event('input',{bubbles:true}));`);
    assert.equal(await client.evaluate(`document.querySelectorAll('#records-list tbody tr').length`),0);
    await go('dashboard/ongs.html');
    assert.equal(await client.evaluate(`document.querySelector('#record-search').value`),'zzzz-nao-existe','Busca preservada');
    await client.evaluate(`const search=document.querySelector('#record-search');search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-edit]').click()`);
    assert.equal(await client.evaluate(`ongNavigation.isDirty(document.querySelector('#mvp-form'))`),false,'Abrir edição não cria alteração fictícia');
    await client.evaluate(`document.querySelector('#mvp-nome').value='Alteração não salva';document.querySelector('#mvp-nome').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#reload-mvp').click()`);
    await pause(600);
    assert.equal(await client.evaluate(`document.querySelector('#mvp-nome').value`),'Alteração não salva','Atualização preserva edição');
    assert.equal(await client.evaluate(`ongNavigation.isDirty(document.querySelector('#mvp-form'))`),true);
    await client.evaluate(`document.querySelector('#mvp-cancel').click()`);
    assert.equal(dialogs,1,'Cancelar edição pede confirmação');
    assert.equal(await client.evaluate(`document.querySelector('#mvp-nome').value`),'Alteração não salva','Recusar descarte preserva campos');
    await client.evaluate(`document.querySelector('.sidebar a[href="projetos.html"]').click()`);
    assert.equal(dialogs,2,'Navegação pede confirmação');
    assert.equal(await client.evaluate(`location.pathname`),'/dashboard/ongs.html','Recusar saída mantém página');
    accept=true;await client.evaluate(`document.querySelector('#mvp-cancel').click()`);
    assert.equal(await client.evaluate(`ongNavigation.isDirty(document.querySelector('#mvp-form'))`),false,'Descartar limpa o formulário');
    console.log('OK: busca persistida, edição preservada e confirmação de descarte/saída.');

    // Simula falha/sucesso de gravação só no navegador, sem inserir registros reais.
    const dialogHandler=client.onEvent;let failSave=true,capturedSave=null;
    client.onEvent=event=>{
      if(event.method!=='Fetch.requestPaused'){dialogHandler(event);return}
      capturedSave={method:event.params.request.method,body:JSON.parse(event.params.request.postData)};
      client.send('Fetch.fulfillRequest',{requestId:event.params.requestId,responseCode:failSave?422:201,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(failSave?{error:'Validação simulada no teste.'}:{ok:true,id:900004})).toString('base64')}).catch(console.error);
    };
    await client.send('Fetch.enable',{patterns:[{urlPattern:'*resource=ongs*'}]});
    await client.evaluate(`(async()=>{for(let i=0;i<100;i++){if(!document.querySelector('main').hasAttribute('aria-busy'))return;await new Promise(r=>setTimeout(r,50))}throw Error('Atualização de ONGs não terminou')})()`);
    await client.evaluate(`document.querySelector('#ong-register-panel').open=true;const form=document.querySelector('#mvp-form');for(const [key,value] of Object.entries({nome:'ONG de teste de navegação',cnpj:'99999999000199',cidade:'Cidade fictícia',email:'teste@example.com',categoria:'Educação',descricao:'Teste fictício sem gravação no banco'}))form.elements[key].value=value;form.requestSubmit()`);
    for(let attempt=0;attempt<50&&!capturedSave;attempt++)await pause(100);
    for(let attempt=0;attempt<50&&await client.evaluate(`document.querySelector('#mvp-save').disabled`);attempt++)await pause(100);
    assert.equal(capturedSave.method,'POST');assert.equal(capturedSave.body.cnpj,'99999999000199');
    assert.equal(await client.evaluate(`ongNavigation.isDirty(document.querySelector('#mvp-form'))`),true,'Falha mantém dados não salvos');
    assert.equal(await client.evaluate(`document.querySelector('#mvp-save').disabled`),false,'Falha permite tentar novamente');
    failSave=false;await client.evaluate(`document.querySelector('#mvp-form').requestSubmit()`);await pause(700);
    assert.equal(await client.evaluate(`document.querySelector('#mvp-nome').value`),'','Sucesso limpa o formulário');
    assert.equal(await client.evaluate(`ongNavigation.isDirty(document.querySelector('#mvp-form'))`),false,'Sucesso remove aviso de alterações');
    assert.match(await client.evaluate(`document.querySelector('#message a').getAttribute('href')`),/ong=900004$/,'Sucesso oferece próximo passo');
    await client.send('Fetch.disable');client.onEvent=dialogHandler;
    console.log('OK: falha de gravação preserva campos; sucesso limpa edição e oferece cadastrar projeto.');

    const link=await client.evaluate(`document.querySelector('#records-list a[href^="projetos.html?ong="]').getAttribute('href')`);
    await go('dashboard/'+link);
    const selected=new URL(base+'/dashboard/'+link).searchParams.get('ong');
    assert.equal(await client.evaluate(`document.querySelector('#mvp-ongId').value`),selected,'Cadastro contextual seleciona ONG');
    assert.equal(await client.evaluate(`document.querySelector('#record-ong-filter').value`),selected,'Lista contextual filtra ONG');
    assert.equal(await client.evaluate(`ongNavigation.isDirty(document.querySelector('#mvp-form'))`),false);
    await client.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    assert.equal(await client.evaluate(`document.querySelector('.sidebar').inert`),true,'Menu fechado não recebe foco');
    await client.evaluate(`document.querySelector('#dashboard-menu-toggle').click()`);
    assert.equal(await client.evaluate(`document.querySelector('#dashboard-menu-toggle').getAttribute('aria-expanded')`),'true');
    assert.equal(await client.evaluate(`document.querySelector('.sidebar').inert`),false,'Menu aberto permite navegação por teclado');
    await client.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
    assert.equal(await client.evaluate(`document.querySelector('.sidebar').inert`),true);
    assert.equal(await client.evaluate(`document.activeElement.id`),'dashboard-menu-toggle','Escape devolve foco ao botão');
    console.log('OK: cadastro contextual e menu móvel com fechamento por Escape.');

    const fixture={solicitacoes:[
      {id:900001,nome:'Pendente fictícia',status:'Pendente',cnpj:'11111111000111',cidade:'Cidade',email:'teste@example.com',descricao:'Teste de interface',historico:[]},
      {id:900002,nome:'Publicada fictícia',status:'Cadastrada',cnpj:'22222222000122',cidade:'Cidade',email:'teste@example.com',descricao:'Teste de interface',historico:[],ong_id:catalog.ongs[0].id},
      {id:900003,nome:'Rejeitada fictícia',status:'Rejeitado',cnpj:'33333333000133',cidade:'Cidade',email:'teste@example.com',descricao:'Teste de interface',historico:[]}
    ]};
    client.onEvent=event=>{if(event.method==='Fetch.requestPaused')client.send('Fetch.fulfillRequest',{requestId:event.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(fixture)).toString('base64')}).catch(console.error)};
    await client.send('Fetch.enable',{patterns:[{urlPattern:'*resource=solicitacoes*'}]});
    await go('dashboard/ongs.html');
    assert.equal(await client.evaluate(`document.querySelector('#nav-pending-count').textContent`),'1');
    assert.equal(await client.evaluate(`document.querySelector('#pending-count').hidden`),false);
    await client.evaluate(`document.querySelector('#ong-requests-panel').open=true;document.querySelector('#request-tab-Rejeitado').click()`);
    assert.equal(await client.evaluate(`document.querySelectorAll('#requests-list .request-review-card').length`),1);
    assert.match(await client.evaluate(`document.querySelector('#requests-list').textContent`),/Rejeitada/);
    await go('dashboard/ongs.html');
    assert.equal(await client.evaluate(`document.querySelector('#request-tab-Rejeitado').getAttribute('aria-selected')`),'true','Situação preservada');
    assert.equal(await client.evaluate(`document.querySelector('#ong-requests-panel').open`),true,'Seção aberta preservada');
    await go('dashboard/index.html');await pause(200);
    assert.equal(await client.evaluate(`document.querySelector('#nav-pending-count').textContent`),'1','Pendências aparecem em outros módulos');
    assert.equal(await client.evaluate(`document.querySelectorAll('#mvp-notice').length`),0,'Aviso superior removido');
    await client.evaluate(`window.notificationTestBackup={candidaturas:store.get('candidaturas',[]),doacoes:store.get('doacoes',[])};store.set('candidaturas',[{status:'Pendente'},{status:'Pendente'},{status:'Aprovado'},{status:'Lista de espera'}]);store.set('doacoes',[{status:'Simulada'},{status:'Simulada'}])`);
    assert.equal(await client.evaluate(`document.querySelector('#nav-volunteers-count').textContent`),'2','Contador considera apenas candidaturas pendentes');
    assert.equal(await client.evaluate(`document.querySelector('#nav-donations-count').textContent`),'2','Doações atualizam no mesmo instante');
    await client.evaluate(`store.set('candidaturas',[]);store.set('doacoes',[])`);
    assert.equal(await client.evaluate(`document.querySelector('#nav-volunteers-count').hidden&&document.querySelector('#nav-donations-count').hidden`),true,'Contadores zerados ficam ocultos');
    await client.evaluate(`store.set('candidaturas',notificationTestBackup.candidaturas);store.set('doacoes',notificationTestBackup.doacoes);delete window.notificationTestBackup`);
    console.log('OK: abas, contadores, estado das seções e notificação em outros módulos.');
  }finally{
    await client.evaluate(`if(window.notificationTestBackup){store.set('candidaturas',notificationTestBackup.candidaturas);store.set('doacoes',notificationTestBackup.doacoes);delete window.notificationTestBackup}`);
    await client.send('Fetch.disable');client.onEvent=null;
    await client.evaluate(`document.querySelectorAll('form').forEach(form=>ongNavigation.markClean(form));for(const key of Object.keys(sessionStorage))if(key.startsWith('ongconnect_navigation:'))sessionStorage.removeItem(key)`);
    await client.send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
  }
};
