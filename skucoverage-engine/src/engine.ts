/**
 * SKUcoverage Audit Engine — pure logic.
 * No HTTP calls. No database access. Deterministic: same input => same output.
 *
 * Entry point: runEngine(request) -> response
 */
import type {
	EngineRequest,
	EngineResponse,
	FindingSummary,
	Issue,
	IssueClass,
	Priority,
	Confidence,
	FindingStatus,
	EvidenceSource,
	Product,
} from "./types"
import { GENERIC_CATEGORIES, TAXONOMY } from "./taxonomy"

/* ------------------------------------------------------------------ */
/* constants                                                           */
/* ------------------------------------------------------------------ */

export const IMPACT = {
	gtin: "Identifier quality for feeds; eligibility depends on product type and Merchant Center diagnostics",
	title: "Search visibility + click-through rate (CTR)",
	description: "Conversion rate + SEO ranking",
	category: "Product discoverability + personalization",
	images: "Trust + conversion (social proof)",
	variants: "Inventory accuracy + AI agent compatibility",
	brand: "AI agent product matching + brand searches",
} as const

const ATTRIBUTE_KEYWORDS = [
	// material
	"cotton", "linen", "wool", "silk", "leather", "polyester", "denim", "steel",
	"wood", "ceramic", "glass", "plastic", "organic", "fabric", "material",
	// size / fit
	"size", "sizes", "xs", "small", "medium", "large", "xl", "xxl", "fit",
	"length", "width", "height", "cm", "mm", "inch", "ml", "oz", "gram", "kg",
	// color
	"color", "colour", "black", "white", "blue", "red", "green", "grey", "gray",
	"beige", "pink", "yellow", "brown", "navy",
	// use case / care
	"perfect for", "ideal for", "designed for", "use", "everyday", "casual",
	"summer", "winter", "machine washable", "washable", "waterproof",
	"breathable", "unisex", "men", "women", "kids", "gift",
]

const PRODUCT_TYPE_WORDS = TAXONOMY.map(([kw]) => kw)

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

// Max ids listed per issue (keeps payload small; `count` is always exact).
const MAX_AFFECTED = 200

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const text = (v: unknown): string =>
	typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim()

function round(n: number | null, dp = 0): number | null {
	if (n === null) return null
	const f = 10 ** dp
	return Math.round(n * f) / f
}

const pct = (part: number, total: number): number =>
	total === 0 ? 0 : Math.round((part / total) * 1000) / 10

const avg = (nums: Array<number | null>): number | null => {
	const assessed = nums.filter((n): n is number => n !== null)
	return assessed.length === 0 ? null : assessed.reduce((a, b) => a + b, 0) / assessed.length
}

const num = (v: unknown): number => {
	const n = typeof v === "number" ? v : Number(v)
	return Number.isFinite(n) ? n : 0
}

export const hasProductType = (title: string): boolean => {
	const t = title.toLowerCase()
	return PRODUCT_TYPE_WORDS.some((w) => t.includes(w))
}

export const mentionsAttributes = (description: string): boolean => {
	const d = description.toLowerCase()
	return ATTRIBUTE_KEYWORDS.some((w) => d.includes(w))
}

/* ------------------------------------------------------------------ */
/* per-field checks                                                    */
/* ------------------------------------------------------------------ */

export type TitleCheck = {
	score: number
	length: number
	state: "missing" | "too_short" | "incomplete" | "too_long" | "complete"
}

export function checkTitle(product: Product): TitleCheck {
	const title = text(product.title)
	const length = title.length
	// Scores are monotonic: the further a title is from usable, the lower the
	// score. A 39-character title must never score below a 1000-character one,
	// and "present but weak" must never tie with "absent".
	if (length === 0) return { score: 0, length, state: "missing" }
	if (length < 20) return { score: 25, length, state: "too_short" }
	if (length > 150) return { score: 50, length, state: "too_long" }
	if (length < 40) return { score: 60, length, state: "incomplete" }
	return { score: 100, length, state: "complete" }
}

export type DescriptionCheck = {
	score: number
	length: number
	state: "missing" | "incomplete" | "complete"
}

export function checkDescription(product: Product): DescriptionCheck {
	const description = text(product.description)
	const length = description.length
	if (length === 0) return { score: 0, length, state: "missing" }
	if (length < 100 || !mentionsAttributes(description))
		return { score: 0, length, state: "incomplete" }
	return { score: 100, length, state: "complete" }
}

export type GtinCheck = {
	score: number | null
	state: "missing_unverified" | "invalid" | "exempt" | "present"
}

export function checkGtin(product: Product): GtinCheck {
	const gtin = text(product.gtin)
	if (gtin === "") {
		// Handmade / one-of-a-kind products can declare no manufacturer identifier.
		if (product.identifierExists === "no") return { score: 100, state: "exempt" }
		return { score: null, state: "missing_unverified" }
	}
	// GTIN-8, UPC-A (12), EAN-13 and GTIN-14 are the only valid GTIN lengths.
	// 9, 10 and 11 digit numbers are not GTINs even though they are numeric.
	if (!/^\d+$/.test(gtin)) return { score: 0, state: "invalid" }
	if (!VALID_GTIN_LENGTHS.has(gtin.length))
		return { score: 0, state: "invalid" }
	if (!hasValidGtinCheckDigit(gtin)) return { score: 0, state: "invalid" }
	return { score: 100, state: "present" }
}

export const VALID_GTIN_LENGTHS = new Set([8, 12, 13, 14])

/**
 * GS1 Modulo-10 check digit verification.
 *
 * Digits left of the check digit are weighted 3 and 1 alternately starting
 * from the right, summed, and the check digit must round the total up to the
 * next multiple of ten.
 *
 * IMPORTANT: a valid check digit proves only that the number is WELL FORMED.
 * It does NOT prove the merchant is licensed to use it. SKUcoverage therefore
 * never generates, suggests, completes or assigns GTIN values anywhere in the
 * product. Detection only.
 */
export function hasValidGtinCheckDigit(gtin: string): boolean {
	if (!/^\d+$/.test(gtin) || !VALID_GTIN_LENGTHS.has(gtin.length)) return false
	const digits = gtin.split("").map((d) => Number(d))
	const checkDigit = digits[digits.length - 1]
	const body = digits.slice(0, -1)
	let sum = 0
	let weight = 3
	for (let i = body.length - 1; i >= 0; i -= 1) {
		sum += body[i] * weight
		weight = weight === 3 ? 1 : 3
	}
	return (10 - (sum % 10)) % 10 === checkDigit
}

export type CategoryCheck = {
	score: number
	state: "missing" | "generic" | "shallow" | "duplicate_levels" | "present"
	depth: number
}

export function checkCategory(product: Product): CategoryCheck {
	const raw = text(product.category ?? product.currentCategory)
	if (raw === "") return { score: 0, state: "missing", depth: 0 }
	const levels = raw
		.split(">")
		.map((l) => l.trim().toLowerCase())
		.filter(Boolean)
	const depth = levels.length
	if (new Set(levels).size !== depth)
		return { score: 50, state: "duplicate_levels", depth }
	// A bare Shopify product_type is a single level and never contains ">".
	// Treating every such store as "generic" produced a false positive on the
	// entire catalog, so depth-1 values are scored separately from genuinely
	// meaningless labels such as "misc" or "other".
	if (GENERIC_CATEGORIES.has(levels[levels.length - 1]))
		return { score: 25, state: "generic", depth }
	if (depth < 2) return { score: 65, state: "shallow", depth }
	return { score: 100, state: "present", depth }
}

export type ImageCheck = {
	score: number
	count: number
	state: "none" | "too_few" | "good"
}

export function checkImages(product: Product): ImageCheck {
	const count = Math.max(0, Math.floor(num(product.images)))
	if (count === 0) return { score: 0, count, state: "none" }
	if (count < 3) return { score: 50, count, state: "too_few" }
	return { score: 100, count, state: "good" }
}

export type VariantCheck = {
	score: number
	count: number
	state: "variants_as_products" | "duplicate_variant_titles" | "no_variants" | "good"
}

export function checkVariants(product: Product): VariantCheck {
	const titles = (product.variantTitles ?? [])
		.map((t) => text(t).toLowerCase())
		.filter(Boolean)
	const count = Math.max(
		Math.floor(num(product.variants)),
		product.variantTitles ? product.variantTitles.length : 0,
	)
	if (product.variantsAsProducts === true)
		return { score: 0, count, state: "variants_as_products" }
	if (titles.length > 1 && new Set(titles).size !== titles.length)
		return { score: 0, count, state: "duplicate_variant_titles" }
	if (count < 1) return { score: 100, count, state: "no_variants" }
	return { score: 100, count, state: "good" }
}

export type ProductScore = {
	id: string
	title: TitleCheck
	description: DescriptionCheck
	gtin: GtinCheck
	category: CategoryCheck
	images: ImageCheck
	variants: VariantCheck
	hasBrand: boolean
	hasSku: boolean
	productScore: number
	productTitle: string
	complete: boolean
}

/**
 * Relative weight of each attribute in the product score.
 *
 * These are a deliberate product judgement, not a measured constant. They are
 * documented here so the number a merchant sees can be explained and audited.
 * Weights sum to 100.
 */
export const WEIGHTS = {
	title: 20,
	description: 10,
	gtin: 30,
	category: 15,
	images: 20,
	variants: 5,
} as const

function weighted(pairs: Array<[number | null, number]>): number {
	pairs = pairs.filter(([score]) => score !== null)
	const totalWeight = pairs.reduce((acc, [, w]) => acc + w, 0)
	if (totalWeight === 0) return 0
	return pairs.reduce((acc, [score, w]) => acc + (score ?? 0) * w, 0) / totalWeight
}

export function scoreProduct(product: Product): ProductScore {
	const title = checkTitle(product)
	const description = checkDescription(product)
	const gtin = checkGtin(product)
	const category = checkCategory(product)
	const images = checkImages(product)
	const variants = checkVariants(product)
	// Weighted rather than a flat mean. Feed eligibility is dominated by
	// identifier, title and image presence; variant shape is a quality signal,
	// not a blocker, so it no longer carries the same weight as a missing GTIN.
	const productScore = round(
		weighted([
			[title.score, WEIGHTS.title],
			[description.score, WEIGHTS.description],
			[gtin.score, WEIGHTS.gtin],
			[category.score, WEIGHTS.category],
			[images.score, WEIGHTS.images],
			[variants.score, WEIGHTS.variants],
		]),
	)
	return {
		id: text(product.id),
		title,
		description,
		gtin,
		category,
		images,
		variants,
		hasBrand: text(product.brand) !== "",
		hasSku: text(product.sku) !== "",
		productScore: productScore ?? 0,
		productTitle: text(product.title),
		complete:
			title.score === 100 &&
			description.score === 100 &&
			gtin.score === 100 &&
			category.score === 100 &&
			images.score === 100 &&
			variants.score === 100,
	}
}


/**
 * Split findings into the three buckets the report displays, so the headline
 * total always reconciles with the visible list:
 * confirmed (observed) + needs verification + opportunities (heuristic).
 */
export function summarizeFindings(issues: Issue[]): FindingSummary {
	const sum = (list: Issue[]) => list.reduce((acc, i) => acc + i.count, 0)
	const observed = issues.filter((i) => i.status === "observed")
	const confirmedIssues = sum(observed)
	const verificationItems = sum(issues.filter((i) => i.status === "needs_verification"))
	const opportunities = sum(issues.filter((i) => i.status === "heuristic"))
	return {
		confirmedIssues,
		verificationItems,
		opportunities,
		totalFindings: confirmedIssues + verificationItems + opportunities,
		highPriorityConfirmed: sum(
			observed.filter((i) => i.priority === "high" && i.confidence === "high"),
		),
	}
}

/** Static description of the scoring method, shipped with every audit result. */
export function buildScoringDescription() {
	return {
		kind: "weighted_quality_score",
		dimensions: ["titles", "descriptions", "gtins", "categories", "images", "variants"],
		weights: WEIGHTS,
		note: "This is a weighted quality score, not a pass rate. Scores include only fields the source can assess; unavailable fields are excluded, not treated as zero or 100.",
		formula: {
			perProduct: "Per product: sum(field score x field weight) / sum(weights of the fields assessed for that product).",
			overall: "The overall score is the average of the per-product scores across reviewed products.",
			unassessed: "A field that cannot be assessed for a product is dropped and the remaining weights are rescaled to 100%, so missing data never counts as 0 or 100.",
		},
	}
}

/* ------------------------------------------------------------------ */
/* audit_full_catalog                                                  */
/* ------------------------------------------------------------------ */

function issueEvidence(type: string, score: ProductScore): { observed: string; expected: string } {
	const observedByType: Record<string, string> = {
		missing_title: "Title is empty in the public storefront snapshot",
		gtin_status_unverified: "No barcode is exposed on the first public storefront variant",
		invalid_gtin: "The public barcode fails a supported-length or Modulo-10 format check",
		no_images: "0 product images in the public storefront snapshot",
		title_too_short: `Title length: ${score.title.length} characters`,
		incomplete_title: `Title length: ${score.title.length} characters`,
		title_too_long: `Title length: ${score.title.length} characters`,
		missing_description: "Description is empty in the public storefront snapshot",
		incomplete_description: `Description length: ${score.description.length} characters`,
		variants_as_products: "Input marks variants as separate products",
		duplicate_variant_titles: `${score.variants.count} variants include duplicate titles`,
		missing_brand: "Vendor/brand is empty in the public storefront snapshot",
		missing_sku: "First public storefront variant has no SKU",
		missing_category: "Storefront product_type is empty",
		shallow_product_type: `Storefront product_type is a single level (depth ${score.category.depth})`,
		generic_category: `Storefront product_type matched a generic label (depth ${score.category.depth})`,
		duplicate_category_levels: `Storefront product_type repeats a level (depth ${score.category.depth})`,
		too_few_images: `${score.images.count} product image${score.images.count === 1 ? "" : "s"} in the public storefront snapshot`,
	}
	// Each expectation states the actual rule the engine applies, including
	// thresholds, so a merchant can verify a finding against their own data.
	const expectedByType: Record<string, string> = {
		missing_title: "A non-empty title; a product cannot be sold or indexed without one",
		gtin_status_unverified: "Verify in Shopify Admin or Merchant Center whether a manufacturer identifier exists and is required",
		invalid_gtin: "A numeric barcode of 8, 12, 13 or 14 digits with a valid Modulo-10 check digit",
		no_images: "At least one product image; 3 or more score full credit",
		title_too_short: "Titles of 40-150 characters score full credit; under 20 is a heuristic quality signal",
		incomplete_title: "Titles of 40-150 characters score full credit; 20-39 is a heuristic signal that useful detail may be missing",
		title_too_long: "Titles of 40-150 characters score full credit; longer titles may be truncated",
		missing_description: "A description of 100+ characters mentioning material, size, color or use-case attributes",
		incomplete_description: "100+ characters with material, size, color or use-case attributes score full credit",
		variants_as_products: "One product with variant options instead of one product per variant",
		duplicate_variant_titles: "A unique title per variant",
		missing_brand: "A vendor/brand value in the storefront data",
		missing_sku: "A SKU on the public variant",
		missing_category: "A storefront product_type value",
		shallow_product_type: "A product_type with 2 or more levels, e.g. 'Clothing > Shirts'",
		generic_category: "A specific product_type instead of a generic label such as 'misc' or 'other'",
		duplicate_category_levels: "A product_type without repeated levels",
		too_few_images: "3 or more images score full credit; this product has fewer than 3",
	}
	return {
		observed: observedByType[type] ?? (score.productTitle || "Field value observed in public storefront snapshot"),
		expected: expectedByType[type] ?? "Review this observation against the rule description before changing product data",
	}
}

type IssueSpec = {
	type: string
	classification: IssueClass
	priority: Priority
	impact: string
	/** Display label. Must describe the real rule, not a stronger claim. */
	title: string
	/** The exact rule applied, including thresholds, shown next to the finding. */
	rule: string
	match: (s: ProductScore) => boolean
	status?: FindingStatus
	confidence?: Confidence
	source?: EvidenceSource
	evidence?: (s: ProductScore) => { observed: string; expected: string }
	recommendation: (count: number, percent: number) => string
}

const ISSUE_SPECS: IssueSpec[] = [
	{
		type: "missing_title",
		classification: "eligibility_blocker",
		priority: "high",
		impact: IMPACT.title,
		title: "Missing title",
		rule: "Title is empty in the public storefront snapshot.",
		match: (s) => s.title.state === "missing",
		recommendation: (c, p) =>
			`Add a title to ${c} product${c === 1 ? "" : "s"} (${p}% of catalog) - they cannot be sold or indexed without one`,
	},
	{
		type: "gtin_status_unverified",
		classification: "data_warning",
		priority: "low",
		impact: "No barcode was exposed by the public storefront; whether one is required cannot be determined here",
		title: "GTIN status unverified",
		rule: "No barcode is exposed on the public storefront variant. Whether a GTIN exists or is required cannot be determined from this source; confirm in Shopify Admin or Merchant Center.",
		match: (s) => s.gtin.state === "missing_unverified",
		status: "needs_verification",
		confidence: "high",
		recommendation: (c, p) =>
			`Verify identifier requirements for ${c} product${c === 1 ? "" : "s"} (${p}% of this storefront snapshot). A missing public barcode is not itself an error.`,
	},
	{
		type: "invalid_gtin",
		classification: "data_warning",
		priority: "high",
		impact: IMPACT.gtin,
		title: "Malformed GTIN value",
		rule: "Barcode fails the supported-length (8, 12, 13 or 14 digits) or Modulo-10 check-digit format check.",
		match: (s) => s.gtin.state === "invalid",
		status: "observed",
		confidence: "high",
		recommendation: (c) =>
			`Review ${c} malformed GTIN value${c === 1 ? "" : "s"} - the format or Modulo-10 check digit is invalid. A passing check digit proves format only, not GS1 ownership; verify it with the supplier or Verified by GS1.`,
	},
	{
		type: "no_images",
		classification: "eligibility_blocker",
		priority: "high",
		impact: IMPACT.images,
		title: "No product images",
		rule: "0 images in the public storefront snapshot.",
		match: (s) => s.images.state === "none",
		recommendation: (c, p) =>
			`Add images to ${c} product${c === 1 ? "" : "s"} with zero photos (${p}% of catalog) - may block listing eligibility and reduces buyer trust`,
	},
	{
		type: "title_too_short",
		classification: "data_warning",
		priority: "high",
		impact: IMPACT.title,
		title: "Title may be too short",
		rule: "Title has fewer than 20 characters. Heuristic quality signal, not a disapproval rule.",
		match: (s) => s.title.state === "too_short",
		status: "heuristic",
		confidence: "medium",
		recommendation: (c) =>
			`Review ${c} title${c === 1 ? "" : "s"} under 20 characters - this is a quality heuristic, not a universal disapproval rule`,
	},
	{
		type: "incomplete_title",
		classification: "growth_opportunity",
		priority: "medium",
		impact: IMPACT.title,
		title: "Title may be missing useful detail",
		rule: "Title is 20-39 characters; 40 or more score full credit. Heuristic signal, not a definite error.",
		match: (s) => s.title.state === "incomplete",
		status: "heuristic",
		confidence: "medium",
		recommendation: (c) =>
			`Review ${c} product title${c === 1 ? "" : "s"} for product type and useful attributes; length is a quality heuristic`,
	},
	{
		type: "title_too_long",
		classification: "growth_opportunity",
		priority: "low",
		impact: IMPACT.title,
		title: "Title may be truncated",
		rule: "Title exceeds 150 characters and may be truncated in some surfaces. Heuristic signal.",
		match: (s) => s.title.state === "too_long",
		status: "heuristic",
		confidence: "medium",
		recommendation: (c) =>
			`Shorten ${c} very long title${c === 1 ? "" : "s"} - they get truncated in search results`,
	},
	{
		type: "missing_description",
		classification: "data_warning",
		priority: "medium",
		impact: IMPACT.description,
		title: "Missing description",
		rule: "Description is empty in the public storefront snapshot.",
		match: (s) => s.description.state === "missing",
		recommendation: (c, p) =>
			`Write descriptions for ${c} product${c === 1 ? "" : "s"} with none (${p}% of catalog)`,
	},
	{
		type: "incomplete_description",
		classification: "growth_opportunity",
		priority: "medium",
		impact: IMPACT.description,
		title: "Description may be missing useful detail",
		rule: "Description is under 100 characters or mentions no material, size, color or use-case attribute. Heuristic signal.",
		match: (s) => s.description.state === "incomplete",
		status: "heuristic",
		confidence: "medium",
		recommendation: (c) =>
			`Review ${c} product description${c === 1 ? "" : "s"} for useful material, size, color and use-case details; length is a quality heuristic`,
	},
	{
		type: "variants_as_products",
		classification: "data_warning",
		priority: "medium",
		impact: IMPACT.variants,
		title: "Variants published as separate products",
		rule: "The source marks these as variants listed as separate products.",
		match: (s) => s.variants.state === "variants_as_products",
		recommendation: (c) =>
			`Merge ${c} product${c === 1 ? "" : "s"} that duplicate colors/sizes into variant options`,
	},
	{
		type: "duplicate_variant_titles",
		classification: "data_warning",
		priority: "medium",
		impact: IMPACT.variants,
		title: "Duplicate variant titles",
		rule: "Variants of one product share identical titles.",
		match: (s) => s.variants.state === "duplicate_variant_titles",
		recommendation: (c) =>
			`Give unique titles/SKUs to variants on ${c} product${c === 1 ? "" : "s"}`,
	},
	{
		type: "missing_brand",
		classification: "growth_opportunity",
		priority: "medium",
		impact: IMPACT.brand,
		title: "Brand/vendor not set",
		rule: "Vendor/brand is empty in the public storefront snapshot. Heuristic signal for AI-agent matching.",
		match: (s) => !s.hasBrand,
		status: "heuristic",
		confidence: "medium",
		recommendation: (c) =>
			`Set a brand/vendor value on ${c} product${c === 1 ? "" : "s"} so AI shopping agents can match them`,
	},
	{
		type: "missing_sku",
		classification: "data_warning",
		priority: "low",
		impact: IMPACT.variants,
		title: "SKU not set",
		rule: "The first public storefront variant has no SKU.",
		match: (s) => !s.hasSku,
		recommendation: (c) => `Assign SKUs to ${c} product${c === 1 ? "" : "s"}`,
	},
	{
		type: "missing_category",
		classification: "growth_opportunity",
		priority: "low",
		impact: IMPACT.category,
		title: "Product type not set",
		rule: "Storefront product_type is empty.",
		match: (s) => s.category.state === "missing",
		status: "heuristic",
		confidence: "medium",
		recommendation: (c) =>
			`Assign Shopify Standard Product Taxonomy categories to ${c} product${c === 1 ? "" : "s"}`,
	},
	{
		type: "shallow_product_type",
		classification: "growth_opportunity",
		priority: "low",
		impact: IMPACT.category,
		title: "Product type is a single level",
		rule: "Storefront product_type has one level only (e.g. 'Shirts'); paths with 2 or more levels score full credit. Heuristic signal.",
		match: (s) => s.category.state === "shallow",
		status: "heuristic",
		confidence: "medium",
		recommendation: (c) =>
			`Deepen the storefront product_type on ${c} product${c === 1 ? "" : "s"} to a multi-level taxonomy path`,
	},
	{
		type: "generic_category",
		classification: "growth_opportunity",
		priority: "low",
		impact: IMPACT.category,
		title: "Product type may be too broad",
		rule: "Storefront product_type matches a generic label such as 'misc' or 'other'. Heuristic signal.",
		match: (s) => s.category.state === "generic",
		status: "heuristic",
		confidence: "medium",
		recommendation: (c) =>
			`Replace broad categories on ${c} product${c === 1 ? "" : "s"} with a full taxonomy path`,
	},
	{
		type: "duplicate_category_levels",
		classification: "data_warning",
		priority: "low",
		impact: IMPACT.category,
		title: "Product type repeats a level",
		rule: "Storefront product_type repeats the same level (e.g. 'Clothing > Clothing').",
		match: (s) => s.category.state === "duplicate_levels",
		recommendation: (c) =>
			`Clean up repeated category levels on ${c} product${c === 1 ? "" : "s"}`,
	},
	{
		type: "too_few_images",
		classification: "growth_opportunity",
		priority: "low",
		impact: IMPACT.images,
		title: "Fewer than 3 images",
		rule: "Product has 1-2 images in the public storefront snapshot; 3 or more score full credit. Heuristic quality signal.",
		match: (s) => s.images.state === "too_few",
		status: "heuristic",
		confidence: "medium",
		recommendation: (c) =>
			`Add 2-3 more images to ${c} product${c === 1 ? "" : "s"} that only have 1-2`,
	},
]

export function auditFullCatalog(products: Product[]) {
	const total = products.length
	if (total === 0) {
		return {
			audit: {
				totalProducts: 0,
				score: 0,
				scoreBreakdown: {
					titles: 0,
					descriptions: 0,
					gtins: 0,
					categories: 0,
					images: 0,
					variants: 0,
				},
				issues: [] as Issue[],
				issueGroups: { eligibilityBlockers: [], dataWarnings: [], growthOpportunities: [] },
				findingSummary: { confirmedIssues: 0, verificationItems: 0, opportunities: 0, totalFindings: 0, highPriorityConfirmed: 0 } as FindingSummary,
				scoring: buildScoringDescription(),
				coverage: { assessedProducts: 0, source: "provided_product_snapshot", authoritative: false, included: ["product fields supplied to the engine"], excluded: ["Merchant Center diagnostics", "GS1 company assignment verification", "unpublished or inaccessible products"] },
				recommendations: ["No products to audit - connect a store with products"],
				nextSteps: ["Import products, then re-run the audit"],
			},
		}
	}

	const scores = products.map(scoreProduct)

	const issues: Issue[] = []
	const recommendations: Array<{ priority: Priority; count: number; text: string }> = []

	for (const spec of ISSUE_SPECS) {
		const affected = scores.filter(spec.match).map((s) => s.id)
		if (affected.length === 0) continue
		const percent = pct(affected.length, total)
		const affectedScores = scores.filter(spec.match)
		issues.push({
			type: spec.type,
			classification: spec.classification,
			title: spec.title,
			rule: spec.rule,
			count: affected.length,
			affectedProducts: affected.slice(0, MAX_AFFECTED),
			priority: spec.priority,
			impact: spec.impact,
			percentOfCatalog: percent,
			status: spec.status ?? (spec.classification === "growth_opportunity" ? "heuristic" : "observed"),
			confidence: spec.confidence ?? (spec.classification === "growth_opportunity" ? "medium" : "high"),
			source: spec.source ?? "public_storefront",
			evidence: affectedScores.slice(0, MAX_AFFECTED).map((score) => {
				const evidence = spec.evidence?.(score) ?? issueEvidence(spec.type, score)
				return { productId: score.id, ...evidence }
			}),
		})
		recommendations.push({
			priority: spec.priority,
			count: affected.length,
			text: spec.recommendation(affected.length, percent),
		})
	}

	issues.sort(
		(a, b) =>
			PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.count - a.count,
	)
	recommendations.sort(
		(a, b) =>
			PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.count - a.count,
	)

	const dimensionScores = {
		titles: scores.map((s) => s.title.score),
		descriptions: scores.map((s) => s.description.score),
		gtins: scores.map((s) => s.gtin.score),
		categories: scores.map((s) => s.category.score),
		images: scores.map((s) => s.images.score),
		variants: scores.map((s) => s.variants.score),
	}
	const scoreBreakdown = Object.fromEntries(Object.entries(dimensionScores).map(([name, values]) => [name, round(avg(values))]))
	const assessmentBreakdown = Object.fromEntries(Object.entries(dimensionScores).map(([name, values]) => [name, {
		status: values.some((value) => value !== null) ? "assessed" : "not_assessed",
		assessedProducts: values.filter((value) => value !== null).length,
		unavailableProducts: values.filter((value) => value === null).length,
		source: "public_storefront",
	}]))

	const score = round(avg(scores.map((s) => s.productScore))) ?? 0
	const top = issues.slice(0, 3)

	return {
		audit: {
			totalProducts: total,
			score,
			scoreBreakdown,
			assessmentBreakdown,
			issues,
			issueGroups: {
				eligibilityBlockers: issues.filter((issue) => issue.classification === "eligibility_blocker"),
				dataWarnings: issues.filter((issue) => issue.classification === "data_warning"),
				growthOpportunities: issues.filter((issue) => issue.classification === "growth_opportunity"),
			},
			scoring: buildScoringDescription(),
			findingSummary: summarizeFindings(issues),
			coverage: { assessedProducts: total, source: "provided_product_snapshot", authoritative: false, included: ["product fields supplied to the engine"], excluded: ["Merchant Center diagnostics", "GS1 company assignment verification", "unpublished or inaccessible products"] },
			recommendations: recommendations.slice(0, 5).map((r) => r.text),
			nextSteps: [
				top[0]
					? `Priority 1: Fix ${top[0].type.replace(/_/g, " ")} on ${top[0].count} product${top[0].count === 1 ? "" : "s"} (${top[0].priority} priority)`
					: "Priority 1: Catalog looks clean - keep monitoring",
				top[1]
					? `Priority 2: Batch-fix ${top[1].type.replace(/_/g, " ")} by category - faster than one-by-one`
					: "Priority 2: Enrich descriptions and images for conversion lift",
				"Monitor: Re-audit in 1 week to track score movement",
			],
		},
	}
}

/* ------------------------------------------------------------------ */
/* category_recommend                                                  */
/* ------------------------------------------------------------------ */

export function recommendCategory(product: Product) {
	const haystack = `${text(product.title)} ${text(product.description)}`.toLowerCase()
	const current = text(product.category ?? product.currentCategory) || null
	const check = checkCategory(product)

	const matches = TAXONOMY.filter(([kw]) => haystack.includes(kw)).sort(
		(a, b) => b[0].length - a[0].length,
	)
	const best = matches[0]

	if (!best) {
		return {
			productId: text(product.id),
			currentCategory: current,
			recommendedCategory: current && check.state === "present" ? current : null,
			confidence: "low" as const,
			reason:
				"No product type keyword found in title or description - add the product type to the title for an accurate mapping",
		}
	}

	const titleMatch = text(product.title).toLowerCase().includes(best[0])
	const keepCurrent = check.state === "present" && current === best[1]

	return {
		productId: text(product.id),
		currentCategory: current,
		recommendedCategory: best[1],
		confidence: (titleMatch && matches.length === 1
			? "high"
			: titleMatch
				? "medium"
				: "low") as "high" | "medium" | "low",
		reason: keepCurrent
			? `Current category already matches the "${best[0]}" product type - keep it`
			: current === null
				? `Matched "${best[0]}" - no category was set`
				: `Matched "${best[0]}" - current category "${current}" is ${check.state === "generic" ? "too broad" : "less specific"}`,
	}
}

/* ------------------------------------------------------------------ */
/* seo_audit                                                           */
/* ------------------------------------------------------------------ */

export function seoAuditProducts(products: Product[]) {
	const issues: Array<Record<string, unknown>> = []
	const perProduct: number[] = []
	let schemaMissing = new Set<string>()
	let productsWithSchema = 0

	for (const product of products) {
		const id = text(product.id)
		const title = text(product.title)
		const description = text(product.description)
		const category = text(product.category ?? product.currentCategory)
		const categoryWords = category
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter((w) => w.length > 3)

		const checks: boolean[] = []

		// 1. title length 50-60 ideal
		const titleIdeal = title.length >= 50 && title.length <= 60
		checks.push(titleIdeal)
		if (title.length === 0) {
			issues.push({
				productId: id,
				issue: "Title missing",
				current: null,
				recommendation:
					"Write a 50-60 character title: main keyword + key attribute + audience",
				impact: "Search visibility + CTR",
				priority: "high",
			})
		} else if (title.length < 50) {
			issues.push({
				productId: id,
				issue: `Title too short (${title.length} chars)`,
				current: title,
				recommendation: `Expand to 50-60 chars, e.g. "${title} - Premium Quality${category ? ` ${category.split(">").pop()!.trim()}` : ""}"`,
				impact: "Search visibility + CTR",
				priority: title.length < 20 ? "high" : "medium",
			})
		} else if (title.length > 60) {
			issues.push({
				productId: id,
				issue: `Title too long (${title.length} chars)`,
				current: title,
				recommendation:
					"Trim to 60 chars so it is not truncated in search results - keep the main keyword first",
				impact: "Search visibility + CTR",
				priority: "low",
			})
		}

		// 2. title keyword presence (product type)
		const titleHasType = title !== "" && hasProductType(title)
		checks.push(titleHasType)
		if (title !== "" && !titleHasType) {
			issues.push({
				productId: id,
				issue: "Title missing product-type keyword",
				current: title,
				recommendation:
					"Include the product type shoppers search for (e.g. 't-shirt', 'running shoes') in the title",
				impact: "Keyword ranking",
				priority: "high",
			})
		}

		// 3. description length 120-160 ideal (meta description)
		const descIdeal = description.length >= 120 && description.length <= 160
		checks.push(descIdeal)
		if (description.length === 0) {
			issues.push({
				productId: id,
				issue: "Description missing",
				current: null,
				recommendation:
					"Write a 120-160 character meta-ready description covering material, size, color and use case",
				impact: "Meta description + conversion",
				priority: "high",
			})
		} else if (description.length < 120) {
			issues.push({
				productId: id,
				issue: `Description too short (${description.length} chars)`,
				current: description,
				recommendation:
					"Extend to 120-160 chars: what it is, material, who it is for, and one benefit",
				impact: "Meta description + conversion",
				priority: description.length < 40 ? "high" : "medium",
			})
		}

		// 4. description keywords from category
		const descHasKeywords =
			categoryWords.length === 0
				? mentionsAttributes(description)
				: categoryWords.some((w) => description.toLowerCase().includes(w))
		checks.push(descHasKeywords)
		if (description !== "" && !descHasKeywords) {
			issues.push({
				productId: id,
				issue: "Description does not use category keywords",
				current: description.slice(0, 120),
				recommendation: category
					? `Work category terms naturally into the copy (${categoryWords.slice(0, 3).join(", ")})`
					: "Mention material, size, color and use case naturally in the copy",
				impact: "SEO ranking relevance",
				priority: "medium",
			})
		}

		// 5. schema.org Product potential
		const schemaFields: Array<[string, boolean]> = [
			["name", title !== ""],
			["description", description !== ""],
			["brand", text(product.brand) !== ""],
			["gtin", checkGtin(product).state === "present"],
			["sku", text(product.sku) !== ""],
			["price", text(product.price) !== ""],
			["availability", text(product.availability) !== ""],
			["image", checkImages(product).count > 0],
		]
		const missing = schemaFields.filter(([, ok]) => !ok).map(([f]) => f)
		const hasSchema = missing.length === 0
		checks.push(hasSchema)
		if (hasSchema) productsWithSchema += 1
		for (const f of missing) schemaMissing.add(f)
		if (missing.length > 0) {
			issues.push({
				productId: id,
				issue: `Incomplete schema.org Product data (${missing.length} field${missing.length === 1 ? "" : "s"} missing)`,
				current: missing.join(", "),
				recommendation:
					"Populate these fields so rich results and AI agents can parse the product",
				impact: "Rich results + AI agent visibility",
				priority: "medium",
			})
		}

		// 6. URL slug potential
		const slugSource = text(product.handle) || title
		const slugOk = slugSource.length >= 10 && /[a-z]/i.test(slugSource)
		checks.push(slugOk)
		if (!slugOk) {
			issues.push({
				productId: id,
				issue: "Weak URL slug potential",
				current: slugSource || null,
				recommendation:
					"Use a descriptive handle such as /products/blue-cotton-t-shirt-men",
				impact: "Crawlability + keyword signal",
				priority: "low",
			})
		}

		// 7. image alt text
		const altOk = product.imageAltText === true
		checks.push(altOk)
		if (!altOk && checkImages(product).count > 0) {
			issues.push({
				productId: id,
				issue: "Image alt text missing or unknown",
				current: null,
				recommendation:
					"Add descriptive alt text to every image (product type + color + context)",
				impact: "Image search + accessibility",
				priority: "low",
			})
		}

		perProduct.push((checks.filter(Boolean).length / checks.length) * 100)
	}

	issues.sort(
		(a, b) =>
			PRIORITY_RANK[a.priority as Priority] - PRIORITY_RANK[b.priority as Priority],
	)

	return {
		seoScore: round(avg(perProduct)) ?? 0,
		issues,
		schemaData: {
			hasProductSchema: products.length > 0 && productsWithSchema === products.length,
			missingFields: [...schemaMissing].sort(),
		},
	}
}

/* ------------------------------------------------------------------ */
/* weekly_diff                                                         */
/* ------------------------------------------------------------------ */

const asAudit = (a: any) => a?.payload?.audit ?? a?.audit ?? a ?? {}

const issueMap = (audit: any): Record<string, number> => {
	const map: Record<string, number> = {}
	for (const issue of audit?.issues ?? []) {
		if (issue && typeof issue.type === "string") map[issue.type] = num(issue.count)
	}
	return map
}

const camel = (type: string) =>
	type.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())

export function weeklyDiff(currentAudit: any, previousAudit: any) {
	const current = asAudit(currentAudit)
	const previous = asAudit(previousAudit)
	const currentScore = num(current.score)
	const previousScore = num(previous.score)
	const delta = round(currentScore - previousScore, 1) ?? 0

	const currentIssues = issueMap(current)
	const previousIssues = issueMap(previous)
	const types = [...new Set([...Object.keys(currentIssues), ...Object.keys(previousIssues)])].sort()

	const improved: Record<string, unknown> = {}
	const newIssues: Record<string, unknown> = {}
	const recommendations: string[] = []

	for (const type of types) {
		const prev = previousIssues[type] ?? 0
		const curr = currentIssues[type] ?? 0
		if (curr < prev) {
			improved[camel(type)] = { previous: prev, current: curr, fixed: prev - curr }
		} else if (curr > prev) {
			newIssues[camel(type)] = { previous: prev, current: curr, increase: curr - prev }
		}
	}

	const trend = delta > 0 ? "improving" : delta < 0 ? "declining" : "flat"

	if (Object.keys(improved).length > 0) {
		const [name, data] = Object.entries(improved).sort(
			(a, b) => num((b[1] as any).fixed) - num((a[1] as any).fixed),
		)[0]
		recommendations.push(
			`Great progress: ${(data as any).fixed} fewer ${name} issues than last week - keep going`,
		)
	}
	if (Object.keys(newIssues).length > 0) {
		const [name, data] = Object.entries(newIssues).sort(
			(a, b) => num((b[1] as any).increase) - num((a[1] as any).increase),
		)[0]
		recommendations.push(
			`Regression: ${name} grew by ${(data as any).increase} - check your latest import or sync`,
		)
	}
	const biggestOpen = Object.entries(currentIssues).sort((a, b) => b[1] - a[1])[0]
	if (biggestOpen) {
		recommendations.push(
			`This week: focus on ${camel(biggestOpen[0])} (${biggestOpen[1]} products still affected)`,
		)
	}
	if (trend === "flat" && recommendations.length === 0) {
		recommendations.push("No change this week - pick one issue type and batch-fix it")
	}

	return {
		weeklyReport: {
			scoreChange: `${delta > 0 ? "+" : ""}${delta} points (${previousScore} → ${currentScore})`,
			trend,
			improved,
			newIssues,
			topRecommendations: recommendations.slice(0, 5),
		},
	}
}

/* ------------------------------------------------------------------ */
/* ai_readiness                                                        */
/* ------------------------------------------------------------------ */

export function aiReadiness(products: Product[]) {
	const total = products.length
	if (total === 0) {
		return {
			aiReadinessScore: 0,
			findings: [],
			readinessLevel: "CRITICAL",
			recommendation: "No products to evaluate - connect a store with products",
		}
	}

	const FIELDS: Array<[string, (p: Product) => boolean]> = [
		["title", (p) => text(p.title) !== ""],
		["description", (p) => text(p.description) !== ""],
		["brand", (p) => text(p.brand) !== ""],
		["gtin", (p) => checkGtin(p).state === "present" || checkGtin(p).state === "exempt"],
		["sku", (p) => text(p.sku) !== ""],
		["category", (p) => checkCategory(p).state === "present"],
		["price", (p) => text(p.price) !== ""],
		["availability", (p) => text(p.availability) !== ""],
		["images", (p) => checkImages(p).count > 0],
		["imageAltText", (p) => p.imageAltText === true],
		["variantsAsOptions", (p) => p.variantsAsProducts !== true],
	]

	const completeness = products.map(
		(p) => (FIELDS.filter(([, ok]) => ok(p)).length / FIELDS.length) * 100,
	)
	const aiReadinessScore = round(avg(completeness)) ?? 0

	const FINDING_SPECS: Array<{
		field: string
		issue: string
		impact: string
		fix: string
	}> = [
		{
			field: "brand",
			issue: "Missing brand field",
			impact: "AI agents cannot match your products reliably",
			fix: "Add brand as product vendor/metafield or in the title",
		},
		{
			field: "gtin",
			issue: "Missing or invalid GTIN",
			impact: "Cannot match to manufacturer data in AI agents",
			fix: "Add a valid 8-14 digit barcode per variant (or set identifierExists = no for handmade)",
		},
		{
			field: "variantsAsOptions",
			issue: "Variants published as separate products",
			impact: "Splits buying signal + confuses AI agents",
			fix: "Convert to a single product with variant options",
		},
		{
			field: "price",
			issue: "Missing price data",
			impact: "Excluded from AI shopping comparisons",
			fix: "Ensure price is set and exposed in the feed",
		},
		{
			field: "availability",
			issue: "Missing availability data",
			impact: "Agents drop products they cannot confirm are in stock",
			fix: "Publish inventory/availability state per variant",
		},
		{
			field: "category",
			issue: "Missing or generic category",
			impact: "Weak intent matching in AI and on-site search",
			fix: "Assign a full Shopify Standard Product Taxonomy path",
		},
		{
			field: "images",
			issue: "No product images",
			impact: "Product cannot be rendered in agent results",
			fix: "Add at least 3 images per product",
		},
		{
			field: "imageAltText",
			issue: "Image alt text missing",
			impact: "Loses multimodal and image-search matching",
			fix: "Add descriptive alt text to each image",
		},
		{
			field: "description",
			issue: "Missing description",
			impact: "Agents have no text to reason over",
			fix: "Write 100+ character descriptions with attributes",
		},
	]

	const fieldCheck = new Map(FIELDS)
	const findings = FINDING_SPECS.map((spec) => {
		const check = fieldCheck.get(spec.field)!
		const affected = products.filter((p) => !check(p))
		return {
			issue: spec.issue,
			count: affected.length,
			affectedProducts: affected.slice(0, MAX_AFFECTED).map((p) => text(p.id)),
			percentOfCatalog: pct(affected.length, total),
			impact: spec.impact,
			fix: spec.fix,
		}
	})
		.filter((f) => f.count > 0)
		.sort((a, b) => b.count - a.count)

	const readinessLevel =
		aiReadinessScore >= 80
			? "AI_READY"
			: aiReadinessScore >= 60
				? "NEEDS_WORK"
				: aiReadinessScore >= 40
					? "AT_RISK"
					: "CRITICAL"

	const top = findings.slice(0, 3).map((f) => f.issue.toLowerCase())

	return {
		aiReadinessScore,
		findings,
		readinessLevel,
		recommendation:
			readinessLevel === "AI_READY"
				? "Catalog is structured well enough for AI shopping agents - keep identifiers current"
				: `Fix these blockers first: ${top.join("; ")} - otherwise you stay invisible to AI shopping agents`,
	}
}

/* ------------------------------------------------------------------ */
/* dispatcher                                                          */
/* ------------------------------------------------------------------ */

export function runEngine(request: EngineRequest): EngineResponse {
	const requestId = text(request?.requestId) || "req_unknown"
	const payload = request?.payload ?? {}
	const products = Array.isArray(payload.products) ? payload.products : []

	switch (request?.messageType) {
		case "audit_full_catalog":
			return {
				messageType: "audit_result",
				requestId,
				payload: auditFullCatalog(products),
			}
		case "category_recommend":
			return {
				messageType: "category_recommendations",
				requestId,
				payload: { recommendations: products.map(recommendCategory) },
			}
		case "seo_audit":
			return {
				messageType: "seo_audit_result",
				requestId,
				payload: seoAuditProducts(products),
			}
		case "weekly_diff":
			return {
				messageType: "weekly_diff_result",
				requestId,
				payload: weeklyDiff(payload.currentAudit, payload.previousAudit),
			}
		case "ai_readiness":
			return {
				messageType: "ai_readiness_result",
				requestId,
				payload: aiReadiness(products),
			}
		default:
			return {
				messageType: "engine_error",
				requestId,
				payload: {
					error: "unsupported_message_type",
					received: text(request?.messageType) || null,
					supported: [
						"audit_full_catalog",
						"category_recommend",
						"seo_audit",
						"weekly_diff",
						"ai_readiness",
					],
				},
			}
	}
}

/** Convenience helpers mirroring backend/services/engine.ts */
export const auditProducts = (products: Product[], requestId = "req_audit") =>
	runEngine({ messageType: "audit_full_catalog", requestId, payload: { products } })
export const recommendCategories = (products: Product[], requestId = "req_cat") =>
	runEngine({ messageType: "category_recommend", requestId, payload: { products } })
export const auditSEO = (products: Product[], requestId = "req_seo") =>
	runEngine({ messageType: "seo_audit", requestId, payload: { products } })
export const diffAudits = (currentAudit: any, previousAudit: any, requestId = "req_diff") =>
	runEngine({ messageType: "weekly_diff", requestId, payload: { currentAudit, previousAudit } })
export const aiReadinessAudit = (products: Product[], requestId = "req_ai") =>
	runEngine({ messageType: "ai_readiness", requestId, payload: { products } })

/** Issue rows ready for CSV export in the backend. */
export function issuesToCsv(response: EngineResponse): string {
	const audit = (response.payload as any)?.audit
	const rows = [["Issue Type", "Count", "Priority", "Percent Of Catalog", "Affected Products"]]
	for (const issue of audit?.issues ?? []) {
		rows.push([
			issue.type,
			String(issue.count),
			issue.priority,
			String(issue.percentOfCatalog),
			issue.affectedProducts.join(" "),
		])
	}
	return rows
		.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
		.join("\n")
}
