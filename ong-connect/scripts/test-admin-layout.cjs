const assert=require('node:assert/strict');const pause=ms=>new Promise(r=>setTimeout(r,ms));
module.exports=async(c,base)=>{
 for(const page of ['repasses-publicos','auditoria']){
  await c.send('Page.navigate',{url:base+'/dashboard/'+page+'.html'});await pause(1200);
  assert.equal(await c.evaluate(`document.querySelectorAll('.sidebar nav a[href="${page}.html"]').length`),1);
  assert.equal(await c.evaluate(`document.querySelector('.sidebar nav a[href="${page}.html"]').getAttribute('aria-current')`),'page');
  assert.equal(await c.evaluate(`!document.querySelector('h1 .admin-page-icon')&&!!document.querySelector('#account-trigger')`),true);
  assert.equal(await c.evaluate(`(()=>{const links=[...document.querySelectorAll('.sidebar nav a')];return links.length===8&&links.every(a=>a.querySelector('.admin-nav-icon svg')&&a.querySelector('.admin-nav-label'))&&new Set(links.map(a=>getComputedStyle(a).font)).size===1})()`),true);
  await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await pause(300);
  await c.evaluate(`document.querySelector('#dashboard-menu-toggle').click()`);
  assert.equal(await c.evaluate(`document.querySelector('#dashboard-menu-toggle').getAttribute('aria-expanded')`),'true');
  assert.equal(await c.evaluate(`document.querySelector('.sidebar nav a[href="${page}.html"]').getClientRects().length>0`),true);
  await c.evaluate(`document.querySelector('.dash-main h1').click()`);
  assert.equal(await c.evaluate(`document.querySelector('#dashboard-menu-toggle').getAttribute('aria-expanded')`),'false');
  assert.equal(await c.evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
  await c.send('Emulation.clearDeviceMetricsOverride');
 }
 console.log('PASS repasses e auditoria com menu, ícones, página ativa e navegação mobile');
};
