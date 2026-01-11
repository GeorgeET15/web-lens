"""
WebLens Flow Export/Import Utilities

Handles encoding and decoding of .weblens files with metadata and validation.
"""

import json
import hashlib
from typing import Dict, Tuple, Any, Optional
from datetime import datetime

WEBLENS_VERSION = "1.0"
WEBLENS_SIGNATURE = "WEBLENS_V1"


def calculate_checksum(data: str) -> str:
    """Calculate SHA256 checksum of flow data."""
    return hashlib.sha256(data.encode('utf-8')).hexdigest()


def encode_weblens(flow: Dict[str, Any], flow_name: Optional[str] = None, flow_description: Optional[str] = None) -> str:
    """
    Encode a flow dictionary into .weblens file format.
    
    Args:
        flow: Flow definition dictionary
        flow_name: Optional override for flow name
        flow_description: Optional override for flow description
        
    Returns:
        String content in .weblens format
    """
    # Extract flow info
    name = flow_name or flow.get('name', 'Untitled Flow')
    description = flow_description or flow.get('description', '')
    block_count = len(flow.get('blocks', []))
    
    # Serialize flow data
    flow_json = json.dumps(flow, indent=2, ensure_ascii=False)
    checksum = calculate_checksum(flow_json)
    
    # Build metadata
    metadata = {
        "format_version": WEBLENS_VERSION,
        "exported_at": datetime.utcnow().isoformat() + "Z",
        "exported_by": "WebLens v1.0.0",
        "flow_name": name,
        "flow_description": description,
        "block_count": block_count,
        "checksum": checksum
    }
    
    metadata_json = json.dumps(metadata, indent=2, ensure_ascii=False)
    
    # Assemble .weblens file
    content_parts = [
        WEBLENS_SIGNATURE,
        "---METADATA---",
        metadata_json,
        "---FLOW---",
        flow_json,
        "---END---"
    ]
    
    return "\n".join(content_parts)


def decode_weblens(content: str) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Decode a .weblens file into metadata and flow data.
    
    Args:
        content: Raw .weblens file content
        
    Returns:
        Tuple of (metadata, flow)
        
    Raises:
        ValueError: If file format is invalid or checksum fails
    """
    lines = content.split('\n')
    
    # Validate signature
    if not lines or lines[0].strip() != WEBLENS_SIGNATURE:
        raise ValueError(f"Invalid .weblens file: Missing or incorrect signature. Expected '{WEBLENS_SIGNATURE}'")
    
    # Find section markers
    try:
        metadata_start = lines.index("---METADATA---") + 1
        flow_start = lines.index("---FLOW---") + 1
        end_marker = lines.index("---END---")
    except ValueError as e:
        raise ValueError(f"Invalid .weblens file: Missing section markers") from e
    
    # Extract sections
    metadata_lines = lines[metadata_start:flow_start - 1]
    flow_lines = lines[flow_start:end_marker]
    
    metadata_json = "\n".join(metadata_lines)
    flow_json = "\n".join(flow_lines)
    
    # Parse JSON
    try:
        metadata = json.loads(metadata_json)
        flow = json.loads(flow_json)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid .weblens file: Malformed JSON") from e
    
    # Validate checksum
    expected_checksum = metadata.get('checksum')
    if expected_checksum:
        actual_checksum = calculate_checksum(flow_json)
        if actual_checksum != expected_checksum:
            raise ValueError(f"Invalid .weblens file: Checksum mismatch (file may be corrupted)")
    
    # Validate format version
    format_version = metadata.get('format_version')
    if format_version != WEBLENS_VERSION:
        # In the future, we can add migration logic here
        raise ValueError(f"Unsupported .weblens format version: {format_version} (expected {WEBLENS_VERSION})")
    
    return metadata, flow


def validate_weblens(content: str) -> Tuple[bool, Optional[str]]:
    """
    Validate a .weblens file without fully parsing it.
    
    Args:
        content: Raw .weblens file content
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        decode_weblens(content)
        return True, None
    except ValueError as e:
        return False, str(e)
    except Exception as e:
        return False, f"Unexpected error: {str(e)}"
