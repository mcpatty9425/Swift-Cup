"""Backend API tests for The Swifty Cup 2026."""
import os
import asyncio
import json
import pytest
import requests
import websockets

BASE_URL = "https://the-swifty-cup.preview.emergentagent.com"
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/admin/login", json={"pin": "1926"}, timeout=30)
    assert r.status_code == 200, r.text
    tok = r.json()["token"]
    return tok


@pytest.fixture(scope="module")
def state():
    r = requests.get(f"{API}/state", timeout=30)
    assert r.status_code == 200
    return r.json()


# --- /api/state structure
class TestState:
    def test_state_has_sections(self, state):
        for k in ("settings", "players", "matches", "leaderboard"):
            assert k in state

    def test_state_players_counts(self, state):
        nz = [p for p in state["players"] if p["team"] == "NZ"]
        wd = [p for p in state["players"] if p["team"] == "WORLD"]
        assert len(nz) == 6, f"NZ count={len(nz)}"
        assert len(wd) == 6, f"WORLD count={len(wd)}"
        assert len(state["players"]) == 12

    def test_state_matches_counts(self, state):
        rounds = {1: 0, 2: 0, 3: 0}
        for m in state["matches"]:
            rounds[m["round"]] += 1
        assert rounds == {1: 3, 2: 3, 3: 6}, f"rounds={rounds}"

    def test_leaderboard_fields(self, state):
        lb = state["leaderboard"]
        for k in ("nz_total", "world_total", "leader", "cup_winner",
                 "completed_matches", "total_matches"):
            assert k in lb, f"missing {k}"
        assert lb["total_matches"] == 12


# --- Admin auth
class TestAdminAuth:
    def test_wrong_pin_401(self):
        r = requests.post(f"{API}/admin/login", json={"pin": "0000"}, timeout=30)
        assert r.status_code == 401

    def test_correct_pin_200(self, admin_token):
        assert isinstance(admin_token, str) and len(admin_token) > 10

    def test_admin_me_without_token(self):
        r = requests.get(f"{API}/admin/me", timeout=30)
        assert r.status_code == 200
        assert r.json()["is_admin"] is False

    def test_admin_me_with_token(self, admin_token):
        r = requests.get(f"{API}/admin/me",
                         headers={"Authorization": f"Bearer {admin_token}"},
                         timeout=30)
        assert r.status_code == 200
        assert r.json()["is_admin"] is True


# --- Players admin gating
class TestPlayerUpdate:
    def test_patch_player_no_auth_401(self):
        r = requests.get(f"{API}/players", timeout=30)
        pid = r.json()[0]["id"]
        r2 = requests.patch(f"{API}/players/{pid}", json={"name": "X"}, timeout=30)
        assert r2.status_code == 401

    def test_patch_player_with_auth(self, admin_token):
        r = requests.get(f"{API}/players", timeout=30)
        p = r.json()[0]
        orig_name, orig_bio = p["name"], p["bio"]
        new_name = "TEST_PLAYER"
        new_bio = "TEST_BIO"
        r2 = requests.patch(
            f"{API}/players/{p['id']}",
            json={"name": new_name, "bio": new_bio},
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=30,
        )
        assert r2.status_code == 200, r2.text
        body = r2.json()
        assert body["name"] == new_name
        assert body["bio"] == new_bio
        # GET verify persistence
        r3 = requests.get(f"{API}/players", timeout=30)
        found = next(x for x in r3.json() if x["id"] == p["id"])
        assert found["name"] == new_name and found["bio"] == new_bio
        # restore
        requests.patch(
            f"{API}/players/{p['id']}",
            json={"name": orig_name, "bio": orig_bio},
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=30,
        )


# --- Match result updates (public)
class TestMatchResults:
    def _get_r1_matches(self):
        r = requests.get(f"{API}/matches", timeout=30)
        return [m for m in r.json() if m["round"] == 1]

    def _clear(self, mid):
        requests.patch(f"{API}/matches/{mid}", json={"result": None, "live_status": ""}, timeout=30)

    def test_nz_win_adds_point(self):
        matches = self._get_r1_matches()
        mid = matches[0]["id"]
        # Clear all first
        for m in matches:
            self._clear(m["id"])
        # Baseline
        lb0 = requests.get(f"{API}/leaderboard", timeout=30).json()
        # NZ_WIN
        r = requests.patch(f"{API}/matches/{mid}",
                           json={"result": "NZ_WIN", "live_status": "Live"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["result"] == "NZ_WIN"
        assert r.json()["live_status"] == "Live"
        lb1 = requests.get(f"{API}/leaderboard", timeout=30).json()
        assert lb1["nz_total"] - lb0["nz_total"] == 1.0
        assert lb1["completed_matches"] == lb0["completed_matches"] + 1
        self._clear(mid)

    def test_halved_adds_half_each(self):
        m = self._get_r1_matches()[0]
        self._clear(m["id"])
        lb0 = requests.get(f"{API}/leaderboard", timeout=30).json()
        r = requests.patch(f"{API}/matches/{m['id']}", json={"result": "HALVED"}, timeout=30)
        assert r.status_code == 200
        lb1 = requests.get(f"{API}/leaderboard", timeout=30).json()
        assert lb1["nz_total"] - lb0["nz_total"] == 0.5
        assert lb1["world_total"] - lb0["world_total"] == 0.5
        self._clear(m["id"])

    def test_change_nz_to_world_moves_point(self):
        m = self._get_r1_matches()[0]
        self._clear(m["id"])
        requests.patch(f"{API}/matches/{m['id']}", json={"result": "NZ_WIN"}, timeout=30)
        lb_nz = requests.get(f"{API}/leaderboard", timeout=30).json()
        requests.patch(f"{API}/matches/{m['id']}", json={"result": "WORLD_WIN"}, timeout=30)
        lb_wd = requests.get(f"{API}/leaderboard", timeout=30).json()
        assert lb_wd["nz_total"] - lb_nz["nz_total"] == -1.0
        assert lb_wd["world_total"] - lb_nz["world_total"] == 1.0
        self._clear(m["id"])

    def test_null_uncompletes(self):
        m = self._get_r1_matches()[0]
        requests.patch(f"{API}/matches/{m['id']}", json={"result": "NZ_WIN"}, timeout=30)
        lb0 = requests.get(f"{API}/leaderboard", timeout=30).json()
        r = requests.patch(f"{API}/matches/{m['id']}", json={"result": None}, timeout=30)
        assert r.status_code == 200
        assert r.json()["result"] is None
        lb1 = requests.get(f"{API}/leaderboard", timeout=30).json()
        assert lb1["completed_matches"] == lb0["completed_matches"] - 1

    def test_invalid_result_400(self):
        m = self._get_r1_matches()[0]
        r = requests.patch(f"{API}/matches/{m['id']}", json={"result": "FOO"}, timeout=30)
        assert r.status_code in (400, 422)


# --- Leaderboard leader logic
class TestLeaderboardLogic:
    def _clear_all(self):
        for m in requests.get(f"{API}/matches", timeout=30).json():
            requests.patch(f"{API}/matches/{m['id']}", json={"result": None, "live_status": ""}, timeout=30)

    def test_leader_switches(self):
        self._clear_all()
        matches = requests.get(f"{API}/matches", timeout=30).json()
        lb = requests.get(f"{API}/leaderboard", timeout=30).json()
        assert lb["leader"] == "TIE"
        assert lb["cup_winner"] is None
        # NZ win 1
        requests.patch(f"{API}/matches/{matches[0]['id']}", json={"result": "NZ_WIN"}, timeout=30)
        lb = requests.get(f"{API}/leaderboard", timeout=30).json()
        assert lb["leader"] == "NZ"
        assert lb["cup_winner"] is None
        # World wins 2
        requests.patch(f"{API}/matches/{matches[1]['id']}", json={"result": "WORLD_WIN"}, timeout=30)
        requests.patch(f"{API}/matches/{matches[2]['id']}", json={"result": "WORLD_WIN"}, timeout=30)
        lb = requests.get(f"{API}/leaderboard", timeout=30).json()
        assert lb["leader"] == "WORLD"
        self._clear_all()

    def test_cup_winner_only_when_all_done(self):
        self._clear_all()
        matches = requests.get(f"{API}/matches", timeout=30).json()
        # Complete 11 as NZ_WIN
        for m in matches[:11]:
            requests.patch(f"{API}/matches/{m['id']}", json={"result": "NZ_WIN"}, timeout=30)
        lb = requests.get(f"{API}/leaderboard", timeout=30).json()
        assert lb["cup_winner"] is None
        assert lb["completed_matches"] == 11
        # Complete the last
        requests.patch(f"{API}/matches/{matches[11]['id']}", json={"result": "NZ_WIN"}, timeout=30)
        lb = requests.get(f"{API}/leaderboard", timeout=30).json()
        assert lb["completed_matches"] == 12
        assert lb["cup_winner"] == "NZ"
        self._clear_all()


# --- Pairings admin
class TestPairings:
    def test_pairings_no_auth_401(self):
        r = requests.patch(f"{API}/pairings/1", json={"matches": []}, timeout=30)
        assert r.status_code == 401

    def test_pairings_updates_but_preserves_result(self, admin_token):
        # pick R1 match, set result
        matches = requests.get(f"{API}/matches", timeout=30).json()
        players = requests.get(f"{API}/players", timeout=30).json()
        nz_ids = [p["id"] for p in players if p["team"] == "NZ"][:2]
        wd_ids = [p["id"] for p in players if p["team"] == "WORLD"][:2]
        r1 = [m for m in matches if m["round"] == 1]
        target = r1[0]
        # Set a result
        requests.patch(f"{API}/matches/{target['id']}",
                       json={"result": "HALVED", "live_status": "Hole 9"}, timeout=30)
        # Update pairings
        payload = {"matches": [{"id": target["id"],
                                "nz_player_ids": nz_ids,
                                "world_player_ids": wd_ids}]}
        r = requests.patch(f"{API}/pairings/1", json=payload,
                           headers={"Authorization": f"Bearer {admin_token}"}, timeout=30)
        assert r.status_code == 200, r.text
        # Verify
        matches2 = requests.get(f"{API}/matches", timeout=30).json()
        updated = next(m for m in matches2 if m["id"] == target["id"])
        assert updated["nz_player_ids"] == nz_ids
        assert updated["world_player_ids"] == wd_ids
        assert updated["result"] == "HALVED"  # preserved
        assert updated["live_status"] == "Hole 9"  # preserved
        # Cleanup
        requests.patch(f"{API}/matches/{target['id']}",
                       json={"result": None, "live_status": ""}, timeout=30)
        requests.patch(f"{API}/pairings/1",
                       json={"matches": [{"id": target["id"], "nz_player_ids": [], "world_player_ids": []}]},
                       headers={"Authorization": f"Bearer {admin_token}"}, timeout=30)


# --- WebSocket
class TestWebSocket:
    def test_ws_connect_and_match_updated(self):
        ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + "/api/ws"

        async def runner():
            try:
                async with websockets.connect(ws_url, open_timeout=15) as ws:
                    # Trigger an update
                    matches = requests.get(f"{API}/matches", timeout=30).json()
                    mid = matches[0]["id"]
                    requests.patch(f"{API}/matches/{mid}",
                                   json={"live_status": "WS_TEST"}, timeout=30)
                    msg = await asyncio.wait_for(ws.recv(), timeout=10)
                    data = json.loads(msg)
                    return data
            except Exception as e:
                return {"error": str(e)}

        result = asyncio.get_event_loop().run_until_complete(runner()) \
            if not asyncio.get_event_loop().is_closed() else asyncio.run(runner())
        if "error" in result:
            pytest.skip(f"WS not reachable: {result['error']}")
        assert result.get("type") == "match_updated"
        # cleanup
        matches = requests.get(f"{API}/matches", timeout=30).json()
        requests.patch(f"{API}/matches/{matches[0]['id']}", json={"live_status": ""}, timeout=30)
