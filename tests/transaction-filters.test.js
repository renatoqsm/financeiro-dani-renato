import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesFilters, columnValue, columns } from '../public/transaction-filters.js';
const banks = [{id:'b1',name:'Banco A'}];
const jars = [{id:'j1',name:'Viagem'}];
const item = {name:'Prestação',category:'Educação',person:'Dani',day:12,type:'expense',kind:'installment',installment:2,installments:6,bankId:'b1',plannedAmount:12345,actualAmount:13000,done:true};
test('all eight data columns participate in combined filtering',()=>{
 assert.equal(columns.length,8);
 assert.ok(matchesFilters(item,{name:'educacao',day:{min:'12',max:'12'},type:'2/6 parcelas',bank:'Banco A',plannedAmount:{min:'123,45',max:'123.45'},actualAmount:{min:'130',max:'130'},difference:{min:'-6.55',max:'-6.55'},status:'Pago'},banks,jars));
 for(const [key,filter] of Object.entries({name:'outro',day:{min:13},type:'Mensal',bank:'Sem banco informado',plannedAmount:{max:123.44},actualAmount:{min:130.01},difference:{min:0},status:'Pendente'})) assert.equal(matchesFilters(item,{[key]:filter},banks,jars),false,key);
});
test('missing real values are distinct from zero and never match numeric bounds',()=>{
 const missing={...item,actualAmount:null};
 assert.ok(matchesFilters(missing,{actualAmount:{presence:'missing'},difference:{presence:'missing'}}));
 assert.equal(matchesFilters(missing,{actualAmount:{min:0}}),false);
 assert.equal(matchesFilters(missing,{actualAmount:{presence:'present'}}),false);
 assert.ok(matchesFilters({...item,actualAmount:0},{actualAmount:{min:0,max:0,presence:'present'}}));
 assert.equal(matchesFilters(item,{day:{min:20,max:10}}),false);
 assert.ok(matchesFilters(missing,{actualAmount:{min:'',max:''}}));
});
test('display labels and secondary description match the table',()=>{
 assert.equal(columnValue({...item,bankId:''},'bank',banks),'Sem banco informado');
 assert.equal(columnValue({...item,type:'income'},'status',banks),'Recebido');
 assert.equal(columnValue({...item,done:false},'status',banks),'Pendente');
 assert.ok(matchesFilters({...item,type:'jarContribution',jarId:'j1',paymentSource:'benefit'},{name:'viagem'},banks,jars));
 assert.ok(matchesFilters({...item,paymentSource:'benefit'},{name:'beneficio'},banks,jars));
 assert.ok(matchesFilters(item,{},banks,jars));
});
