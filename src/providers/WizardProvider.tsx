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
import { calculateTaxLiability } from '@/lib/wizard/calculations';
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
}: {
  children: ReactNode;
  userId?: string;
}) {
  const [currentStep, setCurrentStep] = useState<StepId>('residency');
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
  const [currentPropertyId, setCurrentPropertyId] = useState<string | null>(null);
  const [currentEmployerId, setCurrentEmployerId] = useState<string | null>(null);
  const [data, setData] = useState<WizardData>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [navigationDirection, setNavigationDirection] = useState<'forward' | 'backward'>('forward');

  // Load existing session on mount
  useEffect(() => {
    async function loadSession() {
      setIsLoading(true);

      let loadedData = initialData;
      let savedStep: StepId | null = null;
      let savedBusinessId: string | null = null;
      let savedPropertyId: string | null = null;

      // Try to load from database if user is authenticated
      if (userId) {
        try {
          const response = await fetch('/api/wizard-progress');
          const result = await response.json();

          if (result.success && result.data) {
            console.log('[WizardProvider] Loaded progress from database, step:', result.data.currentStep);
            console.log('[WizardProvider] Database taxCalculation (will be ignored):', result.data.wizardData?.taxCalculation?.totalDue);
            // Exclude taxCalculation from loaded data - always compute fresh
            const { taxCalculation: _ignored, ...wizardDataWithoutCalc } = result.data.wizardData || {};
            console.log('[WizardProvider] After exclusion, taxCalculation should be null:', wizardDataWithoutCalc.taxCalculation);
            loadedData = { ...initialData, ...wizardDataWithoutCalc, taxCalculation: null };
            console.log('[WizardProvider] Final loadedData.taxCalculation:', loadedData.taxCalculation);
            savedStep = result.data.currentStep;
            savedBusinessId = result.data.currentBusinessId;
            savedPropertyId = result.data.currentPropertyId;
          } else {
            console.log('[WizardProvider] No saved progress in database');
          }
        } catch (error) {
          console.warn('[WizardProvider] Failed to load from database:', error);
        }
      }

      // Fallback to localStorage if no database data (for backwards compatibility)
      if (!savedStep) {
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
            console.log('[WizardProvider] Loaded progress from localStorage');
          } catch {
            // Use initial data if parse fails
          }
        }
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

      console.log('[WizardProvider] Setting initial data, taxCalculation:', loadedData.taxCalculation);
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
  }, [userId]);

  // Save progress to database (and localStorage as backup)
  const saveProgress = useCallback(async () => {
    setIsSaving(true);

    // Always save to localStorage as backup
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
          }),
        });

        const result = await response.json();
        if (!result.success) {
          console.warn('[WizardProvider] Failed to save to database:', result.error);
        }
      } catch (error) {
        console.warn('[WizardProvider] Failed to save to database:', error);
      }
    }

    setIsSaving(false);
  }, [data, currentStep, currentBusinessId, currentPropertyId, userId]);

  // Auto-save on data changes (debounced)
  useEffect(() => {
    if (isLoading) return;

    const timeout = setTimeout(() => {
      saveProgress();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [data, currentStep, isLoading, saveProgress]);

  // Calculate tax when relevant data changes or after initial load
  useEffect(() => {
    // Don't calculate while still loading
    if (isLoading) return;

    console.log('[WizardProvider] Tax useEffect triggered, isLoading:', isLoading);

    // Use functional update to ensure we have the latest data
    setData((prev) => {
      console.log('[WizardProvider] Previous taxCalculation.totalDue:', prev.taxCalculation?.totalDue);
      const calculation = calculateTaxLiability(prev);
      console.log('[WizardProvider] New calculation.totalDue:', calculation.totalDue);

      // Only update if the calculation has actually changed
      if (JSON.stringify(calculation) === JSON.stringify(prev.taxCalculation)) {
        console.log('[WizardProvider] No change in calculation, skipping update');
        return prev; // No change
      }

      console.log('[WizardProvider] Tax calculation updated:', {
        totalIncome: calculation.totalIncome,
        employmentIncome: calculation.employmentIncome,
        selfEmploymentIncome: calculation.selfEmploymentIncome,
        totalDue: calculation.totalDue,
      });

      return { ...prev, taxCalculation: calculation };
    });
  }, [
    isLoading, // Recalculate after loading completes
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
    const calculation = calculateTaxLiability(data);
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
    console.log('[WizardProvider] goNext called, currentStep:', currentStep);
    console.log('[WizardProvider] currentBusinessId:', currentBusinessId);

    const nextStep = getNextStep(currentStep, data, currentBusinessId, currentPropertyId);
    console.log('[WizardProvider] nextStep:', nextStep);

    if (nextStep) {
      console.log('[WizardProvider] Setting step to:', nextStep);
      setNavigationDirection('forward');
      setCurrentStep(nextStep);
    } else {
      console.log('[WizardProvider] No next step available!');
    }
  }, [currentStep, data, currentBusinessId, currentPropertyId]);

  // goNextWithData allows passing updated data for navigation decisions
  // This is needed when navigation depends on data that was just updated
  const goNextWithData = useCallback((updatedData: Partial<WizardData>) => {
    const mergedData = { ...data, ...updatedData };
    setData(mergedData);

    const nextStep = getNextStep(currentStep, mergedData, currentBusinessId, currentPropertyId);
    console.log('[WizardProvider] goNextWithData, nextStep:', nextStep);

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
