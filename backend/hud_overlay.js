(function() {
    if (window.__WEBLENS_HUD__) return;

    class WebLensHUD {
        constructor() {
            this.container = document.createElement('div');
            this.container.id = 'weblens-hud-container';
            this.shadow = this.container.attachShadow({ mode: 'closed' });
            
            this.styles = `
                :host {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    pointer-events: none;
                    z-index: 2147483647;
                    font-family: 'JetBrains Mono', 'Monaco', monospace;
                    --primary: #6366f1;
                    --success: #10b981;
                    --warning: #f59e0b;
                    --danger: #ef4444;
                    --bg: rgba(0, 0, 0, 0.85);
                }

                .ticker {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    width: 300px;
                    max-height: 400px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    overflow: hidden;
                    mask-image: linear-gradient(to bottom, black 80%, transparent);
                }

                .ticker-item {
                    background: var(--bg);
                    border-left: 2px solid var(--primary);
                    padding: 8px 12px;
                    color: #fff;
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    backdrop-filter: blur(8px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                }

                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }

                /* Inventory Panel */
                .inventory {
                    position: absolute;
                    bottom: 20px;
                    left: 20px;
                    width: 240px;
                    background: var(--bg);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-top: 2px solid var(--primary);
                    padding: 12px;
                    backdrop-filter: blur(12px);
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .inventory-header {
                    font-size: 9px;
                    font-weight: 900;
                    color: var(--primary);
                    text-transform: uppercase;
                    letter-spacing: 0.2em;
                    margin-bottom: 4px;
                    display: flex;
                    justify-content: space-between;
                }

                .inventory-item {
                    display: flex;
                    justify-content: space-between;
                    font-size: 9px;
                    color: #a1a1aa;
                }

                .inventory-value {
                    color: #fff;
                    font-weight: 700;
                    font-family: monospace;
                }

                /* Ghost Orb */
                .ghost-cursor {
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    background: var(--primary);
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 2147483647;
                    transition: all 1.5s cubic-bezier(0.19, 1, 0.22, 1);
                    transform: translate(-50%, -50%);
                    box-shadow: 0 0 15px var(--primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0; /* Hidden until first move */
                }

                /* Health Highlight */
                .health-highlight {
                    position: absolute;
                    border: 1px dashed var(--danger);
                    background: rgba(239, 68, 68, 0.05);
                    pointer-events: none;
                    animation: pulse-red 2s infinite;
                }

                @keyframes pulse-red {
                    0% { box-shadow: inset 0 0 0px var(--danger); opacity: 0.3; }
                    50% { box-shadow: inset 0 0 15px var(--danger); opacity: 0.7; }
                    100% { box-shadow: inset 0 0 0px var(--danger); opacity: 0.3; }
                }

                .reticle {
                    position: absolute;
                    width: 60px;
                    height: 60px;
                    border: 2px solid var(--primary);
                    border-radius: 2px;
                    transform: translate(-50%, -50%);
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    display: none;
                    box-shadow: 0 0 10px rgba(99, 102, 241, 0.2);
                }

                .intent-label {
                    position: absolute;
                    top: -25px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--primary);
                    color: #000;
                    padding: 2px 8px;
                    font-size: 9px;
                    font-weight: 900;
                    text-transform: uppercase;
                    white-space: nowrap;
                    border-radius: 2px;
                }

                .confidence-ring {
                    position: absolute;
                    bottom: -35px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 2px;
                }

                .ring-value {
                    font-size: 8px;
                    font-weight: 900;
                    color: var(--primary);
                }

                .progress-bg {
                    width: 40px;
                    height: 3px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 2px;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    background: var(--primary);
                    transition: width 0.3s ease;
                }

                .status-corners {
                    position: absolute;
                    inset: 0;
                }

                .corner {
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    border: 2px solid var(--primary);
                }
                .tl { top: -2px; left: -2px; border-right: 0; border-bottom: 0; }
                .tr { top: -2px; right: -2px; border-left: 0; border-bottom: 0; }
                .bl { bottom: -2px; left: -2px; border-right: 0; border-top: 0; }
                .br { bottom: -2px; right: -2px; border-left: 0; border-top: 0; }

                .active-scan {
                    animation: scan 2s linear infinite;
                }
                @keyframes scan {
                    0% { opacity: 0.2; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(1.1); }
                    100% { opacity: 0.2; transform: scale(1); }
                }
            `;

            this._init();
        }

        _init() {
            const styleEl = document.createElement('style');
            styleEl.textContent = this.styles;
            this.shadow.appendChild(styleEl);

            this.ticker = document.createElement('div');
            this.ticker.className = 'ticker';
            this.shadow.appendChild(this.ticker);

            this.inventory = document.createElement('div');
            this.inventory.className = 'inventory';
            
            const invHeader = document.createElement('div');
            invHeader.className = 'inventory-header';
            const invTitle = document.createElement('span');
            invTitle.textContent = 'Inventory';
            const invVersion = document.createElement('span');
            invVersion.textContent = 'v1.0';
            invHeader.appendChild(invTitle);
            invHeader.appendChild(invVersion);
            this.inventory.appendChild(invHeader);
            
            this.shadow.appendChild(this.inventory);

            this.cursor = document.createElement('div');
            this.cursor.className = 'ghost-cursor';
            this.shadow.appendChild(this.cursor);

            this.healthLayer = document.createElement('div');
            this.healthLayer.className = 'health-layer';
            this.shadow.appendChild(this.healthLayer);

            this.reticle = document.createElement('div');
            this.reticle.className = 'reticle';
            
            const intentLabel = document.createElement('div');
            intentLabel.className = 'intent-label';
            intentLabel.textContent = 'Resolving...';
            this.reticle.appendChild(intentLabel);
            
            const confRing = document.createElement('div');
            confRing.className = 'confidence-ring';
            const ringValue = document.createElement('span');
            ringValue.className = 'ring-value';
            ringValue.textContent = '0%';
            const progressBg = document.createElement('div');
            progressBg.className = 'progress-bg';
            const progressFill = document.createElement('div');
            progressFill.className = 'progress-fill';
            progressFill.style.width = '0%';
            progressBg.appendChild(progressFill);
            confRing.appendChild(ringValue);
            confRing.appendChild(progressBg);
            this.reticle.appendChild(confRing);
            
            this.shadow.appendChild(this.reticle);

            document.documentElement.appendChild(this.container);
        }

        log(message) {
            const item = document.createElement('div');
            item.className = 'ticker-item';
            item.textContent = `> ${message}`;
            this.ticker.prepend(item);

            if (this.ticker.children.length > 8) {
                this.ticker.lastElementChild.remove();
            }
        }

        updateInventory(data) {
            // Keep header
            const header = this.inventory.firstElementChild;
            this.inventory.innerHTML = '';
            this.inventory.appendChild(header);

            Object.entries(data).forEach(([key, value]) => {
                const item = document.createElement('div');
                item.className = 'inventory-item';
                
                const keySpan = document.createElement('span');
                keySpan.textContent = key;
                const valueSpan = document.createElement('span');
                valueSpan.className = 'inventory-value';
                valueSpan.textContent = value;
                
                item.appendChild(keySpan);
                item.appendChild(valueSpan);
                this.inventory.appendChild(item);
            });
        }

        glideGhostCursor(x, y) {
            this.cursor.style.opacity = '1';
            this.cursor.style.left = `${x}px`;
            this.cursor.style.top = `${y}px`;
        }

        highlightHealth(rect, score) {
            const el = document.createElement('div');
            el.className = 'health-highlight';
            el.style.left = `${rect.x}px`;
            el.style.top = `${rect.y}px`;
            el.style.width = `${rect.width}px`;
            el.style.height = `${rect.height}px`;
            
            // Texture/Color based on score
            if (score < 0.5) {
                el.style.background = 'repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.1) 2px, transparent 2px, transparent 4px)';
            }

            this.healthLayer.appendChild(el);
            setTimeout(() => el.remove(), 2000);
        }

        showIntent(data) {
            const { x, y, width, height, intent, confidence, reasoning } = data;
            
            // Move Ghost Cursor to target
            this.glideGhostCursor(x + width/2, y + height/2);

            // Highlight health if confidence is low
            if (confidence < 0.7) {
                this.highlightHealth({x, y, width, height}, confidence);
            }

            this.reticle.style.display = 'block';
            this.reticle.style.left = `${x + width/2}px`;
            this.reticle.style.top = `${y + height/2}px`;
            this.reticle.style.width = `${width + 10}px`;
            this.reticle.style.height = `${height + 10}px`;

            const label = this.shadow.querySelector('.intent-label');
            label.textContent = intent;
            
            const confValue = this.shadow.querySelector('.ring-value');
            confValue.textContent = `${Math.round(confidence * 100)}%`;
            
            const fill = this.shadow.querySelector('.progress-fill');
            fill.style.width = `${confidence * 100}%`;

            // Color based on confidence
            let color = '#6366f1'; // Primary (Indigo)
            if (confidence < 0.6) color = '#ef4444'; // Danger

            this.shadow.host.style.setProperty('--primary', color);

            if (reasoning) {
                this.log(reasoning);
            }
        }

        hideIntent() {
            this.reticle.style.display = 'none';
        }

        clear() {
            this.ticker.innerHTML = '';
            this.hideIntent();
        }
    }

    window.__WEBLENS_HUD__ = new WebLensHUD();
})();
