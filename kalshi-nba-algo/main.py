#!/usr/bin/env python3
"""
Kalshi NBA Edge Scanner
-----------------------
Usage:
  python main.py           # Run today's scan
  python main.py --perf    # Show P&L performance summary
  python main.py --demo    # Demo mode with fake data (no API keys needed)
"""
import sys
import argparse
from datetime import datetime

from tabulate import tabulate
from colorama import init, Fore, Style

init(autoreset=True)


def format_ev(ev: float) -> str:
    if ev >= 0.07:
        return Fore.GREEN + Style.BRIGHT + f"{ev:.1%}" + Style.RESET_ALL
    elif ev >= 0.04:
        return Fore.GREEN + f"{ev:.1%}" + Style.RESET_ALL
    elif ev >= 0.02:
        return Fore.YELLOW + f"{ev:.1%}" + Style.RESET_ALL
    return Fore.RED + f"{ev:.1%}" + Style.RESET_ALL


def format_side(side: str) -> str:
    if side == "YES":
        return Fore.CYAN + "YES" + Style.RESET_ALL
    elif side == "NO":
        return Fore.MAGENTA + "NO" + Style.RESET_ALL
    return side


def print_results(edges: list[dict]):
    if not edges:
        print(Fore.RED + "\nNo edges found above threshold today.")
        return

    actionable = [e for e in edges if e["actionable"]]
    watchlist = [e for e in edges if not e["actionable"]]

    if actionable:
        print(Fore.GREEN + Style.BRIGHT + f"\n{'='*70}")
        print(Fore.GREEN + Style.BRIGHT + f"  ACTIONABLE BETS ({len(actionable)} found)")
        print(Fore.GREEN + Style.BRIGHT + f"{'='*70}" + Style.RESET_ALL)

        rows = []
        for e in actionable:
            label = e["label"][:55] + "…" if len(e["label"]) > 55 else e["label"]
            rows.append([
                label,
                e["kalshi_price"],
                f"{e['true_prob']:.1%}",
                format_side(e["best_side"]),
                format_ev(e["best_ev"]),
                f"${e['bet_size_$']:.0f}",
                e.get("market_type", ""),
            ])

        print(tabulate(
            rows,
            headers=["Market", "Kalshi¢", "True Prob", "Side", "EV", "Bet Size", "Type"],
            tablefmt="rounded_outline",
        ))

    if watchlist:
        print(Fore.YELLOW + f"\n  WATCHLIST (EV 2-4%, below bet threshold)")
        rows = []
        for e in watchlist[:10]:
            label = e["label"][:55] + "…" if len(e["label"]) > 55 else e["label"]
            rows.append([
                label,
                e["kalshi_price"],
                f"{e['true_prob']:.1%}",
                format_side(e["best_side"]),
                format_ev(e["best_ev"]),
            ])
        print(tabulate(
            rows,
            headers=["Market", "Kalshi¢", "True Prob", "Side", "EV"],
            tablefmt="simple",
        ))


def run_demo():
    """Demo output with synthetic data — no API keys needed."""
    print(Fore.CYAN + "\nDEMO MODE — showing synthetic example output\n")

    fake_edges = [
        {
            "label": "Will Jayson Tatum score 28+ points?",
            "kalshi_price": 42, "true_prob": 0.51, "best_side": "YES",
            "best_ev": 0.082, "bet_size_$": 18.0, "actionable": True,
            "market_type": "prop",
        },
        {
            "label": "Will the Boston Celtics win Game 4?",
            "kalshi_price": 61, "true_prob": 0.70, "best_side": "YES",
            "best_ev": 0.066, "bet_size_$": 22.0, "actionable": True,
            "market_type": "game",
        },
        {
            "label": "Will Nikola Jokic record 12+ rebounds?",
            "kalshi_price": 35, "true_prob": 0.43, "best_side": "YES",
            "best_ev": 0.051, "bet_size_$": 12.0, "actionable": True,
            "market_type": "prop",
        },
        {
            "label": "Will Anthony Davis score 22+ points?",
            "kalshi_price": 55, "true_prob": 0.59, "best_side": "YES",
            "best_ev": 0.029, "bet_size_$": 0, "actionable": False,
            "market_type": "prop",
        },
    ]

    print_results(fake_edges)
    print(Fore.WHITE + "\n[Demo] In live mode, run `python main.py` with your API keys set in .env\n")


def main():
    parser = argparse.ArgumentParser(description="Kalshi NBA Edge Scanner")
    parser.add_argument("--perf", action="store_true", help="Show P&L performance summary")
    parser.add_argument("--demo", action="store_true", help="Demo mode (no API keys)")
    parser.add_argument("--log", action="store_true", help="Log results to trade_log.csv")
    args = parser.parse_args()

    if args.demo:
        run_demo()
        return

    if args.perf:
        from trade_log import show_performance_summary
        show_performance_summary()
        return

    from config import config

    if not config.kalshi_api_key:
        print(Fore.RED + "\nError: KALSHI_API_KEY not set.")
        print("Copy .env.example → .env and fill in your keys.\n")
        print("No API keys yet? Run: python main.py --demo\n")
        sys.exit(1)

    print(Fore.CYAN + Style.BRIGHT + f"\nKalshi NBA Scanner — {datetime.now().strftime('%A %B %d, %Y')}")
    print(Fore.CYAN + f"Bankroll: ${config.bankroll:.0f} | Min edge: {config.min_edge_to_bet:.0%} | Kelly: {config.kelly_fraction:.0%}x\n")

    from scanner import run_scan
    edges = run_scan()

    print_results(edges)

    if args.log:
        from trade_log import log_scan_results
        log_scan_results(edges)


if __name__ == "__main__":
    main()
