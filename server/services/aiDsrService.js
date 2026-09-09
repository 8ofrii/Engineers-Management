import fs from 'fs';
import OpenAI from 'openai';
import logger from '../lib/logger.js';

let openai = null;
const getOpenAI = () => {
    if (!openai && process.env.OPENAI_API_KEY) {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openai;
};

/**
 * Intelligent Egyptian Arabic & English DSR Heuristic Extractor
 */
function parseDsrHeuristics(transcript, projects = []) {
    const text = transcript || '';
    let matchedProjectId = null;

    // 1. Match Project
    if (Array.isArray(projects) && projects.length > 0) {
        for (const p of projects) {
            const cleanProjName = p.name.toLowerCase().replace(/مشروع|موقع|كمبوند|برج|عمارة|فيلا/g, '').trim();
            if (cleanProjName && text.includes(cleanProjName)) {
                matchedProjectId = p.id;
                break;
            }
        }
        // Fallback to first project if only one project exists
        if (!matchedProjectId && projects.length === 1) {
            matchedProjectId = projects[0].id;
        }
    }

    // 2. Match Weather
    let weather = 'SUNNY';
    if (/مطر|ممطر|شتا|امطار|rain/i.test(text)) weather = 'RAINY';
    else if (/عاصف|هوا|رياح|عواصف|wind/i.test(text)) weather = 'WINDY';
    else if (/تراب|غبار|عفرة|مغبر|dust/i.test(text)) weather = 'DUSTY';
    else if (/مغيم|غيوم|سحاب|غائم|cloud/i.test(text)) weather = 'CLOUDY';
    else if (/حرارة عالية|شديد الحرارة|حر|hot/i.test(text)) weather = 'HOT';
    else if (/برد|شديد البرودة|صقيع|cold/i.test(text)) weather = 'COLD';
    else if (/مشمس|شمس|صافي|sunny/i.test(text)) weather = 'SUNNY';

    // 3. Match Temperature
    let temperatureC = null;
    const tempMatch = text.match(/(?:درجة\s*(?:الحرارة)?\s*)?(\d{1,2})\s*(?:درجة|مئوية|c|°c)/i) ||
                      text.match(/(\d{1,2})\s*(?:درجة|مئوية)/i);
    if (tempMatch && tempMatch[1]) {
        const val = parseInt(tempMatch[1], 10);
        if (val >= 0 && val <= 60) temperatureC = val;
    }

    // 4. Match Hours Worked
    let hoursWorked = 8;
    const hoursMatch = text.match(/(?:اشتغلنا|دوام|عملنا|ساعات\s*العمل|عمل|hours worked|worked)\s*(\d{1,2})\s*(?:ساعة|ساعات|hours|h)/i) ||
                       text.match(/(\d{1,2})\s*(?:ساعة|ساعات|hours)\s*(?:عمل|دوام)/i);
    if (hoursMatch && hoursMatch[1]) {
        const h = parseFloat(hoursMatch[1]);
        if (h > 0 && h <= 24) hoursWorked = h;
    }

    // 5. Extract Progress Notes, Issues, and Visitors
    let progressNotes = text;
    let issues = '';
    let visitorsNotes = '';

    // Split sections by keywords if mentioned
    const issuesRegex = /(?:المشاكل|المعوقات|الملاحظات|العوائق|مشاكل|issues|delays|problems)\s*[:：\-–]?\s*([^.]+)/i;
    const issuesMatch = text.match(issuesRegex);
    if (issuesMatch && issuesMatch[1]) {
        issues = issuesMatch[1].trim();
    }

    const visitorsRegex = /(?:الزوار|الزيارات|زيارة|الاستشاري|المعاينة|visitors|inspections|consultant)\s*[:：\-–]?\s*([^.]+)/i;
    const visitorsMatch = text.match(visitorsRegex);
    if (visitorsMatch && visitorsMatch[1]) {
        visitorsNotes = visitorsMatch[1].trim();
    }

    return {
        projectId: matchedProjectId,
        reportDate: new Date().toISOString().slice(0, 10),
        weather,
        temperatureC,
        hoursWorked,
        progressNotes: progressNotes.trim(),
        issues: issues.trim() || null,
        visitorsNotes: visitorsNotes.trim() || null
    };
}

/**
 * Process a site engineer's voice note to generate a structured Daily Site Report (DSR).
 */
export async function processDsrVoiceNote(filePath, clientTranscript = '', projects = []) {
    let transcriptText = clientTranscript?.trim() || '';

    // 1. Transcribe audio via OpenAI Whisper if client didn't supply transcript
    if (!transcriptText && process.env.OPENAI_API_KEY && filePath && fs.existsSync(filePath)) {
        try {
            const client = getOpenAI();
            if (client) {
                const transcription = await client.audio.transcriptions.create({
                    file: fs.createReadStream(filePath),
                    model: 'whisper-1',
                    language: 'ar',
                    prompt: 'Daily site report, DSR, engineering, construction, project, weather, hours, progress, issues, visitors'
                });
                transcriptText = transcription?.text || '';
            }
        } catch (err) {
            logger.warn({ err }, 'Whisper DSR transcription error, using fallback');
        }
    }

    if (!transcriptText) {
        transcriptText = 'تقرير موقع يومي صوتي';
    }

    // 2. If OpenAI is available, perform structured JSON completion
    if (process.env.OPENAI_API_KEY) {
        try {
            const client = getOpenAI();
            if (client) {
                const projectListStr = projects.map(p => `- ID: "${p.id}", Name: "${p.name}"`).join('\n');
                const completion = await client.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `You are an expert Construction ERP AI for Egyptian and Arab engineering firms.
Your task is to parse a Site Engineer's spoken Daily Site Report (DSR) voice note into structured JSON.

Existing Projects in Company:
${projectListStr || '(None)'}

Weather options: "SUNNY", "CLOUDY", "RAINY", "WINDY", "DUSTY", "HOT", "COLD", "OTHER"

Return a strictly valid JSON object with the following fields:
{
  "projectId": "UUID of the matched project or null",
  "reportDate": "YYYY-MM-DD (defaults to today)",
  "weather": "SUNNY | CLOUDY | RAINY | WINDY | DUSTY | HOT | COLD | OTHER",
  "temperatureC": Number or null,
  "hoursWorked": Number (e.g. 8, default 8),
  "progressNotes": "Clear, professional, structured Arabic or English summary of completed works, concrete, steel, labor, masonry, etc.",
  "issues": "Any site issues, obstacles, delays, machine breakdowns, or null",
  "visitorsNotes": "Consultants, clients, municipal inspectors, or null"
}`
                        },
                        {
                            role: 'user',
                            content: `Parse this spoken Daily Site Report:\n\n"${transcriptText}"`
                        }
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.1
                });

                const parsed = JSON.parse(completion.choices[0].message.content);
                return {
                    transcript: transcriptText,
                    data: {
                        projectId: parsed.projectId || projects[0]?.id || null,
                        reportDate: parsed.reportDate || new Date().toISOString().slice(0, 10),
                        weather: parsed.weather || 'SUNNY',
                        temperatureC: parsed.temperatureC != null ? Number(parsed.temperatureC) : null,
                        hoursWorked: parsed.hoursWorked != null ? Number(parsed.hoursWorked) : 8,
                        progressNotes: parsed.progressNotes || transcriptText,
                        issues: parsed.issues || null,
                        visitorsNotes: parsed.visitorsNotes || null
                    }
                };
            }
        } catch (aiErr) {
            logger.warn({ err: aiErr }, 'OpenAI DSR parsing error, falling back to NLP heuristics');
        }
    }

    // 3. Fallback: High-precision Egyptian NLP Heuristics
    const heuristicData = parseDsrHeuristics(transcriptText, projects);
    return {
        transcript: transcriptText,
        data: heuristicData
    };
}
