import hashlib
from typing import Any, Dict

JS_GET_STRUCTURAL_SNAPSHOT = """
function getStructuralSnapshot() {
    function segment(el) {
        // We only care about tags and roles for "structure"
        // Ignore IDs and dynamic classes
        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute('role') || '';
        const childCount = el.children.length;
        
        let s = `<${tag}${role ? ' role=' + role : ''}>`;
        if (childCount > 0) {
            for (let i = 0; i < el.children.length; i++) {
                s += segment(el.children[i]);
            }
        }
        s += `</${tag}>`;
        return s;
    }
    return segment(document.body);
}
return getStructuralSnapshot();
"""

class StructuralVisualService:
    @staticmethod
    def get_snapshot(engine: Any) -> str:
        """Capture a structural string representation of the page."""
        try:
            return engine.execute_script(JS_GET_STRUCTURAL_SNAPSHOT)
        except Exception as e:
            return f"Error: {str(e)}"

    @staticmethod
    def get_hash(snapshot: str) -> str:
        """Generate a stable hash for the structure."""
        return hashlib.sha256(snapshot.encode('utf-8')).hexdigest()

    @staticmethod
    def compare(s1: str, s2: str) -> float:
        """
        Simple structural comparison score (0.0 to 1.0).
        0.0 = Identical
        1.0 = Completely different
        """
        if s1 == s2:
            return 0.0
        
        # Simple similarity: (length of shared prefix / max length)
        # In a real app we'd use tree-diffing, but string-diff is a good start for V2.0
        import difflib
        matcher = difflib.SequenceMatcher(None, s1, s2)
        return 1.0 - matcher.ratio()

structural_visual_service = StructuralVisualService()
