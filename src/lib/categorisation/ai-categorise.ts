import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

interface TrueLayerTransaction {
  transaction_id: string;
  timestamp: string;
  description: string;
  transaction_type: 'DEBIT' | 'CREDIT';
  amount: number;
  currency: string;
  transaction_category?: string;
  merchant_name?: string;
}

interface CategorisedTransaction extends TrueLayerTransaction {
  category: string;
  suggested_category: string;
  is_business: boolean;
  confidence: number;
}

const SYSTEM_PROMPT = `You are a UK tax categorisation assistant. Categorise bank transactions for a self-employed sole trader's Self Assessment tax return.

IMPORTANT: This is likely a MIXED personal/business bank account. Most sole traders use their personal account for business, so you must identify which transactions are personal (not business-related) and which are legitimate business expenses or income.

For each transaction, return a JSON object with:
- category: simplified category name for display
- is_business: true if business expense/income, false if personal
- confidence: 0.0 to 1.0 (how confident you are)

## PERSONAL TRANSACTION RULES - Mark as personal (is_business: false):

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

## BUSINESS TRANSACTION RULES - Mark as business (is_business: true):

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

Income (CREDIT transactions / money coming in):
- Payments from companies/clients (look for Ltd, LLC, Inc in name)
- Invoice payments, Stripe payouts, PayPal business

## PROPERTY/LANDLORD TRANSACTIONS - For rental property owners:

Property Income:
- Rent received from tenants
- Tenant deposits returned
- LOOK FOR: tenant names, "rent", property addresses, letting agent names

Property Expenses:
- Letting agent fees: Foxtons, Countrywide, OpenRent, Purplebricks, Martin & Co
- Landlord insurance: HomeLet, Just Landlords, Simply Business landlord
- Property repairs: Checkatrade, MyBuilder, plumbers, electricians, boiler service
- Ground rent & service charges: Freeholder payments, management company
- Safety certificates: Gas Safe, EPC, electrical inspections

## AMBIGUOUS - Set LOW confidence (0.3-0.5):
- Amazon purchases (could be either)
- Generic coffee shop visits
- Phone bills (business mobile vs personal)
- PayPal/Stripe without details
- Large round-number transfers
- Generic descriptions like "PAYMENT" or "PURCHASE"

## KEY RULES:
- DEBIT = money OUT (expenses/payments)
- CREDIT = money IN (income)
- When in doubt, mark as personal (is_business: false) - it's safer to exclude a legitimate expense than to claim a personal one
- HMRC penalties for false claims are severe, so be conservative
- If truly uncertain, use low confidence (0.3-0.5) so it gets flagged for review

Return ONLY valid JSON array, no markdown or explanation.`;

export async function categoriseTransactions(
  transactions: TrueLayerTransaction[]
): Promise<CategorisedTransaction[]> {
  if (!transactions.length) return [];

  // Process in batches of 20 (matching main app)
  const batchSize = 20;
  const results: CategorisedTransaction[] = [];

  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    console.log(`[AI Categorise] Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(transactions.length / batchSize)}`);
    const categorised = await categoriseBatch(batch);
    results.push(...categorised);
  }

  return results;
}

async function categoriseBatch(
  transactions: TrueLayerTransaction[]
): Promise<CategorisedTransaction[]> {
  const transactionList = transactions.map((t) => ({
    description: t.description,
    amount: t.amount,
    type: t.transaction_type,
    date: t.timestamp,
    merchant: t.merchant_name,
  }));

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Categorise these ${transactions.length} transactions:\n\n${JSON.stringify(transactionList, null, 2)}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response');

    // Parse JSON - handle potential markdown wrapping
    let responseText = content.text.trim();
    if (responseText.startsWith('```')) {
      responseText = responseText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }

    const results = JSON.parse(responseText);

    return transactions.map((t, i) => ({
      ...t,
      category: results[i]?.category || 'Other',
      suggested_category: results[i]?.category || 'Other',
      is_business: results[i]?.is_business ?? false,
      confidence: results[i]?.confidence ?? 0.5,
    }));
  } catch (error) {
    console.error('[AI Categorise] Error:', error);
    // Fallback - mark all as needs review with low confidence
    return transactions.map((t) => ({
      ...t,
      category: 'Needs Review',
      suggested_category: 'Needs Review',
      is_business: false,
      confidence: 0.3,
    }));
  }
}
