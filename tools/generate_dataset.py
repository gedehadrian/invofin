"""Deterministic, explicitly synthetic document families. Never uses customer documents."""
import argparse, hashlib, json, random, shutil, subprocess
from datetime import date, timedelta
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

ROOT = Path(__file__).resolve().parents[1]
KINDS = {'invoice':'INVOICE', 'purchase_order':'PURCHASE ORDER', 'bast':'BERITA ACARA SERAH TERIMA'}

def labels(index, kind):
    issue = date(2026, 11, 1) + timedelta(days=index)
    quantity, price = 5 + index, 125000 + index * 25000
    amount = quantity * price
    scenario = ['consistent','amount_mismatch','reference_mismatch'][index % 3]
    reference = f'PO-SYN-{index+1:04}'
    if scenario == 'amount_mismatch' and kind == 'purchase_order': amount += price
    if scenario == 'reference_mismatch' and kind == 'bast': reference += '-OTHER'
    return dict(invoiceNumber=f'SYN-2026-{index+1:04}', vendorName=f'Vendor Sintetis {index+1}', buyerName=f'Buyer Sintetis {index%3+1}', amount=amount,
                issueDate=issue.isoformat(), dueDate=(issue+timedelta(days=45)).isoformat(), purchaseOrder=reference,
                documentNumber=f'{kind.upper()}-SYN-{index+1:04}', items=[dict(description='Komponen kemasan sintetis',quantity=quantity,unitPrice=price,amount=amount)]), scenario

def write_pdf(path, expected, kind, family):
    c=canvas.Canvas(str(path),pagesize=A4,invariant=1)
    c.setTitle('InvoFin synthetic '+kind)
    font=['Helvetica','Times-Roman','Courier'][family]
    c.setFont(font,20); c.setFillColorRGB(.12,.30,.70); c.drawString(44,795,KINDS[kind])
    c.setFont(font,9); c.setFillColorRGB(.25,.28,.34)
    c.drawString(44,773,'SYNTHETIC / DATA FIKTIF / TANPA TRANSAKSI NYATA')
    rows=[('Document number',expected['documentNumber']),('Invoice number',expected['invoiceNumber']),('Purchase order',expected['purchaseOrder']),
          ('Vendor / Supplier',expected['vendorName']),('Buyer / Bill to',expected['buyerName']),('Issue date',expected['issueDate']),('Due date',expected['dueDate'])]
    y=727
    for key,value in rows:
        c.setFont(font,11);c.drawString(44,y,key+':');c.drawString(215 if family!=1 else 240,y,value);y-=30
    c.line(44,y,550,y);y-=35
    item=expected['items'][0]
    c.drawString(44,y,item['description']);y-=25
    c.drawString(44,y,f"Quantity: {item['quantity']}    Unit price: IDR {item['unitPrice']:,}");y-=40
    c.setFont(font,15);c.drawString(44,y,f"Total: IDR {expected['amount']:,}.00")
    if kind=='bast':c.setFont(font,10);c.drawString(44,y-45,'Barang pada purchase order telah diserahterimakan (simulasi).')
    c.setFont(font,8);c.drawString(44,40,'Seluruh nama, nilai dan dokumen dibuat untuk pengujian InvoFin.')
    c.showPage();c.save()

def generate(output, renderer, seed=42, sources=12):
    output=Path(output).resolve()
    if not output.is_relative_to(ROOT):raise ValueError('Output must stay inside project.')
    if sources<3 or sources>90:raise ValueError('Use 3-90 sources.')
    output.mkdir(parents=True,exist_ok=True)
    cases=[]
    for index in range(sources):
        family=index%3; split=['train','validation','test'][family]
        for kind in KINDS:
            expected,scenario=labels(index,kind);name=f'source-{index:03}-{kind}'
            pdf=output/(name+'.pdf');write_pdf(pdf,expected,kind,family)
            subprocess.run([renderer,'-f','1','-l','1','-singlefile','-scale-to','1100','-png',str(pdf),str(output/name)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            image=Image.open(output/(name+'.png')).convert('RGB')
            variants=[('pdf',pdf,{}),('scan',output/(name+'.png'),{'scaleTo':1100})]
            for augmentation in ['rotate','blur-noise']:
                path=output/(name+'-'+augmentation+'.png')
                rng=random.Random(f'{seed}:{index}:{kind}:{augmentation}')
                if augmentation=='rotate':
                    params={'degrees':2};changed=image.rotate(2,resample=Image.Resampling.BICUBIC,expand=True,fillcolor='white')
                else:
                    params={'blurRadius':.65,'contrast':.8,'noiseAlpha':.04}
                    noise=Image.frombytes('L',image.size,rng.randbytes(image.width*image.height)).convert('RGB')
                    changed=Image.blend(ImageEnhance.Contrast(image.filter(ImageFilter.GaussianBlur(.65))).enhance(.8),noise,.04)
                changed.save(path);variants.append((augmentation,path,params))
            for augmentation,path,params in variants:
                cases.append(dict(id=name+'-'+augmentation,sourceId=f'source-{index:03}',familyId=f'template-{family}',split=split,documentType=kind,
                  scenario=scenario,screeningExpected='consistent' if scenario=='consistent' else 'review',augmentation={'name':augmentation,'seed':seed,'parameters':params},
                  file=path.relative_to(ROOT).as_posix(),mimeType='application/pdf' if path.suffix=='.pdf' else 'image/png',sha256=hashlib.sha256(path.read_bytes()).hexdigest(),expected=expected))
    manifest=dict(schemaVersion=2,datasetVersion='synthetic-documents-v1',datasetKind='synthetic',seed=seed,labelOrigin='generator-before-augmentation',cases=cases)
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    return manifest

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',default='evaluation/generated/documents-v1');p.add_argument('--pdftoppm',default=shutil.which('pdftoppm'));p.add_argument('--seed',type=int,default=42);p.add_argument('--sources',type=int,default=12)
    a=p.parse_args()
    if not a.pdftoppm:p.error('Install Poppler or pass --pdftoppm.')
    m=generate(ROOT/a.output,a.pdftoppm,a.seed,a.sources)
    print(json.dumps({'datasetVersion':m['datasetVersion'],'sources':a.sources,'cases':len(m['cases']),'manifest':a.output+'/manifest.json'}))
