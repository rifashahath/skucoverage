export type NavigationTab =
  | 'dashboard'
  | 'barcodes'
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
  score: number;
  color: 'secondary' | 'tertiary' | 'error' | 'primary';
}

export interface CatalogIssue {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  classification?: 'eligibility_blocker' | 'data_warning' | 'growth_opportunity';
  title: string;
  description: string;
  count: number;
  category: 'gtin' | 'alt-text' | 'description' | 'category' | 'sku';
  affectedItems: AffectedItem[];
}

export interface AffectedItem {
  sku: string;
  productTitle: string;
  imageUrl?: string;
  issueDetail: string;
  suggestedFix: string;
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
  attributeBreakdown: AttributeScore[];
  issues: CatalogIssue[];
  flaggedProducts: FlaggedProduct[];
  actionPlan: ActionPlanStep[];
  limitReached?: boolean;
  scanLimit?: number;
  scanned?: number;
  coverage?: { source: string; authoritative: boolean; included: string[]; excluded: string[] };
}
