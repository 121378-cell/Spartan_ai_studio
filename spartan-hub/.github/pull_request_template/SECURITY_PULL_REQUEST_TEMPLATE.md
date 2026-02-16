## Security Pull Request

### Security Impact Assessment
- [ ] High severity vulnerability fix
- [ ] Medium severity vulnerability fix
- [ ] Low severity vulnerability fix
- [ ] Security enhancement
- [ ] New security feature

### Description
<!-- Provide a detailed description of the security changes -->

### Security Issue Details
- **Vulnerability Type**: <!-- e.g., XSS, SQL Injection, Rate Limiting Bypass -->
- **Affected Components**: <!-- List affected files/components -->
- **CVSS Score (if known)**: <!-- If applicable -->

### Changes Made
<!-- Detail the specific changes made to address the security issue -->

### Security Testing Performed
- [ ] Unit tests added/updated for security scenarios
- [ ] Integration tests performed
- [ ] Penetration testing performed (if applicable)
- [ ] Dependency security scan performed

---

## Security Review Checklist

### Dependency Security
- [ ] All new dependencies have been audited for vulnerabilities
- [ ] No vulnerable versions of dependencies introduced
- [ ] Security advisories checked for all dependencies
- [ ] `npm audit` or equivalent shows 0 vulnerabilities

### Rate Limiting Implementation
- [ ] Differentiated rate limits by endpoint type (auth: 5/15min, read: 100/15min, write: 20/15min)
- [ ] Proper error handling with HTTP 429 status code
- [ ] Retry-After header included in responses
- [ ] X-RateLimit-* headers properly implemented
- [ ] Redis storage configured for distributed rate limiting
- [ ] IP-based limiting with support for forwarded headers

### Authentication & Authorization
- [ ] Authentication properly implemented
- [ ] Authorization checks applied where needed
- [ ] Session management secure
- [ ] Token handling secure

### Input Validation
- [ ] Zod schemas implemented for all inputs
- [ ] Proper sanitization of user inputs
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention measures in place

### Code Quality
- [ ] Security-specific error handling
- [ ] Proper logging of security events
- [ ] No sensitive information exposed in logs
- [ ] Secure configuration management

### Performance Impact
- [ ] Security measures don't introduce performance bottlenecks
- [ ] Rate limiting doesn't impact legitimate users disproportionately
- [ ] Security checks are efficient

---

## Mandatory Review Requirements

### Reviewer Qualifications
- [ ] Reviewer has security expertise
- [ ] Reviewer familiar with project security architecture
- [ ] At least one additional security-focused review required

### Approval Criteria
- [ ] All security checklist items verified
- [ ] Automated security scans pass
- [ ] No negative performance impact on security measures
- [ ] Proper error handling and logging implemented

---

By submitting this security pull request, I confirm that:
- All security vulnerabilities have been properly addressed
- Security testing has been performed
- Dependencies have been vetted for security
- Rate limiting and authentication measures are properly implemented
- The changes comply with all project security specifications