/**
 * Parses a CSV string into an array of objects.
 * @param csvText - The CSV content as a string.
 * @returns An array of objects where keys are the headers.
 */
export const parseCsv = (csvText: string): any[] => {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const results = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple split by comma, handling quoted values
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        const obj: any = {};
        headers.forEach((header, index) => {
            let val: any = values[index] || '';
            // Remove quotes if present
            val = val.replace(/^"|"$/g, '');
            
            // Try to parse numbers or booleans
            if (val.toLowerCase() === 'true') val = true;
            else if (val.toLowerCase() === 'false') val = false;
            else if (!isNaN(Number(val)) && val !== '') val = Number(val);
            
            obj[header] = val;
        });
        results.push(obj);
    }

    return results;
};
