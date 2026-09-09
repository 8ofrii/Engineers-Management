import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

// Get absolute paths for local storage
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const audioDir = path.join(rootDir, 'uploads', 'audio');
const imageDir = path.join(rootDir, 'uploads', 'images');

// Ensure directories exist
[audioDir, imageDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Strict MIME to safe file extension maps (prevents arbitrary extension upload / stored XSS)
const IMAGE_MIME_MAP = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp'
};

const AUDIO_MIME_MAP = {
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/wav': '.wav',
    'audio/m4a': '.m4a',
    'audio/x-m4a': '.m4a',
    'audio/mp4': '.mp4',
    'audio/webm': '.webm',
    'audio/ogg': '.ogg'
};

const getSafeImageExt = (file) => IMAGE_MIME_MAP[file.mimetype] || '.jpg';
const getSafeAudioExt = (file) => AUDIO_MIME_MAP[file.mimetype] || '.mp3';

// Configure local storage for audio (temporary)
const localAudioStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, audioDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'voice-' + uniqueSuffix + getSafeAudioExt(file));
    }
});

const audioUpload = multer({
    storage: localAudioStorage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/x-m4a', 'audio/mp4', 'audio/webm', 'audio/ogg'];
        if (allowedTypes.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Invalid file type. Only audio files are allowed'), false);
    },
    limits: { fileSize: 25 * 1024 * 1024 }
});

// --- S3 Storage for Persistent Images ---
const s3 = new S3Client({
    region: process.env.AWS_REGION || 'eu-north-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'engineers-app-images-2026';

// Storage configuration with S3
const s3ImageStorage = multerS3({
    s3: s3,
    bucket: BUCKET_NAME, // Fixed: Must be a string or a callback-based function
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'images/profile-' + uniqueSuffix + getSafeImageExt(file));
    }
});

// Fallback Local Storage
const localImageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, imageDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'img-' + uniqueSuffix + getSafeImageExt(file));
    }
});

// Decide whether to use S3 or Local
const useS3 = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_BUCKET_NAME);

const upload = multer({
    storage: useS3 ? s3ImageStorage : localImageStorage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Invalid file type. Only images are allowed'), false);
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Receipt images for AI extraction — processed in memory, never persisted.
// Privacy: receipts often contain personal/financial details; we only need the
// extracted JSON, not the raw image. memoryStorage keeps the bytes in req.file.buffer.
const receiptMemoryUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
            'application/pdf'
        ];
        if (allowedTypes.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Invalid file type. Receipt must be an image (JPEG, PNG, WebP) or PDF document.'), false);
    },
    limits: { fileSize: 15 * 1024 * 1024 } // 15 MB to comfortably allow scanned PDF invoices
});

export { upload, audioUpload, receiptMemoryUpload };
export default audioUpload;

