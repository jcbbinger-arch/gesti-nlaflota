import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Company, Event, Incident, Order, Product, Supplier, User, ReceptionItem } from '../types';

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
        headers.join(','),
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
 * Generates a PDF for supplier orders.
 * @param ordersBySupplier - A map where keys are supplier IDs and values are arrays of items for that supplier.
 * @param suppliersMap - A map of supplier IDs to supplier objects.
 * @param companyInfo - The company's information.
 * @param managerUser - The manager user's information.
 * @param appName - The name of the application for the footer.
 */
export const generateOrderPdf = (
    ordersBySupplier: Map<string, { product: Product; quantity: number; price: number }[]>,
    suppliersMap: Map<string, Supplier>,
    companyInfo: Company,
    managerUser?: User,
    appName?: string
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

        // Header
        doc.setFontSize(20);
        doc.text('Hoja de Pedido', 14, 22);
        doc.setFontSize(12);
        doc.text(`Fecha: ${date}`, 14, 30);

        // Company and Supplier Info
        doc.setFontSize(10);
        doc.text(companyInfo.name, 14, 40);
        doc.text(companyInfo.address, 14, 45);
        doc.text(`Tlf: ${companyInfo.phone}`, 14, 50);
        if (managerUser) {
            doc.text(`A la atención de: ${managerUser.name}`, 14, 55);
        }

        doc.text(`Proveedor: ${supplier.name}`, 150, 40, { align: 'left' });
        doc.text(supplier.address, 150, 45, { align: 'left' });
        doc.text(`Tlf: ${supplier.phone}`, 150, 50, { align: 'left' });

        // Table
        const body = items.map(item => [
            item.product.reference,
            item.product.name,
            item.quantity,
            item.product.unit,
            item.price.toFixed(2) + '€',
            (item.quantity * item.price).toFixed(2) + '€'
        ]);
        
        const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        body.push(['', '', '', '', 'TOTAL (sin IVA)', total.toFixed(2) + '€']);

        (doc as any).autoTable({
            startY: 65,
            head: [['Ref.', 'Producto', 'Cantidad', 'Unidad', 'Precio Unit.', 'Precio Total']],
            body: body,
            theme: 'grid'
        });
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const footerText = `${appName || 'Manager Pro'} - ${new Date().toLocaleString()}`;
        doc.setFontSize(8);
        doc.text(footerText, 14, doc.internal.pageSize.height - 10);
    }

    doc.save(`pedidos_proveedores_${new Date().toISOString().slice(0,10)}.pdf`);
};

/**
 * Generates a reception sheet PDF for a given event.
 * @param appName - The name of the application for the footer.
 */
export const generateReceptionSheetPdf = (
    event: Event,
    receptionData: { product: Product, receptionInfo: ReceptionItem }[],
    incidents: Incident[],
    companyInfo: Company,
    managerUser?: User,
    appName?: string
) => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();

    // Header
    doc.setFontSize(18);
    doc.text(`Hoja de Recepción - ${event.name}`, 14, 22);
    doc.setFontSize(12);
    doc.text(`Fecha de Recepción: ${date}`, 14, 30);
    doc.setFontSize(10);
    doc.text(`Responsable: ${managerUser?.name || 'N/A'}`, 14, 35);

    // Table
    const body = receptionData.map(({ product, receptionInfo }) => [
        product.name,
        receptionInfo.ordered_quantity,
        receptionInfo.received_quantity,
        receptionInfo.status.toUpperCase(),
        '' // For signature
    ]);

    (doc as any).autoTable({
        startY: 45,
        head: [['Producto', 'Cant. Pedida', 'Cant. Recibida', 'Estado', 'Firma']],
        body: body,
        theme: 'striped',
        didDrawCell: (data: any) => {
            if (data.column.index === 3 && data.cell.section === 'body') {
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
        doc.text('Incidencias Registradas', 14, finalY + 15);
        const incidentBody = incidents.map(inc => [
            receptionData.find(d => d.product.id === inc.product_id)?.product.name || 'N/A',
            inc.description
        ]);
        (doc as any).autoTable({
            startY: finalY + 20,
            head: [['Producto', 'Descripción de la Incidencia']],
            body: incidentBody,
            theme: 'grid'
        });
        finalY = (doc as any).lastAutoTable.finalY;
    }

    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const footerText = `${appName || 'Manager Pro'} - ${new Date().toLocaleString()}`;
        doc.setFontSize(8);
        doc.text(footerText, 14, doc.internal.pageSize.height - 10);
    }

    doc.save(`recepcion_${event.name.replace(/\s/g, '_')}.pdf`);
};