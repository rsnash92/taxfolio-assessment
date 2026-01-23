# TaxFolio Production Readiness Checklist

**Last Updated:** 2026-01-23
**HMRC Test Submissions Completed:** 5 cases (22, 43, 54, 130, 159)

## 1. Calculation Accuracy

### Validated via HMRC Test Submissions ✓

| Feature | Test Case | Status | Notes |
|---------|-----------|--------|-------|
| Employment income (SA102) | 22, 54 | ✓ Validated | Multiple employments tested |
| Self-employment short (SA103S) | 159 | ✓ Validated | Class 2/4 NIC exemption |
| Capital Gains - other assets (SA108) | 22, 43 | ✓ Validated | |
| Capital Gains - BADR (10% rate) | 43, 159 | ✓ Validated | Lifetime limit tracking |
| Capital Gains - losses | 159 | ✓ Validated | B/f losses, correct ordering |
| Scottish tax rates | 130 | ✓ Validated | All Scottish bands |
| RAS pension band extension | 130 | ✓ Validated | Net Pay method |
| Student loans (Plan 2) | 54 | ✓ Validated | |
| Postgraduate loan | 54 | ✓ Validated | |
| HICBC (High Income Child Benefit) | 130 | ✓ Validated | 60k-80k taper |
| Class 2 NIC (voluntary) | 159 | ✓ Validated | SSE36/SSECL2 |
| Class 4 NIC (+ exemption) | 22, 159 | ✓ Validated | SSE37 exemption |
| Savings income (PSA) | 43 | ✓ Validated | £1,000/£500/£0 tiers |
| Dividends (DA) | 43 | ✓ Validated | £500 allowance |
| AEA (Annual Exempt Amount) | 43, 159 | ✓ Validated | £3,000 for 2024-25 |

### Validated via Calculator Tests Only

| Feature | Status | Notes |
|---------|--------|-------|
| Welsh tax rates | ⚠️ Partial | Uses same rates as England |
| Marriage Allowance (transfer in) | ⚠️ Not tested | Logic implemented |
| Marriage Allowance (transfer out) | ⚠️ Not tested | Logic implemented |
| Gift Aid band extension | ⚠️ Partial | Similar to RAS extension |
| PA taper (>£100k income) | ✓ Logic verified | Tested in Case 194 analysis |
| BPA (Blind Person's Allowance) | ⚠️ Not tested | Simple addition to PA |

### Not Yet Validated

| Feature | Priority | Notes |
|---------|----------|-------|
| Residential property CGT (18%/24%) | HIGH | Rates implemented, needs test case |
| Student loans (Plan 1, Plan 4) | MEDIUM | Different thresholds |
| Foreign income (SA106) | LOW | Complex, defer to Phase 2 |
| Trust income | LOW | Rare, defer to Phase 2 |
| Partnership income (SA104) | LOW | Complex, defer to Phase 2 |
| Property income (SA105) | MEDIUM | Common, needs test case |
| Pension annual allowance charge | LOW | Edge case |
| Chargeable event gains / top slicing | LOW | Complex, defer to Phase 2 |
| Self-employment full (SA103F) | MEDIUM | CIS, capital allowances |
| UK property CGT already paid | MEDIUM | PPD returns |

## 2. Known Calculation Discrepancies

| Scenario | Discrepancy | Impact | Workaround |
|----------|-------------|--------|------------|
| Case 194: High earner + large RAS pension (>£20k) | ~£1,854 | LOW - edge case | Manual review for >£20k pension contributions |
| Case 54: Student loan income base | Minor rounding | NONE | HMRC accepted submission |

## 3. Security Checklist

### Authentication & Credentials
- [ ] HMRC credentials stored in environment variables (not in code)
- [ ] Credentials encrypted at rest
- [ ] API keys rotated on schedule
- [ ] Production credentials separate from test

### Data Protection
- [x] HTTPS enforced for all endpoints
- [ ] Input validation on all user data
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] CSRF protection tokens
- [ ] Rate limiting on submission endpoint

### Access Control
- [ ] User authentication implemented
- [ ] Role-based access control
- [ ] Session management (timeout, invalidation)
- [ ] Audit logging for submissions

### Data Storage
- [ ] Data encryption at rest (AES-256)
- [ ] GDPR compliance (data retention policy)
- [ ] User data deletion capability
- [ ] Backup and recovery tested

## 4. Error Handling

### HMRC Integration
- [x] HMRC rejection errors parsed and structured
- [x] Correlation ID captured and logged
- [ ] User-friendly error messages (translate HMRC codes)
- [x] Network timeout handling (120s default)
- [ ] Retry logic for transient failures (429, 5xx)
- [ ] Graceful degradation if HMRC unavailable

### Validation
- [x] XML schema validation before submission
- [x] IRmark calculation and verification
- [ ] Pre-submission validation warnings
- [ ] Field-level validation feedback

## 5. User Experience

### Submission Flow
- [ ] Clear progress indicator during submission
- [ ] Confirmation screen before final submission
- [ ] Cancel/back functionality
- [ ] Auto-save draft returns

### Post-Submission
- [ ] PDF/printable copy of submitted return
- [ ] Email confirmation of submission
- [x] Correlation ID displayed to user
- [ ] HMRC receipt displayed/downloadable

### Help & Guidance
- [ ] Help text for complex fields
- [ ] Tooltips for tax terminology
- [ ] Links to HMRC guidance
- [ ] FAQ section

## 6. Testing

### Automated Tests
- [ ] Unit tests for tax calculator (>80% coverage)
- [ ] Integration tests for XML builder
- [ ] End-to-end tests for submission flow
- [ ] Snapshot tests for XML output

### Manual Testing
- [x] HMRC test environment submissions (5 cases)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsiveness testing
- [ ] Accessibility testing (WCAG 2.1 AA)

### Performance
- [ ] Load testing for concurrent submissions
- [ ] Response time benchmarks
- [ ] Memory leak testing

## 7. Monitoring & Support

### Application Monitoring
- [ ] Application health endpoint (/health)
- [ ] Error tracking (Sentry or similar)
- [ ] Performance monitoring (APM)
- [ ] Uptime monitoring

### Metrics & Dashboards
- [ ] Submission success/failure rates
- [ ] Average submission time
- [ ] Error rate by type
- [ ] User journey analytics

### Support
- [ ] Support ticket system
- [ ] FAQ documentation
- [ ] Contact method for urgent issues
- [ ] SLA defined for support responses

## 8. Legal & Compliance

### Documentation
- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] Cookie Policy
- [ ] Acceptable Use Policy

### HMRC Compliance
- [x] HMRC vendor agreement in place
- [x] Test environment access approved
- [ ] Production environment access approved
- [ ] Annual re-certification process documented

### Professional
- [ ] Professional indemnity insurance (if applicable)
- [ ] Disclaimer about tax advice
- [ ] Clear statement: not a substitute for professional advice

## 9. Deployment & Operations

### Infrastructure
- [ ] Production environment provisioned
- [ ] Database scaled appropriately
- [ ] CDN configured for static assets
- [ ] SSL certificates installed and auto-renewing

### CI/CD Pipeline
- [ ] Automated build process
- [ ] Automated testing in pipeline
- [ ] Staging environment for pre-prod testing
- [ ] Blue/green or canary deployment capability

### Disaster Recovery
- [ ] Database backup schedule (daily minimum)
- [ ] Backup restoration tested
- [ ] Rollback procedure documented
- [ ] Incident response plan

## 10. Go-Live Checklist

### Pre-Launch (1 week before)
- [ ] All HIGH priority items above completed
- [ ] Production HMRC credentials obtained
- [ ] Final regression test on staging
- [ ] Support team briefed
- [ ] Monitoring dashboards ready

### Launch Day
- [ ] Switch from test to production HMRC endpoint
- [ ] Update credentials for production
- [ ] Remove `GatewayTest=1` flag from XML
- [ ] Smoke test first submission
- [ ] Monitor first 10 submissions closely

### Post-Launch (first week)
- [ ] Daily review of error logs
- [ ] User feedback collection
- [ ] Performance baseline established
- [ ] Hotfix process ready if needed

## 11. Tax Year Rollover

### Annual Updates Needed
- [ ] New tax rates and thresholds (April each year)
- [ ] New HMRC schema version (usually March)
- [ ] New test cases from HMRC
- [ ] Regression testing with new parameters
- [ ] Update TaxParams in tax-calculator.ts

### 2025-26 Changes to Track
- [ ] Personal Allowance (frozen at £12,570?)
- [ ] Scottish rate changes
- [ ] NIC rates and thresholds
- [ ] CGT rates (residential/non-residential)
- [ ] Student loan thresholds
- [ ] HICBC thresholds

---

## Summary Status

| Category | Ready | In Progress | Not Started |
|----------|-------|-------------|-------------|
| Calculation Accuracy | 16 | 3 | 10 |
| Security | 1 | 0 | 10 |
| Error Handling | 4 | 0 | 4 |
| User Experience | 1 | 0 | 9 |
| Testing | 1 | 0 | 8 |
| Monitoring | 0 | 0 | 8 |
| Legal | 2 | 0 | 5 |
| Deployment | 0 | 0 | 9 |

**Overall Readiness: ~25%**

### Top Priority Items Before Go-Live

1. **Security:** HMRC credentials management, input validation
2. **Error Handling:** User-friendly error messages for HMRC rejections
3. **User Experience:** Confirmation screen, progress indicator
4. **Testing:** Unit tests for calculator
5. **Legal:** Terms of Service, Privacy Policy
6. **Deployment:** Production environment, CI/CD pipeline
