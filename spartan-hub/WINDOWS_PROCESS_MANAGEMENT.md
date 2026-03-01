# Windows Process Management Guide

## Problem: Qwen CLI Exits When Stopping Backend

### Root Cause
When using `taskkill /F /IM node.exe`, **all** Node.js processes are terminated, including:
- Spartan Hub backend (port 3001)
- Spartan Hub frontend (port 5173)
- **Qwen CLI** (the tool you're using)
- Any other Node.js applications

This causes Qwen CLI to crash and exit the project.

---

## Solution: Use Port-Based Process Termination

### New Scripts Created

Two batch scripts have been created in `spartan-hub/scripts/`:

#### 1. `stop-backend.bat` - Stop Only Backend
Stops only the backend process running on port 3001.

```bash
npm run stop:backend
# or directly
scripts\stop-backend.bat
```

#### 2. `stop-all.bat` - Stop Frontend + Backend
Stops both frontend (5173) and backend (3001) processes safely.

```bash
npm run stop:all
# or directly
scripts\stop-all.bat
```

---

## How It Works

Instead of killing all Node.js processes by name (`taskkill /IM node.exe`), these scripts:

1. **Find processes by port** using `netstat -aon | findstr :PORT`
2. **Extract the specific PID** for that port
3. **Kill only that PID** using `taskkill /F /PID <number>`

This ensures Qwen CLI and other Node.js processes remain unaffected.

---

## Usage Examples

### During Development

```bash
# Start development servers
npm run dev

# In another terminal, when you need to stop:
npm run stop:all

# Or stop only backend:
npm run stop:backend
```

### Manual Process Management

```bash
# Find what's running on port 3001
netstat -aon | findstr :3001

# Kill specific PID (replace 12345 with actual PID)
taskkill /F /PID 12345
```

---

## Best Practices

### ✅ DO:
- Use `npm run stop:backend` or `npm run stop:all`
- Use `Ctrl+C` in the terminal where you started `npm run dev`
- Kill processes by specific PID when needed

### ❌ DON'T:
- Use `taskkill /IM node.exe` - kills ALL Node.js processes
- Use `taskkill /F /PID` on Qwen CLI's PID
- Kill processes without checking which PID belongs to what

---

## Troubleshooting

### "Access Denied" Error
Run the script or command prompt as **Administrator**.

### Process Won't Stop
1. Check if the port is actually in use:
   ```bash
   netstat -aon | findstr :3001
   ```

2. Manually kill by PID:
   ```bash
   taskkill /F /PID <number>
   ```

3. As last resort, restart the terminal/IDE.

### Port Still Shows as "In Use"
Wait a few seconds for the OS to release the port, or use:
```bash
netstat -aon | findstr :3001
```
To find the lingering process and kill it specifically.

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend |
| `npm run stop:backend` | Stop only backend (port 3001) |
| `npm run stop:all` | Stop frontend + backend |
| `npm run stop:safe` | Safe kill by port (recommended) |
| `netstat -aon \| findstr :3001` | Find backend process |
| `netstat -aon \| findstr :5173` | Find frontend process |
| `taskkill /F /PID <num>` | Kill specific process |

---

## For Qwen CLI Users

**Important:** Never use `taskkill /IM node.exe` while using Qwen CLI. Qwen CLI runs as a `node.exe` process and will be killed too!

**Safe alternatives:**
- `npm run stop:safe` - New safe kill script (recommended)
- `.\safe-kill.bat` - Quick safe kill from project root
- `npm run stop:all` - Stops project processes by port
- `taskkill /F /PID <number>` - Kill specific process only

See `docs/guides/SAFE_NODE_KILL_GUIDE.md` for complete safety information.
