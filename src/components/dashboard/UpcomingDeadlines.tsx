'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface Deadline {
  name: string;
  date: string;
  daysLeft: number;
  urgent: boolean;
}

// TODO: Replace with real deadline data from MTD obligations / HMRC calendar
const MOCK_DEADLINES: Deadline[] = [
  { name: 'Q3 Submission', date: '5 January 2027', daysLeft: 18, urgent: true },
  { name: 'Payment on Account', date: '31 January 2027', daysLeft: 44, urgent: false },
  { name: 'Q4 Submission', date: '5 April 2027', daysLeft: 108, urgent: false },
];

export function UpcomingDeadlines() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.6 }}
    >
      <Card>
        <CardContent>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Upcoming
          </h3>

          <div className="space-y-3">
            {MOCK_DEADLINES.map((deadline, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{deadline.name}</p>
                  <p className="text-xs text-gray-500">{deadline.date}</p>
                </div>

                {deadline.urgent ? (
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 shrink-0">
                    {deadline.daysLeft} days
                  </Badge>
                ) : (
                  <span className="text-xs font-medium text-gray-400 shrink-0">
                    {deadline.daysLeft} days
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
