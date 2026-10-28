const assert=require('node:assert/strict');const pause=ms=>new Promise(r=>setTimeout(r,ms));
module.exports=async(c,base)=>{
 const wait=async expression=>{for(let i=0;i<70;i++){if(await c.evaluate(expression))return;await pause(100)}throw Error('Tempo excedido: '+expression)};
 const navigate=async route=>{await c.send('Page.navigate',{url:base+'/'+route});await pause(800)};
 await navigate('dashboard/relatorios.html');await wait(`document.querySelector('#report-message').textContent.includes('concluída')`);
 assert.equal(await c.evaluate(`document.querySelectorAll('#admin-reports th').length`),6);
 assert.equal(await c.evaluate(`document.querySelector('#admin-reports').textContent.includes('Públicos recebidos')`),true);
 await c.evaluate(`window.originalObjectURL=URL.createObjectURL;URL.createObjectURL=blob=>{window.reportDownload=blob.text();return window.originalObjectURL(blob)};document.querySelector('#export-csv').click()`);
 assert.equal((await c.evaluate(`window.reportDownload`)).includes('Públicos cancelados'),true);
 for(const type of ['projetos','voluntariado']){await c.evaluate(`document.querySelector('#report-filters').elements.tipo.value='${type}';document.querySelector('#report-filters').requestSubmit()`);await wait(`!document.querySelector('#export-csv').disabled`);assert.equal(await c.evaluate(`document.querySelector('#report-transfers').hidden`),true);}
 await c.evaluate(`const f=document.querySelector('#report-filters');f.elements.tipo.value='financeiro';f.elements.inicio.value='1900-01-01';f.elements.fim.value='1900-01-01';f.requestSubmit()`);await wait(`!document.querySelector('#export-csv').disabled`);
 assert.equal(await c.evaluate(`new URL(document.querySelector('#report-transfers').href).searchParams.get('inicio')`),'1900-01-01');
 console.log('PASS relatórios por tipo e período, CSV e atalho contextual');
 await navigate('dashboard/repasses-publicos.html');await wait(`!document.querySelector('#transfers-content').hidden`);
 assert.equal(await c.evaluate(`document.querySelector('#transfer-editor').open`),false);
 assert.equal(await c.evaluate(`document.querySelector('#transfer-export').tagName`),'A');
 await c.evaluate(`document.querySelector('#transfer-create').click()`);assert.equal(await c.evaluate(`document.querySelector('#transfer-editor').open`),true);
 await c.evaluate(`document.querySelector('#transfer-editor-close').click()`);assert.equal(await c.evaluate(`document.querySelector('#transfer-editor').open`),false);
 const label='Repasse fluxo '+Date.now();
 await c.evaluate(`document.querySelector('#transfer-create').click();const f=document.querySelector('#transfer-form');f.elements.ong_id.value='1';f.elements.ong_id.dispatchEvent(new Event('change'));f.elements.orgao_origem.value='Prefeitura fictícia';f.elements.instrumento.value=${JSON.stringify(label)};f.elements.finalidade.value='Oficinas demonstrativas';f.elements.valor_recebido.value='75.50';f.elements.recebido_em.value='2026-01-01';document.querySelector('#transfer-demo').checked=true;f.requestSubmit()`);
 await wait(`document.querySelector('#transfers-message').textContent.includes('Recebimento simulado salvo')`);
 assert.equal(await c.evaluate(`document.querySelector('#transfer-editor').open`),false);
 const id=await c.evaluate(`Number(document.querySelector('#transfer-document-title').textContent.split('#')[1])`);assert.ok(id);
 await c.evaluate(`document.querySelector('[data-action="editar"][data-id="${id}"]').click()`);await wait(`document.querySelector('#transfer-editor').open`);
 assert.equal(await c.evaluate(`document.querySelector('#transfer-instrument').value`),label);
 await c.evaluate(`document.querySelector('#transfer-reset').click()`);
 await c.evaluate(`document.querySelector('#transfer-filters').elements.inicio.value='1900-01-01';document.querySelector('#transfer-filters').elements.fim.value='1900-01-01';document.querySelector('#transfer-filters').requestSubmit()`);await wait(`document.querySelector('#transfer-pagination').textContent.includes('0 registro')`);
 assert.equal(await c.evaluate(`document.querySelector('#transfer-rows').children.length`),0);
 console.log('PASS repasses com lista, resumo, filtro e modal para cadastro e edição');
 await navigate('dashboard/auditoria.html?recurso=repasses_publicos&registroId='+id);await wait(`document.querySelectorAll('#audit-rows tr').length>0`);
 assert.equal(await c.evaluate(`document.querySelector('#audit-rows').textContent.includes(${JSON.stringify(label)})`),true);
 await c.evaluate(`document.querySelector('#audit-rows button').click()`);assert.equal(await c.evaluate(`document.querySelector('#audit-detail').open`),true);
 assert.equal(await c.evaluate(`document.querySelector('#audit-detail').textContent.includes('Requisição')`),true);
 await c.evaluate(`document.querySelector('#audit-detail [data-close]').click()`);
 console.log('PASS auditoria com nomes de registros, histórico contextual e detalhes em modal');
 for(const route of ['relatorios','repasses-publicos','auditoria']){
  await navigate('dashboard/'+route+'.html');await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await pause(200);
  assert.equal(await c.evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,route+' mobile');
  await c.send('Emulation.clearDeviceMetricsOverride');
 }
 await c.evaluate(`apiRequest('logout','POST').then(()=>{sessionState=null})`);
 await c.evaluate(`apiRequest('login','POST',{email:'ong@example.com',senha:'SenhaFicticia123!'}).then(()=>{sessionState=null})`);
 await navigate('dashboard/relatorios.html');await wait(`!document.querySelector('#export-csv').disabled`);
 assert.equal(await c.evaluate(`document.querySelector('#report-filters').elements.ongId.options.length`),2);
 await navigate('dashboard/repasses-publicos.html');await wait(`!document.querySelector('#transfers-content').hidden`);
 assert.equal(await c.evaluate(`[...document.querySelectorAll('#transfer-rows a')].some(a=>a.href.includes('auditoria'))`),false);
 console.log('PASS mobile sem transbordamento e responsável da ONG sem atalhos de auditoria');
};
