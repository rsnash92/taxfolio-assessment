'use client';

import { useState, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getSupportedTaxYears, getDeadlineStatus } from '@/lib/wizard/tax-years';

interface TaxYearSelectorProps {
  currentTaxYear: string;
  onTaxYearChange: (taxYear: string) => void;
}

export function TaxYearSelector({ currentTaxYear, onTaxYearChange }: TaxYearSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(currentTaxYear);
  const taxYears = getSupportedTaxYears();

  // Sync selectedYear when currentTaxYear prop changes or modal opens
  useEffect(() => {
    setSelectedYear(currentTaxYear);
  }, [currentTaxYear, isOpen]);

  const handleYearSelect = (taxYear: string) => {
    setSelectedYear(taxYear);
  };

  const handleConfirm = () => {
    if (selectedYear !== currentTaxYear) {
      onTaxYearChange(selectedYear);
    }
    setIsOpen(false);
  };

  // Get deadline status for the SELECTED year (for the warning)
  const selectedYearDeadline = getDeadlineStatus(selectedYear);

  return (
    <>
      {/* Clickable Tax Year Display */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <span className="text-gray-400">Tax year:</span>
        <span className="text-[#00c4d4] font-semibold">{currentTaxYear}</span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {/* Tax Year Selection Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Your current tax return year is {currentTaxYear}
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              Want to check another one of your returns? Not a problem. Select the year you want to view below.
            </DialogDescription>
          </DialogHeader>

          <p className="text-sm text-gray-500 mt-2">
            Don&apos;t worry - all your progress is saved, so you can pick up where you left off.
          </p>

          {/* Tax Year Selection */}
          <div className="mt-4 space-y-2">
            {taxYears.map((year) => {
              const isSelected = selectedYear === year.id;
              const isCurrent = year.isCurrent;
              const deadline = getDeadlineStatus(year.id);

              return (
                <button
                  key={year.id}
                  onClick={() => handleYearSelect(year.id)}
                  className={cn(
                    'w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all',
                    isSelected
                      ? 'border-[#00c4d4] bg-[#e6fafb]'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        isSelected ? 'bg-[#00c4d4]' : 'bg-gray-100'
                      )}
                    >
                      <Calendar
                        className={cn(
                          'h-5 w-5',
                          isSelected ? 'text-white' : 'text-gray-500'
                        )}
                      />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">
                        {year.label}
                        {isCurrent && (
                          <span className="ml-2 text-xs font-medium text-[#00c4d4]">
                            (current)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {deadline.isPastDeadline
                          ? `Deadline passed (${formatDate(deadline.deadlineDate)})`
                          : `Filing deadline: ${formatDate(deadline.deadlineDate)}`}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-[#00c4d4] flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Deadline Warning - show when switching to a year with passed deadline */}
          {selectedYearDeadline.isPastDeadline && selectedYear !== currentTaxYear && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                The filing deadline for {selectedYear} has passed. You may incur late filing penalties.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-gradient-to-r from-[#0f172a] to-[#1e293b] hover:from-[#1e293b] hover:to-[#334155]"
            >
              {selectedYear === currentTaxYear ? 'Keep Current' : 'Switch Year'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
