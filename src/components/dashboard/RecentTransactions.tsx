'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';

interface MockTransaction {
  merchant: string;
  amount: number;
  type: 'income' | 'expense';
  category: string | null;
  status: 'auto' | 'needs_review';
  date: string;
}

// TODO: Replace with real transaction data from Supabase / WizardProvider
const MOCK_TRANSACTIONS: MockTransaction[] = [
  { merchant: 'Screwfix', amount: 84.20, type: 'expense', category: 'Tools & Equipment', status: 'auto', date: '11 Feb' },
  { merchant: 'Shell Lakeside', amount: 62.50, type: 'expense', category: 'Fuel', status: 'auto', date: '10 Feb' },
  { merchant: 'Amazon', amount: 29.99, type: 'expense', category: null, status: 'needs_review', date: '10 Feb' },
  { merchant: 'TfL', amount: 12.80, type: 'expense', category: 'Travel', status: 'auto', date: '9 Feb' },
  { merchant: 'Costa Coffee', amount: 4.50, type: 'expense', category: null, status: 'needs_review', date: '9 Feb' },
  { merchant: 'Santander Interest', amount: 14.20, type: 'income', category: 'Bank Interest', status: 'auto', date: '8 Feb' },
];

export function RecentTransactions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      id="transactions"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Recent Transactions</h2>
        {/* TODO: Link to /dashboard/transactions when full page is built */}
        <button className="text-xs font-medium text-[#00a8b0] hover:text-[#00e3ec] transition-colors">
          View all &rarr;
        </button>
      </div>

      <Card className="py-0 overflow-hidden">
        <CardContent className="p-0">
          {MOCK_TRANSACTIONS.map((tx, i) => (
            <div
              key={i}
              className={`flex items-center px-4 py-3 ${
                i < MOCK_TRANSACTIONS.length - 1 ? 'border-b border-gray-100' : ''
              } hover:bg-gray-50/50 transition-colors`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{tx.merchant}</p>
                <p className="text-xs text-gray-500 mt-0.5">{tx.date}</p>
              </div>

              <div className="flex-1 text-center">
                {tx.status === 'auto' ? (
                  <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                    {tx.category}
                  </span>
                ) : (
                  <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors">
                    ✦ Categorise
                  </span>
                )}
              </div>

              <div
                className={`font-mono text-sm font-medium min-w-[80px] text-right ${
                  tx.type === 'income' ? 'text-green-600' : 'text-gray-900'
                }`}
              >
                {tx.type === 'income' ? '+' : '-'}
                {formatCurrency(tx.amount).replace('£', '£')}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
