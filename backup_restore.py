#!/usr/bin/env python3
"""ILoveFinland Studio — backup and restore.

What Studio stores (everything that must survive a restart or a move):
  studio.db                      SQLite: packages, versions (article + static post JSON), comments,
                                 assignments, approval_history, daily_review_runs, inbox, performance
  static/assets/photos/          featured photos downloaded with their licence provenance (*.provenance.json)
  static/assets/uploads/         clips and photos uploaded in the browser (created on first upload)
  data/                          live_snapshot.json (cached copy of public ilovefinland.net post list)

NOT backed up on purpose: .env and server_keys.txt (API keys / access key). Re-create them on the new machine.

Usage:
  python3 backup_restore.py backup  [BACKUP_ROOT]                 -> BACKUP_ROOT/ilf-backup-<timestamp>/
  python3 backup_restore.py restore BACKUP_DIR TARGET_DIR         -> a runnable copy of Studio in TARGET_DIR
  python3 backup_restore.py verify  BACKUP_DIR

Backup reads the live database through SQLite's online-backup API, so the running Studio is not stopped,
locked for long, or modified.  Restore only ever writes inside TARGET_DIR and refuses a non-empty one.
"""

import hashlib
import json
import os
import shutil
import sqlite3
import sys
from datetime import datetime

BASE = os.path.dirname(os.path.abspath(__file__))
CODE_FILES = ["app.py", "db.py", "editorial_engine.py", "live_sources.py", "env_loader.py", "openai_client.py", "media_gen.py", "backup_restore.py", "README.md", ".env.example", ".gitignore"]
DATA_DIRS = ["static/assets/photos", "static/assets/uploads", "data"]


def sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def walk_files(root: str):
    for dp, _dn, fn in os.walk(root):
        for f in sorted(fn):
            if f == ".DS_Store" or f.endswith(".tmp"):
                continue
            yield os.path.join(dp, f)


def db_counts(db_file: str) -> dict:
    conn = sqlite3.connect(f"file:{db_file}?mode=ro", uri=True)
    try:
        out = {}
        for t in ("packages", "package_versions", "assignments", "comments", "approval_history", "daily_review_runs"):
            try:
                out[t] = conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
            except sqlite3.OperationalError:
                out[t] = None
        out["integrity_check"] = conn.execute("PRAGMA integrity_check").fetchone()[0]
        return out
    finally:
        conn.close()


def backup(root: str = None) -> str:
    root = root or os.path.join(BASE, "backups")
    dest = os.path.join(root, "ilf-backup-" + datetime.now().strftime("%Y%m%d-%H%M%S"))
    os.makedirs(dest, exist_ok=False)

    # 1. Database via online backup API (consistent snapshot, source untouched)
    src = sqlite3.connect(f"file:{os.path.join(BASE, 'studio.db')}?mode=ro", uri=True)
    dst = sqlite3.connect(os.path.join(dest, "studio.db"))
    try:
        src.backup(dst)
    finally:
        dst.close()
        src.close()

    # 2. Uploads / photos / data
    files = {"studio.db": sha256(os.path.join(dest, "studio.db"))}
    for rel in DATA_DIRS:
        sdir = os.path.join(BASE, rel)
        if not os.path.isdir(sdir):
            continue
        for f in walk_files(sdir):
            r = os.path.relpath(f, BASE)
            t = os.path.join(dest, "files", r)
            os.makedirs(os.path.dirname(t), exist_ok=True)
            shutil.copy2(f, t)
            files[os.path.join("files", r)] = sha256(t)

    manifest = {
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "source": BASE,
        "database": "studio.db",
        "db_counts": db_counts(os.path.join(dest, "studio.db")),
        "files": files,
        "excluded": [".env", "server_keys.txt"],
    }
    with open(os.path.join(dest, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    return dest


def verify(backup_dir: str) -> dict:
    with open(os.path.join(backup_dir, "manifest.json")) as f:
        m = json.load(f)
    bad = [rel for rel, digest in m["files"].items() if not os.path.isfile(os.path.join(backup_dir, rel)) or sha256(os.path.join(backup_dir, rel)) != digest]
    return {"files_checked": len(m["files"]), "mismatches": bad, "db_counts": m["db_counts"]}


def restore(backup_dir: str, target: str) -> str:
    target = os.path.abspath(target)
    if os.path.realpath(target).startswith(os.path.realpath(BASE) + os.sep) or os.path.realpath(target) == os.path.realpath(BASE):
        raise SystemExit("Refusing to restore inside the working Studio folder.")
    if os.path.exists(target) and os.listdir(target):
        raise SystemExit(f"Target {target} is not empty.")
    v = verify(backup_dir)
    if v["mismatches"]:
        raise SystemExit(f"Backup failed verification: {v['mismatches']}")
    os.makedirs(target, exist_ok=True)

    # code (read-only copy from the working tree)
    for name in CODE_FILES:
        if os.path.isfile(os.path.join(BASE, name)):
            shutil.copy2(os.path.join(BASE, name), os.path.join(target, name))
    shutil.copytree(
        os.path.join(BASE, "static"),
        os.path.join(target, "static"),
        ignore=lambda d, names: [n for n in names if (os.path.join(d, n) in (os.path.join(BASE, "static/assets/photos"), os.path.join(BASE, "static/assets/uploads"))) or n == ".DS_Store"],
    )
    os.makedirs(os.path.join(target, "bin"), exist_ok=True)
    for n in os.listdir(os.path.join(BASE, "bin")):
        if n.endswith(".swift"):
            shutil.copy2(os.path.join(BASE, "bin", n), os.path.join(target, "bin", n))

    # data from the backup
    shutil.copy2(os.path.join(backup_dir, "studio.db"), os.path.join(target, "studio.db"))
    files_root = os.path.join(backup_dir, "files")
    if os.path.isdir(files_root):
        shutil.copytree(files_root, target, dirs_exist_ok=True)

    after = db_counts(os.path.join(target, "studio.db"))
    return json.dumps({"restored_to": target, "db_counts": after})


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["backup"]:
        print(backup(a[1] if len(a) > 1 else None))
    elif a[:1] == ["verify"] and len(a) == 2:
        print(json.dumps(verify(a[1]), indent=2))
    elif a[:1] == ["restore"] and len(a) == 3:
        print(restore(a[1], a[2]))
    else:
        print(__doc__)
        sys.exit(1)
