import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeDashboard } from '../public/dashboard-summary.js';
const base = { income:100000, cashExpenses:35000, cashReserve:30000, contributions:14000 };
const data = {jars:[{movements:[{month:'2026-11',amount:2000},{month:'2026-11',amount:-3000},{month:'2026-10',amount:-90000}]}]};
test('cash outflow includes registered bills, remaining budgets and gross deposits once',()=>{
 const result = summarizeDashboard(base,data,'2026-11');
 assert.deepEqual(result,{income:100000,registeredExpenses:35000,remainingBudgets:30000,plannedExpenses:65000,plannedContributions:17000,withdrawals:3000,plannedOutflow:82000,projectedResult:21000});
 assert.equal(result.projectedResult,base.income-base.cashExpenses-base.cashReserve-base.contributions);
});
test('using a budget does not count the same expense twice',()=>{
 const before=summarizeDashboard({...base,cashExpenses:0,cashReserve:20000,contributions:0},{jars:[]},'2026-11');
 const after=summarizeDashboard({...base,cashExpenses:5000,cashReserve:15000,contributions:0},{jars:[]},'2026-11');
 assert.equal(before.plannedOutflow,20000);assert.equal(after.plannedOutflow,20000);
 const over=summarizeDashboard({...base,cashExpenses:22000,cashReserve:0,contributions:0},{jars:[]},'2026-11');
 assert.equal(over.plannedOutflow,22000);
});
test('withdrawals never reduce deposit total or become negative outflow',()=>{
 const result=summarizeDashboard({income:0,cashExpenses:0,cashReserve:0,contributions:-3000},data,'2026-11');
 assert.equal(result.plannedContributions,0);assert.equal(result.plannedOutflow,0);assert.equal(result.projectedResult,3000);
});
test('benefits, accumulated savings and opening balance are not treated as cash income or outflow',()=>{
 const result=summarizeDashboard({...base,benefits:90000,benefitReserve:80000,expensesTotal:70000,savings:900000,openingBalance:50000},data,'2026-11');
 assert.equal(result.income,100000);assert.equal(result.plannedOutflow,82000);assert.equal(result.projectedResult,21000);
});
test('empty month and a deficit are represented without clamping',()=>{
 const empty={income:0,cashExpenses:0,cashReserve:0,contributions:0};
 assert.equal(summarizeDashboard(empty,{jars:[]},'2026-11').projectedResult,0);
 assert.equal(summarizeDashboard({...empty,cashReserve:20000,contributions:5000},{jars:[]},'2026-11').projectedResult,-25000);
});
