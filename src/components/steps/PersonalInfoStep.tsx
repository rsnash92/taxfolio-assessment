'use client';

import { useState, useEffect } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import {
  User,
  FileText,
  CreditCard,
  MapPin,
  Info,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Calendar,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// NINO validation regex - official HMRC pattern
const NINO_REGEX = /^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/i;

// UTR validation - 10 digits
const UTR_REGEX = /^\d{10}$/;

// UK postcode validation
const POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export function PersonalInfoStep() {
  const { data, updateData, goNext } = useWizard();
  const personalInfo = data.personalInfo || {
    fullName: '',
    utr: '',
    nino: '',
    address: '',
    postcode: '',
    addressChanged: null,
  };

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [hasLoadedUserName, setHasLoadedUserName] = useState(false);

  // Auto-fill name from user profile on mount
  useEffect(() => {
    if (hasLoadedUserName || personalInfo.fullName) return;

    const loadUserName = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user?.user_metadata?.full_name && !personalInfo.fullName) {
        updateData({
          personalInfo: {
            ...personalInfo,
            fullName: user.user_metadata.full_name,
          },
        });
      }
      setHasLoadedUserName(true);
    };

    loadUserName();
  }, [hasLoadedUserName, personalInfo, updateData]);

  const handleChange = (field: string, value: string | boolean | null) => {
    // Format NINO - uppercase and remove spaces
    if (field === 'nino' && typeof value === 'string') {
      value = value.toUpperCase().replace(/\s/g, '');
    }

    // Format UTR - remove non-digits
    if (field === 'utr' && typeof value === 'string') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }

    // Format postcodes - uppercase
    if ((field === 'postcode' || field === 'newPostcode') && typeof value === 'string') {
      value = value.toUpperCase();
    }

    updateData({
      personalInfo: {
        ...personalInfo,
        [field]: value,
      },
    });

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }

    // Clear new address fields if addressChanged is set to false
    if (field === 'addressChanged' && value === false) {
      updateData({
        personalInfo: {
          ...personalInfo,
          addressChanged: false,
          newAddress: undefined,
          newPostcode: undefined,
          moveDate: undefined,
        },
      });
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field);
  };

  const validateField = (field: string) => {
    let error = '';

    switch (field) {
      case 'fullName':
        if (!personalInfo.fullName.trim()) {
          error = 'Full name is required';
        } else if (personalInfo.fullName.trim().split(' ').length < 2) {
          error = 'Please enter your full name (first and last name)';
        }
        break;
      case 'nino':
        if (!personalInfo.nino) {
          error = 'National Insurance number is required';
        } else if (!NINO_REGEX.test(personalInfo.nino)) {
          error = 'Please enter a valid National Insurance number (e.g. QQ123456A)';
        }
        break;
      case 'utr':
        if (personalInfo.utr && !UTR_REGEX.test(personalInfo.utr)) {
          error = 'UTR must be exactly 10 digits';
        }
        break;
      case 'address':
        if (!personalInfo.address.trim()) {
          error = 'Address is required';
        }
        break;
      case 'postcode':
        if (!personalInfo.postcode) {
          error = 'Postcode is required';
        } else if (!POSTCODE_REGEX.test(personalInfo.postcode.replace(/\s/g, ''))) {
          error = 'Please enter a valid UK postcode';
        }
        break;
      case 'newAddress':
        if (personalInfo.addressChanged && !personalInfo.newAddress?.trim()) {
          error = 'New address is required';
        }
        break;
      case 'newPostcode':
        if (personalInfo.addressChanged && !personalInfo.newPostcode) {
          error = 'New postcode is required';
        } else if (personalInfo.addressChanged && personalInfo.newPostcode && !POSTCODE_REGEX.test(personalInfo.newPostcode.replace(/\s/g, ''))) {
          error = 'Please enter a valid UK postcode';
        }
        break;
      case 'moveDate':
        if (personalInfo.addressChanged && !personalInfo.moveDate) {
          error = 'Move date is required';
        }
        break;
    }

    setErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  };

  const validateAll = () => {
    const fields = ['fullName', 'nino', 'address', 'postcode'];
    let isValid = true;

    fields.forEach((field) => {
      if (!validateField(field)) {
        isValid = false;
      }
    });

    // UTR is optional but validate if provided
    if (personalInfo.utr) {
      if (!validateField('utr')) {
        isValid = false;
      }
    }

    // Validate address change fields if applicable
    if (personalInfo.addressChanged === true) {
      ['newAddress', 'newPostcode', 'moveDate'].forEach((field) => {
        if (!validateField(field)) {
          isValid = false;
        }
      });
    }

    // Check if address change question is answered
    if (personalInfo.addressChanged === null) {
      isValid = false;
    }

    return isValid;
  };

  const handleContinue = () => {
    if (validateAll()) {
      goNext();
    } else {
      // Mark all fields as touched to show errors
      setTouched({
        fullName: true,
        nino: true,
        utr: true,
        address: true,
        postcode: true,
        newAddress: true,
        newPostcode: true,
        moveDate: true,
      });
    }
  };

  const baseValid =
    personalInfo.fullName.trim().split(' ').length >= 2 &&
    NINO_REGEX.test(personalInfo.nino) &&
    personalInfo.address.trim().length > 0 &&
    POSTCODE_REGEX.test(personalInfo.postcode.replace(/\s/g, '')) &&
    (!personalInfo.utr || UTR_REGEX.test(personalInfo.utr)) &&
    personalInfo.addressChanged !== null;

  const addressChangeValid =
    personalInfo.addressChanged === false ||
    (personalInfo.addressChanged === true &&
      (personalInfo.newAddress?.trim().length ?? 0) > 0 &&
      POSTCODE_REGEX.test((personalInfo.newPostcode || '').replace(/\s/g, '')) &&
      !!personalInfo.moveDate);

  const isValid = baseValid && addressChangeValid;

  // Format NINO for display (add spaces)
  const formatNINODisplay = (nino: string) => {
    if (nino.length <= 2) return nino;
    return nino.replace(/^(.{2})(.{2})(.{2})(.{2})(.?)$/, '$1 $2 $3 $4 $5').trim();
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <p className="text-sm text-gray-500 mb-2">Almost there</p>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          Your personal details
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          We need some information about you to complete your tax return and submit it to HMRC.
        </p>
      </div>

      {/* Form Fields */}
      <div className="space-y-6 mb-6 sm:mb-8">
        {/* Full Name */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm sm:text-base font-medium text-gray-900">
            <User className="h-4 w-4 text-gray-400" />
            Full legal name
            <span className="text-red-500">*</span>
          </label>
          <p className="text-xs sm:text-sm text-gray-500">
            As it appears on your official documents
          </p>
          <Input
            placeholder="e.g. John David Smith"
            value={personalInfo.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            onBlur={() => handleBlur('fullName')}
            className={cn(
              'h-11 sm:h-12 text-sm sm:text-base rounded-xl bg-white',
              errors.fullName && touched.fullName
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-200 focus:border-[#00e3ec] focus:ring-[#00e3ec]'
            )}
          />
          {errors.fullName && touched.fullName && (
            <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.fullName}
            </p>
          )}
        </div>

        {/* National Insurance Number */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm sm:text-base font-medium text-gray-900">
            <CreditCard className="h-4 w-4 text-gray-400" />
            National Insurance number
            <span className="text-red-500">*</span>
            <HelpCircle className="h-4 w-4 text-gray-400" />
          </label>
          <p className="text-xs sm:text-sm text-gray-500">
            Found on your payslip, P60, or letters from HMRC
          </p>
          <Input
            placeholder="e.g. QQ 12 34 56 A"
            value={formatNINODisplay(personalInfo.nino)}
            onChange={(e) => handleChange('nino', e.target.value)}
            onBlur={() => handleBlur('nino')}
            maxLength={13}
            className={cn(
              'h-11 sm:h-12 text-sm sm:text-base rounded-xl bg-white max-w-xs font-mono tracking-wider',
              errors.nino && touched.nino
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-200 focus:border-[#00e3ec] focus:ring-[#00e3ec]'
            )}
          />
          {errors.nino && touched.nino && (
            <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.nino}
            </p>
          )}
          {!errors.nino && personalInfo.nino && NINO_REGEX.test(personalInfo.nino) && (
            <p className="text-xs sm:text-sm text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Valid format
            </p>
          )}
        </div>

        {/* UTR (Optional) */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm sm:text-base font-medium text-gray-900">
            <FileText className="h-4 w-4 text-gray-400" />
            Unique Taxpayer Reference (UTR)
            <span className="text-xs text-gray-400 font-normal">(Optional)</span>
            <HelpCircle className="h-4 w-4 text-gray-400" />
          </label>
          <p className="text-xs sm:text-sm text-gray-500">
            Your 10-digit UTR from HMRC. If you don&apos;t have one yet, leave this blank.
          </p>
          <Input
            placeholder="e.g. 1234567890"
            value={personalInfo.utr}
            onChange={(e) => handleChange('utr', e.target.value)}
            onBlur={() => handleBlur('utr')}
            maxLength={10}
            className={cn(
              'h-11 sm:h-12 text-sm sm:text-base rounded-xl bg-white max-w-xs font-mono tracking-wider',
              errors.utr && touched.utr
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-200 focus:border-[#00e3ec] focus:ring-[#00e3ec]'
            )}
          />
          {errors.utr && touched.utr && (
            <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.utr}
            </p>
          )}
        </div>

        {/* Address */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm sm:text-base font-medium text-gray-900">
            <MapPin className="h-4 w-4 text-gray-400" />
            Home address
            <span className="text-red-500">*</span>
          </label>
          <p className="text-xs sm:text-sm text-gray-500">
            Your address at the start of the tax year (6 April 2024)
          </p>
          <textarea
            placeholder="e.g. 123 High Street, Flat 4, London"
            value={personalInfo.address}
            onChange={(e) => handleChange('address', e.target.value)}
            onBlur={() => handleBlur('address')}
            rows={3}
            className={cn(
              'w-full px-3 py-2 text-sm sm:text-base rounded-xl bg-white border resize-none',
              errors.address && touched.address
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-200 focus:border-[#00e3ec] focus:ring-[#00e3ec]',
              'focus:outline-none focus:ring-2 focus:ring-offset-0'
            )}
          />
          {errors.address && touched.address && (
            <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.address}
            </p>
          )}
        </div>

        {/* Postcode */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm sm:text-base font-medium text-gray-900">
            Postcode
            <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="e.g. SW1A 1AA"
            value={personalInfo.postcode}
            onChange={(e) => handleChange('postcode', e.target.value)}
            onBlur={() => handleBlur('postcode')}
            maxLength={8}
            className={cn(
              'h-11 sm:h-12 text-sm sm:text-base rounded-xl bg-white max-w-xs',
              errors.postcode && touched.postcode
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-200 focus:border-[#00e3ec] focus:ring-[#00e3ec]'
            )}
          />
          {errors.postcode && touched.postcode && (
            <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.postcode}
            </p>
          )}
        </div>
      </div>

      {/* Address Change Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Home className="h-5 w-5 text-gray-400" />
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">
            Change of home address
          </h2>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Did your home address change during the tax year?
        </p>

        {/* Yes/No Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            type="button"
            onClick={() => handleChange('addressChanged', true)}
            className={cn(
              'flex-1 py-3 px-4 rounded-xl border-2 text-sm sm:text-base font-medium transition-all',
              personalInfo.addressChanged === true
                ? 'border-[#00e3ec] bg-[#e6fafb] text-[#00a8b0]'
                : 'border-gray-200 text-gray-700 hover:border-gray-300 bg-white'
            )}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => handleChange('addressChanged', false)}
            className={cn(
              'flex-1 py-3 px-4 rounded-xl border-2 text-sm sm:text-base font-medium transition-all',
              personalInfo.addressChanged === false
                ? 'border-[#00e3ec] bg-[#e6fafb] text-[#00a8b0]'
                : 'border-gray-200 text-gray-700 hover:border-gray-300 bg-white'
            )}
          >
            No
          </button>
        </div>

        {/* New Address Fields - shown when addressChanged is true */}
        {personalInfo.addressChanged === true && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Please enter your new home address
            </p>

            {/* New Address */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
                New address
                <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder="Enter your new address"
                value={personalInfo.newAddress || ''}
                onChange={(e) => handleChange('newAddress', e.target.value)}
                onBlur={() => handleBlur('newAddress')}
                rows={3}
                className={cn(
                  'w-full px-3 py-2 text-sm sm:text-base rounded-xl bg-white border resize-none',
                  errors.newAddress && touched.newAddress
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-200 focus:border-[#00e3ec] focus:ring-[#00e3ec]',
                  'focus:outline-none focus:ring-2 focus:ring-offset-0'
                )}
              />
              {errors.newAddress && touched.newAddress && (
                <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.newAddress}
                </p>
              )}
            </div>

            {/* New Postcode */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
                New postcode
                <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. SW1A 1AA"
                value={personalInfo.newPostcode || ''}
                onChange={(e) => handleChange('newPostcode', e.target.value)}
                onBlur={() => handleBlur('newPostcode')}
                maxLength={8}
                className={cn(
                  'h-11 sm:h-12 text-sm sm:text-base rounded-xl bg-white max-w-xs',
                  errors.newPostcode && touched.newPostcode
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-200 focus:border-[#00e3ec] focus:ring-[#00e3ec]'
                )}
              />
              {errors.newPostcode && touched.newPostcode && (
                <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.newPostcode}
                </p>
              )}
            </div>

            {/* Move Date */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <Calendar className="h-4 w-4 text-gray-400" />
                When did you move?
                <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={personalInfo.moveDate || ''}
                onChange={(e) => handleChange('moveDate', e.target.value)}
                onBlur={() => handleBlur('moveDate')}
                min="2024-04-06"
                max="2025-04-05"
                className={cn(
                  'h-11 sm:h-12 text-sm sm:text-base rounded-xl bg-white max-w-xs',
                  errors.moveDate && touched.moveDate
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-200 focus:border-[#00e3ec] focus:ring-[#00e3ec]'
                )}
              />
              {errors.moveDate && touched.moveDate && (
                <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.moveDate}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 mb-6 sm:mb-8">
        <div className="flex items-start gap-2 sm:gap-3">
          <Info className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs sm:text-sm">
            <p className="text-blue-800 font-medium">Why do we need this?</p>
            <p className="text-blue-600">
              HMRC requires your National Insurance number to identify your tax return.
              Your address details help HMRC send any correspondence to the correct location.
            </p>
          </div>
        </div>
      </div>

      {/* Security Note */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 sm:p-4 mb-6 sm:mb-8">
        <div className="flex items-start gap-2 sm:gap-3">
          <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <div className="text-xs sm:text-sm">
            <p className="text-gray-800 font-medium">Your data is secure</p>
            <p className="text-gray-600">
              We use bank-level encryption and never share your personal information with third parties.
            </p>
          </div>
        </div>
      </div>

      <WizardNavigation
        canContinue={isValid}
        onContinue={handleContinue}
        continueLabel="Continue"
      />
    </div>
  );
}
