export type NavigationTab =
  | 'dashboard'
  | 'channel-readiness'
  | 'seo-images'
  | 'categories'
  | 'fix-export'
  | 'audit-history'
  | 'quick-guide'
  | 'settings'
  | 'catalog-health';

export type AuditStage = 'empty' | 'scanning' | 'results';

export interface AttributeScore {
  name: string;
  score: number | null;
  status?: 'assessed' | 'not_assessed';
  assessedProducts?: number;
  unavailableProducts?: number;
  source?: string;
  color: 'secondary' | 'tertiary' | 'error' | 'primary';
}

export interface CatalogIssue {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  classification?: 'eligibility_blocker' | 'data_warning' | 'growth_opportunity';
  status?: 'observed' | 'heuristic' | 'needs_verification';
  confidence?: 'high' | 'medium' | 'low';
  source?: string;
  title: string;
  /** The exact rule applied, including thresholds. */
  rule?: string;
  description: string;
  count: number;
  category: 'gtin' | 'alt-text' | 'description' | 'category' | 'sku';
  affectedItems: AffectedItem[];
}

export interface AffectedItem {
  sku: string;
  productTitle: string;
  imageUrl?: string;
  productUrl?: string | null;
  variant?: string;
  gtinFound?: boolean;
  dataSourceChecked?: string;
  verificationStatus?: string;
  issueDetail: string;
  suggestedFix: string;
  observed?: string;
  expected?: string;
  confidence?: 'high' | 'medium' | 'low';
  source?: string;
  resolved?: boolean;
}

export interface FlaggedProduct {
  title: string;
  sku: string;
  issue: string;
  imageUrl: string;
  altText: string;
  fullDescription: string;
  gtin: string;
  category: string;
}

export interface ActionPlanStep {
  stepNumber: number;
  title: string;
  description: string;
  estimatedLift: string;
  products?: number | null;
  unit?: string | null;
  liftColor: 'error' | 'secondary' | 'primary';
}

export interface AuditRecord {
  id: string;
  date: string;
  time: string;
  store: string;
  score: number | null;
  status: 'Completed' | 'In Progress' | 'Failed';
}

export interface StoreAuditData {
  storeDomain: string;
  healthScore: number;
  scoreStatus: 'Needs work' | 'Fair' | 'Excellent';
  productsCount: number;
  detectedIssuesCount: number;
  highPriorityCount: number;
  /** Bucket split that reconciles with the visible findings list. */
  findingSummary?: {
    confirmedIssues: number;
    verificationItems: number;
    opportunities: number;
    totalFindings: number;
    highPriorityConfirmed: number;
  };
  attributeBreakdown: AttributeScore[];
  issues: CatalogIssue[];
  flaggedProducts: FlaggedProduct[];
  actionPlan: ActionPlanStep[];
  limitReached?: boolean;
  scanLimit?: number;
  scanned?: number;
  coverage?: { source: string; authoritative: boolean; included: string[]; excluded: string[] };
  scoring?: {
    dimensions: string[];
    weights: Record<string, number>;
    note: string;
    formula?: { perProduct: string; overall: string; unassessed: string };
  } | null;
}
