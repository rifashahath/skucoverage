import React, { useState } from 'react';
import { CatalogIssue } from '../types';

interface BarcodeInspectorViewProps {
  gtinIssue?: CatalogIssue;
  onFixItem: (sku: string) => void;
  onFixAll: (issueId: string) => void;
}

export const BarcodeInspectorView: React.FC<BarcodeInspectorViewProps> = ({
  gtinIssue,
  onFixItem,
  onFixAll,
}) => {
  // Interactive test calculator state
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<{
    valid: boolean;
    type: string;
    message: string;
  } | null>(null);

  const [fixedItems, setFixedItems] = useState<Record<string, boolean>>({});

  // Function to validate modulo-10 check digit (GS1 right-to-left alternate 3/1 weighting)
  const validateBarcode = (code: string) => {
    const clean = code.replace(/\D/g, '');
    if (!clean) {
      setTestResult(null);
      return;
    }

    if (![8, 12, 13, 14].includes(clean.length)) {
      setTestResult({
        valid: false,
        type: 'Invalid Length',
        message: 'Must be 8, 12, 13, or 14 digits (GTIN-8, UPC-A / GTIN-12, EAN-13, or GTIN-14).',
      });
      return;
    }

    // Official GS1 Modulo-10 calculation
    const digits = clean.split('').map(Number);
    const checkDigit = digits[digits.length - 1];
    const body = digits.slice(0, -1);
    let sum = 0;
    let weight = 3;

    for (let i = body.length - 1; i >= 0; i -= 1) {
      sum += body[i] * weight;
      weight = weight === 3 ? 1 : 3;
    }

    const calculatedCheck = (10 - (sum % 10)) % 10;
    const isValid = checkDigit === calculatedCheck;

    const typeName =
      clean.length === 8
        ? 'GTIN-8 (8 digits)'
        : clean.length === 12
        ? 'UPC-A / GTIN-12 (12 digits)'
        : clean.length === 13
        ? 'EAN-13 (13 digits)'
        : 'GTIN-14 (14 digits)';

    setTestResult({
      valid: isValid,
      type: typeName,
      message: isValid
        ? 'Valid format and check digit only. Checksum validity verifies mathematical formatting, but does NOT verify brand ownership, manufacturer assignment, or Google Merchant Center eligibility. Use the verified barcode printed on the packaging or from your GS1 license.'
        : `Invalid check digit! Last digit is ${checkDigit}, but the GS1 Modulo-10 calculation requires ${calculatedCheck}. Do not guess a number — verify against physical product packaging or manufacturer records.`,
    });
  };

  const products = gtinIssue?.affectedItems || [];

  const handleFix = (sku: string) => {
    setFixedItems((prev) => ({ ...prev, [sku]: true }));
    onFixItem(sku);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-16">
      {/* Beginner-Friendly Hero Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#c2c6d6]/40 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eaedff] text-[#0058be] text-[12px] font-bold tracking-wide w-fit">
            <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
            <span>Beginner Guide: GTINs &amp; Barcodes</span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-extrabold text-[#131b2e]">
            GTIN &amp; Barcode Inspector
          </h1>
          <p className="text-[14px] text-[#424754] leading-relaxed">
            <strong>What is a GTIN?</strong> A GTIN is the official 12-digit UPC or 13-digit EAN barcode found under the black-and-white stripes on retail products. Google Shopping <strong>requires</strong> GTINs to display your products in search ads. Missing or invalid barcodes are the #1 cause of feed rejections.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#f2f3ff] border border-[#c2c6d6]/30 flex flex-col gap-2 shrink-0 text-[13px] min-w-[220px]">
          <div className="font-bold text-[#131b2e] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#006c49] text-[18px]">verified</span>
            Why this matters:
          </div>
          <ul className="space-y-1 text-[#424754] text-[12px]">
            <li>• Required for Google Shopping feed approval</li>
            <li>• Prevents ad disapprovals and Merchant Center warnings</li>
            <li>• Ensures accurate matching against structured product catalogs</li>
          </ul>
        </div>
      </div>

      {/* Interactive Live Barcode Tester */}
      <div className="bg-white rounded-3xl p-6 border border-[#c2c6d6]/40 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0058be] text-[22px]">barcode_scanner</span>
            <h2 className="text-[18px] font-extrabold text-[#131b2e]">Test Any Barcode (Live Validator)</h2>
          </div>
          <span className="text-[12px] text-[#727785]">Checks GS1 Modulo-10 algorithm in real time</span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            value={testInput}
            onChange={(e) => {
              setTestInput(e.target.value);
              validateBarcode(e.target.value);
            }}
            placeholder="Type any 8, 12, 13, or 14-digit barcode (e.g. 036000291452)"
            className="flex-1 px-4 py-3 bg-[#f2f3ff] rounded-2xl border border-transparent focus:border-[#0058be] text-[14px] font-mono font-bold text-[#131b2e] outline-hidden"
          />
          <button
            onClick={() => validateBarcode(testInput)}
            className="px-6 py-3 rounded-2xl bg-[#0058be] hover:bg-[#2170e4] text-white font-bold text-[13px] shadow-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>Validate Checksum</span>
          </button>
        </div>

        {testResult && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-[13px] ${
              testResult.valid
                ? 'bg-[#e8f5e9] border-[#a5d6a7] text-[#1b5e20]'
                : 'bg-[#ffebee] border-[#ffcdd2] text-[#b71c1c]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[20px]">
                {testResult.valid ? 'check_circle' : 'error'}
              </span>
              <div>
                <span className="font-bold mr-2">[{testResult.type}]</span>
                <span>{testResult.message}</span>
              </div>
            </div>
            {testResult.valid && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#2e7d32] text-white text-[11px] font-bold shrink-0">
                VALID FORMAT
              </span>
            )}
          </div>
        )}
      </div>

      {/* Flagged Products Needing Barcodes */}
      <div className="bg-white rounded-3xl p-6 border border-[#c2c6d6]/40 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#eaedff]">
          <div>
            <h2 className="text-[18px] font-extrabold text-[#131b2e]">
              Products Needing Barcode Fixes ({gtinIssue?.count || products.length} items)
            </h2>
            <p className="text-[13px] text-[#727785]">
              These products lack valid barcodes and cannot be syndicated to Google Shopping until updated.
            </p>
          </div>

          {products.length > 0 && (
            <button
              onClick={() => onFixAll(gtinIssue?.id || 'issue-missing_gtin')}
              className="px-4 py-2 rounded-full bg-[#0058be] hover:bg-[#2170e4] text-white font-bold text-[13px] flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
              <span>Add all to fix list</span>
            </button>
          )}
        </div>

        {products.length === 0 ? (
          <div className="p-8 text-center bg-[#faf8ff] rounded-2xl border border-[#c2c6d6]/30 flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-[36px] text-[#006c49] mb-1">verified</span>
            <p className="font-bold text-[#131b2e] text-[15px]">No barcode issues found in this audit</p>
            <p className="text-[13px] text-[#727785] mt-1">All audited products either have valid barcodes or custom-item exemptions.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((item) => {
              const isFixed = fixedItems[item.sku];
              return (
                <div
                  key={item.sku}
                  className="p-4 rounded-2xl bg-[#faf8ff] border border-[#c2c6d6]/30 hover:border-[#0058be]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-[#eaedff] text-[#0058be] flex items-center justify-center font-mono text-[11px] font-bold shrink-0">
                      <span className="material-symbols-outlined text-[24px]">qr_code</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-[#131b2e] truncate">
                          {item.productTitle || `Product ID ${item.sku}`}
                        </span>
                        <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-[#c2c6d6]/40 text-[#727785]">
                          ID / SKU: {item.sku}
                        </span>
                      </div>
                      <span className="text-[12px] text-[#ba1a1a] font-medium mt-0.5">
                        {item.issueDetail}
                      </span>
                      <span className="text-[12px] text-[#424754] font-medium mt-0.5">
                        Action required: Verify and supply official barcode from packaging or GS1 license.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {isFixed ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#006c49] bg-[#6ffbbe]/40 px-3 py-1.5 rounded-full">
                        <span className="material-symbols-outlined text-[16px]">check</span>
                        Added to fix list
                      </span>
                    ) : (
                      <button
                        onClick={() => handleFix(item.sku)}
                        className="px-4 py-1.5 rounded-full bg-white hover:bg-[#0058be] hover:text-white text-[#0058be] border border-[#0058be]/30 text-[12px] font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">add_circle</span>
                        <span>Add to fix list</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Helpful FAQ for Beginners */}
      <div className="bg-[#f2f3ff] rounded-3xl p-6 border border-[#c2c6d6]/30 flex flex-col gap-3">
        <h3 className="text-[16px] font-extrabold text-[#131b2e] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#0058be]">help_outline</span>
          Frequently Asked Questions for New Merchants
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px] text-[#424754]">
          <div className="p-4 bg-white rounded-2xl">
            <strong className="text-[#131b2e] block mb-1">Where do I get official barcodes?</strong>
            Buy them from <strong>GS1.org</strong> (the only barcode authority recognized by Google and Amazon). Avoid cheap third-party barcode resale websites, as Google verifies the brand prefix.
          </div>
          <div className="p-4 bg-white rounded-2xl">
            <strong className="text-[#131b2e] block mb-1">What if I sell custom or handmade items?</strong>
            If you manufacture custom products without retail barcodes, you can set <code className="font-mono text-[#0058be]">identifier_exists = false</code> in Shopify to request an exemption from Google.
          </div>
        </div>
      </div>
    </div>
  );
};
