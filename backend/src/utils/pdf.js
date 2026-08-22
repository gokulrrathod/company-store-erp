import PDFDocument from 'pdfkit';

// Streams a generated PDF as the HTTP response. `draw(doc)` receives the PDFKit
// document to build the page content; resolves once the stream has fully flushed.
export function streamPdf(res, filename, draw) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return new Promise((resolve, reject) => {
    doc.pipe(res);
    doc.on('error', reject);
    res.on('finish', resolve);
    draw(doc);
    doc.end();
  });
}

export function pdfTitle(doc, text) {
  doc.fontSize(18).font('Helvetica-Bold').text(text, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica').fillColor('#555').text('VMG ERP', { align: 'center' });
  doc.fillColor('#000');
  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke();
  doc.moveDown(1);
}

export function pdfField(doc, label, value) {
  doc.fontSize(10).font('Helvetica-Bold').text(`${label}: `, { continued: true }).font('Helvetica').text(value ?? '—');
}
