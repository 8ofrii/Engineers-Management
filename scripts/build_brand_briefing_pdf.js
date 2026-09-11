const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Hesaby.ai — Brand Design Briefing & Visual Identity Specification</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=Cairo:wght@400;600;700;800&family=Caveat:wght@600;700&family=Inter+Tight:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">

<style>
  :root {
    --accent: #ff5a1f;
    --accent-light: #ff8a50;
    --accent-dark: #c2410c;
    --bg-dark: #08080a;
    --panel-dark: #0e0e12;
    --panel-dark-2: #15151b;
    --border-dark: rgba(255, 255, 255, 0.12);
    --text-dark: #f5f4f0;
    --text-dark-muted: #a8a29e;
    
    --bg-light: #fcfbfa;
    --cafe-bg: #ece5d6;
    --cafe-panel: #f7f1e5;
    --cafe-border: #d8cbaf;
    --cafe-text: #1c1710;
    --cafe-muted: #6b5f4d;

    --font-sans: 'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --font-arabic: 'Cairo', 'Inter Tight', sans-serif;
    --font-hand: 'Caveat', cursive;
    --font-arabic-hand: 'Aref Ruqaa', serif;
    --font-mono: 'JetBrains Mono', monospace;
  }

  @page {
    size: A4 portrait;
    margin: 14mm 12mm 16mm 12mm;
    @bottom-center {
      content: "Hesaby.ai Brand Identity Briefing · Open Creative Mandate";
      font-family: 'Inter Tight', sans-serif;
      font-size: 8pt;
      color: #888;
    }
    @bottom-right {
      content: counter(page);
      font-family: 'Inter Tight', sans-serif;
      font-size: 8pt;
      font-weight: 700;
      color: #ff5a1f;
    }
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: var(--font-sans);
    font-size: 9.5pt;
    line-height: 1.55;
    color: #1c1710;
    background-color: #ffffff;
    -webkit-font-smoothing: antialiased;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Cover / Title Block */
  .cover-block {
    padding: 26px 30px;
    background: linear-gradient(135deg, #09090c 0%, #121217 60%, #1e130e 100%);
    border-radius: 14px;
    color: #f5f4f0;
    margin-bottom: 22px;
    border: 1px solid rgba(255, 90, 31, 0.25);
    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
    break-inside: avoid;
    position: relative;
    overflow: hidden;
  }
  .cover-block::after {
    content: '';
    position: absolute;
    top: -60px;
    right: -40px;
    width: 240px;
    height: 240px;
    background: radial-gradient(circle, rgba(255, 90, 31, 0.2) 0%, transparent 70%);
    pointer-events: none;
  }

  .cover-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .cover-masthead {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }
  .masthead-title {
    font-size: 24pt;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: #ffffff;
  }
  .masthead-title span.ai {
    color: #ff8a50;
  }
  .masthead-ar {
    font-family: var(--font-arabic);
    font-size: 19pt;
    font-weight: 700;
    color: #d6cbba;
  }

  .badge-tag {
    display: inline-block;
    padding: 4px 10px;
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    border-radius: 20px;
    background: rgba(255, 90, 31, 0.18);
    color: #ff8a50;
    border: 1px solid rgba(255, 90, 31, 0.35);
  }

  .cover-title {
    font-size: 22pt;
    font-weight: 800;
    line-height: 1.18;
    letter-spacing: -0.03em;
    margin-bottom: 8px;
    color: #ffffff;
  }
  .cover-title span.hl {
    color: #ff8a50;
  }

  .cover-subtitle {
    font-size: 10.2pt;
    color: #c5bfb6;
    font-weight: 400;
    max-width: 95%;
    margin-bottom: 18px;
    line-height: 1.5;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    padding-top: 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  .meta-item {
    display: flex;
    flex-direction: column;
  }
  .meta-label {
    font-size: 6.8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #ff8a50;
    margin-bottom: 2px;
  }
  .meta-value {
    font-size: 8.5pt;
    color: #eae7e1;
    font-weight: 500;
  }

  /* Typography & Sections */
  h2 {
    font-size: 13pt;
    font-weight: 800;
    letter-spacing: -0.025em;
    color: #12100d;
    margin: 18px 0 10px 0;
    padding-bottom: 5px;
    border-bottom: 2px solid #ff5a1f;
    display: flex;
    align-items: center;
    gap: 8px;
    break-after: avoid;
  }
  h2 .num {
    color: #ff5a1f;
  }

  h3 {
    font-size: 10.2pt;
    font-weight: 750;
    letter-spacing: -0.015em;
    color: #26211a;
    margin: 12px 0 6px 0;
    break-after: avoid;
  }

  h4 {
    font-size: 9pt;
    font-weight: 700;
    color: #40372b;
    margin: 10px 0 4px 0;
    break-after: avoid;
  }

  p {
    margin-bottom: 8px;
    color: #332b21;
    line-height: 1.55;
  }

  .lead-box {
    background: #fff8f5;
    border-left: 3px solid #ff5a1f;
    padding: 10px 14px;
    border-radius: 0 8px 8px 0;
    margin: 10px 0 14px 0;
    font-size: 9.2pt;
    color: #4a281b;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px 0;
    font-size: 8.5pt;
    background: #ffffff;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e8e2d5;
    break-inside: avoid;
  }
  thead {
    background: #f7f4ed;
    border-bottom: 1.5px solid #ded6c5;
  }
  th {
    padding: 7px 10px;
    text-align: left;
    font-weight: 700;
    color: #2c251d;
    letter-spacing: -0.01em;
  }
  td {
    padding: 6.5px 10px;
    border-bottom: 1px solid #efeae0;
    color: #383025;
    vertical-align: top;
  }
  tr:last-child td {
    border-bottom: none;
  }
  tr:nth-child(even) td {
    background-color: #faf8f5;
  }

  /* Code & Token Blocks */
  code {
    font-family: var(--font-mono);
    font-size: 8pt;
    background: #f1ecdf;
    padding: 1px 5px;
    border-radius: 4px;
    color: #92340e;
  }
  pre {
    background: #0d0d12;
    color: #e2dfd9;
    padding: 10px 14px;
    border-radius: 8px;
    font-family: var(--font-mono);
    font-size: 7.8pt;
    line-height: 1.45;
    overflow-x: auto;
    margin: 8px 0 12px 0;
    border: 1px solid rgba(255,255,255,0.08);
    break-inside: avoid;
  }

  /* Color Swatches Grid */
  .swatch-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin: 10px 0 14px 0;
    break-inside: avoid;
  }
  .swatch-grid-4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 9px;
    margin: 10px 0 14px 0;
    break-inside: avoid;
  }
  .swatch-card {
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e2dbce;
    background: #ffffff;
    box-shadow: 0 2px 6px rgba(0,0,0,0.03);
    display: flex;
    flex-direction: column;
  }
  .swatch-color {
    height: 38px;
    width: 100%;
    position: relative;
    border-bottom: 1px solid rgba(0,0,0,0.05);
  }
  .swatch-details {
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .swatch-name {
    font-size: 7.8pt;
    font-weight: 700;
    color: #1f1a14;
  }
  .swatch-hex {
    font-family: var(--font-mono);
    font-size: 7.2pt;
    color: #665b4d;
    font-weight: 600;
  }
  .swatch-role {
    font-size: 6.8pt;
    color: #8c7e6b;
    line-height: 1.25;
  }

  /* Concept Cards Grid for Open Logo Brief */
  .concept-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin: 12px 0 16px 0;
    break-inside: avoid;
  }
  .concept-card {
    border-radius: 10px;
    padding: 14px;
    border: 1px solid #e0d7c7;
    background: #fdfcf9;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .concept-card.highlight {
    border-color: #ff9d6b;
    background: #fffbf9;
  }
  .concept-tag {
    font-size: 7pt;
    font-weight: 750;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #c2410c;
  }
  .concept-title {
    font-size: 9.5pt;
    font-weight: 800;
    color: #1c1710;
  }
  .concept-body {
    font-size: 8pt;
    color: #554a3c;
    line-height: 1.45;
  }

  /* Component Previews */
  .component-preview-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin: 10px 0 14px 0;
    break-inside: avoid;
  }
  .comp-card {
    border: 1px solid #e2dacf;
    background: #faf8f5;
    border-radius: 10px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .comp-title {
    font-size: 8.2pt;
    font-weight: 750;
    color: #26211a;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  /* Fire Button Simulation */
  .sim-fire-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 999px;
    background: linear-gradient(180deg, #ff7040 0%, #f04e00 60%, #d63a00 100%);
    color: #ffffff;
    padding: 8px 18px;
    font-weight: 650;
    font-size: 8.5pt;
    box-shadow: 0 4px 16px rgba(255, 90, 31, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.35);
    border: none;
    cursor: default;
    width: fit-content;
  }

  /* Tubelight Nav Simulation */
  .sim-tubelight-nav {
    display: inline-flex;
    align-items: center;
    background: rgba(14, 14, 18, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    padding: 4px 6px;
    gap: 4px;
  }
  .sim-nav-item {
    padding: 5px 12px;
    font-size: 7.6pt;
    font-weight: 600;
    color: #a8a29e;
    border-radius: 999px;
    position: relative;
  }
  .sim-nav-item.active {
    color: #ffffff;
    background: rgba(255, 90, 31, 0.2);
    box-shadow: 0 0 12px rgba(255, 90, 31, 0.4);
  }
  .sim-nav-item.active::before {
    content: '';
    position: absolute;
    top: -2px;
    left: 50%;
    transform: translateX(-50%);
    width: 14px;
    height: 2px;
    background: #ff8a50;
    border-radius: 2px;
    box-shadow: 0 0 6px #ff5a1f;
  }

  /* Sky Toggle Simulation */
  .sim-sky-toggle {
    width: 60px;
    height: 28px;
    border-radius: 999px;
    background: linear-gradient(135deg, #1b2845 0%, #274060 100%);
    position: relative;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.4);
    border: 1px solid rgba(255,255,255,0.15);
  }
  .sim-sky-knob {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #fff8db;
    position: absolute;
    top: 2px;
    right: 3px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.4), 0 0 8px #ffdf70;
  }

  /* Callout Alert */
  .alert-box {
    border: 1px solid #ffd5c4;
    background: #fff6f2;
    border-radius: 8px;
    padding: 10px 14px;
    margin: 10px 0;
    break-inside: avoid;
  }
  .alert-box.important {
    border-left: 4px solid #ff5a1f;
  }
  .alert-title {
    font-size: 8.5pt;
    font-weight: 750;
    color: #c2410c;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* Checklist */
  .check-list {
    list-style: none;
    margin: 8px 0 12px 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 8.5pt;
  }
  .check-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    color: #332b21;
  }
  .check-box {
    width: 13px;
    height: 13px;
    border: 1.5px solid #ff5a1f;
    border-radius: 3px;
    flex-shrink: 0;
    margin-top: 2px;
    background: #ffffff;
  }

  /* Print Page Utilities */
  .page-break {
    break-before: page;
  }
  .no-break {
    break-inside: avoid;
  }

  .arabic-sample {
    font-family: var(--font-arabic);
    direction: rtl;
    text-align: right;
  }
  .arabic-hand-sample {
    font-family: var(--font-arabic-hand);
    direction: rtl;
    text-align: right;
    font-size: 13pt;
  }
  .hand-sample {
    font-family: var(--font-hand);
    font-size: 13pt;
  }

  .footer-signoff {
    margin-top: 24px;
    padding-top: 14px;
    border-top: 1px solid #ded7c8;
    font-size: 7.8pt;
    color: #786e60;
    display: flex;
    justify-content: space-between;
    align-items: center;
    break-inside: avoid;
  }
</style>
</head>
<body>

  <!-- COVER / HERO BLOCK -->
  <div class="cover-block">
    <div class="cover-header">
      <div class="cover-masthead">
        <span class="masthead-title">Hesaby<span class="ai">.ai</span></span>
        <span class="masthead-ar">حسابي</span>
      </div>
      <div class="badge-tag">Brand Design Briefing · v2.0</div>
    </div>

    <div class="cover-title">
      New Brand Identity & Logo System <span class="hl">Creative Brief</span>
    </div>

    <div class="cover-subtitle">
      A comprehensive design briefing and technical specification for brand designers, creative agencies, and AI design systems. Built to inspire bold, original visual concepts connecting dusty construction job sites to high-precision financial ledgers.
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">Project</span>
        <span class="meta-value">Hesaby.ai (Construction ERP)</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Core Mission</span>
        <span class="meta-value">The Site-to-Office Live Ledger</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Mandate</span>
        <span class="meta-value">100% Open Creative Exploration</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Target Market</span>
        <span class="meta-value">Egypt (Bilingual AR / EN)</span>
      </div>
    </div>
  </div>

  <!-- SECTION 1: COMPANY & PRODUCT -->
  <div class="section">
    <h2><span class="num">1.</span> Company & Product Mission</h2>
    
    <h3>1.1 What Hesaby Is</h3>
    <p>
      <strong>Hesaby</strong> (<span class="arabic-sample" style="font-weight:700;">حسابي</span>, Arabic for <em>"my account / my calculation / my ledger"</em>) is an AI-powered construction ERP system built specifically for Egyptian contractors, site engineers, and construction firm owners. It is the <strong>site-to-office live ledger</strong> — the single operational bridge that connects the dusty, fast-moving reality of a construction site to the financial rigour and compliance of the back-office.
    </p>

    <h3>1.2 The Problem It Solves</h3>
    <p>
      Egyptian construction traditionally operates on crumpled paper receipts, unlogged cash advances, fragmented WhatsApp voice notes, and bloated Excel sheets. Every weekend, site engineers and accountants spend grueling hours reconciling what was spent, who authorized it, and which project safe it impacts. Receipts fade or vanish in pockets. Three conflicting versions of the financial truth exist simultaneously (site logs, office accounts, bank statements). Contractors rarely discover true project cost overruns until project completion.
    </p>
    <div class="lead-box">
      <strong>The Hesaby Solution:</strong> Replace fragmentation with a single real-time ledger. Engineers photograph a paper receipt or speak an Egyptian Arabic voice note; the AI engine parses vendors, amounts, materials, and 14% Egyptian VAT, instantly updating project safe balances with granular audit trails and hierarchical approval gates.
    </div>

    <h3>1.3 Target Users & Operational Context</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 22%;">Role</th>
          <th style="width: 38%;">Operational Environment & Context</th>
          <th style="width: 40%;">Primary Needs & Pain Points</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Site Engineer</strong></td>
          <td>Directly on active job sites, 40°C summer heat, gloves, sun glare, dusty smartphones.</td>
          <td>Rapid 1-hand receipt capture, offline logging, instant custody balance display before spending.</td>
        </tr>
        <tr>
          <td><strong>Project Manager</strong></td>
          <td>Traveling between 3–10 simultaneous sites, car laptop, brief site visits.</td>
          <td>Real-time project cost vs. budget variance, instantaneous multi-tier expense approvals.</td>
        </tr>
        <tr>
          <td><strong>General Manager / Owner</strong></td>
          <td>Corporate boardroom or executive mobile review.</td>
          <td>Net profit margins per project, supervision fees, cash liquidity, company-wide safety.</td>
        </tr>
        <tr>
          <td><strong>Financial Manager</strong></td>
          <td>Head office accounting desk, multi-screen environment.</td>
          <td>Double-entry ledger integrity, Egyptian 14% VAT compliance, CSV bank reconciliation.</td>
        </tr>
      </tbody>
    </table>

    <div class="component-preview-row">
      <div class="comp-card">
        <div class="comp-title"><span>Market & Geography</span> <span class="badge-tag">Regional</span></div>
        <p style="font-size: 8pt; margin: 0;">
          • <strong>Primary:</strong> Egypt (Egyptian Pound EGP, 14% VAT, Egyptian Arabic dialect).<br>
          • <strong>Expansion:</strong> GCC firms with active Egyptian development branches.<br>
          • <strong>Language Hierarchy:</strong> Arabic (RTL) first, English (LTR) second.
        </p>
      </div>
      <div class="comp-card">
        <div class="comp-title"><span>Product Ecosystem Surfaces</span> <span class="badge-tag">Full-Stack</span></div>
        <p style="font-size: 8pt; margin: 0;">
          • <strong>Web Application:</strong> React 19 + Vite + Tailwind CSS (Production at <code>hesaby.aimicromind.com</code>).<br>
          • <strong>Mobile Companion:</strong> React Native + Expo SDK 54 (iOS & Android).<br>
          • <strong>AI Engine:</strong> Multimodal Gemini OCR + Contextual Arabic Audio Parsing.
        </p>
      </div>
    </div>
  </div>

  <!-- SECTION 2: BRAND NAME & DOMAIN -->
  <div class="section page-break">
    <h2><span class="num">2.</span> Brand Name & Nomenclature</h2>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 10px 0;">
      <div class="comp-card">
        <div class="comp-title"><span>Nomenclature Structure</span></div>
        <p style="font-size: 8.2pt; line-height: 1.6; margin: 0;">
          • <strong>English:</strong> Hesaby<br>
          • <strong>Arabic:</strong> <span class="arabic-sample" style="font-weight:700; font-size:11pt;">حسابي</span><br>
          • <strong>Domain / Suffix:</strong> <code>Hesaby.ai</code><br>
          • <strong>Pronunciation:</strong> /heh-SAH-bee/ (cadence stress on second syllable)
        </p>
      </div>
      <div class="comp-card">
        <div class="comp-title"><span>Cultural & Linguistic Meaning</span></div>
        <p style="font-size: 8.2pt; line-height: 1.5; margin: 0;">
          "حسابي" in Arabic literally translates to <em>"my account"</em> or <em>"my calculation"</em>. In Egyptian colloquial speech, it carries an unmistakable aura of accountability and ownership: <em>"On my reckoning"</em>. It connects rigorous financial science with personal responsibility on the job site.
        </p>
      </div>
    </div>

    <h3>Brand Name Usage Rules</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 30%;">Form</th>
          <th style="width: 35%;">Permitted Usage</th>
          <th style="width: 35%;">Strictly Prohibited</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Full Brand Name</strong></td>
          <td><code>Hesaby.ai</code> (with <code>.ai</code> rendered in Ember Orange accent)</td>
          <td><code>hesaby.ai</code> (all lowercase), <code>HESABY.AI</code></td>
        </tr>
        <tr>
          <td><strong>Standalone Name</strong></td>
          <td><code>Hesaby</code> or <span class="arabic-sample" style="font-weight:700;">حسابي</span></td>
          <td><code>HESABY</code>, <code>hesaby</code>, <code>He.Saby</code>, <code>Hesaby-ERP</code></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- SECTION 3: OPEN LOGO & BRAND IDENTITY BRIEF -->
  <div class="section">
    <h2><span class="num">3.</span> Logo & Visual Identity Creative Brief (Open Exploration)</h2>
    
    <div class="alert-box important">
      <div class="alert-title">Open Creative Mandate</div>
      <p style="font-size: 8.2pt; margin: 0;">
        <strong>Total Creative Freedom:</strong> The brand identity and logo mark for Hesaby are completely open for fresh conceptualization and original creative exploration. Do not copy or default to any existing template. We seek original, bold, iconic concepts that establish Hesaby as the definitive standard for Egyptian and regional construction technology.
      </p>
    </div>

    <h3>3.1 What the New Mark Must Express</h3>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 10px 0;">
      <div class="comp-card">
        <div class="comp-title"><span>1. The Dual Nature of the Business</span></div>
        <p style="font-size: 8pt; margin: 0;">
          The tangible bridge between the <strong>dusty physical job site</strong> and the <strong>rigorous corporate ledger</strong>; between site custody cash and official bank statements; between Egypt's deep building craftsmanship and modern AI-driven velocity.
        </p>
      </div>
      <div class="comp-card">
        <div class="comp-title"><span>2. Solidity & Structural Permanence</span></div>
        <p style="font-size: 8pt; margin: 0;">
          The mark must feel load-bearing, permanent, and architectural — like something cast in reinforced concrete or forged in structural steel, not a lightweight or generic web icon.
        </p>
      </div>
      <div class="comp-card">
        <div class="comp-title"><span>3. Financial Precision & Institutional Trust</span></div>
        <p style="font-size: 8pt; margin: 0;">
          Contractors and owners entrust tens of millions of Egyptian Pounds to this software. The mark must inspire absolute audit-grade reliability and fiscal integrity.
        </p>
      </div>
      <div class="comp-card">
        <div class="comp-title"><span>4. Bilingual & Cultural Harmony</span></div>
        <p style="font-size: 8pt; margin: 0;">
          It must feel completely natural in an authentic Arabic context (<span class="arabic-sample">حسابي</span>) as well as an international Latin context (Hesaby.ai).
        </p>
      </div>
    </div>

    <h3>3.2 Four Conceptual Directions to Explore</h3>
    <div class="concept-grid">
      <div class="concept-card highlight">
        <span class="concept-tag">Direction A · Architectural</span>
        <div class="concept-title">Structural Geometry & Load-Bearing Form</div>
        <div class="concept-body">
          Metaphors of structural foundations, intersecting steel I-beams, architectural balance, modular grid systems, and load distribution. Heavy, structural, architectural, engineering-grade.
        </div>
      </div>

      <div class="concept-card">
        <span class="concept-tag">Direction B · Financial</span>
        <div class="concept-title">The Sovereign Ledger & Dynamic Equilibrium</div>
        <div class="concept-body">
          Visual metaphors of double-entry accounting balance sheets, T-accounts, dynamic capital flow between site and office, ascending project profit margins, and indelible audit seals.
        </div>
      </div>

      <div class="concept-card">
        <span class="concept-tag">Direction C · Typographic</span>
        <div class="concept-title">Bilingual Monogram & Cultural Ligature</div>
        <div class="concept-body">
          An abstract fusion of the Arabic letter <strong>ح</strong> (Haa) with the Latin letter <strong>H</strong>, or a proprietary geometric ligature uniting Arabic calligraphy with Swiss minimalist precision.
        </div>
      </div>

      <div class="concept-card">
        <span class="concept-tag">Direction D · Tool</span>
        <div class="concept-title">The Precision Site Instrument & Seal</div>
        <div class="concept-body">
          The concept of an architect's indelible stamp, a surveyor's laser alignment tool, or a master contractor's signet. Rugged, professional, tool-like, and authoritative.
        </div>
      </div>
    </div>

    <h3>3.3 Visual Identity Guardrails</h3>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px;">
      <div class="alert-box" style="background: #fff0f0; border-color: #ffd1d1; margin: 0;">
        <div class="alert-title" style="color: #b91c1c;">Strictly Avoid (Visual Clichés)</div>
        <p style="font-size: 7.8pt; color: #7f1d1d; margin: 0;">
          ❌ <strong>No cartoon hardhats or safety helmets</strong> (patronizing to real engineers).<br>
          ❌ <strong>No generic cranes, brick walls, or house icons</strong> (looks like a handyman service).<br>
          ❌ <strong>No generic gears or cogwheels</strong> (dated industrial cliché).<br>
          ❌ <strong>No generic fintech swooshes or floating AI sparkles</strong> (cheap SaaS trope).
        </p>
      </div>

      <div class="alert-box" style="background: #f0fdf4; border-color: #bbf7d0; margin: 0;">
        <div class="alert-title" style="color: #15803d;">Technical Success Criteria</div>
        <p style="font-size: 7.8pt; color: #166534; margin: 0;">
          ✔ <strong>Extreme Scale Range:</strong> Instantly readable at 16×16px (favicon) up to billboard scale.<br>
          ✔ <strong>Monochrome Test:</strong> 100% recognizable in pure solid black and solid white.<br>
          ✔ <strong>Grid Rigour:</strong> Built on disciplined mathematical geometry and proportion.<br>
          ✔ <strong>Tactile Feel:</strong> Looks stunning embossed on leather, cast on steel, or in glowing dark-mode UI.
        </p>
      </div>
    </div>
  </div>

  <!-- SECTION 4: COLOUR SYSTEM -->
  <div class="section page-break">
    <h2><span class="num">4.</span> Color System — "Ember Dark & Café Light"</h2>
    
    <p>
      Hesaby explicitly avoids sterile corporate blues and cold SaaS purples. The color system reflects the tactile atmosphere of construction: <strong>warm glowing embers</strong> on an evening job site, and <strong>warm parchment accounting paper</strong>.
    </p>

    <h3>4.1 Primary Brand Core — Ember Orange</h3>
    <div class="swatch-grid">
      <div class="swatch-card">
        <div class="swatch-color" style="background: #ff5a1f;"></div>
        <div class="swatch-details">
          <span class="swatch-name">Ember Orange (Primary)</span>
          <span class="swatch-hex">#FF5A1F</span>
          <span class="swatch-role">CTAs, active tabs, brand focus rings</span>
        </div>
      </div>
      <div class="swatch-card">
        <div class="swatch-color" style="background: #c2410c;"></div>
        <div class="swatch-details">
          <span class="swatch-name">Ember Dark</span>
          <span class="swatch-hex">#C2410C</span>
          <span class="swatch-role">Light-mode CTAs, hover & pressed states</span>
        </div>
      </div>
      <div class="swatch-card">
        <div class="swatch-color" style="background: #ff8a50;"></div>
        <div class="swatch-details">
          <span class="swatch-name">Ember Light</span>
          <span class="swatch-hex">#FF8A50</span>
          <span class="swatch-role">Dark-mode text accents, .ai suffix, glow highlights</span>
        </div>
      </div>
    </div>

    <h3>4.2 Ember Dark Mode (Field & Night Operation)</h3>
    <div class="swatch-grid-4">
      <div class="swatch-card">
        <div class="swatch-color" style="background: #08080a; border: 1px solid #222;"></div>
        <div class="swatch-details">
          <span class="swatch-name">Shell Canvas</span>
          <span class="swatch-hex">#08080A</span>
          <span class="swatch-role">Primary dark background</span>
        </div>
      </div>
      <div class="swatch-card">
        <div class="swatch-color" style="background: #0e0e12; border: 1px solid #333;"></div>
        <div class="swatch-details">
          <span class="swatch-name">Card Panel</span>
          <span class="swatch-hex">#0E0E12</span>
          <span class="swatch-role">Card surfaces, sidebars</span>
        </div>
      </div>
      <div class="swatch-card">
        <div class="swatch-color" style="background: #15151b; border: 1px solid #444;"></div>
        <div class="swatch-details">
          <span class="swatch-name">Nested Surface</span>
          <span class="swatch-hex">#15151B</span>
          <span class="swatch-role">Inner table rows, inputs</span>
        </div>
      </div>
      <div class="swatch-card">
        <div class="swatch-color" style="background: #f5f4f0;"></div>
        <div class="swatch-details">
          <span class="swatch-name">Warm Off-White</span>
          <span class="swatch-hex">#F5F4F0</span>
          <span class="swatch-role">Dark-mode primary text (never #fff)</span>
        </div>
      </div>
    </div>

    <h3>4.3 Café Light Mode (Paper Ledger Accounting)</h3>
    <div class="swatch-grid-4">
      <div class="swatch-card">
        <div class="swatch-color" style="background: #ece5d6;"></div>
        <div class="swatch-details">
          <span class="swatch-name">Café Canvas</span>
          <span class="swatch-hex">#ECE5D6</span>
          <span class="swatch-role">Parchment background</span>
        </div>
      </div>
      <div class="swatch-card">
        <div class="swatch-color" style="background: #f7f1e5;"></div>
        <div class="swatch-details">
          <span class="swatch-name">Cream Panel</span>
          <span class="swatch-hex">#F7F1E5</span>
          <span class="swatch-role">Card surfaces, panels</span>
        </div>
      </div>
      <div class="swatch-card">
        <div class="swatch-color" style="background: #d8cbaf;"></div>
        <div class="swatch-details">
          <span class="swatch-name">Tan Border</span>
          <span class="swatch-hex">#D8CBAF</span>
          <span class="swatch-role">Subtle dividers & borders</span>
        </div>
      </div>
      <div class="swatch-card">
        <div class="swatch-color" style="background: #1c1710;"></div>
        <div class="swatch-details">
          <span class="swatch-name">Walnut Ink</span>
          <span class="swatch-hex">#1C1710</span>
          <span class="swatch-role">Light-mode text (never #000)</span>
        </div>
      </div>
    </div>

    <h3>4.4 Semantic Palette & Status States</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 20%;">Semantic State</th>
          <th style="width: 25%;">Dark Mode Token</th>
          <th style="width: 25%;">Light Mode Token</th>
          <th style="width: 30%;">Operational Usage</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Success / Matched</strong></td>
          <td><code>#22C55E</code> (Emerald)</td>
          <td><code>#16A34A</code> (Deep Green)</td>
          <td>Approved expenses, balanced custody, matched bank statement rows.</td>
        </tr>
        <tr>
          <td><strong>Danger / Overspent</strong></td>
          <td><code>#EF4444</code> (Red)</td>
          <td><code>#DC2626</code> (Deep Crimson)</td>
          <td>Overspent budget limits, rejected transactions, OCR confidence warnings.</td>
        </tr>
        <tr>
          <td><strong>Warning / Pending</strong></td>
          <td><code>#EAB308</code> (Amber)</td>
          <td><code>#D97706</code> (Warm Ocher)</td>
          <td>Pending GM sign-off, low inventory thresholds, unassigned custody.</td>
        </tr>
        <tr>
          <td><strong>Fire Glow</strong></td>
          <td><code>rgba(255,90,31,0.45)</code></td>
          <td><code>rgba(194,65,12,0.25)</code></td>
          <td>Ambient specular highlights and CTA drop-shadow halos.</td>
        </tr>
      </tbody>
    </table>

    <div class="alert-box important">
      <div class="alert-title">Strict Color Prohibitions ("The Color Don'ts")</div>
      <p style="font-size: 8pt; margin: 0;">
        1. <strong>No Cold Blue / Tech Violet:</strong> Hesaby must never look like a generic fintech app or Discord/Slack clone.<br>
        2. <strong>No Raw #000000 or Pure #FFFFFF:</strong> All dark surfaces must preserve warm undertones; light surfaces must evoke tangible tactile paper.<br>
        3. <strong>Monochrome Restraint:</strong> Ember Orange is the single chromatic hero. Never introduce supplementary purple, cyan, or pink brand elements.
      </p>
    </div>
  </div>

  <!-- SECTION 5: TYPOGRAPHY -->
  <div class="section page-break">
    <h2><span class="num">5.</span> Typography & Multi-Script Architecture</h2>

    <p>
      The typography system is engineered for dual-script symmetry (Latin & Arabic), high-density data tables, and rapid legibility under direct sunlight.
    </p>

    <h3>5.1 Primary Font Stacks</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 20%;">Tier</th>
          <th style="width: 25%;">Font Family</th>
          <th style="width: 25%;">Script / Role</th>
          <th style="width: 30%;">Weight Distribution</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Primary Latin</strong></td>
          <td><strong>Inter Tight</strong></td>
          <td>English headlines, UI labels, buttons, metrics</td>
          <td>300 (Light) to 800 (Extra Bold)</td>
        </tr>
        <tr>
          <td><strong>Primary Arabic</strong></td>
          <td><strong>Cairo</strong></td>
          <td>Arabic headlines, body copy, form fields, badges</td>
          <td>400 (Regular) to 800 (Extra Bold)</td>
        </tr>
        <tr>
          <td><strong>Handwritten Latin</strong></td>
          <td><strong>Caveat</strong></td>
          <td>Accent headline phrases ("Never lose a record.")</td>
          <td>600, 700 (Semi / Bold)</td>
        </tr>
        <tr>
          <td><strong>Calligraphic Arabic</strong></td>
          <td><strong>Aref Ruqaa</strong></td>
          <td>Accent Arabic phrases (<span class="arabic-sample">"ولا قيد يضيع."</span>)</td>
          <td>700 (Bold)</td>
        </tr>
        <tr>
          <td><strong>Data & Numbers</strong></td>
          <td><strong>JetBrains Mono</strong> / Inter</td>
          <td>Financial ledgers, currency amounts, VAT %</td>
          <td>Tabular numbers (<code>tabular-nums</code>)</td>
        </tr>
      </tbody>
    </table>

    <h3>5.2 Typographic Hierarchy & Scale</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 18%;">Level</th>
          <th style="width: 22%;">Scale Size</th>
          <th style="width: 15%;">Weight</th>
          <th style="width: 15%;">Tracking</th>
          <th style="width: 30%;">Linguistic Adaptation</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Display / H1</strong></td>
          <td><code>clamp(2.9rem, 7vw, 5.3rem)</code></td>
          <td>800</td>
          <td>-0.05em (EN)</td>
          <td>Arabic resets tracking to 0; line-height expands to 1.25.</td>
        </tr>
        <tr>
          <td><strong>Section / H2</strong></td>
          <td><code>clamp(1.9rem, 4vw, 3rem)</code></td>
          <td>800</td>
          <td>-0.04em (EN)</td>
          <td>Arabic tracking 0; line-height expands to 1.4.</td>
        </tr>
        <tr>
          <td><strong>Card Title / H3</strong></td>
          <td>21px / 1.3rem</td>
          <td>750</td>
          <td>-0.025em</td>
          <td>Snappy, confident, tight line-height.</td>
        </tr>
        <tr>
          <td><strong>Eyebrow Tag</strong></td>
          <td>11.5px / 0.72rem</td>
          <td>800</td>
          <td>+0.16em</td>
          <td>Uppercase Latin; Ember Orange accent tint; bold dot separator.</td>
        </tr>
        <tr>
          <td><strong>Body Text</strong></td>
          <td>14.5px – 16.5px</td>
          <td>450–500</td>
          <td>Normal</td>
          <td>Generous 1.65 line-height for high fatigue readability.</td>
        </tr>
        <tr>
          <td><strong>Financial Values</strong></td>
          <td>18px – 32px</td>
          <td>700–800</td>
          <td>-0.02em</td>
          <td>Strictly formatted with <code>font-variant-numeric: tabular-nums</code>.</td>
        </tr>
      </tbody>
    </table>

    <div class="component-preview-row">
      <div class="comp-card">
        <div class="comp-title"><span>Latin Specimen · Inter Tight</span></div>
        <div style="font-size: 16pt; font-weight: 800; letter-spacing: -0.04em; color: #111;">
          Site Ledger <span style="color: #ff5a1f;">EGP 2,450,000</span>
        </div>
        <div class="hand-sample" style="color: #c2410c; margin-top: 4px;">
          Never lose a record on the job site.
        </div>
      </div>
      <div class="comp-card" style="text-align: right;">
        <div class="comp-title" style="flex-direction: row-reverse;"><span>Arabic Specimen · Cairo</span></div>
        <div class="arabic-sample" style="font-size: 15pt; font-weight: 800; color: #111;">
          إدارة عهدة الموقع والمصروفات فورًا
        </div>
        <div class="arabic-hand-sample" style="color: #c2410c; margin-top: 4px;">
          قولها، صوّرها، واتسجّلت خلاص ولا قيد يضيع.
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 6: UI COMPONENTS & SIGNATURES -->
  <div class="section page-break">
    <h2><span class="num">6.</span> Signature UI Components & Mechanics</h2>

    <p>
      Hesaby features a distinctive collection of proprietary UI components engineered to deliver tactile delight while remaining fully responsive and robust.
    </p>

    <div class="component-preview-row">
      <!-- Fire Button -->
      <div class="comp-card">
        <div class="comp-title">
          <span>1. The Fire Button (Hero CTA)</span>
          <span class="badge-tag">Signature</span>
        </div>
        <p style="font-size: 7.8pt; color: #665c4e;">
          Full-pill geometry with a convex top specular highlight and multi-layer warm amber drop shadow.
        </p>
        <div style="padding: 10px 0;">
          <div class="sim-fire-btn">
            <span>Start Free Trial — No Card</span>
            <span style="font-size: 9pt;">→</span>
          </div>
        </div>
        <code style="font-size: 7pt;">background: linear-gradient(180deg, #ff7040 0%, #f04e00 60%, #d63a00 100%);</code>
      </div>

      <!-- Tubelight Nav -->
      <div class="comp-card">
        <div class="comp-title">
          <span>2. Tubelight Floating Navbar</span>
          <span class="badge-tag">Patent Feel</span>
        </div>
        <p style="font-size: 7.8pt; color: #665c4e;">
          Translucent pill container with a physical "lamp bar" that casts a conic glow onto the active navigation target.
        </p>
        <div style="padding: 10px 0;">
          <div class="sim-tubelight-nav">
            <div class="sim-nav-item active">Dashboard</div>
            <div class="sim-nav-item">Projects</div>
            <div class="sim-nav-item">Ledger</div>
            <div class="sim-nav-item">DSR</div>
          </div>
        </div>
        <code style="font-size: 7pt;">conic light cone + spring physics (stiffness: 380, damping: 32)</code>
      </div>
    </div>

    <div class="component-preview-row">
      <!-- Sky Toggle -->
      <div class="comp-card">
        <div class="comp-title">
          <span>3. Sky Scene Day/Night Toggle</span>
          <span class="badge-tag">Interactive</span>
        </div>
        <p style="font-size: 7.8pt; color: #665c4e;">
          Playful physical theme switch morphing between sunny day clouds and starry night cosmos.
        </p>
        <div style="display: flex; align-items: center; gap: 14px; padding: 6px 0;">
          <div class="sim-sky-toggle">
            <div class="sim-sky-knob"></div>
          </div>
          <span style="font-size: 7.8pt; color: #73695b;">Smooth 500ms cubic-bezier transition</span>
        </div>
      </div>

      <!-- Display Cards Stack -->
      <div class="comp-card">
        <div class="comp-title">
          <span>4. Fanned Bento Display Stack</span>
          <span class="badge-tag">3D Skew</span>
        </div>
        <p style="font-size: 7.8pt; color: #665c4e;">
          Overlapping cards with <code>-skew-y-8deg</code> base tilt. Grayscale background cards un-dim on cursor hover.
        </p>
        <div style="font-size: 7.8pt; font-weight: 600; color: #ff5a1f;">
          Responsive: Auto-unfolds into vertical stack on mobile screens.
        </div>
      </div>
    </div>

    <!-- Depth & Texture -->
    <h3>6.2 Depth Hierarchy & Background Physics</h3>
    <pre><code>Background Texture:  72px architectural grid, rgba(255,255,255,0.045) strokes, radially masked
Surface Wash:        radial-gradient(1000px at 10% -120px, rgba(255,90,31,0.08), transparent 60%)
Tactile Grain:       SVG feTurbulence film noise at opacity: 0.09 for physical paper warmth
Primary Motion:      cubic-bezier(0.16, 1, 0.3, 1) — Snappy, deliberate Linear/Vercel-class ease</code></pre>
  </div>

  <!-- SECTION 7: VOICE, TONE & COPY -->
  <div class="section page-break">
    <h2><span class="num">7.</span> Brand Voice, Copywriting & Photography</h2>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 10px 0;">
      <div>
        <h3>7.1 Voice Attributes</h3>
        <table>
          <thead>
            <tr>
              <th>Attribute</th>
              <th>How Hesaby Speaks</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Direct & Concise</strong></td>
              <td>Short, impactful sentences. Zero filler.</td>
            </tr>
            <tr>
              <td><strong>Concrete</strong></td>
              <td>Real numbers (EGP, tons, bags), real site friction.</td>
            </tr>
            <tr>
              <td><strong>Egyptian Peer</strong></td>
              <td>Speaks like a senior site engineer, not an academic.</td>
            </tr>
            <tr>
              <td><strong>Trustworthy</strong></td>
              <td>Rock-solid accounting rigor without boardroom jargon.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <h3>7.2 Strict Anti-Patterns</h3>
        <div class="alert-box" style="background: #fff0f0; border-color: #ffd1d1;">
          <div class="alert-title" style="color: #b91c1c;">Forbidden Clichés (Never Use)</div>
          <p style="font-size: 7.8pt; color: #7f1d1d; margin: 0;">
            ❌ "Revolutionize your workflow"<br>
            ❌ "Powered by cutting-edge synergy"<br>
            ❌ "Digital transformation made simple"<br>
            ❌ "Next-generation cloud paradigms"<br>
            <em>Rule: If a foreman on a 45°C site would roll his eyes at the phrase, strike it out immediately.</em>
          </p>
        </div>
      </div>
    </div>

    <h3>7.3 Key Brand Taglines (Bilingual Matrix)</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 25%;">Context</th>
          <th style="width: 35%;">English Master Copy</th>
          <th style="width: 40%;">Egyptian Arabic Master Copy</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Brand Tagline</strong></td>
          <td><em>"Your voice, instantly logged."</em></td>
          <td class="arabic-sample"><strong>"صوتك، حساباتك، فورًا."</strong></td>
        </tr>
        <tr>
          <td><strong>Hero Punchline</strong></td>
          <td><em>"Say it. Snap it. It's already logged."</em></td>
          <td class="arabic-sample"><strong>"قولها. صوّرها. واتسجّلت خلاص."</strong></td>
        </tr>
        <tr>
          <td><strong>The Core Pain</strong></td>
          <td><em>"Your money disappears between site and office."</em></td>
          <td class="arabic-sample"><strong>"الفلوس بتضيع بين الموقع والمكتب."</strong></td>
        </tr>
        <tr>
          <td><strong>Hardware Reality</strong></td>
          <td><em>"Designed for sun, dust, and gloves."</em></td>
          <td class="arabic-sample"><strong>"مصمم للشمس والعفرة وسخونة الموقع."</strong></td>
        </tr>
        <tr>
          <td><strong>Trust Guarantee</strong></td>
          <td><em>"Free for 1 project · Arabic-first · Cancel anytime"</em></td>
          <td class="arabic-sample"><strong>"مجاني لمشروع واحد · عربي أولًا · إلغاء في أي وقت"</strong></td>
        </tr>
      </tbody>
    </table>

    <h3>7.4 Photography & Visual Imagery Guidelines</h3>
    <div class="comp-card">
      <p style="font-size: 8.2pt; margin: 0;">
        • <strong>Zero Stock Photography on Web:</strong> All web storytelling is driven by live, interactive UI components and data simulations.<br>
        • <strong>Real Site Imagery (Collateral):</strong> Real Egyptian sites with unfinished concrete, rebar, desert dust, sun glare, and actual work clothing. Never show generic Western suburban construction or spotless hi-vis models wearing suits.<br>
        • <strong>Lighting & Color Grading:</strong> Golden-hour desert sun matching the warm Ember and Café color temperature.
      </p>
    </div>
  </div>

  <!-- SECTION 8: MOBILE & RTL SPECIFICATIONS -->
  <div class="section page-break">
    <h2><span class="num">8.</span> Mobile App & RTL Bilingual Rules</h2>

    <h3>8.1 Three Curated Mobile Themes (React Native App)</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 22%;">Theme Name</th>
          <th style="width: 38%;">Visual Character & Aesthetic</th>
          <th style="width: 40%;">Core Color Tokens</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1. Monochrome</strong></td>
          <td>Neutral charcoal and off-white. 1:1 match with the web desktop dark mode.</td>
          <td>Canvas <code>#141414</code>, Card <code>#1C1C1C</code>, Text <code>#FAFAFA</code>, Brand <code>#FF5A1F</code></td>
        </tr>
        <tr>
          <td><strong>2. Obsidian & Emerald</strong></td>
          <td>Deep onyx black with crisp mint emerald accents. Modern, technical vibe.</td>
          <td>Canvas <code>#0A0A0C</code>, Card <code>#121215</code>, Text <code>#F8FAFC</code>, Accent <code>#10B981</code></td>
        </tr>
        <tr>
          <td><strong>3. Apple Liquid Glass</strong></td>
          <td>Authentic iOS/macOS frosted acrylic translucency. Specular rims. Light only.</td>
          <td>Canvas <code>#EEF2F7</code>, Acrylic <code>rgba(255,255,255,0.78)</code>, Cupertino Blue <code>#0071E3</code></td>
        </tr>
      </tbody>
    </table>

    <h3>8.2 RTL (Arabic) Structural Design Mechanics</h3>
    <p style="font-size: 8.2pt;">
      Hesaby is designed <strong>Arabic-First in market posture</strong>, while maintaining code-first engineering parity in English.
    </p>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
      <div class="comp-card">
        <div class="comp-title"><span>Spatial Symmetry</span></div>
        <p style="font-size: 8pt; margin: 0;">
          • Complete logical mirroring via <code>margin-inline-start/end</code> and <code>padding-inline</code>.<br>
          • Sidebar & App Navigation positions on the Right in Arabic, Left in English.<br>
          • Shell corner radiuses mirror cleanly (<code>20px 0 0 0</code> in LTR vs. <code>0 20px 0 0</code> in RTL).
        </p>
      </div>
      <div class="comp-card">
        <div class="comp-title"><span>Arabic Script Dynamics</span></div>
        <p style="font-size: 8pt; margin: 0;">
          • <strong>Tracking:</strong> All negative letter-spacing is forced to <code>0</code> on Arabic glyphs.<br>
          • <strong>Line Height:</strong> Baseline height expands by 25% (H1: 1.0 → 1.25, H2: 1.05 → 1.4).<br>
          • <strong>Motion Stagger:</strong> Latin traces per-letter (55ms); Arabic traces per-word (240ms).
        </p>
      </div>
    </div>
  </div>

  <!-- SECTION 9: COMPETITIVE AUDIT & TOKEN REPOSITORY -->
  <div class="section page-break">
    <h2><span class="num">9.</span> Competitive Positioning & Design Token References</h2>

    <h3>9.1 Brand Positioning Contrast</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 50%;">Generic SaaS ERP (SAP, Odoo, Oracle)</th>
          <th style="width: 50%;">Hesaby.ai Identity Position</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Cold blue / enterprise grey color schemes</td>
          <td>Warm Ember Orange on Charcoal & Parchment Paper</td>
        </tr>
        <tr>
          <td>Sterile white backgrounds with razor-thin grey borders</td>
          <td>Rich 4-tier depth hierarchy with ambient orange washes</td>
        </tr>
        <tr>
          <td>Generic stock photography of clean executives in hard hats</td>
          <td>Zero stock photos; live interactive UI simulators & real data</td>
        </tr>
        <tr>
          <td>Formal, rigid Modern Standard Arabic (MSA) translations</td>
          <td>Natural, punchy Egyptian colloquial accounting phrasing</td>
        </tr>
      </tbody>
    </table>

    <h3>9.2 Production Design Token Suite Directory</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 25%;">Module Area</th>
          <th style="width: 45%;">Repository File Location</th>
          <th style="width: 30%;">Token Implementation</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Landing Page Tokens</strong></td>
          <td><code>client/src/pages/Landing.css</code></td>
          <td>Full <code>--hx-*</code> design token suite</td>
        </tr>
        <tr>
          <td><strong>App Theme Shell</strong></td>
          <td><code>client/src/app-theme.css</code></td>
          <td>Authenticated ERP shell color overrides</td>
        </tr>
        <tr>
          <td><strong>Mobile Theme Engine</strong></td>
          <td><code>mobile/src/context/ThemeContext.js</code></td>
          <td>Monochrome, Obsidian, and Liquid Glass presets</td>
        </tr>
        <tr>
          <td><strong>Signature UI Components</strong></td>
          <td><code>client/src/components/ui/*.jsx</code></td>
          <td>Tubelight, Sky Toggle, Handwriting, Display Cards</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- SECTION 10: DESIGNER DELIVERABLES CHECKLIST -->
  <div class="section page-break">
    <h2><span class="num">10.</span> Designer Deliverables & Implementation Checklist</h2>
    
    <div class="alert-box important">
      <div class="alert-title">Contractor & Agency Action Items</div>
      <p style="font-size: 8.2pt; margin: 0;">
        The appointed brand designer, agency, or AI design system should deliver the following standardized assets, formatted in vector (SVG/AI/EPS), Figma Design System tokens, and print-ready CMYK/Pantone specifications.
      </p>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
      <div>
        <h3>10.1 New Logo & Core Identity System</h3>
        <ul class="check-list">
          <li class="check-item"><div class="check-box"></div> 3–5 Distinctly Original Logo Concepts (Structural, Ledger, Monogram, Tool)</li>
          <li class="check-item"><div class="check-box"></div> Primary Master Vector Logo Lockup in English (Hesaby.ai)</li>
          <li class="check-item"><div class="check-box"></div> Primary Master Vector Logo Lockup in Arabic (<span class="arabic-sample" style="font-weight:700;">حسابي.ai</span>)</li>
          <li class="check-item"><div class="check-box"></div> Dual-Script Bilingual Lockup Options</li>
          <li class="check-item"><div class="check-box"></div> Pure Monochrome Lockups (100% Solid Black, 100% Solid White)</li>
          <li class="check-item"><div class="check-box"></div> Complete App Icon Suite (iOS Liquid Glass, Android Adaptive, macOS)</li>
          <li class="check-item"><div class="check-box"></div> Multi-Scale Favicon Asset Bundle (16, 32, 48, 180, 192, 512px + ICO)</li>
          <li class="check-item"><div class="check-box"></div> Geometric Construction Breakdown & Optical Clear Space Rules</li>
        </ul>

        <h3>10.2 Color & Typographic Standards</h3>
        <ul class="check-list">
          <li class="check-item"><div class="check-box"></div> Pantone & CMYK Print Equivalents for Ember Orange (#FF5A1F)</li>
          <li class="check-item"><div class="check-box"></div> WCAG 2.1 AAA Accessibility Contrast Verification Matrix</li>
          <li class="check-item"><div class="check-box"></div> Bilingual Type Specimen Booklets (Inter Tight & Cairo)</li>
        </ul>
      </div>

      <div>
        <h3>10.3 Brand Collateral & Stationery</h3>
        <ul class="check-list">
          <li class="check-item"><div class="check-box"></div> Bilingual Executive Business Cards (Front English, Back Arabic)</li>
          <li class="check-item"><div class="check-box"></div> Official Construction Firm Tax Invoice & Receipt Template (A4)</li>
          <li class="check-item"><div class="check-box"></div> Corporate Keynote & Slide Deck Master Template (Dark & Light)</li>
          <li class="check-item"><div class="check-box"></div> Executive HTML Email Signature Kit</li>
          <li class="check-item"><div class="check-box"></div> Physical Site Gear Mockups (Hard hats, site engineer field books, vests)</li>
        </ul>

        <h3>10.4 Marketing & Digital Guidelines</h3>
        <ul class="check-list">
          <li class="check-item"><div class="check-box"></div> Apple App Store Screenshot Frame Templates (6.7" & 6.5")</li>
          <li class="check-item"><div class="check-box"></div> Google Play Store Feature Graphic (1024×500)</li>
          <li class="check-item"><div class="check-box"></div> Construction Trade Fair Roll-up Banner Design (85×200cm)</li>
          <li class="check-item"><div class="check-box"></div> Figma Component Library (.fig file with structured variables)</li>
        </ul>
      </div>
    </div>

    <div class="footer-signoff">
      <div>
        <strong>Hesaby.ai ERP</strong> · Architectural Design Identity · Open Creative Mandate
      </div>
      <div>
        End of Brand Design Briefing Specification
      </div>
    </div>
  </div>

</body>
</html>
`;

const outputHtmlPath = path.join(__dirname, '..', 'hesaby_brand_briefing.html');
fs.writeFileSync(outputHtmlPath, htmlContent, 'utf8');
console.log('HTML written to:', outputHtmlPath);

// Target PDF paths
const outputPdfPath = path.join(__dirname, '..', 'hesaby_brand_briefing.pdf');
const docsPdfPath = path.join(__dirname, '..', 'docs', 'hesaby_brand_briefing.pdf');
const brainPdfPath = 'C:\\\\Users\\\\Dell\\\\.gemini\\\\antigravity-ide\\\\brain\\\\01866729-9f6e-48cc-9dfb-b2d0ed80006e\\\\hesaby_brand_briefing.pdf';

const edgePath = 'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe';
const fileUrl = 'file:///' + outputHtmlPath.replace(/\\\\/g, '/');

console.log('Rendering PDF via headless Edge...');
const edgeCmd = '"' + edgePath + '" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="' + outputPdfPath + '" "' + fileUrl + '"';
execSync(edgeCmd, { stdio: 'inherit' });

if (fs.existsSync(outputPdfPath)) {
  const stats = fs.statSync(outputPdfPath);
  console.log('Generated PDF at ' + outputPdfPath + ' (' + stats.size + ' bytes)');
  
  // Copy to docs and brain
  fs.copyFileSync(outputPdfPath, docsPdfPath);
  console.log('Copied to docs:', docsPdfPath);

  try {
    fs.copyFileSync(outputPdfPath, brainPdfPath);
    console.log('Copied to brain:', brainPdfPath);
  } catch (e) {
    console.log('Could not copy to brain:', e.message);
  }
} else {
  console.error('PDF generation failed.');
  process.exit(1);
}
