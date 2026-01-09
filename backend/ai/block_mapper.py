from typing import Any, Dict

# Mapping from common AI-generated names to valid WebLens block types
BLOCK_TYPE_MAPPING = {
    # Navigation
    "gotourl": "open_page",
    "navigate": "open_page",
    "openpage": "open_page",
    "goto": "open_page",
    "visit": "open_page",
    "navigateto": "open_page",
    
    "refresh": "refresh_page",
    "reload": "refresh_page",
    "reloadpage": "refresh_page",
    
    "waitforload": "wait_for_page_load",
    "waitforpageload": "wait_for_page_load",
    
    # Element Interactions
    "click": "click_element",
    "clickbutton": "click_element",
    "clickon": "click_element",
    "clickelement": "click_element",
    "press": "click_element",
    
    "type": "enter_text",
    "entertext": "enter_text",
    "input": "enter_text",
    "typetext": "enter_text",
    "fill": "enter_text",
    "enter": "enter_text",
    
    "select": "select_option",
    "chooseoption": "select_option",
    "selectoption": "select_option",
    "choose": "select_option",
    
    "scroll": "scroll_to_element",
    "scrollto": "scroll_to_element",
    "scrolltoelement": "scroll_to_element",
    
    "upload": "upload_file",
    "uploadfile": "upload_file",
    
    "submit": "submit_form",
    "submitform": "submit_form",
    
    "clickprimary": "activate_primary_action",
    "activateprimary": "activate_primary_action",
    "primaryaction": "activate_primary_action",
    "mainaction": "activate_primary_action",
    "clickmain": "activate_primary_action",
    "clickprimarybutton": "activate_primary_action",
    "clickmainbutton": "activate_primary_action",
    "clickaction": "activate_primary_action",
    "triggerprimary": "activate_primary_action",
    "execute": "activate_primary_action",
    "runstart": "activate_primary_action",
    
    "submitinput": "submit_current_input",
    "submitcurrent": "submit_current_input",
    
    # Waiting & Verification
    "wait": "wait_until_visible",
    "waitfor": "wait_until_visible",
    "waituntilvisible": "wait_until_visible",
    "waituntil": "wait_until_visible",
    
    "checkvisible": "assert_visible",
    "verify": "assert_visible",
    "assertvisible": "assert_visible",
    "isvisible": "assert_visible",
    
    "checktext": "verify_text",
    "verifytext": "verify_text",
    
    "verifycontent": "verify_page_content",
    "checkpagecontent": "verify_page_content",
    "verifypagecontent": "verify_page_content",
    
    "checktitle": "verify_page_title",
    "verifytitle": "verify_page_title",
    "verifypagetitle": "verify_page_title",
    
    "checkurl": "verify_url",
    "verifyurl": "verify_url",
    
    "checkenabled": "verify_element_enabled",
    "verifyenabled": "verify_element_enabled",
    "verifyelementenabled": "verify_element_enabled",
    
    "checknetwork": "verify_network_request",
    "verifynetwork": "verify_network_request",
    "verifynetworkrequest": "verify_network_request",
    
    "checkperformance": "verify_performance",
    "verifyperformance": "verify_performance",
    
    # Data & State
    "savevalue": "save_text",
    "store": "save_text",
    "savetext": "save_text",
    "capture": "save_text",
    
    "savecontent": "save_page_content",
    "savepagecontent": "save_page_content",
    
    "usesaved": "use_saved_value",
    "getvalue": "use_saved_value",
    "usesavedvalue": "use_saved_value",
    "retrieve": "use_saved_value",
    
    # Control Flow
    "if": "if_condition",
    "conditional": "if_condition",
    "ifcondition": "if_condition",
    
    "loop": "repeat_until",
    "while": "repeat_until",
    "repeatuntil": "repeat_until",
    "repeat": "repeat_until",
    
    "sleep": "delay",
    "pause": "delay",
    "delay": "delay",
    
    # Dialogs
    "acceptdialog": "confirm_dialog",
    "ok": "confirm_dialog",
    "confirmdialog": "confirm_dialog",
    "accept": "confirm_dialog",
    
    "canceldialog": "dismiss_dialog",
    "close": "dismiss_dialog",
    "dismissdialog": "dismiss_dialog",
    "dismiss": "dismiss_dialog",
}


def normalize_block_type(block_type: str) -> str:
    """
    Normalize a block type string to a valid WebLens block type.
    
    Args:
        block_type: The AI-generated block type (e.g., "GoToURL", "Type", "Click")
        
    Returns:
        The normalized WebLens block type (e.g., "open_page", "enter_text", "click_element")
        or the original if no mapping is found
    """
    # Convert to lowercase and remove spaces/underscores for matching
    normalized = block_type.lower().replace(" ", "").replace("_", "").replace("-", "")
    
    # Check if we have a mapping
    if normalized in BLOCK_TYPE_MAPPING:
        return BLOCK_TYPE_MAPPING[normalized]
    
    # If it's already a valid type, return as-is
    valid_types = {
        'open_page', 'click_element', 'enter_text', 'wait_until_visible', 'assert_visible',
        'if_condition', 'repeat_until', 'delay', 'refresh_page', 'wait_for_page_load',
        'select_option', 'upload_file', 'verify_text', 'verify_page_content', 'scroll_to_element',
        'save_text', 'save_page_content', 'verify_page_title', 'verify_url', 'verify_element_enabled',
        'use_saved_value', 'verify_network_request', 'verify_performance', 'submit_form',
        'confirm_dialog', 'dismiss_dialog', 'activate_primary_action', 'submit_current_input'
    }
    
    if block_type.lower() in valid_types:
        return block_type.lower()
    
    # Return original if no mapping found
    return block_type


def inflate_element(element: Any) -> Dict[str, Any]:
    """
    Convert a simple string or incomplete element dict into a valid ElementRef-like dict.
    """
    import uuid
    
    if isinstance(element, str):
        if not element or element.strip() == "":
            return {}
        
        # If it's a string, we treat it as the 'name' and use 'any' as role
        return {
            "id": f"ai_ref_{uuid.uuid4().hex[:8]}",
            "role": "any",
            "name": element,
            "name_source": "native",
            "confidence": "high",
            "intent_type": "semantic",
            "metadata": {}
        }
    
    if isinstance(element, dict):
        # Already a dict, ensure it has the minimum required fields for Pydantic if possible
        if "id" not in element:
            element["id"] = f"ai_ref_{uuid.uuid4().hex[:8]}"
        if "role" not in element:
            element["role"] = "any"
        if "name" not in element:
            element["name"] = "unknown"
        if "name_source" not in element:
            element["name_source"] = "native"
        if "confidence" not in element:
            element["confidence"] = "high"
        if "intent_type" not in element:
            element["intent_type"] = "semantic"
        if "metadata" not in element:
            element["metadata"] = {}
        return element
        
    return {}

def map_blocks(blocks: list, agentic: bool = False) -> list:
    """
    Map a list of AI-generated blocks to valid WebLens blocks.
    
    Args:
        blocks: List of block dictionaries with 'type', 'label', 'params'
        agentic: If True, inflate element strings into semantic refs.
        
    Returns:
        List of blocks with normalized types and optionally inflated elements.
    """
    mapped_blocks = []
    
    for block in blocks:
        if not isinstance(block, dict) or 'type' not in block:
            continue
            
        original_type = block['type']
        normalized_type = normalize_block_type(original_type)
        
        # Create new params with inflated elements if in agentic mode
        params = block.get('params', {}).copy()
        if agentic and 'element' in params:
            params['element'] = inflate_element(params['element'])
            
            # For blocks that use 'description' as a fallback, ensure it's set
            if 'description' not in params and 'element' in params and isinstance(params['element'], dict):
                params['description'] = params['element'].get('name')

        # Create new block with normalized type
        mapped_block = {
            **block,
            'id': block.get('id', f"ai_block_{uuid.uuid4().hex[:8]}"),
            'type': normalized_type,
            'params': params
        }
        
        mapped_blocks.append(mapped_block)
        
        # Log if we mapped something
        if original_type != normalized_type:
            print(f"Mapped block type: {original_type} -> {normalized_type}")
    
    return mapped_blocks

import uuid # Ensure uuid is available for map_blocks too

