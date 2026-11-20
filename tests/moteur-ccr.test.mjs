import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../moteur-ccr.js',import.meta.url),'utf8');
const {days360US,baremeIGR2010,calculerCCR}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('30/360: one full year is 360 days',()=>{
  assert.equal(days360US('2025-01-01','2026-01-01'),360);
});
test('2010 tax brackets at documented thresholds',()=>{
  assert.deepEqual(baremeIGR2010(2500),{taux:0,deduction:0});
  assert.deepEqual(baremeIGR2010(4066.66),{taux:0.10,deduction:250});
  assert.deepEqual(baremeIGR2010(4800),{taux:0.20,deduction:666.67});
});
test('synthetic salary grade yields finite results',()=>{
  const grille={lignes:[[1,1,1,1000]]};
  const r=calculerCCR({categorie:1,niveau:1,degre:1,dateAffiliation:'2020-01-01',dateCessation:'2021-01-01'},grille);
  assert.equal(r.rgbMensuel,1000);
  assert.ok(Number.isFinite(r.netTrimestriel));
  assert.ok(Array.isArray(r.avertissements)&&r.avertissements.length>0);
});
test('missing salary classification is rejected',()=>{
  assert.throws(()=>calculerCCR({categorie:999,niveau:1,degre:1},{lignes:[]}),/absente ou ambigu/);
});
