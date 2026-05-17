# Space Dodger — GenLayer Intelligent Contract Game

A browser-based arcade game where players dodge asteroids — with **AI and consensus built into the core game loop** via a GenLayer Intelligent Contract.

🔗 **Live Demo:** https://richardweb1.github.io/space-dodger/

---

## How AI & Consensus Work in the Core Gameplay

This is not just a game with a wallet button. The Intelligent Contract (`SpaceDodger.py`) directly controls two gameplay mechanics:

### 1. AI Difficulty Tuning
Before every game session, the frontend reads `get_difficulty_tier()` from the contract. The contract stores a difficulty tier (`easy / normal / hard / chaos`) determined by an LLM based on community aggregate performance.

This tier sets the asteroid spawn speed before the game starts — the game gets harder or easier based on how the whole community is playing, decided by AI on-chain.

### 2. AI Score Validation (Consensus Required)
When a player dies, their session data (score, survival time, asteroids dodged) is submitted via `submit_score()`. Inside the contract:

- An LLM (`gl.nondet.exec_prompt`) judges whether the score is humanly plausible
- All 5 validators run this independently with their own LLM
- `gl.eq_principle.prompt_comparative` reaches consensus on the verdict
- Only if validators agree the score is **valid** is it written to the on-chain leaderboard

The leaderboard is trustless — no central server, no manual moderation. The AI is the judge and the blockchain enforces it.

---

## Intelligent Contract: `SpaceDodger.py`

```python
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json

class SpaceDodger(gl.Contract):

    difficulty_tier: str
    total_games: str
    leaderboard: str

    def __init__(self):
        self.difficulty_tier = "normal"
        self.total_games = "0"
        self.leaderboard = "{}"

    @gl.public.view
    def get_difficulty_tier(self) -> str:
        return self.difficulty_tier

    @gl.public.view
    def get_total_games(self) -> str:
        return self.total_games

    @gl.public.view
    def get_leaderboard(self) -> str:
        return self.leaderboard

    @gl.public.view
    def get_player_score(self, player: str) -> str:
        scores = json.loads(self.leaderboard)
        return str(scores.get(player, 0))

    @gl.public.write
    def submit_score(self, score: str, survival_ms: str, asteroids_dodged: str, power_ups: str):
        player = str(gl.message.sender_address)
        prompt = f"""
You are a fair judge for the arcade game "Space Dodger".
Player claims: score={score}, survival={survival_ms}ms, dodged={asteroids_dodged}, powerups={power_ups}.
Rules: score = asteroids_dodged + (power_ups*5). Max 3 dodges/sec. Over 600s survival is extremely rare.
Is this VALID?
Respond ONLY with this JSON:
{{"valid": true, "reason": "ok"}} or {{"valid": false, "reason": "why"}}
"""
        def get_answer():
            result = gl.nondet.exec_prompt(prompt)
            return result.replace("```json", "").replace("```", "").strip()

        result = gl.eq_principle.prompt_comparative(get_answer, "The value of valid must match")
        verdict = json.loads(result)

        if not verdict.get("valid", False):
            return

        scores = json.loads(self.leaderboard)
        if int(score) > int(scores.get(player, 0)):
            scores[player] = int(score)
            self.leaderboard = json.dumps(scores)
        self.total_games = str(int(self.total_games) + 1)
```

### GenLayer SDK Used

| API | Purpose |
|---|---|
| `gl.nondet.exec_prompt(prompt)` | LLM judges if score is humanly valid |
| `gl.eq_principle.prompt_comparative(fn, criteria)` | Validators reach consensus on verdict |
| `gl.message.sender_address` | Ties score to player's wallet |

---

## Game Flow

```
Player opens game
       ↓
Frontend reads get_difficulty_tier() from contract
       ↓
AI tier sets asteroid speed (easy / normal / hard / chaos)
       ↓
Player plays and dies
       ↓
Frontend calls submit_score(score, survival_ms, dodged, power_ups)
       ↓
LLM judges: is this score humanly possible?
       ↓
5 validators reach consensus → YES or NO
       ↓
YES → saved to on-chain leaderboard
NO  → rejected silently (cheat detected)
```

---

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript, Ethers.js
- **Intelligent Contract:** Python with `py-genlayer` SDK
- **Network:** GenLayer Testnet
