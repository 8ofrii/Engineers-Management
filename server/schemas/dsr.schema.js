import { z } from 'zod';

const Weather = z.enum(['SUNNY', 'CLOUDY', 'RAINY', 'WINDY', 'DUSTY', 'HOT', 'COLD', 'OTHER']);

const decimalOpt = z.union([z.number(), z.string()])
    .refine(v => v === '' || !Number.isNaN(Number(v)), 'Must be a number')
    .transform(v => v === '' ? null : Number(v))
    .optional()
    .nullable();

const attendanceEntry = z.object({
    workmanId: z.string().uuid(),
    hoursPresent: z.number().min(0).max(24).optional(),
    role: z.string().max(60).optional()
});

const materialEntry = z.object({
    name: z.string().min(1).max(200),
    quantity: z.number().positive().optional(),
    unit: z.string().max(20).optional(),
    supplierId: z.string().uuid().optional().nullable(),
    notes: z.string().max(500).optional().nullable()
});

const baseDsr = z.object({
    projectId: z.string().uuid(),
    reportDate: z.string().refine(v => !Number.isNaN(new Date(v).getTime()), 'Invalid date'),
    weather: Weather.optional().nullable(),
    temperatureC: decimalOpt,
    hoursWorked: decimalOpt,
    progressNotes: z.string().max(5000).optional().nullable(),
    issues: z.string().max(5000).optional().nullable(),
    visitorsNotes: z.string().max(2000).optional().nullable(),
    workmenAttendance: z.array(attendanceEntry).max(200).optional().nullable(),
    materialsReceived: z.array(materialEntry).max(100).optional().nullable(),
    photoIds: z.array(z.string().uuid()).max(50).optional()
});

export const createDsrSchema = baseDsr;

export const updateDsrSchema = baseDsr.partial();

export const acknowledgeDsrSchema = z.object({
    acknowledgeNotes: z.string().max(1000).optional().nullable()
});

export const idParamSchema = z.object({
    id: z.string().uuid('Invalid id')
});
