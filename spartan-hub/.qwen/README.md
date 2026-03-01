# 🛡️ Qwen Code Safety Configuration

This directory contains configuration files to prevent critical errors when using Qwen Code CLI with this project.

## Files

- `.qwen-code-config` - Safety settings and project configuration
- `docs/guides/SAFE_NODE_KILL_GUIDE.md` - Complete safety guide
- `scripts/safe-kill-node.bat` - Safe process killer script

## Quick Reference

### ✅ Safe Commands (Use These)

```bash
npm run stop:safe        # Recommended - kills by port
npm run stop:all         # Stops frontend + backend
npm run stop:backend     # Stops only backend
./safe-kill.bat          # Quick safe kill from root
```

### ❌ Dangerous Commands (Never Use from Qwen CLI)

```bash
taskkill /F /IM node.exe     # ☠️ Kills Qwen CLI!
taskkill /F /IM node         # ☠️ Kills Qwen CLI!
Get-Process node | Stop      # ☠️ Kills Qwen CLI!
```

## Why This Matters

**Qwen Code CLI runs as a `node.exe` process.** Killing all Node processes will terminate Qwen CLI, causing:

1. Loss of conversation context
2. Potential session corruption
3. Death loop (agent re-executes same fatal command)

## Configuration Details

See `.qwen-code-config` for:
- Safe kill methods
- Blocked command patterns
- Project ports
- Session management settings

## Setup Complete ✅

This project is now configured to prevent the Node process death loop error.
