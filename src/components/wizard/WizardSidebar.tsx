'use client';

import { useWizard } from '@/providers/WizardProvider';
import {
  CheckCircle2,
  ChevronDown,
  PlayCircle,
  Building2,
  Receipt,
  Briefcase,
  Home,
  Calculator,
  User,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionId, StepId } from '@/types/wizard';

interface SidebarSection {
  id: SectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  steps: StepId[];
  condition?: (data: { incomeSources: Array<{ type: string }>; connectionMethod: string | null }) => boolean;
}

const sections: SidebarSection[] = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    icon: PlayCircle,
    steps: ['residency', 'income-sources'],
  },
  {
    id: 'connect',
    label: 'Bank Connection',
    icon: Building2,
    steps: ['connect-choice', 'bank-connection', 'upload-statements', 'importing'],
  },
  {
    id: 'transactions',
    label: 'Transactions',
    icon: Receipt,
    steps: ['transactions', 'transactions-summary'],
    condition: (data) => data.connectionMethod !== 'manual',
  },
  {
    id: 'self-employment',
    label: 'Self Employed',
    icon: Briefcase,
    steps: [
      'self-employment-intro',
      'self-employment-income',
      'self-employment-expenses',
      'self-employment-summary',
    ],
    condition: (data) =>
      data.incomeSources.some((s) => s.type === 'self-employment'),
  },
  {
    id: 'rental',
    label: 'Rental',
    icon: Home,
    steps: ['rental-intro', 'rental-income', 'rental-expenses', 'rental-summary'],
    condition: (data) => data.incomeSources.some((s) => s.type === 'rental'),
  },
  {
    id: 'deductions',
    label: 'General',
    icon: Calculator,
    steps: ['deductions-mileage', 'deductions-home-office'],
  },
  {
    id: 'personal',
    label: 'Personal Info',
    icon: User,
    steps: ['personal-info'],
  },
  {
    id: 'review',
    label: 'Review & Submit',
    icon: Send,
    steps: ['review', 'submit', 'confirmation'],
  },
];

export function WizardSidebar() {
  const { currentStep, data, goToStep, getSectionStatus } = useWizard();

  // Filter sections based on conditions
  const visibleSections = sections.filter((section) => {
    if (!section.condition) return true;
    return section.condition(data);
  });

  // Get current section
  const currentSection = visibleSections.find((s) =>
    s.steps.includes(currentStep)
  );

  return (
    <aside className="w-full h-full bg-white border-r border-gray-200 hidden lg:block">
      <nav className="p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Menu
        </p>

        <ul className="space-y-1">
          {visibleSections.map((section) => {
            const status = getSectionStatus(section.id);
            const isActive = currentSection?.id === section.id;
            const Icon = section.icon;

            return (
              <li key={section.id}>
                <button
                  onClick={() => goToStep(section.steps[0])}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Icon
                      className={cn(
                        'h-5 w-5',
                        isActive ? 'text-emerald-600' : 'text-gray-400'
                      )}
                    />
                  )}

                  <span className="flex-1">{section.label}</span>

                  {isActive && (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
