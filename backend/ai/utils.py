import json
from typing import Any, Dict, List, Union

def strip_heavy_data(data: Any) -> Any:
    """
    Recursively remove heavy binary/text data from execution reports 
    to prevent LLM context overflow and quota exhaustion.
    """
    if isinstance(data, dict):
        new_dict = {}
        for k, v in data.items():
            # BROAD MATCH for heavy data keys
            k_lower = k.lower()
            if any(key in k_lower for key in ['screenshot', 'html', 'snapshot', 'outer_html', 'previewimage', 'image_data', 'binary']):
                continue
            new_dict[k] = strip_heavy_data(v)
        return new_dict
    elif isinstance(data, list):
        return [strip_heavy_data(item) for item in data]
    else:
        return data
