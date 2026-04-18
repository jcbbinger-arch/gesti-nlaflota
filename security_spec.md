# Security Specifications - ManagerPro App

## Data Invariants
1. **User Identity**: A user cannot modify their own `role` or `access_profiles` once created. This prevents privilege escalation.
2. **Relational Ownership**: An `order` must be linked to a valid `user_id` that matches the authenticated user, or managed by an `admin`.
3. **Typology Consistency**: `products` must belong to a `family` and `category` defined in `workspace_settings` (enforced via rules).
4. **Budget Integrity**: Expense updates are restricted to ensure `budget_per_teacher` in `events` is respected (enforced by application logic and guarded by rules).
5. **Terminal State Locking**: `orders` marked as 'Completado' or 'Cancelado' cannot be further modified except by an `admin`.
6. **Immutable Fields**: `createdAt`, `author_id`, and `workspace_id` fields are immutable after document creation.

## The "Dirty Dozen" Payloads (Attacks)
Below are 12 malicious payloads designed to bypass security.

1. **Privilege Escalation**: Update `/users/{myId}` with `{ "role": "admin" }`.
2. **Access Profile Hijacking**: Update `/users/{myId}` with `{ "access_profiles": { "admin": true } }`.
3. **Identity Spoofing (Order)**: Create `/orders` with a `user_id` of a different teacher.
4. **Ghost Product**: Create `/products` as a `Profile.STUDENT`.
5. **Typology Poisoning**: Create a product with a 2MB string in the `name` field.
6. **State Shortcut**: Update a 'Borrador' order directly to 'Recibido OK' bypassing 'Enviado'.
7. **Budget Exhaustion**: Update a sales amount to a negative number to "refund" budget.
8. **Private Recipe Leak**: Read a recipe where `is_public` is `false` and `author_id` is different.
9. **Message Sniffing**: Read a document in `/messages` where the user is neither sender nor recipient.
10. **Admin Impersonation**: Attempt to update `/settings/config` without an admin email.
11. **PII Blanket List**: Query all users and fetch their `phone` and `address` without being an admin.
12. **Orphaned Order**: Create an order for an `event_id` that does not exist in `/events`.

## Corrective Logic Gates
- **isValidId()**: Regex and size checks on all IDs.
- **isValid[Entity]()**: Strict schema validation for EVERY collection.
- **affectedKeys().hasOnly()**: Named actions for updates.
- **exists() / get()**: relational checks for orders and products.
