import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
You are an AI Assistant for an Egyptian Construction Company (SaaS).
Your role is to parse voice notes from Site Engineers into structured financial data.

**Language Handling:**
- The input will be a mix of Egyptian Arabic, Technical Slang, and English numbers.
- Examples: "Gebna 50 shkarat cement", "Dafa3na mshaal", "7asibna el kahraba2i".

**Output Schema (Strict JSON):**
{
  "summary": "String (Short Arabic description of what happened)",
  "amount": Number (The total money spent),
  "vendor": "String or null (Extract company/person name if mentioned)",
  "category": "String (Enum: MATERIALS, LABOR, EQUIPMENT, SERVICES, OTHER)",
  "is_stock_purchase": Boolean (True if buying bulk materials like Cement, Steel, Sand, Bricks for inventory. False for services/labor.),
  "items": [
    { "name": "String", "quantity": Number, "unit": "String (e.g. ton, shkara, meter)" }
  ]
}

**Rules:**
1. If the user says "Gebna" (We bought) or "Nazelna" (We downloaded/ordered), it is likely MATERIALS.
2. If the user says "7asibna" (We settled/paid) or "Yomiyat" (Daily wages), it is LABOR.
3. Convert all numbers to Integers.
4. If context is unclear, set category to OTHER.
`;

/**
 * Process a voice note file to transcribe and extract structured financial data.
 * @param {string} filePath - Absolute path to the audio file.
 * @returns {Promise<{raw_text: string, parsed_data: object}>}
 */
export const processVoiceNote = async (filePath) => {
    try {
        // Step 1: Transcribe
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "whisper-1",
            language: "ar", // Force Arabic bias
            prompt: "Construction, EGP, geneh, musanaiyah, kharsana, mahara, tashweeb" // Glossary hints
        });

        // Step 2: Extract Intelligence
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Efficient & Smart
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: transcription.text }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2 // Low creativity, high precision
        });

        return {
            raw_text: transcription.text,
            parsed_data: JSON.parse(completion.choices[0].message.content)
        };

    } catch (error) {
        console.error("AI Service Error:", error);
        throw new Error("Failed to process voice note");
    }
};
