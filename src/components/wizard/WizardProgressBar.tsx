'use client';

import { useWizard } from '@/providers/WizardProvider';
import { getStepSection } from '@/lib/wizard/steps';
import { motion } from 'framer-motion';

// Define the main sections in order with their display info
const SECTIONS = [
  { id: 'getting-started', label: 'Getting Started', steps: ['residency', 'income-sources'] },
  { id: 'connect', label: 'Connect', steps: ['connect-choice', 'bank-connection', 'upload-statements', 'accounts', 'importing'] },
  { id: 'income', label: 'Income', steps: [
    'self-employment-list', 'self-employment-basics', 'self-employment-income', 'self-employment-expenses',
    'self-employment-capital-allowances', 'self-employment-losses', 'self-employment-summary',
    'rental-list', 'rental-details', 'rental-income', 'rental-expenses', 'rental-summary',
    'employment-list', 'employment-details', 'employment-income', 'employment-benefits', 'employment-expenses',
    'cis-income', 'dividends', 'interest',
    'capital-gains-disposals', 'capital-gains-summary',
    'pension-income', 'state-benefits', 'other-income'
  ]},
  { id: 'general', label: 'Tax Relief', steps: [
    'general-overview', 'general-marriage-allowance', 'general-blind-allowance',
    'general-pension', 'general-charitable', 'general-venture-capital'
  ]},
  { id: 'personal', label: 'Personal', steps: ['personal-info'] },
  { id: 'review', label: 'Review', steps: ['review-payment', 'review-summary', 'review-submit', 'review-confirmation'] },
];

export function WizardProgressBar() {
  const { currentStep, getSectionStatus } = useWizard();
  const currentSection = getStepSection(currentStep);

  // Find the current section index
  const currentSectionIndex = SECTIONS.findIndex(s =>
    s.id === currentSection ||
    s.steps.includes(currentStep) ||
    // Handle income section which combines multiple sections
    (s.id === 'income' && ['self-employment', 'rental', 'employment', 'cis', 'dividends', 'interest', 'capital-gains', 'pension-income', 'state-benefits', 'other-income'].includes(currentSection))
  );

  // Calculate overall progress (0 to 100)
  const progress = currentSectionIndex >= 0
    ? ((currentSectionIndex + 1) / SECTIONS.length) * 100
    : 0;

  return (
    <div className="bg-white border-b border-gray-100">
      {/* Progress bar */}
      <div className="h-1 bg-gray-100 relative">
        <motion.div
          className="h-full bg-gradient-to-r from-[#00e3ec] to-[#00c4d4]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
