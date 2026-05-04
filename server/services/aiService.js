import OpenAI from 'openai';
import fs from 'fs';

// Lazy initialization to ensure env vars are loaded
let openai = null;
const getOpenAI = () => {
    if (!openai) {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openai;
};

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

const RECEIPT_SYSTEM_PROMPT = `
You are an AI Assistant for an Egyptian Construction Company (SaaS).
Your role is to extract structured transaction data from receipt or invoice images.
The receipt may be in Arabic, English, or mixed Arabic/English.

**Output Schema (Strict JSON):**
{
  "vendor": "String (vendor or supplier name) or null",
  "totalAmount": Number (final total including tax) or null,
  "subtotal": Number or null,
  "taxAmount": Number or null,
  "currency": "String (default EGP)",
  "transactionDate": "String YYYY-MM-DD or null",
  "category": "String (Enum: MATERIALS, LABOR, EQUIPMENT, SERVICES, OTHER)",
  "items": [
    { "name": "String", "quantity": Number, "unit": "String or null",
      "unitPrice": Number or null, "total": Number or null }
  ],
  "summary": "String (brief Arabic description of the receipt)",
  "confidence": "String (Enum: high, medium, low)"
}

**Rules:**
1. Use null for any field you cannot read with confidence; do not guess monetary values.
2. Construction supplies (cement, steel, sand, bricks, tiles) → MATERIALS.
3. Tool or machinery rental / purchase → EQUIPMENT.
4. Subcontractor work or professional services → SERVICES.
5. Wages, daily-pay records, payroll → LABOR.
6. If the image is NOT a receipt/invoice (random photo, blurry beyond reading, etc.),
   set all numeric fields to null, set confidence to "low", and explain in summary.
7. Convert numbers to plain integers/decimals (no commas).
8. Currency defaults to EGP if not stated.
`;

/**
 * Extract structured transaction data from a receipt/invoice image.
 * Image is processed in-memory and never written to disk or S3.
 * @param {Buffer} imageBuffer - Image bytes
 * @param {string} mimeType - Image MIME type (e.g. 'image/jpeg')
 * @returns {Promise<object>} parsed_data matching the receipt schema
 */
export const processReceiptImage = async (imageBuffer, mimeType) => {
    const client = getOpenAI();
    const base64 = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini', // supports vision; cheaper than gpt-4o
        messages: [
            { role: 'system', content: RECEIPT_SYSTEM_PROMPT },
            {
                role: 'user',
                content: [
                    { type: 'text', text: 'Extract the receipt/invoice details as JSON.' },
                    { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } }
                ]
            }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
    });

    return JSON.parse(completion.choices[0].message.content);
};

/**
 * Process a voice note file to transcribe and extract structured financial data.
 * @param {string} filePath - Absolute path to the audio file.
 * @returns {Promise<{raw_text: string, parsed_data: object}>}
 */
export const processVoiceNote = async (filePath) => {
    try {
        const client = getOpenAI();

        // Step 1: Transcribe
        const transcription = await client.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "whisper-1",
            language: "ar", // Force Arabic bias
            prompt: "Construction, EGP, geneh, musanaiyah, kharsana, mahara, tashweeb" // Glossary hints
        });

        // Step 2: Extract Intelligence
        const completion = await client.chat.completions.create({
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
