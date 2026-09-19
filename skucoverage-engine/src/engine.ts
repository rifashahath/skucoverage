/**
 * SKUcoverage Audit Engine — pure logic.
 * No HTTP calls. No database access. Deterministic: same input => same output.
 *
 * Entry point: runEngine(request) -> response
 */
import type {
	EngineRequest,
	EngineResponse,
	Issue,
	Priority,
	Product,
} from "./types"
import { GENERIC_CATEGORIES, TAXONOMY } from "./taxonomy"

/* ------------------------------------------------------------------ */
/* constants                                                           */
/* ------------------------------------------------------------------ */

export const IMPACT = {
	gtin: "Google Shopping eligibility + fraud prevention",
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

const round = (n: number, dp = 0): number => {
	const f = 10 ** dp
	return Math.round(n * f) / f
}

const pct = (part: number, total: number): number =>
	total === 0 ? 0 : round((part / total) * 100, 1)

const avg = (nums: number[]): number =>
	nums.length === 0 ? 0 : nums.reduce((a, b) => a + b, 0) / nums.length

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
	if (length < 40 || !hasProductType(title))
		return { score: 60, length, state: "incomplete" }
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
	score: number
	state: "missing" | "invalid" | "exempt" | "present"
}

export function checkGtin(product: Product): GtinCheck {
	const gtin = text(product.gtin)
	if (gtin === "") {
		// Handmade / one-of-a-kind products can declare no manufacturer identifier.
		if (product.identifierExists === "no") return { score: 100, state: "exempt" }
		return { score: 0, state: "missing" }
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
	if (count < 1) return { score: 50, count, state: "no_variants" }
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

function weighted(pairs: Array<[number, number]>): number {
	const totalWeight = pairs.reduce((acc, [, w]) => acc + w, 0)
	if (totalWeight === 0) return 0
	return pairs.reduce((acc, [score, w]) => acc + score * w, 0) / totalWeight
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
		productScore,
		complete:
			title.score === 100 &&
			description.score === 100 &&
			gtin.score === 100 &&
			category.score === 100 &&
			images.score === 100 &&
			variants.score === 100,
	}
}

/* ------------------------------------------------------------------ */
/* audit_full_catalog                                                  */
/* ------------------------------------------------------------------ */

type IssueSpec = {
	type: string
	priority: Priority
	impact: string
	match: (s: ProductScore) => boolean
	recommendation: (count: number, percent: number) => string
}

const ISSUE_SPECS: IssueSpec[] = [
	{
		type: "missing_title",
		priority: "high",
		impact: IMPACT.title,
		match: (s) => s.title.state === "missing",
		recommendation: (c, p) =>
			`Add a title to ${c} product${c === 1 ? "" : "s"} (${p}% of catalog) - they cannot be sold or indexed without one`,
	},
	{
		type: "missing_gtin",
		priority: "high",
		impact: IMPACT.gtin,
		match: (s) => s.gtin.state === "missing",
		recommendation: (c, p) =>
			`Add GTIN to ${c} product${c === 1 ? "" : "s"} (${p}% of catalog) - highest priority for Google Shopping`,
	},
	{
		type: "invalid_gtin",
		priority: "high",
		impact: IMPACT.gtin,
		match: (s) => s.gtin.state === "invalid",
		recommendation: (c) =>
			`Fix ${c} invalid GTIN value${c === 1 ? "" : "s"} - must be a GTIN-8, UPC-A, EAN-13 or GTIN-14 with a valid GS1 check digit. Use the barcode printed on the manufacturer packaging; do not invent a number.`,
	},
	{
		type: "no_images",
		priority: "high",
		impact: IMPACT.images,
		match: (s) => s.images.state === "none",
		recommendation: (c, p) =>
			`Add images to ${c} product${c === 1 ? "" : "s"} with zero photos (${p}% of catalog) - blocks feeds and kills trust`,
	},
	{
		type: "title_too_short",
		priority: "high",
		impact: IMPACT.title,
		match: (s) => s.title.state === "too_short",
		recommendation: (c) =>
			`Rewrite ${c} title${c === 1 ? "" : "s"} under 20 characters - unusable for search`,
	},
	{
		type: "incomplete_title",
		priority: "medium",
		impact: IMPACT.title,
		match: (s) => s.title.state === "incomplete",
		recommendation: (c) =>
			`Expand ${c} product title${c === 1 ? "" : "s"} to 50-60 characters including main keywords`,
	},
	{
		type: "title_too_long",
		priority: "low",
		impact: IMPACT.title,
		match: (s) => s.title.state === "too_long",
		recommendation: (c) =>
			`Shorten ${c} very long title${c === 1 ? "" : "s"} - they get truncated in search results`,
	},
	{
		type: "missing_description",
		priority: "medium",
		impact: IMPACT.description,
		match: (s) => s.description.state === "missing",
		recommendation: (c, p) =>
			`Write descriptions for ${c} product${c === 1 ? "" : "s"} with none (${p}% of catalog)`,
	},
	{
		type: "incomplete_description",
		priority: "medium",
		impact: IMPACT.description,
		match: (s) => s.description.state === "incomplete",
		recommendation: (c) =>
			`Add 100+ character descriptions with material, size, color and use case to ${c} product${c === 1 ? "" : "s"}`,
	},
	{
		type: "variants_as_products",
		priority: "medium",
		impact: IMPACT.variants,
		match: (s) => s.variants.state === "variants_as_products",
		recommendation: (c) =>
			`Merge ${c} product${c === 1 ? "" : "s"} that duplicate colors/sizes into variant options`,
	},
	{
		type: "duplicate_variant_titles",
		priority: "medium",
		impact: IMPACT.variants,
		match: (s) => s.variants.state === "duplicate_variant_titles",
		recommendation: (c) =>
			`Give unique titles/SKUs to variants on ${c} product${c === 1 ? "" : "s"}`,
	},
	{
		type: "missing_brand",
		priority: "medium",
		impact: IMPACT.brand,
		match: (s) => !s.hasBrand,
		recommendation: (c) =>
			`Set a brand/vendor value on ${c} product${c === 1 ? "" : "s"} so AI shopping agents can match them`,
	},
	{
		type: "missing_sku",
		priority: "low",
		impact: IMPACT.variants,
		match: (s) => !s.hasSku,
		recommendation: (c) => `Assign SKUs to ${c} product${c === 1 ? "" : "s"}`,
	},
	{
		type: "missing_category",
		priority: "low",
		impact: IMPACT.category,
		match: (s) => s.category.state === "missing",
		recommendation: (c) =>
			`Assign Shopify Standard Product Taxonomy categories to ${c} product${c === 1 ? "" : "s"}`,
	},
	{
		type: "generic_category",
		priority: "low",
		impact: IMPACT.category,
		match: (s) => s.category.state === "generic",
		recommendation: (c) =>
			`Replace broad categories on ${c} product${c === 1 ? "" : "s"} with a full taxonomy path`,
	},
	{
		type: "duplicate_category_levels",
		priority: "low",
		impact: IMPACT.category,
		match: (s) => s.category.state === "duplicate_levels",
		recommendation: (c) =>
			`Clean up repeated category levels on ${c} product${c === 1 ? "" : "s"}`,
	},
	{
		type: "too_few_images",
		priority: "low",
		impact: IMPACT.images,
		match: (s) => s.images.state === "too_few",
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
		issues.push({
			type: spec.type,
			count: affected.length,
			affectedProducts: affected.slice(0, MAX_AFFECTED),
			priority: spec.priority,
			impact: spec.impact,
			percentOfCatalog: percent,
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

	const scoreBreakdown = {
		titles: round(avg(scores.map((s) => s.title.score))),
		descriptions: round(avg(scores.map((s) => s.description.score))),
		gtins: round(avg(scores.map((s) => s.gtin.score))),
		categories: round(avg(scores.map((s) => s.category.score))),
		images: round(avg(scores.map((s) => s.images.score))),
		variants: round(avg(scores.map((s) => s.variants.score))),
	}

	const score = round(avg(scores.map((s) => s.productScore)))
	const top = issues.slice(0, 3)

	return {
		audit: {
			totalProducts: total,
			score,
			scoreBreakdown,
			issues,
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
		seoScore: round(avg(perProduct)),
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
	const delta = round(currentScore - previousScore, 1)

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
	const aiReadinessScore = round(avg(completeness))

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
