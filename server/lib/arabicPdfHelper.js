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
 * Patches PDFKit's EmbeddedFont layoutRun to enforce 'ltr' direction.
 *
 * WHY THIS IS CRITICAL:
 * `bidi-shaper` performs standard Unicode BiDi reordering and Arabic Presentation Forms-B
 * glyph shaping, producing strings in exact visual order (left-to-right).
 *
 * When PDFKit passes text to fontkit, fontkit inspects the script of the characters.
 * For Arabic Presentation Forms-B, fontkit detects script = 'arab' and defaults direction to 'rtl'.
 * In fontkit's OTLayoutEngine:
 *   if (glyphRun.direction === 'rtl') { glyphRun.glyphs.reverse(); glyphRun.positions.reverse(); }
 * This causes fontkit to reverse the glyph array a SECOND time (double-reversal),
 * flipping pure Arabic words like "سند صرف معتمد" into backwards disjointed glyphs ("دمتعم فرص دنس")!
 *
 * By explicitly forcing direction: 'ltr' in `font.layout(...)`, fontkit leaves the visual glyph
 * sequence untouched, guaranteeing that Arabic text displays connected and correctly oriented.
 */
export function patchEmbeddedFontLayout(embeddedFont) {
    if (!embeddedFont) return;
    const proto = Object.getPrototypeOf(embeddedFont);
    if (!proto || proto._bidiPatched) return;

    proto.layoutRun = function(text, features) {
        // Enforce direction: 'ltr' so fontkit does not reverse
        // glyph runs that have already been shaped and reordered into visual order by bidi-shaper.
        const run = this.font.layout(text, features, undefined, undefined, 'ltr');
        for (let i = 0; i < run.positions.length; i++) {
            const position = run.positions[i];
            for (let key in position) {
                position[key] *= this.scale;
            }
            position.advanceWidth = run.glyphs[i].advanceWidth * this.scale;
        }
        return run;
    };
    proto._bidiPatched = true;
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

    if (doc && doc._font) {
        patchEmbeddedFontLayout(doc._font);
    }

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
    if (doc && doc._font) {
        patchEmbeddedFontLayout(doc._font);
    }
    const str = String(text);
    const hasArabic = isArabic(str);
    const wrapWidth = options.lineBreak === false ? null : options.width;
    const formatted = hasArabic ? formatPdfText(str, doc, wrapWidth) : str;
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
    const candidatesRegular = [
        path.join(__dirname, '../assets/fonts/SegoeUI.ttf'),
        'C:/Windows/Fonts/segoeui.ttf',
        path.join(__dirname, '../assets/fonts/Arial.ttf'),
        'C:/Windows/Fonts/arial.ttf'
    ];
    const candidatesBold = [
        path.join(__dirname, '../assets/fonts/SegoeUI-Bold.ttf'),
        'C:/Windows/Fonts/segoeuib.ttf',
        path.join(__dirname, '../assets/fonts/Arial-Bold.ttf'),
        'C:/Windows/Fonts/arialbd.ttf'
    ];

    let regularPath = candidatesRegular.find(p => fs.existsSync(p)) || null;
    let boldPath = candidatesBold.find(p => fs.existsSync(p)) || null;

    if (regularPath) {
        doc.registerFont('AppFont', regularPath);
        doc.font('AppFont');
        if (doc._font) {
            patchEmbeddedFontLayout(doc._font);
        }
    }
    if (boldPath) {
        doc.registerFont('AppFont-Bold', boldPath);
    }

    if (doc && !doc._fontBidiPatched) {
        const origFont = doc.font.bind(doc);
        doc.font = function(...args) {
            const res = origFont(...args);
            if (this._font) {
                patchEmbeddedFontLayout(this._font);
            }
            return res;
        };
        doc._fontBidiPatched = true;
    }
}

