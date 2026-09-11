const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1600px;
    height: 1000px;
    background: #08080a;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #f5f4f0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 60px;
    position: relative;
  }
  
  /* Background grid */
  .grid-bg {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
    background-size: 50px 50px;
    pointer-events: none;
  }
  
  /* Ambient glow */
  .glow {
    position: absolute;
    top: -150px;
    right: -100px;
    width: 650px;
    height: 650px;
    background: radial-gradient(circle, rgba(255, 90, 31, 0.28) 0%, transparent 65%);
    pointer-events: none;
  }
  
  .glow-bottom {
    position: absolute;
    bottom: -150px;
    left: 100px;
    width: 550px;
    height: 550px;
    background: radial-gradient(circle, rgba(255, 138, 80, 0.12) 0%, transparent 65%);
    pointer-events: none;
  }

  .header {
    position: relative;
    z-index: 2;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 40px;
    border-bottom: 2px solid rgba(255, 90, 31, 0.4);
    padding-bottom: 24px;
  }

  .title-group h1 {
    font-size: 38pt;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: #ffffff;
  }
  .title-group h1 span {
    color: #ff8a50;
  }
  .title-group p {
    font-size: 14pt;
    color: #a8a29e;
    margin-top: 6px;
    letter-spacing: 0.02em;
  }

  .arabic-title {
    font-size: 32pt;
    font-weight: 700;
    color: #ece5d6;
    letter-spacing: -0.02em;
  }

  /* Main layout */
  .main-grid {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 36px;
    flex: 1;
  }

  /* Swatches Section */
  .palette-col {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .section-label {
    font-size: 11pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: #ff8a50;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .swatch-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  .swatch {
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.12);
    background: #0e0e12;
    display: flex;
    flex-direction: column;
  }

  .swatch-fill {
    height: 100px;
  }

  .swatch-meta {
    padding: 14px;
  }
  .swatch-meta .name {
    font-size: 11pt;
    font-weight: 700;
    color: #f5f4f0;
  }
  .swatch-meta .hex {
    font-family: monospace;
    font-size: 11pt;
    color: #ff8a50;
    margin-top: 4px;
    font-weight: 600;
  }
  .swatch-meta .desc {
    font-size: 9pt;
    color: #888;
    margin-top: 4px;
  }

  /* Right column: Texture & Mood */
  .mood-col {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .mood-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    flex: 1;
  }

  .mood-card {
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.12);
    padding: 22px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .mood-card.concrete {
    background: linear-gradient(135deg, #18181c 0%, #202026 100%);
    border-color: rgba(255, 90, 31, 0.3);
  }

  .mood-card.paper {
    background: #ece5d6;
    color: #1c1710;
  }
  .mood-card.paper h3 { color: #1c1710; }
  .mood-card.paper p { color: #5c5242; }

  .mood-card h3 {
    font-size: 14pt;
    font-weight: 800;
    color: #ffffff;
    margin-bottom: 6px;
  }
  .mood-card p {
    font-size: 10pt;
    color: #a8a29e;
    line-height: 1.5;
  }

  .pillar-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
  }
  .pillar-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 9.5pt;
    font-weight: 600;
  }
  .pillar-bullet {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ff5a1f;
  }

  /* Footer bar */
  .footer-bar {
    position: relative;
    z-index: 2;
    margin-top: auto;
    padding-top: 20px;
    border-top: 1px solid rgba(255,255,255,0.1);
    display: flex;
    justify-content: space-between;
    font-size: 10pt;
    color: #777;
  }
</style>
</head>
<body>
  <div class="grid-bg"></div>
  <div class="glow"></div>
  <div class="glow-bottom"></div>

  <div class="header">
    <div class="title-group">
      <h1>HESABY<span>.AI</span></h1>
      <p>Visual Identity Moodboard & Palette Reference · For Image Generation</p>
    </div>
    <div class="arabic-title">حسابي</div>
  </div>

  <div class="main-grid">
    <div class="palette-col">
      <div class="section-label">01 / Master Color Palette</div>
      <div class="swatch-row">
        <div class="swatch">
          <div class="swatch-fill" style="background: #ff5a1f;"></div>
          <div class="swatch-meta">
            <div class="name">Ember Orange</div>
            <div class="hex">#FF5A1F</div>
            <div class="desc">Primary brand accent & heat</div>
          </div>
        </div>

        <div class="swatch">
          <div class="swatch-fill" style="background: #08080a; border-bottom: 1px solid #222;"></div>
          <div class="swatch-meta">
            <div class="name">Dark Charcoal</div>
            <div class="hex">#08080A</div>
            <div class="desc">Deep field night canvas</div>
          </div>
        </div>

        <div class="swatch">
          <div class="swatch-fill" style="background: #ece5d6;"></div>
          <div class="swatch-meta">
            <div class="name">Café Parchment</div>
            <div class="hex">#ECE5D6</div>
            <div class="desc">Aged accounting ledger</div>
          </div>
        </div>
      </div>

      <div class="swatch-row" style="margin-top: 4px;">
        <div class="swatch">
          <div class="swatch-fill" style="background: #c2410c;"></div>
          <div class="swatch-meta">
            <div class="name">Ember Dark</div>
            <div class="hex">#C2410C</div>
            <div class="desc">Light-mode contrast</div>
          </div>
        </div>

        <div class="swatch">
          <div class="swatch-fill" style="background: #ff8a50;"></div>
          <div class="swatch-meta">
            <div class="name">Ember Glow</div>
            <div class="hex">#FF8A50</div>
            <div class="desc">Specular highlight</div>
          </div>
        </div>

        <div class="swatch">
          <div class="swatch-fill" style="background: #f5f4f0;"></div>
          <div class="swatch-meta">
            <div class="name">Off-White</div>
            <div class="hex">#F5F4F0</div>
            <div class="desc">Warm text (never pure white)</div>
          </div>
        </div>
      </div>
    </div>

    <div class="mood-col">
      <div class="section-label">02 / Material & Archetype Direction</div>
      <div class="mood-cards">
        <div class="mood-card concrete">
          <div>
            <h3>Job-Site Reality</h3>
            <p>Reinforced concrete, structural steel, hot sun, desert dust, rugged field instruments, tangible physics.</p>
          </div>
          <div class="pillar-list">
            <div class="pillar-item"><div class="pillar-bullet"></div> Heavy & load-bearing</div>
            <div class="pillar-item"><div class="pillar-bullet"></div> Swiss grid precision</div>
            <div class="pillar-item"><div class="pillar-bullet"></div> Architectural minimalism</div>
          </div>
        </div>

        <div class="mood-card paper">
          <div>
            <h3>Financial Ledger</h3>
            <p>Double-entry accounting, audit-grade verification, balance sheet equilibrium, personal accountability.</p>
          </div>
          <div class="pillar-list">
            <div class="pillar-item"><div class="pillar-bullet" style="background:#c2410c;"></div> Mathematical balance</div>
            <div class="pillar-item"><div class="pillar-bullet" style="background:#c2410c;"></div> Institutional trust</div>
            <div class="pillar-item"><div class="pillar-bullet" style="background:#c2410c;"></div> Arabic/Latin harmony</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer-bar">
    <div>Hesaby.ai · Construction ERP · The Site-to-Office Live Ledger</div>
    <div>Style Reference Target: Premium Architectural Identity · No Clichés</div>
  </div>
</body>
</html>
`;

const htmlPath = path.join(__dirname, '..', 'hesaby_style_reference.html');
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('Written HTML to:', htmlPath);

const edgePath = 'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe';
const outputPath = path.join(__dirname, '..', 'hesaby_style_reference.png');
const fileUrl = 'file:///' + htmlPath.replace(/\\\\/g, '/');

const cmd = '"' + edgePath + '" --headless --disable-gpu --window-size=1600,1000 --screenshot="' + outputPath + '" "' + fileUrl + '"';
console.log('Capturing screenshot...');
execSync(cmd, { stdio: 'inherit' });

if (fs.existsSync(outputPath)) {
  console.log('Created reference image at:', outputPath);
  // Also copy to docs
  fs.copyFileSync(outputPath, path.join(__dirname, '..', 'docs', 'hesaby_style_reference.png'));
}
