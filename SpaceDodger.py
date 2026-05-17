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
