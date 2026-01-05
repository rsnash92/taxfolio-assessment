'use client';

import { useWizard } from '@/providers/WizardProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home, ArrowLeft } from 'lucide-react';

const PROPERTY_TYPES = [
  {
    id: 'residential',
    label: 'Residential',
    description: 'Standard buy-to-let or rented property',
  },
  {
    id: 'commercial',
    label: 'Commercial',
    description: 'Office, retail, or industrial property',
  },
  {
    id: 'holiday-let',
    label: 'Furnished Holiday Let',
    description: 'UK holiday accommodation (FHL rules apply)',
  },
];

export function RentalDetailsStep() {
  const {
    data,
    currentPropertyId,
    updatePropertyData,
    goNext,
    goToStep,
  } = useWizard();

  // Get current property data
  const property = currentPropertyId
    ? data.rentalData[currentPropertyId] || {}
    : {};

  // Get the income source for this property
  const incomeSource = data.incomeSources.find(
    (s) => s.id === currentPropertyId
  );

  const handleUpdate = (updates: Record<string, unknown>) => {
    if (currentPropertyId) {
      updatePropertyData(currentPropertyId, updates);
    }
  };

  const handleBack = () => {
    goToStep('rental-list');
  };

  const isValid =
    property.address &&
    property.postcode &&
    property.propertyType &&
    property.ownershipShare > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all properties
        </button>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[#e6fafb] rounded-lg flex items-center justify-center">
            <Home className="h-5 w-5 text-[#00c4d4]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Property Details
            </h1>
            <p className="text-sm text-gray-500">
              {incomeSource?.label || 'New Property'}
            </p>
          </div>
        </div>
        <p className="text-gray-600">
          Enter the details of your rental property. This information will be
          used to complete the SA105 form.
        </p>
      </div>

      {/* Property Address */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Property Address</h3>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              placeholder="e.g., 42 Oak Street, London"
              value={property.address || ''}
              onChange={(e) => handleUpdate({ address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="postcode">Postcode *</Label>
              <Input
                id="postcode"
                placeholder="e.g., SW1A 1AA"
                value={property.postcode || ''}
                onChange={(e) => handleUpdate({ postcode: e.target.value.toUpperCase() })}
                className="uppercase"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Property Type */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Property Type</h3>

        <div className="space-y-3">
          {PROPERTY_TYPES.map((type) => (
            <label
              key={type.id}
              className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                property.propertyType === type.id
                  ? 'border-[#00e3ec] bg-[#e6fafb]'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="propertyType"
                value={type.id}
                checked={property.propertyType === type.id}
                onChange={() => handleUpdate({ propertyType: type.id })}
                className="mt-1"
              />
              <div>
                <p className="font-medium text-gray-900">{type.label}</p>
                <p className="text-sm text-gray-500">{type.description}</p>
              </div>
            </label>
          ))}
        </div>

        {property.propertyType === 'holiday-let' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-amber-800">
              <strong>Furnished Holiday Let:</strong> Special rules apply. The
              property must be available for letting at least 210 days per year
              and actually let for at least 105 days. FHLs may qualify for
              Capital Gains Tax reliefs.
            </p>
          </div>
        )}
      </div>

      {/* Ownership Details */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Ownership Details</h3>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ownershipShare">Your Ownership Share (%) *</Label>
            <Input
              id="ownershipShare"
              type="number"
              min="1"
              max="100"
              placeholder="100"
              value={property.ownershipShare || ''}
              onChange={(e) =>
                handleUpdate({ ownershipShare: parseFloat(e.target.value) || 0 })
              }
            />
            <p className="text-xs text-gray-500">
              Enter your percentage share if the property is jointly owned.
              Income and expenses will be adjusted accordingly.
            </p>
          </div>

          {property.ownershipShare && property.ownershipShare < 100 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                As a joint owner with {property.ownershipShare}% share, only
                your portion of income and expenses will be included in your tax
                return.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mortgage / Finance Costs */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Finance Costs</h3>

        <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
          property.hasMortgage
            ? 'border-[#00e3ec] bg-[#e6fafb]'
            : 'border-gray-200 hover:border-gray-300'
        }`}>
          <input
            type="checkbox"
            checked={property.hasMortgage || false}
            onChange={(e) => handleUpdate({ hasMortgage: e.target.checked })}
            className="mt-1 accent-[#00e3ec]"
          />
          <div>
            <p className="font-medium text-gray-900">
              This property has a mortgage or other finance costs
            </p>
            <p className="text-sm text-gray-500">
              Enable to claim Section 24 tax credit on mortgage interest
            </p>
          </div>
        </label>

        {property.hasMortgage && (
          <div className="grid gap-4 mt-4">
            <div className="grid gap-2">
              <Label htmlFor="mortgageInterest">
                Annual Mortgage Interest (£)
              </Label>
              <Input
                id="mortgageInterest"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={property.mortgageInterest || ''}
                onChange={(e) =>
                  handleUpdate({
                    mortgageInterest: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="otherFinanceCosts">
                Other Finance Costs (£)
              </Label>
              <Input
                id="otherFinanceCosts"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={property.otherFinanceCosts || ''}
                onChange={(e) =>
                  handleUpdate({
                    otherFinanceCosts: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-gray-500">
                Including arrangement fees, loan interest, etc.
              </p>
            </div>

            <div className="bg-[#e6fafb] border border-[#99ebef] rounded-lg p-4">
              <p className="text-sm text-[#00a8b0]">
                <strong>Section 24:</strong> Residential landlords receive a 20%
                tax credit on finance costs rather than a full deduction. This
                will be calculated automatically.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
        <Button
          onClick={goNext}
          className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] hover:from-[#1e293b] hover:to-[#334155]"
          disabled={!isValid}
        >
          Continue to Income
        </Button>
      </div>
    </div>
  );
}
