"""
FastAPI web server for Kalshi PGA Edge Scanner.
Run: python web_app.py
Dashboard: http://localhost:8001
"""
import asyncio
import threading
from datetime import datetime, timedelta

import uvicorn
from fastapi import FastAPI
from fastapi.responses import JSONResponse, FileResponse

import database as db
from config import config
from scanner import run_scan

app = FastAPI(title="Kalshi PGA Edge Scanner")

_scanning = False
_scan_lock = threading.Lock()
_latest_parlays: list[dict] = []


@app.get("/", response_class=FileResponse)
async def dashboard():
    return FileResponse("templates/index.html")


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
    scan["parlays"] = _latest_parlays or scan.get("parlays", [])
    return scan


@app.get("/api/history")
async def get_history(limit: int = 30):
    return db.get_scan_history(limit)


@app.get("/api/performance")
async def get_performance():
    return db.get_performance_stats()


@app.get("/api/status")
async def get_status():
    from datetime import date
    pga_start = date(2026, 5, 14)
    days_to_pga = (pga_start - date.today()).days
    return {
        "scanning": _scanning,
        "bankroll": config.bankroll,
        "min_edge": config.min_edge_to_bet,
        "timestamp": datetime.now().isoformat(),
        "days_to_pga": max(0, days_to_pga),
        "pga_start_date": "2026-05-14",
    }


@app.get("/api/leaderboard")
async def get_leaderboard():
    """Live PGA Tour leaderboard from ESPN."""
    try:
        from espn_client import get_live_leaderboard
        data = get_live_leaderboard()
        if not data:
            return JSONResponse({"error": "no_live_event"}, status_code=404)
        return data
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


def _do_scan() -> dict:
    global _latest_parlays
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Starting PGA scan...")

    edges, parlays = run_scan()
    _latest_parlays = parlays

    total = len(edges)
    scan_id = db.save_scan(edges, parlays, total)
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Saved scan id={scan_id} ({len(edges)} edges)")

    actionable = [e for e in edges if e.get("actionable")]
    high = [e for e in edges if e.get("confidence") == "HIGH"]
    summary = {
        "total_edges": len(edges),
        "actionable": len(actionable),
        "high_conf": len(high),
        "yes_edges": len([e for e in actionable if e.get("best_side") == "YES"]),
        "no_edges":  len([e for e in actionable if e.get("best_side") == "NO"]),
        "top_ev": round(actionable[0]["best_ev"] * 100, 2) if actionable else 0,
        "tournaments": list(set(e.get("tournament", "") for e in edges)),
    }

    return {
        "id": scan_id,
        "scanned_at": datetime.now().isoformat(),
        "total_markets": total,
        "edges": edges,
        "parlays": parlays,
        "summary": summary,
    }


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
        if age < timedelta(hours=2):
            print(f"Recent scan found ({int(age.total_seconds()/60)}m ago), skipping startup scan")
        else:
            threading.Thread(target=safe_scan, daemon=True).start()
    else:
        threading.Thread(target=safe_scan, daemon=True).start()

    # Scan every morning at 7 AM ET and again at 5 PM ET (after practice rounds)
    scheduler.add_job(safe_scan, "cron", hour=7, minute=0)
    scheduler.add_job(safe_scan, "cron", hour=17, minute=0)
    scheduler.start()
    print("Scheduler started — PGA scans at 7 AM and 5 PM ET")


@app.on_event("startup")
async def on_startup():
    db.init_db()
    _schedule_daily_scan()


if __name__ == "__main__":
    uvicorn.run("web_app:app", host="0.0.0.0", port=8001, reload=False)
