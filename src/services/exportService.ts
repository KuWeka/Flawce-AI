import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, AlignmentType, HeadingLevel, WidthType, TextRun, ShadingType } from 'docx';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

export const exportTransactionsToCSV = (transactions: any[], fileName: string = 'Laporan_Flowce.csv') => {
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const summary = [
    ['LAPORAN KEUANGAN FLOWCE'],
    [`Dicetak pada: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
    [],
    ['RINGKASAN'],
    ['Total Pemasukan', totalIncome],
    ['Total Pengeluaran', totalExpense],
    ['Saldo Akhir', balance],
    [],
    ['DETAIL TRANSAKSI'],
    ['Tanggal', 'Tipe', 'Kategori', 'Jumlah', 'Deskripsi']
  ];

  const rows = transactions.map(tx => [
    format(new Date(tx.date), 'dd/MM/yyyy HH:mm'),
    tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    tx.category,
    tx.amount,
    tx.description || ''
  ]);

  const csvContent = [...summary, ...rows]
    .map(e => e.join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportTransactionsToExcel = (transactions: any[], fileName: string = 'Laporan_Flowce.xlsx') => {
  const workoutData = transactions.map(tx => ({
    'Tanggal': format(new Date(tx.date), 'dd/MM/yyyy HH:mm'),
    'Tipe': tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    'Kategori': tx.category,
    'Jumlah (Rp)': tx.amount,
    'Deskripsi': tx.description || ''
  }));

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  
  // Create Category Summary Data
  const catSummaryRaw: Record<string, number> = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    catSummaryRaw[t.category] = (catSummaryRaw[t.category] || 0) + t.amount;
  });
  const catSummary = Object.entries(catSummaryRaw).map(([name, value]) => ({ 'Kategori': name, 'Total Pengeluaran': value }));

  const workbook = XLSX.utils.book_new();

  // DASHBOARD SHEET
  const dashData = [
    ['LAPORAN KEUANGAN FLOWCE'],
    [`Dicetak pada: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
    [],
    ['RINGKASAN KEUANGAN'],
    ['Item', 'Nilai'],
    ['Total Pemasukan', totalIncome],
    ['Total Pengeluaran', totalExpense],
    ['Saldo Akhir', totalIncome - totalExpense],
    [],
    ['PENGELUARAN PER KATEGORI'],
    ['Kategori', 'Total']
  ];
  const dashSheet = XLSX.utils.aoa_to_sheet(dashData);
  XLSX.utils.sheet_add_json(dashSheet, catSummary, { skipHeader: true, origin: 'A11' });
  XLSX.utils.book_append_sheet(workbook, dashSheet, 'Ringkasan');

  // TRANSACTIONS SHEET
  const txSheet = XLSX.utils.json_to_sheet(workoutData);
  const wscols = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 30 }];
  txSheet['!cols'] = wscols;
  XLSX.utils.book_append_sheet(workbook, txSheet, 'Detail Transaksi');

  XLSX.writeFile(workbook, fileName);
};

export const exportTransactionsToPDF = (transactions: any[], fileName: string = 'Laporan_Flowce.pdf') => {
  const doc = new jsPDF();
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  
  // Brand Header
  doc.setFillColor(38, 33, 92); // Deep Violet
  doc.rect(0, 0, 210, 45, 'F');
  
  doc.setTextColor(175, 169, 236); // Soft Iris
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('FLOWCE.', 14, 25);
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Analisis Keuangan Cerdas - Track less, flow more.', 14, 34);
  
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.text(`Generated at: ${format(new Date(), 'PPPP p')}`, 145, 25);

  // Summary Metrics
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 55, 55, 30, 3, 3, 'F');
  doc.roundedRect(77, 55, 55, 30, 3, 3, 'F');
  doc.roundedRect(140, 55, 55, 30, 3, 3, 'F');

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text('PEMASUKAN', 20, 65);
  doc.text('PENGELUARAN', 83, 65);
  doc.text('SALDO AKHIR', 146, 65);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); doc.text(`Rp ${totalIncome.toLocaleString()}`, 20, 75);
  doc.setTextColor(239, 68, 68); doc.text(`Rp ${totalExpense.toLocaleString()}`, 83, 75);
  doc.setTextColor(30, 41, 59); doc.text(`Rp ${(totalIncome - totalExpense).toLocaleString()}`, 146, 75);

  // Category Chart (Simple Bar Representation)
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.text('Analisis Pengeluaran Per Kategori', 14, 100);

  const catSummaryRaw: Record<string, number> = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    catSummaryRaw[t.category] = (catSummaryRaw[t.category] || 0) + t.amount;
  });
  const sortedCats = Object.entries(catSummaryRaw).sort((a, b) => b[1] - a[1]).slice(0, 5);

  let currentY = 110;
  sortedCats.forEach(([name, value]) => {
    const barWidth = (value / totalExpense) * 120;
    doc.setFillColor(230, 230, 230);
    doc.rect(50, currentY - 3, 120, 4, 'F');
    doc.setFillColor(16, 185, 129);
    doc.rect(50, currentY - 3, Math.max(barWidth, 2), 4, 'F');
    
    doc.setTextColor(70, 70, 70);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(name, 14, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rp ${value.toLocaleString()}`, 175, currentY);
    currentY += 10;
  });

  // Detailed Table
  const headers = [['Tanggal', 'Tipe', 'Kategori', 'Jumlah', 'Deskripsi']];
  const data = transactions.map(tx => [
    format(new Date(tx.date), 'dd/MM/yyyy'),
    tx.type === 'income' ? 'Masuk' : 'Keluar',
    tx.category,
    `Rp ${tx.amount.toLocaleString()}`,
    tx.description || '-'
  ]);

  autoTable(doc, {
    startY: currentY + 10,
    head: headers,
    body: data,
    theme: 'striped',
    headStyles: { fillColor: [10, 16, 28], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 3: { halign: 'right' } },
    margin: { top: 45 }
  });

  doc.save(fileName);
};

export const exportTransactionsToDOCX = async (transactions: any[], fileName: string = 'Laporan_Flowce.docx') => {
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
 
  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tanggal", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "26215C" } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tipe", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "26215C" } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Kategori", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "26215C" } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Jumlah", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "26215C" } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Deskripsi", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "26215C" } }),
      ],
    }),
    ...transactions.map((tx) => new TableRow({
      children: [
        new TableCell({ children: [new Paragraph(format(new Date(tx.date), 'dd/MM/yyyy'))] }),
        new TableCell({ children: [new Paragraph(tx.type === 'income' ? 'Masuk' : 'Keluar')] }),
        new TableCell({ children: [new Paragraph(tx.category)] }),
        new TableCell({ children: [new Paragraph(`Rp ${tx.amount.toLocaleString()}`)] }),
        new TableCell({ children: [new Paragraph(tx.description || '-')] }),
      ],
    })),
  ];
 
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: "FLOWCE.", bold: true, size: 48, color: "534AB7" })],
            alignment: AlignmentType.LEFT,
          }),
          new Paragraph({
            children: [new TextRun({ text: "Laporan Analisis Keuangan Cerdas", italics: true, color: "666666" })],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "IKHTISAR KEUANGAN", bold: true, size: 28 })],
            spacing: { before: 200, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Total Pemasukan: ", bold: true }), new TextRun({ text: `Rp ${totalIncome.toLocaleString()}`, color: "1D9E75" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "Total Pengeluaran: ", bold: true }), new TextRun({ text: `Rp ${totalExpense.toLocaleString()}`, color: "EF4444" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "Saldo Akhir: ", bold: true }), new TextRun({ text: `Rp ${(totalIncome - totalExpense).toLocaleString()}`, bold: true })],
            spacing: { after: 400 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
          }),
          new Paragraph({
            text: `Dicetak secara otomatis oleh Flowce AI pada ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
            alignment: AlignmentType.RIGHT,
            spacing: { before: 400 },
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, fileName);
};


