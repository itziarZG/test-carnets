const fs = require("fs").promises;
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const ExcelJS = require("exceljs");
const path = require("path");

async function generatePdfs(excelPath, outputDir, schoolYear) {
  const pdfBytes = await fs.readFile("./CARNET.pdf");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  const worksheet = workbook.getWorksheet(1); // Get first worksheet

  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > 1) {
      // Skip header row
      const rowData = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        let header = worksheet.getCell(1, colNumber).value;
        if (header && typeof header === 'object' && header.richText) {
            header = header.richText.map(rt => rt.text).join('');
        }
        if (header) {
            rowData[String(header)] = cell.value;
        }
      });
      rows.push(rowData);
    }
  });

  const [year1, year2] = schoolYear.split('-').map(year => year.slice(-1));

  for (const [index, row] of rows.entries()) {
    const num = row["NUM"] || "";

    // Skip row if NUM is empty
    if (!num) {
        continue;
    }

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPages()[0];
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const titular = row["TITULAR"] || "";
    const familia = row["FAMILIA"] || "";

    page.drawText(year1, {
      x: 88,
      y: 206,
      size: 11,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    page.drawText(year2, {
      x: 132,
      y: 206,
      size: 11,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    page.drawText(num.toString(), {
      x: 92,
      y: 150,
      size: 13,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    page.drawText(titular.toString(), {
      x: 20,
      y: 106,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    page.drawText(familia.toString(), {
      x: 37,
      y: 56,
      size: 12,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });

    const pdfBytesModified = await pdfDoc.save();
    const outputPath = path.join(outputDir, `socis_${num}_${familia}.pdf`);
    await fs.writeFile(outputPath, pdfBytesModified);
  }
}

module.exports = { generatePdfs };
