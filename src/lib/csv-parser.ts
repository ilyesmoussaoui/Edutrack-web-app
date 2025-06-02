export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
}

export function parseCSV(csvString: string): ParsedCSV {
  const lines = csvString.trim().split(/\r\n|\n/); // Handles both CRLF and LF line endings
  if (lines.length === 0) return { headers: [], rows: [], rowCount: 0 };

  // Basic CSV parsing: split by comma, trim whitespace.
  // This parser does not handle commas within quoted fields or escaped quotes.
  const parseLine = (line: string): string[] => {
    // A more robust regex might be: /,(?=(?:(?:[^"]*"){2})*[^"]*$)/
    // But for simplicity and to avoid complex regex:
    return line.split(',').map(value => value.trim());
  };
  
  const headers = parseLine(lines[0]);
  
  const rowsData = lines.slice(1).filter(line => line.trim() !== ''); // Ignore empty lines

  const rows = rowsData.map(line => {
    const values = parseLine(line);
    const rowObject: Record<string, string> = {};
    headers.forEach((header, index) => {
      rowObject[header] = values[index] !== undefined ? values[index] : "";
    });
    return rowObject;
  });

  return { headers, rows, rowCount: rows.length };
}

export function tryParseFloat(value: string | number | undefined): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return !isNaN(value) ? value : null;
  
  const num = parseFloat(value.replace(/[^0-9.-]+/g, "")); // Attempt to remove currency symbols etc.
  return isNaN(num) ? null : num;
}
