'use client';

import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

interface Insight {
  icon: string;
  text: string;
  action: string;
  type: 'warning' | 'opportunity' | 'info';
}

// TODO: Replace with AI-generated insights based on user's financial data
const MOCK_INSIGHTS: Insight[] = [
  {
    icon: '⚠️',
    text: 'Your fuel expenses are 34% higher than Q2 — want me to check those?',
    action: 'Review fuel',
    type: 'warning',
  },
  {
    icon: '🎯',
    text: "You haven't claimed the £312 capital allowance on equipment bought in Oct",
    action: 'Claim now',
    type: 'opportunity',
  },
  {
    icon: '📊',
    text: 'Year-to-date tax estimate: £7,844 — down £420 from this time last year',
    action: 'See breakdown',
    type: 'info',
  },
];

function getBorderColor(type: Insight['type']) {
  switch (type) {
    case 'warning':
      return 'border-l-amber-400';
    case 'opportunity':
      return 'border-l-green-400';
    case 'info':
      return 'border-l-gray-300';
  }
}

export function AiInsightsPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
    >
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        AI Insights
      </h3>

      <div className="space-y-2.5">
        {MOCK_INSIGHTS.map((insight, i) => (
          <Card
            key={i}
            className={`py-3 border-l-4 ${getBorderColor(insight.type)} cursor-pointer hover:shadow-md transition-shadow`}
          >
            <CardContent className="px-4 py-0">
              <div className="flex gap-2.5 items-start">
                <span className="text-sm shrink-0">{insight.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 leading-relaxed">{insight.text}</p>
                  <button className="text-xs font-semibold text-[#00a8b0] mt-1.5 hover:text-[#00e3ec] transition-colors">
                    {insight.action} &rarr;
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
