const fs=require('node:fs');const pause=ms=>new Promise(r=>setTimeout(r,ms));
module.exports=async(c,base)=>{
 await c.send('Network.enable');const results=[];
 for(const route of ['dashboard/projetos.html','dashboard/ongs.html','dashboard/relatorios.html','dashboard/repasses-publicos.html','dashboard/auditoria.html','pages/projetos.html','pages/transparencia.html']){
  await c.send('Page.navigate',{url:base+'/'+route});await pause(1800);
  const row=await c.evaluate(`(()=>{const nav=performance.getEntriesByType('navigation')[0],requests=performance.getEntriesByType('resource');return {page:location.pathname,ttfb:Math.round(nav.responseStart),domReady:Math.round(nav.domContentLoadedEventEnd),load:Math.round(nav.loadEventEnd),firstContentfulPaint:Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime||0),api:requests.filter(r=>r.name.includes('/api/')).map(r=>({resource:new URL(r.name).searchParams.get('resource'),start:Math.round(r.startTime),ms:Math.round(r.duration),bytes:r.decodedBodySize})),resources:requests.length,bytes:requests.reduce((n,r)=>n+r.decodedBodySize,0)}})()`);
  results.push(row);console.log(JSON.stringify(row));
 }
 fs.writeFileSync('.runtime/performance-scan.json',JSON.stringify(results,null,2));
};
