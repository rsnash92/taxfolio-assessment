'use client';

import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function SelfEmploymentBasicsStep() {
  const { currentBusinessId, data, updateBusinessData, updateIncomeSource } = useWizard();

  if (!currentBusinessId) {
    return <div>No business selected</div>;
  }

  const businessData = data.selfEmploymentData[currentBusinessId] || {};
  const incomeSource = data.incomeSources.find((s) => s.id === currentBusinessId);

  const handleChange = (field: string, value: string) => {
    updateBusinessData(currentBusinessId, { [field]: value });

    // Also update the income source label if business name changes
    if (field === 'businessName' && incomeSource) {
      updateIncomeSource(currentBusinessId, {
        label: value || 'My Business',
        data: { ...incomeSource.data, businessName: value },
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">The Basics</h1>
        <p className="text-gray-600">
          Tell us about your self-employment business. This information is required for your SA103 form.
        </p>
      </div>

      <div className="space-y-6">
        {/* Business Name */}
        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name</Label>
          <Input
            id="businessName"
            placeholder="e.g., John Smith Consulting"
            value={businessData.businessName || ''}
            onChange={(e) => handleChange('businessName', e.target.value)}
          />
          <p className="text-sm text-gray-500">
            This is how your business will appear on your tax return
          </p>
        </div>

        {/* Business Description */}
        <div className="space-y-2">
          <Label htmlFor="businessDescription">Nature of Business</Label>
          <Textarea
            id="businessDescription"
            placeholder="e.g., IT consulting and software development"
            value={businessData.businessDescription || ''}
            onChange={(e) => handleChange('businessDescription', e.target.value)}
            rows={3}
          />
          <p className="text-sm text-gray-500">
            Briefly describe what your business does
          </p>
        </div>

        {/* Business Postcode */}
        <div className="space-y-2">
          <Label htmlFor="businessPostcode">Business Postcode</Label>
          <Input
            id="businessPostcode"
            placeholder="e.g., SW1A 1AA"
            value={businessData.businessPostcode || ''}
            onChange={(e) => handleChange('businessPostcode', e.target.value.toUpperCase())}
            className="max-w-[200px]"
          />
          <p className="text-sm text-gray-500">
            The postcode where your business is based (can be your home)
          </p>
        </div>

        {/* Accounting Method */}
        <div className="space-y-2">
          <Label htmlFor="accountingMethod">Accounting Method</Label>
          <Select
            value={businessData.accountingMethod || 'cash'}
            onValueChange={(value) => handleChange('accountingMethod', value)}
          >
            <SelectTrigger className="max-w-[300px]">
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash Basis</SelectItem>
              <SelectItem value="accruals">Traditional Accounting (Accruals)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500">
            Most small businesses use Cash Basis - you record income when received and expenses when paid
          </p>
        </div>

        {/* Accounting Period */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Accounting Period Start</Label>
            <Input
              id="startDate"
              type="date"
              value={businessData.startDate || '2024-04-06'}
              onChange={(e) => handleChange('startDate', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">Accounting Period End</Label>
            <Input
              id="endDate"
              type="date"
              value={businessData.endDate || '2025-04-05'}
              onChange={(e) => handleChange('endDate', e.target.value)}
            />
          </div>
        </div>
        <p className="text-sm text-gray-500">
          For most people this aligns with the tax year (6 April 2024 to 5 April 2025)
        </p>
      </div>

      <div className="mt-8">
        <WizardNavigation
          canContinue={
            !!businessData.businessName &&
            !!businessData.businessDescription
          }
        />
      </div>
    </div>
  );
}
