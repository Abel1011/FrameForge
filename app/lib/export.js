import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const DPI_SETTINGS = {
  72: 1,
  150: 2.08,
  300: 4.17
};

/**
 * Export a single page as an image
 * @param {HTMLElement} element - The DOM element to capture
 * @param {string} format - 'png' or 'jpeg'
 * @param {number} dpi - 72, 150, or 300
 * @param {string} filename - Output filename without extension
 */
export async function exportPageAsImage(element, format = 'png', dpi = 150, filename = 'page') {
  const scale = DPI_SETTINGS[dpi] || 2;
  
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff'
  });

  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const quality = format === 'jpeg' ? 0.92 : undefined;
  
  const dataUrl = canvas.toDataURL(mimeType, quality);
  
  // Trigger download
  const link = document.createElement('a');
  link.download = `${filename}.${format}`;
  link.href = dataUrl;
  link.click();
  
  return dataUrl;
}

/**
 * Export entire project as PDF
 * @param {HTMLElement[]} pageElements - Array of DOM elements for each page
 * @param {import('../types').Project} project
 * @param {number} dpi - 72, 150, or 300
 */
export async function exportProjectAsPDF(pageElements, project, dpi = 150) {
  const scale = DPI_SETTINGS[dpi] || 2;
  
  // Determine page orientation and size
  const isLandscape = project.width > project.height;
  const orientation = isLandscape ? 'landscape' : 'portrait';
  
  // Create PDF with custom dimensions (in mm)
  const pxToMm = 0.264583;
  const pageWidth = project.width * pxToMm;
  const pageHeight = project.height * pxToMm;
  
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [pageWidth, pageHeight]
  });

  for (let i = 0; i < pageElements.length; i++) {
    const element = pageElements[i];
    
    if (i > 0) {
      pdf.addPage([pageWidth, pageHeight], orientation);
    }

    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
  }

  // Trigger download
  pdf.save(`${project.name}.pdf`);
}

/**
 * Get export preview dimensions
 * @param {number} width - Original width
 * @param {number} height - Original height
 * @param {number} dpi - Target DPI
 * @returns {{width: number, height: number, fileSize: string}}
 */
export function getExportPreview(width, height, dpi) {
  const scale = DPI_SETTINGS[dpi] || 2;
  const exportWidth = Math.round(width * scale);
  const exportHeight = Math.round(height * scale);
  
  // Rough estimate of file size (very approximate)
  const pixels = exportWidth * exportHeight;
  const bytesPerPixel = 3; // RGB
  const compressionRatio = 0.1; // Rough estimate for PNG/JPEG
  const estimatedBytes = pixels * bytesPerPixel * compressionRatio;
  
  let fileSize;
  if (estimatedBytes < 1024) {
    fileSize = `${estimatedBytes.toFixed(0)} B`;
  } else if (estimatedBytes < 1024 * 1024) {
    fileSize = `${(estimatedBytes / 1024).toFixed(1)} KB`;
  } else {
    fileSize = `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  
  return {
    width: exportWidth,
    height: exportHeight,
    fileSize
  };
}
