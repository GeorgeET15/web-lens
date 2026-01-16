/**
 * WebLens Autonomous AI Inspector
 * Pure semantic scraping engine - no UI, no overlays.
 */
(function() {
    // Prevent double initialization
    if (window.__aiInspectorActive) return;
    window.__aiInspectorActive = true;

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
            el.onclick != null || 
            window.getComputedStyle(el).cursor === 'pointer'
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

    window.__scrapeInteractions = function() {
        if (!document.body) return [];
        
        const interactiveElements = [];
        const allElements = document.querySelectorAll('button, a, input, select, textarea, [role], [onclick], [contenteditable="true"]');
        
        const potentialTargets = Array.from(allElements);
        
        potentialTargets.forEach((el, index) => {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') return;
            
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            let name = el.getAttribute('aria-label') || '';
            if (!name && el.id) {
                const label = document.querySelector(`label[for="${el.id}"]`);
                if (label) name = label.innerText;
            }
            if (!name) {
                name = (el.innerText || el.getAttribute('placeholder') || el.title || el.value || '').trim();
            }
            if (!name && el.tagName === 'INPUT' && el.type === 'file') name = 'File Input';
            
            name = name.substring(0, 100);

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

            interactiveElements.push({
                id: (index + 1).toString(),
                tagName: el.tagName.toLowerCase(),
                role: role,
                name: name,
                capabilities: detectCapabilities(el),
                metadata: {
                    id: el.id || undefined,
                    className: el.className || undefined
                }
            });
        });

        return interactiveElements.slice(0, 150);
    };

    console.log("WebLens: Autonomous AI Inspector Loaded.");
})();
