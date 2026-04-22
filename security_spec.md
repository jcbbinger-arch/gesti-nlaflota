# Firestore Security Audit & Hardened Rules Plan

## 1. Context & Invariants
- **Master Gate:** Every restricted collection (`/orders/`, `/messages/`, etc.) must derive access directly from the user's ID or authorization documents.
- **Strict Validation:** All writes must be validated via helper functions (`isValidOrder`, `isValidUser`, etc.) before any operational logic.
- **Query Enforcer:** All `allow list` rules MUST evaluate `resource.data` to prevent unauthorized "scrape-all" attacks.

## 2. "The Dirty Dozen" Payloads (Examples to deny)
1. **Payload Payload (Poison ID):** Creating an order with a document ID: "a".repeat(1000) (Should fail `isValidId`).
2. **Ghost Field Update:** Updating an order Whitelisted Key + extra field `{ ..., "is_admin": true }` (Should fail `affectedKeys().hasOnly()`).
3. **Role Spoofing:** A teacher trying to set their own profile to `role: 'admin'`.
4. **Orphaned Order:** Creating an order with a non-existent `event_id`.
5. **PII Leak:** An authenticated user trying to `get()` another user's PII field.
6. **Immutable Field Attack:** Attempting to update `createdAt` timestamp.
7. **Size Attack:** Order with 10,000 items in `items` array.
8. **Value Poisoning:** Updating `cost` with a string instead of a number.
9. **Identity Spoofing:** Creating an order with `user_id: "other_teacher_uid"`.
10. **State Shortcutting:** Skipping 'Enviado' and directly setting order to 'Procesado' via client.
11. **Query Scraping:** An `allow list` query without proper `if resource.data.ownerId == request.auth.uid`.
12. **Incomplete Action:** An `update` operation that doesn't use the mandatory `isValid[Entity]` validation helper.

## 3. Test Runner Infrastructure
We will create `firestore.rules.test.ts` using `firebase-rules-unit-testing` to programmatically verify these 12 scenarios.
