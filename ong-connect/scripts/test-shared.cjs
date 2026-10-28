/* Servidores independentes permitem concorrência real no Windows. Banco novo a cada execução. */
const {spawn,execFileSync}=require('child_process');const fs=require('fs');const assert=require('assert/strict');const path=require('path');
const root=path.resolve(__dirname,'..');
const portablePhp=path.join(root,'.runtime/php/php.exe');
const usePortable=!process.env.PHP_BINARY&&process.platform==='win32'&&fs.existsSync(portablePhp);
const php=process.env.PHP_BINARY||(usePortable?portablePhp:'php');
// O PHP instalado usa seu próprio php.ini; somente o portátil recebe extensões locais.
const args=usePortable?['-n','-d','extension_dir='+path.join(root,'.runtime/php/ext'),'-d','extension=pdo_mysql','-d','extension=mbstring','-d','extension=fileinfo']:[];
fs.mkdirSync(path.join(root,'.runtime'),{recursive:true});
const env={...process.env,DB_DATABASE:'ong_connect_test_'+Date.now()};const servers=[];let passed=0;
const run=(file,extra=[])=>execFileSync(php,[...args,file,...extra],{cwd:root,env,encoding:'utf8'});
const ports=[18081,18082];
class Client{
 constructor(port=ports[0]){this.port=port;this.cookie='';this.csrf='';}
 async call(resource,method='GET',body,id,token=true,filters={}){const q=new URLSearchParams({resource,...filters});if(id)q.set('id',id);const r=await fetch(`http://127.0.0.1:${this.port}/api/index.php?${q}`,{method,headers:{...(this.cookie?{Cookie:this.cookie}:{}),...(token?{'X-CSRF-Token':this.csrf}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const cookie=r.headers.get('set-cookie');if(cookie)this.cookie=cookie.split(';')[0];const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{throw Error(resource+': '+raw.slice(0,1400))}if(data.csrf)this.csrf=data.csrf;return {status:r.status,...data};}
 async login(email,senha='SenhaFicticia123!'){await this.call('sessao');const r=await this.call('login','POST',{email,senha});assert.equal(r.status,200,JSON.stringify(r));return this;}
}
const ok=(name)=>{passed++;console.log('PASS '+name)};
async function main(){
 console.log(run('scripts/prepare-integration.php'));console.log(run('scripts/install.php'));console.log(run('scripts/integration-fixtures.php'));console.log(run('scripts/migrate.php'));
 const snapshot=run('scripts/integration-fixtures.php',['snapshot']);run('scripts/install.php');assert.equal(run('scripts/integration-fixtures.php',['snapshot']),snapshot);ok('reinstalação e migrações preservam dados e métricas legadas');
 for(const port of ports){const fd=fs.openSync(path.join(root,`.runtime/shared-${port}.log`),'a');const p=spawn(php,[...args,'-S',`127.0.0.1:${port}`,'-t','ong-connect'],{cwd:root,env,windowsHide:true,stdio:['ignore',fd,fd]});servers.push(p);fs.closeSync(fd);}
 const visitor=new Client();for(let i=0;i<40;i++){try{await visitor.call('sessao');break}catch{await new Promise(r=>setTimeout(r,100))}}
 assert.equal((await visitor.call('solicitacoes')).status,401);assert.equal((await visitor.call('ongs','DELETE',{},1)).status,401);ok('acesso anônimo bloqueado');
 assert.equal((await visitor.call('login','POST',{email:'ausente@example.com',senha:'invalida'})).status,401);ok('login inválido');
 const admin=await new Client().login('admin@example.com'),manager=await new Client().login('ong@example.com'),vol=await new Client().login('voluntario@example.com');
 assert.equal((await admin.call('ongs','DELETE',{},6,false)).status,403);ok('CSRF obrigatório');
 assert.equal((await manager.call('projetos','DELETE',{},4)).status,403);ok('isolamento entre ONGs');
 const fresh=new Client();await fresh.call('sessao');await fresh.call('cadastro','POST',{nome:'Outra Pessoa Fictícia',email:'outra@example.com',senha:'SenhaFicticia123!',perfil:'admin'});await fresh.login('outra@example.com');assert.equal((await fresh.call('sessao')).usuario.perfil,'voluntario');ok('cadastro não eleva privilégios');
 const make=c=>c.call('candidaturas','POST',{oportunidadeId:1,consentimento:true,motivacao:'Ajuda fictícia'});
 const first=await make(vol);assert.equal(first.status,201,JSON.stringify(first));assert.equal((await make(vol)).status,409);ok('inscrição e duplicidade');
 assert.equal((await vol.call('candidaturas','POST',{oportunidadeId:2,consentimento:true})).status,409);ok('conflito de agenda');
 const second=await make(fresh);assert.equal(second.status,201);
 assert.equal((await fresh.call('candidaturas','PUT',{status:'Cancelado'},first.id)).status,403);ok('candidatura de outro usuário protegida');
 const admin2=await new Client(ports[1]).login('admin@example.com');
 const approvals=await Promise.all([admin.call('candidaturas','PUT',{status:'Aprovado'},first.id),admin2.call('candidaturas','PUT',{status:'Aprovado'},second.id)]);
 assert.deepEqual(approvals.map(r=>r.status).sort(),[200,409]);const list=await admin.call('candidaturas');assert.equal(list.candidaturas.filter(c=>c.status==='Aprovado').length,1);ok('concorrência real: última vaga preservada');
 const approved=list.candidaturas.find(c=>c.status==='Aprovado'),waiting=list.candidaturas.find(c=>c.status==='Lista de espera');assert.ok(waiting);await admin.call('candidaturas','PUT',{status:'Cancelado'},approved.id);assert.equal((await admin.call('candidaturas','PUT',{status:'Aprovado'},waiting.id)).status,200);assert.equal((await admin.call('candidaturas','PUT',{status:'Aprovado'},waiting.id)).status,200);ok('fila, cancelamento e promoção idempotente');
 assert.equal((await admin.call('candidaturas','PUT',{status:'Pendente'},approved.id)).status,409);ok('transição inválida');
 const d={projetoId:1,valor:'25.50',chave:'teste-reenvio'};const d1=await vol.call('doacoes','POST',d),d2=await vol.call('doacoes','POST',d);assert.equal(d1.status,201,JSON.stringify(d1));assert.equal(d1.id,d2.id);assert.equal((await vol.call('doacoes','POST',{...d,valor:'30.00'})).status,409);ok('doação simulada e reenvio');
 const oppValues={projetoId:1,titulo:'Vaga fechada fictícia',modalidade:'Remoto',vagas:1,diasAtuacao:['TER'],horarioInicio:'09:00',horarioFim:'10:00',ativa:false};
 const closed=await admin.call('oportunidades','POST',oppValues);assert.equal(closed.status,201);assert.equal((await vol.call('candidaturas','POST',{oportunidadeId:closed.id,consentimento:true})).status,409);ok('oportunidade fechada recusa candidatura');
 assert.equal((await admin.call('oportunidades','PUT',{...oppValues,projetoId:1,titulo:'Agenda alterada',diasAtuacao:['QUA'],ativa:true},1)).status,409);ok('agenda de candidatura ativa preservada');
 const catalog=await visitor.call('catalogo');assert.equal(catalog.projetos.find(p=>p.id===1).arrecadado,25.5);assert.equal(catalog.projetos.find(p=>p.id===1).voluntarios,1);ok('indicadores derivados');
 assert.equal((await vol.call('doacoes','PUT',{status:'Cancelada'},d1.id)).status,200);assert.equal((await visitor.call('catalogo')).projetos.find(p=>p.id===1).arrecadado,0);ok('cancelamento de simulação recalcula total');
 const request={nome:'ONG Fictícia Teste',cnpj:'98765432000100',cidade:'Cidade fictícia',email:'ongteste@example.com',descricao:'Organização fictícia de teste',responsavel:'Pessoa Fictícia',telefone:'11999990000',consentimento:true};
 const r=await visitor.call('solicitacoes','POST',request);assert.equal(r.status,201,JSON.stringify(r));const published=await admin.call('publicar','POST',{...request,categoria:'Educação'},r.id);assert.equal(published.status,200);assert.equal((await admin.call('rejeitar','POST',{motivo:'Teste fictício'},r.id)).status,409);ok('publicação atômica e decisão repetida bloqueada');
 assert.equal(published.acesso.contaCriada,true);assert.ok(published.acesso.senhaInicial.length>=12);
 const ongAdmin=await new Client().login(request.email,published.acesso.senhaInicial);const ongSession=await ongAdmin.call('sessao');assert.equal(ongSession.usuario.perfil,'ong');assert.deepEqual(ongSession.ongs,[published.acesso.ongId]);assert.equal((await ongAdmin.call('projetos','DELETE',{},1)).status,403);ok('aprovação cria credenciais e vínculo com acesso restrito');
 const requestLinked={...request,cnpj:'98765432000102'};const linked=await visitor.call('solicitacoes','POST',requestLinked);const linkedResult=await admin.call('publicar','POST',{...requestLinked,categoria:'Educação'},linked.id);assert.equal(linkedResult.status,200);assert.equal(linkedResult.acesso.contaCriada,false);assert.equal(linkedResult.acesso.senhaInicial,null);await new Client().login(request.email,published.acesso.senhaInicial);ok('responsável existente recebe vínculo sem alteração da senha');
 const requestConflict={...request,cnpj:'98765432000103',email:'voluntario@example.com'};const conflicting=await visitor.call('solicitacoes','POST',requestConflict);const beforeConflict=(await visitor.call('catalogo')).ongs.length;assert.equal((await admin.call('publicar','POST',{...requestConflict,categoria:'Educação'},conflicting.id)).status,409);assert.equal((await visitor.call('catalogo')).ongs.length,beforeConflict);assert.equal((await admin.call('solicitacoes')).solicitacoes.find(s=>s.id===conflicting.id).status,'Pendente');ok('conflito de perfil reverte publicação e preserva solicitação');
 const safeCatalog=JSON.stringify(await visitor.call('catalogo'));const safeRequests=JSON.stringify(await admin.call('solicitacoes'));assert.equal(safeCatalog.includes(published.acesso.senhaInicial),false);assert.equal(safeRequests.includes(published.acesso.senhaInicial),false);ok('senha inicial não aparece no catálogo nem no histórico');
 const r2=await visitor.call('solicitacoes','POST',{...request,cnpj:'98765432000101'});assert.equal((await admin.call('rejeitar','POST',{motivo:'Dados fictícios insuficientes'},r2.id)).status,200);ok('rejeição de ONG');
 const third=new Client();await third.call('sessao');await third.call('cadastro','POST',{nome:'Terceira Pessoa Fictícia',email:'terceira@example.com',senha:'SenhaFicticia123!'});await third.login('terceira@example.com');
 const q1=await make(approved.usuario_id===3?vol:fresh);assert.equal(q1.status,201,JSON.stringify(q1));const q2=await make(third);assert.equal(q2.status,201);
 await admin.call('candidaturas','PUT',{status:'Cancelado'},waiting.id);
 assert.equal((await admin.call('candidaturas','PUT',{status:'Aprovado'},q2.id)).status,409);assert.equal((await admin.call('candidaturas','PUT',{status:'Aprovado'},q1.id)).status,200);ok('fila exige aprovação na ordem de data e ID');
 await vol.call('logout','POST');assert.equal((await vol.call('candidaturas')).status,401);ok('logout invalida sessão');
 if(process.env.BROWSER_TESTS==='1')await require('./test-shared-browser.cjs')('http://127.0.0.1:'+ports[0]);
 const projectBase={ongId:2,titulo:'Projeto detalhado de teste',categoria:'Educação',descricao:'Descrição completa de um projeto fictício.',meta:100,status:'Ativo'};
 assert.equal((await admin.call('projetos','POST',projectBase)).status,422);
 const details={objetivo:'Promover educação comunitária.',publico_alvo:'Estudantes da comunidade.',atividades:'Oficinas educativas semanais.',orientacoes_voluntariado:'Apoiar as oficinas; consultar as vagas.',uso_recursos:'Materiais educativos para as oficinas.'};
 const detailed=await admin.call('projetos','POST',{...projectBase,...details});assert.equal(detailed.status,201,JSON.stringify(detailed));
 let savedProject=(await visitor.call('catalogo')).projetos.find(p=>p.id===detailed.id);for(const [key,value] of Object.entries(details))assert.equal(savedProject[key],value);ok('cadastro exige detalhes e catálogo persiste as cinco orientações');
 assert.equal((await manager.call('projetos','PUT',{...projectBase,...details},detailed.id)).status,403);
 assert.equal((await admin.call('projetos','PUT',{...projectBase,uso_recursos:'x'},detailed.id)).status,422);
 assert.equal((await admin.call('projetos','PUT',{...projectBase,uso_recursos:'Nova destinação educativa dos recursos.'},detailed.id)).status,200);
 savedProject=(await visitor.call('catalogo')).projetos.find(p=>p.id===detailed.id);assert.equal(savedProject.uso_recursos,'Nova destinação educativa dos recursos.');assert.equal(savedProject.objetivo,details.objetivo);ok('edição valida orientações, preserva campos omitidos e respeita vínculos da ONG');
 const blockRequest={...request,cnpj:'87654321000199',email:'cnpj-block@example.com'};
 let lastRequest;
 for(let attempt=1;attempt<=3;attempt++){
   const submitted=await visitor.call('solicitacoes','POST',blockRequest);assert.equal(submitted.status,201,JSON.stringify(submitted));
   assert.equal((await admin.call('rejeitar','POST',{motivo:'Rejeição de teste '+attempt},submitted.id)).status,200);
   assert.equal((await admin.call('rejeitar','POST',{motivo:'Repetida'},submitted.id)).status,409);
   const reviewed=(await admin.call('solicitacoes')).solicitacoes.find(r=>r.id===submitted.id);
   assert.equal(reviewed.rejeicoes,attempt);assert.equal(reviewed.cnpjBloqueado,attempt===3);lastRequest=submitted.id;
 }
 assert.equal((await visitor.call('solicitacoes','POST',blockRequest)).status,409);
 assert.equal((await visitor.call('solicitacoes','POST',{...blockRequest,cnpj:'87.654.321/0001-99'})).status,409);ok('três rejeições distintas bloqueiam CNPJ normalizado sem contar decisão repetida');
 run('scripts/cnpj-test-fixtures.php',['delete',String(lastRequest)]);
 assert.equal(run('scripts/cnpj-test-fixtures.php',['history',String(lastRequest)]),'1');
 assert.equal((await visitor.call('solicitacoes','POST',blockRequest)).status,409);ok('histórico e bloqueio sobrevivem à exclusão da solicitação');
 assert.equal((await visitor.call('auditoria')).status,401);const auditVolunteer=await new Client().login('voluntario@example.com');assert.equal((await auditVolunteer.call('auditoria')).status,403);assert.equal((await manager.call('auditoria')).status,403);
 const logs=await admin.call('auditoria');assert.equal(logs.status,200);assert.ok(logs.auditoria.some(a=>a.resultado==='Falha'));assert.ok(logs.auditoria.some(a=>a.autor_id===null&&a.recurso==='solicitacoes'));assert.ok(logs.auditoria.every(a=>a.requisicao_id===null||a.requisicao_id.length===32));
 assert.equal((await admin.call('auditoria','DELETE',{},1)).status,405);
 assert.equal(JSON.stringify(logs).includes('SenhaFicticia123!'),false);ok('auditoria somente leitura para administrador, com ações públicas e falhas sem senhas');
 await require('./test-public-transfers.cjs')({Client,admin,manager,visitor,ok});
 await require('./test-segments.cjs')({admin,manager,visitor,ok});
 await require('./test-reports.cjs')({Client,admin,manager,visitor,ok});
 const limited=new Client();await limited.call('sessao');let rate;
 for(let i=0;i<11;i++){rate=await limited.call('login','POST',{email:'inexistente@example.com',senha:'SenhaErradaFicticia'});if(rate.status===429)break;assert.equal(rate.status,401);}
 assert.equal(rate.status,429);ok('limitação de tentativas de login');
 console.log(`${passed} verificações aprovadas. Banco preservado para inspeção: ${env.DB_DATABASE}`);
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{for(const p of servers)p.kill()});
