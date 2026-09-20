const FIELD_META = {
  gtin: { label: 'Product identifiers', icon: 'qr_code_2', channels: ['google', 'meta'] },
  'alt-text': { label: 'Images and alt text', icon: 'image', channels: ['google', 'meta'] },
  description: { label: 'Descriptions', icon: 'subject', channels: ['google', 'meta'] },
  category: { label: 'Product categories', icon: 'account_tree', channels: ['google', 'meta'] },
  sku: { label: 'Titles, variants and SKUs', icon: 'inventory_2', channels: ['google', 'meta'] },
};

export function getReadinessStatus(issue) {
  if (issue.classification === 'eligibility_blocker') return 'blocker';
  return 'attention';
}

export function buildReadinessSignals(auditData) {
  return (auditData.issues || []).map((issue) => {
    const meta = FIELD_META[issue.category] || FIELD_META.sku;
    return {
      ...issue,
      fieldLabel: meta.label,
      icon: meta.icon,
      channels: meta.channels,
      status: getReadinessStatus(issue),
      affectedProducts: issue.affectedItems || [],
    };
  });
}

export function getReadinessSummary(auditData) {
  const signals = buildReadinessSignals(auditData);
  const blocker = signals.filter((signal) => signal.status === 'blocker').reduce((sum, signal) => sum + (signal.count || 0), 0);
  const attention = signals.filter((signal) => signal.status === 'attention').reduce((sum, signal) => sum + (signal.count || 0), 0);
  const uniqueAffected = new Set(signals.flatMap((signal) => signal.affectedProducts.map((item) => item.sku).filter(Boolean))).size;
  const representedCount = signals.reduce((sum, signal) => sum + signal.affectedProducts.length, 0);
  const issueCount = blocker + attention;
  const unrepresentedCount = Math.max(0, issueCount - representedCount);
  const estimatedAffected = Math.min(auditData.productsCount || 0, uniqueAffected + unrepresentedCount);
  return {
    ready: Math.max(0, (auditData.productsCount || 0) - estimatedAffected),
    attention,
    blocker,
  };
}

export function validateGtinFormat(value) {
  const code = String(value || '').trim();
  if (!/^\d+$/.test(code) || ![8, 12, 13, 14].includes(code.length)) return false;
  const digits = code.split('').map(Number);
  const checkDigit = digits.pop();
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === checkDigit;
}
