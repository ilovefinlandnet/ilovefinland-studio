"""
ILoveFinland Studio — Continuous Laptop-to-Cloud Auto-Sync Engine
Automatically watches studio.db for changes and syncs your laptop's stories,
edits, and media packages to GitHub so Render.com is always 100% up-to-date
for your mobile phone and tablet.
"""

import os
import time
import subprocess
import threading
from datetime import datetime
from typing import Dict, Any, Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "studio.db")

_sync_lock = threading.Lock()
_state: Dict[str, Any] = {
    "enabled": False,
    "is_syncing": False,
    "last_synced_at": None,
    "last_commit_sha": None,
    "sync_count": 0,
    "last_error": None,
    "cloud_url": "https://ilovefinland-studio.onrender.com",
    "pending_changes": False,
}

_watcher_thread: Optional[threading.Thread] = None
_debounce_timer: Optional[threading.Timer] = None


def _get_git_credentials() -> tuple[Optional[str], Optional[str]]:
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    repo = os.environ.get("GITHUB_REPO", "").strip()
    
    # If not in os.environ, try reading from .env directly
    if not token or not repo:
        env_path = os.path.join(BASE_DIR, ".env")
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("GITHUB_TOKEN=") and not token:
                            token = line.split("=", 1)[1].strip().strip('"').strip("'")
                        elif line.startswith("GITHUB_REPO=") and not repo:
                            repo = line.split("=", 1)[1].strip().strip('"').strip("'")
            except Exception:
                pass
    return token or None, repo or "ilovefinlandnet/ilovefinland-studio"


def get_sync_status() -> Dict[str, Any]:
    token, repo = _get_git_credentials()
    _state["enabled"] = bool(token and repo)
    _state["cloud_url"] = os.environ.get("RENDER_CLOUD_URL", "https://ilovefinland-studio.onrender.com")
    return dict(_state)


def push_to_cloud(reason: str = "Studio database updated") -> Dict[str, Any]:
    """Commits studio.db and pushes to GitHub to trigger continuous Render cloud deploy."""
    token, repo = _get_git_credentials()
    if not token or not repo:
        return {
            "ok": False,
            "error": "GITHUB_TOKEN or GITHUB_REPO not configured in environment.",
        }

    with _sync_lock:
        _state["is_syncing"] = True
        _state["last_error"] = None
        try:
            # 1. Check if studio.db has changes
            status_res = subprocess.run(
                ["git", "status", "--porcelain", "studio.db"],
                cwd=BASE_DIR,
                capture_output=True,
                text=True,
                timeout=15,
            )
            has_db_change = bool(status_res.stdout.strip())
            
            # Also stage any updated news cache if present
            subprocess.run(
                ["git", "add", "studio.db"],
                cwd=BASE_DIR,
                capture_output=True,
                text=True,
                timeout=15,
            )

            # 2. Check if git diff --cached has changes
            diff_res = subprocess.run(
                ["git", "diff", "--cached", "--quiet"],
                cwd=BASE_DIR,
                timeout=15,
            )
            if diff_res.returncode == 0:
                # No changes staged
                _state["is_syncing"] = False
                _state["pending_changes"] = False
                return {
                    "ok": True,
                    "message": "Cloud is already up-to-date with laptop.",
                    "status": get_sync_status(),
                }

            # 3. Commit
            now_iso = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            commit_msg = f"Auto-sync from laptop: {reason} ({now_iso})"
            commit_res = subprocess.run(
                ["git", "commit", "-m", commit_msg],
                cwd=BASE_DIR,
                capture_output=True,
                text=True,
                timeout=20,
            )
            if commit_res.returncode != 0:
                raise RuntimeError(f"Git commit failed: {commit_res.stderr or commit_res.stdout}")

            # 4. Push to remote with token
            remote_url = f"https://{token}@github.com/{repo}.git"
            push_res = subprocess.run(
                ["git", "push", remote_url, "main"],
                cwd=BASE_DIR,
                capture_output=True,
                text=True,
                timeout=60,
            )
            if push_res.returncode != 0:
                raise RuntimeError(f"Git push failed: {push_res.stderr or push_res.stdout}")

            # Get new commit SHA
            sha_res = subprocess.run(
                ["git", "rev-parse", "--short", "HEAD"],
                cwd=BASE_DIR,
                capture_output=True,
                text=True,
                timeout=10,
            )
            commit_sha = sha_res.stdout.strip()

            _state["is_syncing"] = False
            _state["pending_changes"] = False
            _state["last_synced_at"] = datetime.now().isoformat()
            _state["last_commit_sha"] = commit_sha
            _state["sync_count"] += 1

            return {
                "ok": True,
                "message": f"Successfully synced to cloud! (Commit: {commit_sha})",
                "commit": commit_sha,
                "status": get_sync_status(),
            }

        except Exception as e:
            _state["is_syncing"] = False
            _state["last_error"] = str(e)
            return {
                "ok": False,
                "error": str(e),
                "status": get_sync_status(),
            }


def trigger_debounced_sync(reason: str = "Database updated", delay_seconds: float = 15.0) -> None:
    """Schedules an automatic sync after delay_seconds of quiet."""
    global _debounce_timer
    _state["pending_changes"] = True
    if _debounce_timer is not None:
        _debounce_timer.cancel()

    def _run():
        push_to_cloud(reason=reason)

    _debounce_timer = threading.Timer(delay_seconds, _run)
    _debounce_timer.daemon = True
    _debounce_timer.start()


def start_auto_sync_watcher(db_path: str = DB_FILE, poll_interval: int = 10) -> None:
    """Continuously monitors studio.db modification time and syncs whenever changes occur."""
    global _watcher_thread
    token, repo = _get_git_credentials()
    if not token:
        # Running on cloud container without local git credentials: watcher stays dormant
        return

    if _watcher_thread and _watcher_thread.is_alive():
        return

    def _watcher_loop():
        time.sleep(5)  # initial warm-up
        last_mtime = 0.0
        if os.path.exists(db_path):
            try:
                last_mtime = os.path.getmtime(db_path)
            except Exception:
                pass

        while True:
            try:
                if os.path.exists(db_path):
                    current_mtime = os.path.getmtime(db_path)
                    if current_mtime > last_mtime:
                        last_mtime = current_mtime
                        # Debounce sync 15s to allow multi-step batch writes
                        trigger_debounced_sync(reason="Auto-sync DB updates", delay_seconds=15.0)
            except Exception:
                pass
            time.sleep(poll_interval)

    _watcher_thread = threading.Thread(target=_watcher_loop, daemon=True, name="ILFCloudSyncWatcher")
    _watcher_thread.start()
