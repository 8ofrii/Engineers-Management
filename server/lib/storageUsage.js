// Tenant Storage Quota & Capacity Enforcer for Hesaby ERP
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './prisma.js';
import { getPlan } from './plans.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Calculates total media storage used by a tenant in bytes.
 * Scans:
 * 1. Project documents (prisma.document)
 * 2. Transaction receipts (prisma.transaction with receiptPhotoUrl)
 */
export async function getTenantStorageUsage(tenantId) {
    const [sub, tenant] = await Promise.all([
        prisma.subscription.findFirst({
            where: { tenantId, status: 'ACTIVE' },
            orderBy: { currentPeriodEnd: 'desc' },
            select: { plan: true }
        }),
        prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { subscriptionPlan: true }
        })
    ]);

    const planKey = sub?.plan || tenant?.subscriptionPlan || 'FREE';
    const plan = getPlan(planKey);

    // Sum document sizes from database
    const docSizeSum = await prisma.document.aggregate({
        where: { tenantId },
        _sum: { fileSize: true }
    });
    let totalBytes = Number(docSizeSum._sum?.fileSize || 0);

    // Also scan transaction receipt attachments
    const txReceipts = await prisma.transaction.findMany({
        where: { tenantId, receiptPhotoUrl: { not: null } },
        select: { receiptPhotoUrl: true }
    });

    for (const tx of txReceipts) {
        if (!tx.receiptPhotoUrl) continue;
        let attachments = [];
        try {
            const raw = tx.receiptPhotoUrl.trim();
            if (raw.startsWith('[') && raw.endsWith(']')) {
                attachments = JSON.parse(raw);
            } else {
                attachments = [raw];
            }
        } catch {
            attachments = [tx.receiptPhotoUrl];
        }

        for (const att of attachments) {
            const fileUrl = typeof att === 'object' ? att.url : att;
            const fileSize = typeof att === 'object' ? att.size : null;

            if (fileSize && typeof fileSize === 'number') {
                totalBytes += fileSize;
            } else if (fileUrl && typeof fileUrl === 'string' && fileUrl.startsWith('/uploads/')) {
                try {
                    const relativePath = fileUrl.replace(/^\//, '');
                    const fullPath = path.join(rootDir, relativePath);
                    if (fs.existsSync(fullPath)) {
                        const stat = fs.statSync(fullPath);
                        totalBytes += stat.size;
                    }
                } catch {
                    // Ignore individual file read error
                }
            }
        }
    }

    const maxMb = plan.limits?.maxStorageMb ?? 50;
    const isUnlimited = maxMb === -1;
    const maxBytes = isUnlimited ? -1 : maxMb * 1024 * 1024;
    const usedMb = Number((totalBytes / (1024 * 1024)).toFixed(2));
    const remainingMb = isUnlimited ? null : Math.max(0, Number((maxMb - usedMb).toFixed(2)));
    const usedPercent = isUnlimited ? 0 : Math.min(100, Math.round((totalBytes / maxBytes) * 100));

    return {
        usedBytes: totalBytes,
        usedMb,
        maxMb,
        remainingMb,
        usedPercent,
        isUnlimited,
        maxUploadFileMb: plan.limits?.maxUploadFileMb ?? 3,
        planKey
    };
}

/**
 * Asserts that incoming uploaded files do not exceed plan file size limits or total tenant storage capacity.
 */
export async function checkStorageQuota(tenantId, newFiles = []) {
    const usage = await getTenantStorageUsage(tenantId);
    const maxFileBytes = (usage.maxUploadFileMb || 3) * 1024 * 1024;

    const filesArray = Array.isArray(newFiles) ? newFiles : [newFiles];
    let incomingBytes = 0;

    for (const f of filesArray) {
        if (!f) continue;
        const size = f.size || 0;
        if (size > maxFileBytes) {
            return {
                allowed: false,
                code: 'FILE_SIZE_EXCEEDED',
                maxUploadFileMb: usage.maxUploadFileMb,
                message: `File "${f.originalname || 'attachment'}" (${(size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed file size of ${usage.maxUploadFileMb} MB for the ${usage.planKey} plan. Please upgrade your plan in Billing to upload larger files.`,
                messageAr: `حجم الملف "${f.originalname || 'المرفق'}" (${(size / (1024 * 1024)).toFixed(1)} م.ب) يتجاوز الحد الأقصى المسموح به وهو ${usage.maxUploadFileMb} ميجابايت لباقة ${usage.planKey}. يرجى ترقية باقتك لرفع ملفات أكبر.`
            };
        }
        incomingBytes += size;
    }

    if (!usage.isUnlimited && (usage.usedBytes + incomingBytes) > (usage.maxMb * 1024 * 1024)) {
        return {
            allowed: false,
            code: 'STORAGE_LIMIT_EXCEEDED',
            maxMb: usage.maxMb,
            usedMb: usage.usedMb,
            message: `You have reached your storage limit of ${usage.maxMb} MB (currently used: ${usage.usedMb} MB). Please upgrade your subscription plan in Billing to increase storage capacity.`,
            messageAr: `لقد استنفدت السعة التخزينية المتاحة لباقاتك (${usage.maxMb} ميجابايت، المستخدم حالياً: ${usage.usedMb} ميجابايت). يرجى ترقية باقة اشتراكك من صفحة الفوترة لزيادة السعة التخزينية.`
        };
    }

    return { allowed: true, usage };
}
