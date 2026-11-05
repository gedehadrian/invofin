import assert from "node:assert/strict";
import {test} from "node:test";
import {evaluateDemoModel} from "./demo-model";
test("synthetic model contributions exactly explain its log-odds and invalid inputs are rejected",()=>{
 const result=evaluateDemoModel(25000000,45,80);
 assert.equal(result.datasetKind,"synthetic");assert.equal(result.notForProduction,true);
 const logit=result.intercept+result.contributions.reduce((sum,x)=>sum+x.value,0);
 assert.ok(Math.abs(1/(1+Math.exp(-logit))-result.index)<1e-12);
 assert.throws(()=>evaluateDemoModel(-1,45,80));assert.throws(()=>evaluateDemoModel(1000,Infinity,80));
});
