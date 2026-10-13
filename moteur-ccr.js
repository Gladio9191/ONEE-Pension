/** ONEE Pension — portage expérimental des formules documentées, sans modernisation. */
export function days360US(start, end) {
  const [y1,m1,d1raw]=start.split('-').map(Number), [y2,m2,d2raw]=end.split('-').map(Number);
  const lastFeb=(y,m,d)=>m===2&&d===new Date(y,2,0).getDate();
  let d1=d1raw,d2=d2raw;
  if(lastFeb(y1,m1,d1))d1=30;
  if(lastFeb(y2,m2,d2)&&lastFeb(y1,m1,d1raw))d2=30;
  if(d1===31)d1=30;
  if(d2===31&&d1>=30)d2=30;
  return (y2-y1)*360+(m2-m1)*30+(d2-d1);
}
const excelMin=(x,max)=>Math.min(x,max);
/** Reproduction littérale des paliers W10/W11 du classeur, y compris le trou 12800–12800.01. */
export function baremeIGR2010(assietteMensuelle) {
  const x=assietteMensuelle;
  if(x<=2500)return {taux:0,deduction:0};
  if(x<=4066.66)return {taux:0.10,deduction:250};
  if(x<=4800)return {taux:0.20,deduction:666.67};
  if(x<=6166.67)return {taux:0.30,deduction:1166.67};
  if(x<=12800)return {taux:0.34,deduction:1433.34};
  if(x>=12800.01)return {taux:0.38,deduction:2033.34};
  // Excel: dernier IF sans value_if_false => FALSE, coercition numérique 0.
  return {taux:0,deduction:0};
}
export function calculerCCR(entree, grille) {
  const {categorie,niveau,degre,dateAffiliation,dateCessation,sexe='M',enfantsPlus16=0,enfantsMoins21=0,enfantsScolarises=0,veuves=0,personnesCharge=0,autresChargesFiscales=0,retenueCFC=0,retenueASGD=0,donsLegs=0,avantageNature=0}=entree;
  // La grille brute HL:HO ne reproduit pas toujours SUMIF sur HS contenant des espaces.
  // Les catégories concernées restent à valider dans Excel avant publication.
  const lignes=grille.lignes.filter(r=>r[0]===+categorie&&r[1]===+niveau&&r[2]===+degre);
  if(lignes.length!==1)throw new Error('Clé de classement absente ou ambiguë');
  const rgbMensuel=lignes[0][3], rgbTrimestriel=rgbMensuel*3;
  const jours360=days360US(dateAffiliation,dateCessation);
  const coeffBrut=jours360*0.025/360+0.0002;
  const majoration=Math.min(+enfantsPlus16,5)*0.05;
  const somme=coeffBrut*(1+majoration);
  const coeffA=somme>1?coeffBrut/somme:coeffBrut;
  const coeffB=somme>1?coeffBrut*majoration/somme:coeffBrut*majoration;
  const pensionAgent=+veuves>0?0:rgbTrimestriel*coeffA;
  const pensionEnfants=+veuves>0?0:String(sexe).toLowerCase()==='f'?0:rgbTrimestriel*coeffB;
  const coeffR=+veuves===0?0:0.5/+veuves;
  const coeffN=+veuves===0?0:Math.min(+enfantsMoins21,5)*0.1;
  const pensionReversion=+veuves===0?0:rgbTrimestriel*coeffA*(coeffR+coeffN);
  const pensionReversionEnfants=+veuves===0?0:rgbTrimestriel*coeffB*(coeffR+coeffN);
  const t9=+veuves>0?pensionReversion:pensionAgent;
  const t10=+veuves>0?pensionReversionEnfants:pensionEnfants;
  // GU8/GU9: retenues plafonnées; GV6 et GU10 nécessitent vérification pour les autres scénarios.
  const allocations=[0,600,1200,1800,1908,2016,2124][Math.min(6,Math.max(0,+enfantsScolarises))];
  const gv6=t9+t10; // T11 = SUM(T9:T10), GV6 = T11
  const cmss=Math.min(gv6*0.0333,849.82)+allocations*0.0333; // GU8+GU10
  const cmcas=Math.min(gv6*0.0225,574.21)+allocations*0.0225; // GU9+GU11
  const soldeTaxable=t9-cmss-cmcas-retenueCFC-retenueASGD-donsLegs+avantageNature;
  const soldeNonTaxable=t10+allocations;
  const netTrimestriel=soldeTaxable+soldeNonTaxable;
  // W4:X11, W12, W13 : portage strict du barème IR 2010.
  // AC4 (X6) est une cellule d'entrée vide/0 dans le classeur d'origine.
  const x4=t9*0.6;
  const x5=cmss+cmcas+retenueASGD+donsLegs-avantageNature+retenueCFC;
  const x6=+autresChargesFiscales;
  const x7=x4-x5+x6;
  const w9=x7/3;
  const {taux,deduction}=baremeIGR2010(w9);
  const x10=w9*taux;
  const x11=x10-deduction;
  const w12=x11/(1-(0.6*taux));
  const chargesFamille=3*(+personnesCharge)*30;
  const igrTrimestriel=w12*3-chargesFamille;
  return {rgbMensuel,rgbTrimestriel,jours360,coeffA,coeffB,pensionAgent,pensionEnfants,pensionReversion,pensionReversionEnfants,cmss,cmcas,allocations,soldeTaxable,soldeNonTaxable,netTrimestriel,netMensuel:netTrimestriel/3,igrTrimestriel,assietteIGRMensuelle:w9,tauxIGR:taux,deductionIGR:deduction,chargesFamille, avertissements:['IGR reproduit avec AC4=0 par défaut (modifiable via autresChargesFiscales); validation multi-scénarios requise','Retenues et allocations : calcul partiel à valider sur scénarios multiples','SUMIF original sur clés texte : certains classements peuvent retourner 0 dans Excel']};
}
