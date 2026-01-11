
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

    def track_flow_usage(self, flow_id: str, user_id: str) -> bool:
        """Updates the last_run timestamp for a flow."""
        if not self.is_enabled():
            return False

        try:
            self.client.table("flows").update({"last_run": "now()"}).eq("id", flow_id).eq("user_id", user_id).execute()
            return True
        except Exception as e:
            logger.error(f"Failed to track flow usage in Supabase: {e}")
            return False

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

    
    def delete_execution(self, run_id: str, user_id: str) -> bool:
        """Deletes an execution record and its associated screenshots."""
        if not self.is_enabled():
            return False

        try:
            logger.info(f"Deleting execution {run_id} from Supabase...")
            
            # 1. Delete Screenshots from Storage
            # List files first (Supabase Storage doesn't support recursive delete by folder easily)
            # Assuming 'run_id' is the folder name
            try:
                # List files in the folder
                files_list = self.client.storage.from_("screenshots").list(run_id)
                if files_list:
                    files_to_delete = [f"{run_id}/{f['name']}" for f in files_list]
                    if files_to_delete:
                        self.client.storage.from_("screenshots").remove(files_to_delete)
                        logger.info(f"Deleted {len(files_to_delete)} screenshots for {run_id}")
            except Exception as storage_e:
                logger.warning(f"Failed to clean up storage for {run_id}: {storage_e}")

            # 2. Delete Record from DB
            self.client.table("executions").delete().eq("id", run_id).eq("user_id", user_id).execute()
            logger.info(f"Deleted execution record {run_id} from DB")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete execution {run_id}: {e}")
            return False

    def clear_user_history(self, user_id: str) -> bool:
        """Clears ALL execution history for a user."""
        if not self.is_enabled():
            return False
            
        try:
            logger.info(f"Clearing history for user {user_id}...")
            
            # 1. Get all execution IDs to clean storage
            # Note: For large datasets, this might need pagination.
            resp = self.client.table("executions").select("id").eq("user_id", user_id).execute()
            run_ids = [row['id'] for row in resp.data]
            
            # 2. Clean Storage (Best effort)
            for rid in run_ids:
                try:
                    files_list = self.client.storage.from_("screenshots").list(rid)
                    if files_list:
                        files_to_delete = [f"{rid}/{f['name']}" for f in files_list]
                        if files_to_delete:
                            self.client.storage.from_("screenshots").remove(files_to_delete)
                except Exception:
                    continue # Skip errors to proceed with next
            
            # 3. Delete All Records
            self.client.table("executions").delete().eq("user_id", user_id).execute()
            logger.info(f"Cleared {len(run_ids)} executions for {user_id}")
            return True
            
        except Exception as e:
            return False
            
    def get_environments(self, user_id: str) -> list:
        """Fetches all environments for a specific user."""
        if not self.is_enabled():
            return []
            
        try:
            resp = self.client.table("environments").select("*").eq("user_id", user_id).order("name").execute()
            return resp.data or []
        except Exception as e:
            logger.error(f"Failed to fetch environments for {user_id}: {e}")
            return []

    def save_environment(self, user_id: str, env_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Saves or updates an environment for a user."""
        if not self.is_enabled():
            return None
            
        try:
            data = {
                "user_id": user_id,
                "name": env_data.get("name"),
                "browser": env_data.get("browser", "chrome"),
                "headless": env_data.get("headless", True),
                "window_width": env_data.get("window_width", 1920),
                "window_height": env_data.get("window_height", 1080),
                "base_url": env_data.get("base_url"),
                "variables": env_data.get("variables", {}),
                "updated_at": "now()"
            }
            
            env_id = env_data.get("id")
            if env_id:
                data["id"] = env_id
                
            resp = self.client.table("environments").upsert(data).execute()
            if resp.data and len(resp.data) > 0:
                return resp.data[0]
            return None
        except Exception as e:
            logger.error(f"Failed to save environment for {user_id}: {e}")
            return None

    def delete_environment(self, user_id: str, env_id: str) -> bool:
        """Deletes an environment for a user."""
        if not self.is_enabled():
            return False
            
        try:
            self.client.table("environments").delete().eq("id", env_id).eq("user_id", user_id).execute()
            return True
        except Exception as e:
            logger.error(f"Failed to delete environment {env_id} for user {user_id}: {e}")
            return False

db = SupabaseService()
