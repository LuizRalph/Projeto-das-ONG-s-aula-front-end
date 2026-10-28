// Sem dependências: node scripts/test-client.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'../ong-connect/assets/js/app.js'),'utf8');
async function run(){
  for(const pathname of ['/index.html','/dashboard/ongs.html','/curso/ong-connect/pages/ongs.html']){
    const calls=[];
    const catalog={ongs:[{id:1,nome:'ONG remota'}],projetos:[],oportunidades:[]};
    const context=vm.createContext({
      document:{body:{dataset:{}},addEventListener(){}},window:{},location:{pathname},URLSearchParams,
      localStorage:{getItem(){throw Error('O catálogo não deve consultar o navegador.')}},
      fetch:async(url,options)=>{
        if(url.endsWith('data/demo-registrations.json'))return{ok:false};
        if(url.endsWith('resource=sessao'))return{ok:true,json:async()=>({usuario:{id:1,perfil:'admin'},csrf:'token-de-teste'})};
        for(const resource of ['candidaturas','doacoes'])if(url.includes('resource='+resource))return{ok:true,json:async()=>({[resource]:[],pagination:{total:0}})};
        calls.push({url,options});return{ok:true,json:async()=>catalog}
      }
    });
    vm.runInContext(source,context);
    await vm.runInContext('Promise.all([loadData(),loadData()])',context);
    assert.equal(calls.length,1,'Chamadas simultâneas devem compartilhar o carregamento.');
    assert.equal(vm.runInContext('data.ongs[0].nome',context),'ONG remota');
    assert.equal(calls[0].url,pathname.includes('/pages/')||pathname.includes('/dashboard/')?'../api/index.php?resource=catalogo':'api/index.php?resource=catalogo');
    await vm.runInContext("apiRequest('publicar','POST',{nome:'ONG'},42)",context);
    assert.match(calls[1].url,/resource=publicar&id=42$/);
    assert.equal(calls[1].options.method,'POST');
    assert.equal(calls[1].options.headers['X-CSRF-Token'],'token-de-teste');
    assert.equal(JSON.parse(calls[1].options.body).nome,'ONG');
    context.fetch=async()=>({ok:true,json:async()=>({ongs:[]})});
    await assert.rejects(vm.runInContext('loadData()',context),/catálogo.*incompleto/);
    assert.equal(vm.runInContext('data.ongs[0].nome',context),'ONG remota','Uma resposta inválida não pode substituir o catálogo.');
    context.fetch=async()=>({ok:false,json:async()=>({error:'CNPJ duplicado'})});
    await assert.rejects(vm.runInContext('loadData()',context),/CNPJ duplicado/);
    context.fetch=async()=>({ok:true,json:async()=>{throw Error('HTML')}});
    await assert.rejects(vm.runInContext('loadData()',context),/não retornou JSON/);
    context.fetch=async()=>{throw Error('offline')};
    await assert.rejects(vm.runInContext('loadData()',context),/conectar ao serviço PHP/);
  }
  for(const [location,expected] of [
    [{hostname:'127.0.0.1',port:'5500',pathname:'/ong-connect/index.html'},'http://127.0.0.1:8080/index.html'],
    [{hostname:'localhost',port:'5500',pathname:'/ong-connect/pages/projetos.html',search:'?ong=2',hash:'#lista'},'http://127.0.0.1:8080/pages/projetos.html?ong=2#lista'],
    [{hostname:'127.0.0.1',port:'8080',pathname:'/pages/ongs.html'},''],
    [{hostname:'exemplo.trycloudflare.com',port:'',pathname:'/pages/ongs.html'},'']
  ]){
    const context=vm.createContext({document:{addEventListener(){}},location,URLSearchParams});
    vm.runInContext(source,context);assert.equal(vm.runInContext('localPhpUrl()',context),expected);
  }
  console.log('OK: catálogo remoto, carregamento compartilhado, validação de resposta, URLs locais/públicas e erros da API.');
}
run().catch(error=>{console.error(error);process.exitCode=1});
