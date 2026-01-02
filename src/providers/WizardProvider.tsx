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
} from '@/types/wizard';
import {
  getVisibleSteps,
  getNextStep,
  getPreviousStep,
} from '@/lib/wizard/steps';
import { calculateTaxLiability } from '@/lib/wizard/calculations';

const initialData: WizardData = {
  sessionId: null,
  taxYear: '2024-25',
  isUKResident: null,
  incomeSources: [],
  connectionMethod: null,
  bankConnected: false,
  bankAccounts: [],
  bankName: null,
  bankImportData: null,
  transactions: [],
  transactionsReviewed: false,
  selfEmploymentData: {},
  rentalData: {},
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
  },
  taxCalculation: {
    totalIncome: 0,
    totalExpenses: 0,
    totalDeductions: 0,
    taxableProfit: 0,
    incomeTax: 0,
    nationalInsurance: 0,
    totalTaxDue: 0,
  },
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
  const [data, setData] = useState<WizardData>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing session on mount (simplified for dev)
  useEffect(() => {
    async function loadSession() {
      setIsLoading(true);

      // In development, just use localStorage for session persistence
      const savedData = localStorage.getItem('wizard-data');
      const savedStep = localStorage.getItem('wizard-step');
      const savedBusinessId = localStorage.getItem('wizard-business-id');
      const savedPropertyId = localStorage.getItem('wizard-property-id');

      let loadedData = initialData;

      if (savedData) {
        try {
          loadedData = { ...initialData, ...JSON.parse(savedData) };
          setData(loadedData);
        } catch {
          // Use initial data if parse fails
        }
      }

      if (savedStep) {
        setCurrentStep(savedStep as StepId);
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

  // Save progress to localStorage (in production, would be Supabase)
  const saveProgress = useCallback(async () => {
    setIsSaving(true);

    // Save to localStorage for development
    localStorage.setItem('wizard-data', JSON.stringify(data));
    localStorage.setItem('wizard-step', currentStep);
    if (currentBusinessId) {
      localStorage.setItem('wizard-business-id', currentBusinessId);
    }
    if (currentPropertyId) {
      localStorage.setItem('wizard-property-id', currentPropertyId);
    }

    // Simulate save delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    setIsSaving(false);
  }, [data, currentStep, currentBusinessId, currentPropertyId]);

  // Auto-save on data changes (debounced)
  useEffect(() => {
    if (isLoading) return;

    const timeout = setTimeout(() => {
      saveProgress();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [data, currentStep, isLoading, saveProgress]);

  // Calculate tax when relevant data changes
  const calculateTax = useCallback(() => {
    const calculation = calculateTaxLiability(data);
    setData((prev) => ({ ...prev, taxCalculation: calculation }));
  }, []);

  useEffect(() => {
    calculateTax();
  }, [
    data.selfEmploymentData,
    data.rentalData,
    data.deductions,
    data.transactions,
    calculateTax,
  ]);

  // Navigation
  const goToStep = useCallback((step: StepId) => {
    setCurrentStep(step);
  }, []);

  const goToBusinessStep = useCallback((businessId: string, step: StepId) => {
    setCurrentBusinessId(businessId);
    setCurrentPropertyId(null);
    setCurrentStep(step);
  }, []);

  const goToPropertyStep = useCallback((propertyId: string, step: StepId) => {
    setCurrentPropertyId(propertyId);
    setCurrentBusinessId(null);
    setCurrentStep(step);
  }, []);

  const goNext = useCallback(() => {
    console.log('[WizardProvider] goNext called, currentStep:', currentStep);
    console.log('[WizardProvider] currentBusinessId:', currentBusinessId);

    const nextStep = getNextStep(currentStep, data, currentBusinessId, currentPropertyId);
    console.log('[WizardProvider] nextStep:', nextStep);

    if (nextStep) {
      console.log('[WizardProvider] Setting step to:', nextStep);
      setCurrentStep(nextStep);
    } else {
      console.log('[WizardProvider] No next step available!');
    }
  }, [currentStep, data, currentBusinessId, currentPropertyId]);

  const goBack = useCallback(() => {
    const prevStep = getPreviousStep(currentStep, data, currentBusinessId, currentPropertyId);
    if (prevStep) {
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
        case 'other-income':
          if (
            data.otherIncome.interest > 0 ||
            data.otherIncome.dividends > 0 ||
            data.otherIncome.pension > 0
          )
            return 'in_progress';
          return 'not_started';
        case 'deductions':
          if (
            data.deductions.mileage.miles > 0 ||
            data.deductions.homeOffice.amount > 0 ||
            data.deductions.pensionContributions > 0
          )
            return 'in_progress';
          return 'not_started';
        case 'personal':
          if (data.personalInfo.fullName && data.personalInfo.utr)
            return 'completed';
          if (data.personalInfo.fullName) return 'in_progress';
          return 'not_started';
        case 'review':
          return 'not_started';
        default:
          return 'not_started';
      }
    },
    [data]
  );

  const value: WizardContextType = {
    currentStep,
    currentBusinessId,
    currentPropertyId,
    data,
    isLoading,
    isSaving,
    goToStep,
    goToBusinessStep,
    goToPropertyStep,
    goNext,
    goBack,
    canGoNext,
    canGoBack,
    updateData,
    updateBusinessData,
    updatePropertyData,
    addIncomeSource,
    updateIncomeSource,
    deleteIncomeSource,
    updateTransaction,
    bulkUpdateTransactions,
    getVisibleSteps: getVisibleStepsForSidebar,
    getSectionStatus,
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
