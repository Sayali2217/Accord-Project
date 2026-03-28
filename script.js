/**
 * Accord Project — Agentic Template Generator Logic
 */

const API = 'https://api.anthropic.com/v1/messages';

// ── UI HELPERS ──────────────────────────────────────────────────

function fill(txt) { 
    document.getElementById('req').value = txt; 
}

function tab(name) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
    document.querySelectorAll('.pane').forEach(p => p.classList.remove('on'));
    document.getElementById('t-' + name).classList.add('on');
    document.getElementById('p-' + name).classList.add('on');
}

function showBlock(name, content) {
    const emptyState = document.getElementById('e-' + name);
    if (emptyState) emptyState.style.display = 'none';
    
    const block = document.getElementById('b-' + name);
    if (block) {
        block.style.display = 'flex';
        if (content !== undefined) {
            document.getElementById('c-' + name).textContent = content;
        }
    }
}

function copy(name) {
    const el = document.getElementById('c-' + name);
    if (!el) return;
    navigator.clipboard.writeText(el.textContent);
    const btn = event.target;
    const oldTxt = btn.textContent;
    btn.textContent = 'copied!';
    btn.classList.add('copied');
    setTimeout(() => { 
        btn.textContent = oldTxt; 
        btn.classList.remove('copied'); 
    }, 1500);
}

function setAgent(id, state, msg) {
    const card  = document.getElementById('pa-' + id);
    const msgEl = document.getElementById('pm-' + id);
    const badge = document.getElementById('pb-' + id);
    if (!card || !msgEl || !badge) return;

    card.className  = 'p-agent ' + state;
    msgEl.textContent = msg;
    
    const labels = { idle:'idle', active:'running...', done:'done', error:'error' };
    const bclass = { idle:'badge-idle', active:'badge-running', done:'badge-done', error:'badge-error' };
    
    badge.textContent = labels[state];
    badge.className = 'p-badge ' + bclass[state];
}

function setStatus(txt) { 
    document.getElementById('f-status').textContent = txt; 
}

function reset() {
    ['legal','writer','validator'].forEach(id => {
        const msg = id === 'legal' ? 'Idle — awaiting input' : (id === 'writer' ? 'Waiting for analysis' : 'Waiting for draft');
        setAgent(id, 'idle', msg);
    });
    ['analysis','model','text','logic','validation'].forEach(name => {
        const e = document.getElementById('e-' + name);
        const b = document.getElementById('b-' + name);
        if (e) e.style.display = '';
        if (b) b.style.display = 'none';
    });
}

// ── MOCK API INTERACTION (SIMULATION) ─────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

const mockData = {
    analysis: `LEGAL ANALYSIS SUMMARY\n\n1. Type: Mutual Non-Disclosure Agreement (NDA)\n2. Jurisdiction: India\n3. Duration: 24 months\n4. Key Clauses:\n   - Definition of Confidential Information\n   - Obligations of Receiving Party\n   - Exclusions from Confidentiality\n   - Governing Law & Dispute Resolution\n\nAGENT DECISION: Proceed with drafting Concerto model, markdown template, and Ergo logic.`,
    model: `namespace org.accordproject.nda\n\nimport org.accordproject.contract.*\nimport org.accordproject.party.Party\n\nasset MutualNDA extends Contract {\n  o Party partyA\n  o Party partyB\n  o Duration duration\n  o String governingLaw\n}`,
    text: `MUTUAL NON-DISCLOSURE AGREEMENT\n\nThis Agreement is entered into by and between {{partyA}} and {{partyB}}.\n\n1. OBLIGATIONS. Both parties agree to maintain the confidentiality of the proprietary information for a period of {{duration}}.\n\n2. GOVERNING LAW. This agreement shall be governed by the laws of {{governingLaw}}.`,
    logic: `namespace org.accordproject.nda\n\nimport org.accordproject.cicero.runtime.*\n\ncontract MutualNDALogic over MutualNDA {\n  clause init() : Response {\n    return Response{}\n  }\n}`
};

// ── MAIN PIPELINE ─────────────────────────────────────────────

async function run() {
    const req = document.getElementById('req').value.trim();
    if (!req) { alert('Please enter a requirement or pick an example.'); return; }
    
    const model = document.getElementById('mdl').value;
    const btn = document.getElementById('runBtn');
    btn.disabled = true;
    
    reset();
    setStatus('pipeline running (' + model + ')...');

    try {
        // ══ AGENT 1: Legal Expert ══
        setAgent('legal', 'active', 'Parsing requirements...');
        tab('analysis');
        
        await sleep(1500); // Simulate API latency
        setAgent('legal', 'done', 'Analysis complete');
        showBlock('analysis', mockData.analysis);

        // ══ AGENT 2: Template Writer ══
        setAgent('writer', 'active', 'Drafting files...');
        tab('model');
        
        await sleep(2000); // Simulate API latency
        setAgent('writer', 'done', 'Draft complete');
        showBlock('model', mockData.model);
        showBlock('text',  mockData.text);
        showBlock('logic', mockData.logic);

        // ══ AGENT 3: Validator ══
        setAgent('validator', 'active', 'Running checks...');
        tab('validation');
        
        await sleep(800);
        showBlock('validation', ''); // Clear initial empty text
        
        const valList = document.getElementById('c-validation');
        valList.innerHTML = '';
        
        const checks = [
            { check: "Parse Model", note: "model.cto compiled successfully.", pass: true },
            { check: "Parse Grammar", note: "text grammar matched model syntax.", pass: true },
            { check: "Compile Logic", note: "logic.ergo compilation successful.", pass: true },
            { check: "Test Execution", note: "Sample request executed constraints.", pass: true }
        ];

        for (const c of checks) {
            await sleep(400); // Step-by-step visual validation
            const row = document.createElement('div');
            row.className = `val-row ${c.pass ? 'pass' : 'fail'}`;
            row.innerHTML = `
                <div class="val-icon">${c.pass ? '✓' : '✗'}</div>
                <div class="val-body">
                    <div class="val-check">${c.check}</div>
                    <div class="val-note">${c.note}</div>
                </div>
            `;
            valList.appendChild(row);
        }

        setAgent('validator', 'done', 'All checks passed');
        setStatus('pipeline complete');

    } catch(err) {
        setStatus('error: ' + err.message);
        console.error(err);
    } finally {
        btn.disabled = false;
    }
}
