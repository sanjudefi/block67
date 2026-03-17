// Shared upgrade plan constants — imported by route and UI components

export const PLANS = {
  monthly: { eth: "0.005", usd: 10,  days: 30,  label: "Monthly" },
  yearly:  { eth: "0.04",  usd: 100, days: 365, label: "Yearly"  },
} as const;
export type PlanKey = keyof typeof PLANS;

export const PAYMENT_ADDRESS = "0xd76DBc2603FF17c3e01751Dbce38a961121229Bc";
