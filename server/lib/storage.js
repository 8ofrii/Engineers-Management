// ==============================================================================
// Hesaby ERP - High-Performance Object Storage Subsystem (S3 / MinIO / Local)
// Provides unified storage abstraction for receipts, voice notes, profile images,
// and project documents with seamless MinIO & AWS S3 support.
// ==============================================================================

import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    HeadBucketCommand,
    CreateBucketCommand
} from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

export const useS3 = !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    (process.env.AWS_BUCKET_NAME || process.env.S3_ENDPOINT)
);

export const BUCKET = process.env.AWS_BUCKET_NAME || 'hesaby-media';
export const REGION = process.env.AWS_REGION || 'us-east-1';

let s3Client = null;

export const getS3 = () => {
    if (!s3Client) {
        const config = {
            region: REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        };

        if (process.env.S3_ENDPOINT) {
            config.endpoint = process.env.S3_ENDPOINT;
            // MinIO requires path-style access (e.g. http://127.0.0.1:9000/bucket/key)
            config.forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== 'false';
        }

        s3Client = new S3Client(config);
    }
    return s3Client;
};

/**
 * Ensures the target S3/MinIO bucket exists on application startup.
 */
export const ensureBucketExists = async () => {
    if (!useS3) return;
    try {
        await getS3().send(new HeadBucketCommand({ Bucket: BUCKET }));
    } catch (err) {
        const status = err.$metadata?.httpStatusCode;
        if (status === 404 || err.name === 'NotFound' || err.name === 'NoSuchBucket') {
            try {
                await getS3().send(new CreateBucketCommand({ Bucket: BUCKET }));
                console.log(`[Storage] MinIO/S3 bucket '${BUCKET}' initialized successfully.`);
            } catch (createErr) {
                console.warn(`[Storage] Notice creating bucket '${BUCKET}': ${createErr.message}`);
            }
        } else {
            console.warn(`[Storage] HeadBucket check for '${BUCKET}': ${err.message}`);
        }
    }
};

/**
 * Upload a Buffer to MinIO / S3 (or local disk fallback).
 * @returns {Promise<string>} public relative path (/uploads/...) or S3_PUBLIC_URL
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

        if (process.env.S3_PUBLIC_URL) {
            return `${process.env.S3_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
        }
        // Canonical URL served by express.static & MinIO stream fallback in server.js
        return `/uploads/${key}`;
    }

    // Local fallback — write to /uploads/<prefix>/<filename>
    const dir = path.join(rootDir, 'uploads', prefix);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filename = path.basename(key);
    const fullPath = path.join(dir, filename);
    fs.writeFileSync(fullPath, buffer);
    return `/uploads/${prefix}/${filename}`;
};

/**
 * Upload a file already on disk to S3/MinIO (or move into the local /uploads dir).
 * Used by voice extraction and file attachment flows.
 */
export const uploadFile = async (filePath, mimeType, prefix = 'misc') => {
    const buffer = fs.readFileSync(filePath);
    return uploadBuffer(buffer, mimeType, prefix);
};

/**
 * Best-effort delete. Used when discarding a draft or replacing an existing file.
 */
export const deleteByUrl = async (url) => {
    if (!url) return;
    try {
        if (url.startsWith('/uploads/')) {
            const key = url.replace(/^\/uploads[\/\\]?/, '');
            // 1. Delete from local disk if it exists
            const uploadsRoot = path.resolve(rootDir, 'uploads');
            const fullPath = path.resolve(uploadsRoot, key);
            if (fullPath.startsWith(uploadsRoot) && fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
            // 2. Delete from MinIO/S3 if enabled
            if (useS3 && key) {
                await getS3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })).catch(() => {});
            }
            return;
        }

        if (useS3 && url.includes(BUCKET)) {
            const parsed = new URL(url);
            let key = parsed.pathname.replace(/^\/+/, '');
            if (key.startsWith(`${BUCKET}/`)) {
                key = key.replace(`${BUCKET}/`, '');
            }
            if (key) {
                await getS3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })).catch(() => {});
            }
        }
    } catch (e) {
        // Orphan cleanup is best-effort
    }
};

export const storageEnabled = useS3 ? 'minio-s3' : 'local';
export default {
    uploadBuffer,
    uploadFile,
    deleteByUrl,
    getS3,
    ensureBucketExists,
    BUCKET,
    useS3,
    storageEnabled
};
