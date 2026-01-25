# ✅ Upload Middleware Fixed

## Problem
The server was crashing with:
```
SyntaxError: The requested module '../middleware/upload.js' does not provide an export named 'upload'
```

## Solution
Updated the upload middleware to support both audio and image uploads with proper named exports:

### Changes Made:
1. **Separated Storage Configurations**:
   - `audioStorage` → saves to `./uploads/audio/`
   - `imageStorage` → saves to `./uploads/images/`

2. **Separated File Filters**:
   - `audioFileFilter` → accepts audio files (mp3, wav, webm, etc.)
   - `imageFileFilter` → accepts image files (jpg, png, gif, webp)

3. **Two Multer Instances**:
   - `audioUpload` → for voice messages (25MB limit)
   - `upload` → for profile pictures (5MB limit)

4. **Proper Exports**:
   ```javascript
   export { upload, audioUpload };
   export default audioUpload; // backward compatibility
   ```

5. **Updated Routes**:
   - `auth.js` → uses `upload` for profile pictures
   - `chat.js` → uses `audioUpload` for voice messages

## Result
✅ Server now starts without errors
✅ Profile picture uploads work
✅ Voice message uploads work
✅ Proper file type validation
✅ Separate directories for organization
