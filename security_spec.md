# Security Specification - MediTrack Pro

## Data Invariants
1. A Sale must have a unique invoice number and items.
2. Stock changes must be recorded in the StockLedger.
3. User profiles must be managed by admins or the owner themselves.
4. PII (phone, email, address) should only be accessible by authenticated staff.

## The "Dirty Dozen" Payloads
1. **Identity Spoofing**: Attempt to create a Sale with `createdBy` set to another user.
2. **Privilege Escalation**: A `staff` user attempting to set `role: "admin"` in their profile.
3. **Ghost Fields**: Adding a `hiddenDiscount` field to a Sale.
4. **State Shortcutting**: Updating a Sale status from `completed` to `returned` without stock adjustment (requires atomicity).
5. **ID Poisoning**: Using a 2KB string as a `productId`.
6. **Orphaned Record**: Creating a Sale for a non-existent `productId`.
7. **Negative Stock**: Selling more than available stock (checked via transaction, but rules should guard bounds).
8. **Unauthorized PII Access**: Unauthenticated user trying to read `customers` collection.
9. **Malicious Metadata**: Trying to reset `salesCounter` in `metadata` collection.
10. **Immutable Field Change**: Trying to update `createdAt` on a Product.
11. **Spoofed Email**: Using a non-verified email to gain access.
12. **Bulk Deletion**: Attempting to delete the entire `products` collection.

## Test Runner
(Verifies PERMISSION_DENIED for all the above)
