import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { Transaction } from '@/types/wizard';

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a UK tax categorisation assistant. Categorise bank transactions for a self-employed sole trader's Self Assessment tax return (SA103 form).

IMPORTANT: This is likely a MIXED personal/business bank account. Most sole traders use their personal account for business, so you must identify which transactions are personal (not business-related) and which are legitimate business expenses or income.

For each transaction, return a JSON object with:
- id: the transaction id (REQUIRED - copy exactly from input)
- is_business: boolean (true = business expense/income, false = personal)
- category: MUST be one of these HMRC API field names (use exact string):
  FOR EXPENSES:
  - "costOfGoods" (Box 10: Cost of goods bought for resale)
  - "wagesAndStaffCosts" (Box 11: Wages, salaries, bonuses, pensions)
  - "paymentsToSubcontractors" (Box 12: CIS/subcontractor payments)
  - "premisesRunningCosts" (Box 13: Rent, rates, power, insurance for premises)
  - "maintenanceCosts" (Box 14: Repairs and maintenance)
  - "carVanTravelExpenses" (Box 15-16: Vehicle costs and business travel)
  - "advertisingCosts" (Box 17: Advertising, marketing)
  - "professionalFees" (Box 17: Accountant, solicitor fees)
  - "financeCharges" (Box 17: Bank fees, credit card charges)
  - "interestOnBankOtherLoans" (Box 17: Loan interest)
  - "adminCosts" (Box 17: Phone, fax, stationery, office costs, software)
  - "otherExpenses" (Box 17: Other allowable business expenses)
  FOR INCOME:
  - "turnover" (Box 9: Income from sales/services)
  - "otherIncome" (Box 10: Other business income including grants)
- confidence: 0.0 to 1.0 (how confident you are)
- reasoning: brief explanation (1 sentence max)

## PERSONAL TRANSACTION RULES - Mark as is_business: false:

Supermarkets (always personal):
- Tesco, Sainsbury's, Asda, Morrisons, Aldi, Lidl, Waitrose, M&S Food, Co-op Food, Iceland

Streaming & Entertainment (always personal):
- Netflix, Spotify, Disney+, Amazon Prime Video, Apple TV+, NOW TV, YouTube Premium
- Steam, PlayStation, Xbox, Nintendo, gaming purchases
- Cinema, theatre, concerts

Personal Subscriptions:
- Gym memberships (PureGym, TheGym, David Lloyd, Virgin Active)
- Dating apps (Tinder, Hinge, Bumble)
- Personal magazines, newspapers for personal reading

Clothing & Fashion (unless clearly workwear):
- ASOS, Zara, H&M, Primark, Next, Boohoo, Shein, TK Maxx

Food & Drink WITHOUT business context:
- Deliveroo, Just Eat, Uber Eats
- Restaurants, pubs, cafes (unless client meeting clear from description)
- Greggs, Pret, Costa, Starbucks (personal unless "meeting" mentioned)

Personal Transport:
- Uber/Bolt for personal trips, personal car fuel without business context

Home Expenses (unless home office claim specified):
- Utilities (British Gas, EDF, Octopus Energy, etc.)
- Council tax, TV licence, home insurance

Personal Finance:
- Mortgage/rent payments, personal savings transfers
- Personal insurance (car, home, health, life)
- Cash withdrawals (ATM)

Other Personal:
- Childcare, school fees, medical/dental
- Holidays, flights, hotels (unless clear business trip)
- Hairdresser, beauty treatments

## BUSINESS TRANSACTION RULES - Mark as is_business: true:

Software, Office & Admin → use category "adminCosts":
- Adobe, Microsoft 365, Google Workspace, Notion, Canva
- Zoom, Slack, Teams, Loom
- Xero, QuickBooks, FreeAgent (accounting software)
- GitHub, GitLab, Figma, Miro
- AWS, Google Cloud, Azure, DigitalOcean
- Vercel, Netlify, Heroku, Railway
- GoDaddy, Namecheap, Cloudflare
- Mobile phone bills, broadband, landline
- EE, Vodafone, O2, Three, BT, Sky broadband
- Staples, Viking Direct, Office Depot
- Stationery, printing, postage

Marketing & Advertising → use category "advertisingCosts":
- Google Ads, Facebook/Meta Ads, LinkedIn Ads
- Mailchimp, ConvertKit, Klaviyo
- Hootsuite, Buffer

Professional Services → use category "professionalFees":
- Accountant fees, solicitor/legal fees
- Business insurance, professional indemnity

Vehicle & Travel → use category "carVanTravelExpenses":
- Train tickets to client meetings (Trainline, LNER, GWR)
- Business hotels, conference accommodation
- Vehicle fuel, car insurance (business portion)
- Uber/taxi for business trips

Bank charges → use category "financeCharges":
- Bank fees, overdraft interest, merchant fees, Stripe fees

Income (money IN) → use category "turnover":
- Payments from companies/clients (look for Ltd, LLC, Inc in name)
- Invoice payments, Stripe payouts, PayPal business

## AMBIGUOUS - Set LOW confidence (0.3-0.5):
- Amazon purchases (could be either)
- Generic coffee shop visits
- Phone bills (business mobile vs personal)
- PayPal/Stripe without details
- Large round-number transfers
- Generic descriptions like "PAYMENT" or "PURCHASE"

## KEY RULES:
- When in doubt, mark as personal (is_business: false) - it's safer to exclude a legitimate expense than to claim a personal one
- HMRC penalties for false claims are severe, so be conservative
- If truly uncertain, use low confidence

Return ONLY valid JSON array, no markdown or explanation.`;

interface TransactionInput {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
}

interface CategoryResult {
  id: string;
  is_business: boolean;
  category: string;
  confidence: number;
  reasoning: string;
}

export async function POST(request: NextRequest) {
  const { transactions, stream } = await request.json();

  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    return NextResponse.json(
      { error: 'No transactions provided' },
      { status: 400 }
    );
  }

  console.log('[categorise] Processing', transactions.length, 'transactions');

  // Format transactions for AI
  const transactionList = transactions.map((tx: Transaction) => ({
    id: tx.id,
    description: tx.description,
    amount: tx.amount,
    type: tx.type,
    date: tx.date,
  }));

  // Process in batches of 40 (increased from 20 for efficiency)
  const BATCH_SIZE = 40;
  // Process 3 batches in parallel for speed
  const PARALLEL_BATCHES = 3;

  const batches: TransactionInput[][] = [];
  for (let i = 0; i < transactionList.length; i += BATCH_SIZE) {
    batches.push(transactionList.slice(i, i + BATCH_SIZE));
  }

  console.log('[categorise] Split into', batches.length, 'batches of', BATCH_SIZE, '(processing', PARALLEL_BATCHES, 'in parallel)');

  // Helper function to process a single batch
  const processBatch = async (batch: TransactionInput[], batchIndex: number): Promise<{ index: number; results: CategoryResult[] | null; error?: string }> => {
    try {
      const message = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 8192, // Increased for larger batches
        messages: [
          {
            role: 'user',
            content: `Categorise these ${batch.length} transactions:\n\n${JSON.stringify(batch, null, 2)}`,
          },
        ],
        system: SYSTEM_PROMPT,
      });

      const responseText =
        message.content[0].type === 'text' ? message.content[0].text : '';

      // Handle potential markdown wrapping
      let jsonText = responseText.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const batchResults: CategoryResult[] = JSON.parse(jsonText);
      return { index: batchIndex, results: batchResults };
    } catch (error) {
      console.error('[categorise] Error processing batch', batchIndex + 1, ':', error);
      return { index: batchIndex, results: null, error: 'Failed to process batch' };
    }
  };

  // If streaming requested, use SSE
  if (stream) {
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        const allResults: CategoryResult[] = [];
        let completedBatches = 0;

        // Process batches in parallel groups
        for (let groupStart = 0; groupStart < batches.length; groupStart += PARALLEL_BATCHES) {
          const groupEnd = Math.min(groupStart + PARALLEL_BATCHES, batches.length);
          const batchGroup = batches.slice(groupStart, groupEnd);
          const batchIndices = Array.from({ length: batchGroup.length }, (_, i) => groupStart + i);

          sendEvent({
            type: 'progress',
            batch: groupStart + 1,
            totalBatches: batches.length,
            progress: Math.round((groupStart / batches.length) * 100),
            status: 'Processing, may take a few minutes...',
          });

          // Process all batches in this group in parallel
          const groupPromises = batchGroup.map((batch, i) =>
            processBatch(batch, batchIndices[i])
          );

          const groupResults = await Promise.all(groupPromises);

          // Process results from parallel batch group
          for (const result of groupResults) {
            completedBatches++;

            if (result.results) {
              allResults.push(...result.results);
              sendEvent({
                type: 'batch_complete',
                batch: result.index + 1,
                results: result.results,
              });
            } else {
              sendEvent({
                type: 'batch_error',
                batch: result.index + 1,
                error: result.error || 'Failed to process batch',
              });
            }
          }

          // Send updated progress after group completes
          sendEvent({
            type: 'progress',
            batch: groupEnd,
            totalBatches: batches.length,
            progress: Math.round((completedBatches / batches.length) * 100),
            status: 'Processing, may take a few minutes...',
          });
        }

        sendEvent({
          type: 'complete',
          success: true,
          total: allResults.length,
        });

        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  // Non-streaming fallback with parallel processing
  const allResults: CategoryResult[] = [];

  // Process batches in parallel groups
  for (let groupStart = 0; groupStart < batches.length; groupStart += PARALLEL_BATCHES) {
    const groupEnd = Math.min(groupStart + PARALLEL_BATCHES, batches.length);
    const batchGroup = batches.slice(groupStart, groupEnd);
    const batchIndices = Array.from({ length: batchGroup.length }, (_, i) => groupStart + i);

    console.log('[categorise] Processing batches', groupStart + 1, '-', groupEnd, 'of', batches.length, 'in parallel');

    // Process all batches in this group in parallel
    const groupPromises = batchGroup.map((batch, i) =>
      processBatch(batch, batchIndices[i])
    );

    const groupResults = await Promise.all(groupPromises);

    // Collect results
    for (const result of groupResults) {
      if (result.results) {
        allResults.push(...result.results);
        console.log('[categorise] Batch', result.index + 1, 'returned', result.results.length, 'results');
      } else {
        console.error('[categorise] Batch', result.index + 1, 'failed:', result.error);
      }
    }
  }

  console.log('[categorise] Total results:', allResults.length);

  return NextResponse.json({
    results: allResults,
    total: allResults.length,
  });
}
