const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const pause=ms=>new Promise(r=>setTimeout(r,ms));
module.exports=async(c,base)=>{
 const wait=async expression=>{for(let i=0;i<70;i++){if(await c.evaluate(expression))return;await pause(100);}throw Error('Tempo excedido: '+expression);};
 const navigate=async page=>{await c.send('Page.navigate',{url:base+'/'+page});await pause(900);};
 await navigate('dashboard/repasses-publicos.html');await wait(`!document.querySelector('#transfers-content').hidden`);
 const initial=await c.evaluate(`(async()=>Number((await(await fetch('../api/index.php?resource=total_repasses_publicos')).json()).totalRecebido))()`);
 const instrument='Instrumento fictício navegador '+Date.now();
 await c.evaluate(`(()=>{document.querySelector('#transfer-create').click();const f=document.querySelector('#transfer-form');f.elements.ong_id.value='1';f.elements.ong_id.dispatchEvent(new Event('change'));f.elements.projeto_id.value='1';f.elements.orgao_origem.value='Prefeitura fictícia do teste visual';f.elements.instrumento.value=${JSON.stringify(instrument)};f.elements.finalidade.value='Oficinas fictícias de leitura';f.elements.valor_recebido.value='100.25';f.elements.recebido_em.value='2026-01-01';document.querySelector('#transfer-demo').checked=true;f.requestSubmit()})()`);
 await wait(`document.querySelector('#transfers-message').textContent.includes('Recebimento simulado salvo')`);
 const id=await c.evaluate(`Number(document.querySelector('#transfer-document-title').textContent.split('#')[1])`);assert.ok(id);console.log('PASS recebimento cadastrado pela interface administrativa');
 const file=path.resolve('.runtime/repasse-documento-teste.pdf');fs.writeFileSync(file,'%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n');
 const {root}=await c.send('DOM.getDocument');const {nodeId}=await c.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#transfer-document-file'});await c.send('DOM.setFileInputFiles',{nodeId,files:[file]});await c.evaluate(`document.querySelector('#transfer-document-form').requestSubmit()`);
 await wait(`document.querySelector('#transfers-message').textContent.includes('Documento vinculado')`);assert.ok(await c.evaluate(`document.querySelector('#transfer-document-list').textContent.includes('repasse-documento-teste.pdf')`));console.log('PASS documento fictício vinculado pela interface');
 await c.evaluate(`document.querySelector('[data-action="editar"][data-id="${id}"]').click()`);await wait(`document.querySelector('#transfer-editor-title').textContent.includes('#${id}')&&!document.querySelector('#transfer-fields').disabled`);
 await c.evaluate(`document.querySelector('#transfer-accountability').value='Em_preparacao';document.querySelector('#transfer-form').requestSubmit()`);await wait(`document.querySelector('#transfer-editor-title').textContent==='Registrar recebimento'&&!document.querySelector('#transfer-fields').disabled`);console.log('PASS situação da prestação de contas editada somente no painel');
 assert.equal(await c.evaluate(`document.querySelector('#transfer-export').tagName`),'A');console.log('PASS exportacao centralizada em Relatorios');
 await navigate('pages/transparencia.html');await wait(`Boolean(document.querySelector('#public-transfers-total'))`);
 const expected=(initial+100.25).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 assert.equal(await c.evaluate(`document.querySelector('#public-transfers-total').textContent`),expected);
 assert.equal(await c.evaluate(`document.querySelector('#tp-ong-filter')===null&&!document.body.textContent.includes(${JSON.stringify(instrument)})&&!document.body.textContent.includes('repasse-documento-teste.pdf')`),true);console.log('PASS Transparência mostra somente total geral, sem filtro, instrumento ou documento');
 await navigate('dashboard/repasses-publicos.html');await wait(`!document.querySelector('#transfers-content').hidden`);
 await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert.equal(await c.evaluate('document.documentElement.scrollWidth>innerWidth'),false);console.log('PASS painel administrativo sem transbordamento em 390 px');
 c.onEvent=event=>{if(event.method==='Page.javascriptDialogOpening')c.send('Page.handleJavaScriptDialog',{accept:true,promptText:'Cancelamento fictício do teste de interface'}).catch(()=>{});};
 try{await c.evaluate(`document.querySelector('[data-action="cancelar"][data-id="${id}"]').click()`);await wait(`document.querySelector('#transfers-message').textContent.includes('Recebimento cancelado')`);}finally{c.onEvent=null;}
 const final=await c.evaluate(`(async()=>Number((await(await fetch('../api/index.php?resource=total_repasses_publicos')).json()).totalRecebido))()`);assert.equal(final,initial);console.log('PASS cancelamento administrativo retira valor do total público');
 await c.send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
};
