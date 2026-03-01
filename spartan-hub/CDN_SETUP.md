# CDN Setup Guide - Spartan Hub 2.0
## Content Delivery Network Configuration

**Version:** 1.0
**Last Updated:** March 1, 2026
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [CDN Architecture](#cdn-architecture)
3. [CloudFront Setup](#cloudfront-setup)
4. [Cloudflare Setup](#cloudflare-setup)
5. [Cache Invalidation](#cache-invalidation)
6. [Asset Optimization](#asset-optimization)
7. [Monitoring & Troubleshooting](#monitoring--troubleshooting)

---

## Overview

Spartan Hub 2.0 uses a CDN to deliver static assets (JavaScript, CSS, images, fonts) with low latency to users worldwide. This guide covers setup for both AWS CloudFront and Cloudflare.

### Benefits

| Benefit | Description |
|---------|-------------|
| **Reduced Latency** | Assets served from edge locations closer to users |
| **Reduced Origin Load** | Static assets offloaded from origin servers |
| **Improved Security** | DDoS protection and WAF capabilities |
| **Cost Savings** | Lower bandwidth costs from origin |
| **Better UX** | Faster page load times globally |

### CDN Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CDN Architecture                                   │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │    Users    │
                              └──────┬──────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
            ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
            │  Edge Node    │ │  Edge Node    │ │  Edge Node    │
            │  (US-East)    │ │  (EU-West)    │ │  (Asia)       │
            └───────┬───────┘ └───────┬───────┘ └───────┬───────┘
                    │                │                │
                    └────────────────┼────────────────┘
                                     │
                                     ▼
                          ┌───────────────────┐
                          │   Origin Server   │
                          │   (NGINX LB)      │
                          │   :443            │
                          └───────────────────┘
```

### Assets to Serve via CDN

| Asset Type | Cache TTL | Priority |
|------------|-----------|----------|
| JavaScript bundles | 1 year (immutable) | High |
| CSS files | 1 year (immutable) | High |
| Fonts (woff2, woff) | 1 year (immutable) | High |
| Images (optimized) | 30 days | Medium |
| Favicons | 1 year | Low |
| HTML | No cache / 1 hour | Critical |
| API responses | No cache | Critical |

---

## CloudFront Setup

### Prerequisites

- AWS Account with appropriate permissions
- S3 bucket for static assets (optional)
- SSL certificate in AWS Certificate Manager
- Origin server publicly accessible

### Step 1: Create S3 Bucket (Optional)

```bash
# Create bucket for static assets
aws s3 mb s3://spartan-hub-static-assets-us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket spartan-hub-static-assets-us-east-1 \
  --versioning-configuration Status=Enabled

# Configure bucket policy for CloudFront access
aws s3api put-bucket-policy \
  --bucket spartan-hub-static-assets-us-east-1 \
  --policy file://bucket-policy.json
```

**bucket-policy.json:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOAI",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity YOUR_OAI_ID"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::spartan-hub-static-assets-us-east-1/*"
    }
  ]
}
```

### Step 2: Request SSL Certificate

```bash
# Request certificate in us-east-1 (required for CloudFront)
aws acm request-certificate \
  --domain-name spartan-hub.com \
  --subject-alternative-names www.spartan-hub.com \
  --validation-method DNS \
  --region us-east-1
```

### Step 3: Create CloudFront Distribution

**Via AWS Console:**

1. Go to CloudFront → Create Distribution
2. Select "Web" delivery method
3. Configure origin:
   - Origin Domain: `api.spartan-hub.com` or S3 bucket
   - Origin Protocol Policy: HTTPS Only
   - Origin SSL Protocols: TLSv1.2

4. Configure default cache behavior:
   - Viewer Protocol Policy: Redirect HTTP to HTTPS
   - Allowed HTTP Methods: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
   - Cache Policy: CachingOptimized
   - Origin Request Policy: CORS-S3Origin

5. Configure settings:
   - Price Class: Price Class All (or selective based on your users)
   - Alternate Domain Names (CNAMEs): `cdn.spartan-hub.com`
   - SSL Certificate: Custom SSL Certificate (from ACM)
   - WAF: Enable if using AWS WAF

**Via Terraform:**

```hcl
resource "aws_cloudfront_distribution" "spartan_hub_cdn" {
  origin {
    domain_name = "api.spartan-hub.com"
    origin_id   = "spartan-hub-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    custom_header {
      name  = "X-Origin-Verify"
      value = var.origin_verify_token
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Spartan Hub CDN"
  default_root_object = ""

  aliases = ["cdn.spartan-hub.com", "static.spartan-hub.com"]

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "spartan-hub-origin"

    forwarded_values {
      query_string = false
      headers      = ["Origin"]

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000

    compress               = true
  }

  # Cache behavior for static assets
  ordered_cache_behavior {
    path_pattern     = "/assets/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "spartan-hub-origin"

    cache_policy_id = aws_cloudfront_cache_policy.static_assets.id
    
    viewer_protocol_policy = "redirect-to-https"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

resource "aws_cloudfront_cache_policy" "static_assets" {
  name = "SpartanHub-StaticAssets"

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Origin"]
      }
    }
    query_strings_config {
      query_string_behavior = "none"
    }
  }

  min_ttl     = 31536000
  default_ttl = 31536000
  max_ttl     = 31536000
}
```

### Step 4: Configure NGINX for CDN Origin

Add to `nginx.production.conf`:

```nginx
# CDN-specific headers
location /assets/ {
    # Add CDN verification header
    add_header X-Origin-Verify "${ORIGIN_VERIFY_TOKEN}";
    
    # CORS for CDN
    add_header Access-Control-Allow-Origin "*";
    
    # Long-term caching
    expires 30d;
    add_header Cache-Control "public, max-age=2592000, immutable";
    
    # Vary header for compression
    add_header Vary "Accept-Encoding";
}
```

### Step 5: Update Frontend Build Configuration

**Vite Configuration (`vite.config.js`):**

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: 'https://cdn.spartan-hub.com/assets/',
  build: {
    assetsDir: 'static',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
        },
      },
    },
  },
});
```

### Step 6: Deploy Assets to CDN

```bash
# Build frontend
cd spartan-hub
npm run build

# Sync to S3 (if using S3 origin)
aws s3 sync dist/assets/ s3://spartan-hub-static-assets-us-east-1/assets/ \
  --cache-control "public, max-age=31536000, immutable" \
  --acl public-read

# Invalidate CloudFront cache (if needed)
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/assets/*"
```

---

## Cloudflare Setup

### Prerequisites

- Cloudflare account
- Domain added to Cloudflare
- DNS configured

### Step 1: Add Domain to Cloudflare

1. Log in to Cloudflare dashboard
2. Click "Add Site"
3. Enter `spartan-hub.com`
4. Select Free plan (or Pro/Business for advanced features)
5. Update nameservers at your domain registrar

### Step 2: Configure DNS

Add DNS records in Cloudflare:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | @ | Your server IP | Proxied |
| A | www | Your server IP | Proxied |
| CNAME | cdn | Your server IP | Proxied |
| CNAME | api | Your server IP | Proxied |

### Step 3: Configure SSL/TLS

1. Go to SSL/TLS → Overview
2. Select "Full (strict)" mode
3. Go to SSL/TLS → Edge Certificates
4. Enable "Always Use HTTPS"
5. Enable "Minimum TLS Version" → TLS 1.2
6. Enable "Opportunistic Encryption"
7. Enable "TLS 1.3"

### Step 4: Configure Caching

**Cache Rules:**

1. Go to Caching → Configuration
2. Set Caching Level: Standard

**Page Rules:**

Create the following page rules:

1. **Static Assets (Long Cache):**
   - URL: `spartan-hub.com/assets/*`
   - Settings:
     - Cache Level: Cache Everything
     - Edge Cache TTL: 1 month
     - Browser Cache TTL: 1 month

2. **Images (Medium Cache):**
   - URL: `spartan-hub.com/images/*`
   - Settings:
     - Cache Level: Cache Everything
     - Edge Cache TTL: 7 days
     - Browser Cache TTL: 7 days

3. **HTML (Short Cache):**
   - URL: `spartan-hub.com/*.html`
   - Settings:
     - Cache Level: Cache Everything
     - Edge Cache TTL: 1 hour
     - Browser Cache TTL: 1 hour

4. **API (No Cache):**
   - URL: `spartan-hub.com/api/*`
   - Settings:
     - Cache Level: Bypass

### Step 5: Configure Page Rules for Optimization

```
# Enable Rocket Loader for JavaScript
spartan-hub.com/*
→ Rocket Loader: On

# Enable Auto Minify
spartan-hub.com/*
→ Auto Minify: JavaScript, CSS, HTML

# Enable Brotli Compression
(Already enabled by default on Cloudflare)
```

### Step 6: Configure Security

**WAF Rules:**

1. Go to Security → WAF
2. Create custom rules:

```
# Block SQL Injection
(rule 1)
Field: URI
Operator: contains
Value: SELECT, UNION, INSERT, DROP, DELETE
Action: Block

# Block XSS
(rule 2)
Field: URI
Operator: contains
Value: <script>, javascript:, onerror=
Action: Block

# Rate Limiting
(rule 3)
Field: IP Address
Operator: is in list
Value: (create IP list)
Rate: 100 requests per minute
Action: Challenge
```

**Security Level:**
- Go to Security → Settings
- Security Level: Medium (adjust based on traffic patterns)

### Step 7: Configure Workers (Optional)

Create a Worker for custom caching logic:

```javascript
// worker.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Add custom headers
  const response = await fetch(request);
  const newResponse = new Response(response.body, response);
  
  // Add security headers
  newResponse.headers.set('X-Content-Type-Options', 'nosniff');
  newResponse.headers.set('X-Frame-Options', 'SAMEORIGIN');
  newResponse.headers.set('X-XSS-Protection', '1; mode=block');
  
  return newResponse;
}
```

---

## Cache Invalidation

### When to Invalidate

| Scenario | Action |
|----------|--------|
| New deployment | Invalidate changed assets |
| Bug fix in static assets | Invalidate specific files |
| Emergency fix | Purge all cache |
| Regular maintenance | Scheduled purge (monthly) |

### CloudFront Invalidation

**Invalidate Specific Paths:**

```bash
# Invalidate specific files
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/assets/main.js" "/assets/main.css"

# Invalidate all assets
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/assets/*"

# Invalidate everything
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

**Invalidate via Console:**
1. Go to CloudFront → Distributions
2. Select your distribution
3. Click "Invalidations" tab
4. Click "Create Invalidation"
5. Enter paths to invalidate
6. Click "Invalidate"

### Cloudflare Purge

**Purge via Dashboard:**
1. Go to Caching → Configuration
2. Click "Purge Everything" (nuclear option)
3. Or use "Custom Purge" for specific URLs

**Purge via API:**

```bash
# Purge specific URLs
curl -X POST "https://api.cloudflare.com/v1/zones/YOUR_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://spartan-hub.com/assets/main.js"]}'

# Purge by tag
curl -X POST "https://api.cloudflare.com/v1/zones/YOUR_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"tags":["production"]}'

# Purge everything
curl -X POST "https://api.cloudflare.com/v1/zones/YOUR_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

### Cache Busting Strategy

**Filename Hashing (Recommended):**

```javascript
// Vite automatically adds content hashes
// Output: /assets/main.a1b2c3d4.js

// In HTML
<script src="https://cdn.spartan-hub.com/assets/main.a1b2c3d4.js"></script>
```

**Query String Versioning:**

```html
<!-- Add version query parameter -->
<script src="/assets/main.js?v=2.0.1"></script>
<link rel="stylesheet" href="/assets/styles.css?v=2.0.1">
```

---

## Asset Optimization

### Image Optimization

**Formats to Use:**

| Format | Use Case | Compression |
|--------|----------|-------------|
| WebP | General images | 25-35% smaller than JPEG |
| AVIF | High-quality images | 50% smaller than JPEG |
| SVG | Icons, logos | Lossless, scalable |
| JPEG | Photos (fallback) | Good compression |
| PNG | Transparency needed | Lossless |

**Optimization Tools:**

```bash
# Install sharp for Node.js
npm install sharp

# Optimize images in build process
# scripts/optimize-images.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function optimizeImages() {
  const inputDir = './src/images';
  const outputDir = './dist/images';
  
  const files = fs.readdirSync(inputDir);
  
  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const outputName = path.basename(file, path.extname(file));
    
    // Convert to WebP
    await sharp(inputPath)
      .webp({ quality: 80 })
      .toFile(path.join(outputDir, `${outputName}.webp`));
    
    // Create AVIF
    await sharp(inputPath)
      .avif({ quality: 75 })
      .toFile(path.join(outputDir, `${outputName}.avif`));
  }
}

optimizeImages();
```

**Responsive Images:**

```html
<picture>
  <source srcset="/images/hero.avif" type="image/avif">
  <source srcset="/images/hero.webp" type="image/webp">
  <img src="/images/hero.jpg" alt="Hero" loading="lazy">
</picture>
```

### JavaScript Optimization

**Code Splitting:**

```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts', 'chart.js'],
          utils: ['lodash', 'dayjs'],
        },
      },
    },
  },
});
```

**Tree Shaking:**

```javascript
// Import only what you need
import { debounce } from 'lodash-es'; // Good
import _ from 'lodash'; // Bad - imports everything
```

### CSS Optimization

**Purge Unused CSS:**

```javascript
// vite.config.js with PurgeCSS
import purgecss from '@fullhuman/postcss-purgecss';

export default defineConfig({
  css: {
    postcss: {
      plugins: [
        purgecss({
          content: ['./src/**/*.html', './src/**/*.js', './src/**/*.tsx'],
        }),
      ],
    },
  },
});
```

### Font Optimization

**Subset Fonts:**

```bash
# Use pyftsubset to create font subsets
pyftsubset Roboto-Regular.ttf \
  --text="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" \
  --output-file=Roboto-Regular-subset.ttf
```

**Font Loading Strategy:**

```css
/* Preload critical fonts */
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>

/* Use font-display: swap */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-display: swap;
}
```

---

## Monitoring & Troubleshooting

### CloudFront Metrics

**Key Metrics to Monitor:**

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Requests | Total requests | Spike detection |
| Bytes Downloaded | Bandwidth usage | Cost monitoring |
| Error Rate | 4xx/5xx errors | > 1% |
| Origin Latency | Time to origin | > 500ms |
| Cache Hit Ratio | Cache efficiency | < 80% |

**CloudWatch Dashboard:**

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/CloudFront", "Requests", "DistributionId", "YOUR_ID"],
          [".", "4xxErrorRate", ".", "."],
          [".", "5xxErrorRate", ".", "."]
        ],
        "period": 300,
        "stat": "Sum"
      }
    }
  ]
}
```

### Cloudflare Analytics

**Key Metrics:**

| Metric | Location | Target |
|--------|----------|--------|
| Bandwidth | Analytics → Traffic | Monitor trends |
| Requests | Analytics → Traffic | Monitor spikes |
| Cached vs Uncached | Analytics → Caching | > 80% cached |
| Threats Blocked | Security → Events | Monitor attacks |

### Troubleshooting Guide

**Issue: Assets Not Loading**

```
1. Check CloudFront/Cloudflare distribution status
2. Verify origin server is accessible
3. Check SSL certificate validity
4. Verify CORS headers
5. Check browser console for errors
```

**Issue: Stale Content**

```
1. Verify cache headers on origin
2. Check CDN cache TTL settings
3. Purge CDN cache
4. Verify asset versioning (hashes)
5. Check browser cache
```

**Issue: High Error Rate**

```
1. Check origin server health
2. Review CDN error logs
3. Verify SSL/TLS configuration
4. Check WAF rules (false positives)
5. Review rate limiting settings
```

### Performance Testing

```bash
# Test CDN performance with curl
curl -w "@curl-format.txt" -o /dev/null -s https://cdn.spartan-hub.com/assets/main.js

# curl-format.txt
time_namelookup:  %{time_namelookup}\n
time_connect:     %{time_connect}\n
time_starttransfer: %{time_starttransfer}\n
time_total:       %{time_total}\n
remote_ip:        %{remote_ip}\n

# Test from multiple locations (using globalping)
npm install -g globalping-cli
globalping http https://cdn.spartan-hub.com/assets/main.js --from "New York,London,Tokyo,Sydney"
```

---

## Cost Optimization

### CloudFront Cost Tips

1. **Use Price Class Selectively:**
   - Price Class 100: Only US, Canada, Europe
   - Price Class 200: Adds Asia, South America
   - Price Class All: All locations (most expensive)

2. **Optimize Cache TTL:**
   - Longer TTL = fewer origin requests = lower cost
   - Use immutable caching for versioned assets

3. **Use Compression:**
   - Enable gzip/brotli compression
   - Reduces bandwidth costs

4. **Monitor and Alert:**
   - Set up billing alerts
   - Review monthly cost reports

### Cloudflare Cost Tips

1. **Free Plan Limits:**
   - 100,000 requests/day
   - Unlimited bandwidth
   - Basic WAF

2. **Pro Plan ($20/month):**
   - Advanced WAF
   - Image optimization
   - Faster cache purge

3. **Business Plan ($200/month):**
   - 100% uptime SLA
   - Priority support
   - Custom WAF rules

---

## Quick Reference

### CloudFront Commands

```bash
# List distributions
aws cloudfront list-distributions

# Get distribution config
aws cloudfront get-distribution-config --id YOUR_ID

# Create invalidation
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"

# List invalidations
aws cloudfront list-invalidations --distribution-id YOUR_ID
```

### Cloudflare API

```bash
# List zones
curl -X GET "https://api.cloudflare.com/v1/zones" \
  -H "Authorization: Bearer YOUR_API_TOKEN"

# Purge cache
curl -X POST "https://api.cloudflare.com/v1/zones/ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'

# Get analytics
curl -X GET "https://api.cloudflare.com/v1/zones/ZONE_ID/analytics/dashboard" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

---

**Document Created:** March 1, 2026
**Next Review:** After production deployment
**Owner:** DevOps Team

---

<p align="center">
  <strong>🚀 Spartan Hub 2.0 - CDN Setup Guide</strong><br>
  <em>Optimized for Global Performance</em>
</p>
