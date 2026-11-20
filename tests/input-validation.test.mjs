import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../moteur-ccr.js',import.meta.url),'utf8');
const {days360US,calculerCCR}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const grille={lignes:[[1,1,1,1000]]};
const base={categorie:1,niveau:1,degre:1,dateAffiliation:'2020-01-01',dateCessation:'2021-01-01'};
const run=overrides=>calculerCCR({...base,...overrides},grille);

test('valid Gregorian leap day is accepted',()=>{
  assert.equal(days360US('2024-02-29','2025-02-28'),360);
});
test('nonexistent calendar dates cannot silently produce coefficients',()=>{
  for(const date of ['2026-02-31','2026-13-01','0000-00-00','2020-1-1','not-a-date']){
    assert.throws(()=>run({dateAffiliation:date}),RangeError);
  }
});
test('reversed contract dates cannot produce negative pension service',()=>{
  assert.throws(()=>run({dateAffiliation:'2021-01-02',dateCessation:'2020-01-01'}),RangeError);
});
test('negative and fractional dependents are rejected',()=>{
  for(const val of [-1,1.2,Number.NaN,'invalid',Infinity]){
    assert.throws(()=>run({enfantsPlus16:val}),RangeError);
  }
});
test('negative deductions and nonnumeric amounts cannot leak NaN into output',()=>{
  for(const val of [-20,Infinity,'wrong','']){
    assert.throws(()=>run({retenueCFC:val}),RangeError);
  }
});
test('invalid grade salary cannot silently create invalid net',()=>{
  assert.throws(()=>calculerCCR({...base},{lignes:[[1,1,1,'wrong']]}),RangeError);
  assert.throws(()=>calculerCCR({...base},{lignes:[[1,1,1,-1000]]}),RangeError);
});
test('valid synthetic service input still computes finite results',()=>{
  const result=run({enfantsPlus16:1,retenueCFC:20,personnesCharge:2});
  assert.equal(result.rgbMensuel,1000);
  assert.ok(Number.isFinite(result.netMensuel));
  assert.ok(Number.isFinite(result.igrTrimestriel));
});
