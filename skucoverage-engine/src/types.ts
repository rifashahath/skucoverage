export type MessageType =
	| "audit_full_catalog"
	| "category_recommend"
	| "seo_audit"
	| "weekly_diff"
	| "ai_readiness"

export type ResultMessageType =
	| "audit_result"
	| "category_recommendations"
	| "seo_audit_result"
	| "weekly_diff_result"
	| "ai_readiness_result"

export type Priority = "high" | "medium" | "low"
export type IssueClass = "eligibility_blocker" | "data_warning" | "growth_opportunity"
export type Confidence = "high" | "medium" | "low"
export type FindingStatus = "observed" | "heuristic" | "needs_verification"
export type EvidenceSource = "public_storefront" | "merchant_center" | "shopify_admin"

export interface Product {
	id: string
	title?: string | null
	description?: string | null
	gtin?: string | number | null
	category?: string | null
	currentCategory?: string | null
	variants?: number | null
	variantTitles?: Array<string | null> | null
	variantsAsProducts?: boolean | null
	images?: number | null
	imageAltText?: boolean | null
	brand?: string | null
	sku?: string | null
	price?: number | string | null
	availability?: string | null
	identifierExists?: "yes" | "no" | "unknown" | null
	handle?: string | null
}

export interface EngineRequest {
	messageType: MessageType
	requestId?: string
	payload: {
		storeId?: string
		products?: Product[]
		currentAudit?: any
		previousAudit?: any
	}
}

export interface EngineResponse {
	messageType: ResultMessageType | "engine_error"
	requestId: string
	payload: Record<string, unknown>
}

export interface Issue {
	type: string
	classification: IssueClass
	/** Display label describing the real rule, never a stronger claim. */
	title: string
	/** The exact rule applied, including thresholds. */
	rule: string
	count: number
	affectedProducts: string[]
	priority: Priority
	impact: string
	percentOfCatalog: number
	status: FindingStatus
	confidence: Confidence
	source: EvidenceSource
	evidence: Array<{ productId: string; observed: string; expected: string }>
}

export interface FindingSummary {
	/** Sum of counts for observed findings: problems proven by the snapshot. */
	confirmedIssues: number
	/** Sum of counts the source cannot confirm; not evidence of a problem. */
	verificationItems: number
	/** Sum of counts for heuristic quality signals; not definite errors. */
	opportunities: number
	/** confirmedIssues + verificationItems + opportunities. */
	totalFindings: number
	/** Observed, high-priority, high-confidence findings only. */
	highPriorityConfirmed: number
}
