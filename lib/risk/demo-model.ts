import model from "../../models/credit-synthetic-v1.json";
export function evaluateDemoModel(amount:number,tenorDays:number,advancePercent:number) {
  if(![amount,tenorDays,advancePercent].every(Number.isFinite)||amount<=0||amount>1e12||tenorDays<1||tenorDays>365||advancePercent<10||advancePercent>90) throw new Error("INVALID_MODEL_FEATURES");
  const features=[Math.log10(amount),tenorDays,advancePercent];
  const contributions=model.weights.map((weight,i)=>weight*(features[i]-model.means[i])/model.scales[i]);
  const logit=model.intercept+contributions.reduce((a,b)=>a+b,0);
  return {modelVersion:model.modelVersion,datasetKind:model.datasetKind,notForProduction:model.notForProduction,index:1/(1+Math.exp(-logit)),intercept:model.intercept,contributions:contributions.map((value,i)=>({feature:model.featureNames[i],value})),outsideTrainingRange:features.some((value,i)=>value<model.ranges[i].min||value>model.ranges[i].max)};
}
