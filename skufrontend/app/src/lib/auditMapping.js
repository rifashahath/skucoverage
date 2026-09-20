/**
 * Pure mapping from the raw engine audit payload to the StoreAuditData view
 * model, plus the finding-bucket summary the report displays. Kept outside
 * App.jsx so the reconciliation logic is unit-testable.
 */

/**
 * Split mapped issues into the three buckets the report shows:
 * confirmed (observed), needs verification, and optimization opportunities
 * (heuristic). totalFindings always equals the sum of every issue count.
 */
export function summarizeFindings(issues) {
  const sum = (list) => list.reduce((acc, i) => acc + (i.count || 0), 0);
  const observed = issues.filter((i) => (i.status || 'observed') === 'observed');
  const confirmedIssues = sum(observed);
  const verificationItems = sum(issues.filter((i) => i.status === 'needs_verification'));
  const opportunities = sum(issues.filter((i) => i.status === 'heuristic'));
  return {
    confirmedIssues,
    verificationItems,
    opportunities,
    totalFindings: confirmedIssues + verificationItems + opportunities,
    highPriorityConfirmed: sum(
      observed.filter((i) => i.severity === 'HIGH' && i.confidence === 'high'),
    ),
  };
}

/**
 * Maps raw Worker audit payload to StoreAuditData schema used by views
 */
export function mapEngineReportToStoreAudit(report, storeDomain, activeAuditId) {
  if (!report || !report.payload || !report.payload.audit) {
    return null;
  }
  const audit = report.payload.audit;
  // If the backend did not send a score we show nothing rather than a
  // plausible-looking placeholder.
  const score = typeof audit.score === 'number' ? Math.round(audit.score) : null;
  const totalProducts = audit.totalProducts ?? audit.analyzedProducts ?? 0;
  const issues = Array.isArray(audit.issues) ? audit.issues : [];

  const breakdown = audit.scoreBreakdown || {};
  const assessment = audit.assessmentBreakdown || {};
  const attributeDefinitions = [
    ['Titles', 'titles'],
    ['Descriptions', 'descriptions'],
    ['GTIN / barcode format', 'gtins'],
    ['Storefront product type', 'categories'],
    ['Image count', 'images'],
    ['Variant structure', 'variants'],
  ];
  const attributeBreakdown = attributeDefinitions.map(([name, key]) => {
    const rawScore = typeof breakdown[key] === 'number' ? Math.round(breakdown[key]) : null;
    const meta = assessment[key] || {};
    return {
      name,
      score: rawScore,
      status: meta.status || (rawScore === null ? 'not_assessed' : 'assessed'),
      assessedProducts: meta.assessedProducts,
      unavailableProducts: meta.unavailableProducts,
      source: meta.source || 'public_storefront',
      color: rawScore === null ? 'primary' : rawScore >= 80 ? 'secondary' : rawScore >= 50 ? 'tertiary' : 'error',
    };
  });

  const categoryMap = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('gtin') || t.includes('barcode')) return 'gtin';
    if (t.includes('image') || t.includes('alt')) return 'alt-text';
    if (t.includes('desc')) return 'description';
    if (t.includes('cat') || t.includes('product_type')) return 'category';
    return 'sku';
  };

  const readableTitle = (type) => {
    return (type || 'Catalog issue').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const mappedIssues = issues.map((iss, idx) => {
    const affected = Array.isArray(iss.affectedProducts) ? iss.affectedProducts : [];
    const cat = categoryMap(iss.type || '');
    return {
      id: `issue-${iss.type || idx}`,
      severity: (iss.priority || 'medium').toUpperCase(),
      classification: iss.classification || 'data_warning',
      status: iss.status || 'observed',
      confidence: iss.confidence || 'medium',
      source: iss.source || 'public_storefront',
      title: iss.title || readableTitle(iss.type),
      rule: iss.rule || '',
      description: iss.impact || 'Review the source field in Shopify Admin.',
      count: iss.count || affected.length || 1,
      category: cat,
      // Only real affected product ids are listed. Previously a synthetic
      // `PROD-n` row was invented whenever the engine returned none, so the
      // UI showed products that do not exist.
      affectedItems: affected.slice(0, 50).map((prodId, evidenceIndex) => {
        const evidence = Array.isArray(iss.evidence) ? iss.evidence[evidenceIndex] : null;
        return {
          sku: typeof prodId === 'string' && prodId ? (prodId.startsWith('gid://') ? prodId.split('/').pop() : prodId) : String(prodId),
          productTitle: evidence?.observed || '',
          issueDetail: evidence?.observed || `${readableTitle(iss.type)} flagged on this item`,
          suggestedFix: evidence?.expected || iss.impact || 'Review the source field',
          observed: evidence?.observed,
          expected: evidence?.expected,
          confidence: iss.confidence,
          source: iss.source,
          resolved: false,
        };
      }),
    };
  });

  const recommendations = Array.isArray(audit.recommendations) ? audit.recommendations : [];
  const nextSteps = Array.isArray(audit.nextSteps) ? audit.nextSteps : [];
  const combinedSteps = Array.from(new Set([...recommendations, ...nextSteps])).filter(Boolean);

  // The uplift percentages here were invented constants attached to whatever
  // three recommendations happened to come back. We have no model that
  // predicts traffic or CPC change, so we no longer claim one.
  const actionPlan = combinedSteps.slice(0, 3).map((step, idx) => ({
    stepNumber: idx + 1,
    title: step,
    description: step,
    estimatedLift: '',
    liftColor: 'primary',
  }));

  // Totals come from the same bucket split the report displays, so the
  // headline number always reconciles with the visible findings list.
  const findingSummary = summarizeFindings(mappedIssues);
  const detectedIssuesCount = findingSummary.totalFindings;
  const highPriorityCount = findingSummary.highPriorityConfirmed;

  return {
    storeDomain: storeDomain || report.payload.storeId || '',
    healthScore: score,
    scoreStatus: score === null ? '' : score >= 80 ? 'Excellent' : score >= 60 ? 'Fair' : 'Needs work',
    productsCount: totalProducts,
    limitReached: Boolean(audit.limited ?? report.payload?.limited ?? (totalProducts >= 10000)),
    scanLimit: audit.scanLimit ?? report.payload?.scanLimit ?? null,
    scanned: audit.scanned ?? totalProducts,
    coverage: audit.coverage || null,
    scoring: audit.scoring || null,
    detectedIssuesCount,
    highPriorityCount,
    findingSummary,
    attributeBreakdown,
    // A clean catalog legitimately has zero issues. Falling back to the mock
    // list here meant a perfect store was shown someone else's problems.
    issues: mappedIssues,
    flaggedProducts: [],
    actionPlan,
  };
}

