// Shared upgrade plan constants and types

export const PAYMENT_ADDRESS = "0xd76DBc2603FF17c3e01751Dbce38a961121229Bc";

// Single billable plan: Premium — $9.99/mo × 11 months (+ 2 free) = $99.99/year
export const PREMIUM_PLAN = {
  slug:        "premium",
  name:        "Premium",
  priceMonthly: 9.99,
  totalPrice:   99.99,
  billingNote: "11 months + 2 months free",
  eth:         "0.033",     // ~$99.99 at ~$3000/ETH
  projectLimit: 6,
  domainLimit:  6,
  frontendChangesPerDay: 50,
  contractChangesPerDay: 10,
  features: [
    "6 projects (3 extra vs Free)",
    "Connect up to 6 custom domains",
    "50 frontend AI changes / day",
    "10 contract changes / day",
    "Priority support",
  ],
} as const;

export const FREE_PLAN = {
  slug:         "free",
  name:         "Free",
  priceMonthly: 0,
  totalPrice:   0,
  projectLimit: 3,
  domainLimit:  0,
  frontendChangesPerDay: 10,
  contractChangesPerDay: 2,
} as const;

export type PlanKey = "free" | "premium" | "enterprise";

// Shape returned by /api/plans
export interface PlanConfig {
  id:                    string;
  slug:                  string;
  name:                  string;
  priceMonthly:          number;
  totalPrice:            number;
  billingNote:           string | null;
  projectLimit:          number;
  domainLimit:           number;
  frontendChangesPerDay: number;
  contractChangesPerDay: number;
  paymentAddress:        string | null;
  paymentAmountEth:      string | null;
  testnetsEnabled:       boolean;
  features:              string[];
}
