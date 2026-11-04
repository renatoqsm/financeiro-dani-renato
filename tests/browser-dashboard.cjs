const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    const base='http://127.0.0.1:8787';
    const post=await context.request.post(base+'/api/signup',{headers:{Origin:base},data:{username:'dashboard_'+Date.now(),password:'local-dashboard-test-123'}});
    assert.equal(post.status(),200,await post.text());
    const record=(id,name,type,amount,category,extra={})=>({id,name,type,amount,category,kind:'recurring',startMonth:'2026-11',endMonth:'',day:5,person:'Família',variable:false,benefit:false,paymentSource:'cash',installments:1,paidInstallments:0,...extra});
    const data={version:1,budgetMigrationDone:true,monthCycle:{activeMonth:'2026-11',closedMonths:[]},accountOpeningBalances:{'2026-11':7000},banks:[],records:[
      record('salary','Salário','income',100000,'Salário'),
      record('benefit','Vale','income',20000,'Benefícios',{benefit:true}),
      record('house','Casa','expense',30000,'Casa'),
      record('fuel','Combustível','expense',8000,'Combustível'),
      record('valeexpense','Gasto no vale','expense',4000,'Vale',{paymentSource:'benefit'}),
      record('deposit','Aporte','jarContribution',5000,'Caixinhas',{jarId:'jar'}),
    ],overrides:{'fuel:2026-11':{amount:5000,done:true},'salary:2026-11':{done:true}},
    budgets:[
      {id:'foodbudget',category:'Alimentação',amount:15000,startMonth:'2026-11',endMonth:'',limits:{},paymentSource:'cash'},
      {id:'fuelbudget',category:'Combustível',amount:20000,startMonth:'2026-11',endMonth:'',limits:{},paymentSource:'cash'},
      {id:'valebudget',category:'Vale',amount:6000,startMonth:'2026-11',endMonth:'',limits:{},paymentSource:'benefit'},
    ],jars:[{id:'jar',name:'Reserva',bank:'',initialBalance:100000,monthlyDeposit:10000,rate:0,goal:0,startMonth:'2026-11',movements:[{id:'extra',month:'2026-11',amount:2000},{id:'withdraw',month:'2026-11',amount:-3000}]}]};
    let revision=0;
    async function save(){
      const r=await context.request.put(base+'/api/data',{headers:{Origin:base},data:{data,revision}});
      assert.equal(r.status(),200,await r.text());revision=(await r.json()).revision;
    }
    await save();
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base);
    const amount=async title=>{const text=await page.locator('.metric').filter({has:page.locator('.metric-top > span:first-child',{hasText:title})}).locator('.metric-value').textContent();return Number(text.replace(/[^0-9,-]/g,'').replace(',','.'));};
    await page.getByText('Saídas previstas',{exact:true}).waitFor();
    assert.equal(await amount('Saídas previstas'),820);
    assert.equal(await amount('Aportes previstos'),170);
    assert.equal(await amount('Entradas em dinheiro'),1000);
    assert.equal(await amount('Saldo na conta'),1030);
    const result=()=>page.locator('.monthly-plan-value').textContent();
    assert.match(await result(),/210,00/);
    await page.getByText('Ver composição da previsão',{exact:true}).click();
    assert.match(await page.locator('.monthly-plan-breakdown').textContent(),/Orçamento ainda não utilizado.*300,00/);
    await page.screenshot({path:'/tmp/dashboard-planning-desktop.png',fullPage:true});
    data.budgets[0].amount=25000;await save();await page.reload();
    await page.getByText('Saídas previstas',{exact:true}).waitFor();
    assert.equal(await amount('Saídas previstas'),920);assert.match(await result(),/110,00/);
    data.overrides['fuel:2026-11'].amount=9000;await save();await page.reload();
    await page.getByText('Saídas previstas',{exact:true}).waitFor();
    assert.equal(await amount('Saídas previstas'),920);
    await page.setViewportSize({width:390,height:844});
    await page.locator('.monthly-plan').scrollIntoViewIfNeeded();
    const box=await page.locator('.monthly-plan').boundingBox();assert.ok(box.x>=0 && box.x+box.width<=390);
    await page.screenshot({path:'/tmp/dashboard-planning-mobile.png',fullPage:true});
    await page.getByRole('button',{name:'Próximo mês',exact:true}).click();
    assert.equal(await amount('Saídas previstas'),900);
    assert.equal(await amount('Aportes previstos'),150);
    assert.match(await result(),/100,00/);
    assert.deepEqual(errors,[]);
    console.log('PASS dashboard: cash expenses, remaining budgets, gross deposits, withdrawals, benefits separated, live budget edits, no double counting, account balance preserved, desktop/mobile.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1)});
