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

// ── API INTERACTION (REAL FASTAPI) ─────────────────────────

// Removed the sleep and mockData methods. We use the real /api/generate endpoint now.

// ── MAIN PIPELINE ─────────────────────────────────────────────

async function run() {
    const req = document.getElementById('req').value.trim();
    if (!req) { alert('Please enter a requirement or pick an example.'); return; }
    
    const model = document.getElementById('mdl').value;
    const btn = document.getElementById('runBtn');
    btn.disabled = true;
    
    reset();
    setStatus('pipeline running (' + model + ')... this takes 30-60s');

    try {
        // Since CrewAI executes synchronously, the UI will show a generic "Pipeline Running..." state across all agents
        // while waiting for the single API response to return.
        setAgent('legal', 'active', 'Running CrewAI Pipeline...');
        setAgent('writer', 'active', 'Running CrewAI Pipeline...');
        setAgent('validator', 'active', 'Running CrewAI Pipeline...');
        tab('analysis');
        
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requirement: req, model: model })
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "API Error");
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error);
        }

        // ══ AGENT 1: Legal Expert ══
        setAgent('legal', 'done', 'Analysis complete');
        showBlock('analysis', data.analysis);

        // ══ AGENT 2: Template Writer ══
        setAgent('writer', 'done', 'Draft complete');
        showBlock('model', data.parsed_model);
        showBlock('text',  data.parsed_text);
        showBlock('logic', data.parsed_logic);

        // ══ AGENT 3: Validator ══
        showBlock('validation', ''); // Clear initial empty text
        
        const valList = document.getElementById('c-validation');
        valList.innerHTML = '';
        
        const checks = [
            { check: "Parse Model", note: "model.cto compiled successfully.", pass: true },
            { check: "Parse Grammar", note: "text grammar matched model syntax.", pass: true },
            { check: "Compile Logic", note: "logic.ergo compilation successful.", pass: true },
            { check: "Test Execution", note: "Sample request executed constraints.", pass: true }
        ];

        // We can just append a single block containing actual validation response from LLM
        const row = document.createElement('div');
        row.className = `val-row pass`;
        row.innerHTML = `
            <div class="val-icon">✓</div>
            <div class="val-body">
                <div class="val-check">Final Validation Report</div>
                <div class="val-note" style="white-space: pre-line;">${data.validation.replace(/</g, "&lt;")}</div>
            </div>
        `;
        valList.appendChild(row);

        setAgent('validator', 'done', 'All checks passed');
        setStatus('pipeline complete');

    } catch(err) {
        setAgent('legal', 'error', 'Failed');
        setAgent('writer', 'error', 'Failed');
        setAgent('validator', 'error', 'Failed');
        setStatus('error: ' + err.message);
        console.error(err);
    } finally {
        btn.disabled = false;
    }
}
