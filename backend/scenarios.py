"""
Scenario Expansion Module

This module handles:
1. Scenario template generation from Global Variables
2. CSV validation and parsing
3. Variable override for scenario execution

Philosophy: CSV is a TRANSPORT FORMAT for data, never logic.
Scenarios are driven by Global Variables, not blocks.
"""

import csv
import io
import time
from typing import List, Dict, Tuple
from models import (
    FlowGraph,
    ScenarioTemplate, Scenario
)


class ScenarioTemplateGenerator:
    """Generates CSV templates from Global Variables ONLY."""
    
    @staticmethod
    def generate_template(flow: FlowGraph) -> ScenarioTemplate:
        """
        Generate CSV template from Global Variables.
        
        NEW RULE: CSV templates are derived ONLY from Global Variables,
        never from blocks. This makes variability explicit and intentional.
        
        Validation:
        - Flow must be RUNNABLE
        - At least one Global Variable must exist
        
        Returns:
            ScenarioTemplate with columns matching Global Variable names
        
        Raises:
            ValueError: If flow is not RUNNABLE or has no Global Variables
        """
        # 1. Validate flow is RUNNABLE
        validation_errors = flow.validate_references()
        if validation_errors:
            raise ValueError(f"Flow must be RUNNABLE to generate template: {'; '.join(validation_errors)}")
        
        # 2. Check for Global Variables
        if not flow.variables or len(flow.variables) == 0:
            raise ValueError(
                "Scenarios require Global Variables. "
                "Add at least one Global Variable to enable scenario testing."
            )
        
        # 3. Generate columns from Global Variables ONLY
        columns = ["scenario_name"]  # Required first column
        block_mappings: Dict[str, str] = {}
        
        for var_name in flow.variables.keys():
            columns.append(var_name)
            # Direct mapping: column name = variable name
            block_mappings[var_name] = var_name
        
        return ScenarioTemplate(
            flow_id=flow.name,
            columns=columns,
            block_mappings=block_mappings,
            generated_at=time.time()
        )
    
    @staticmethod
    def template_to_csv(template: ScenarioTemplate) -> str:
        """Convert template to CSV string."""
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(template.columns)
        return output.getvalue()


class ScenarioValidator:
    """Validates and parses CSV files against templates."""
    
    @staticmethod
    def validate_and_parse(
        csv_content: str, 
        template: ScenarioTemplate
    ) -> Tuple[List[Scenario], List[str]]:
        """
        Validate CSV against template and parse into Scenarios.
        
        Returns:
            Tuple of (scenarios, errors)
        """
        errors = []
        scenarios = []
        
        try:
            reader = csv.DictReader(io.StringIO(csv_content))
            
            # Validate headers
            if not reader.fieldnames:
                return [], ["CSV file is empty or malformed"]
            
            # Check for exact header match
            expected_headers = set(template.columns)
            actual_headers = set(reader.fieldnames)
            
            if expected_headers != actual_headers:
                missing = expected_headers - actual_headers
                extra = actual_headers - expected_headers
                
                if missing:
                    errors.append(f"Missing required columns: {', '.join(missing)}")
                if extra:
                    errors.append(f"Unexpected columns: {', '.join(extra)}")
                
                return [], errors
            
            # Parse rows
            scenario_names = set()
            row_num = 1
            
            for row in reader:
                row_num += 1
                
                # Validate scenario_name
                scenario_name = row.get('scenario_name', '').strip()
                if not scenario_name:
                    errors.append(f"Row {row_num}: scenario_name cannot be empty")
                    continue
                
                if scenario_name in scenario_names:
                    errors.append(f"Row {row_num}: Duplicate scenario_name '{scenario_name}'")
                    continue
                
                scenario_names.add(scenario_name)
                
                # Validate required cells (all non-scenario_name columns)
                values = {}
                for col in template.columns:
                    if col == 'scenario_name':
                        continue
                    
                    value = row.get(col, '').strip()
                    if not value:
                        errors.append(f"Row {row_num} ({scenario_name}): Column '{col}' cannot be empty")
                        continue
                    
                    values[col] = value
                
                # Only add scenario if no errors for this row
                if not any(f"Row {row_num}" in err for err in errors):
                    scenarios.append(Scenario(
                        scenario_name=scenario_name,
                        values=values
                    ))
            
            if not scenarios and not errors:
                errors.append("CSV contains no valid scenario rows")
            
        except csv.Error as e:
            errors.append(f"CSV parsing error: {str(e)}")
        except Exception as e:
            errors.append(f"Unexpected error: {str(e)}")
        
        return scenarios, errors
