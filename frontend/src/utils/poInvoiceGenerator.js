import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generates and downloads an official Purchase Order & Vendor Billing Slip PDF
 * @param {Object} order - Full Purchase Order document
 */
export const exportPOInvoicePDF = (order) => {
  if (!order) return;

  const doc = new jsPDF();
  const supplier = order.supplier;
  const products = order.products || [];
  const poCode = order.poNumber || `PO-${order._id?.substring(order._id?.length - 8).toUpperCase()}`;

  // 1. Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 36, 'F');

  // Title inside banner
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('PURCHASE ORDER INVOICE', 14, 21);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('OFFICIAL VENDOR PROCUREMENT SLIP', 130, 21);

  // Accent Line
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 35, 210, 2, 'F');

  // 2. PO Details Column (Left)
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PURCHASE ORDER DETAILS', 14, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`PO Number: ${poCode}`, 14, 55);
  doc.text(`Issue Date: ${new Date(order.createdAt || Date.now()).toLocaleDateString()}`, 14, 61);
  doc.text(
    `Expected Delivery: ${
      order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : 'Standard Delivery'
    }`,
    14,
    67
  );
  doc.text(`Order Status: ${order.status || 'Pending'}`, 14, 73);
  doc.text(`Payment Terms: ${order.paymentTerms || 'Net 30'}`, 14, 79);
  doc.text(`Payment Status: ${(order.paymentStatus || 'unpaid').toUpperCase()}`, 14, 85);

  // 3. Vendor / Supplier Column (Right)
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('VENDOR / SUPPLIER', 120, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Company: ${supplier?.name || 'Assigned Supplier'}`, 120, 55);
  doc.text(`Contact Person: ${supplier?.contactPerson || '—'}`, 120, 61);
  doc.text(`Email: ${supplier?.email || '—'}`, 120, 67);
  doc.text(`Phone: ${supplier?.phone || '—'}`, 120, 73);
  doc.text(`Address: ${supplier?.address || '—'}`, 120, 79, { maxWidth: 80 });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 91, 196, 91);

  // 4. Products Line Items Table
  const tableHeaders = [['#', 'Item / Product Name', 'SKU', 'Unit Price', 'Qty', 'Total']];
  const tableRows = products.map((item, idx) => {
    const prodName = item.product?.name || item.name || 'Product Item';
    const prodSKU = item.product?.SKU || item.SKU || '—';
    const price = typeof item.price === 'number' ? item.price : item.purchasePrice || 0;
    const qty = item.quantity || 0;
    const rowTotal = price * qty;
    return [
      idx + 1,
      prodName,
      prodSKU,
      `$${price.toFixed(2)}`,
      qty,
      `$${rowTotal.toFixed(2)}`,
    ];
  });

  autoTable(doc, {
    startY: 96,
    head: tableHeaders,
    body: tableRows,
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 8.5, font: 'helvetica', cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 25, halign: 'right' },
    },
  });

  // 5. Summary Section
  const finalY = (doc.lastAutoTable?.finalY || 140) + 8;

  // Notes Box (Left)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, finalY, 105, 34, 2, 2, 'F');
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('REMARKS & LOGISTICS NOTES', 18, finalY + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    order.remarks || order.notes || 'Goods receipt requires warehouse inspection note (GRN). Payment is processed upon delivery verification.',
    18,
    finalY + 14,
    { maxWidth: 97 }
  );

  // Financial Totals (Right)
  const totalAmount = order.TotalAmount || 0;
  const paidAmount = order.paidAmount || 0;
  const balance = Math.max(0, totalAmount - paidAmount);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', 140, finalY + 6);
  doc.text(`$${totalAmount.toFixed(2)}`, 195, finalY + 6, { align: 'right' });

  doc.text('Tax / VAT (0%):', 140, finalY + 12);
  doc.text('$0.00', 195, finalY + 12, { align: 'right' });

  doc.text('Paid Amount:', 140, finalY + 18);
  doc.text(`$${paidAmount.toFixed(2)}`, 195, finalY + 18, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.line(140, finalY + 22, 196, finalY + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Total Contract Value:', 140, finalY + 28);
  doc.text(`$${totalAmount.toFixed(2)}`, 195, finalY + 28, { align: 'right' });

  doc.setFontSize(9);
  doc.setTextColor(balance > 0 ? 180 : 22, balance > 0 ? 83 : 101, balance > 0 ? 9 : 52);
  doc.text('Balance Payable:', 140, finalY + 34);
  doc.text(`$${balance.toFixed(2)}`, 195, finalY + 34, { align: 'right' });

  // 6. Footer Note
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated by ERP Management System Procurement Engine on ${new Date().toLocaleString()} | PO #${poCode}`,
    14,
    pageHeight - 8
  );

  // Save the PDF
  const filename = `PO_Invoice_${poCode.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
  doc.save(filename);
};
