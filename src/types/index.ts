export type TransactionStatus = 'business' | 'personal' | 'needs_review';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string | null;
  suggested_category: string | null;
  status: TransactionStatus;
  confidence: number;
}

export interface AssessmentSession {
  id: string;
  user_id: string;
  tax_year: string;
  income_types: string[];
  bank_connected: boolean;
  transactions_imported: boolean;
  current_section: string;
  created_at: string;
  updated_at: string;
}

export type SectionStatus = 'not_started' | 'in_progress' | 'completed';

export interface WizardContext {
  session: AssessmentSession | null;
  transactions: Transaction[];
  sectionStatus: Record<string, SectionStatus>;
  updateSession: (data: Partial<AssessmentSession>) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  bulkUpdateTransactions: (ids: string[], data: Partial<Transaction>) => Promise<void>;
}
