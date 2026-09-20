/**
 * Deterministic engine tests. Run: npx tsx test/run-tests.ts
 */
import { readFileSync } from "node:fs"
import { runEngine, issuesToCsv, hasValidGtinCheckDigit } from "../src/engine"
import type { EngineRequest } from "../src/types"

let passed = 0
let failed = 0

function check(name: string, condition: boolean, detail?: unknown) {
	if (condition) {
		passed += 1
		console.log(`PASS  ${name}`)
	} else {
		failed += 1
		console.log(`FAIL  ${name}`, detail === undefined ? "" : JSON.stringify(detail))
	}
}

const isJson = (value: unknown) => {
	try {
		JSON.parse(JSON.stringify(value))
		return true
	} catch {
		return false
	}
}

/* ---- 1. audit_full_catalog (plan sample) ---- */
const sample = JSON.parse(
	readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
) as EngineRequest
const audit = runEngine(sample)
const a = (audit.payload as any).audit

check("audit: messageType", audit.messageType === "audit_result")
check("audit: requestId echoed", audit.requestId === "req_test_001")
check("audit: valid JSON", isJson(audit))
check("audit: totalProducts = 3", a.totalProducts === 3, a.totalProducts)
check("audit: score in 0-100", a.score >= 0 && a.score <= 100, a.score)
check(
	"audit: breakdown keys",
	["titles", "descriptions", "gtins", "categories", "images", "variants"].every(
		(k) => typeof a.scoreBreakdown[k] === "number" || a.scoreBreakdown[k] === null,
	),
)
check(
	"audit: unknown public GTIN status on prod_1 + prod_3",
	JSON.stringify(
		a.issues.find((i: any) => i.type === "gtin_status_unverified").affectedProducts,
	) === JSON.stringify(["prod_1", "prod_3"]),
)
check(
	"audit: prod_2 clean",
	a.issues.every((i: any) => !i.affectedProducts.includes("prod_2")),
	a.issues.filter((i: any) => i.affectedProducts.includes("prod_2")),
)
check(
	"audit: no_images is high priority",
	a.issues.find((i: any) => i.type === "no_images").priority === "high",
)
check(
	"audit: issues sorted high -> low",
	((): boolean => {
		const rank: any = { high: 0, medium: 1, low: 2 }
		return a.issues.every(
			(i: any, idx: number) =>
				idx === 0 || rank[a.issues[idx - 1].priority] <= rank[i.priority],
		)
	})(),
)
check("audit: max 5 recommendations", a.recommendations.length <= 5)
check("audit: six explicit scoring dimensions", a.scoring.dimensions.length === 6, a.scoring)
check("audit: issue classification present", a.issues.every((i: any) => ["eligibility_blocker", "data_warning", "growth_opportunity"].includes(i.classification)))
check("audit: issue groups partition all issues", a.issueGroups.eligibilityBlockers.length + a.issueGroups.dataWarnings.length + a.issueGroups.growthOpportunities.length === a.issues.length)
check("audit: coverage is explicit and non-authoritative", a.coverage.assessedProducts === 3 && a.coverage.authoritative === false, a.coverage)
check("audit: unavailable GTIN requirement is review-only", a.issues.find((i: any) => i.type === "gtin_status_unverified")?.status === "needs_verification")
check("audit: nextSteps present", a.nextSteps.length === 3)
check("audit: unknown GTINs excluded from GTIN score", a.scoreBreakdown.gtins === 100, a.scoreBreakdown.gtins)
check("audit: GTIN assessment coverage is explicit", a.assessmentBreakdown.gtins.assessedProducts === 1 && a.assessmentBreakdown.gtins.unavailableProducts === 2, a.assessmentBreakdown.gtins)
check("audit: findings include product evidence", a.issues.every((i: any) => i.evidence.length === Math.min(i.count, 200) && i.evidence.every((e: any) => e.productId && e.observed && e.expected)), a.issues)
check("audit: finding semantics are explicit", a.issues.every((i: any) => i.status && i.confidence && i.source === "public_storefront"), a.issues)


/* ---- 2. determinism ---- */
check(
	"determinism: same input = same output",
	JSON.stringify(runEngine(sample)) === JSON.stringify(audit),
)

/* ---- 3. empty catalog ---- */
const empty = runEngine({
	messageType: "audit_full_catalog",
	requestId: "req_empty",
	payload: { products: [] },
})
check("empty: score 0", (empty.payload as any).audit.score === 0)
check("empty: no issues", (empty.payload as any).audit.issues.length === 0)

/* ---- 4. edge cases ---- */
const edge = runEngine({
	messageType: "audit_full_catalog",
	requestId: "req_edge",
	payload: {
		products: [
			{ id: "e1", title: null, description: null, gtin: "ABC123", images: 0 },
			{ id: "e2", title: "X".repeat(1000), gtin: "12345678", category: "Clothing > Clothing > Clothing", images: 4, variants: 2, brand: "B", sku: "S", description: "x".repeat(140) + " cotton size blue" },
			{ id: "e3", title: "Handmade Ceramic Mug with Blue Glaze Finish", description: "Hand-thrown ceramic mug, 350ml, glazed in cobalt blue. Perfect for everyday coffee or tea. Dishwasher safe stoneware.", gtin: null, identifierExists: "no", category: "Home & Garden > Kitchen & Dining > Tableware > Drinkware > Mugs", images: 3, variants: 1, brand: "Studio", sku: "MUG-1" },
			{ id: "e4", title: "Red Running Shoes Lightweight Mesh for Athletes", description: "Lightweight mesh running shoes, breathable upper, available in sizes 6-12, ideal for daily training and road runs.", gtin: "1234567890123", category: "Apparel & Accessories > Shoes > Athletic Shoes", images: 4, variantTitles: ["Size 9", "Size 9"], variants: 2, brand: "Runr", sku: "RS-1" },
		],
	},
})
const ea = (edge.payload as any).audit
const hasIssue = (type: string, id: string) =>
	ea.issues.some((i: any) => i.type === type && i.affectedProducts.includes(id))
check("edge: missing_title e1", hasIssue("missing_title", "e1"))
check("edge: invalid_gtin e1", hasIssue("invalid_gtin", "e1"))
check("edge: title_too_long e2", hasIssue("title_too_long", "e2"))
check("edge: duplicate_category_levels e2", hasIssue("duplicate_category_levels", "e2"))
check("edge: handmade GTIN exempt e3", !hasIssue("gtin_status_unverified", "e3"))
check("edge: duplicate_variant_titles e4", hasIssue("duplicate_variant_titles", "e4"))

/* ---- 5. category_recommend ---- */
const cats = runEngine({
	messageType: "category_recommend",
	requestId: "req_abc",
	payload: {
		products: [
			{ id: "prod_1", title: "Blue Cotton T-Shirt XL", description: "Premium blue cotton t-shirt for men", currentCategory: "Clothing" },
			{ id: "prod_2", title: "Running Shoes Breathable", description: "Lightweight running shoes for athletes", currentCategory: null },
		],
	},
})
const recs = (cats.payload as any).recommendations
check("category: messageType", cats.messageType === "category_recommendations")
check(
	"category: t-shirt path",
	recs[0].recommendedCategory ===
		"Apparel & Accessories > Clothing > Shirts > T-Shirts",
	recs[0],
)
check(
	"category: running shoes path",
	recs[1].recommendedCategory === "Apparel & Accessories > Shoes > Athletic Shoes",
	recs[1],
)

/* ---- 6. seo_audit ---- */
const seo = runEngine({
	messageType: "seo_audit",
	requestId: "req_seo",
	payload: {
		products: [
			{ id: "prod_1", title: "T-Shirt", description: "A shirt", category: "Clothing > Shirts" },
		],
	},
})
const sp = seo.payload as any
check("seo: messageType", seo.messageType === "seo_audit_result")
check("seo: score 0-100", sp.seoScore >= 0 && sp.seoScore <= 100, sp.seoScore)
check("seo: flags short title", sp.issues.some((i: any) => /Title too short/.test(i.issue)))
check("seo: schema incomplete", sp.schemaData.hasProductSchema === false)
check("seo: lists missing schema fields", sp.schemaData.missingFields.length > 0)

/* ---- 7. weekly_diff ---- */
const diff = runEngine({
	messageType: "weekly_diff",
	requestId: "req_diff",
	payload: {
		currentAudit: {
			score: 77,
			issues: [
				{ type: "missing_gtin", count: 40 },
				{ type: "missing_category", count: 15 },
			],
		},
		previousAudit: {
			score: 72,
			issues: [
				{ type: "missing_gtin", count: 45 },
				{ type: "missing_category", count: 10 },
			],
		},
	},
})
const wr = (diff.payload as any).weeklyReport
check("diff: messageType", diff.messageType === "weekly_diff_result")
check("diff: scoreChange text", wr.scoreChange === "+5 points (72 → 77)", wr.scoreChange)
check("diff: trend improving", wr.trend === "improving")
check("diff: fixed 5 gtins", wr.improved.missingGtin.fixed === 5, wr.improved)
check("diff: category regression", wr.newIssues.missingCategory.increase === 5, wr.newIssues)

/* ---- 8. ai_readiness ---- */
const ai = runEngine({
	messageType: "ai_readiness",
	requestId: "req_ai",
	payload: { products: sample.payload.products },
})
const aip = ai.payload as any
check("ai: messageType", ai.messageType === "ai_readiness_result")
check("ai: score 0-100", aip.aiReadinessScore >= 0 && aip.aiReadinessScore <= 100)
check(
	"ai: readinessLevel enum",
	["AI_READY", "NEEDS_WORK", "AT_RISK", "CRITICAL"].includes(aip.readinessLevel),
	aip.readinessLevel,
)
check("ai: findings present", aip.findings.length > 0)

/* ---- 9. unknown message type ---- */
const bad = runEngine({ messageType: "nope" as any, requestId: "req_bad", payload: {} })
check("error: engine_error", bad.messageType === "engine_error")
check("error: requestId echoed", bad.requestId === "req_bad")

/* ---- 10. csv helper ---- */
const csv = issuesToCsv(audit)
check("csv: header row", csv.startsWith('"Issue Type","Count","Priority"'))
check("csv: one row per issue", csv.trim().split("\n").length === a.issues.length + 1)

/* ---- 11. throughput ---- */
const big = Array.from({ length: 10000 }, (_, i) => ({
	id: `p_${i}`,
	title: i % 2 ? "Blue Cotton T-Shirt for Men - Soft Everyday Crew Neck" : "Tee",
	description: i % 3 ? "Soft cotton t-shirt in blue, available in sizes S-XXL, machine washable, perfect for everyday casual wear and layering." : null,
	gtin: i % 4 ? "1234567890123" : null,
	category: i % 5 ? "Apparel & Accessories > Clothing > Shirts > T-Shirts" : "Clothing",
	images: i % 6,
	variants: 2,
	brand: i % 7 ? "B" : null,
	sku: "S",
}))
const t0 = Date.now()
const bigResult = runEngine({
	messageType: "audit_full_catalog",
	requestId: "req_big",
	payload: { products: big },
})
const ms = Date.now() - t0
check("perf: 10k products < 5000ms", ms < 5000, `${ms}ms`)
check("perf: totalProducts 10000", (bigResult.payload as any).audit.totalProducts === 10000)
check(
	"perf: affectedProducts capped at 200",
	(bigResult.payload as any).audit.issues.every((i: any) => i.affectedProducts.length <= 200),
)

/* ---- 12. gs1 modulo-10 gtin check digit tests ---- */
// GTIN-8
check("gtin8: valid check digit (73513537)", hasValidGtinCheckDigit("73513537") === true)
check("gtin8: invalid check digit (73513538)", hasValidGtinCheckDigit("73513538") === false)

// UPC-A / GTIN-12
check("upca: valid check digit (036000291452)", hasValidGtinCheckDigit("036000291452") === true)
check("upca: user case - invalid check digit (084920198421)", hasValidGtinCheckDigit("084920198421") === false)
check("upca: user case - mathematically valid format (084920198429)", hasValidGtinCheckDigit("084920198429") === true)

// EAN-13 / GTIN-13
check("ean13: valid check digit (4006381333931)", hasValidGtinCheckDigit("4006381333931") === true)
check("ean13: invalid check digit (4006381333932)", hasValidGtinCheckDigit("4006381333932") === false)

// GTIN-14
check("gtin14: valid check digit (10012345678902)", hasValidGtinCheckDigit("10012345678902") === true)
check("gtin14: invalid check digit (10012345678903)", hasValidGtinCheckDigit("10012345678903") === false)

// Invalid formats
check("gtin: non-digit rejected (ABC123)", hasValidGtinCheckDigit("ABC123") === false)
check("gtin: invalid length 4 rejected (1234)", hasValidGtinCheckDigit("1234") === false)
check("gtin: empty string rejected", hasValidGtinCheckDigit("") === false)


/* ---- 13. finding summary + truthful labels ---- */
check(
	"summary: buckets reconcile with the visible issue list",
	((): boolean => {
		const fs = a.findingSummary
		const listTotal = a.issues.reduce((acc: number, i: any) => acc + i.count, 0)
		return (
			fs.confirmedIssues + fs.verificationItems + fs.opportunities === fs.totalFindings &&
			fs.totalFindings === listTotal
		)
	})(),
	a.findingSummary,
)
check(
	"summary: unverified GTINs are verification items, not confirmed issues",
	a.findingSummary.verificationItems ===
		a.issues.find((i: any) => i.type === "gtin_status_unverified").count &&
		a.findingSummary.confirmedIssues ===
			a.issues
				.filter((i: any) => i.status === "observed")
				.reduce((acc: number, i: any) => acc + i.count, 0),
	a.findingSummary,
)
check(
	"summary: high-priority confirmed excludes heuristics and verification",
	a.findingSummary.highPriorityConfirmed ===
		a.issues
			.filter((i: any) => i.status === "observed" && i.priority === "high" && i.confidence === "high")
			.reduce((acc: number, i: any) => acc + i.count, 0),
	a.findingSummary,
)
check(
	"labels: every finding carries a display title and the exact rule",
	a.issues.every((i: any) => typeof i.title === "string" && i.title.length > 0 && typeof i.rule === "string" && i.rule.length > 0),
)
check(
	"labels: heuristic titles avoid definite-error wording",
	a.issues
		.filter((i: any) => i.status === "heuristic")
		.every((i: any) => /may|not set|fewer than|single level/i.test(i.title)),
	a.issues.filter((i: any) => i.status === "heuristic").map((i: any) => i.title),
)
check(
	"labels: image rule states the real threshold of 3",
	/3 or more/.test(a.issues.find((i: any) => i.type === "too_few_images")?.rule ?? "") &&
		/fewer than 3/i.test(a.issues.find((i: any) => i.type === "too_few_images")?.title ?? ""),
)
const titles = runEngine({
	messageType: "audit_full_catalog",
	requestId: "req_titles",
	payload: {
		products: [
			{ id: "t1", title: "Short Tee", sku: "T1" },
			{ id: "t2", title: "Men's Cotton Polo Shirt", sku: "T2" },
		],
	},
})
const ta = (titles.payload as any).audit
check(
	"labels: title rules state the real character thresholds",
	/20-39/.test(ta.issues.find((i: any) => i.type === "incomplete_title")?.rule ?? "") &&
		/fewer than 20/.test(ta.issues.find((i: any) => i.type === "title_too_short")?.rule ?? ""),
	ta.issues.map((i: any) => [i.type, i.rule]),
)
check(
	"labels: no finding claims Google categories or Merchant Center verdicts",
	a.issues.every(
		(i: any) => !/google/i.test(i.title) && !/google/i.test(i.rule),
	),
)
check(
	"evidence: expectations state the rule threshold per finding",
	a.issues.every((i: any) =>
		i.evidence.every((e: any) => typeof e.expected === "string" && e.expected.length > 0),
	) &&
		/40-150/.test(
			ta.issues.find((i: any) => i.type === "incomplete_title")?.evidence?.[0]?.expected ?? "",
		),
	ta.issues.find((i: any) => i.type === "incomplete_title"),
)
check(
	"scoring: method description is shipped with the result",
	a.scoring.kind === "weighted_quality_score" &&
		/not a pass rate/.test(a.scoring.note) &&
		/rescaled to 100%/.test(a.scoring.formula.unassessed),
	a.scoring,
)

/* ---- 14. shallow product type is a visible opportunity, not a silent score ---- */
const shallow = runEngine({
	messageType: "audit_full_catalog",
	requestId: "req_shallow",
	payload: {
		products: [
			{
				id: "s1",
				title: "Blue Cotton T-Shirt for Men - Soft Everyday Crew Neck",
				description: "Soft cotton t-shirt in blue, available in sizes S-XXL, machine washable, perfect for everyday casual wear.",
				gtin: "4006381333931",
				category: "Shirts",
				images: 4,
				variants: 2,
				brand: "B",
				sku: "S1",
			},
		],
	},
})
const sa = (shallow.payload as any).audit
check(
	"shallow: single-level product_type becomes a heuristic opportunity",
	sa.issues.some(
		(i: any) =>
			i.type === "shallow_product_type" &&
			i.status === "heuristic" &&
			i.classification === "growth_opportunity" &&
			/single level/i.test(i.title),
	),
	sa.issues.map((i: any) => i.type),
)
check(
	"shallow: opportunity counted in opportunities bucket",
	sa.findingSummary.opportunities === 1 && sa.findingSummary.confirmedIssues === 0,
	sa.findingSummary,
)

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
