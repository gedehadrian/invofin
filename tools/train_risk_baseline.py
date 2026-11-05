"""Local experiment only: supervised logistic baseline with provenance and holdout checks."""
import argparse,csv,hashlib,json,math,random
from datetime import date,timedelta
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
FEATURES=['amountLog10','tenorDays','advancePercent']
def synthetic(seed=42):
 r=random.Random(seed);rows=[]
 for group in range(60):
  split='train' if group<36 else 'validation' if group<48 else 'test'
  for n in range(10):
   amount=round(10**r.uniform(5,8),2);tenor=r.randint(15,150);advance=r.randint(40,90)
   p=1/(1+math.exp(-(-2.2+.7*(math.log10(amount)-6)+.012*(tenor-45)+.025*(advance-60))))
   rows.append(dict(group_id=f'synthetic-{group:03}',as_of_date=(date(2025,1,1)+timedelta(days=group*10+n)).isoformat(),split=split,amount=amount,tenor_days=tenor,advance_percent=advance,label=int(r.random()<p)))
 return rows
def validate(rows):
 groups={};dates={s:[] for s in ['train','validation','test']}
 for row in rows:
  split=row['split'];assert split in dates,'Invalid split'
  group=row['group_id'];assert group,'Missing group lineage'
  assert group not in groups or groups[group]==split,'Group leakage';groups[group]=split
  dates[split].append(date.fromisoformat(row['as_of_date']))
  for field in ['amount','tenor_days','advance_percent']:assert math.isfinite(float(row[field])),'Nonfinite feature'
  assert 0<float(row['amount'])<=1e12 and 1<=float(row['tenor_days'])<=365 and 10<=float(row['advance_percent'])<=90,'Unsupported feature range'
  assert str(row['label']) in ['0','1'],'Label must be observed binary outcome'
 for split in dates:
  assert len(dates[split])>=20,'At least 20 rows per split required'
  assert len({int(x['label']) for x in rows if x['split']==split})==2,'Both labels required in each split'
 assert max(dates['train'])<min(dates['validation']) and max(dates['validation'])<min(dates['test']),'Temporal leakage'
def features(row):return [math.log10(float(row['amount'])),float(row['tenor_days']),float(row['advance_percent'])]
def sigmoid(value):return 1/(1+math.exp(-max(-40,min(40,value))))
def metrics(rows,means,scales,w,b):
 scores=[sigmoid(b+sum(a*(x-m)/s for a,x,m,s in zip(w,features(row),means,scales))) for row in rows];ys=[int(row['label']) for row in rows]
 positive=[s for s,y in zip(scores,ys) if y];negative=[s for s,y in zip(scores,ys) if not y]
 tp=sum(y==1 and s>=.5 for s,y in zip(scores,ys));fp=sum(y==0 and s>=.5 for s,y in zip(scores,ys));fn=sum(y==1 and s<.5 for s,y in zip(scores,ys))
 return dict(rows=len(rows),auc=sum((p>n)+.5*(p==n) for p in positive for n in negative)/(len(positive)*len(negative)),brier=sum((s-y)**2 for s,y in zip(scores,ys))/len(rows),precision=tp/max(1,tp+fp),recall=tp/max(1,tp+fn))
def train(rows,kind,version):
 validate(rows);parts={s:[r for r in rows if r['split']==s] for s in ['train','validation','test']};xs=[features(r) for r in parts['train']];n=len(xs)
 means=[sum(x[i] for x in xs)/n for i in range(3)];scales=[math.sqrt(sum((x[i]-means[i])**2 for x in xs)/n) or 1 for i in range(3)]
 zs=[[(x-m)/s for x,m,s in zip(row,means,scales)] for row in xs];ys=[int(r['label']) for r in parts['train']];w=[0.0]*3;b=0.0
 for _ in range(800):
  errors=[sigmoid(b+sum(a*x for a,x in zip(w,z)))-y for z,y in zip(zs,ys)];b-=.08*sum(errors)/n
  w=[a-.08*(sum(e*z[i] for e,z in zip(errors,zs))/n+.01*a) for i,a in enumerate(w)]
 return dict(schemaVersion=1,modelVersion=version,datasetKind=kind,notForProduction=True,algorithm='logistic-regression-l2',featureNames=FEATURES,means=means,scales=scales,weights=w,intercept=b,
  ranges=[dict(min=min(x[i] for x in xs),max=max(x[i] for x in xs)) for i in range(3)],trainingCodeSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),datasetSha256=hashlib.sha256(json.dumps(rows,sort_keys=True).encode()).hexdigest(),metrics={s:metrics(part,means,scales,w,b) for s,part in parts.items()})
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--input');p.add_argument('--dataset-kind',choices=['synthetic','representative'],default='synthetic');p.add_argument('--version',default='credit-synthetic-logistic-v1');p.add_argument('--output',default='models/credit-synthetic-v1.json');p.add_argument('--consented',action='store_true');a=p.parse_args()
 out=(ROOT/a.output).resolve();assert out.is_relative_to(ROOT),'Output outside project'
 if a.dataset_kind=='representative':
  assert a.input and a.consented,'Representative data requires explicit --input and --consented'
  assert out.is_relative_to(ROOT/'evaluation/private'),'Representative artifacts must stay in ignored private storage'
  src=(ROOT/a.input).resolve();assert src.is_relative_to(ROOT/'evaluation/private'),'Keep representative data private'
  with src.open(newline='',encoding='utf-8') as f:rows=list(csv.DictReader(f))
 else:
  assert not a.input,'Synthetic training uses generated labels, not external files';rows=synthetic()
 model=train(rows,a.dataset_kind,a.version);payload=json.dumps(model,indent=2,sort_keys=True)+'\n'
 if out.exists() and out.read_text()!=payload:raise ValueError('Use a new artifact path/version; existing model is immutable')
 out.parent.mkdir(parents=True,exist_ok=True);out.write_text(payload,encoding='utf-8')
 print(json.dumps({'modelVersion':model['modelVersion'],'datasetKind':model['datasetKind'],'notForProduction':True,'metrics':model['metrics']}))
