import json
from pathlib import Path
from ..utils import strip_heavy_data

class InvestigatorChain:
    def __init__(self, provider):
        self.provider = provider
        prompt_path = Path(__file__).parent.parent / "prompts" / "investigator.prompt"
        self.template = prompt_path.read_text()

    async def run(self, flow_data: dict) -> str:
        # Reload personality
        prompt_path = Path(__file__).parent.parent / "prompts" / "investigator.prompt"
        template = prompt_path.read_text()
        
        # 0. Strip Heavy Data
        flow_data = strip_heavy_data(flow_data)
        
        # 1. ID Map for human-readable labels
        id_map = {}
        for b in flow_data.get("blocks", []):
            if b.get("id"):
                id_map[b["id"]] = b.get("label", b.get("type", "Step"))
        
        if flow_data.get("execution_report"):
            report = flow_data["execution_report"]
            if report.get("run_id"): id_map[report["run_id"]] = report.get("scenario_name", "Run")

        def deep_clean(data):
            if isinstance(data, dict):
                clean = {}
                for k, v in data.items():
                    if k.lower() in ["id", "run_id", "block_id", "next_block", "parentid", "suite_id", "runid", "suiteid", "taf"]:
                        continue
                    if k == "logs" and isinstance(v, list):
                        v = v[-20:]
                    clean[k] = deep_clean(v)
                return clean
            elif isinstance(data, list):
                return [deep_clean(i) for i in data]
            elif isinstance(data, str):
                if data in id_map:
                    return f"[{id_map[data]}]"
                if len(data) > 1000:
                    return data[:500] + "... (TRUNCATED)"
                return data
            else:
                return data

        execution_report = flow_data.get("execution_report", {})
        scenario_values = execution_report.get("scenario_values", {})
        
        clean_report = deep_clean(execution_report)
        
        prompt = template.format(
            execution_report=json.dumps(clean_report, indent=2),
            scenario_values=json.dumps(scenario_values, indent=2) if scenario_values else "NONE"
        )
        
        print(f"Investigator Prompt constructed. Length: {len(prompt)} characters.")
        return await self.provider.generate_text(prompt)
