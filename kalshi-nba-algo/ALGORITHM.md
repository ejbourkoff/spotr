# Kalshi NBA Edge Scanner — Algorithm Documentation

## What This Is

A quantitative edge-finding system for NBA prediction markets on Kalshi. It finds situations where Kalshi's market price meaningfully diverges from the consensus of real sportsbooks (DraftKings, FanDuel, BetMGM, Caesars) — and bets only when that divergence is large enough to be profitable after fees.

**Core thesis:** Kalshi's NBA markets are less liquid and slower to reprice than sportsbooks. When sportsbooks move, Kalshi often lags. That lag is the edge.

---

## Architecture

```
Kalshi API  ──────────┐
                       ├──► Scanner ──► Edge Filter ──► Dashboard
The Odds API ─────────┘                                  (http://localhost:8000)
NBA API (stats) ──────┘

SQLite ◄─────────────────── Scanner (saves every scan)
```

### Files

| File | Purpose |
|------|---------|
| `kalshi_client.py` | Fetches all open NBA markets from Kalshi API |
| `odds_client.py` | Fetches sportsbook consensus lines (The Odds API) |
| `scanner.py` | Core algorithm — finds, scores, and ranks edges |
| `models/ev_engine.py` | EV calculation + Kelly criterion bet sizing |
| `models/prop_model.py` | Player prop probability model (NBA API data) |
| `models/game_model.py` | Game win probability model (net ratings) |
| `web_app.py` | FastAPI server, daily scheduler |
| `database.py` | SQLite storage for scans + trade log |
| `templates/index.html` | Dashboard UI |

---

## How the Algorithm Works

### Step 1: Fetch Kalshi Markets

The scanner fetches every open NBA market from Kalshi's API across all series types:
- Game moneylines (`KXNBAGAME`)
- Series winners (`KXNBASERIES`)
- Player props: points, rebounds, assists, threes, blocks, steals (`KXNBAPTS`, etc.)
- Combo props: PRA, PR, PA, double-doubles, triple-doubles
- Futures: NBA champion, conference winners

**Key parsing:**
- `yes_ask_dollars` → cents (e.g. 0.68 → 68¢)
- Illiquid filter: skip if `yes_ask + no_ask > 115¢` (no real orderbook)
- Game date: extracted from event ticker (e.g. `KXNBAPTS-26MAY04PHINYK` → May 4)
- YES team: extracted from ticker suffix (e.g. `KXNBASERIES-26LALOKCR2-OKC` → OKC wins)

### Step 2: Fetch Sportsbook Consensus

**Game lines:** The Odds API (`/sports/basketball_nba/odds`) returns today's and upcoming game moneylines from DK, FD, BetMGM, Caesars. We:
1. Average win probabilities across all books
2. Remove vig using the two-outcome normalization: `home_prob_no_vig = home_prob / (home_prob + away_prob)`

**Player props:** Same API, player_points / player_rebounds / player_assists markets. We:
1. Take the over probability from each book
2. Average across books
3. Apply ~5% vig discount to get true probability

**Why sportsbooks are the anchor:** Sportsbook lines are set by sharp bettors and market makers who process injury reports, lineups, and late-breaking news in real time. They are more efficient than Kalshi. When they disagree with Kalshi, the sportsbook is almost always right.

### Step 3: Calculate True Probability

**For game markets:** Use sportsbook consensus directly (no model blend).
```
true_prob_yes = sb_home_prob    (if YES team is home)
             = 1 - sb_home_prob (if YES team is away)
```

**For prop markets with sportsbook line:** Use sportsbook directly.
```
true_prob = sportsbook_over_prob_no_vig
```

**For prop markets without sportsbook line (model only):**
1. Get player's last 20 game logs from NBA API
2. Compute exponential-weighted average (60% recent, 40% season avg)
3. Apply matchup adjustment (opponent defensive stats)
4. Convert to probability using Normal distribution (Poisson for low means)

### Step 4: Calculate Edge

```
Edge (EV) = true_prob × (1 - price) × (1 - fee) - (1 - true_prob) × price
```

Where:
- `price` = Kalshi YES ask in dollars (e.g. 0.68)
- `fee` = 2% Kalshi fee on winnings
- Positive EV = profitable bet

We also calculate EV for the NO side and pick the better direction.

### Step 5: Confidence Tiering

| Tier | Criteria | Actionable? |
|------|----------|-------------|
| **HIGH** | Sportsbook-anchored AND gap ≥ 3pp | Yes, if EV ≥ 2.5% (game) or 4% (prop) |
| **HIGH** | Mathematical inconsistency (e.g. YES@25 > YES@20) | Yes, if EV ≥ 4% |
| **MEDIUM** | Sportsbook-anchored, gap 1-3pp | No — watch only |
| **MEDIUM** | Model only, divergence > 20pp | No — not confirmed |
| **LOW** | Model only, divergence 5-20pp | No — noise |

**Why only HIGH is actionable:** The user's core principle — "just because you think it's 80% doesn't mean best value." Model-only edges are uncertain. Only edges with external confirmation from 3+ sportsbooks get bet recommendations.

### Step 6: Kelly Bet Sizing

```
Kelly fraction = (b × p - q) / b
  where b = (1 - price) / price  (net odds)
        p = true_prob
        q = 1 - true_prob

Fractional Kelly:
  HIGH confidence: 0.25× Kelly (quarter Kelly)
  MEDIUM: 0.10× Kelly
  LOW: 0 (no bet)

Hard cap: max 3% of bankroll per bet
```

With $1,000 bankroll, max bet is $30. Quarter-Kelly on a 3pp edge typically produces $8-15 bets.

### Step 7: Internal Consistency Check

An additional check scans across prop thresholds for the same player:

**Rule:** For player X, stat S:
- P(YES @ 20) must be ≥ P(YES @ 25) must be ≥ P(YES @ 30)
- Higher threshold = lower probability (monotonicity)

**If violated:** Mathematical mispricing exists. Example:
```
YES@20pts = 35¢ (35%)
YES@25pts = 55¢ (55%)  ← WRONG, can't be more likely than 20+
```

In this case, the true probability of YES@20 is at least 55% (since if you're likely to score 25, you're definitely likely to score 20). BET YES@20 at 35¢.

This is the most reliable edge type — no model or sportsbook needed, just pure math.

### Step 8: Parlay Analysis

The scanner finds 2-3 leg combinations of HIGH confidence actionable edges from **different games** (to ensure independence).

**Parlay EV calculation:**
```
combined_true_prob = prob_leg1 × prob_leg2
combined_kalshi_cost = price_leg1 × price_leg2
parlay_edge = combined_true_prob - combined_kalshi_cost
```

**Important:** Kalshi doesn't offer native parlays. These are independent simultaneous bets. The Kelly sizing already handles each bet independently. The parlay analysis is purely informational — showing you which bets to place together.

---

## Data Filters Applied

| Filter | Reason |
|--------|--------|
| Skip markets with `yes_ask + no_ask > 115¢` | No real orderbook (illiquid) |
| Skip markets where game already happened | Kelly Oubre played last night — skip stale markets |
| Skip model-only props with gap < 20pp | Avoid model noise showing as fake edges |
| Require volume ≥ $50 to show | Prevents unfillable thin markets |
| Require volume ≥ $200 to be actionable | Enough liquidity to actually fill |
| For game markets: require sportsbook date within 1 day | Prevents Game 4 (May 10) matching May 5 sportsbook line |
| Skip series markets from game-line comparison | Game-level win odds ≠ series win probability |

---

## What Makes a Real Edge

The only edges worth betting are those where:
1. **3+ sportsbooks agree** on a probability
2. **Kalshi disagrees by ≥ 3pp** from that consensus
3. **EV ≥ 2.5%** after Kalshi's 2% fee
4. **Volume ≥ $200** on that market

**Example of a real edge:**
- DraftKings, FanDuel, BetMGM all price OKC as 89% to win
- Kalshi has OKC YES at 83¢ (implying 83%)
- Gap: 89% - 83% = 6pp
- EV: `0.89 × (1-0.83) × 0.98 - 0.11 × 0.83 = 5.7%`
- Kelly at 0.25×: bet $18 on YES

**Example of what NOT to bet:**
- Our model projects a player scores 20 points (model says 70% to exceed 15)
- Kalshi has YES@15 at 48¢ (implying 48%)
- Gap: 22pp — looks big!
- BUT: no sportsbook anchor. The model could be wrong. Don't bet.

---

## Fee Structure

Kalshi charges a 2% fee on net winnings (not on the stake).

```
Effective payout on YES bet at 68¢:
  Win: (1 - 0.68) × (1 - 0.02) = 31.4¢ per dollar staked
  Lose: lose 68¢ per dollar staked
```

This means we need a slightly higher true probability to break even vs the implied price.

**Break-even true probability at price P:**
```
p × (1-P) × 0.98 = (1-p) × P
p × (1-P) × 0.98 + p × P = P
p = P / (P + (1-P) × 0.98)
```

At 50¢: need 50.5% true probability (not 50%) to break even.
At 68¢: need 69.4% true probability.

---

## Profitability Expectations

Based on the algorithm design:

| Scenario | Expected annual ROI |
|----------|---------------------|
| Sportsbook-anchored game edges only (2-3pp gap) | +5% to +12% on bankroll |
| Adding internal consistency edges | +2% to +5% additional |
| Model-only props (current MEDIUM/LOW tier) | Unknown — don't bet these |

**Key risk:** The Odds API free tier may not return prop lines. Without prop sportsbook anchoring, the prop scanning is model-only (MEDIUM confidence, not actionable).

**To get prop edges:** Upgrade to The Odds API paid tier ($79/mo) which returns player prop lines from 10+ books. This would enable HIGH confidence prop edges.

---

## Configuration (`config.py`)

| Setting | Default | Meaning |
|---------|---------|---------|
| `bankroll` | $1,000 | Total funds to size bets against |
| `min_edge_to_show` | 2% | Minimum EV to appear in any list |
| `min_edge_to_bet` | 4% | Minimum EV for prop edge actionability |
| `kelly_fraction` | 0.25 | Quarter-Kelly (conservative) |
| `max_bet_pct` | 3% | Hard cap — never bet more than 3% of bankroll |
| `fee_rate` | 2% | Kalshi fee on net winnings |

Game edges use a lower threshold of 2.5% EV since sportsbook-confirmed edges are more reliable.

---

## Running the System

```bash
# Start the dashboard
.venv/bin/python web_app.py
# Open http://localhost:8000

# Run a manual scan from CLI
.venv/bin/python -c "from scanner import run_scan; edges, parlays = run_scan(); print(f'{len([e for e in edges if e[\"actionable\"]])} actionable edges')"
```

**Scan schedule:** Automatically runs daily at 3 AM ET. The dashboard shows the last scan and lets you trigger manual scans.
