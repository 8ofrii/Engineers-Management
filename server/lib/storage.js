// Lightweight wrapper around S3 PUT for cases where multer-s3 doesn't fit:
// uploading raw buffers (in-memory receipt images) or files we already have on
// disk (audio temp files we need to persist after Whisper transcription).
//
// Falls back to local /uploads when S3 isn't configured — same convention the
// existing image upload pipeline uses.

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const useS3 = !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_BUCKET_NAME
);

let s3Client = null;
const getS3 = () => {
    if (!s3Client) {
        s3Client = new S3Client({
            region: process.env.AWS_REGION || 'eu-north-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });
    }
    return s3Client;
};

const BUCKET = process.env.AWS_BUCKET_NAME || 'engineers-app-images-2026';
const REGION = process.env.AWS_REGION || 'eu-north-1';

const buildPublicUrl = (key) => `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

/**
 * Upload a Buffer to S3 (or local disk fallback).
 * @returns {Promise<string>} the public URL or local path that can be persisted
 */
export const uploadBuffer = async (buffer, mimeType, prefix = 'misc') => {
    const ext = mimeType.split('/')[1]?.split(';')[0] || 'bin';
    const key = `${prefix}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;

    if (useS3) {
        await getS3().send(new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: buffer,
            ContentType: mimeType
        }));
        return buildPublicUrl(key);
    }

    // Local fallback — write to /uploads/<prefix>/<filename>
    const dir = path.join(rootDir, 'uploads', prefix);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filename = path.basename(key);
    const fullPath = path.join(dir, filename);
    fs.writeFileSync(fullPath, buffer);
    // The /uploads/ static mount in server.js exposes this URL at runtime
    return `/uploads/${prefix}/${filename}`;
};

/**
 * Upload a file already on disk to S3 (or move into the local /uploads dir).
 * Used by the voice-extraction flow which writes audio to a temp path first.
 */
export const uploadFile = async (filePath, mimeType, prefix = 'misc') => {
    const buffer = fs.readFileSync(filePath);
    return uploadBuffer(buffer, mimeType, prefix);
};

/**
 * Best-effort delete. Used when discarding a draft so we don't keep orphan media.
 * Local URLs starting with `/uploads/` map to disk paths; S3 URLs are deleted
 * by extracting the key after the bucket hostname.
 */
export const deleteByUrl = async (url) => {
    if (!url) return;
    try {
        if (url.startsWith('/uploads/')) {
            const uploadsRoot = path.resolve(rootDir, 'uploads');
            const relativePart = url.replace(/^\/uploads[\/\\]?/, '');
            const fullPath = path.resolve(uploadsRoot, relativePart);
            // Verify path traversal does not escape uploads directory
            if (fullPath.startsWith(uploadsRoot) && fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
            return;
        }
        if (url.includes('.s3.') && url.includes(BUCKET)) {
            const key = url.split(`${BUCKET}.s3.${REGION}.amazonaws.com/`)[1];
            if (key) {
                await getS3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
            }
        }
    } catch (e) {
        // Don't throw — orphan cleanup is best-effort, the draft delete shouldn't fail because of it
    }
};

export const storageEnabled = useS3 ? 's3' : 'local';
