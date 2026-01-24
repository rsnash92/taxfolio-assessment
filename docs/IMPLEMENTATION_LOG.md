# TaxFolio Implementation Log

Reference document tracking completed work, test results, and known issues.

---

## Phase 1: Security Hardening ✅ COMPLETE

**Date:** January 2026

### Files Created

| File | Purpose |
|------|---------|
| `src/lib/security/audit-log.ts` | Security audit logging with sensitive field redaction |
| `src/lib/security/rate-limiter.ts` | In-memory rate limiter with sliding window algorithm |
| `src/lib/utils/request-id.ts` | Request ID and correlation ID generators |

### Files Modified

| File | Changes |
|------|---------|
| `.gitignore` | Added patterns for credentials, secrets, logs |

### Key Features

- **Audit Logging**: Structured logging with automatic PII redaction (NINO, UTR, passwords, etc.)
- **Rate Limiting**: Configurable limits for general (60/min), auth (10/min), submission (5/hour)
- **Request Tracking**: Unique request IDs for tracing through logs

---

## Phase 2: Error Handling ✅ COMPLETE

**Date:** January 2026

### Files Created

| File | Purpose |
|------|---------|
| `src/lib/sa100/hmrc-error-codes.ts` | HMRC error code mapping with user-friendly messages |
| `src/lib/sa100/parse-hmrc-response.ts` | GovTalk XML response parser |
| `src/lib/utils/retry.ts` | Retry utility with exponential backoff |
| `src/lib/utils/timeout.ts` | Promise timeout wrapper |
| `src/lib/api/error-response.ts` | Standardized API error response helpers |
| `src/app/api/health/route.ts` | Health check endpoint |

### Files Modified

| File | Changes |
|------|---------|
| `src/lib/sa100/transaction-engine.ts` | Added retry, timeout, enhanced error parsing |
| `src/app/api/declarations/[id]/submit/route.ts` | Updated to use new error types |
| `src/lib/sa100/test-hmrc-submission.ts` | Updated error property names |

### Key Features

- **HMRC Error Codes**: Maps error codes (1xxx-9xxx) to categories (schema, business, auth, system, duplicate)
- **Retry Logic**: 3 attempts, 2s initial delay, 2x backoff, jitter for 502/503/504/429
- **Timeouts**: 60s for submission, 30s for polling
- **Health Check**: `/api/health` endpoint with environment validation

### Error Code Categories

| Range | Category | Example |
|-------|----------|---------|
| 1xxx, 4xxx, 6xxx | Schema validation | Invalid XML structure |
| 2xxx | Authentication | Invalid credentials |
| 3xxx | Business rules | UTR/NINO mismatch |
| 5xxx | Duplicate | Return already filed |
| 9xxx | System | Service unavailable |

---

## Phase 3: Tax Calculator Validation ✅ COMPLETE

**Date:** January 2026

### Files Created

| File | Purpose |
|------|---------|
| `src/lib/sa100/tests/test-case-42.ts` | HMRC Test Case 42 validation script |
| `src/lib/sa100/tests/test-case-43.ts` | HMRC Test Case 43 validation script |
| `src/lib/sa100/tests/test-case-64.ts` | HMRC Test Case 64 validation script |
| `src/lib/sa100/tests/test-case-157.ts` | HMRC Test Case 157 validation script |

### Test Case 43 Results (High Earner - PA Taper, BPA, Savings, Dividends, CGT)

**Input Data:**
- Employment income: £113,825 (£101k + £13k benefits - £175 expenses)
- Savings (taxed interest): £3,678
- Dividends: £12,750
- Blind Person's Allowance: Yes
- BADR gains: £20,000
- Other CGT gains: £30,000 gross (£27,000 after AEA)
- PAYE deducted: £23,084

**Results: 12/12 PASS**

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| Total income | £130,253 | £130,253 | ✅ |
| Total PA (incl. BPA) | £15,640 | £15,640 | ✅ |
| PA reduction (taper) | £12,570 | £12,570 | ✅ |
| Effective PA (BPA only) | £3,070 | £3,070 | ✅ |
| Total taxable income | £127,183 | £127,183 | ✅ |
| Tax on non-savings | £36,762 | £36,762 | ✅ |
| Tax on savings (HR) | £1,471.20 | £1,471.20 | ✅ |
| Tax on dividends | £4,248.78 | £4,248.78 | ✅ |
| Total income tax | £42,481.98 | £42,481.98 | ✅ |
| Tax deducted (PAYE) | £23,084 | £23,084 | ✅ |
| Total CGT | £7,400 | £7,400 | ✅ |
| **Total Tax Due** | **£26,798** | **£26,798** | ✅ |

**Key Validations:**
- PA taper works correctly (income £130,253 → PA fully eliminated)
- BPA (£3,070) is NOT subject to taper - remains as effective allowance
- PSA = £0 for additional rate taxpayer (total income > £125,140)
- Dividend split between higher (33.75%) and additional (39.35%) rates correct
- CGT: BADR at 10%, other gains at 20% (no basic rate band remaining)

---

### Test Case 64 Results

**Input Data:**
- Self-employment profit: £17,730
- Pension income: £6,200
- Other income: £1,500 (£300 tax deducted)
- Gift Aid: £2,400 (net)
- BADR gains: £12,000
- Other CGT gains: £15,000 (after AEA)
- Over state pension age (Class 4 & Class 2 exempt)

**Results: 9/9 PASS**

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| Total income | £25,430 | £25,430 | ✅ |
| Personal Allowance | £12,570 | £12,570 | ✅ |
| Taxable income | £12,860 | £12,860 | ✅ |
| Gift Aid extension | £3,000 | £3,000 | ✅ |
| Income Tax @ 20% | £2,572 | £2,572 | ✅ |
| Tax deducted | £300 | £300 | ✅ |
| Class 4 NIC | £0 | £0 | ✅ |
| Total CGT | £2,700 | £2,700 | ✅ |
| **Total Tax Due** | **£4,972** | **£4,972** | ✅ |

### Key Findings

1. **CGT Input Format**: HMRC test data provides gains AFTER AEA. Calculator applies AEA internally, so input gross gains (add £3,000 back for non-BADR gains).

2. **Class 2 NIC Gap**: Calculator has `class4Exempt` but no `class2Exempt`. Workaround: use `class2NICRegistered: true`.

3. **Gift Aid**: Correctly extends basic rate band by grossed-up amount (net × 1.25).

4. **Beneficial PA Allocation** ✅ IMPLEMENTED: When savings qualify for the 0% starting rate and there are dividends, PA is allocated to dividends first (skipping savings). This matches HMRC's tax-minimizing behavior.

---

### Test Case 157 Results (Low Income with CGT and Voluntary Class 2)

**Input Data:**
- Self-employment profit: £4,153
- Taxed interest: £2,026 (£80.25 tax deducted)
- Dividends: £128
- Total income: £6,307 (below Personal Allowance)
- Voluntary Class 2 NIC: 46.5 weeks × £3.45
- CGT gross gains: £90,000 (£87,000 taxable after £3,000 AEA)

**Results: 13/13 PASS**

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| Total income | £6,307 | £6,307 | ✅ |
| Taxable income | £0 | £0 | ✅ |
| Income Tax | £0 | £0 | ✅ |
| Class 4 NIC | £0 | £0 | ✅ |
| Class 2 NIC (voluntary) | £160.43 | £160.43 | ✅ |
| Tax deducted | £80.25 | £80.25 | ✅ |
| Taxable capital gains | £87,000 | £87,000 | ✅ |
| Gains at basic rate | £37,700 | £37,700 | ✅ |
| Gains at higher rate | £49,300 | £49,300 | ✅ |
| CGT at 10% | £3,770 | £3,770 | ✅ |
| CGT at 20% | £9,860 | £9,860 | ✅ |
| Total CGT | £13,630 | £13,630 | ✅ |
| **Total Tax Due** | **£13,710** | **£13,710** | ✅ |

**Key Validations:**
- Income below PA results in £0 taxable income (correct)
- Full basic rate band (£37,700) available for CGT when no income uses it
- CGT correctly split: £37,700 at 10%, remaining £49,300 at 20%
- Voluntary Class 2 NIC calculated correctly (46.5 × £3.45 = £160.43)
- Tax deducted (£80.25) offsets against total liability

---

### Test Case 42 Results (SE Loss + MAT Transfer OUT + Voluntary Class 2)

**Input Data:**
- Employment income: £11,570
- Self-employment loss: £10,530 (claimed £10,450 against other income)
- Taxed interest: £3,678
- UK Dividends: £12,750
- Marriage Allowance Transfer OUT: Yes (PA reduced by £1,260)
- Voluntary Class 2 NIC: 45.65 weeks × £3.45 = £157.50

**Results: 8/8 PASS** ✅

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| Total income (before loss) | £27,998 | £27,998 | ✅ |
| Net income (after loss) | £17,548 | £17,548 | ✅ |
| Effective PA (after MAT) | £11,310 | £11,310 | ✅ |
| Total taxable income | £6,238 | £6,238 | ✅ |
| Class 4 NIC (loss year) | £0 | £0 | ✅ |
| Class 2 NIC (voluntary) | £157.50 | £157.49 | ✅ |
| Total Income Tax | £180.25 | £180.25 | ✅ |
| **Total Tax Due** | **£338** | **£338** | ✅ |

**Key Validations:**
- ✅ Self-employment loss relief deduction (REL17) - £10,450 offset against employment
- ✅ Marriage Allowance Transfer OUT reduces PA from £12,570 to £11,310
- ✅ Beneficial PA allocation: PA goes to dividends, savings taxed at 0% starting rate
- ✅ Voluntary Class 2 NIC calculated correctly (45.65 × £3.45 = £157.49)
- ✅ Class 4 NIC = £0 for loss year

**Beneficial PA Allocation (Fixed in January 2026):**

When savings qualify for the 0% starting rate, the calculator now allocates PA to dividends before savings:
- Non-savings: £1,120 - £1,120 PA = £0 taxable
- Dividends: £12,750 - £10,190 PA = £2,560 taxable → £180.25 tax
- Savings: £3,678 taxable at 0% starting rate = £0 tax

---

## Known Issues & Recommended Improvements

### High Priority

1. **Add `class2Exempt` flag to `TaxCalculationInput`**
   - Location: `src/lib/sa100/tax-calculator.ts`
   - Reason: Taxpayers over state pension age are exempt from both Class 2 and Class 4
   - Current workaround: `class2NICRegistered: true`

### Medium Priority

2. **Redis-backed rate limiting for production**
   - Location: `src/lib/security/rate-limiter.ts`
   - Reason: In-memory store doesn't work with multiple server instances
   - Suggestion: Use `@upstash/ratelimit` with Redis

3. **Production logging integration**
   - Location: `src/lib/security/audit-log.ts`
   - Reason: Console logging insufficient for production
   - Suggestion: Integrate with CloudWatch, Datadog, or similar

### Low Priority

4. **HMRC health check endpoint**
   - Location: `src/app/api/health/route.ts`
   - Reason: Currently only checks environment variables
   - Suggestion: Add optional HMRC connectivity check (commented code exists)

---

## File Structure Reference

```
src/
├── app/
│   └── api/
│       ├── declarations/[id]/submit/route.ts  # Submission endpoint
│       └── health/route.ts                     # Health check (NEW)
├── lib/
│   ├── api/
│   │   └── error-response.ts                   # API error helpers (NEW)
│   ├── sa100/
│   │   ├── hmrc-error-codes.ts                 # Error code mapping (NEW)
│   │   ├── parse-hmrc-response.ts              # XML parser (NEW)
│   │   ├── tax-calculator.ts                   # Tax calculation engine
│   │   ├── transaction-engine.ts               # HMRC submission (MODIFIED)
│   │   ├── types.ts                            # TypeScript types
│   │   └── tests/
│   │       ├── test-case-42.ts                 # SE loss + MAT test (NEW)
│   │       ├── test-case-43.ts                 # High earner test (NEW)
│   │       ├── test-case-64.ts                 # Self-employed test (NEW)
│   │       └── test-case-157.ts                # Low income with CGT (NEW)
│   ├── security/
│   │   ├── audit-log.ts                        # Audit logging (NEW)
│   │   └── rate-limiter.ts                     # Rate limiting (NEW)
│   └── utils/
│       ├── request-id.ts                       # ID generators (NEW)
│       ├── retry.ts                            # Retry logic (NEW)
│       └── timeout.ts                          # Timeout wrapper (NEW)
```

---

## Running Tests

### Test Case 42 (SE Loss + MAT Transfer)
```bash
cd /Users/rob/Documents/GitHub/assessment-app
npx tsx src/lib/sa100/tests/test-case-42.ts
```

### Test Case 43 (High Earner)
```bash
cd /Users/rob/Documents/GitHub/assessment-app
npx tsx src/lib/sa100/tests/test-case-43.ts
```

### Test Case 64 (Self-Employed with CGT)
```bash
cd /Users/rob/Documents/GitHub/assessment-app
npx tsx src/lib/sa100/tests/test-case-64.ts
```

### Test Case 157 (Low Income with CGT)
```bash
cd /Users/rob/Documents/GitHub/assessment-app
npx tsx src/lib/sa100/tests/test-case-157.ts
```

### Type Check
```bash
npx tsc --noEmit
```

### Health Check (when running locally)
```bash
curl http://localhost:3000/api/health
```

---

## Tax Year 2024-25 Parameters

| Parameter | Value |
|-----------|-------|
| Personal Allowance | £12,570 |
| Basic Rate Band | £37,700 |
| Higher Rate Threshold | £50,270 |
| Additional Rate Threshold | £125,140 |
| Dividend Allowance | £500 |
| CGT Annual Exempt Amount | £3,000 |
| Class 2 NIC (weekly) | £3.45 |
| Class 4 NIC Lower Limit | £12,570 |
| Class 4 NIC Upper Limit | £50,270 |

---

## Contact & Resources

- **HMRC Technical Specs**: https://www.gov.uk/government/publications/self-assessment-technical-specifications-2025-for-individual-returns
- **Tax Year**: 2024-25 (6 April 2024 - 5 April 2025)
- **Submission Deadline**: 31 January 2026

---

*Last updated: January 2026*
