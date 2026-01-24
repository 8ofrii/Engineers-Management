# ✅ Moved Payment Terms to Project

## Changes Implemented

### 1. **Schema Change (Prisma)**
- `paymentTerms` field moved from **Client** model to **Project** model.
- Default value: "Net 30".
- *Note: Ensure `npx prisma db push` is run to apply this to your database.*

### 2. **Frontend Updates**
- **AddClientModal**: Removed "Payment Terms" field and state logic.
- **AddProjectModal**: Added "Payment Terms" dropdown to the Financial Details section.
- **Translations**: Moved "Payment Terms" label from Client section to Project section in both English and Arabic.

## Verification
1. Open **Add Client** modal → "Payment Terms" should be **gone**.
2. Open **Add Project** modal → "Payment Terms" should be **present** (under Financial Details).
3. Check creating a project; it should save `paymentTerms`.

## Action Required
If you haven't already, please run:
```bash
npx prisma db push
```
to update your database structure.
