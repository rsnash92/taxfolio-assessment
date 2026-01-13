/**
 * SA100 Test XML Generator
 *
 * Generates sample SA100 XML files for testing against HMRC schemas.
 * Run with: npx tsx scripts/generate-test-xml.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { buildSubmissionXML } from '../src/lib/sa100/xml-builder'
import { validateSA100Data, validateXML } from '../src/lib/sa100/validate'
import type {
  SA100Return,
  GatewayCredentials,
  TaxpayerIdentification,
} from '../src/lib/sa100/types'

// =============================================================================
// Test Data
// =============================================================================

// Test credentials (dummy - won't actually submit)
const testCredentials: GatewayCredentials = {
  userId: '123456789012',
  password: 'TestPassword123',
}

// Test taxpayer identification
const testTaxpayer: TaxpayerIdentification = {
  utr: '1234567890',
  nino: 'AB123456C',
}

// =============================================================================
// Test Scenarios
// =============================================================================

interface TestScenario {
  name: string
  description: string
  data: SA100Return
}

const scenarios: TestScenario[] = [
  {
    name: 'simple-self-employment',
    description: 'Simple self-employment return with SA103S',
    data: {
      taxYear: '2024-25',
      yourPersonalDetails: {
        dateOfBirth: '1985-06-15',
        nationalInsuranceNumber: 'AB123456C',
        taxpayerStatus: 'U', // Rest of UK
      },
      yourTaxReturn: {
        shortSelfEmploymentSchedule: 'yes',
        numberOfShortSelfEmploymentSchedules: 1,
      },
      finishing: {
        returnSigner: 'Individual',
      },
      sa103S: [
        {
          businessDetails: {
            businessName: 'Test Consulting Ltd',
            descriptionOfBusiness: 'IT Consulting Services',
          },
          accountingPeriod: {
            startDate: '2024-04-06',
            endDate: '2025-04-05',
          },
          cashBasisIndicator: 'yes',
          income: {
            turnover: 50000,
            otherBusinessIncome: 500,
          },
          totalAllowableExpenses: 10000,
          netProfitOrLoss: 40500,
          totalTaxableProfits: 40500,
        },
      ],
    },
  },
  {
    name: 'employment-only',
    description: 'Employment income only with SA102',
    data: {
      taxYear: '2024-25',
      yourPersonalDetails: {
        dateOfBirth: '1990-03-20',
        nationalInsuranceNumber: 'NP987654A',
        taxpayerStatus: 'S', // Scottish
      },
      yourTaxReturn: {
        employmentSchedule: 'yes',
        numberOfEmploymentSchedules: 1,
      },
      finishing: {
        returnSigner: 'Individual',
      },
      sa102: [
        {
          employerDetails: {
            employerName: 'Acme Corporation',
            payeReference: '123/AB456',
          },
          payFromEmployment: 45000,
          ukTaxDeducted: 8500,
          tipsAndOtherPayments: 500,
        },
      ],
    },
  },
  {
    name: 'uk-property',
    description: 'UK property income with SA105',
    data: {
      taxYear: '2024-25',
      yourPersonalDetails: {
        dateOfBirth: '1975-11-08',
        nationalInsuranceNumber: 'NR654321B',
        taxpayerStatus: 'C', // Welsh
      },
      yourTaxReturn: {
        ukPropertySchedule: 'yes',
      },
      finishing: {
        returnSigner: 'Individual',
      },
      sa105: {
        propertyIncome: {
          totalRentsAndOtherIncome: 18000,
        },
        propertyExpenses: {
          itemizedExpenses: {
            rentsRatesInsurance: 1500,
            propertyRepairs: 2000,
            financeCharges: 3000,
          },
          totalAllowableExpenses: 6500,
        },
        netProfitOrLoss: 11500,
        totalTaxableProfit: 11500,
      },
    },
  },
  {
    name: 'dividends-interest',
    description: 'UK dividends and interest only',
    data: {
      taxYear: '2024-25',
      yourPersonalDetails: {
        dateOfBirth: '1980-01-01',
        nationalInsuranceNumber: 'GH111222C',
        taxpayerStatus: 'U',
      },
      yourTaxReturn: {},
      ukDividends: {
        ukDividendsAmount: 5000,
        otherDividendsAmount: 500,
      },
      ukInterestEtc: {
        untaxedUKInterestAmount: 1000,
        taxedUKInterestAmount: 500,
        taxTakenOffBox2Amount: 100,
      },
      finishing: {
        returnSigner: 'Individual',
      },
    },
  },
  {
    name: 'capital-gains',
    description: 'Capital gains from shares with SA108',
    data: {
      taxYear: '2024-25',
      yourPersonalDetails: {
        dateOfBirth: '1970-07-25',
        nationalInsuranceNumber: 'JK333444D',
        taxpayerStatus: 'U',
      },
      yourTaxReturn: {
        capitalGainsSchedule: 'yes',
      },
      finishing: {
        returnSigner: 'Individual',
      },
      sa108: {
        listedSharesAndSecurities: {
          disposalProceeds: 50000,
          allowableCosts: 30000,
          gainsInYear: 20000,
        },
        annualExemptAmount: {
          amountClaimed: 3000,
        },
        totals: {
          totalGains: 17000,
        },
      },
    },
  },
  {
    name: 'complex-return',
    description: 'Complex return with multiple schedules',
    data: {
      taxYear: '2024-25',
      yourPersonalDetails: {
        dateOfBirth: '1982-09-12',
        nationalInsuranceNumber: 'LM555666A',
        taxpayerStatus: 'S', // Scottish
        telephoneNumber: '07700900123',
      },
      yourTaxReturn: {
        employmentSchedule: 'yes',
        numberOfEmploymentSchedules: 1,
        shortSelfEmploymentSchedule: 'yes',
        numberOfShortSelfEmploymentSchedules: 1,
      },
      studentLoanRepayments: {
        incomeContingentStudentLoanNotification: 'yes',
        studentLoanRepaymentDeductedAmount: 2500,
      },
      ukDividends: {
        ukDividendsAmount: 3000,
      },
      ukInterestEtc: {
        untaxedUKInterestAmount: 800,
      },
      reliefs: {
        pensionContributions: {
          personalPensions: 5000,
        },
        giftAid: {
          paymentsThisYear: 500,
        },
      },
      finishing: {
        returnSigner: 'Individual',
      },
      sa102: [
        {
          employerDetails: {
            employerName: 'Tech Company Ltd',
            payeReference: '456/CD789',
          },
          payFromEmployment: 55000,
          ukTaxDeducted: 11000,
        },
      ],
      sa103S: [
        {
          businessDetails: {
            businessName: 'Side Hustle',
            descriptionOfBusiness: 'Freelance Web Development',
          },
          accountingPeriod: {
            startDate: '2024-04-06',
            endDate: '2025-04-05',
          },
          cashBasisIndicator: 'yes',
          income: {
            turnover: 15000,
          },
          totalAllowableExpenses: 3000,
          netProfitOrLoss: 12000,
          totalTaxableProfits: 12000,
        },
      ],
    },
  },
]

// =============================================================================
// Main Script
// =============================================================================

async function main() {
  const outputDir = path.join(__dirname, '../test-xml-output')

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  console.log('SA100 XML Test Generator')
  console.log('========================\n')

  let passCount = 0
  let failCount = 0

  for (const scenario of scenarios) {
    console.log(`\n--- ${scenario.name} ---`)
    console.log(`Description: ${scenario.description}`)

    try {
      // Step 1: Validate the data
      console.log('  1. Validating data...')
      const dataValidation = validateSA100Data(scenario.data)

      if (!dataValidation.valid) {
        console.log('  ✗ Data validation failed:')
        dataValidation.errors.forEach((err) => console.log(`    - ${err.field}: ${err.message}`))
        failCount++
        continue
      }

      if (dataValidation.warnings.length > 0) {
        console.log('  ⚠ Warnings:')
        dataValidation.warnings.forEach((w) => console.log(`    - ${w.field}: ${w.message}`))
      }

      console.log('  ✓ Data validation passed')

      // Step 2: Build XML
      console.log('  2. Building XML...')
      const result = buildSubmissionXML({
        credentials: testCredentials,
        taxpayer: testTaxpayer,
        returnData: scenario.data,
      })

      if (result.validationErrors.length > 0) {
        console.log('  ⚠ Build warnings:')
        result.validationErrors.forEach((e) => console.log(`    - ${e.field}: ${e.message}`))
      }

      // Step 3: Validate generated XML
      console.log('  3. Validating XML structure...')
      const xmlValidation = validateXML(result.xml)

      if (!xmlValidation.valid) {
        console.log('  ✗ XML validation failed:')
        xmlValidation.errors.forEach((err) => console.log(`    - ${err.field}: ${err.message}`))
        failCount++
        continue
      }

      console.log('  ✓ XML validation passed')
      console.log(`  ✓ IRmark: ${result.irMark.substring(0, 20)}...`)

      // Step 4: Save XML file
      const outputPath = path.join(outputDir, `${scenario.name}.xml`)
      fs.writeFileSync(outputPath, result.xml, 'utf-8')
      console.log(`  ✓ Saved to: ${outputPath}`)

      // Step 5: Save just the IRenvelope for schema validation
      const irEnvelopeMatch = result.xml.match(/<IRenvelope[\s\S]*<\/IRenvelope>/)
      if (irEnvelopeMatch) {
        const irEnvelopePath = path.join(outputDir, `${scenario.name}-irenvelope.xml`)
        // Add XML declaration and namespace for standalone validation
        const standaloneXml = `<?xml version="1.0" encoding="UTF-8"?>\n${irEnvelopeMatch[0]}`
        fs.writeFileSync(irEnvelopePath, standaloneXml, 'utf-8')
        console.log(`  ✓ IRenvelope saved to: ${irEnvelopePath}`)
      }

      passCount++
    } catch (error) {
      console.log(`  ✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      failCount++
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log(`Results: ${passCount} passed, ${failCount} failed`)
  console.log(`Output directory: ${outputDir}`)

  // Provide schema validation instructions
  console.log('\n--- Next Steps: Schema Validation ---')
  console.log('To validate against HMRC XSD schemas:')
  console.log('')
  console.log('1. Install xmllint (comes with libxml2):')
  console.log('   brew install libxml2')
  console.log('')
  console.log('2. Validate IRenvelope against MTR schema:')
  console.log(
    `   xmllint --schema src/lib/sa100/hmrc-specs/RIM/MTR-v1-0.xsd ${outputDir}/simple-self-employment-irenvelope.xml`
  )
  console.log('')
  console.log('3. For full GovTalk validation, you need both schemas:')
  console.log(
    `   xmllint --schema src/lib/sa100/hmrc-specs/RIM/envelope-v2-0-HMRC.xsd ${outputDir}/simple-self-employment.xml`
  )
  console.log('')
  console.log('Note: Java is required for the full HMRC Local Test Service (LTS).')
}

main().catch((error) => {
  console.error('Script failed:', error)
  process.exit(1)
})
