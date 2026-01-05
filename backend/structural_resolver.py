"""
Structural Intent Resolver.

Handles resolution of semantically void elements through multi-signal scoring.
This is ONLY used when semantic resolution is impossible (no accessible name, no text, no aria-label).

PHILOSOPHY:
- Structural intent is EXPLICIT (user declares system role)
- Resolution uses MULTIPLE weak signals together
- Requires HIGH confidence threshold
- Mandatory post-action verification
"""

from typing import Any, Optional, Dict, List
from models import ElementRef, STRUCTURAL_INTENTS
from browser_engine import BrowserEngine, BrowserEngineError

# JavaScript for multi-signal structural resolution
JS_STRUCTURAL_RESOLVE = """
function resolveStructuralIntent(systemRole, region) {
    // Icon pattern keywords for each system role
    const ICON_PATTERNS = {
        'cart': ['cart', 'shopping', 'basket', 'bag'],
        'basket': ['cart', 'shopping', 'basket', 'bag'],
        'menu': ['menu', 'hamburger', 'bars', 'nav'],
        'navigation': ['menu', 'hamburger', 'bars', 'nav'],
        'search': ['search', 'magnify', 'find', 'glass'],
        'profile': ['user', 'account', 'person', 'profile', 'avatar'],
        'account': ['user', 'account', 'person', 'profile'],
        'close': ['close', 'x', 'times', 'dismiss', 'cancel'],
        'dismiss': ['close', 'x', 'times', 'dismiss'],
        'more': ['more', 'ellipsis', 'dots', 'options', 'overflow']
    };
    
    const patterns = ICON_PATTERNS[systemRole] || [];
    
    // Find region root
    let regionRoot = document.body;
    if (region) {
        const regionMap = {
            'header': ['HEADER', 'banner'],
            'navigation': ['NAV', 'navigation'],
            'main': ['MAIN', 'main'],
            'footer': ['FOOTER', 'contentinfo'],
            'toolbar': [null, 'toolbar']
        };
        const [tagName, roleName] = regionMap[region] || [null, null];
        if (tagName) regionRoot = document.querySelector(tagName.toLowerCase()) || regionRoot;
        if (!regionRoot && roleName) regionRoot = document.querySelector(`[role="${roleName}"]`) || document.body;
    }
    
    // Find all interactive elements in region
    const candidates = [];
    const interactive = regionRoot.querySelectorAll('a, button, [role="button"], [role="link"]');
    
    for (let i = 0; i < interactive.length; i++) {
        const el = interactive[i];
        
        // Skip if not visible
        if (el.offsetParent === null) {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') continue;
        }
        
        let score = 0;
        
        // Signal 1: Icon pattern matching (SVG, class names, data attributes)
        const elHTML = el.innerHTML.toLowerCase();
        const elClass = (el.className || '').toLowerCase();
        const elData = JSON.stringify(Array.from(el.attributes).map(a => a.name + '=' + a.value)).toLowerCase();
        
        patterns.forEach(pattern => {
            if (elHTML.includes(pattern)) score += 15;
            if (elClass.includes(pattern)) score += 10;
            if (elData.includes(pattern)) score += 8;
        });
        
        // Signal 2: Position clustering (top-right for cart/profile, top-left for menu)
        const rect = el.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const isTopRight = rect.right > viewportWidth * 0.7 && rect.top < 100;
        const isTopLeft = rect.left < viewportWidth * 0.3 && rect.top < 100;
        
        if (['cart', 'basket', 'profile', 'account'].includes(systemRole) && isTopRight) {
            score += 12;
        }
        if (['menu', 'navigation', 'hamburger'].includes(systemRole) && isTopLeft) {
            score += 12;
        }
        
        // Signal 3: Navigation behavior (href patterns)
        const href = (el.getAttribute('href') || '').toLowerCase();
        if (systemRole === 'cart' && (href.includes('cart') || href.includes('checkout'))) score += 10;
        if (systemRole === 'profile' && (href.includes('profile') || href.includes('account'))) score += 10;
        if (systemRole === 'search' && (href.includes('search') || href.includes('find'))) score += 10;
        
        // Signal 4: Semantic hints in nearby text
        const parent = el.parentElement;
        if (parent) {
            const parentText = (parent.innerText || '').toLowerCase();
            patterns.forEach(pattern => {
                if (parentText.includes(pattern)) score += 5;
            });
        }
        
        if (score > 0) {
            candidates.push({
                element: el,
                score: score,
                position: {x: rect.left, y: rect.top}
            });
        }
    }
    
    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);
    
    // Return top candidate with score
    if (candidates.length === 0) {
        return {error: 'no_candidates', systemRole: systemRole, region: region};
    }
    
    const best = candidates[0];
    
    // STRICT: Require high confidence (threshold = 25)
    if (best.score < 25) {
        return {
            error: 'low_confidence', 
            systemRole: systemRole, 
            score: best.score,
            threshold: 25
        };
    }
    
    return {
        element: best.element,
        score: best.score,
        candidateCount: candidates.length
    };
}
return resolveStructuralIntent(arguments[0], arguments[1]);
"""


class StructuralResolver:
    """
    Resolves structural intent elements using multi-signal scoring.
    """
    
    def resolve(self, engine: BrowserEngine, ref: ElementRef) -> Any:
        """
        Resolve a structural intent element.
        
        Args:
            engine: Browser engine instance
            ref: ElementRef with intent_type="structural"
            
        Returns:
            Element handle
            
        Raises:
            BrowserEngineError: If resolution fails or confidence is too low
        """
        if ref.intent_type != "structural":
            raise ValueError("StructuralResolver only handles structural intent elements")
        
        if not ref.system_role:
            raise ValueError("Structural intent requires system_role to be set")
        
        if ref.system_role not in STRUCTURAL_INTENTS:
            raise ValueError(f"Unknown system role: {ref.system_role}")
        
        # Extract region from context
        region = None
        if ref.context and 'region' in ref.context:
            region = ref.context['region']
        
        try:
            result = engine.execute_script(JS_STRUCTURAL_RESOLVE, ref.system_role, region)
            
            # Handle error responses
            if isinstance(result, dict) and 'error' in result:
                error_type = result['error']
                
                if error_type == 'no_candidates':
                    raise BrowserEngineError(
                        f"No interactive elements found for '{result['systemRole']}' in {result.get('region', 'page')}.",
                        technical_details=(
                            f"Structural resolution searched for elements matching the '{result['systemRole']}' "
                            f"system role but found no candidates. The element may not exist or may not be visible."
                        )
                    )
                
                elif error_type == 'low_confidence':
                    raise BrowserEngineError(
                        f"Low confidence match for '{result['systemRole']}' (score: {result['score']}/{result['threshold']}).",
                        technical_details=(
                            f"Structural resolution found a candidate but confidence score ({result['score']}) "
                            f"is below the required threshold ({result['threshold']}). The element may be ambiguous "
                            f"or the icon pattern may not match expectations. Adding an aria-label will eliminate "
                            f"the need for structural resolution."
                        )
                    )
            
            # Success - extract element
            if isinstance(result, dict) and 'element' in result:
                # Log success with score
                score = result.get('score', 0)
                candidate_count = result.get('candidateCount', 0)
                print(f"[Structural Resolution] Resolved '{ref.system_role}' with score {score} ({candidate_count} candidates)")
                return result['element']
            
        except BrowserEngineError:
            raise
        except Exception as e:
            raise BrowserEngineError(
                f"Failed to resolve structural intent '{ref.system_role}'.",
                technical_details=str(e)
            )
        
        # Fallback error
        raise BrowserEngineError(
            f"Structural resolution failed for '{ref.system_role}'.",
            technical_details="Unexpected resolution result"
        )
