# 🔧 Spartan Hub 2.0 - Troubleshooting Guide

**Version:** 2.0.0  
**Last Updated:** April 2026

---

## 📋 Table of Contents

1. [Common Issues](#common-issues)
2. [Error Messages](#error-messages)
3. [Debug Procedures](#debug-procedures)
4. [FAQ](#faq)

---

## 🔍 Common Issues

### Issue 1: Camera Not Working

**Symptoms:**
- Camera not detected
- Black screen in form analysis
- Permission denied error

**Solutions:**

1. **Check Camera Permissions**
   - Browser settings → Privacy → Camera
   - Allow camera access for spartanhub.io

2. **Check Camera Connection**
   - Verify camera is connected
   - Try different USB port
   - Test camera in another app

3. **Browser Compatibility**
   - Use Chrome, Firefox, or Edge
   - Update browser to latest version
   - Clear browser cache

4. **HTTPS Requirement**
   - Camera only works on HTTPS
   - Ensure URL starts with https://

---

### Issue 2: Form Analysis Not Working

**Symptoms:**
- Analysis never completes
- Error during analysis
- No results shown

**Solutions:**

1. **Check Internet Connection**
   - Verify stable internet
   - Check connection speed
   - Try restarting router

2. **Check Video Quality**
   - Ensure good lighting
   - Position camera correctly
   - Wear contrasting clothing

3. **Clear Browser Cache**
   - Settings → Privacy → Clear browsing data
   - Select "Cached images and files"
   - Reload page

4. **Try Different Browser**
   - Some browsers work better than others
   - Try Chrome or Firefox

---

### Issue 3: Login Issues

**Symptoms:**
- Cannot login
- "Invalid credentials" error
- Session expires immediately

**Solutions:**

1. **Verify Credentials**
   - Check email spelling
   - Check password (case-sensitive)
   - Try "Forgot Password"

2. **Clear Cookies**
   - Settings → Privacy → Clear cookies
   - Select spartanhub.io
   - Try logging in again

3. **Check Account Status**
   - Verify email is verified
   - Check if account is suspended
   - Contact support if needed

4. **Browser Issues**
   - Try incognito/private mode
   - Clear browser cache
   - Try different browser

---

### Issue 4: Slow Performance

**Symptoms:**
- Pages load slowly
- Videos buffer
- App feels sluggish

**Solutions:**

1. **Check Internet Speed**
   - Run speed test
   - Minimum 5 Mbps required
   - Try wired connection

2. **Reduce Video Quality**
   - Settings → Video Quality
   - Select lower quality
   - Save bandwidth

3. **Close Other Tabs**
   - Close unnecessary tabs
   - Free up memory
   - Restart browser

4. **Update Browser**
   - Update to latest version
   - Enable hardware acceleration
   - Clear cache regularly

---

### Issue 5: Challenge Not Tracking

**Symptoms:**
- Progress not updating
- Workouts not counted
- Leaderboard not updating

**Solutions:**

1. **Verify Challenge Enrollment**
   - Check if joined challenge
   - Verify challenge is active
   - Check start/end dates

2. **Sync Data**
   - Pull down to refresh
   - Logout and login again
   - Clear app cache

3. **Check Workout Type**
   - Verify workout counts for challenge
   - Check challenge requirements
   - Contact support if issue persists

---

## ⚠️ Error Messages

### "Camera access denied"

**Meaning:** Browser blocked camera access

**Solution:**
1. Click camera icon in address bar
2. Select "Always allow"
3. Reload page

---

### "Analysis failed - please try again"

**Meaning:** Form analysis encountered an error

**Solution:**
1. Check internet connection
2. Ensure good lighting
3. Reposition camera
4. Try again

---

### "Session expired"

**Meaning:** Login session has expired

**Solution:**
1. Click "Login"
2. Enter credentials
3. Check "Remember me" for longer sessions

---

### "Challenge not found"

**Meaning:** Challenge doesn't exist or has ended

**Solution:**
1. Check challenge URL
2. Verify challenge is active
3. Browse available challenges

---

### "Insufficient permissions"

**Meaning:** Your account doesn't have required permissions

**Solution:**
1. Check your account role
2. Contact team admin
3. Contact support if issue persists

---

## 🔬 Debug Procedures

### For Developers

#### Check Browser Console

```javascript
// Open browser console (F12)
// Look for errors in Console tab
// Check Network tab for failed requests
```

#### Check API Responses

```bash
# Test API endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.spartanhub.io/health

# Expected response:
# {"status": "healthy"}
```

#### Check Logs

```bash
# Backend logs
tail -f /var/log/spartan/backend.log

# Frontend errors
# Check browser console
```

---

## ❓ FAQ

### Q: How do I reset my password?

A: Click "Forgot Password" on login page and follow instructions.

### Q: Can I change my email?

A: Yes, go to Settings → Account → Change Email.

### Q: How do I delete my account?

A: Go to Settings → Account → Delete Account. This is permanent.

### Q: Why isn't my camera working?

A: Check camera permissions, connection, and browser compatibility.

### Q: How accurate is form analysis?

A: 90%+ accurate for supported exercises (squat, deadlift, bench, overhead press).

### Q: Can I use Spartan Hub on mobile?

A: Yes, Spartan Hub is fully responsive and works on mobile devices.

### Q: How do I join a team?

A: Browse teams and click "Request to Join" or accept an invitation.

### Q: What happens when I reach max level?

A: You can continue earning points and achievements, but level caps at 100.

---

## 📞 Getting Help

### Self-Help

1. **Search this guide** - Common issues documented above
2. **Check FAQ** - Frequently asked questions
3. **Community forums** - https://community.spartanhub.io

### Contact Support

- **Email:** support@spartanhub.io
- **Live Chat:** Available 9 AM - 9 PM EST
- **Response Time:** Within 24 hours

### Report a Bug

1. Go to https://github.com/spartan-hub/issues
2. Click "New Issue"
3. Select "Bug Report"
4. Provide details and steps to reproduce

---

**© 2026 Spartan Hub. All rights reserved.**
