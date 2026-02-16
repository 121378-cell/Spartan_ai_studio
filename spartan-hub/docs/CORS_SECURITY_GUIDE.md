# CORS Security Guide

## Overview

This document explains the CORS (Cross-Origin Resource Sharing) security implementation in Spartan Hub and provides guidelines for secure configuration.

## Security Risk

### Why CORS Matters

When `credentials: true` is enabled in CORS configuration (required for cookies, authentication tokens, and sessions), using `origin: '*'` creates a **critical security vulnerability**:

- **Cookie Exposure**: Any website can read user cookies and authentication tokens
- **CSRF Bypass**: Cross-Site Request Forgery protections become ineffective
- **Data Theft**: Sensitive user data can be accessed by malicious sites
- **Session Hijacking**: Attacker can impersonate authenticated users

### The Vulnerability

```javascript
// ❌ VULNERABLE - NEVER do this!
app.use(cors({
  origin: '*',              // Wildcard with credentials = SECURITY BREACH
  credentials: true         // Cookies/tokens exposed to any site
}));
```

## Spartan Hub CORS Implementation

### Security Features

1. **Wildcard Prevention**: Explicitly blocks `*` as origin
2. **Whitelist Support**: Supports multiple allowed origins
3. **Request Validation**: Validates every incoming request origin
4. **Security Logging**: Logs blocked requests and security alerts
5. **Safe Defaults**: Falls back to localhost for development

### Implementation Details

The CORS configuration in `backend/src/server.ts` includes:

```javascript
// Validates that origin is not wildcard
function validateCorsOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }
  if (origin === '*') {
    logger.error('SECURITY ALERT: CORS_ORIGIN cannot be "*" when credentials are enabled', {
      context: 'corsSecurity'
    });
    return false;
  }
  return true;
}

// Supports both single origin and whitelist
function getCorsWhitelist(): string[] | string {
  if (allowedOrigins) {
    return allowedOrigins.split(',').map(o => o.trim());
  }
  if (corsOrigin && validateCorsOrigin(corsOrigin)) {
    return corsOrigin;
  }
  return 'http://localhost:5173'; // Safe default
}

// Validates each request
const corsOptions = {
  origin: (origin: string | undefined, callback) => {
    // ... validation logic
  },
  credentials: true
};
```

## Configuration Guide

### Development Environment

File: `backend/.env.development` or `.env`

```bash
# Single origin (most common)
CORS_ORIGIN=http://localhost:5173

# OR multiple origins for different dev environments
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173
```

### Production Environment

File: `.env.production` (never commit this file)

```bash
# Single production domain
CORS_ORIGIN=https://your-domain.com

# OR multiple production domains
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com,https://app.your-domain.com
```

### Configuration Rules

1. **NEVER** use `CORS_ORIGIN=*`
2. **ALWAYS** use HTTPS in production
3. **BE EXPLICIT** about which origins are allowed
4. **USE WILTLIST** when you have multiple valid domains
5. **VALIDATE** each origin before adding to whitelist

### Multi-Domain Setup

For applications with multiple valid origins:

```bash
# Correct format (comma-separated, no spaces)
ALLOWED_ORIGINS=https://app.yourcompany.com,https://admin.yourcompany.com,https://portal.yourcompany.com
```

## Testing CORS Configuration

### Test 1: Valid Origin

```bash
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS http://localhost:3001/api/health
```

**Expected**: Response with `Access-Control-Allow-Origin: http://localhost:5173`

### Test 2: Invalid Origin

```bash
curl -H "Origin: https://malicious-site.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS http://localhost:3001/api/health
```

**Expected**: 
- Response without CORS headers
- Log entry: "CORS blocked request from unauthorized origin"

### Test 3: Wildcard Prevention

If someone tries to set `CORS_ORIGIN=*`:

**Expected**:
- Server logs error: "SECURITY ALERT: CORS_ORIGIN cannot be '*'"
- Falls back to safe default (localhost)
- No wildcard is ever used

## Monitoring and Alerts

### Security Logs

The implementation logs:

1. **Configuration Load**: When CORS whitelist is loaded
2. **Blocked Requests**: Every unauthorized request attempt
3. **Security Alerts**: When wildcard is detected in config
4. **Warnings**: When falling back to default origin

### Log Context

All CORS security logs use context: `'corsSecurity'`:

```javascript
logger.error('SECURITY ALERT: CORS_ORIGIN cannot be "*"', {
  context: 'corsSecurity'
});

logger.warn('CORS blocked request from unauthorized origin', {
  context: 'corsSecurity',
  metadata: { origin, allowedOrigins }
});
```

### Monitoring Recommendations

1. **Alert on**: Any "SECURITY ALERT" log entries
2. **Monitor**: Rate of blocked requests (sudden spikes = attack)
3. **Review**: Weekly report of blocked origins
4. **Audit**: Periodically review allowed origins list

## Common Mistakes to Avoid

### ❌ Mistake 1: Using Wildcard

```bash
# DANGEROUS
CORS_ORIGIN=*
```

**Why**: Exposes all cookies/tokens to any website
**Fix**: Use explicit origin or whitelist

### ❌ Mistake 2: Spaces in Whitelist

```bash
# WRONG (spaces break parsing)
ALLOWED_ORIGINS=https://site1.com, https://site2.com

# CORRECT
ALLOWED_ORIGINS=https://site1.com,https://site2.com
```

### ❌ Mistake 3: HTTP in Production

```bash
# RISKY (man-in-the-middle attacks)
CORS_ORIGIN=http://your-domain.com

# CORRECT
CORS_ORIGIN=https://your-domain.com
```

### ❌ Mistake 4: Overly Permissive Origins

```bash
# BAD (allows any subdomain)
CORS_ORIGIN=https://*.yourdomain.com

# BETTER (explicit subdomains)
ALLOWED_ORIGINS=https://app.yourdomain.com,https://www.yourdomain.com
```

### ❌ Mistake 5: Development Origins in Production

```bash
# SECURITY RISK
CORS_ORIGIN=http://localhost:5173
```

**Why**: Local development origins have no place in production
**Fix**: Use production domains only

## Best Practices

1. **Principle of Least Privilege**: Only allow origins that absolutely need access
2. **HTTPS Only**: Production origins must use HTTPS
3. **Audit Regularly**: Review allowed origins quarterly
4. **Environment Separation**: Different origins for dev/staging/prod
5. **Monitoring**: Set up alerts for blocked requests
6. **Documentation**: Keep CORS configuration documented and up-to-date

## Troubleshooting

### Issue: "CORS blocked request" in logs

**Diagnosis**: Request from origin not in whitelist

**Solution**:
1. Check if origin should be allowed
2. Add to `ALLOWED_ORIGINS` if legitimate
3. Investigate if unauthorized (potential attack)

### Issue: CORS errors in browser

**Diagnosis**: Frontend origin not in backend CORS config

**Solution**:
1. Check browser console for exact origin
2. Add to `CORS_ORIGIN` or `ALLOWED_ORIGINS`
3. Ensure no typos (http vs https, www vs non-www)

### Issue: Wildcard error on startup

**Diagnosis**: `CORS_ORIGIN=*` detected in config

**Solution**:
1. Change to explicit origin
2. Restart server
3. Check security logs

## Compliance Notes

This CORS implementation helps with:
- **OWASP ASVS**: V5 (Validation)
- **CWE-942**: Permissive Cross-domain Policy
- **Security Standards**: Prevents CSRF and session hijacking

## Additional Resources

- [MDN Web Docs - CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [OWASP - Cross-Site Request Forgery](https://owasp.org/www-community/attacks/csrf)
- [CORS Security Best Practices](https://portswigger.net/web-security/cors)

---

**Remember**: CORS is a security feature. When configured incorrectly, it becomes a security vulnerability. Always validate and test your CORS configuration.
