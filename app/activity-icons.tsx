import type { ActivityTransaction } from "./activity-workspace";

export type ActivityIconKind =
  | "income"
  | "refund"
  | "transfer"
  | "investments"
  | "savings"
  | "groceries"
  | "rent"
  | "utilities"
  | "phone"
  | "insurance"
  | "health"
  | "transport"
  | "coffee"
  | "dining"
  | "shopping"
  | "entertainment"
  | "travel"
  | "fitness"
  | "pets"
  | "subscriptions"
  | "fees"
  | "cash"
  | "uncategorized";

type ActivityIconPairing = {
  tint: string;
  stroke: string;
};

type ActivityIconSize = "sm" | "md" | "lg" | "detail";

const SIZE: Record<ActivityIconSize, { box: string; glyph: number }> = {
  sm: { box: "h-8 w-8", glyph: 16 },
  md: { box: "h-[42px] w-[42px]", glyph: 18 },
  lg: { box: "h-14 w-14", glyph: 22 },
  detail: { box: "h-14 w-14", glyph: 24 },
};

/** Color pairings from Paper · 09 Activity Icons */
const PAIRINGS: Record<ActivityIconKind, ActivityIconPairing> = {
  income: { tint: "bg-tint-green", stroke: "text-success" },
  refund: { tint: "bg-tint-green", stroke: "text-success" },
  transfer: { tint: "bg-wash", stroke: "text-muted" },
  investments: { tint: "bg-tint-blue", stroke: "text-accent" },
  savings: { tint: "bg-tint-blue", stroke: "text-accent" },
  groceries: { tint: "bg-tint-blue", stroke: "text-accent" },
  rent: { tint: "bg-tint-amber", stroke: "text-warning" },
  utilities: { tint: "bg-tint-amber", stroke: "text-warning" },
  phone: { tint: "bg-tint-blue", stroke: "text-accent" },
  insurance: { tint: "bg-wash", stroke: "text-muted" },
  health: { tint: "bg-tint-pink", stroke: "text-bubblegum" },
  transport: { tint: "bg-tint-grape", stroke: "text-grape" },
  coffee: { tint: "bg-tint-amber", stroke: "text-warning" },
  dining: { tint: "bg-tint-pink", stroke: "text-bubblegum" },
  shopping: { tint: "bg-tint-teal", stroke: "text-teal" },
  entertainment: { tint: "bg-tint-grape", stroke: "text-grape" },
  travel: { tint: "bg-tint-blue", stroke: "text-accent" },
  fitness: { tint: "bg-tint-lemon", stroke: "text-gold" },
  pets: { tint: "bg-tint-green", stroke: "text-success" },
  subscriptions: { tint: "bg-tint-lemon", stroke: "text-gold" },
  fees: { tint: "bg-wash", stroke: "text-muted" },
  cash: { tint: "bg-tint-green", stroke: "text-success" },
  uncategorized: { tint: "bg-wash", stroke: "text-muted" },
};

const CATEGORY_ICONS: Record<string, ActivityIconKind> = {
  Groceries: "groceries",
  Dining: "dining",
  Rent: "rent",
  Transportation: "transport",
  Subscriptions: "subscriptions",
  Shopping: "shopping",
  Entertainment: "entertainment",
  Uncategorized: "uncategorized",
};

const REFUND_PATTERN =
  /\b(refund|returned|return\b|reversal|chargeback|credit adjustment|reimbursement)\b/i;

const MERCHANT_RULES: { pattern: RegExp; kind: ActivityIconKind }[] = [
  {
    pattern:
      /\b(blue bottle|starbucks|coffee|dunkin|peet'?s?|cafe|café|espresso|philz|ritual)\b/i,
    kind: "coffee",
  },
  {
    pattern:
      /\b(kaiser|walgreens|cvs|pharmacy|medical|health|doctor|dentist|hospital|clinic|therapy|one medical|labcorp|quest diag)\b/i,
    kind: "health",
  },
  {
    pattern: /\b(mint mobile|google fi phone|visible wireless|phone bill)\b/i,
    kind: "phone",
  },
  {
    pattern:
      /\b(pge|pg&e|electric|water bill|utility|comcast|xfinity|verizon|at&t|t-mobile|internet bill)\b/i,
    kind: "utilities",
  },
  {
    pattern: /\b(state farm|geico|progressive|allstate|insurance premium)\b/i,
    kind: "insurance",
  },
  {
    pattern:
      /\b(spotify|netflix|hulu|disney\+|apple music|youtube premium|subscription)\b/i,
    kind: "subscriptions",
  },
  {
    pattern: /\b(whole foods|trader joe|costco|safeway|grocery)\b/i,
    kind: "groceries",
  },
  {
    pattern:
      /\b(lyft|uber\b|bart|muni|metro rail|caltrain|shell|chevron|exxon|mobil|arco|bp\b|gas station|fuel)\b/i,
    kind: "transport",
  },
  {
    pattern:
      /\b(united airlines|delta air|southwest|jetblue|airbnb|marriott|hilton|hotel)\b/i,
    kind: "travel",
  },
  {
    pattern: /\b(equinox|planet fitness|peloton|gym membership|fitness)\b/i,
    kind: "fitness",
  },
  {
    pattern: /\b(etsy|gift shop|hallmark|flower shop|nordstrom|sparkfun)\b/i,
    kind: "shopping",
  },
  {
    pattern: /\b(chewy|petco|petsmart|veterinary|pet supplies)\b/i,
    kind: "pets",
  },
  {
    pattern: /\b(service fee|overdraft fee|atm fee|bank fee|wire fee)\b/i,
    kind: "fees",
  },
  {
    pattern: /\b(atm cash withdrawal|cash withdrawal)\b/i,
    kind: "cash",
  },
  {
    pattern: /\b(vanguard|fidelity|schwab|robinhood|etrade|brokerage)\b/i,
    kind: "investments",
  },
  {
    pattern: /\b(transfer to savings|high-yield savings|savings deposit)\b/i,
    kind: "savings",
  },
];

function matchMerchantIcon(description: string): ActivityIconKind | null {
  for (const rule of MERCHANT_RULES) {
    if (rule.pattern.test(description)) return rule.kind;
  }
  return null;
}

function isRefund(description: string) {
  return REFUND_PATTERN.test(description);
}

export function categoryIconKind(categoryName: string): ActivityIconKind {
  return CATEGORY_ICONS[categoryName] ?? "uncategorized";
}

export function ActivityIconGlyph({
  kind,
  size = 13,
  className = "",
}: {
  kind: ActivityIconKind;
  size?: number;
  className?: string;
}) {
  return <Glyph kind={kind} size={size} className={className} />;
}

export function resolveActivityIcon(
  transaction: Pick<
    ActivityTransaction,
    "description" | "amount" | "isTransfer" | "categoryName"
  >,
): ActivityIconKind {
  if (transaction.isTransfer) return "transfer";

  const inflow = transaction.amount < 0;
  if (inflow && isRefund(transaction.description)) return "refund";

  const merchant = matchMerchantIcon(transaction.description);
  if (merchant) return merchant;

  if (transaction.categoryName) {
    const fromCategory = CATEGORY_ICONS[transaction.categoryName];
    if (fromCategory) return fromCategory;
  }

  if (inflow) return "income";

  return "uncategorized";
}

type ActivityIconProps = {
  kind: ActivityIconKind;
  size?: ActivityIconSize;
  className?: string;
};

export function ActivityIcon({
  kind,
  size = "md",
  className = "",
}: ActivityIconProps) {
  const { box, glyph } = SIZE[size];
  const { tint, stroke } = PAIRINGS[kind];

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-md ${box} ${tint} ${className}`}
      aria-hidden
    >
      <Glyph kind={kind} size={glyph} className={stroke} />
    </div>
  );
}

type GlyphProps = {
  kind: ActivityIconKind;
  size: number;
  className: string;
};

function Glyph({ kind, size, className }: GlyphProps) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    className: `shrink-0 ${className}`,
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (kind) {
    case "income":
      return (
        <svg {...props}>
          <line x1="12" y1="4" x2="12" y2="14" />
          <path d="M7 10l5 5 5-5" />
          <line x1="5" y1="20" x2="19" y2="20" />
        </svg>
      );
    case "refund":
      return (
        <svg {...props}>
          <path d="M9 14L4 9l5-5" />
          <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
        </svg>
      );
    case "transfer":
      return (
        <svg {...props}>
          <path d="M17 4l3 3-3 3" />
          <path d="M20 7H4" />
          <path d="M7 14l-3 3 3 3" />
          <path d="M4 17h16" />
        </svg>
      );
    case "investments":
      return (
        <svg {...props}>
          <path d="M3 17l6-6 4 4 8-8" />
          <path d="M15 7h6v6" />
        </svg>
      );
    case "savings":
      return (
        <svg {...props}>
          <rect x="5" y="8" width="14" height="13" rx="3" />
          <path d="M8 5h8" />
          <path d="M9 13h6" />
        </svg>
      );
    case "groceries":
      return (
        <svg {...props}>
          <circle cx="8.5" cy="19" r="1.5" />
          <circle cx="16.5" cy="19" r="1.5" />
          <path d="M3 4h2l2.4 10h9.8L20 7H6" />
        </svg>
      );
    case "rent":
      return (
        <svg {...props}>
          <path d="M3 11l9-7 9 7" />
          <path d="M6 10v10h12V10" />
          <path d="M10 20v-5h4v5" />
        </svg>
      );
    case "utilities":
      return (
        <svg {...props}>
          <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
        </svg>
      );
    case "phone":
      return (
        <svg {...props}>
          <path d="M4 10a12 12 0 0 1 16 0" />
          <path d="M7.5 14a7 7 0 0 1 9 0" />
          <circle cx="12" cy="18" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "insurance":
      return (
        <svg {...props}>
          <path d="M12 3l7 3v5c0 4.4-2.9 7.4-7 9-4.1-1.6-7-4.6-7-9V6l7-3z" />
        </svg>
      );
    case "health":
      return (
        <svg {...props}>
          <path d="M12 20s-7-4.4-7-9.8A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7 3.2C19 15.6 12 20 12 20z" />
        </svg>
      );
    case "transport":
      return (
        <svg {...props}>
          <path d="M5 17H4a1.5 1.5 0 0 1-1.5-1.5V8.5A1.5 1.5 0 0 1 4 7h9.3c.5 0 .9.2 1.2.6l2.5 2.9 3.4.9c.6.2 1.1.8 1.1 1.4v2.7A1.5 1.5 0 0 1 20 17h-1" />
          <path d="M9 17h6" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
          <path d="M4 4h9M5.5 7V4M11.5 7V4" />
        </svg>
      );
    case "coffee":
      return (
        <svg {...props}>
          <path d="M17 8h1a3 3 0 0 1 0 6h-1" />
          <path d="M3 8h14v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="2" x2="6" y2="4" />
          <line x1="10" y1="2" x2="10" y2="4" />
          <line x1="14" y1="2" x2="14" y2="4" />
        </svg>
      );
    case "dining":
      return (
        <svg {...props}>
          <path d="M6 3v5a3 3 0 0 0 6 0V3" />
          <line x1="9" y1="11" x2="9" y2="21" />
          <path d="M17 3v18" />
          <path d="M17 3c2.5 2.5 2.5 6.5 0 9" />
        </svg>
      );
    case "shopping":
      return (
        <svg {...props}>
          <path d="M6 8h12l-1.2 12H7.2L6 8z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
      );
    case "entertainment":
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="M10 9l5 3-5 3V9z" />
        </svg>
      );
    case "travel":
      return (
        <svg {...props}>
          <path d="M12 2.5c.8 0 1.3.6 1.3 1.4V9l7.2 4.3v2.2l-7.2-2.2v4.4l1.9 1.6v1.4L12 20l-3.2.7v-1.4l1.9-1.6v-4.4l-7.2 2.2v-2.2L10.7 9V3.9c0-.8.5-1.4 1.3-1.4z" />
        </svg>
      );
    case "fitness":
      return (
        <svg {...props}>
          <line x1="7" y1="7" x2="7" y2="17" />
          <line x1="17" y1="7" x2="17" y2="17" />
          <line x1="3.5" y1="10" x2="3.5" y2="14" />
          <line x1="20.5" y1="10" x2="20.5" y2="14" />
          <line x1="7" y1="12" x2="17" y2="12" />
        </svg>
      );
    case "pets":
      return (
        <svg {...props}>
          <circle cx="7.5" cy="8" r="1.6" />
          <circle cx="12" cy="6" r="1.6" />
          <circle cx="16.5" cy="8" r="1.6" />
          <path d="M12 11.5c3 0 5 2.2 5 4.6 0 2.2-2 3.9-5 3.9s-5-1.7-5-3.9c0-2.4 2-4.6 5-4.6z" />
        </svg>
      );
    case "subscriptions":
      return (
        <svg {...props}>
          <path d="M20 12a8 8 0 1 1-2.4-5.7" />
          <path d="M20 3v4h-4" />
        </svg>
      );
    case "fees":
      return (
        <svg {...props}>
          <path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5L10 21l-2-1.5L6 21V3z" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="9" y1="12" x2="13" y2="12" />
        </svg>
      );
    case "cash":
      return (
        <svg {...props}>
          <rect x="3" y="7" width="18" height="10" rx="2" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case "uncategorized":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      );
  }
}

export function ActivityTransactionIcon({
  transaction,
  size = "md",
  className,
}: {
  transaction: Pick<
    ActivityTransaction,
    "description" | "amount" | "isTransfer" | "categoryName"
  >;
  size?: ActivityIconSize;
  className?: string;
}) {
  const kind = resolveActivityIcon(transaction);
  return <ActivityIcon kind={kind} size={size} className={className} />;
}
