import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';

// --- Local Storage for Audio Notes (Temporary before sending to OpenAI) ---
const audioDir = './uploads/audio';
if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
}

const localAudioStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, audioDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'voice-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Configure multer for temporary local audio uploads
const audioUpload = multer({
    storage: localAudioStorage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/x-m4a', 'audio/mp4', 'audio/webm', 'audio/ogg'];
        if (allowedTypes.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Invalid file type. Only audio files are allowed'), false);
    },
    limits: { fileSize: 25 * 1024 * 1024 }
});

// --- S3 Storage for Persistent Images (Logos, Profiles) ---
const s3 = new S3Client({
    region: process.env.AWS_REGION || 'eu-central-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const getBucketName = () => process.env.AWS_BUCKET_NAME || 'my-app-buckets';

const s3ImageStorage = multerS3({
    s3: s3,
    bucket: getBucketName,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'images/profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Configure multer for S3 image uploads
const upload = multer({
    storage: s3ImageStorage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Invalid file type. Only image files are allowed'), false);
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

export { upload, audioUpload };
export default audioUpload; // Keep default export for backward compatibility

