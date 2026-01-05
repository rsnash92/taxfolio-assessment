import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Transaction } from '@/types/wizard';

interface FileResult {
  filename: string;
  success: boolean;
  transactionCount?: number;
  error?: string;
}

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}

// Common date formats used in UK bank statements
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  const cleanDate = dateStr.trim();

  // Try DD/MM/YYYY or DD-MM-YYYY
  const ukFormat = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  const ukMatch = cleanDate.match(ukFormat);
  if (ukMatch) {
    const [, day, month, year] = ukMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try YYYY-MM-DD
  const isoFormat = /^(\d{4})-(\d{2})-(\d{2})$/;
  if (isoFormat.test(cleanDate)) {
    return cleanDate;
  }

  // Try DD MMM YYYY (e.g., "15 Jan 2024")
  const monthNames: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const textFormat = /^(\d{1,2})\s+(\w{3})\s+(\d{4})$/i;
  const textMatch = cleanDate.match(textFormat);
  if (textMatch) {
    const [, day, monthStr, year] = textMatch;
    const month = monthNames[monthStr.toLowerCase()];
    if (month) {
      return `${year}-${month}-${day.padStart(2, '0')}`;
    }
  }

  return null;
}

// Parse amount from various formats
function parseAmount(amountStr: string): number | null {
  if (!amountStr) return null;

  // Remove currency symbols and whitespace
  let clean = amountStr.replace(/[£$€\s]/g, '').trim();

  // Handle negative formats: (123.45) or -123.45
  const isNegative = clean.startsWith('-') || (clean.startsWith('(') && clean.endsWith(')'));
  clean = clean.replace(/[()-]/g, '');

  // Handle comma as thousands separator (UK format)
  clean = clean.replace(/,/g, '');

  const amount = parseFloat(clean);
  if (isNaN(amount)) return null;

  return isNegative ? -amount : amount;
}

// Parse CSV content into transactions
function parseCSV(content: string, filename: string): ParsedTransaction[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const transactions: ParsedTransaction[] = [];

  // Try to detect header row and column positions
  const headerRow = lines[0].toLowerCase();
  const headers = headerRow.split(',').map((h) => h.trim().replace(/"/g, ''));

  // Common column name variations
  const dateColumns = ['date', 'transaction date', 'posting date', 'value date', 'trans date'];
  const descColumns = ['description', 'narrative', 'details', 'transaction description', 'memo', 'reference', 'particulars'];
  const amountColumns = ['amount', 'value', 'transaction amount'];
  const debitColumns = ['debit', 'money out', 'withdrawal', 'paid out'];
  const creditColumns = ['credit', 'money in', 'deposit', 'paid in'];

  // Find column indices
  let dateIdx = headers.findIndex((h) => dateColumns.some((d) => h.includes(d)));
  let descIdx = headers.findIndex((h) => descColumns.some((d) => h.includes(d)));
  let amountIdx = headers.findIndex((h) => amountColumns.some((a) => h.includes(a)));
  let debitIdx = headers.findIndex((h) => debitColumns.some((d) => h.includes(d)));
  let creditIdx = headers.findIndex((h) => creditColumns.some((c) => h.includes(c)));

  // Fallback: assume common column positions if headers not found
  if (dateIdx === -1) dateIdx = 0;
  if (descIdx === -1) descIdx = headers.length > 2 ? 1 : 0;
  if (amountIdx === -1 && debitIdx === -1 && creditIdx === -1) {
    // Try to find numeric column
    amountIdx = headers.length - 1;
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Handle CSV with quoted fields containing commas
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));

    // Extract values
    const dateStr = values[dateIdx] || '';
    const description = values[descIdx] || '';
    let amount: number | null = null;
    let type: 'income' | 'expense' = 'expense';

    if (amountIdx !== -1 && values[amountIdx]) {
      amount = parseAmount(values[amountIdx]);
      if (amount !== null) {
        type = amount >= 0 ? 'income' : 'expense';
        amount = Math.abs(amount);
      }
    } else if (debitIdx !== -1 || creditIdx !== -1) {
      // Separate debit/credit columns
      const debit = debitIdx !== -1 ? parseAmount(values[debitIdx] || '') : null;
      const credit = creditIdx !== -1 ? parseAmount(values[creditIdx] || '') : null;

      if (credit && credit > 0) {
        amount = credit;
        type = 'income';
      } else if (debit && debit > 0) {
        amount = debit;
        type = 'expense';
      }
    }

    const parsedDate = parseDate(dateStr);

    if (parsedDate && description && amount !== null && amount > 0) {
      transactions.push({
        date: parsedDate,
        description: description.substring(0, 500), // Limit description length
        amount,
        type,
      });
    }
  }

  return transactions;
}

// Convert parsed transactions to wizard Transaction format
function toWizardTransactions(
  parsed: ParsedTransaction[],
  source: string
): Transaction[] {
  return parsed.map((t) => ({
    id: crypto.randomUUID(),
    date: t.date,
    description: t.description,
    amount: t.amount,
    type: t.type,
    category: null,
    suggested_category: null,
    status: 'needs_review' as const,
    confidence: 0,
    source,
  }));
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files uploaded' },
        { status: 400 }
      );
    }

    const fileResults: FileResult[] = [];
    const allTransactions: Transaction[] = [];

    for (const file of files) {
      try {
        const filename = file.name;
        const extension = filename.split('.').pop()?.toLowerCase();

        if (extension === 'csv') {
          const content = await file.text();
          const parsed = parseCSV(content, filename);

          if (parsed.length === 0) {
            fileResults.push({
              filename,
              success: false,
              error: 'No valid transactions found. Please check the file format.',
            });
            continue;
          }

          const transactions = toWizardTransactions(parsed, filename);
          allTransactions.push(...transactions);

          fileResults.push({
            filename,
            success: true,
            transactionCount: transactions.length,
          });
        } else if (extension === 'pdf') {
          // PDF parsing is more complex - for now, return an informative error
          // In production, you'd use a library like pdf-parse or a service
          fileResults.push({
            filename,
            success: false,
            error: 'PDF parsing coming soon. Please export your statement as CSV from your bank.',
          });
        } else {
          fileResults.push({
            filename,
            success: false,
            error: 'Unsupported file format. Please upload CSV or PDF files.',
          });
        }
      } catch (err) {
        console.error(`Error processing file ${file.name}:`, err);
        fileResults.push({
          filename: file.name,
          success: false,
          error: 'Failed to process file. Please check the format.',
        });
      }
    }

    // Sort transactions by date (newest first)
    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      transactions: allTransactions,
      transactionCount: allTransactions.length,
      fileResults,
    });
  } catch (error) {
    console.error('[statements/upload] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process files. Please try again.' },
      { status: 500 }
    );
  }
}
