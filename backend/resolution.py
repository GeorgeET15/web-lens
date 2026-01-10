"""
Element Resolution Engine.

This module is responsible for resolving semantic ElementRefs into actual DOM elements.
STRICT ZERO-CODE IMPLEMENTATION: No CSS/XPath selectors are used. Resolution is purely semantic.
"""

from typing import Any, Optional, Dict
import os
from models import ElementRef
from browser_engine import BrowserEngine, BrowserEngineError
from structural_resolver import StructuralResolver
from failures import ElementMissingError, ElementAmbiguousError
import config

# JavaScript strategy to find element by multi-attribute weighted scoring (MAWS)
JS_FIND_SEMANTIC = r"""
function findSemantic(ref) {
    const targetRole = (ref.role || '').toLowerCase();
    const targetName = (ref.name || '').toLowerCase().trim();
    const targetTestId = ref.testId;
    const targetAriaLabel = ref.ariaLabel;
    const targetPlaceholder = ref.placeholder;
    const targetTitle = ref.title;
    const targetTagName = ref.tagName;
    const targetAnchors = ref.anchors || [];

    // Helpers
    function getRole(el) {
        if (el.getAttribute('role')) return el.getAttribute('role').toLowerCase();
        const tag = el.tagName;
        if (tag === 'BUTTON') return 'button';
        if (tag === 'A') return 'link';
        if (tag === 'INPUT') {
            if (['submit', 'button', 'reset'].includes(el.type)) return 'button';
            return 'input';
        }
        if (/^H[1-6]$/.test(tag)) return 'heading';
        if (tag === 'LABEL' || tag === 'LEGEND') return 'label';
        return tag.toLowerCase();
    }

    function getName(el) {
        // 1. Explicit ARIA
        let name = el.getAttribute('aria-label') || '';
        if (name) return name.toLowerCase().trim();

        // 2. Associated Labels (for inputs)
        if (el.id) {
            const label = document.querySelector(`label[for="${el.id}"]`);
            if (label && label.innerText) return label.innerText.toLowerCase().trim();
        }

        // 3. Content / Value / Placeholder
        name = el.innerText || el.getAttribute('placeholder') || el.title || el.value || '';
        
        // 4. Default for File Inputs
        if (!name && el.tagName === 'INPUT' && el.type === 'file') {
            name = 'file input';
        }

        return name.toLowerCase().trim();
    }

    function getDistance(el1, el2) {
        const r1 = el1.getBoundingClientRect();
        const r2 = el2.getBoundingClientRect();
        const x1 = r1.left + r1.width / 2;
        const y1 = r1.top + r1.height / 2;
        const x2 = r2.left + r2.width / 2;
        const y2 = r2.top + r2.height / 2;
        return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    }

    var candidates = [];
    
    function search(root) {
        var all = root.querySelectorAll('*');
        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            
            // Visibility check
            if (el.offsetParent === null && !el.shadowRoot) {
                var style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden') continue;
            }

            var score = 0;
            
            // 1. Test-ID Match (Highest Priority)
            const elTestId = el.getAttribute('data-testid') || el.getAttribute('data-test-id') || el.getAttribute('data-cy') || el.getAttribute('data-qa');
            if (targetTestId && elTestId === targetTestId) score += 15;

            // 2. Name Match (Semantic Anchor) - FUZZY BIDIRECTIONAL
            const elName = getName(el);
            if (targetName && elName) {
                if (elName === targetName) score += 12;
                else if (elName.includes(targetName) || targetName.includes(elName)) {
                    score += 8;
                } else {
                    // Word-by-word intersection for extreme cases
                    const targetWords = targetName.split(/\s+/).filter(w => w.length > 2);
                    const elWords = elName.split(/\s+/).filter(w => w.length > 2);
                    const intersection = targetWords.filter(w => elWords.includes(w));
                    if (intersection.length > 0) score += (intersection.length * 4);
                }
            }

            // 3. ARIA Label Match
            const elAria = el.getAttribute('aria-label');
            if (targetAriaLabel && elAria === targetAriaLabel) score += 8;

            // 4. Role Match
            const elRole = getRole(el);
            if (targetRole && targetRole !== 'any' && elRole === targetRole) score += 5;

            // 5. Placeholder / Title Match
            const elPlaceholder = el.getAttribute('placeholder');
            if (targetPlaceholder && elPlaceholder === targetPlaceholder) score += 3;
            
            const elTitle = el.title || el.getAttribute('title');
            if (targetTitle && elTitle === targetTitle) score += 3;

            // 6. Tag Match (Tie-breaker)
            if (targetTagName && el.tagName.toLowerCase() === targetTagName) score += 1;

            if (score > 5) { // Confidence threshold
                candidates.push({el: el, score: score});
            }

            // Recurse into Shadow DOM
            if (el.shadowRoot) {
                search(el.shadowRoot);
            }
        }
    }
    
    search(document);

    // 7. Proximity Bonus (Phase 2)
    if (targetAnchors.length > 0) {
        candidates.forEach(cand => {
            targetAnchors.forEach(anch => {
                const targetAnchName = anch.name.toLowerCase();
                const anchorsOnPage = Array.from(document.querySelectorAll('*')).filter(el => {
                    return getRole(el) === anch.role && getName(el) === targetAnchName;
                });

                anchorsOnPage.forEach(anchEl => {
                    const dist = getDistance(cand.el, anchEl);
                    if (dist < 400) { // Radius of influence
                        cand.score += 5;
                    }
                    if (anchEl.parentElement && anchEl.parentElement.contains(cand.el)) {
                        cand.score += 3;
                    }
                });
            });
        });
    }
    
    // Sort by score desc, then by visibility/depth
    candidates.sort(function(a, b) { 
        if (b.score !== a.score) return b.score - a.score;
        return 0;
    });
    
    const best = candidates[0];
    return { 
        element: best.el, 
        score: best.score,
        actuals: {
            role: getRole(best.el),
            name: getName(best.el),
            testId: best.el.getAttribute('data-testid') || best.el.getAttribute('data-test-id') || best.el.getAttribute('data-cy') || best.el.getAttribute('data-qa'),
            ariaLabel: best.el.getAttribute('aria-label'),
            placeholder: best.el.getAttribute('placeholder'),
            title: best.el.title || best.el.getAttribute('title'),
            tagName: best.el.tagName.toLowerCase()
        }
    };
}
return findSemantic(arguments[0]);
"""

# JavaScript strategy for region-scoped resolution (user-declared elements)
JS_FIND_IN_REGION = """
function findInRegion(ref) {
    const targetRole = (ref.role || '').toLowerCase();
    const targetRegion = ref.region;
    
    // Helper to get role
    function getRole(el) {
        if (el.getAttribute('role')) return el.getAttribute('role').toLowerCase();
        const tag = el.tagName;
        if (tag === 'BUTTON') return 'button';
        if (tag === 'A') return 'link';
        if (tag === 'INPUT') {
            if (['submit', 'button', 'reset'].includes(el.type)) return 'button';
            return 'input';
        }
        return tag.toLowerCase();
    }
    
    // Find the semantic region
    let regionRoot = null;
    const regionMap = {
        'header': ['HEADER', 'banner'],
        'navigation': ['NAV', 'navigation'],
        'main': ['MAIN', 'main'],
        'footer': ['FOOTER', 'contentinfo'],
        'toolbar': [null, 'toolbar']
    };
    
    const [tagName, roleName] = regionMap[targetRegion] || [null, null];
    
    // Search for region by tag or role
    if (tagName) {
        regionRoot = document.querySelector(tagName.toLowerCase());
    }
    if (!regionRoot && roleName) {
        regionRoot = document.querySelector(`[role="${roleName}"]`);
    }
    
    // Fallback to body if no region found
    if (!regionRoot) {
        console.warn(`Region "${targetRegion}" not found, searching entire page`);
        regionRoot = document.body;
    }
    
    // Find all elements matching the role within the region
    const matches = [];
    const all = regionRoot.querySelectorAll('*');
    
    for (let i = 0; i < all.length; i++) {
        const el = all[i];
        
        // Visibility check
        if (el.offsetParent === null && !el.shadowRoot) {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') continue;
        }
        
        const elRole = getRole(el);
        if (targetRole && elRole === targetRole) {
            matches.push(el);
        }
    }
    
    // STRICT: Must find exactly 1 match
    if (matches.length === 0) {
        return {error: 'no_match', region: targetRegion, role: targetRole};
    }
    if (matches.length > 1) {
        return {error: 'multiple_matches', count: matches.length, region: targetRegion, role: targetRole};
    }
    
    return {element: matches[0]};
}
return findInRegion(arguments[0]);
"""

class ElementResolver:
    """
    Resolves abstract ElementRefs to concrete DOM elements (Handles).
    Using Multi-Attribute Weighted Scoring (MAWS).
    """
    
    def resolve(self, engine: BrowserEngine, ref: ElementRef) -> tuple[Any, float, Optional[Dict[str, Any]]]:
        """
        Resolve an element using structural (void), region-scoped (user-declared), or MAWS (native) strategy.
        Returns a tuple of (element_handle, confidence_score, actual_attributes).
        """
        # Check if this is a structural intent element (semantic void)
        is_structural = hasattr(ref, 'intent_type') and ref.intent_type == 'structural'
        
        if is_structural:
            # Use structural resolver for semantically void elements
            structural_resolver = StructuralResolver()
            return structural_resolver.resolve(engine, ref)
        
        # Check if this is a user-declared element with regional context
        is_user_declared = hasattr(ref, 'name_source') and ref.name_source == 'user_declared'
        has_context = hasattr(ref, 'context') and ref.context and 'region' in ref.context
        
        if is_user_declared and has_context:
            # Use region-scoped resolution
            region = ref.context['region']
            ref_data = {
                "role": ref.role,
                "region": region
            }
            
            try:
                result = engine.execute_script(JS_FIND_IN_REGION, ref_data)
                
                # Handle error responses
                if isinstance(result, dict) and 'error' in result:
                    error_type = result['error']
                    if error_type == 'no_match':
                        raise ElementMissingError(
                            name=ref.role,
                            intent=f"Resolving '{ref.role}' in '{result['region']}' region",
                            reason=f"No element matching '{ref.role}' found in the '{result['region']}' region.",
                            guidance="This element was manually declared. Adding an aria-label to the application will improve stability."
                        )
                    elif error_type == 'multiple_matches':
                        raise ElementAmbiguousError(
                            name=ref.role,
                            count=result['count'],
                            region=result['region'],
                            intent=f"Resolving '{ref.role}' in '{result['region']}' region"
                        )
                
                # Success - extract element
                if isinstance(result, dict) and 'element' in result:
                    # User-declared regional matches are considered high confidence if found
                    return result['element'], 1.0, None
                    
            except BrowserEngineError:
                raise
            except Exception as e:
                raise BrowserEngineError(
                    f"Failed to resolve user-declared element '{ref.name}' in {region} region.",
                    technical_details=str(e)
                )
        
        # Standard MAWS resolution for native elements
        ref_data = {
            "role": ref.role,
            "name": ref.name,
            "testId": ref.metadata.get("testId"),
            "ariaLabel": ref.metadata.get("ariaLabel"),
            "placeholder": ref.metadata.get("placeholder"),
            "title": ref.metadata.get("title"),
            "tagName": ref.metadata.get("tagName"),
            "anchors": ref.metadata.get("anchors")
        }

        try:
            result = engine.execute_script(JS_FIND_SEMANTIC, ref_data)
            if result and isinstance(result, dict) and 'element' in result:
                # Normalize score: Assume 20+ is "Healthy High" (1.0), Scale 5-20
                raw_score = result.get('score', 0)
                norm_score = min(1.0, raw_score / 20.0) if raw_score > 0 else 0
                return result['element'], norm_score, result.get('actuals')
        except Exception as e:
            # Check if it's a browser error or just not found
            if isinstance(e, BrowserEngineError):
                raise e
            # Otherwise ignore internal script errors and proceed to raise NotFound
            pass
            
        # STRICT SEMANTIC PURITY: No ID or selector fallback.
        # If we can't find it by name/role, the test MUST fail.
        
        raise ElementMissingError(
            name=ref.name,
            intent=f"Locating '{ref.name}'",
            reason=f"Could not find the {ref.role or 'element'} named '{ref.name}'.",
            guidance="The page may have changed or the element is not visible. Check if you are on the correct page."
        )


class FileResolver:
    """
    Resolves FileRefs to actual filesystem paths.
    Enforces sandbox/safety.
    """
    
    # Store uploads in a safe directory (aligned with main.py)
    UPLOAD_DIR = str(config.DATA_DIR / "test_assets" / "uploads")
    
    @classmethod
    def resolve(cls, file_ref_id: str) -> str:
        """
        Resolve file ID to absolute path.
        """
        # Ensure dir exists
        os.makedirs(cls.UPLOAD_DIR, exist_ok=True)
        
        target_path = os.path.join(cls.UPLOAD_DIR, file_ref_id)
        
        # Security check: Prevent path traversal
        if not os.path.abspath(target_path).startswith(os.path.abspath(cls.UPLOAD_DIR)):
             raise ValueError("Security Violation: File path traversal attempt")
             
        if not os.path.exists(target_path):
             # For improved DX, if not found, we list what IS there
             files = os.listdir(cls.UPLOAD_DIR) if os.path.exists(cls.UPLOAD_DIR) else []
             raise ValueError(f"File unavailable: {file_ref_id}. (Available: {files})")
             
        return target_path
