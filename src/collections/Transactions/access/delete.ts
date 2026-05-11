import type { Access } from 'payload'

// Transactions cannot be deleted - users must create reversing transactions instead
// This maintains audit trails and prevents accidental data loss
const deleteTransactions: Access<Record<string, unknown>> = () => false

export default deleteTransactions
