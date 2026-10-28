/* Segmentos: gerenciamento exclusivo do administrador geral. */
document.addEventListener('DOMContentLoaded',async()=>{
 const panel=document.querySelector('#segments-panel');if(!panel)return;
 try{
  const session=await getSession();if(session.usuario?.perfil!=='admin')return;
  panel.hidden=false;const form=panel.querySelector('form'),message=panel.querySelector('[role=status]'),list=panel.querySelector('#segments-list');let items=[],busy=false;
  async function refresh(){items=(await apiRequest('segmentos')).segmentos;data.segmentos=items;list.replaceChildren();
   for(const item of items){const row=document.createElement('div');row.className='segment-row';
    const name=document.createElement('span');name.textContent=item.nome+(Number(item.ativo)?'':' (desativado)');
    const actions=document.createElement('div');actions.className='inline-actions';
    const edit=document.createElement('button');edit.type='button';edit.className='btn btn-sm btn-outline';edit.textContent='Editar';edit.onclick=()=>{form.elements.id.value=item.id;form.elements.nome.value=item.nome;form.elements.ativo.checked=!!Number(item.ativo);form.elements.nome.focus()};actions.append(edit);row.append(name,actions);list.append(row);
   }
  }
  form.querySelector('[data-reset-segment]').onclick=()=>form.reset();
  form.onsubmit=async event=>{event.preventDefault();if(busy||!form.reportValidity())return;busy=true;const button=form.querySelector('[type=submit]');button.disabled=true;message.textContent='';
   try{const id=Number(form.elements.id.value)||undefined;await apiRequest('segmentos',id?'PUT':'POST',{nome:form.elements.nome.value,ativo:form.elements.ativo.checked},id);form.reset();await refresh();await loadData();document.querySelector('#reload-mvp')?.click();message.textContent='Segmento salvo.';}catch(error){message.textContent=error.message}finally{busy=false;button.disabled=false}
  };
  await refresh();
 }catch(error){panel.hidden=false;panel.textContent=error.message}
});
