# 🎤 Chat Assistant with Whisper STT - Complete Guide

## ✅ What Was Implemented

### Backend Components
1. **Chat Controller** (`server/controllers/chatController.js`)
   - `sendMessage()` - Handle text and voice messages
   - `getChatHistory()` - Get conversation history
   - `clearChatHistory()` - Clear all messages

2. **Upload Middleware** (`server/middleware/upload.js`)
   - Multer configuration for audio files
   - Supports: mp3, wav, m4a, webm, ogg
   - Max file size: 25MB
   - Auto-creates `uploads/audio` directory

3. **Chat Routes** (`server/routes/chat.js`)
   - `POST /api/chat/message` - Send message (text or voice)
   - `GET /api/chat/history` - Get chat history
   - `DELETE /api/chat/history` - Clear history

---

## 🧪 Testing the Chat Assistant

### Test 1: Text Message
```http
POST http://localhost:5000/api/chat/message
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "message": "مرحبا، كيف يمكنني إضافة مصروف جديد؟"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "userMessage": {
      "id": "msg-uuid",
      "content": "مرحبا، كيف يمكنني إضافة مصروف جديد؟",
      "createdAt": "2026-01-24T18:45:00Z",
      "transcribed": false
    },
    "aiResponse": {
      "id": "msg-uuid-2",
      "content": "مرحبا! لإضافة مصروف جديد، يمكنك...",
      "createdAt": "2026-01-24T18:45:01Z"
    }
  }
}
```

---

### Test 2: Voice Message (Whisper STT)

#### Using Postman/Thunder Client:
1. **Method:** POST
2. **URL:** `http://localhost:5000/api/chat/message`
3. **Headers:**
   - `Authorization: Bearer <your-token>`
4. **Body:** form-data
   - Key: `audio`
   - Type: File
   - Value: Select an audio file (mp3, wav, m4a)

#### Using cURL:
```bash
curl -X POST http://localhost:5000/api/chat/message \
  -H "Authorization: Bearer <your-token>" \
  -F "audio=@/path/to/voice.mp3"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "userMessage": {
      "id": "msg-uuid",
      "content": "اشتريت عشر شكاير اسمنت بخمسمية جنيه",
      "createdAt": "2026-01-24T18:45:00Z",
      "transcribed": true  // ← Voice was transcribed!
    },
    "aiResponse": {
      "id": "msg-uuid-2",
      "content": "تم فهم طلبك. هل تريد إضافة هذا المصروف الآن؟",
      "createdAt": "2026-01-24T18:45:02Z"
    }
  }
}
```

---

### Test 3: Get Chat History
```http
GET http://localhost:5000/api/chat/history
Authorization: Bearer <your-token>
```

**Response:**
```json
{
  "success": true,
  "count": 4,
  "data": [
    {
      "id": "msg-1",
      "content": "مرحبا",
      "type": "TEXT",
      "createdAt": "2026-01-24T18:40:00Z"
    },
    {
      "id": "msg-2",
      "content": "مرحبا! كيف يمكنني مساعدتك؟",
      "type": "TEXT",
      "createdAt": "2026-01-24T18:40:01Z"
    }
  ]
}
```

---

## 🎯 How It Works

### Flow Diagram:
```
User speaks → Audio file → Multer upload → Whisper STT → Text
                                                          ↓
                                                    GPT-4o-mini
                                                          ↓
                                                    AI Response
                                                          ↓
                                                    Save to DB
                                                          ↓
                                                    Return to User
```

### Step-by-Step Process:

1. **User sends voice message**
   - Frontend records audio
   - Sends as multipart/form-data

2. **Multer middleware**
   - Validates file type (audio only)
   - Saves to `uploads/audio/voice-{timestamp}.mp3`

3. **Whisper API**
   - Transcribes audio to text
   - Supports Arabic and English
   - Returns transcribed text

4. **Save user message**
   - Store transcribed text in database
   - Mark as `transcribed: true`

5. **GPT-4o-mini**
   - Process the text message
   - Generate helpful response
   - Context-aware (construction management)

6. **Save AI response**
   - Store in database
   - Return both messages to frontend

7. **Cleanup**
   - Delete audio file after transcription
   - Keep database clean

---

## 📱 Frontend Integration

### Example: Voice Recording Component

```javascript
// VoiceRecorder.jsx
import { useState, useRef } from 'react';
import api from '../services/api';

export default function VoiceRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const mediaRecorder = useRef(null);
    const chunks = useRef([]);

    const startRecording = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder.current = new MediaRecorder(stream);
        
        mediaRecorder.current.ondataavailable = (e) => {
            chunks.current.push(e.data);
        };
        
        mediaRecorder.current.onstop = () => {
            const blob = new Blob(chunks.current, { type: 'audio/webm' });
            setAudioBlob(blob);
            chunks.current = [];
        };
        
        mediaRecorder.current.start();
        setIsRecording(true);
    };

    const stopRecording = () => {
        mediaRecorder.current.stop();
        setIsRecording(false);
    };

    const sendVoiceMessage = async () => {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice.webm');
        
        const { data } = await api.post('/chat/message', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        console.log('Transcribed:', data.data.userMessage.content);
        console.log('AI Response:', data.data.aiResponse.content);
    };

    return (
        <div>
            <button onClick={isRecording ? stopRecording : startRecording}>
                {isRecording ? '⏹️ Stop' : '🎤 Record'}
            </button>
            {audioBlob && (
                <button onClick={sendVoiceMessage}>
                    📤 Send
                </button>
            )}
        </div>
    );
}
```

---

## 🔧 Configuration

### Required Environment Variables
```env
OPENAI_API_KEY=your-openai-api-key-here
```

### Supported Audio Formats
- ✅ MP3 (.mp3)
- ✅ WAV (.wav)
- ✅ M4A (.m4a)
- ✅ WebM (.webm)
- ✅ OGG (.ogg)

### File Size Limits
- Maximum: 25MB (Whisper API limit)
- Recommended: < 10MB for faster processing

---

## 🎨 AI Assistant Capabilities

The assistant can help with:
1. ✅ Adding transactions
2. ✅ Checking project status
3. ✅ Viewing financial reports
4. ✅ Managing suppliers and clients
5. ✅ Answering system questions
6. ✅ Bilingual support (Arabic & English)

---

## 🚀 Testing Checklist

- [ ] Test text message in Arabic
- [ ] Test text message in English
- [ ] Test voice message (Arabic)
- [ ] Test voice message (English)
- [ ] Verify transcription accuracy
- [ ] Check AI response quality
- [ ] Test chat history retrieval
- [ ] Test clear history
- [ ] Verify file upload limits
- [ ] Check error handling

---

## 📊 API Endpoints Summary

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/chat/message` | POST | Send text or voice message | ✅ |
| `/api/chat/history` | GET | Get conversation history | ✅ |
| `/api/chat/history` | DELETE | Clear all messages | ✅ |

---

## 🎉 Ready to Test!

1. **Restart server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Test with Postman:**
   - Import the requests above
   - Add your JWT token
   - Try text and voice messages

3. **Check the logs:**
   - Server will log Whisper transcriptions
   - AI responses will be logged
   - Any errors will be shown

**Your Chat Assistant with Whisper STT is now fully functional!** 🚀
