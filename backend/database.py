
import os
import logging
from typing import Dict, Any, Optional
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class SupabaseService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SupabaseService, cls).__new__(cls)
            cls._instance._init_client()
        return cls._instance

    def _init_client(self):
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        
        if not url or not key:
            logger.warning("Supabase credentials missing. Cloud persistence disabled.")
            self.client = None
            return

        try:
            self.client: Client = create_client(url, key)
            logger.info("Supabase client initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            self.client = None

    def is_enabled(self) -> bool:
        return self.client is not None

    def upload_screenshot(self, base64_data: str, run_id: str, block_id: str) -> Optional[str]:
        """Uploads a base64 screenshot to storage and returns the public URL."""
        if not self.is_enabled():
            return None

        import base64
        
        try:
            # Decode base64
            if "," in base64_data:
                base64_data = base64_data.split(",")[1]
            
            image_bytes = base64.b64decode(base64_data)
            path = f"{run_id}/{block_id}.png"
            
            # Upload
            res = self.client.storage.from_("screenshots").upload(
                path=path,
                file=image_bytes,
                file_options={"content-type": "image/png", "upsert": "true"}
            )
            
            # Get Public URL
            public_url = self.client.storage.from_("screenshots").get_public_url(path)
            logger.info(f"Screenshot uploaded: {public_url}")
            return public_url
            
        except Exception as e:
            logger.error(f"Failed to upload screenshot to {path}: {e}")
            return None

    def save_flow(self, user_id: str, flow_data: Dict[str, Any]) -> Optional[str]:
        """Saves or updates a flow in the database."""
        if not self.is_enabled():
            return None

        try:
            data = {
                "user_id": user_id,
                "name": flow_data.get("name", "Untitled Flow"),
                "description": flow_data.get("description"),
                "graph": flow_data,
                "updated_at": "now()"
            }
            
            # Check if flow has ID, if so, upsert
            flow_id = flow_data.get("id")
            if flow_id:
                data["id"] = flow_id
                
            response = self.client.table("flows").upsert(data).execute()
            
            if response.data and len(response.data) > 0:
                return response.data[0]['id']
                
        except Exception as e:
            logger.error(f"Failed to save flow to Supabase: {e}")
            return None

    def save_execution(self, user_id: str, report: Dict[str, Any]) -> Optional[str]:
        """Saves execution report to the database."""
        if not self.is_enabled():
            return None

        try:
            data = {
                "id": report.get("run_id"),
                "flow_id": report.get("flow_id"),
                "user_id": user_id,
                "status": "completed" if report.get("success") else "failed",
                "logs": report.get("blocks", []), # Note: heavy? might want to split
                "report": report, # Full JSON dump
                "duration_ms": int(round(report.get("duration_ms", 0))),
                "created_at": "now()" # Or use report timestamp
            }
            
            self.client.table("executions").upsert(data).execute()
            logger.info(f"Execution {report.get('run_id')} saved to Supabase.")
            
        except Exception as e:
            logger.error(f"Failed to save execution to Supabase: {e}")

    def get_user_stats(self, user_id: str) -> Dict[str, int]:
        """Fetches aggregate statistics for a user."""
        stats = {"flows": 0, "executions": 0, "screenshots": 0}
        if not self.is_enabled():
            return stats

        try:
            # Count Flows
            flows_resp = self.client.table("flows").select("id", count="exact").eq("user_id", user_id).execute()
            stats["flows"] = flows_resp.count or 0
            
            # Count Executions
            exec_resp = self.client.table("executions").select("id", count="exact").eq("user_id", user_id).execute()
            stats["executions"] = exec_resp.count or 0
            
            # Screenshots count is tricky as they are in storage, 
            # but we can count executions that have screenshots in their reports if we had a dedicated table.
            # For now, let's keep it at 0 or estimate.
            
            return stats
        except Exception as e:
            logger.error(f"Failed to fetch user stats: {e}")
            return stats

db = SupabaseService()
