-- Plans move from a hardcoded enum + constants to a table that super admins edit.
-- Merchant.plan / PaymentRequest.plan keep their current values ('FREE', 'STARTER', ...)
-- and now reference Plan.key.

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL DEFAULT 0,
    "contactOnly" BOOLEAN NOT NULL DEFAULT false,
    "maxProducts" INTEGER,
    "maxUsers" INTEGER,
    "features" TEXT[],
    "color" TEXT NOT NULL DEFAULT 'gray',
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_key_key" ON "Plan"("key");
CREATE INDEX "Plan_sortOrder_idx" ON "Plan"("sortOrder");

-- Seed the four existing plans with the values that were hardcoded in src/lib/plans.ts
INSERT INTO "Plan" ("id", "key", "name", "description", "price", "contactOnly", "maxProducts", "maxUsers", "features", "color", "isPopular", "isDefault", "sortOrder", "updatedAt") VALUES
  ('plan_free',       'FREE',       'Free',       'For individuals getting started', 0,    false, 5,    1,    ARRAY['sales','inventory'],                                                                             'gray',   false, true,  0, CURRENT_TIMESTAMP),
  ('plan_starter',    'STARTER',    'Starter',    'For small shops',                 999,  false, 200,  3,    ARRAY['sales','inventory','reports','stock_adjustments','multi_user'],                                  'blue',   true,  false, 1, CURRENT_TIMESTAMP),
  ('plan_growth',     'GROWTH',     'Growth',     'For growing businesses',          2499, false, 1000, 10,   ARRAY['sales','inventory','reports','stock_adjustments','shifts','exports','multi_user'],              'purple', false, false, 2, CURRENT_TIMESTAMP),
  ('plan_enterprise', 'ENTERPRISE', 'Enterprise', 'For large operations',            0,    true,  NULL, NULL, ARRAY['sales','inventory','reports','stock_adjustments','shifts','exports','multi_user','api_access'], 'amber',  false, false, 3, CURRENT_TIMESTAMP);

-- Merchant.plan: enum -> text
ALTER TABLE "Merchant" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "Merchant" ALTER COLUMN "plan" TYPE TEXT USING "plan"::text;
ALTER TABLE "Merchant" ALTER COLUMN "plan" SET DEFAULT 'FREE';

-- PaymentRequest.plan: enum -> text
ALTER TABLE "PaymentRequest" ALTER COLUMN "plan" TYPE TEXT USING "plan"::text;

-- The enum is no longer used
DROP TYPE "MerchantPlan";

-- AddForeignKey (RESTRICT: a plan in use cannot be deleted)
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_plan_fkey" FOREIGN KEY ("plan") REFERENCES "Plan"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_plan_fkey" FOREIGN KEY ("plan") REFERENCES "Plan"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
