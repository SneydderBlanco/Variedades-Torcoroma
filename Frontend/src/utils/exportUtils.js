import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToExcel = (data, columns, filename) => {
  // Map data to match columns exactly
  const exportData = data.map(item => {
    const row = {};
    columns.forEach(col => {
      row[col.header] = typeof col.accessor === 'function' ? col.accessor(item) : item[col.accessor];
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToPDF = (data, columns, filename, title = "Reporte") => {
  console.log("Generando PDF...");
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  const tableColumn = columns.map(col => col.header);
  const tableRows = data.map(item => {
    return columns.map(col => typeof col.accessor === 'function' ? col.accessor(item) : item[col.accessor]);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 30,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [245, 194, 39], textColor: [0, 0, 0] } // Torcoroma Gold
  });

  doc.save(`${filename}.pdf`);
};
