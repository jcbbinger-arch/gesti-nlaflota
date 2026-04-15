/**
 * Parses a CSV string into an array of objects.
 * Handles JSON-stringified cells produced by exportToCsv.
 * @param csvText - The CSV content as a string.
 * @returns An array of objects where keys are the headers.
 */
export const parseCsv = (csvText: string): any[] => {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    const parseLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                // Check if it's an escaped quote (double quote inside quotes)
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                    current += '"'; // Keep quotes for JSON.parse later
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };

    const headerValues = parseLine(lines[0]);
    const headers = headerValues.map(h => {
        try {
            return JSON.parse(h);
        } catch (e) {
            return h.replace(/^"|"$/g, '');
        }
    });

    const results = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        const obj: any = {};
        headers.forEach((header, index) => {
            const val = values[index];
            if (val === undefined || val === '') {
                obj[header] = null;
            } else {
                try {
                    // Try to parse as JSON (handles strings, numbers, arrays, objects)
                    obj[header] = JSON.parse(val);
                } catch (e) {
                    // Fallback for non-JSON values
                    obj[header] = val.replace(/^"|"$/g, '');
                }
            }
        });
        results.push(obj);
    }

    return results;
};
