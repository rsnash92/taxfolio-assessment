'use client';

import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';

// TODO: Replace with real YTD data computed from quarterly submissions
const MOCK_YTD = {
  totalIncome: 49490,
  totalExpenses: 10270,
  estimatedTax: 7844,
  yoyChange: -420, // negative = less tax than last year
};

export function YearToDateSummary() {
  const yoyText =
    MOCK_YTD.yoyChange < 0
      ? `↓ ${formatCurrency(Math.abs(MOCK_YTD.yoyChange))} less than last year`
      : `↑ ${formatCurrency(MOCK_YTD.yoyChange)} more than last year`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Card>
        <CardContent>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Year to Date
          </h3>

          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Income</p>
              <p className="text-xl font-bold font-mono text-gray-900">
                {formatCurrency(MOCK_YTD.totalIncome)}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Expenses</p>
              <p className="text-xl font-bold font-mono text-gray-900">
                {formatCurrency(MOCK_YTD.totalExpenses)}
              </p>
            </div>

            <div className="h-px bg-gray-200" />

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Estimated Tax</p>
              <p className="text-2xl font-bold font-mono text-[#00e3ec]">
                {formatCurrency(MOCK_YTD.estimatedTax)}
              </p>
              <p className="text-xs text-green-600 mt-1">{yoyText}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
