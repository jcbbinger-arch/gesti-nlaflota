import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Company, AppEvent, Incident, Order, Product, Supplier, User, ReceptionItem } from '../types';

/**
 * Converts an array of objects to a CSV string and triggers a download.
 * @param filename - The name of the file to be downloaded.
 * @param data - An array of objects to be converted to CSV.
 */
export const exportToCsv = (filename: string, data: any[]) => {
    if (data.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.map(h => JSON.stringify(h)).join(','),
        ...data.map(row => 
            headers.map(fieldName => 
                JSON.stringify(row[fieldName], (key, value) => value === null || value === undefined ? '' : value)
            ).join(',')
        )
    ];
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Triggers the browser's print dialog for the current page.
 */
export const printPage = () => {
    window.print();
};

/**
 * Converts an object to a JSON string and triggers a download.
 * @param filename - The name of the file to be downloaded.
 * @param data - The object to be converted to JSON.
 */
export const downloadJson = (filename: string, data: any) => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


/**
 * Helper to add the institute/company logo to a jsPDF document.
 */
export const addHeaderToPdf = (doc: jsPDF, companyInfo: Company, title: string, subtitle?: string, teacherName?: string) => {
    // Logo (Square or Rectangle) - Fallback to Text if image fails
    try {
        if (companyInfo.print_logo) {
            // Force 20x20mm = ~56.7 units
            doc.addImage(companyInfo.print_logo, 'PNG', 14, 10, 20, 20);
        }
    } catch (e) {
        doc.setFontSize(8);
        doc.text('LOGO', 14, 15);
    }

    // Institute / Center Name
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(companyInfo.name.toUpperCase(), 40, 18);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(companyInfo.address, 40, 23);
    doc.text(`CIF: ${companyInfo.cif} | Tlf: ${companyInfo.phone}`, 40, 28);

    // Document Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 45);
    
    if (subtitle) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(subtitle, 14, 52);
    }

    if (teacherName) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`PROFESOR/A: ${teacherName.toUpperCase()}`, 14, subtitle ? 60 : 55);
    }

    return subtitle ? (teacherName ? 65 : 55) : (teacherName ? 60 : 50);
};

/**
 * Generates a PDF for supplier orders.
 */
export const generateOrderPdf = (
    ordersBySupplier: Map<string, { product: Product; quantity: number; price: number }[]>,
    suppliersMap: Map<string, Supplier>,
    companyInfo: Company,
    managerUser?: User,
    appName?: string,
    teacherName?: string
) => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();
    let isFirstPage = true;

    ordersBySupplier.forEach((items, supplierId) => {
        if (!isFirstPage) {
            doc.addPage();
        }
        isFirstPage = false;

        const supplier = suppliersMap.get(supplierId);
        if (!supplier) return;

        const startY = addHeaderToPdf(doc, companyInfo, 'HOJA DE PEDIDO A PROVEEDOR', `Fecha: ${date}`, teacherName);

        // Supplier Info
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('DATOS DEL PROVEEDOR:', 14, startY);
        doc.setFont('helvetica', 'normal');
        doc.text(`${supplier.name}`, 14, startY + 5);
        doc.text(supplier.address, 14, startY + 10);
        doc.text(`Tlf: ${supplier.phone} | Email: ${supplier.email}`, 14, startY + 15);

        if (managerUser) {
            doc.setFont('helvetica', 'bold');
            doc.text('CONTACTO ALMACÉN:', 130, startY);
            doc.setFont('helvetica', 'normal');
            doc.text(`${managerUser.name}`, 130, startY + 5);
            doc.text(`Email: ${managerUser.email}`, 130, startY + 10);
        }

        // Table
        const body = items.map(item => [
            item.product.reference,
            item.product.name.toUpperCase(),
            item.quantity,
            item.product.unit,
            item.price.toFixed(2) + ' €',
            (item.quantity * item.price).toFixed(2) + ' €'
        ]);
        
        const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        body.push(['', '', '', '', 'TOTAL (SIN IVA)', total.toFixed(2) + ' €']);

        (doc as any).autoTable({
            startY: startY + 25,
            head: [['Ref.', 'Producto', 'Cant.', 'Ud.', 'P. Unit.', 'P. Total']],
            body: body,
            theme: 'grid',
            headStyles: { fillStyle: 'F', fillColor: [59, 130, 246] }
        });
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const footerText = `${appName || 'Manager Pro'} - ${new Date().toLocaleString()} - Pág. ${i} de ${pageCount}`;
        doc.setFontSize(8);
        doc.text(footerText, 14, doc.internal.pageSize.height - 10);
    }

    doc.save(`pedidos_proveedores_${new Date().toISOString().slice(0,10)}.pdf`);
};

/**
 * Generates a reception sheet PDF for a given event.
 */
export const generateReceptionSheetPdf = (
    event: AppEvent,
    receptionData: { product: Product, receptionInfo: ReceptionItem }[],
    incidents: Incident[],
    companyInfo: Company,
    managerUser?: User,
    appName?: string
) => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();

    const startY = addHeaderToPdf(doc, companyInfo, `HOJA DE RECEPCIÓN`, `Evento: ${event.name}`);
    
    doc.setFontSize(10);
    doc.text(`Fecha de Recepción: ${date}`, 14, startY);
    doc.text(`Responsable Almacén: ${managerUser?.name || 'N/A'}`, 14, startY + 5);

    // Table
    const body = receptionData.map(({ product, receptionInfo }) => [
        product.reference,
        product.name.toUpperCase(),
        receptionInfo.ordered_quantity,
        receptionInfo.received_quantity,
        receptionInfo.status.toUpperCase(),
        '' // For signature
    ]);

    (doc as any).autoTable({
        startY: startY + 15,
        head: [['Ref.', 'Producto', 'Cant. Pedida', 'Cant. Recibida', 'Estado', 'Firma']],
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        didDrawCell: (data: any) => {
            if (data.column.index === 4 && data.cell.section === 'body') {
                const text = data.cell.text[0];
                let color = [0, 0, 0];
                if (text === 'PARCIAL') color = [217, 119, 6]; 
                if (text === 'INCIDENCIA') color = [220, 38, 38];
                if (text === 'OK') color = [22, 163, 74];
                doc.setTextColor(color[0], color[1], color[2]);
            }
        },
    });

    // Incidents Section
    let finalY = (doc as any).lastAutoTable.finalY || 100;
    if (incidents.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('INCIDENCIAS REGISTRADAS', 14, finalY + 15);
        const incidentBody = incidents.map(inc => [
            receptionData.find(d => d.product.id === inc.product_id)?.product.name.toUpperCase() || 'N/A',
            inc.description
        ]);
        (doc as any).autoTable({
            startY: finalY + 20,
            head: [['Producto', 'Descripción de la Incidencia']],
            body: incidentBody,
            theme: 'grid',
            headStyles: { fillColor: [220, 38, 38] }
        });
        finalY = (doc as any).lastAutoTable.finalY;
    }

    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const footerText = `${appName || 'Manager Pro'} - ${new Date().toLocaleString()} - Pág. ${i} de ${pageCount}`;
        doc.setFontSize(8);
        doc.text(footerText, 14, doc.internal.pageSize.height - 10);
    }

    doc.save(`recepcion_${event.name.replace(/\s/g, '_')}.pdf`);
};
