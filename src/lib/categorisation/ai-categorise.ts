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

export async function categoriseTransactions(
  transactions: TrueLayerTransaction[]
): Promise<CategorisedTransaction[]> {
  if (!transactions.length) return [];

  // Process in batches of 50
  const batchSize = 50;
  const results: CategorisedTransaction[] = [];

  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    const categorised = await categoriseBatch(batch);
    results.push(...categorised);
  }

  return results;
}

async function categoriseBatch(
  transactions: TrueLayerTransaction[]
): Promise<CategorisedTransaction[]> {
  const prompt = `You are a UK tax categorisation assistant for self-employed sole traders.

Analyse each bank transaction and determine:
1. category: HMRC expense category
2. is_business: true if business expense, false if personal
3. confidence: 0.0 to 1.0

HMRC Categories:
- Office Costs (stationery, phone bills)
- Travel (fuel, train, parking for business)
- Clothing (uniforms, safety gear only)
- Staff Costs (salaries, subcontractors)
- Stock & Materials (goods for resale)
- Legal & Professional (accountant, solicitor)
- Marketing (advertising, website)
- Software & Subscriptions (Xero, Adobe, Microsoft)
- Insurance (business insurance)
- Bank Charges (business account fees)
- Training (courses, books for business)
- Other Expenses

BUSINESS indicators (high confidence):
- Software: Adobe, Microsoft, Xero, QuickBooks, Canva, Figma, GitHub, AWS, Heroku
- Advertising: Google Ads, Facebook Ads, LinkedIn
- Professional: accountant, solicitor, consultant
- Domains/Hosting: GoDaddy, Namecheap, Cloudflare, Vercel
- Office supplies: Staples, Viking, Amazon Business
- Business travel: Trainline, Hotels.com (if description suggests work)
- Co-working: WeWork, Regus

PERSONAL indicators (high confidence):
- Supermarkets: Tesco, Sainsbury's, Asda, Lidl, Aldi, Morrisons, Waitrose
- Entertainment: Netflix, Spotify, Disney+, Prime Video, Cinema
- Food delivery: Deliveroo, Uber Eats, Just Eat (unless client entertainment)
- Personal shopping: ASOS, Zara, H&M, Next
- Utilities: Council Tax, Water, Gas, Electric (unless home office claim)
- Personal finance: mortgage, rent, personal loans

AMBIGUOUS (lower confidence, needs_review):
- Amazon (could be either)
- General bank transfers
- Cash withdrawals
- Restaurants (could be client entertainment)

Transactions:
${JSON.stringify(
  transactions.map((t) => ({
    description: t.description,
    amount: t.amount,
    date: t.timestamp,
    merchant: t.merchant_name,
  })),
  null,
  2
)}

Respond with ONLY a JSON array (no markdown, no backticks):
[{"category": "...", "is_business": true, "confidence": 0.95}, ...]`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response');

    // Parse JSON
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Could not parse response');

    const results = JSON.parse(jsonMatch[0]);

    return transactions.map((t, i) => ({
      ...t,
      category: results[i]?.category || 'Other',
      suggested_category: results[i]?.category || 'Other',
      is_business: results[i]?.is_business ?? false,
      confidence: results[i]?.confidence ?? 0.5,
    }));
  } catch (error) {
    console.error('AI categorisation error:', error);
    // Fallback - mark all as needs review
    return transactions.map((t) => ({
      ...t,
      category: 'Other',
      suggested_category: 'Other',
      is_business: false,
      confidence: 0.5,
    }));
  }
}
