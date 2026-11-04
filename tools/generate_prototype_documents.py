"""Generate three explicitly synthetic documents for the online InvoFin prototype."""
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

output = Path(__file__).resolve().parents[1] / 'public' / 'demo'
output.mkdir(parents=True, exist_ok=True)
blue, navy, muted = colors.HexColor('#2563eb'), colors.HexColor('#18263e'), colors.HexColor('#64748b')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle('Brand', fontName='Helvetica-Bold', fontSize=16, textColor=blue, spaceAfter=20))
styles.add(ParagraphStyle('TitleLocal', fontName='Helvetica-Bold', fontSize=23, textColor=navy, spaceAfter=12))
styles.add(ParagraphStyle('BodyLocal', fontName='Helvetica', fontSize=10, leading=16, textColor=navy))
styles.add(ParagraphStyle('SmallLocal', fontName='Helvetica', fontSize=8, leading=12, textColor=muted))

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor('#dbeafe'))
    canvas.line(48, 57, A4[0]-48, 57)
    canvas.setFillColor(muted)
    canvas.setFont('Helvetica', 8)
    canvas.drawString(48, 40, 'PROTOTYPE - DATA SINTETIS - BUKAN DOKUMEN TRANSAKSI NYATA')
    canvas.drawRightString(A4[0]-48, 40, '1 / 1')
    canvas.restoreState()

for kind, title, number in [('invoice','INVOICE','PROTO-2026-001'), ('purchase-order','PURCHASE ORDER','PO-PROTO-001'), ('bast','BERITA ACARA SERAH TERIMA','BAST-PROTO-001')]:
    doc = SimpleDocTemplate(str(output/f'prototype-{kind}.pdf'), pagesize=A4, rightMargin=48, leftMargin=48, topMargin=42, bottomMargin=78)
    p=lambda text,style='BodyLocal':Paragraph(text,styles[style])
    story=[p('invofin. / contoh dokumen','Brand'),p(title,'TitleLocal'),p('SIMULASI UNTUK PENGUJIAN - SELURUH DATA FIKTIF','SmallLocal'),Spacer(1,24)]
    metadata=[['Document number',number],['Invoice number','PROTO-2026-001'],['Purchase order','PO-PROTO-001'],['Issue date','2026-11-04'],['Due date','2026-12-18'],['Currency','IDR']]
    meta=Table(metadata,colWidths=[150,345],hAlign='LEFT')
    meta.setStyle(TableStyle([('FONTNAME',(0,0),(0,-1),'Helvetica'),('FONTNAME',(1,0),(1,-1),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),10),('TEXTCOLOR',(0,0),(0,-1),muted),('TEXTCOLOR',(1,0),(1,-1),navy),('BOTTOMPADDING',(0,0),(-1,-1),10),('LEFTPADDING',(0,0),(-1,-1),0)]))
    story += [meta,Spacer(1,20)]
    parties=Table([[p('VENDOR / SUPPLIER','SmallLocal'),p('BUYER / BILL TO','SmallLocal')],[p('Integration vendor'),p('Integration buyer')],[p('Alamat simulasi vendor','SmallLocal'),p('Alamat simulasi buyer','SmallLocal')]],colWidths=[247,248])
    parties.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#f1f5f9')),('BOX',(0,0),(-1,-1),.5,colors.HexColor('#e2e8f0')),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),6),('LEFTPADDING',(0,0),(-1,-1),12)]))
    story += [parties,Spacer(1,24)]
    rows=[['DESCRIPTION','QTY','UNIT PRICE (IDR)','AMOUNT (IDR)'],['Paket komponen kemasan - simulasi','1','25,000,000.00','25,000,000.00']]
    items=Table(rows,colWidths=[220,35,120,120],rowHeights=[30,40])
    items.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),blue),('TEXTCOLOR',(0,0),(-1,0),colors.white),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTNAME',(0,1),(-1,-1),'Helvetica'),('FONTSIZE',(0,0),(-1,-1),8),('TEXTCOLOR',(0,1),(-1,-1),navy),('ALIGN',(1,0),(-1,-1),'RIGHT'),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LINEBELOW',(0,1),(-1,1),.5,colors.HexColor('#e2e8f0'))]))
    story += [items,Spacer(1,16)]
    totals=Table([['Subtotal','IDR 25,000,000.00'],['Tax','IDR 0.00'],['Total','IDR 25,000,000.00']],colWidths=[325,170])
    totals.setStyle(TableStyle([('FONTNAME',(0,0),(-1,-1),'Helvetica'),('FONTSIZE',(0,0),(-1,-1),10),('ALIGN',(1,0),(1,-1),'RIGHT'),('TEXTCOLOR',(0,0),(-1,-1),navy),('BOTTOMPADDING',(0,0),(-1,-1),10),('FONTNAME',(0,-1),(-1,-1),'Helvetica-Bold'),('BACKGROUND',(0,-1),(-1,-1),colors.HexColor('#eff6ff'))]))
    story += [totals,Spacer(1,24)]
    note='Dokumen ini menyimulasikan tagihan yang merujuk ke PO-PROTO-001.' if kind=='invoice' else 'Dokumen ini menyimulasikan pemesanan barang untuk PROTO-2026-001.' if kind=='purchase-order' else 'Barang pada PO-PROTO-001 disimulasikan telah diserahterimakan pada 2026-11-04 untuk invoice PROTO-2026-001.'
    story += [p(note),Spacer(1,10),p('Tidak memuat rekening bank, identitas perpajakan, atau tanda tangan asli. Gunakan hanya di lingkungan prototipe.','SmallLocal')]
    doc.build(story,onFirstPage=footer,onLaterPages=footer)
print('Generated three synthetic prototype documents.')
