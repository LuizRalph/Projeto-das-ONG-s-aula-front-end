/* Carga opcional de candidaturas fictícias, exclusivamente no navegador. */
window.VolunteerScenarios=(()=>{
  const tag='lista-espera-v1';
  function build(current,opportunities,{reset=false,now=new Date().toISOString()}={}){
    const existing=current.filter(record=>record.demoDataset===tag);
    if(existing.length&&!reset)return{records:current,inserted:0};
    const records=reset?current.filter(record=>record.demoDataset!==tag):[...current];
    const approved=id=>records.filter(record=>Number(record.oportunidadeId)===Number(id)&&record.status==='Aprovado').length;
    const options=opportunities.filter(item=>Number.isInteger(Number(item.vagas))&&item.vagas>0&&item.vagas<=50);
    const lastSlot=options.find(item=>Number(item.vagas)>approved(item.id));
    const full=options.find(item=>item.id!==lastSlot?.id&&Number(item.vagas)>=approved(item.id));
    if(!lastSlot||!full)throw Error('É necessário ter duas oportunidades de até 50 vagas, com ao menos uma vaga livre em uma delas. Nenhum dado foi alterado.');
    let inserted=0;
    function add(opportunity,scenario,status,ordinal){
      const suffix=`${scenario}-${ordinal}`;
      const labels={'ultima-vaga':'Última vaga','lotada':'Oportunidade lotada'};
      records.push({
        id:`teste-espera-${suffix}`,demoDataset:tag,demoCenario:scenario,
        oportunidadeId:Number(opportunity.id),nome:`Teste ${labels[scenario]} ${String(ordinal).padStart(2,'0')}`,
        email:`teste.${suffix}@example.com`,telefone:'11999990000',nascimento:'2000-01-15',
        cidade:'Cidade fictícia',estado:'SP',disponibilidade:'Conforme agenda da oportunidade',
        experiencia:'Dados fictícios para teste',habilidades:'Apoio comunitário',motivacao:'Testar o fluxo de aprovação e lista de espera.',
        consentimento:true,data:now,status,
        agendaDias:diasOportunidade(opportunity),agendaInicio:opportunity.horarioInicio||'00:00',agendaFim:opportunity.horarioFim||'23:59',
        historico:[{statusAnterior:'',status,responsavel:'Carga de testes',justificativa:'Candidatura fictícia preparada para testar a lista de espera.',data:now}]
      });inserted++;
    }
    let ordinal=1;
    const fillLast=Math.max(0,Number(lastSlot.vagas)-approved(lastSlot.id)-1);
    for(let i=0;i<fillLast;i++)add(lastSlot,'ultima-vaga','Aprovado',ordinal++);
    for(let i=0;i<3;i++)add(lastSlot,'ultima-vaga','Pendente',ordinal++);
    ordinal=1;
    const fillFull=Math.max(0,Number(full.vagas)-approved(full.id));
    for(let i=0;i<fillFull;i++)add(full,'lotada','Aprovado',ordinal++);
    for(let i=0;i<2;i++)add(full,'lotada','Lista de espera',ordinal++);
    return{records,inserted};
  }
  function init(){
    if(!document.querySelector('#admin-volunteers')||!data.oportunidades)return;
    try{
      const result=build(candidaturas(),data.oportunidades);
      if(result.inserted)store.set('candidaturas',result.records);
      const firstView=!store.get('volunteer_examples_direct_list_v1',false);
      const explicit=new URLSearchParams(location.search).get('teste')==='lista-espera';
      document.dispatchEvent(new CustomEvent('ong:volunteer-test-data',{detail:{resetFilters:result.inserted>0||firstView||explicit}}));
      store.set('volunteer_examples_direct_list_v1',true);
    }catch(error){toast(error.message,true)}
  }
  return{build,init,tag};
})();
