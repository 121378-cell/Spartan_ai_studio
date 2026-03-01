# ⚠️ CRITICAL WARNING: Node Process Killing on Windows

## 🚨 The Problem

**Qwen Code CLI runs as a `node.exe` process.** If you kill all Node processes, you kill Qwen CLI too.

```
┌─────────────────────────────────────────────────────────────┐
│  qwen CLI      → node.exe (PID: 12345) ← WILL BE KILLED     │
│  Spartan Hub   → node.exe (PID: 67890) ← Target             │
│  Other apps    → node.exe (PID: 11111) ← Collateral damage  │
└─────────────────────────────────────────────────────────────┘

taskkill /F /IM node.exe  ← Kills ALL of them! ☠️
```

---

## ❌ NEVER Use These Commands (From Qwen CLI)

| Command | Result |
|---------|--------|
| `taskkill /F /IM node.exe` | ☠️ **Kills Qwen CLI immediately** |
| `taskkill /F /IM node` | ☠️ **Kills Qwen CLI immediately** |
| `Get-Process node \| Stop-Process -Force` | ☠️ **Kills Qwen CLI immediately** |
| `ps aux \| grep node \| kill` | ☠️ **Kills Qwen CLI immediately** |

---

## ✅ Safe Alternatives

### Option 1: Use Project Scripts (Recommended)

```batch
:: From spartan-hub/ directory
npm run stop:all         :: Stops frontend + backend by port
npm run stop:backend     :: Stops only backend (port 3001)
npm run stop:safe        :: New safe kill script (by port)
```

### Option 2: Use Safe Kill Script

```batch
:: From project root
.\safe-kill.bat

:: From spartan-hub/
.\scripts\safe-kill-node.bat
```

### Option 3: Manual Safe Command (One-liner)

```batch
:: Kill only processes on specific ports (Qwen CLI safe)
for /f "tokens=5" %a in ('netstat -aon ^| findstr ":3001 :5173" ^| findstr LISTENING') do @(taskkill /F /PID %a 2>nul)
```

### Option 4: Kill by Specific PID

```batch
:: First, find the PID
netstat -ano | findstr ":3001"

:: Then kill only that PID
taskkill /F /PID 12345
```

---

## 🔧 New Safe Kill Script

**Location:** `spartan-hub\scripts\safe-kill-node.bat`

**What it does:**
- ✅ Scans for processes on project ports (3001, 5173, 8000, 3000)
- ✅ Kills only those specific processes by PID
- ✅ Does NOT affect Qwen CLI or other Node.js apps
- ✅ Shows clear summary of what was killed

**Usage:**
```batch
:: Option A: From project root
.\safe-kill.bat

:: Option B: From spartan-hub directory
.\scripts\safe-kill-node.bat

:: Option C: Via npm
npm run stop:safe
```

---

## 📋 Comparison Table

| Method | Affects Qwen CLI | Safe to Use |
|--------|------------------|-------------|
| `taskkill /F /IM node.exe` | ❌ **YES** | ❌ **NEVER** |
| `taskkill /F /IM node` | ❌ **YES** | ❌ **NEVER** |
| `npm run stop:all` | ✅ NO | ✅ Yes |
| `npm run stop:backend` | ✅ NO | ✅ Yes |
| `npm run stop:safe` | ✅ NO | ✅ Yes |
| `taskkill /F /PID <num>` | ✅ NO | ✅ Yes |
| `.\safe-kill.bat` | ✅ NO | ✅ Yes |
| Port-based kill (findstr) | ✅ NO | ✅ Yes |

---

## 🔄 Breaking the Death Loop

If Qwen CLI keeps dying and restarting in a loop:

1. **Exit Qwen CLI completely:**
   ```
   /exit
   ```

2. **Kill processes from OUTSIDE Qwen CLI:**
   ```batch
   .\safe-kill.bat
   ```

3. **Restart Qwen CLI with clean session:**
   ```batch
   qwen
   /clear
   ```

---

## 📚 Related Documentation

- `WINDOWS_PROCESS_MANAGEMENT.md` - General Windows process management
- `scripts/stop-all.bat` - Original stop script (safe)
- `scripts/stop-backend.bat` - Original backend stop script (safe)
- `scripts/safe-kill-node.bat` - New safe kill script (recommended)

---

## ⚡ Quick Reference

```batch
:: ✅ SAFE - Use these
npm run stop:safe
npm run stop:all
.\safe-kill.bat

:: ❌ DANGEROUS - Never use these from Qwen CLI
taskkill /F /IM node.exe  ← WILL KILL QWEN CLI!
```

---

**Remember:** Qwen CLI is also a Node.js process. Treat it carefully! 🎯
