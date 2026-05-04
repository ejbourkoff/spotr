"""
FastAPI web server for Kalshi NBA Edge Scanner.
Run: .venv/bin/python web_app.py
Dashboard: http://localhost:8000
"""
import asyncio
import json
import threading
from datetime import datetime, timedelta

import uvicorn
from fastapi import FastAPI
from fastapi.responses import JSONResponse, FileResponse

import database as db
from config import config
from scanner import run_scan

app = FastAPI(title="Kalshi NBA Edge Scanner")

_scanning = False
_scan_lock = threading.Lock()
_latest_parlays: list[dict] = []


# ── HTML Dashboard ────────────────────────────────────────────────────────────

@app.get("/", response_class=FileResponse)
async def dashboard():
    return FileResponse("templates/index.html")


# ── API Endpoints ─────────────────────────────────────────────────────────────

@app.post("/api/scan")
async def trigger_scan():
    global _scanning
    if _scanning:
        return JSONResponse({"status": "in_progress", "message": "Scan already running"}, status_code=202)
    _scanning = True
    try:
        result = await asyncio.to_thread(_do_scan)
        return result
    finally:
        _scanning = False


@app.get("/api/latest")
async def get_latest():
    scan = db.get_latest_scan()
    if not scan:
        return JSONResponse({"error": "no_data"}, status_code=404)
    # Attach most recent parlays
    scan["parlays"] = _latest_parlays
    return scan


@app.get("/api/parlays")
async def get_parlays():
    return _latest_parlays


@app.get("/api/history")
async def get_history(limit: int = 30):
    return db.get_scan_history(limit)


@app.get("/api/performance")
async def get_performance():
    return db.get_performance_stats()


@app.get("/api/status")
async def get_status():
    return {
        "scanning": _scanning,
        "bankroll": config.bankroll,
        "min_edge": config.min_edge_to_bet,
        "timestamp": datetime.now().isoformat(),
    }


# ── Scanner core ──────────────────────────────────────────────────────────────

def _do_scan() -> dict:
    global _latest_parlays
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Starting scan...")

    edges, parlays = run_scan()
    _latest_parlays = parlays

    total = len(set(e.get("ticker", "") for e in edges if e.get("ticker")))
    total = max(total, len(edges))

    scan_id = db.save_scan(edges, total)
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Saved scan id={scan_id} ({len(edges)} edges, {len(parlays)} parlays)")

    actionable = [e for e in edges if e.get("actionable")]
    high = [e for e in edges if e.get("confidence") == "HIGH"]
    summary = {
        "total_edges": len(edges),
        "actionable": len(actionable),
        "high_conf": len(high),
        "game_edges": len([e for e in actionable if e.get("market_type") == "game"]),
        "prop_edges": len([e for e in actionable if e.get("market_type") == "prop"]),
        "combo_edges": len([e for e in actionable if e.get("market_type") in ("combo", "mve")]),
        "futures_edges": len([e for e in actionable if e.get("market_type") in ("champ", "conf", "finals")]),
        "top_ev": round(actionable[0]["best_ev"] * 100, 1) if actionable else 0,
    }

    return {
        "id": scan_id,
        "scanned_at": datetime.now().isoformat(),
        "total_markets": total,
        "edges": edges,
        "parlays": parlays,
        "summary": summary,
    }


# ── Daily scheduler ───────────────────────────────────────────────────────────

def _schedule_daily_scan():
    from apscheduler.schedulers.background import BackgroundScheduler
    import pytz

    scheduler = BackgroundScheduler(timezone=pytz.timezone("America/New_York"))

    def safe_scan():
        global _scanning
        with _scan_lock:
            if _scanning:
                return
            _scanning = True
        try:
            _do_scan()
        except Exception as e:
            print(f"Scheduled scan error: {e}")
        finally:
            _scanning = False

    existing = db.get_latest_scan()
    if existing:
        age = datetime.now() - datetime.fromisoformat(existing["scanned_at"])
        if age < timedelta(hours=3):
            print(f"Recent scan found ({int(age.total_seconds()/60)}m ago), skipping startup scan")
        else:
            threading.Thread(target=safe_scan, daemon=True).start()
    else:
        threading.Thread(target=safe_scan, daemon=True).start()

    scheduler.add_job(safe_scan, "cron", hour=3, minute=0)
    scheduler.start()
    print("Scheduler started — daily scans at 3:00 AM ET")


# ── Startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def on_startup():
    db.init_db()
    _schedule_daily_scan()


if __name__ == "__main__":
    uvicorn.run("web_app:app", host="0.0.0.0", port=8000, reload=False)
