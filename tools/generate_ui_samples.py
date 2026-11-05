"""Public fictional example for the prototype identities; not part of evaluation holdout."""
import json,shutil,subprocess,argparse
from pathlib import Path
from generate_dataset import ROOT,KINDS,labels,write_pdf
p=argparse.ArgumentParser();p.add_argument('--pdftoppm',default=shutil.which('pdftoppm'));a=p.parse_args()
if not a.pdftoppm:p.error('Install Poppler or pass --pdftoppm')
tmp=ROOT/'evaluation/generated/ui-samples';tmp.mkdir(parents=True,exist_ok=True)
for kind in KINDS:
 expected,_=labels(0,kind);expected.update(vendorName='Integration vendor',buyerName='Integration buyer')
 expected['documentNumber']=expected['invoiceNumber'] if kind=='invoice' else expected['purchaseOrder'] if kind=='purchase_order' else 'BAST-SYN-0001'
 pdf=tmp/(kind+'.pdf');write_pdf(pdf,expected,kind,0)
 subprocess.run([a.pdftoppm,'-singlefile','-scale-to','1400','-png',str(pdf),str(ROOT/'public/demo'/('sample-'+kind))],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 if kind=='invoice':(ROOT/'lib/documents/demo-sample.json').write_text(json.dumps(expected,indent=2)+'\n',encoding='utf-8')
print('Three public synthetic PNG samples and their form metadata generated.')
