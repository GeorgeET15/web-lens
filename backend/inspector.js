(function() {
    console.log("Visual Inspector: Initializing...");
    
    if (window.__visualInspectorActive) {
        console.log("Visual Inspector: Already active, skipping init.");
        return;
    }

    function init() {
        if (!document.body) {
            console.log("Visual Inspector: Body not ready, retrying...");
            setTimeout(init, 100);
            return;
        }

        window.__visualInspectorActive = true;
        console.log("Visual Inspector: Body ready, setting up UI...");

        // Mode persistence via localStorage (with safety catch)
        let savedMode = 'pick';
        try {
            savedMode = localStorage.getItem('__visualInspectorMode') || 'pick';
        } catch (e) {
            console.warn("Inspector: Storage access denied, defaulting to 'pick'");
        }
        window.__visualInspectorMode = savedMode; 

        // --- UI Elements ---
        let overlay, modeToolbar, confirmDialog, infoDiv;

        function createUI() {
            if (document.getElementById('__visual-inspector-overlay')) return;

            console.log("Visual Inspector: Creating UI elements...");

            overlay = document.createElement('div');
            overlay.id = '__visual-inspector-overlay';
            overlay.style.cssText = 'position:fixed; border:2px solid #6366f1; background:rgba(99,102,241,0.05); pointer-events:none; z-index:2147483647; transition:all 0.1s ease; display:none; border-radius:4px; box-shadow:0 0 20px rgba(99,102,241,0.3);';
            document.body.appendChild(overlay);

            modeToolbar = document.createElement('div');
            modeToolbar.id = '__visual-inspector-toolbar';
            modeToolbar.style.cssText = 'position:fixed; bottom:32px; left:50%; transform:translateX(-50%); background:#09090b; color:#ffffff; padding:6px; border-radius:16px; box-shadow:0 30px 60px rgba(0,0,0,0.8); z-index:2147483647; display:flex; gap:4px; border:1px solid rgba(255,255,255,0.1); font-family:system-ui,-apple-system,sans-serif; backdrop-blur:10px;';
            
            const pickBtn = document.createElement('button');
            pickBtn.textContent = 'Pick Element';
            pickBtn.style.cssText = 'padding:8px 20px; border-radius:10px; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.2em; cursor:pointer; border:1px solid transparent; transition:all 0.3s cubic_bezier(0.4, 0, 0.2, 1); background:transparent; color:#71717a;';
            
            const browseBtn = document.createElement('button');
            browseBtn.textContent = 'Browse Normally';
            browseBtn.style.cssText = 'padding:8px 20px; border-radius:10px; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.2em; cursor:pointer; border:1px solid transparent; transition:all 0.3s cubic_bezier(0.4, 0, 0.2, 1); background:transparent; color:#71717a;';

            function updateToolbar() {
                if (window.__visualInspectorMode === 'pick') {
                    pickBtn.style.background = '#ffffff'; pickBtn.style.color = '#000000';
                    browseBtn.style.background = 'transparent'; browseBtn.style.color = '#71717a';
                    overlay.style.display = 'block';
                } else {
                    pickBtn.style.background = 'transparent'; pickBtn.style.color = '#71717a';
                    browseBtn.style.background = '#27272a'; browseBtn.style.color = '#ffffff';
                    overlay.style.display = 'none';
                    if (confirmDialog) confirmDialog.style.display = 'none';
                }
            }

            pickBtn.onclick = (e) => { 
                e.preventDefault(); e.stopPropagation();
                window.__visualInspectorMode = 'pick'; 
                try { localStorage.setItem('__visualInspectorMode', 'pick'); } catch(e){}
                updateToolbar(); 
            };
            browseBtn.onclick = (e) => { 
                e.preventDefault(); e.stopPropagation();
                window.__visualInspectorMode = 'browse'; 
                try { localStorage.setItem('__visualInspectorMode', 'browse'); } catch(e){}
                updateToolbar(); 
            };

            modeToolbar.appendChild(pickBtn);
            modeToolbar.appendChild(browseBtn);
            document.body.appendChild(modeToolbar);
            updateToolbar();

            // --- Confirmation Dialog ---
            confirmDialog = document.createElement('div');
            confirmDialog.id = '__visual-inspector-confirm';
            confirmDialog.style.cssText = 'position:fixed; top:32px; left:50%; transform:translateX(-50%); background:#09090b; color:#ffffff; padding:24px; border-radius:16px; box-shadow:0 30px 60px rgba(0,0,0,0.8); z-index:2147483647; display:none; font-family:system-ui,-apple-system,sans-serif; border:1px solid rgba(255,255,255,0.1); width:320px; backdrop-blur:10px;';
            
            const header = document.createElement('div');
            header.style.cssText = 'margin-bottom:16px;';
            const title = document.createElement('h3');
            title.textContent = 'Confirm Target';
            title.style.cssText = 'margin:0; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.3em; color:#ffffff;';
            const subtitle = document.createElement('p');
            subtitle.textContent = 'Use this element?';
            subtitle.style.cssText = 'margin:4px 0 0; font-size:11px; font-weight:500; color:#71717a;';
            header.appendChild(title);
            header.appendChild(subtitle);
            confirmDialog.appendChild(header);

            const btnGroup = document.createElement('div');
            btnGroup.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:8px;';
            
            const yesBtn = document.createElement('button');
            yesBtn.textContent = 'Use Element';
            yesBtn.style.cssText = 'background:#ffffff; color:#000000; border:none; padding:10px; border-radius:10px; cursor:pointer; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.2em; transition:all 0.2s;';
            
            const noBtn = document.createElement('button');
            noBtn.textContent = 'Cancel';
            noBtn.style.cssText = 'background:#18181b; color:#a1a1aa; border:1px solid rgba(255,255,255,0.05); padding:10px; border-radius:10px; cursor:pointer; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.2em; transition:all 0.2s;';
            
            btnGroup.appendChild(yesBtn); 
            btnGroup.appendChild(noBtn);
            confirmDialog.appendChild(btnGroup);

            // --- Semantic Declaration UI (Hidden by default) ---
            const declarationContainer = document.createElement('div');
            declarationContainer.id = '__visual-inspector-declaration';
            declarationContainer.style.cssText = 'display:none; flex-direction:column; gap:12px; margin-top:16px; padding:16px; background:rgba(239,68,68,0.05); border:1px solid rgba(239,68,68,0.2); border-radius:12px;';
            
            const declarationTitle = document.createElement('div');
            declarationTitle.textContent = 'Unnamed Element Detected';
            declarationTitle.style.cssText = 'font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; color:#ef4444;';
            
            const declarationDesc = document.createElement('p');
            declarationDesc.textContent = 'This element has no semantic name. WebLens cannot reliably understand it without your help.';
            declarationDesc.style.cssText = 'margin:0; font-size:11px; color:#a1a1aa; line-height:1.4;';

            const semanticInput = document.createElement('input');
            semanticInput.placeholder = 'e.g. "Cart" or "Menu"';
            semanticInput.style.cssText = 'background:#18181b; border:1px solid rgba(255,255,255,0.1); color:#ffffff; padding:10px; border-radius:10px; font-size:12px; width:100%; outline:none; box-sizing:border-box;';
            
            // Region Selector
            const regionLabel = document.createElement('label');
            regionLabel.textContent = 'Where is this element located?';
            regionLabel.style.cssText = 'font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#a1a1aa; margin-top:4px;';
            
            const regionSelect = document.createElement('select');
            regionSelect.style.cssText = 'background:#18181b; border:1px solid rgba(255,255,255,0.1); color:#ffffff; padding:10px; border-radius:10px; font-size:12px; width:100%; outline:none; cursor:pointer;';
            const regions = ['header', 'navigation', 'main', 'footer', 'toolbar'];
            regions.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r;
                opt.textContent = r.charAt(0).toUpperCase() + r.slice(1);
                regionSelect.appendChild(opt);
            });
            
            const educationNote = document.createElement('p');
            educationNote.textContent = '💡 Adding an aria-label in your app will improve stability.';
            educationNote.style.cssText = 'margin:0; font-size:10px; color:#71717a; font-style:italic;';

            declarationContainer.appendChild(declarationTitle);
            declarationContainer.appendChild(declarationDesc);
            declarationContainer.appendChild(semanticInput);
            declarationContainer.appendChild(regionLabel);
            declarationContainer.appendChild(regionSelect);
            declarationContainer.appendChild(educationNote);
            confirmDialog.appendChild(declarationContainer);

            // --- Structural Intent UI (for semantic voids) ---
            const structuralContainer = document.createElement('div');
            structuralContainer.id = '__visual-inspector-structural';
            structuralContainer.style.cssText = 'display:none; flex-direction:column; gap:12px; margin-top:16px; padding:16px; background:rgba(234,179,8,0.05); border:1px solid rgba(234,179,8,0.2); border-radius:12px;';
            
            const structuralTitle = document.createElement('div');
            structuralTitle.textContent = 'Semantic Void Detected';
            structuralTitle.style.cssText = 'font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; color:#eab308;';
            
            const structuralDesc = document.createElement('p');
            structuralDesc.textContent = 'This element has no semantic identity. Declare its system role for structural resolution.';
            structuralDesc.style.cssText = 'margin:0; font-size:11px; color:#a1a1aa; line-height:1.4;';

            const structuralLabel = document.createElement('label');
            structuralLabel.textContent = 'What does this element represent?';
            structuralLabel.style.cssText = 'font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#a1a1aa; margin-top:4px;';
            
            const structuralSelect = document.createElement('select');
            structuralSelect.style.cssText = 'background:#18181b; border:1px solid rgba(234,179,8,0.2); color:#ffffff; padding:10px; border-radius:10px; font-size:12px; width:100%; outline:none; cursor:pointer;';
            const structuralIntents = [
                {value: 'cart', label: 'Cart / Basket'},
                {value: 'menu', label: 'Menu / Navigation'},
                {value: 'search', label: 'Search'},
                {value: 'profile', label: 'Profile / Account'},
                {value: 'close', label: 'Close / Dismiss'},
                {value: 'more', label: 'More / Options'}
            ];
            structuralIntents.forEach(intent => {
                const opt = document.createElement('option');
                opt.value = intent.value;
                opt.textContent = intent.label;
                structuralSelect.appendChild(opt);
            });
            
            const structuralWarning = document.createElement('p');
            structuralWarning.textContent = '⚠️ Structural resolution requires post-action verification.';
            structuralWarning.style.cssText = 'margin:0; font-size:10px; color:#eab308; font-weight:600;';

            structuralContainer.appendChild(structuralTitle);
            structuralContainer.appendChild(structuralDesc);
            structuralContainer.appendChild(structuralLabel);
            structuralContainer.appendChild(structuralSelect);
            structuralContainer.appendChild(structuralWarning);
            confirmDialog.appendChild(structuralContainer);

            infoDiv = document.createElement('div');
            infoDiv.style.cssText = 'font-size:11px; color:#52525b; margin-top:16px; font-family:monospace; padding-top:12px; border-top:1px solid rgba(255,255,255,0.05); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
            confirmDialog.appendChild(infoDiv);
            document.body.appendChild(confirmDialog);

            let pendingElement = null;

            function isMeaninglessName(name, role) {
                if (!name || name.trim().length === 0) return true;
                const low = name.toLowerCase().trim();
                const generic = ['a', 'svg', 'icon', 'img', 'div', 'span', 'button', 'link'];
                if (generic.includes(low)) return true;
                if (low.length === 1 && !['x', '+', '?', 'i'].includes(low)) return true;
                return false;
            }

            function isSemanticVoid(el) {
                // Allow File inputs (they have implicit browser UI)
                if (el.tagName === 'INPUT' && el.type === 'file') return false;

                // Check for ANY semantic signals
                const ariaLabel = el.getAttribute('aria-label');
                const placeholder = el.getAttribute('placeholder');
                const title = el.title || el.getAttribute('title');
                const innerText = (el.innerText || el.textContent || '').trim();
                const value = (el.value || '').trim();
                
                // Has label association?
                let hasLabel = false;
                if (el.id) {
                    const label = document.querySelector(`label[for="${el.id}"]`);
                    hasLabel = label && label.innerText.trim().length > 0;
                }
                
                // Semantic void = NO signals at all
                return !ariaLabel && !placeholder && !title && !innerText && !value && !hasLabel;
            }

            function detectSemanticRegion(el) {
                let current = el;
                while (current && current !== document.body) {
                    const tag = current.tagName ? current.tagName.toLowerCase() : '';
                    const role = current.getAttribute('role');
                    
                    if (tag === 'header' || role === 'banner') return 'header';
                    if (tag === 'nav' || role === 'navigation') return 'navigation';
                    if (tag === 'main' || role === 'main') return 'main';
                    if (tag === 'footer' || role === 'contentinfo') return 'footer';
                    if (role === 'toolbar') return 'toolbar';
                    
                    current = current.parentElement;
                }
                return 'main'; // Default fallback
            }

            yesBtn.onclick = (e) => {
                e.stopPropagation();
                if (!pendingElement) return;
                const el = pendingElement;
                
                // Extract semantic role
                let role = el.getAttribute('role');
                if (!role) {
                    const tag = el.tagName;
                    if (tag === 'BUTTON') role = 'button';
                    else if (tag === 'A') role = 'link';
                    else if (tag === 'INPUT') {
                        if (['submit', 'button', 'reset'].includes(el.type)) role = 'button';
                        else role = 'input';
                    } else {
                        role = tag.toLowerCase();
                    }
                }

                const isDeclaring = declarationContainer.style.display === 'flex';
                const isStructural = structuralContainer.style.display === 'flex';
                let name = '';
                let nameSource = 'native';
                let confidence = 'high';
                let context = null;
                let intentType = 'semantic';
                let systemRole = null;
                let verificationRequired = false;

                if (isStructural) {
                    // Structural intent mode (semantic void)
                    systemRole = structuralSelect.value;
                    name = systemRole; // Use system role as placeholder name
                    nameSource = 'user_declared';
                    confidence = 'declared';
                    intentType = 'structural';
                    verificationRequired = true;
                    context = { region: detectSemanticRegion(el) };
                } else if (isDeclaring) {
                    // Manual declaration mode (unnamed but has some text)
                    name = semanticInput.value.trim();
                    if (!name) {
                        semanticInput.style.borderColor = '#ef4444';
                        return;
                    }
                    nameSource = 'user_declared';
                    confidence = 'low';
                    context = { region: regionSelect.value };
                } else {
                    // Extract accessible name (Standardized ARIA logic)
                    name = el.getAttribute('aria-label') || '';
                    if (!name && el.id) {
                        const label = document.querySelector(`label[for="${el.id}"]`);
                        if (label) name = label.innerText;
                    }
                    if (!name) {
                        name = el.innerText || el.getAttribute('placeholder') || el.title || el.value || '';
                    }

                    // Auto-name file inputs if empty
                    if (!name && el.tagName === 'INPUT' && el.type === 'file') {
                        name = 'File Input';
                    }

                    name = name.trim();
                }

                // MAWS: Enhanced Metadata Extraction
                const testId = el.getAttribute('data-testid') || el.getAttribute('data-test-id') || el.getAttribute('data-cy') || el.getAttribute('data-qa');
                const ariaLabel = el.getAttribute('aria-label');
                const placeholder = el.getAttribute('placeholder');
                const title = el.title || el.getAttribute('title');

                // Relative Anchors (Phase 2): Find nearest landmark
                const anchors = [];
                const findLandmark = (startEl) => {
                    let current = startEl.parentElement;
                    while (current && current !== document.body) {
                        const landmark = current.querySelector('h1, h2, h3, h4, h5, h6, label, legend');
                        if (landmark && landmark !== startEl) {
                            return {
                                role: landmark.tagName.toLowerCase() === 'label' ? 'label' : 'heading',
                                name: (landmark.innerText || landmark.getAttribute('aria-label') || '').trim().substring(0, 50)
                            };
                        }
                        current = current.parentElement;
                    }
                    return null;
                };

                const nearestLandmark = findLandmark(el);
                if (nearestLandmark && nearestLandmark.name) {
                    anchors.push(nearestLandmark);
                }

                // Capabilities Detection (Deterministic)
                const detectCapabilities = (el) => {
                    const tag = el.tagName;
                    const type = el.type ? el.type.toLowerCase() : '';
                    const role = el.getAttribute('role');
                    const isContentEditable = el.isContentEditable;
                    const isDisabled = el.disabled || el.getAttribute('aria-disabled') === 'true';
                    const isReadOnly = el.readOnly || el.getAttribute('aria-readonly') === 'true';

                    const isEditable = !isDisabled && !isReadOnly && (
                        isContentEditable || 
                        tag === 'TEXTAREA' || 
                        (tag === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'image', 'hidden', 'range', 'color'].includes(type))
                    );

                    const isClickable = !isDisabled && (
                        ['BUTTON', 'A', 'SUMMARY', 'DETAILS'].includes(tag) || 
                        ['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio', 'switch', 'option'].includes(role) || 
                        (tag === 'INPUT' && ['button', 'submit', 'reset', 'image', 'checkbox', 'radio', 'file'].includes(type)) ||
                        el.onclick != null || // Native handler
                        window.getComputedStyle(el).cursor === 'pointer' // Weak signal but better than nothing for divs
                    );

                    const isSelect = !isDisabled && (
                        tag === 'SELECT' || 
                        ['listbox', 'combobox', 'menu', 'radiogroup'].includes(role)
                    );

                    const isFile = !isDisabled && (
                        tag === 'INPUT' && type === 'file'
                    );

                    const hasText = (el.innerText || '').trim().length > 0;

                    return {
                        editable: isEditable,
                        clickable: isClickable,
                        select_like: isSelect,
                        file_input: isFile,
                        readable: hasText
                    };
                };

                const capabilities = detectCapabilities(el);

                window.__lastPicked = {
                    id: Date.now().toString(),
                    role: role,
                    name: name,
                    name_source: nameSource,
                    confidence: confidence,
                    context: context,
                    intent_type: intentType,
                    system_role: systemRole,
                    verification_required: verificationRequired,
                    testId: testId || undefined,
                    ariaLabel: ariaLabel || undefined,
                    placeholder: placeholder || undefined,
                    title: title || undefined,
                    tagName: el.tagName.toLowerCase(),
                    anchors: anchors,
                    capabilities: capabilities, // New Field
                    metadata: {
                        className: el.className,
                        id: el.id,
                        innerText: el.innerText ? el.innerText.substring(0, 100) : ''
                    }
                };
                overlay.style.borderColor = '#10b981';
                overlay.style.backgroundColor = 'rgba(16,185,129,0.2)';
                confirmDialog.style.display = 'none';
                pendingElement = null;
                setTimeout(() => { updateToolbar(); }, 500);
            };

            noBtn.onclick = (e) => {
                e.stopPropagation();
                confirmDialog.style.display = 'none';
                pendingElement = null;
            };

            // Event Listeners
            document.addEventListener('mouseover', (e) => {
                if (window.__visualInspectorMode !== 'pick') return;
                
                const path = e.composedPath();
                const el = path[0];
                
                if (!el || el.id?.startsWith('__visual-inspector') || modeToolbar.contains(el) || confirmDialog.contains(el) || el === document.body || el === document.documentElement) return;
                
                const rect = el.getBoundingClientRect();
                overlay.style.top = `${rect.top}px`;
                overlay.style.left = `${rect.left}px`;
                overlay.style.width = `${rect.width}px`;
                overlay.style.height = `${rect.height}px`;
                overlay.style.borderColor = '#6366f1';
                overlay.style.backgroundColor = 'rgba(99,102,241,0.1)';
                overlay.style.display = 'block';
            }, true);

            document.addEventListener('click', (e) => {
                if (window.__visualInspectorMode !== 'pick') return;
                if (modeToolbar.contains(e.target) || confirmDialog.contains(e.target)) return;
                
                e.preventDefault(); e.stopPropagation();
                
                const path = e.composedPath();
                const el = path[0];
                
                if (!el || el === document.body || el === document.documentElement) return;

                pendingElement = el;
                const rect = el.getBoundingClientRect();
                overlay.style.top = `${rect.top}px`;
                overlay.style.left = `${rect.left}px`;
                overlay.style.width = `${rect.width}px`;
                overlay.style.height = `${rect.height}px`;
                overlay.style.display = 'block';

                // Detect if unnamed
                let nativeName = el.getAttribute('aria-label') || '';
                if (!nativeName && el.id) {
                    const label = document.querySelector(`label[for="${el.id}"]`);
                    if (label) nativeName = label.innerText;
                }
                if (!nativeName) {
                    nativeName = el.innerText || el.getAttribute('placeholder') || el.title || el.value || '';
                }
                
                // Auto-name file inputs if empty
                if (!nativeName && el.tagName === 'INPUT' && el.type === 'file') {
                    nativeName = 'File Input';
                }

                nativeName = nativeName.trim();

                const isVoid = isSemanticVoid(el);
                const isUnnamed = !isVoid && isMeaninglessName(nativeName);
                
                if (isVoid) {
                    // Semantic void - show structural intent selector
                    structuralContainer.style.display = 'flex';
                    declarationContainer.style.display = 'none';
                    yesBtn.textContent = 'Declare System Role';
                    subtitle.textContent = 'Semantic void detected';
                    subtitle.style.color = '#eab308';
                } else if (isUnnamed) {
                    // Unnamed but has some signals - show manual declaration
                    declarationContainer.style.display = 'flex';
                    structuralContainer.style.display = 'none';
                    semanticInput.value = '';
                    semanticInput.style.borderColor = 'rgba(255,255,255,0.1)';
                    
                    // Auto-detect and pre-select region
                    const detectedRegion = detectSemanticRegion(el);
                    regionSelect.value = detectedRegion;
                    
                    yesBtn.textContent = 'Declare & Use';
                    subtitle.textContent = 'Manual declaration required';
                    subtitle.style.color = '#ef4444';
                } else {
                    // Normal semantic element
                    declarationContainer.style.display = 'none';
                    structuralContainer.style.display = 'none';
                    yesBtn.textContent = 'Use Element';
                    subtitle.textContent = 'Use this element?';
                    subtitle.style.color = '#71717a';
                }

                infoDiv.textContent = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}`;
                confirmDialog.style.display = 'block';
                if (isUnnamed) semanticInput.focus();
            }, true);
        }

        createUI();
        // Sticky UI Check: Re-run every 2 seconds to ensure elements hasn't been nuked by SPA
        setInterval(createUI, 2000);
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();
