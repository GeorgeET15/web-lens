/**
 * WebLens AI Perception Service
 * Captures semantic page context for Visual Saliency Analysis.
 */
(function() {
    const getRole = (el) => {
        let role = el.getAttribute('role');
        if (role) return role;
        const tag = el.tagName;
        if (tag === 'BUTTON') return 'button';
        if (tag === 'A') return 'link';
        if (tag === 'INPUT') return el.type || 'input';
        if (tag === 'NAV') return 'navigation';
        if (tag === 'FOOTER') return 'contentinfo';
        if (tag === 'HEADER') return 'banner';
        if (tag === 'MAIN') return 'main';
        if (/^H[1-6]$/.test(tag)) return 'heading';
        return tag.toLowerCase();
    };

    const getName = (el) => {
        return (el.getAttribute('aria-label') || 
                el.innerText || 
                el.getAttribute('placeholder') || 
                el.title || 
                '').trim().substring(0, 100);
    };

    const isVisible = (el) => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               el.offsetParent !== null;
    };

    const scrapeTree = () => {
        const result = {
            url: window.location.href,
            title: document.title,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                scrollX: window.scrollX,
                scrollY: window.scrollY
            },
            elements: []
        };

        // Focus on "Saliency" elements: Headings, Buttons, Links, Inputs, Images
        const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, button, a, input, [role], img');
        elements.forEach(el => {
            if (!isVisible(el)) return;

            const rect = el.getBoundingClientRect();
            if (rect.width < 5 || rect.height < 5) return;

            result.elements.push({
                tag: el.tagName.toLowerCase(),
                role: getRole(el),
                name: getName(el),
                rect: {
                    x: Math.round(rect.x),
                    y: Math.round(rect.y),
                    w: Math.round(rect.width),
                    h: Math.round(rect.height)
                }
            });
        });

        return result;
    };

    return JSON.stringify(scrapeTree());
})();
