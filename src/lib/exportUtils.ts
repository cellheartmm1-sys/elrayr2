import * as XLSX from 'xlsx';

/**
 * Utility function to export JSON rows data directly into an Excel (.xlsx) file.
 */
export function exportJsonToExcel({
  filename,
  sheetName = 'البيانات',
  data,
  headers
}: {
  filename: string;
  sheetName?: string;
  data: Record<string, any>[];
  headers?: Record<string, string>;
}) {
  try {
    // If headers mapping provided, transform keys to Arabic header labels
    const transformedData = data.map(item => {
      if (!headers) return item;
      const newItem: Record<string, any> = {};
      Object.keys(headers).forEach(key => {
        newItem[headers[key]] = item[key] !== undefined && item[key] !== null ? item[key] : '-';
      });
      return newItem;
    });

    const worksheet = XLSX.utils.json_to_sheet(transformedData);
    
    // Enable RTL on sheet layout
    if (!worksheet['!views']) worksheet['!views'] = [];
    worksheet['!views'].push({ RTL: true });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(workbook, safeFilename);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    alert('حدث خطأ أثناء تصدير ملف Excel');
  }
}

/**
 * Utility function to export HTML printable container directly to PDF or trigger Print dialog.
 */
export function exportContainerToPdf(containerId: string, title: string = 'المستند') {
  const element = document.getElementById(containerId);
  if (!element) {
    window.print();
    return;
  }

  // Fallback to optimized print view
  window.print();
}
