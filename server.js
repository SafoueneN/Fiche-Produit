const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Fonction utilitaire
const getValue = (val) => (val && val.trim ? val.trim() : 'Néant');

// Fonction pour afficher l’en-tête du PDF
function drawHeader(doc, logoPath) {
  const logoWidth = 150;
  const pageWidth = doc.page.width;
  const x = (pageWidth - logoWidth) / 2;

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, x, doc.y, { width: logoWidth });
    doc.moveDown(2);
  }

  doc.font('Helvetica-Bold')
    .fontSize(18)
    .fillColor('#333333')
    .text("DÉTAILS DE L'OPÉRATION", { align: 'center' });

  const lineY = doc.y + 5;
  doc.moveTo(50, lineY)
    .lineTo(doc.page.width - 50, lineY)
    .lineWidth(1)
    .strokeColor('#000000')
    .stroke();

  doc.moveDown(2);
}

// Page d'accueil
app.get('/', (req, res) => {
  res.render('accueil'); // accueil avec 2 boutons
});

// Formulaire financier
app.get('/formulaire', (req, res) => {
  res.render('formulaire', { data: {} });
});

app.post('/submit', (req, res) => {
  const data = req.body;
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  const operationCode = getValue(data.code).replace(/[^a-zA-Z0-9_-]/g, '_');
  const operationLabel = getValue(data.libelle).replace(/[^a-zA-Z0-9_-]/g, '_');
  const pdfFilename = `${operationCode}_${operationLabel}.pdf`;

  const exportDir = path.join(__dirname, 'exports');
  const pdfPath = path.join(exportDir, pdfFilename);
  const logoPath = path.join(__dirname, 'public/images/logo.jpg');

  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir);
  }

  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);
  drawHeader(doc, logoPath);

  const champs = [
    ["Code de l'opération", data.code],
    ["Libellé de l'opération", data.libelle],
    ["Nature de type opération", data.nature],
    ["Effet d'opération", data.effet_operation],
    ["Descriptif de l'opération", data.descriptif],
    ["Signe de l'opération", data.signe],
    ["Destination de l'opération", data.destination],
    ["Type d'impact", data.type_impact],
    ["Débit/Crédit immédiat", data.debit_credit_immediat],
    ["Autoriser le paiement partiel", data.autoriser_paiement_partiel],
    ["Type opération d'annulation", data.type_annulation],
    ["Type opération de rejet", data.type_rejet],
    ["Type opération interne reçue", data.type_interne_recue],
    ["Devise", data.devise],
    ["Application TVA", data.application_tva],
    ["Opération qui active le compte", data.activation_compte],
    ["Réserve opération de blocage", data.reserve_blocage],
    ["Opération soumise au forçage", data.operation_force],
    ["Opération soumise à un processus de validation", data.validation_processus],
    ["Déréservé AGIOS", data.dereserve_agios],
    ["Règle de conversion", data.regle_conversion],
    ["Envoi à la SDM en fin de journée", data.envoi_sdm],
    ["Nature des comptes compatibles", Array.isArray(data.comptes_compatibles) ? data.comptes_compatibles.join('\n') : getValue(data.comptes_compatibles)],
    ["Direction concernée", data.direction, true],
    ["Chargé", data.charge, true]
  ];

  const tableWidth = 500;
  const cellPadding = 8;
  const colGap = 20;
  const labelColWidth = tableWidth * 0.4;
  const valueColWidth = tableWidth - labelColWidth - colGap;
  let currentY = doc.y;

  champs.forEach(([label, rawValue, isBold], idx) => {
    const value = getValue(rawValue);
    const rowHeight = Math.max(
      doc.heightOfString(label, { width: labelColWidth }),
      doc.heightOfString(value, { width: valueColWidth })
    ) + cellPadding * 2;

    if (currentY + rowHeight > doc.page.height - 80) {
      doc.addPage();
      drawHeader(doc, logoPath);
      currentY = doc.y;
    }

    const bgColor = idx % 2 === 0 ? '#f9f9f9' : '#ffffff';
    doc.rect(50, currentY, tableWidth, rowHeight).fill(bgColor);
    doc.rect(50, currentY, tableWidth, rowHeight)
      .strokeColor('#cccccc')
      .lineWidth(0.5)
      .stroke();

    doc.fillColor('#333')
      .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(12)
      .text(label, 50 + cellPadding, currentY + cellPadding, {
        width: labelColWidth,
        align: 'left'
      });

    doc.fillColor(isBold ? '#000000' : (value !== 'Néant' ? '#007B33' : '#FF6347'))
      .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
      .text(value, 50 + cellPadding + labelColWidth + colGap, currentY + cellPadding, {
        width: valueColWidth,
        align: 'left'
      });

    currentY += rowHeight;
  });

  currentY += 20;
  const generationDate = new Date().toLocaleDateString('fr-FR');
  doc.fontSize(10)
    .fillColor('#777777')
    .text(`Document généré le ${generationDate} — Direction de l’Organisation & Référentiels - STB BANK -`, 50, currentY, {
      align: 'center',
      width: tableWidth
    });

  doc.end();
  writeStream.on('finish', () => res.download(pdfPath));
});

// Formulaire caisse
app.get('/formulaire-caisse', (req, res) => {
  res.render('formulaire-caisse', { data: {} });
});

app.post('/submit-caisse', (req, res) => {
  const data = req.body;
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  const operationCode = getValue(data.code).replace(/[^a-zA-Z0-9_-]/g, '_');
  const operationLabel = getValue(data.libelle).replace(/[^a-zA-Z0-9_-]/g, '_'); // libelle unifié
  const pdfFilename = `${operationCode}_${operationLabel}.pdf`;

  const exportDir = path.join(__dirname, 'exports');
  const pdfPath = path.join(exportDir, pdfFilename);
  const logoPath = path.join(__dirname, 'public/images/logo.jpg');

  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir);
  }

  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);
  drawHeader(doc, logoPath);

  const champs = [
    ["Code de l'opération", data.code],
    ["Libellé de l'opération", data.libelle],
    ["Nature de type d'opération", data.nature],
    ["Signe", data.signe],
    ["Montant minimum", data.montant_min],
    ["Montant maximum", data.montant_max],
    ["Devise", data.devise],
    ["Opération contrepartie", data.operation_contrepartie],
    ["Libellé de l'OP contrepartie", data.libelle_contrepartie],
    ["Direction concernée", data.direction],
    ["Chargé", data.charge]
  ];

  const tableWidth = 500;
  const cellPadding = 8;
  const colGap = 20;
  const labelColWidth = tableWidth * 0.4;
  const valueColWidth = tableWidth - labelColWidth - colGap;
  let currentY = doc.y;

  champs.forEach(([label, rawValue], idx) => {
    const value = getValue(rawValue);
    const rowHeight = Math.max(
      doc.heightOfString(label, { width: labelColWidth }),
      doc.heightOfString(value, { width: valueColWidth })
    ) + cellPadding * 2;

    if (currentY + rowHeight > doc.page.height - 80) {
      doc.addPage();
      drawHeader(doc, logoPath);
      currentY = doc.y;
    }

    const bgColor = idx % 2 === 0 ? '#f0f8ff' : '#ffffff';
    doc.rect(50, currentY, tableWidth, rowHeight).fill(bgColor);
    doc.rect(50, currentY, tableWidth, rowHeight)
      .strokeColor('#cccccc')
      .lineWidth(0.5)
      .stroke();

    doc.fillColor('#333')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(label, 50 + cellPadding, currentY + cellPadding, {
        width: labelColWidth,
        align: 'left'
      });

    doc.fillColor(value !== 'Néant' ? '#007B33' : '#FF6347')
      .font('Helvetica')
      .text(value, 50 + cellPadding + labelColWidth + colGap, currentY + cellPadding, {
        width: valueColWidth,
        align: 'left'
      });

    currentY += rowHeight;
  });

  currentY += 20;
  const generationDate = new Date().toLocaleDateString('fr-FR');
  doc.fontSize(10)
    .fillColor('#777777')
    .text(`Document généré le ${generationDate} — Direction de l’Organisation & Référentiels - STB BANK -`, 50, currentY, {
      align: 'center',
      width: tableWidth
    });

  doc.end();
  writeStream.on('finish', () => res.download(pdfPath));
});


// Lancer le serveur
app.listen(port, () => {
  console.log(`✅ Serveur en cours sur http://localhost:${port}`);
});
