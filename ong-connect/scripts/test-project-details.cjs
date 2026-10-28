const assert=require('node:assert/strict');const pause=ms=>new Promise(r=>setTimeout(r,ms));
module.exports=async(c,base)=>{
 const title='Projeto detalhado navegador '+Date.now();
 const details={objetivo:'Desenvolver habilidades educativas locais.',publico_alvo:'Jovens estudantes da comunidade.',atividades:'Oficinas semanais com atividades educativas.',orientacoes_voluntariado:'Ajude a organizar oficinas; consulte os horários nas vagas.',uso_recursos:'Compra fictícia de materiais para as oficinas.'};
 await c.send('Page.navigate',{url:base+'/dashboard/projetos.html'});await pause(1000);
 assert.equal(await c.evaluate(`(()=>{document.querySelector('#create-project').click();const f=document.querySelector('#mvp-form');return ${JSON.stringify(Object.keys(details))}.every(k=>f.elements[k].required)&&!f.checkValidity()})()`),true);
 await c.evaluate(`(()=>{const f=document.querySelector('#mvp-form');for(const [key,value] of Object.entries(${JSON.stringify({...details,ongId:'1',titulo:title,segmentoId:String((await c.evaluate(`data.segmentos.find(s=>Number(s.ativo)).id`))),descricao:'Descrição de projeto fictício para validação.',meta:'100',status:'Ativo'})}))f.elements[key].value=value;f.requestSubmit()})()`);
 for(let i=0;i<60;i++){if(await c.evaluate(`document.querySelector('#project-editor-modal').hidden`))break;await pause(100);}
 assert.equal(await c.evaluate(`document.querySelector('#project-editor-modal').hidden`),true,'cadastro deve salvar');
 const id=await c.evaluate(`data.projetos.find(p=>p.titulo===${JSON.stringify(title)})?.id`);assert.ok(id);
 await c.evaluate(`document.querySelector('[data-edit="${id}"]').click()`);
 assert.equal(await c.evaluate(`(()=>{const f=document.querySelector('#mvp-form');return Object.entries(${JSON.stringify(details)}).every(([k,v])=>f.elements[k].value===v)})()`),true);console.log('PASS cadastro e reabertura de projeto com os cinco detalhes');
 await c.send('Page.navigate',{url:base+'/pages/ongs.html'});await pause(1000);await c.evaluate(`document.querySelector('.ong-details-open[data-ong-id="1"]').click();renderOngDetailsTab('projetos')`);
 assert.equal(await c.evaluate(`Boolean(document.querySelector('#ong-details-panel a[href$="?projeto=${id}"]'))`),true);
 await c.evaluate(`document.querySelector('#ong-details-panel a[href$="?projeto=${id}"]').click()`);await pause(1200);
 assert.equal(await c.evaluate(`location.pathname.endsWith('/pages/projetos.html')&&new URLSearchParams(location.search).get('projeto')==='${id}'&&!document.querySelector('#project-details-modal').hidden&&document.querySelector('#project-details-title').textContent===${JSON.stringify(title)}`),true);
 assert.equal(await c.evaluate(`Object.values(${JSON.stringify(details)}).every(t=>document.querySelector('#project-details-content').textContent.includes(t))`),true);console.log('PASS Ver projeto direciona ao projeto correto e apresenta orientações e recursos');
 assert.equal(await c.evaluate(`Boolean(document.querySelector('#project-details-content .donation-open'))&&document.querySelector('#project-details-content').textContent.includes('Nenhum pagamento é processado')`),true);console.log('PASS apoio permanece disponível e claramente simulado');
};
