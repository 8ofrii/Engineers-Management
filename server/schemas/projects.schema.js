import { z } from 'zod';

const ProjectStatus = z.enum(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']);
const ProjectType = z.enum(['RESIDENTIAL', 'COMMERCIAL', 'INFRASTRUCTURE', 'INDUSTRIAL', 'OTHER']);
const RevenueModel = z.enum(['DESIGN_ONLY_AREA', 'EXECUTION_COST_PLUS', 'EXECUTION_LUMP_SUM']);

const decimalString = z.union([z.number(), z.string()])
    .refine(v => v === '' || !Number.isNaN(Number(v)), 'Must be a number')
    .transform(v => v === '' ? undefined : Number(v));

const dateString = z.union([z.string(), z.date()])
    .refine(v => v === '' || !Number.isNaN(new Date(v).getTime()), 'Invalid date');

// Allowlist of user-settable fields. Notably absent (and therefore stripped):
// id, createdAt, updatedAt, tenantId, engineerId, actualCost, officeRevenue,
// officeExpenses, operationalFund, projectSafeBalance — these are computed or
// set by the server, never trusted from the client.
const baseProject = z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional().nullable(),
    status: ProjectStatus.optional(),
    projectType: ProjectType.optional(),
    location: z.string().max(200).optional().nullable(),
    startDate: dateString,
    endDate: dateString.optional().nullable(),
    budget: decimalString.optional(),
    revenueModel: RevenueModel.optional(),
    managementFeePercent: decimalString.optional(),
    totalContractValue: decimalString.optional(),
    paymentTerms: z.string().max(100).optional(),
    clientId: z.string().uuid()
});

export const createProjectSchema = baseProject;
export const updateProjectSchema = baseProject.partial();

export const idParamSchema = z.object({
    id: z.string().uuid('Invalid id')
});
