import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { render } from 'bidi-shaper';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARABIC_RANGE_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/**
 * Checks if a string contains any Arabic characters.
 */
export function isArabic(text) {
    if (!text || typeof text !== 'string') return false;
    return ARABIC_RANGE_REGEX.test(text);
}

/**
 * Formats any string for PDF rendering:
 * - If Arabic / mixed Arabic-English, applies standard UAX #9 Bidirectional reordering
 *   and Arabic contextual glyph shaping using `bidi-shaper`.
 * - If `maxWidth` and `doc` are provided, performs line-by-line word wrapping BEFORE
 *   BiDi rendering so multi-line text reads naturally from top to bottom, right to left.
 * - If Latin-only, returns string untouched.
 *
 * @param {string} input
 * @param {PDFKit.PDFDocument} [doc]
 * @param {number} [maxWidth]
 * @returns {string}
 */
export function formatPdfText(input, doc = null, maxWidth = null) {
    if (input === null || input === undefined) return '';
    const str = String(input).trim();
    if (!str) return '';
    if (!isArabic(str)) return str;

    // If no wrapping width or doc instance provided, process entire text through bidi-shaper
    if (!doc || !maxWidth || typeof doc.widthOfString !== 'function') {
        try {
            return render(str);
        } catch {
            return str;
        }
    }

    // Split text by newlines first to preserve user paragraphs
    const paragraphs = str.split(/\r?\n/);
    const formattedParagraphs = [];

    for (const paragraph of paragraphs) {
        const trimmed = paragraph.trim();
        if (!trimmed) {
            formattedParagraphs.push('');
            continue;
        }

        if (!isArabic(trimmed)) {
            formattedParagraphs.push(trimmed);
            continue;
        }

        // Tokenize into logical words and wrap based on rendered width
        const words = trimmed.split(/\s+/);
        const lines = [];
        let currentLine = '';

        for (const word of words) {
            const candidate = currentLine ? `${currentLine} ${word}` : word;
            let renderedCandidate = candidate;
            try {
                renderedCandidate = render(candidate);
            } catch {
                renderedCandidate = candidate;
            }

            const measuredWidth = doc.widthOfString(renderedCandidate, { features: [] });

            if (measuredWidth > maxWidth && currentLine) {
                try {
                    lines.push(render(currentLine));
                } catch {
                    lines.push(currentLine);
                }
                currentLine = word;
            } else {
                currentLine = candidate;
            }
        }

        if (currentLine) {
            try {
                lines.push(render(currentLine));
            } catch {
                lines.push(currentLine);
            }
        }

        formattedParagraphs.push(lines.join('\n'));
    }

    return formattedParagraphs.join('\n');
}

/**
 * High-level helper to draw text in PDFKit with automatic Arabic detection,
 * line wrapping, and features: [] to prevent double-reversal.
 */
export function drawPdfText(doc, text, x, y, options = {}) {
    if (text === null || text === undefined) return doc;
    const str = String(text);
    const hasArabic = isArabic(str);
    const width = options.width;
    const formatted = hasArabic ? formatPdfText(str, doc, width) : str;
    const opts = {
        ...options,
        ...(hasArabic ? { features: [] } : {})
    };
    if (x !== undefined && y !== undefined) {
        return doc.text(formatted, x, y, opts);
    }
    return doc.text(formatted, opts);
}

/**
 * Registers Unicode TrueType fonts (Regular and Bold) into a PDFKit document.
 */
export function setupDocFonts(doc) {
    const localFontRegular = path.join(__dirname, '../assets/fonts/Arial.ttf');
    const localFontBold = path.join(__dirname, '../assets/fonts/Arial-Bold.ttf');
    const winFontRegular = 'C:/Windows/Fonts/arial.ttf';
    const winFontBold = 'C:/Windows/Fonts/arialbd.ttf';

    let regularPath = null;
    let boldPath = null;

    if (fs.existsSync(localFontRegular)) regularPath = localFontRegular;
    else if (fs.existsSync(winFontRegular)) regularPath = winFontRegular;

    if (fs.existsSync(localFontBold)) boldPath = localFontBold;
    else if (fs.existsSync(winFontBold)) boldPath = winFontBold;

    if (regularPath) {
        doc.registerFont('AppFont', regularPath);
        doc.font('AppFont');
    }
    if (boldPath) {
        doc.registerFont('AppFont-Bold', boldPath);
    }
}

