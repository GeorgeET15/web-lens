import logging
import asyncio
import sys
import os
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import WebSocket, HTTPException
from selenium.webdriver.common.by import By

# Add parent directory to path to allow importing sibling modules
# This is required because we are running from backend/main.py usually
backend_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_path not in sys.path:
    sys.path.append(backend_path)

from browser_engine import SeleniumEngine

logger = logging.getLogger(__name__)

class InspectorService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(InspectorService, cls).__new__(cls)
            cls._instance.active_inspector: Optional[SeleniumEngine] = None
            cls._instance.clients: List[WebSocket] = []
            cls._instance.backend_dir = Path(backend_path)
        return cls._instance

    @property
    def driver(self):
        return self.active_inspector.driver if self.active_inspector else None

    @property
    def is_running(self):
        return self.active_inspector is not None and self.driver is not None

    async def start_inspector(self, url: str) -> Dict[str, str]:
        """Start the Live Inspector browser session."""
        
        # Close existing if any
        if self.active_inspector:
            try:
                self.active_inspector.close()
            except Exception as e:
                logger.warning(f"Error closing existing inspector session: {e}")
            self.active_inspector = None

        try:
            # Launch NON-HEADLESS browser
            self.active_inspector = SeleniumEngine(headless=False)
            
            # URL Fix: Prepend https if missing
            target_url = url
            if not target_url.startswith("http"):
                target_url = f"https://{target_url}"
                
            logger.info(f"Opening inspector at: {target_url}")
            self.active_inspector.open_page(target_url)
            
            # Stability delay
            await asyncio.sleep(1.0)
            
            # Inject Inspector Script
            try:
                inspector_path = self.backend_dir / "inspector.js"
                if not inspector_path.exists():
                    raise FileNotFoundError(f"Missing internal component: {inspector_path}")

                with open(inspector_path, "r") as f:
                    script = f.read()
                    if self.driver:
                        # Robust Injection via CDP
                        try:
                            self.driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
                                'source': script
                            })
                            logger.info("CDP injection armed for future navigations")
                        except Exception as cdp_err:
                            logger.warning(f"CDP injection fallback: {cdp_err}")
                        
                        # Immediate injection
                        self.driver.execute_script(script)
                        logger.info("Inspector script injected into current page")
            except Exception as e:
                logger.error(f"Failed to inject inspector script: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to inject inspector script: {e}")
            
            return {"status": "started", "message": "Inspector launched in new window"}
        except Exception as e:
            logger.error(f"Failed to start inspector: {e}")
            if self.active_inspector:
                self.active_inspector.close()
                self.active_inspector = None
            raise HTTPException(status_code=500, detail=str(e))

    async def stop_inspector(self):
        if self.active_inspector:
            self.active_inspector.close()
            self.active_inspector = None
            await self.broadcast_status("stopped")

    async def resync_inspector(self):
        """Force re-injection of the inspector script."""
        if not self.is_running:
            raise HTTPException(status_code=400, detail="Inspector not running")
        
        try:
            inspector_path = self.backend_dir / "inspector.js"
            with open(inspector_path, "r") as f:
                script = f.read()
                # 1. Re-setup CDP
                try:
                    self.driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
                        'source': script
                    })
                except Exception as e:
                    logger.debug(f"CDP script injection failed during resync: {e}")
                
                # 2. Immediate injection
                self.driver.switch_to.default_content()
                self.driver.execute_script(script)
                
            return {"status": "resynced", "message": "Inspector script re-injected"}
        except Exception as e:
            logger.error(f"Resync failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    async def add_client(self, websocket: WebSocket):
        await websocket.accept()
        self.clients.append(websocket)
        logger.info(f"Inspector client connected. Total: {len(self.clients)}")
        
        # Send initial status
        initial_status = "running" if self.is_running else "not_running"
        await websocket.send_json({"type": "inspector_status", "status": initial_status})

    def remove_client(self, websocket: WebSocket):
        if websocket in self.clients:
            self.clients.remove(websocket)
            logger.info(f"Inspector client disconnected. Remaining: {len(self.clients)}")

    async def broadcast(self, message: dict):
        for client in self.clients:
            try:
                await client.send_json(message)
            except Exception as e:
                logger.debug(f"Failed to broadcast to client: {e}")

    async def broadcast_status(self, status: str):
        await self.broadcast({"type": "inspector_status", "status": status})

    async def start_embedded_inspector(self, url: str):
        """Start the Embedded (Headless) Inspector."""
        # Reuse existing inspector if available
        try:
            if not self.active_inspector:
                # Launch HEADLESS browser
                self.active_inspector = SeleniumEngine(headless=True)

            target_url = url
            if not target_url.startswith("http"):
                target_url = f"https://{target_url}"
                
            self.active_inspector.open_page(target_url)
            return self.active_inspector.get_snapshot()
            
        except Exception as e:
            logger.error(f"Failed to start embedded inspector: {e}")
            if self.active_inspector:
                try:
                    self.active_inspector.close()
                except Exception as e:
                    logger.debug(f"Error while closing failed inspector: {e}")
                self.active_inspector = None
            raise HTTPException(status_code=500, detail=str(e))

    async def interact_embedded(self, action: str, url: str = None, selector: str = None, x: float = None, y: float = None) -> Dict[str, Any]:
        """Interact with the page and get new snapshot."""
        if not self.is_running:
             raise HTTPException(status_code=400, detail="Inspector not running")

        old_url = self.driver.current_url
        try:
            if action == "click":
                if x is not None and y is not None:
                    # Translate absolute coordinates to viewport coordinates
                    scroll_x = self.active_inspector.execute_script("return window.scrollX;")
                    scroll_y = self.active_inspector.execute_script("return window.scrollY;")
                    vx = x - scroll_x
                    vy = y - scroll_y
                    
                    # Use elementFromPoint to find the element and click it
                    self.active_inspector.execute_script(
                        f"document.elementFromPoint({vx}, {vy}).click()"
                    )
                await asyncio.sleep(1) # Wait for potential navigation
                
            elif action == "navigate" and url:
                 self.active_inspector.open_page(url)

            snapshot = self.active_inspector.get_snapshot()
            new_url = self.driver.current_url
            
            # Navigation Detection
            if old_url != new_url:
                snapshot['taf'] = {
                    "trace": ["Page changed"],
                    "analysis": [f"WebLens detected a navigation from {old_url} to {new_url}."],
                    "feedback": ["You can now select elements on this new page or continue browsing."]
                }
                
            return snapshot

        except Exception as e:
            logger.error(f"Interaction failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

# Global instance
inspector_service = InspectorService()
