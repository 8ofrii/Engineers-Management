# Server Fix - OpenAI Initialization Issue

## Problem
The server was crashing with the error:
```
OpenAIError: Missing credentials. Please pass an `apiKey`, or set the `OPENAI_API_KEY` environment variable.
```

## Root Cause
The OpenAI client was being initialized at the module level in `aiService.js`:
```javascript
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

This initialization happens when the module is imported, which occurs **before** `dotenv.config()` runs in `server.js`. Therefore, `process.env.OPENAI_API_KEY` was `undefined` at initialization time.

## Solution
Changed to **lazy initialization** pattern:

```javascript
// Lazy initialization to ensure env vars are loaded
let openai = null;
const getOpenAI = () => {
    if (!openai) {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openai;
};
```

Now the OpenAI client is only created when `getOpenAI()` is first called (inside `processVoiceNote()`), which happens **after** the environment variables are loaded.

## Files Modified
- `server/services/aiService.js`

## Status
✅ **Fixed** - The server should now start successfully with nodemon auto-reload.
