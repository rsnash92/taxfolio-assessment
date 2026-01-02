'use client';

import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import {
  Briefcase,
  Plus,
  ChevronRight,
  CheckCircle2,
  Clock,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function SelfEmploymentListStep() {
  const {
    data,
    goToBusinessStep,
    updateData,
    deleteIncomeSource,
    updateBusinessData,
  } = useWizard();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Get all self-employment businesses
  const businesses = data.incomeSources.filter(
    (s) => s.type === 'self-employment'
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const getBusinessStatus = (
    businessId: string
  ): 'not_started' | 'in_progress' | 'complete' => {
    const businessData = data.selfEmploymentData[businessId];
    if (!businessData) return 'not_started';
    if (businessData.isComplete) return 'complete';
    if (
      businessData.businessName ||
      businessData.income?.total ||
      businessData.expenses?.total
    ) {
      return 'in_progress';
    }
    return 'not_started';
  };

  const getBusinessProfit = (businessId: string) => {
    const businessData = data.selfEmploymentData[businessId];
    if (!businessData) return 0;
    return businessData.profit || 0;
  };

  const handleAddBusiness = () => {
    // Create a new business
    const newId = `source-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    updateData({
      incomeSources: [
        ...data.incomeSources,
        {
          id: newId,
          type: 'self-employment',
          label: 'New Business',
          data: {},
        },
      ],
    });
    // Navigate to the basics step for the new business
    goToBusinessStep(newId, 'self-employment-basics');
  };

  const handleEditBusiness = (businessId: string) => {
    goToBusinessStep(businessId, 'self-employment-basics');
  };

  const handleCompleteBusiness = (businessId: string) => {
    const businessData = data.selfEmploymentData[businessId];
    if (!businessData?.isComplete) {
      // Go to summary to complete
      goToBusinessStep(businessId, 'self-employment-summary');
    }
  };

  const handleDeleteBusiness = (businessId: string) => {
    setDeletingId(businessId);
  };

  const confirmDelete = () => {
    if (deletingId) {
      deleteIncomeSource(deletingId);
      // Also remove the business data
      const newSelfEmploymentData = { ...data.selfEmploymentData };
      delete newSelfEmploymentData[deletingId];
      updateData({ selfEmploymentData: newSelfEmploymentData });
      setDeletingId(null);
    }
  };

  const completedCount = businesses.filter(
    (b) => getBusinessStatus(b.id) === 'complete'
  ).length;
  const allComplete = completedCount === businesses.length && businesses.length > 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Self-Employment
        </h1>
        <p className="text-gray-600">
          {businesses.length === 0
            ? 'Add your self-employed businesses to include them in your tax return.'
            : `You have ${businesses.length} self-employed ${businesses.length === 1 ? 'business' : 'businesses'}. ${completedCount} of ${businesses.length} complete.`}
        </p>
      </div>

      {/* Business List */}
      <div className="space-y-3 mb-6">
        {businesses.map((business) => {
          const status = getBusinessStatus(business.id);
          const businessData = data.selfEmploymentData[business.id];
          const businessName =
            businessData?.businessName || business.label || 'Unnamed Business';
          const profit = getBusinessProfit(business.id);

          return (
            <div
              key={business.id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      status === 'complete'
                        ? 'bg-emerald-100'
                        : status === 'in_progress'
                          ? 'bg-amber-100'
                          : 'bg-gray-100'
                    )}
                  >
                    <Briefcase
                      className={cn(
                        'h-6 w-6',
                        status === 'complete'
                          ? 'text-emerald-600'
                          : status === 'in_progress'
                            ? 'text-amber-600'
                            : 'text-gray-400'
                      )}
                    />
                  </div>

                  {/* Business Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {businessName}
                      </h3>
                      {status === 'complete' && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          status === 'complete'
                            ? 'bg-emerald-100 text-emerald-700'
                            : status === 'in_progress'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {status === 'complete'
                          ? 'Complete'
                          : status === 'in_progress'
                            ? 'In Progress'
                            : 'Not Started'}
                      </span>
                      {status === 'complete' && (
                        <span className="text-sm text-gray-500">
                          {profit >= 0 ? 'Profit' : 'Loss'}:{' '}
                          {formatCurrency(Math.abs(profit))}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditBusiness(business.id)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBusiness(business.id)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {status !== 'complete' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCompleteBusiness(business.id)}
                        className="ml-2"
                      >
                        {status === 'in_progress' ? 'Continue' : 'Start'}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Business Button */}
      <button
        onClick={handleAddBusiness}
        className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-5 w-5" />
        <span className="font-medium">Add Self-Employed Business</span>
      </button>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDeletingId(null)}
          />
          <div className="relative bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Business?
            </h3>
            <p className="text-gray-600 mb-4">
              This will remove this business and all its data from your tax
              return. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeletingId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={confirmDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Status Message */}
      {!allComplete && businesses.length > 0 && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-500" />
            <div>
              <p className="font-medium text-amber-900">
                {completedCount} of {businesses.length} businesses complete
              </p>
              <p className="text-sm text-amber-700">
                Complete all businesses to continue to the next section
              </p>
            </div>
          </div>
        </div>
      )}

      {allComplete && (
        <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="font-medium text-emerald-900">
                All businesses complete!
              </p>
              <p className="text-sm text-emerald-700">
                You can continue to the next section or add more businesses
              </p>
            </div>
          </div>
        </div>
      )}

      <WizardNavigation
        canContinue={allComplete || businesses.length === 0}
        continueLabel={businesses.length === 0 ? 'Skip' : 'Continue'}
      />
    </div>
  );
}
