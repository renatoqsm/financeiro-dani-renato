const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1500,height:1000}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const response=await context.request.post('http://127.0.0.1:8787/api/signup',{headers:{Origin:'http://127.0.0.1:8787'},data:{username:'filters_'+Date.now(),password:'local-filters-test-123'}});
 assert.equal(response.status(),200,await response.text());
 await page.goto('http://127.0.0.1:8787');
 await page.getByRole('button',{name:/Explorar exemplo/}).click();
 await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
 await page.locator('.column-filters').waitFor();
 const rows=()=>page.locator('.transactions-table tbody tr:not(:has(.column-filter-empty))');
 const total=await rows().count();assert.ok(total>1);
 for (const label of ['Lançamento','Tipo','Banco','Situação']) assert.equal(await page.getByRole(label==='Lançamento'?'searchbox':'combobox',{name:'Filtrar '+label,exact:true}).count(),1);
 for(const label of ['Dia','Planejado','Real','Diferença']){
  assert.equal(await page.getByRole('spinbutton',{name:`Filtrar ${label}: mínimo`,exact:true}).count(),1);
  assert.equal(await page.getByRole('spinbutton',{name:`Filtrar ${label}: máximo`,exact:true}).count(),1);
 }
 for(const label of ['Tipo','Banco','Situação']){
  const select=page.getByRole('combobox',{name:'Filtrar '+label,exact:true});
  const values=await select.locator('option').evaluateAll(options=>options.map(o=>o.value).filter(Boolean));
  for(const value of values){await select.selectOption(value);assert.ok(await rows().count()>0);}
  await page.getByRole('button',{name:'Limpar filtros',exact:true}).click();assert.equal(await rows().count(),total);
 }
 await page.getByRole('searchbox',{name:'Filtrar Lançamento',exact:true}).fill('zzzz-inexistente');
 await page.getByText('Nenhum lançamento corresponde aos filtros.',{exact:false}).waitFor();
 assert.equal(await rows().count(),0);
 await page.getByRole('button',{name:'Limpar filtros',exact:true}).click();assert.equal(await rows().count(),total);
 await page.getByRole('spinbutton',{name:'Filtrar Dia: mínimo',exact:true}).fill('15');
 for(const row of await rows().all())assert.ok(Number(await row.locator('td').nth(1).textContent())>=15);
 await page.getByRole('button',{name:'Ordenar por Dia',exact:true}).click();
 assert.ok(await rows().count()>0);
 await page.getByRole('combobox',{name:'Filtrar Situação',exact:true}).selectOption('Pendente');
 for(const row of await rows().all())assert.match(await row.locator('td').nth(7).textContent(),/Pendente/);
 
 await page.getByRole('button',{name:'Limpar filtros',exact:true}).click();
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('searchbox',{name:'Filtrar Lançamento',exact:true}).fill('zzzz');
 assert.equal(await rows().count(),0);
 await page.getByRole('button',{name:'Limpar filtros',exact:true}).click();assert.equal(await rows().count(),total);
 
 assert.deepEqual(errors,[]);console.log('PASS browser: eight column controls, all dropdown options, combined filters, day range, sorting, empty state, clear, desktop and mobile; '+total+' sample rows.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
