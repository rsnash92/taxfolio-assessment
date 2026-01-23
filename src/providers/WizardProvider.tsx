'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  WizardContextType,
  WizardData,
  StepId,
  IncomeSource,
  Transaction,
  SectionId,
  SelfEmploymentBusiness,
  RentalProperty,
  EmploymentData,
} from '@/types/wizard';
import {
  getVisibleSteps,
  getNextStep,
  getPreviousStep,
} from '@/lib/wizard/steps';
import { calculateTaxForWizard } from '@/lib/wizard/tax-mapping';
import {
  fetchIntroData,
  applyIntroDataToWizard,
  hasIntroData,
} from '@/lib/wizard/intro-data';

const initialData: WizardData = {
  sessionId: null,
  taxYear: '2024-25',
  isUKResident: null,
  incomeSources: [],
  connectionMethod: null,
  bankConnected: false,
  bankAccounts: [],
  selectedAccountIds: [],
  bankName: null,
  bankImportData: null,
  transactions: [],
  transactionsReviewed: false,
  selfEmploymentData: {},
  rentalData: {},
  employmentData: {},
  cisData: {},
  dividendsData: {},
  interestData: {},
  capitalGainsData: {},
  pensionIncomeData: {},
  stateBenefitsData: {},
  general: {
    selectedReliefs: [],
  },
  otherIncome: {
    interest: 0,
    dividends: 0,
    pension: 0,
    stateBenefits: 0,
    other: 0,
  },
  deductions: {
    mileage: { miles: 0, rate: 0.45, total: 0 },
    homeOffice: { amount: 0, method: 'simplified' },
    pensionContributions: 0,
    giftAid: 0,
  },
  personalInfo: {
    fullName: '',
    utr: '',
    nino: '',
    address: '',
    postcode: '',
    addressChanged: null,
  },
  taxCalculation: null,
  payment: null,
  submission: null,
};

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export function WizardProvider({
  children,
  userId,
  initialTaxYear,
}: {
  children: ReactNode;
  userId?: string;
  initialTaxYear?: string;
}) {
  const [currentStep, setCurrentStep] = useState<StepId>('residency');
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
  const [currentPropertyId, setCurrentPropertyId] = useState<string | null>(null);
  const [currentEmployerId, setCurrentEmployerId] = useState<string | null>(null);
  const [data, setData] = useState<WizardData>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSwitchingYear, setIsSwitchingYear] = useState(false);
  const [navigationDirection, setNavigationDirection] = useState<'forward' | 'backward'>('forward');

  // Helper to load data for a specific tax year
  const loadTaxYearData = useCallback(async (taxYear: string): Promise<{
    data: WizardData;
    step: StepId | null;
    businessId: string | null;
    propertyId: string | null;
  }> => {
    let loadedData = { ...initialData, taxYear };
    let savedStep: StepId | null = null;
    let savedBusinessId: string | null = null;
    let savedPropertyId: string | null = null;

    if (userId) {
      try {
        const response = await fetch(`/api/wizard-progress?taxYear=${taxYear}`);
        const result = await response.json();

        if (result.success && result.data) {
          // Exclude taxCalculation from loaded data - always compute fresh
          const { taxCalculation: _ignored, ...wizardDataWithoutCalc } = result.data.wizardData || {};
          loadedData = { ...initialData, ...wizardDataWithoutCalc, taxYear, taxCalculation: null };
          savedStep = result.data.currentStep;
          savedBusinessId = result.data.currentBusinessId;
          savedPropertyId = result.data.currentPropertyId;
        }
      } catch (error) {
        console.warn('[WizardProvider] Failed to load from database:', error);
      }
    }

    return { data: loadedData, step: savedStep, businessId: savedBusinessId, propertyId: savedPropertyId };
  }, [userId]);

  // Load existing session on mount
  useEffect(() => {
    async function loadSession() {
      setIsLoading(true);

      let loadedData = initialData;
      let savedStep: StepId | null = null;
      let savedBusinessId: string | null = null;
      let savedPropertyId: string | null = null;

      // Determine which tax year to load (from URL param or default to 2024-25)
      const taxYearToLoad = initialTaxYear || '2024-25';

      // Try to load from database if user is authenticated
      if (userId) {
        try {
          const response = await fetch(`/api/wizard-progress?taxYear=${taxYearToLoad}`);
          const result = await response.json();

          if (result.success && result.data) {
            // Exclude taxCalculation from loaded data - always compute fresh
            const { taxCalculation: _ignored, ...wizardDataWithoutCalc } = result.data.wizardData || {};
            loadedData = { ...initialData, ...wizardDataWithoutCalc, taxCalculation: null };
            savedStep = result.data.currentStep;
            savedBusinessId = result.data.currentBusinessId;
            savedPropertyId = result.data.currentPropertyId;
          }
        } catch (error) {
          console.warn('[WizardProvider] Failed to load from database:', error);
        }
      }

      // Fallback to localStorage ONLY if user is NOT authenticated
      // When user IS authenticated, we trust the database as the source of truth
      // localStorage might contain another user's data
      if (!userId && !savedStep) {
        const localData = localStorage.getItem('wizard-data');
        const localStep = localStorage.getItem('wizard-step');
        const localBusinessId = localStorage.getItem('wizard-business-id');
        const localPropertyId = localStorage.getItem('wizard-property-id');

        if (localData) {
          try {
            const parsedData = JSON.parse(localData);
            // Exclude taxCalculation from loaded data - always compute fresh
            const { taxCalculation: _ignored, ...dataWithoutCalc } = parsedData;
            loadedData = { ...initialData, ...dataWithoutCalc, taxCalculation: null };
            savedStep = localStep as StepId | null;
            savedBusinessId = localBusinessId;
            savedPropertyId = localPropertyId;
          } catch {
            // Use initial data if parse fails
          }
        }
      }

      // If user is authenticated, clear localStorage to prevent data leaking between users
      if (userId) {
        localStorage.removeItem('wizard-data');
        localStorage.removeItem('wizard-step');
        localStorage.removeItem('wizard-business-id');
        localStorage.removeItem('wizard-property-id');
      }

      // Fetch intro data if user is authenticated and we don't already have it
      if (userId && !hasIntroData(loadedData)) {
        try {
          const introResult = await fetchIntroData(userId);
          if (introResult.success && introResult.data) {
            console.log('Applying intro data to wizard:', introResult.data);
            loadedData = applyIntroDataToWizard(introResult.data, loadedData) as WizardData;
          }
        } catch (error) {
          console.warn('Failed to fetch intro data:', error);
        }
      }

      setData(loadedData);

      if (savedStep) {
        setCurrentStep(savedStep);
      }

      if (savedBusinessId) {
        setCurrentBusinessId(savedBusinessId);
      }

      if (savedPropertyId) {
        setCurrentPropertyId(savedPropertyId);
      }

      // Check for bank connection callback
      const urlParams = new URLSearchParams(window.location.search);
      const bankConnected = urlParams.get('bank_connected') === 'true';
      const bankError = urlParams.get('bank_error');

      if (bankConnected) {
        console.log('Bank connected! Redirecting to accounts step...');

        // Update data with bank connected status
        // Transactions will be fetched in AccountsStep when user clicks Import
        setData((prev) => ({
          ...prev,
          bankConnected: true,
          connectionMethod: 'bank',
        }));
        // Move to accounts step where user can see accounts and import transactions
        setCurrentStep('accounts');
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      } else if (bankError) {
        console.error('Bank connection error:', bankError);
        // Stay on connect step, error will be shown
        setCurrentStep('connect-choice');
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      }

      setIsLoading(false);
    }

    loadSession();
  }, [userId, initialTaxYear]);

  // Save progress to database (or localStorage for unauthenticated users)
  const saveProgress = useCallback(async () => {
    setIsSaving(true);

    // Save to database if user is authenticated
    if (userId) {
      try {
        const response = await fetch('/api/wizard-progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            wizardData: data,
            currentStep,
            currentBusinessId,
            currentPropertyId,
            taxYear: data.taxYear, // Explicitly pass tax year
          }),
        });

        const result = await response.json();
        if (!result.success) {
          console.error('[WizardProvider] Failed to save to database:', result.error, result.details);
        } else {
          console.log('[WizardProvider] Progress saved successfully');
        }
      } catch (error) {
        console.error('[WizardProvider] Failed to save to database:', error);
      }
    } else {
      // Save to localStorage only for unauthenticated users
      localStorage.setItem('wizard-data', JSON.stringify(data));
      localStorage.setItem('wizard-step', currentStep);
      if (currentBusinessId) {
        localStorage.setItem('wizard-business-id', currentBusinessId);
      } else {
        localStorage.removeItem('wizard-business-id');
      }
      if (currentPropertyId) {
        localStorage.setItem('wizard-property-id', currentPropertyId);
      } else {
        localStorage.removeItem('wizard-property-id');
      }
    }

    setIsSaving(false);
  }, [data, currentStep, currentBusinessId, currentPropertyId, userId]);

  // Switch to a different tax year - saves current, loads new
  const switchTaxYear = useCallback(async (newTaxYear: string) => {
    if (newTaxYear === data.taxYear) return;

    setIsSwitchingYear(true);

    try {
      // First, save current year's progress
      if (userId) {
        await fetch('/api/wizard-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wizardData: data,
            currentStep,
            currentBusinessId,
            currentPropertyId,
            taxYear: data.taxYear,
          }),
        });
      }

      // Then load the new year's data
      const result = await loadTaxYearData(newTaxYear);

      // Update all state with new year's data
      setData(result.data);
      setCurrentStep(result.step || 'residency');
      setCurrentBusinessId(result.businessId);
      setCurrentPropertyId(result.propertyId);

      console.log(`[WizardProvider] Switched to tax year ${newTaxYear}`);
    } catch (error) {
      console.error('[WizardProvider] Failed to switch tax year:', error);
    } finally {
      setIsSwitchingYear(false);
    }
  }, [data, currentStep, currentBusinessId, currentPropertyId, userId, loadTaxYearData]);

  // Auto-save on data changes (debounced)
  // Skip auto-save while switching years to prevent race conditions
  useEffect(() => {
    if (isLoading || isSwitchingYear) return;

    const timeout = setTimeout(() => {
      saveProgress();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [data, currentStep, isLoading, isSwitchingYear, saveProgress]);

  // Calculate tax when relevant data changes or after initial load
  // Debounced to 250ms to reduce churn during rapid typing
  useEffect(() => {
    // Don't calculate while still loading
    if (isLoading) return;

    const timeout = setTimeout(() => {
      // Use functional update to ensure we have the latest data
      setData((prev) => {
        const calculation = calculateTaxForWizard(prev);

        // Only update if the calculation has actually changed
        if (JSON.stringify(calculation) === JSON.stringify(prev.taxCalculation)) {
          return prev; // No change
        }

        return { ...prev, taxCalculation: calculation };
      });
    }, 250);

    return () => clearTimeout(timeout);
  }, [
    isLoading, // Recalculate after loading completes
    data.taxYear, // Recalculate when tax year changes (different rates apply)
    data.selfEmploymentData,
    data.employmentData,
    data.rentalData,
    data.cisData,
    data.dividendsData,
    data.interestData,
    data.capitalGainsData,
    data.pensionIncomeData,
    data.stateBenefitsData,
    data.deductions,
    data.transactions,
    data.otherIncome,
    data.general,
    data.incomeSources,
  ]);

  // Expose calculateTax for manual trigger if needed
  const calculateTax = useCallback(() => {
    const calculation = calculateTaxForWizard(data);
    setData((prev) => ({ ...prev, taxCalculation: calculation }));
  }, [data]);

  // Navigation
  const goToStep = useCallback((step: StepId) => {
    setCurrentStep(step);
  }, []);

  const goToBusinessStep = useCallback((businessId: string, step: StepId) => {
    setCurrentBusinessId(businessId);
    setCurrentPropertyId(null);
    setCurrentEmployerId(null);
    setCurrentStep(step);
  }, []);

  const goToPropertyStep = useCallback((propertyId: string, step: StepId) => {
    setCurrentPropertyId(propertyId);
    setCurrentBusinessId(null);
    setCurrentEmployerId(null);
    setCurrentStep(step);
  }, []);

  const goToEmployerStep = useCallback((employerId: string, step: StepId) => {
    setCurrentEmployerId(employerId);
    setCurrentBusinessId(null);
    setCurrentPropertyId(null);
    setCurrentStep(step);
  }, []);

  const goNext = useCallback(() => {
    const nextStep = getNextStep(currentStep, data, currentBusinessId, currentPropertyId);

    if (nextStep) {
      setNavigationDirection('forward');
      setCurrentStep(nextStep);
    }
  }, [currentStep, data, currentBusinessId, currentPropertyId]);

  // goNextWithData allows passing updated data for navigation decisions
  // This is needed when navigation depends on data that was just updated
  const goNextWithData = useCallback((updatedData: Partial<WizardData>) => {
    const mergedData = { ...data, ...updatedData };
    setData(mergedData);

    const nextStep = getNextStep(currentStep, mergedData, currentBusinessId, currentPropertyId);

    if (nextStep) {
      setNavigationDirection('forward');
      setCurrentStep(nextStep);
    }
  }, [currentStep, data, currentBusinessId, currentPropertyId]);

  const goBack = useCallback(() => {
    const prevStep = getPreviousStep(currentStep, data, currentBusinessId, currentPropertyId);
    if (prevStep) {
      setNavigationDirection('backward');
      setCurrentStep(prevStep);
    }
  }, [currentStep, data, currentBusinessId, currentPropertyId]);

  const canGoNext = getNextStep(currentStep, data, currentBusinessId, currentPropertyId) !== null;
  const canGoBack = getPreviousStep(currentStep, data, currentBusinessId, currentPropertyId) !== null;

  // Data updates
  const updateData = useCallback((updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Business data updates
  const updateBusinessData = useCallback(
    (businessId: string, updates: Partial<SelfEmploymentBusiness>) => {
      setData((prev) => ({
        ...prev,
        selfEmploymentData: {
          ...prev.selfEmploymentData,
          [businessId]: {
            ...prev.selfEmploymentData[businessId],
            ...updates,
          },
        },
      }));
    },
    []
  );

  // Property data updates
  const updatePropertyData = useCallback(
    (propertyId: string, updates: Partial<RentalProperty>) => {
      setData((prev) => ({
        ...prev,
        rentalData: {
          ...prev.rentalData,
          [propertyId]: {
            ...prev.rentalData[propertyId],
            ...updates,
          },
        },
      }));
    },
    []
  );

  // Employment data updates
  const updateEmployerData = useCallback(
    (employerId: string, updates: Partial<EmploymentData>) => {
      setData((prev) => ({
        ...prev,
        employmentData: {
          ...prev.employmentData,
          [employerId]: {
            ...prev.employmentData[employerId],
            ...updates,
          },
        },
      }));
    },
    []
  );

  // Income sources
  const addIncomeSource = useCallback(
    (source: Omit<IncomeSource, 'id'>) => {
      const newSource = {
        ...source,
        id: `source-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      };

      setData((prev) => ({
        ...prev,
        incomeSources: [...prev.incomeSources, newSource],
      }));
    },
    []
  );

  const updateIncomeSource = useCallback(
    (id: string, updates: Partial<IncomeSource>) => {
      setData((prev) => ({
        ...prev,
        incomeSources: prev.incomeSources.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      }));
    },
    []
  );

  const deleteIncomeSource = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      incomeSources: prev.incomeSources.filter((s) => s.id !== id),
    }));
  }, []);

  // Transactions
  const updateTransaction = useCallback(
    (id: string, updates: Partial<Transaction>) => {
      setData((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
      }));
    },
    []
  );

  const bulkUpdateTransactions = useCallback(
    (ids: string[], updates: Partial<Transaction>) => {
      setData((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) =>
          ids.includes(t.id) ? { ...t, ...updates } : t
        ),
      }));
    },
    []
  );

  // Helpers
  const getVisibleStepsForSidebar = useCallback(() => {
    return getVisibleSteps(data);
  }, [data]);

  const getSectionStatus = useCallback(
    (section: SectionId): 'not_started' | 'in_progress' | 'completed' => {
      switch (section) {
        case 'getting-started':
          if (data.incomeSources.length > 0) return 'completed';
          if (data.isUKResident !== null) return 'in_progress';
          return 'not_started';
        case 'connect':
          if (data.bankConnected || data.connectionMethod === 'manual')
            return 'completed';
          if (data.connectionMethod) return 'in_progress';
          return 'not_started';
        case 'self-employment': {
          const businesses = data.incomeSources.filter(s => s.type === 'self-employment');
          if (businesses.length === 0) return 'not_started';
          const allComplete = businesses.every(b => {
            const businessData = data.selfEmploymentData[b.id];
            return businessData?.income?.total !== undefined;
          });
          if (allComplete) return 'completed';
          return 'in_progress';
        }
        case 'rental': {
          const properties = data.incomeSources.filter(s => s.type === 'rental');
          if (properties.length === 0) return 'not_started';
          const allComplete = properties.every(p => {
            const propertyData = data.rentalData[p.id];
            return propertyData?.income?.total !== undefined;
          });
          if (allComplete) return 'completed';
          return 'in_progress';
        }
        case 'employment': {
          const employers = data.incomeSources.filter(s => s.type === 'employment');
          if (employers.length === 0) return 'not_started';
          const allComplete = employers.every(e => {
            const employerData = data.employmentData[e.id];
            return employerData?.payReceived !== undefined && employerData.payReceived > 0;
          });
          if (allComplete) return 'completed';
          return 'in_progress';
        }
        case 'cis': {
          const hasCIS = data.incomeSources.some(s => s.type === 'cis');
          if (!hasCIS) return 'not_started';
          if (data.cisData?.totalGross !== undefined && data.cisData.totalGross > 0) return 'completed';
          if (data.cisData?.contractors && data.cisData.contractors.length > 0) return 'in_progress';
          return 'in_progress';
        }
        case 'dividends': {
          const hasDividends = data.incomeSources.some(s => s.type === 'dividends');
          if (!hasDividends) return 'not_started';
          if (data.dividendsData?.totalDividends !== undefined && data.dividendsData.totalDividends > 0) return 'completed';
          if (data.dividendsData?.ukDividends !== undefined && data.dividendsData.ukDividends > 0) return 'completed';
          return 'in_progress';
        }
        case 'interest': {
          const hasInterest = data.incomeSources.some(s => s.type === 'interest');
          if (!hasInterest) return 'not_started';
          if (data.interestData?.totalInterest !== undefined && data.interestData.totalInterest > 0) return 'completed';
          if (data.interestData?.untaxedUKInterest !== undefined && data.interestData.untaxedUKInterest > 0) return 'completed';
          return 'in_progress';
        }
        case 'capital-gains': {
          const hasCapitalGains = data.incomeSources.some(s => s.type === 'capital-gains');
          if (!hasCapitalGains) return 'not_started';
          if (data.capitalGainsData?.disposals && data.capitalGainsData.disposals.length > 0) return 'completed';
          return 'in_progress';
        }
        case 'pension-income': {
          const hasPension = data.incomeSources.some(s => s.type === 'pension');
          if (!hasPension) return 'not_started';
          if (data.pensionIncomeData?.totalPensionIncome !== undefined && data.pensionIncomeData.totalPensionIncome > 0) return 'completed';
          if (data.pensionIncomeData?.statePension !== undefined && data.pensionIncomeData.statePension > 0) return 'completed';
          if (data.pensionIncomeData?.privatePensions && data.pensionIncomeData.privatePensions.length > 0) return 'completed';
          return 'in_progress';
        }
        case 'state-benefits': {
          const hasStateBenefits = data.incomeSources.some(s => s.type === 'state-benefits');
          if (!hasStateBenefits) return 'not_started';
          if (data.stateBenefitsData?.totalTaxableBenefits !== undefined && data.stateBenefitsData.totalTaxableBenefits > 0) return 'completed';
          // Check individual benefits
          if (
            (data.stateBenefitsData?.jobseekersAllowance ?? 0) > 0 ||
            (data.stateBenefitsData?.employmentSupportAllowance ?? 0) > 0 ||
            (data.stateBenefitsData?.carersAllowance ?? 0) > 0 ||
            (data.stateBenefitsData?.statePension ?? 0) > 0
          ) return 'completed';
          return 'in_progress';
        }
        case 'other-income': {
          const hasOther = data.incomeSources.some(s => s.type === 'other');
          if (!hasOther) return 'not_started';
          if (
            data.otherIncome.interest > 0 ||
            data.otherIncome.dividends > 0 ||
            data.otherIncome.pension > 0 ||
            data.otherIncome.other > 0
          )
            return 'completed';
          return 'in_progress';
        }
        case 'general': {
          // General section is complete if user has gone through it (even with no selections)
          // Check if they've visited the overview and either made selections or continued
          if (data.general?.selectedReliefs !== undefined) return 'completed';
          return 'not_started';
        }
        case 'personal':
          if (data.personalInfo.fullName && data.personalInfo.nino)
            return 'completed';
          if (data.personalInfo.fullName) return 'in_progress';
          return 'not_started';
        case 'review':
          if (data.submission?.status === 'submitted') return 'completed';
          if (data.payment?.status === 'paid') return 'in_progress';
          return 'not_started';
        default:
          return 'not_started';
      }
    },
    [data]
  );

  // Check if a section is unlocked (user can access it)
  // Progressive unlocking: sections unlock as the user progresses
  const isSectionUnlocked = useCallback(
    (section: SectionId): boolean => {
      // Getting Started is always unlocked
      if (section === 'getting-started') return true;

      // Connect requires Getting Started to be completed
      if (section === 'connect') {
        return getSectionStatus('getting-started') === 'completed';
      }

      // All income sections require Connect to be completed
      const incomeSections: SectionId[] = [
        'self-employment', 'rental', 'employment', 'cis',
        'dividends', 'interest', 'capital-gains', 'pension-income',
        'state-benefits', 'other-income'
      ];

      if (incomeSections.includes(section)) {
        return getSectionStatus('connect') === 'completed';
      }

      // General section requires at least one income section to be completed or in progress
      if (section === 'general') {
        const connectComplete = getSectionStatus('connect') === 'completed';
        if (!connectComplete) return false;

        // Check if any income section has data
        const hasAnyIncomeData =
          Object.keys(data.selfEmploymentData).length > 0 ||
          Object.keys(data.rentalData).length > 0 ||
          Object.keys(data.employmentData).length > 0 ||
          (data.cisData?.contractors && data.cisData.contractors.length > 0) ||
          (data.dividendsData?.ukDividends ?? 0) > 0 ||
          (data.interestData?.untaxedUKInterest ?? 0) > 0 ||
          (data.capitalGainsData?.disposals && data.capitalGainsData.disposals.length > 0) ||
          (data.pensionIncomeData?.totalPensionIncome ?? 0) > 0 ||
          (data.stateBenefitsData?.totalTaxableBenefits ?? 0) > 0;

        return hasAnyIncomeData;
      }

      // Personal Info requires General section to be at least visited
      if (section === 'personal') {
        return data.general?.selectedReliefs !== undefined;
      }

      // Review requires Personal Info to be completed
      if (section === 'review') {
        return getSectionStatus('personal') === 'completed';
      }

      return false;
    },
    [data, getSectionStatus]
  );

  const value: WizardContextType = {
    currentStep,
    currentBusinessId,
    currentPropertyId,
    currentEmployerId,
    data,
    isLoading,
    isSaving,
    isSwitchingYear,
    navigationDirection,
    goToStep,
    goToBusinessStep,
    goToPropertyStep,
    goToEmployerStep,
    goNext,
    goNextWithData,
    goBack,
    canGoNext,
    canGoBack,
    updateData,
    updateBusinessData,
    updatePropertyData,
    updateEmployerData,
    addIncomeSource,
    updateIncomeSource,
    deleteIncomeSource,
    updateTransaction,
    bulkUpdateTransactions,
    getVisibleSteps: getVisibleStepsForSidebar,
    getSectionStatus,
    isSectionUnlocked,
    calculateTax,
    saveProgress,
    switchTaxYear,
  };

  return (
    <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within WizardProvider');
  }
  return context;
}
