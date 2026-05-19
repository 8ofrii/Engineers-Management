# ✅ Delete with Confirmation Added

## Features
- **Delete Button**: Added a Trash icon button to all Client and Project cards.
- **Confirmation Modal**: A dedicated popup that asks "Are you sure?" before deleting.
- **API Integration**: Connected to `DELETE` endpoints for Clients and Projects.
- **Localization**: Full English and Arabic support for confirmation messages.

## Files Created/Modified
- `client/src/components/DeleteConfirmationModal.jsx` (New)
- `client/src/pages/Clients.jsx` (Updated)
- `client/src/pages/Projects.jsx` (Updated)
- `client/src/locales/en.json` (Updated)
- `client/src/locales/ar.json` (Updated)

## How to Test
1. Click the **Trash** icon on any card.
2. Verify the modal title and warning text.
3. Click "Delete" to confirm removal, or "Cancel" to abort.
