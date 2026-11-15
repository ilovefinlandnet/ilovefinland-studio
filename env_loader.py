"""Environment and secrets loader for ILoveFinland Studio."""

import os
from typing import Dict

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")
VISIBLE_ENV_PATH = os.path.join(BASE_DIR, "server_keys.txt")


def load_env(override: bool = True) -> Dict[str, str]:
    """Load key-value pairs from server_keys.txt and .env into os.environ."""
    loaded = {}

    for path in (ENV_PATH, VISIBLE_ENV_PATH):
        if not os.path.exists(path):
            continue
        try:
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        key, val = line.split("=", 1)
                        key = key.strip()
                        val = val.strip().strip("'\"")
                        if key and val:
                            loaded[key] = val
                            if override or key not in os.environ:
                                os.environ[key] = val
        except Exception as exc:
            print(f"[env_loader] Warning reading {path}: {exc}")

    return loaded


# Automatically load on import
load_env(override=True)
