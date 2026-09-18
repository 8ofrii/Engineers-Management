import { z } from 'zod';

const ClientStatus = z.enum(['ACTIVE', 'INACTIVE', 'PENDING']);

const baseClient = z.object({
    name: z.string().min(1).max(200),
    email: z.string().email().max(254).optional().nullable().or(z.literal('')),
    phone: z.string().max(30).optional().nullable().or(z.literal('')),
    phones: z.array(z.string().max(30)).optional().default([]),
    company: z.string().max(200).optional().nullable(),
    taxId: z.string().max(50).optional().nullable(),
    status: ClientStatus.optional(),
    street: z.string().max(200).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(100).optional().nullable(),
    zipCode: z.string().max(20).optional().nullable(),
    country: z.string().max(100).optional().nullable(),
    contactName: z.string().max(120).optional().nullable(),
    contactPosition: z.string().max(120).optional().nullable(),
    contactPhone: z.string().max(30).optional().nullable(),
    contactEmail: z.string().email().max(254).optional().nullable().or(z.literal(''))
});

export const createClientSchema = baseClient;
export const updateClientSchema = baseClient.partial();

export const idParamSchema = z.object({
    id: z.string().uuid('Invalid id')
});
