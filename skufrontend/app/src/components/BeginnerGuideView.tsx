import React, { useState } from 'react';

export const BeginnerGuideView: React.FC = () => {
  const [activeAccordion, setActiveAccordion] = useState<number | null>(0);
  const [glossarySearch, setGlossarySearch] = useState('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    step1: true,
    step2: false,
    step3: false,
    step4: false,
    step5: false,
  });

  const toggleCheck = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const guides = [
    {
      title: '1. What is a Catalog Health Score?',
      summary: 'A 0–100 score that measures how complete and accurate your product data is.',
      content: (
        <div className="space-y-3 text-[14px] text-[#424754]">
          <p>
            When you run ads or sell products on Google Shopping, Meta, or TikTok, those platforms read your store&apos;s product feed. If your data is missing barcodes, has blank image descriptions, or lacks proper categories:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Score below 60:</strong> High risk of Google Merchant account suspension.</li>
            <li><strong>Score 60–80:</strong> Products appear, but you pay higher advertising costs (CPC) because Google can&apos;t match them accurately.</li>
            <li><strong>Score 85–100:</strong> Maximum visibility, free Google product listings, and lowest ad cost.</li>
          </ul>
        </div>
      ),
    },
    {
      title: '2. What is a GTIN (barcode), and when does it matter?',
      summary: 'The 12-digit UPC or 13-digit EAN number printed under barcode stripes.',
      content: (
        <div className="space-y-3 text-[14px] text-[#424754]">
          <p>
            <strong>GTIN</strong> stands for <em>Global Trade Item Number</em>. Shopping channels can use this number to identify equivalent products across stores when a manufacturer-assigned identifier exists.
          </p>
          <p>
            For branded retail products, supply the genuine UPC or EAN from the manufacturer or your GS1 registration. Requirements depend on the product and channel configuration. A checksum only checks mathematical format; it does not prove ownership or approval.
          </p>
          <p className="bg-[#eaedff] p-3 rounded-xl text-[#0058be] text-[13px] font-medium">
            💡 <strong>Sell custom/handmade goods?</strong> You can set <code className="font-mono">identifier_exists = false</code> to tell Google this is a unique product that doesn&apos;t have a barcode.
          </p>
        </div>
      ),
    },
    {
      title: '3. What is Image Alt Text and why does it matter?',
      summary: 'A short sentence that describes your photo for search engines and visually impaired buyers.',
      content: (
        <div className="space-y-3 text-[14px] text-[#424754]">
          <p>
            Google&apos;s search crawlers cannot look at an image the way humans do. They read the <code className="font-mono text-[#0058be]">alt=&quot;...&quot;</code> attribute on each photo.
          </p>
          <p>
            Writing good alt text (e.g. <em>&quot;Matte black ceramic coffee dripper on kitchen counter&quot;</em> instead of <em>&quot;IMG_0412.jpg&quot;</em>) helps your products rank in Google Images, which accounts for <strong>over 20% of all online product searches</strong>.
          </p>
        </div>
      ),
    },
    {
      title: '4. What is Google Product Taxonomy?',
      summary: 'Google’s standardized 5,000+ category directory for online retail.',
      content: (
        <div className="space-y-3 text-[14px] text-[#424754]">
          <p>
            Shopify lets you type whatever you want into the &quot;Product Category&quot; box. But Google Shopping only understands its official catalog tree.
          </p>
          <p>
            If you categorize a chef knife as simply &quot;Kitchen&quot;, Google might place your ad under kitchen towels or blenders. Mapping it to <code className="font-mono text-[#0058be]">Home &amp; Garden &gt; Kitchen &amp; Dining &gt; Kitchen Knives (ID: 672)</code> gives the channel a more specific classification signal.
          </p>
        </div>
      ),
    },
  ];

  const glossary = [
    {
      term: 'GTIN',
      meaning: 'Global Trade Item Number. The international standard for product barcodes (UPC in North America, EAN in Europe, ISBN for books).',
    },
    {
      term: 'UPC-A',
      meaning: 'A 12-digit barcode used in the USA and Canada. The 12th digit is a mathematical checksum.',
    },
    {
      term: 'EAN-13',
      meaning: 'A 13-digit barcode used across Europe, UK, and worldwide retail.',
    },
    {
      term: 'Alt Text',
      meaning: 'HTML text describing an image. Critical for ADA web accessibility and Google Image search ranking.',
    },
    {
      term: 'Google Merchant Center',
      meaning: 'The free Google dashboard where e-commerce stores upload product feeds to show up in Google Shopping.',
    },
    {
      term: 'identifier_exists',
      meaning: 'A Google Shopping feed tag. Set to "false" if you sell custom, vintage, or handmade items with no manufacturer barcode.',
    },
    {
      term: 'Modulo-10 Checksum',
      meaning: 'A mathematical check that catches many typing errors. Passing it does not prove GS1 assignment, ownership, or product match.',
    },
  ];

  const filteredGlossary = glossary.filter(
    (g) =>
      g.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
      g.meaning.toLowerCase().includes(glossarySearch.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#c2c6d6]/40 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eaedff] text-[#0058be] text-[12px] font-bold tracking-wide w-fit">
            <span className="material-symbols-outlined text-[16px]">school</span>
            <span>New Merchant Center</span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-extrabold text-[#131b2e]">
            Beginner&apos;s Guide &amp; How SKUcoverage Works
          </h1>
          <p className="text-[14px] text-[#424754] leading-relaxed">
            New to e-commerce catalogs and Google Shopping? Don&apos;t worry! Here is everything you need to know in simple, plain English—no technical jargon.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#f2f3ff] border border-[#c2c6d6]/30 flex flex-col gap-1.5 shrink-0 text-[13px] min-w-[200px]">
          <span className="font-bold text-[#131b2e]">Need extra help?</span>
          <span className="text-[#424754] text-[12px]">All diagnostics on your store are 100% read-only and safe.</span>
        </div>
      </div>

      {/* Step by Step Guides Accordion */}
      <div className="bg-white rounded-3xl p-6 border border-[#c2c6d6]/40 shadow-xs flex flex-col gap-4">
        <h2 className="text-[18px] font-extrabold text-[#131b2e]">
          The 4 Concepts Every Store Owner Must Know
        </h2>

        <div className="space-y-3">
          {guides.map((guide, idx) => {
            const isOpen = activeAccordion === idx;
            return (
              <div
                key={idx}
                className="border border-[#c2c6d6]/30 rounded-2xl overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setActiveAccordion(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 bg-[#faf8ff] hover:bg-[#f2f3ff] transition-colors cursor-pointer"
                >
                  <div>
                    <h3 className="text-[15px] font-bold text-[#131b2e]">{guide.title}</h3>
                    <p className="text-[12px] text-[#727785] mt-0.5">{guide.summary}</p>
                  </div>
                  <span className="material-symbols-outlined text-[#0058be] shrink-0">
                    {isOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {isOpen && (
                  <div className="p-5 bg-white border-t border-[#eaedff] animate-in fade-in duration-150">
                    {guide.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Ready-for-Google Checklist */}
      <div className="bg-white rounded-3xl p-6 border border-[#c2c6d6]/40 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-[#eaedff]">
          <div>
            <h2 className="text-[18px] font-extrabold text-[#131b2e]">
              Store Readiness Checklist
            </h2>
            <p className="text-[13px] text-[#727785]">
              Tick off each step as you optimize your Shopify catalog for Google Shopping.
            </p>
          </div>
          <span className="text-[12px] font-bold text-[#0058be] bg-[#eaedff] px-3 py-1 rounded-full">
            {Object.values(checklist).filter(Boolean).length} / 5 Done
          </span>
        </div>

        <div className="space-y-2">
          {[
            { key: 'step1', title: 'Run a SKUcoverage catalog audit', desc: 'Identifies all missing barcodes and unmapped categories in seconds.' },
            { key: 'step2', title: 'Add barcodes (UPC/EAN) to active products', desc: 'Improves identifier data where a genuine manufacturer barcode exists.' },
            { key: 'step3', title: 'Add descriptive image alt text', desc: 'Ranks product photos on Google Images and satisfies accessibility standards.' },
            { key: 'step4', title: 'Verify Google Product Taxonomy categories', desc: 'Prevents wasted ad spend and high CPC bid rates.' },
            { key: 'step5', title: 'Export the review CSV', desc: 'Review affected fields, update verified values in Shopify, then scan again.' },
          ].map((item) => {
            const isChecked = checklist[item.key];
            return (
              <div
                key={item.key}
                onClick={() => toggleCheck(item.key)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                  isChecked
                    ? 'bg-[#f0fdf4] border-[#bbf7d0]'
                    : 'bg-[#faf8ff] border-[#c2c6d6]/30 hover:bg-[#f2f3ff]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                    isChecked ? 'bg-[#15803d] text-white' : 'border border-[#c2c6d6]'
                  }`}
                >
                  {isChecked && (
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  )}
                </div>
                <div className="flex flex-col">
                  <span
                    className={`text-[14px] font-bold ${
                      isChecked ? 'line-through text-[#15803d]' : 'text-[#131b2e]'
                    }`}
                  >
                    {item.title}
                  </span>
                  <span className="text-[12px] text-[#727785] mt-0.5">{item.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Searchable Glossary of E-commerce Terms */}
      <div className="bg-white rounded-3xl p-6 border border-[#c2c6d6]/40 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-extrabold text-[#131b2e]">
              E-Commerce Glossary (Plain English)
            </h2>
            <p className="text-[13px] text-[#727785]">
              Confused by an acronym? Search our plain-language definitions.
            </p>
          </div>
          <div className="relative min-w-[240px]">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#727785] text-[18px]">
              search
            </span>
            <input
              type="text"
              value={glossarySearch}
              onChange={(e) => setGlossarySearch(e.target.value)}
              placeholder="Search terms (e.g. GTIN, UPC)..."
              className="w-full pl-9 pr-3 py-2 bg-[#f2f3ff] rounded-xl text-[13px] font-medium text-[#131b2e] outline-hidden focus:border-[#0058be]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredGlossary.map((item) => (
            <div
              key={item.term}
              className="p-4 rounded-2xl bg-[#faf8ff] border border-[#c2c6d6]/20 flex flex-col gap-1"
            >
              <span className="font-extrabold text-[14px] text-[#0058be]">
                {item.term}
              </span>
              <p className="text-[13px] text-[#424754] leading-relaxed">
                {item.meaning}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
