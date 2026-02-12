'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Quarter {
  id: string;
  period: string;
  status: 'submitted' | 'review' | 'upcoming';
  income?: number;
  expenses?: number;
  tax?: number;
  submittedDate?: string;
  dueDate?: string;
  daysLeft?: number;
  progress?: number;
  unreviewed?: number;
}

// TODO: Replace with real data from MTD quarterly submissions / Supabase
const MOCK_QUARTERS: Quarter[] = [
  {
    id: 'Q1',
    period: 'Apr – Jul 2026',
    status: 'submitted',
    income: 16240,
    expenses: 3120,
    tax: 2624,
    submittedDate: '5 Jul 2026',
    progress: 100,
  },
  {
    id: 'Q2',
    period: 'Jul – Oct 2026',
    status: 'submitted',
    income: 18450,
    expenses: 4210,
    tax: 2848,
    submittedDate: '5 Oct 2026',
    progress: 100,
  },
  {
    id: 'Q3',
    period: 'Oct – Jan 2027',
    status: 'review',
    income: 14800,
    expenses: 2940,
    tax: 2372,
    dueDate: '5 Jan 2027',
    daysLeft: 18,
    progress: 87,
    unreviewed: 8,
  },
  {
    id: 'Q4',
    period: 'Jan – Apr 2027',
    status: 'upcoming',
    dueDate: '5 Apr 2027',
    progress: 0,
  },
];

function getStatusBadge(status: Quarter['status']) {
  switch (status) {
    case 'submitted':
      return (
        <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50">
          Submitted ✓
        </Badge>
      );
    case 'review':
      return (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">
          Ready for review
        </Badge>
      );
    case 'upcoming':
      return (
        <Badge className="bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-50">
          Upcoming
        </Badge>
      );
  }
}

export function MtdQuarterCards() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">MTD Quarters</h2>
        <span className="text-xs text-gray-500">2026/27 Tax Year</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {MOCK_QUARTERS.map((q, i) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
          >
            <Card
              className={`py-4 transition-all hover:shadow-md ${
                q.status === 'review' ? 'cursor-pointer ring-1 ring-amber-200' : ''
              }`}
            >
              <CardContent className="px-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">{q.id}</span>
                  {getStatusBadge(q.status)}
                </div>

                <p className="text-xs text-gray-500">{q.period}</p>

                {q.status !== 'upcoming' ? (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Income</span>
                        <span className="font-medium font-mono text-gray-900">
                          {formatCurrency(q.income ?? 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Expenses</span>
                        <span className="font-medium font-mono text-gray-900">
                          {formatCurrency(q.expenses ?? 0)}
                        </span>
                      </div>
                      <div className="h-px bg-gray-100 my-1" />
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Est. Tax</span>
                        <span
                          className={`font-semibold font-mono ${
                            q.status === 'submitted' ? 'text-green-600' : 'text-amber-600'
                          }`}
                        >
                          {formatCurrency(q.tax ?? 0)}
                        </span>
                      </div>
                    </div>

                    {q.status === 'review' && (
                      <div className="pt-1">
                        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                          <span>{q.unreviewed} to review</span>
                          <span>{q.daysLeft} days left</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-1000"
                            style={{ width: `${q.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {q.status === 'submitted' && (
                      <p className="text-[10px] text-gray-400 pt-1">
                        Submitted {q.submittedDate}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-gray-400 italic">
                    <p>Opens Jan 2027</p>
                    <p className="text-[10px] text-gray-400 mt-2">Due {q.dueDate}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
