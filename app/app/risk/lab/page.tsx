import {notFound} from "next/navigation";
import {requireRole} from "@/lib/auth/session";
import {evaluateDemoModel} from "@/lib/risk/demo-model";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Button} from "@/components/ui/button";

export default async function RiskLab({searchParams}:{searchParams:Promise<{amount?:string;tenor?:string;advance?:string}>}) {
 await requireRole(["risk_officer","admin"]);
 if(process.env.INVOFIN_DEPLOYMENT_ENV==="production") notFound();
 const params=await searchParams,amount=Number(params.amount??25000000),tenor=Number(params.tenor??45),advance=Number(params.advance??80);
 let result:ReturnType<typeof evaluateDemoModel>|null=null;
 try{result=evaluateDemoModel(amount,tenor,advance);}catch{}
 return <div className="space-y-6"><div><h1 className="text-2xl font-semibold">Laboratorium model sintetis</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Eksperimen logistic regression memakai label pembayaran buatan. Indeks ini tidak mengukur risiko kredit nyata dan tidak dipakai untuk menyetujui invoice. Kontribusi linear berikut bukan SHAP.</p></div><form className="surface grid gap-4 p-5 sm:grid-cols-4"><div><Label htmlFor="lab-amount">Nominal invoice</Label><Input id="lab-amount" name="amount" type="number" min={1} max={1e12} defaultValue={amount} required/></div><div><Label htmlFor="lab-tenor">Tenor hari</Label><Input id="lab-tenor" name="tenor" type="number" min={1} max={365} defaultValue={tenor} required/></div><div><Label htmlFor="lab-advance">Advance %</Label><Input id="lab-advance" name="advance" type="number" min={10} max={90} defaultValue={advance} required/></div><Button type="submit" className="self-end">Jalankan eksperimen</Button></form>{result?<section className="surface space-y-4 p-5"><h2 className="font-semibold">Indeks eksperimen {(result.index*100).toFixed(1)} / 100</h2><p className="text-xs text-muted-foreground">Versi {result.modelVersion} · dataset sintetis · tidak untuk production</p>{result.outsideTrainingRange&&<p className="text-sm text-destructive">Input berada di luar rentang data pelatihan sintetis.</p>}<dl className="space-y-2">{result.contributions.map(x=><div className="flex justify-between gap-3" key={x.feature}><dt>{x.feature}</dt><dd>{x.value.toFixed(3)} log-odds</dd></div>)}</dl></section>:<p role="alert">Input eksperimen tidak valid.</p>}</div>;
}
