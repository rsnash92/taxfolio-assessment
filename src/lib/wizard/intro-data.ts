// Intro data integration for assessment wizard
// Fetches and applies intro wizard answers to pre-populate assessment

import { WizardData } from '@/types/wizard'

export interface IntroLeadData {
  intent: string | null
  income_source: string | null
  income_sources?: string | null // JSON string of array
  incomeSources?: string[] // Parsed array from API
  filing_experience: string | null
  situation: string | null
}

export interface IntroDataResult {
  success: boolean
  data?: IntroLeadData
  error?: string
}

/**
 * Income source to assessment categories mapping
 * Maps intro wizard income source to relevant wizard steps/sections
 */
export const INCOME_SOURCE_MAPPING: Record<string, string[]> = {
  'self-employed': ['self-employment'],
  'landlord': ['rental'],
  'employed-side-income': ['employment', 'self-employment'],
  'director': ['employment', 'dividends'],
  'investor': ['dividends', 'interest', 'capital-gains'],
  'multiple': [], // User will need to select their own
}

/**
 * Experience level mapping
 */
export const EXPERIENCE_MAPPING: Record<string, 'beginner' | 'intermediate' | 'expert'> = {
  'first-time': 'beginner',
  'been-a-while': 'beginner',
  'every-year': 'intermediate',
  'use-accountant': 'intermediate',
}

/**
 * Fetch intro data for a user from the database
 */
export async function fetchIntroData(userId: string): Promise<IntroDataResult> {
  try {
    const response = await fetch(`/api/user/intro-data?userId=${userId}`)

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch intro data' }
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Failed to fetch intro data:', error)
    return { success: false, error: 'Network error' }
  }
}

/**
 * Get suggested income sources based on intro selection(s)
 * Now handles both single incomeSource and array incomeSources
 */
export function getSuggestedIncomeSources(introData: IntroLeadData): string[] {
  // Use parsed array if available
  const sources = introData.incomeSources || (introData.income_source ? [introData.income_source] : [])

  // Map each intro source to assessment categories
  const suggested = new Set<string>()
  for (const source of sources) {
    const mapped = INCOME_SOURCE_MAPPING[source] || []
    mapped.forEach(s => suggested.add(s))
  }

  return Array.from(suggested)
}

/**
 * Get experience level based on intro selection
 */
export function getExperienceLevel(filingExperience: string | null): 'beginner' | 'intermediate' | 'expert' {
  if (!filingExperience) return 'beginner'
  return EXPERIENCE_MAPPING[filingExperience] || 'beginner'
}

/**
 * Pre-populate wizard data based on intro answers
 * Note: We don't set incomeSources directly as they need to be IncomeSource objects.
 * Instead, we store suggested sources as metadata for the UI to pre-select in the
 * income sources step.
 */
export function applyIntroDataToWizard(
  introData: IntroLeadData,
  existingData: Partial<WizardData> = {}
): Partial<WizardData> {
  const suggestedSources = getSuggestedIncomeSources(introData)

  return {
    ...existingData,
    // Store intro metadata (income sources will be pre-selected in income-sources step)
    introData: {
      intent: introData.intent,
      incomeSource: introData.income_source,
      incomeSources: introData.incomeSources || [],
      filingExperience: introData.filing_experience,
      situation: introData.situation,
      experienceLevel: getExperienceLevel(introData.filing_experience),
      suggestedSources,
    },
  }
}

/**
 * Check if wizard data was pre-filled from intro
 */
export function hasIntroData(wizardData: Partial<WizardData>): boolean {
  return !!wizardData.introData
}

/**
 * Get context-aware guidance based on experience level
 */
export function getGuidanceLevel(introData?: IntroLeadData): {
  showDetailedHelp: boolean
  showTooltips: boolean
  showExamples: boolean
} {
  if (!introData) {
    return {
      showDetailedHelp: true,
      showTooltips: true,
      showExamples: true,
    }
  }

  const experienceLevel = getExperienceLevel(introData.filing_experience)

  switch (experienceLevel) {
    case 'beginner':
      return {
        showDetailedHelp: true,
        showTooltips: true,
        showExamples: true,
      }
    case 'intermediate':
      return {
        showDetailedHelp: false,
        showTooltips: true,
        showExamples: false,
      }
    case 'expert':
      return {
        showDetailedHelp: false,
        showTooltips: false,
        showExamples: false,
      }
    default:
      return {
        showDetailedHelp: true,
        showTooltips: true,
        showExamples: true,
      }
  }
}

/**
 * Get priority steps based on situation
 */
export function getPrioritySteps(situation: string | null): string[] {
  switch (situation) {
    case 'deadline-rush':
      // Focus on essential steps only
      return ['personal-details', 'income-sources', 'review', 'submit']
    case 'documents-ready':
      // Standard full flow
      return []
    case 'need-to-gather':
      // Show document checklist prominently
      return ['documents-checklist', 'personal-details']
    case 'just-exploring':
      // Show overview and estimate first
      return ['overview', 'tax-estimate']
    default:
      return []
  }
}
