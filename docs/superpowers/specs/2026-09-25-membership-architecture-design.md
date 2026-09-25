# Membership Architecture & Schema Design (FD-093, Task #46)

## 1. Overview & Business Model

Per founder decision **FD-093**:
- Two membership options paid exclusively from the account's `Lá` balance:
  - **Hội viên tháng**: 1,500 Lá / 30 days.
  - **Hội viên năm**: 8,000 Lá / 365 days (~56% savings compared to 12 monthly terms; exactly matches the `LA-LIBRARY-8000` pack).
- **No auto-renewal**: Subscriptions expire cleanly at the end of their term. No recurring bank or card charges.
- **Benefits**:
  - **20% report discount**: Active members receive 20% off comprehensive and excerpt reports (e.g. 960 Lá -> 768 Lá; 240 Lá -> 192 Lá).
  - **"Hôm nay của bạn"** (daily personalized forecast) & **"Nguyệt vận"** (monthly 12-month guidance): Gated on active membership once the Hạn calculation engine (Kaneo #39) is shipped. In the meantime, UI surfaces label these "Sắp có" (coming soon).
  - **Free-tools personalization**: Access to chart-personalized versions of all interactive tools.
  - **Exclusion**: The full Comprehensive report (`ZIWEI-IDENTITY-P0`) remains a separate lifetime purchase (FD-093).

---

## 2. Proposed Database Schema

The proposed schema introduces two append-friendly tables to `packages/database/src/schema/membership.ts`:

### 2.1 `membership_plans` Table
Stores immutable catalog terms for active and historical tiers:
```typescript
export const membershipPlans = pgTable("membership_plans", {
  id: text("id").primaryKey(), // "MEMBERSHIP-MONTHLY-1500" | "MEMBERSHIP-YEARLY-8000"
  tier: text("tier").notNull(), // "monthly" | "yearly"
  durationDays: integer("duration_days").notNull(), // 30 | 365
  priceLa: integer("price_la").notNull(), // 1500 | 8000
  discountPercentage: integer("discount_percentage").default(20).notNull(),
  status: text("status").default("active").notNull(), // "active" | "retired"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### 2.2 `membership_subscriptions` Table
Records customer subscriptions backed by atomic wallet transactions:
```typescript
export const membershipSubscriptions = pgTable("membership_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id").notNull(), // References user/account id
  planId: text("plan_id").notNull().references(() => membershipPlans.id),
  walletSpendTransactionId: uuid("wallet_spend_transaction_id").notNull(), // References wallet_transactions.id
  status: text("status").notNull(), // "active" | "expired" | "cancelled"
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  ownerActiveIdx: index("membership_owner_active_idx").on(table.ownerId, table.status, table.expiresAt),
}));
```

---

## 3. Subscription & Stacking Lifecycle

1. **Purchase Flow**:
   - Customer initiates membership purchase from `/nap-la` or `/la-so/[chartId]/chon-luan-giai`.
   - Backend calls `walletService.spend()` to deduct the exact Lá amount (1,500 or 8,000) with reason code `membership.purchase`.
   - In the same atomic database transaction:
     - Check if customer has an existing active subscription (`status = 'active' AND expires_at > now()`).
     - **If existing active**: The new period stacks cleanly onto the existing expiration:
       - `startsAt = existing.expiresAt`
       - `expiresAt = existing.expiresAt + makeInterval(plan.durationDays)`
     - **If new or expired**:
       - `startsAt = now()`
       - `expiresAt = now() + makeInterval(plan.durationDays)`
     - Insert row into `membership_subscriptions`.

2. **Expiry & Entitlement Check**:
   - Pure, frozen-clock read-side query:
     ```sql
     SELECT * FROM membership_subscriptions
     WHERE owner_id = :userId
       AND status = 'active'
       AND starts_at <= :now
       AND expires_at > :now
     ORDER BY expires_at DESC
     LIMIT 1;
     ```
   - An asynchronous periodic task can transition subscriptions where `expires_at <= now()` to `status = 'expired'`, but authorization checks evaluate `expires_at > now()` strictly at query time for zero lag.

3. **20% Report Discount Calculation**:
   - When calculating report purchase pricing in `order.service.ts` or `wallet-unlock.service.ts`:
     - If user has active membership:
       - `effectiveLa = Math.round(basePriceLa * 0.8)`
       - 240 Lá -> 192 Lá
       - 960 Lá -> 768 Lá
       - 720 Lá (in-window upgrade) -> 576 Lá
     - The discount is recorded in the transaction metadata and order projection.

---

## 4. Migration & Release Readiness

- Per Task #46, this design is submitted for founder review and approval **before** generating Drizzle migration `0043_membership_subscriptions.sql`.
- In the public UI, the Hội viên tab is rendered truthfully with the badge `"Sắp có"` (coming soon) and cannot be purchased until the migration and Hạn engine ship.
