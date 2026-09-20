/**
 * The app's starting state.
 *
 * This replaces the previous `INITIAL_AUDIT_DATA` mock, which shipped a
 * complete fake audit (score 74, 248 products, 89 issues, 32 high priority)
 * as the default UI state. A visitor who had never run a scan saw a fully
 * populated report that looked real.
 *
 * Nothing here is a plausible-looking placeholder. Empty means empty.
 */
export const EMPTY_AUDIT_DATA = {
	storeDomain: '',
	healthScore: null,
	scoreStatus: '',
	productsCount: 0,
	detectedIssuesCount: 0,
	highPriorityCount: 0,
	findingSummary: { confirmedIssues: 0, verificationItems: 0, opportunities: 0, totalFindings: 0, highPriorityConfirmed: 0 },
	attributeBreakdown: [],
	issues: [],
	flaggedProducts: [],
	actionPlan: [],
}
