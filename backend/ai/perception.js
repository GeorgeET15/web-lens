/**
 * Headless Page Perception Script for WebLens AI
 * Extracted from inspector.js to provide semantic fidelity to the AI.
 */
(function() {
    const items = Array.from(document.querySelectorAll('button, a, input, [role="button"], [role="link"], select, textarea, [onclick], [contenteditable="true"]'));
    const seen = new Set();
    
    function isMeaninglessName(name) {
        if (!name || name.trim().length === 0) return true;
        const low = name.toLowerCase().trim();
        const generic = ['a', 'svg', 'icon', 'img', 'div', 'span', 'button', 'link'];
        if (generic.includes(low)) return true;
        return false;
    }

    function isSemanticVoid(el) {
        if (el.tagName === 'INPUT' && el.type === 'file') return false;
        const ariaLabel = el.getAttribute('aria-label');
        const placeholder = el.getAttribute('placeholder');
        const title = el.title || el.getAttribute('title');
        const innerText = (el.innerText || el.textContent || '').trim();
        const value = (el.value || '').trim();
        let hasLabel = false;
        if (el.id) {
            const label = document.querySelector(`label[for="${el.id}"]`);
            hasLabel = label && label.innerText.trim().length > 0;
        }
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
            current = current.parentElement;
        }
        return 'body';
    }

    function detectCapabilities(el) {
        const tag = el.tagName;
        const type = el.type ? el.type.toLowerCase() : '';
        const role = el.getAttribute('role');
        const isDisabled = el.disabled || el.getAttribute('aria-disabled') === 'true';
        
        const isEditable = !isDisabled && (
            el.isContentEditable || 
            tag === 'TEXTAREA' || 
            (tag === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'hidden'].includes(type))
        );

        const isClickable = !isDisabled && (
            ['BUTTON', 'A', 'SUMMARY', 'DETAILS'].includes(tag) || 
            ['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio', 'switch'].includes(role) || 
            (tag === 'INPUT' && ['button', 'submit', 'reset', 'image', 'file'].includes(type)) ||
            el.onclick != null ||
            window.getComputedStyle(el).cursor === 'pointer'
        );

        return {
            editable: isEditable,
            clickable: isClickable,
            file: tag === 'INPUT' && type === 'file'
        };
    }

    return items.map(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return null;
        
        let role = el.getAttribute('role') || el.tagName.toLowerCase();
        let name = el.getAttribute('aria-label') || '';
        if (!name && el.id) {
            const label = document.querySelector(`label[for="${el.id}"]`);
            if (label) name = label.innerText;
        }
        if (!name) name = el.innerText || el.getAttribute('placeholder') || el.title || el.value || '';
        name = name.trim().substring(0, 60);

        if (!name && role !== 'input' && !isSemanticVoid(el)) return null;
        
        const caps = detectCapabilities(el);
        const region = detectSemanticRegion(el);
        const isVoid = isSemanticVoid(el);
        
        const key = `${role}:${name}:${region}`;
        if (seen.has(key)) return null;
        seen.add(key);

        let status = [];
        if (caps.clickable) status.push('clickable');
        if (caps.editable) status.push('editable');
        if (isVoid) status.push('VOID (no-label)');

        return `[${region}] ${role}: "${name || 'Unnamed'}" (${status.join(', ')})`;
    }).filter(Boolean).slice(0, 60).join('\n');
})();
