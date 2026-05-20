export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceInCents: number;
  priceDisplay: string;
  perCreditCents: number;
  popular?: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "credits-100",
    name: "100 Creditos",
    credits: 100,
    priceInCents: 2900,
    priceDisplay: "R$ 29",
    perCreditCents: 29,
  },
  {
    id: "credits-300",
    name: "300 Creditos",
    credits: 300,
    priceInCents: 6900,
    priceDisplay: "R$ 69",
    perCreditCents: 23,
    popular: true,
  },
  {
    id: "credits-600",
    name: "600 Creditos",
    credits: 600,
    priceInCents: 11900,
    priceDisplay: "R$ 119",
    perCreditCents: 20,
  },
  {
    id: "credits-1200",
    name: "1200 Creditos",
    credits: 1200,
    priceInCents: 19900,
    priceDisplay: "R$ 199",
    perCreditCents: 17,
  },
];
