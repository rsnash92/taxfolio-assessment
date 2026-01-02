import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { Transaction } from '@/types/wizard';

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a UK tax categorisation assistant. Categorise bank transactions for a self-employed sole trader's Self Assessment tax return.

IMPORTANT: This is likely a MIXED personal/business bank account. Most sole traders use their personal account for business, so you must identify which transactions are personal (not business-related) and which are legitimate business expenses or income.

For each transaction, return a JSON object with:
- id: the transaction id (REQUIRED - copy exactly from input)
- is_business: boolean (true = business expense/income, false = personal)
- category: suggested category name (e.g. "Office Supplies", "Travel", "Software", "Client Payment")
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

Software & Tools:
- Adobe, Microsoft 365, Google Workspace, Notion, Canva
- Zoom, Slack, Teams, Loom
- Xero, QuickBooks, FreeAgent (accounting)
- GitHub, GitLab, Figma, Miro

Hosting & Tech:
- AWS, Google Cloud, Azure, DigitalOcean
- Vercel, Netlify, Heroku, Railway
- GoDaddy, Namecheap, Cloudflare

Marketing & Advertising:
- Google Ads, Facebook/Meta Ads, LinkedIn Ads
- Mailchimp, ConvertKit, Klaviyo
- Hootsuite, Buffer

Professional Services:
- Accountant fees, solicitor/legal fees
- Business insurance, professional indemnity

Office & Supplies:
- Staples, Viking Direct
- Office Depot, Amazon (when clearly office supplies)

Business Travel:
- Train tickets to client meetings (Trainline, LNER, GWR)
- Business hotels, conference accommodation
- Client entertainment with clear business context

Income (money IN):
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

  // Process in batches of 20
  const BATCH_SIZE = 20;
  const batches: TransactionInput[][] = [];
  for (let i = 0; i < transactionList.length; i += BATCH_SIZE) {
    batches.push(transactionList.slice(i, i + BATCH_SIZE));
  }

  console.log('[categorise] Split into', batches.length, 'batches');

  // If streaming requested, use SSE
  if (stream) {
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        const allResults: CategoryResult[] = [];

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          const progress = Math.round(((batchIndex + 1) / batches.length) * 100);

          sendEvent({
            type: 'progress',
            batch: batchIndex + 1,
            totalBatches: batches.length,
            progress,
            status: `Processing batch ${batchIndex + 1} of ${batches.length}...`,
          });

          try {
            const message = await anthropic.messages.create({
              model: 'claude-3-5-haiku-20241022',
              max_tokens: 4096,
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

            try {
              // Handle potential markdown wrapping
              let jsonText = responseText.trim();
              if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
              }

              const batchResults: CategoryResult[] = JSON.parse(jsonText);
              allResults.push(...batchResults);

              // Send batch results
              sendEvent({
                type: 'batch_complete',
                batch: batchIndex + 1,
                results: batchResults,
              });
            } catch (parseError) {
              console.error('[categorise] Failed to parse batch', batchIndex + 1);
              sendEvent({
                type: 'batch_error',
                batch: batchIndex + 1,
                error: 'Failed to parse AI response',
              });
            }
          } catch (batchError) {
            console.error('[categorise] Error processing batch', batchIndex + 1, ':', batchError);
            sendEvent({
              type: 'batch_error',
              batch: batchIndex + 1,
              error: 'Failed to process batch',
            });
          }
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

  // Non-streaming fallback
  const allResults: CategoryResult[] = [];

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log('[categorise] Processing batch', batchIndex + 1, 'of', batches.length);

    try {
      const message = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4096,
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

      try {
        // Handle potential markdown wrapping
        let jsonText = responseText.trim();
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        const batchResults: CategoryResult[] = JSON.parse(jsonText);
        allResults.push(...batchResults);
        console.log('[categorise] Batch', batchIndex + 1, 'parsed', batchResults.length, 'results');
      } catch {
        console.error('[categorise] Failed to parse batch', batchIndex + 1);
      }
    } catch (batchError) {
      console.error('[categorise] Error processing batch', batchIndex + 1, ':', batchError);
    }
  }

  console.log('[categorise] Total results:', allResults.length);

  return NextResponse.json({
    results: allResults,
    total: allResults.length,
  });
}
