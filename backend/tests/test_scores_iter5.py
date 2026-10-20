"""Iteration 5 — Scores section backend tests."""
import os
import time
import requests
import pytest

BASE_URL = (
    os.environ.get("EXPO_BACKEND_URL")
    or os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or "https://the-swifty-cup.preview.emergentagent.com"
).rstrip("/")

ADMIN_PIN = "1926"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/admin/login", json={"pin": ADMIN_PIN}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def players():
    r = requests.get(f"{BASE_URL}/api/players", timeout=20)
    assert r.status_code == 200
    return r.json()


# ---------- scores/state ----------
class TestScoresState:
    def test_state_shape(self):
        r = requests.get(f"{BASE_URL}/api/scores/state", timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ("courses", "settings", "overrides", "cards"):
            assert k in d
        rounds = {c["round"]: c for c in d["courses"]}
        assert 2 in rounds and 3 in rounds
        c2 = rounds[2]
        assert c2["par"] == 71 and c2["rating"] == 68.7 and c2["slope"] == 111
        assert len(c2["holes"]) == 18
        assert sorted(h["si"] for h in c2["holes"]) == list(range(1, 19))
        c3 = rounds[3]
        assert c3["par"] == 72 and c3["rating"] == 72.2 and c3["slope"] == 128
        assert len(c3["holes"]) == 18
        assert sorted(h["si"] for h in c3["holes"]) == list(range(1, 19))
        # settings defaults
        assert d["settings"]["method"] in ("AS_ENTERED", "COURSE")
        assert isinstance(d["settings"]["allowance"], int)


# ---------- scores/sync ----------
class TestScoresSync:
    def test_sync_merge_and_timestamp_rules(self, players):
        pid = players[0]["id"]

        # Fresh write
        t_now = int(time.time() * 1000)
        payload = {"cards": [{"player_id": pid, "round": 2, "holes": {"1": {"g": 5, "pu": False, "t": t_now}}}]}
        r = requests.post(f"{BASE_URL}/api/scores/sync", json=payload, timeout=20)
        assert r.status_code == 200
        assert r.json()["ok"] is True

        # Verify stored via state
        state = requests.get(f"{BASE_URL}/api/scores/state", timeout=20).json()
        card = next((c for c in state["cards"] if c["player_id"] == pid and c["round"] == 2), None)
        assert card is not None
        assert card["holes"]["1"]["g"] == 5
        assert card["holes"]["1"]["t"] == t_now

        # Older t MUST NOT overwrite
        older = {"cards": [{"player_id": pid, "round": 2, "holes": {"1": {"g": 9, "pu": False, "t": t_now - 1000}}}]}
        r = requests.post(f"{BASE_URL}/api/scores/sync", json=older, timeout=20)
        assert r.status_code == 200
        state = requests.get(f"{BASE_URL}/api/scores/state", timeout=20).json()
        card = next(c for c in state["cards"] if c["player_id"] == pid and c["round"] == 2)
        assert card["holes"]["1"]["g"] == 5, "Older timestamp overwrote newer"

        # Newer t DOES overwrite
        newer = {"cards": [{"player_id": pid, "round": 2, "holes": {"1": {"g": 7, "pu": False, "t": t_now + 1000}}}]}
        r = requests.post(f"{BASE_URL}/api/scores/sync", json=newer, timeout=20)
        assert r.status_code == 200
        state = requests.get(f"{BASE_URL}/api/scores/state", timeout=20).json()
        card = next(c for c in state["cards"] if c["player_id"] == pid and c["round"] == 2)
        assert card["holes"]["1"]["g"] == 7

    def test_invalid_player_ignored(self):
        payload = {"cards": [{"player_id": "non-existent-id-xyz", "round": 2, "holes": {"1": {"g": 4, "pu": False, "t": int(time.time() * 1000)}}}]}
        r = requests.post(f"{BASE_URL}/api/scores/sync", json=payload, timeout=20)
        assert r.status_code == 200
        state = requests.get(f"{BASE_URL}/api/scores/state", timeout=20).json()
        assert not any(c["player_id"] == "non-existent-id-xyz" for c in state["cards"])


# ---------- admin-gated endpoints ----------
class TestAdminGating:
    def test_course_update_requires_admin(self):
        body = {"name": "X", "par": 71, "rating": 68.7, "slope": 111, "holes": [{"par": 4, "si": i} for i in range(1, 19)]}
        r = requests.put(f"{BASE_URL}/api/courses/2", json=body, timeout=20)
        assert r.status_code == 401

    def test_settings_patch_requires_admin(self):
        r = requests.patch(f"{BASE_URL}/api/scores/settings", json={"method": "COURSE"}, timeout=20)
        assert r.status_code == 401

    def test_ph_override_requires_admin(self, players):
        pid = players[0]["id"]
        r = requests.put(f"{BASE_URL}/api/scores/ph/2/{pid}", json={"ph": 14}, timeout=20)
        assert r.status_code == 401


class TestCourseValidation:
    def test_rejects_duplicate_si(self, headers):
        holes = [{"par": 4, "si": i} for i in range(1, 19)]
        holes[0]["si"] = 2  # duplicates 2, missing 1
        body = {"name": "Bad", "par": 71, "rating": 68.7, "slope": 111, "holes": holes}
        r = requests.put(f"{BASE_URL}/api/courses/2", headers=headers, json=body, timeout=20)
        assert r.status_code == 400

    def test_rejects_not_18_holes(self, headers):
        body = {"name": "Bad", "par": 71, "rating": 68.7, "slope": 111,
                "holes": [{"par": 4, "si": i} for i in range(1, 18)]}
        r = requests.put(f"{BASE_URL}/api/courses/2", headers=headers, json=body, timeout=20)
        assert r.status_code == 400


class TestPhOverride:
    def test_set_and_clear_override(self, headers, players):
        pid = players[0]["id"]
        # Set
        r = requests.put(f"{BASE_URL}/api/scores/ph/2/{pid}", headers=headers, json={"ph": 14}, timeout=20)
        assert r.status_code == 200
        state = requests.get(f"{BASE_URL}/api/scores/state", timeout=20).json()
        o = next((x for x in state["overrides"] if x["player_id"] == pid and x["round"] == 2), None)
        assert o and o["ph"] == 14

        # Clear (ph null)
        r = requests.put(f"{BASE_URL}/api/scores/ph/2/{pid}", headers=headers, json={"ph": None}, timeout=20)
        assert r.status_code == 200
        state = requests.get(f"{BASE_URL}/api/scores/state", timeout=20).json()
        assert not any(x["player_id"] == pid and x["round"] == 2 for x in state["overrides"])


class TestSettingsUpdate:
    def test_patch_settings_round_trip(self, headers):
        # Change to COURSE / 95
        r = requests.patch(f"{BASE_URL}/api/scores/settings", headers=headers,
                           json={"method": "COURSE", "allowance": 95}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["method"] == "COURSE"
        assert d["allowance"] == 95
        # Restore defaults
        r = requests.patch(f"{BASE_URL}/api/scores/settings", headers=headers,
                           json={"method": "AS_ENTERED", "allowance": 100}, timeout=20)
        assert r.status_code == 200
        assert r.json()["method"] == "AS_ENTERED"
        assert r.json()["allowance"] == 100


# ---------- CLEANUP (runs last; relies on module scope + alphabetical order) ----------
class TestZZCleanup:
    def test_cleanup(self, headers, players):
        """Delete scorecards + overrides + restore settings and courses."""
        # Restore settings
        r = requests.patch(f"{BASE_URL}/api/scores/settings", headers=headers,
                           json={"method": "AS_ENTERED", "allowance": 100}, timeout=20)
        assert r.status_code == 200

        # Clear all PH overrides via admin API
        state = requests.get(f"{BASE_URL}/api/scores/state", timeout=20).json()
        for o in state["overrides"]:
            r = requests.put(
                f"{BASE_URL}/api/scores/ph/{o['round']}/{o['player_id']}",
                headers=headers, json={"ph": None}, timeout=20,
            )
            assert r.status_code == 200

        # Nuke scorecards directly via mongo
        import pymongo
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")
        c = pymongo.MongoClient(mongo_url)
        c[db_name].scorecards.delete_many({})

        # Restore course defaults
        defaults = {
            2: {"name": "Mercury Bay Golf Club, Whitianga", "par": 71, "rating": 68.7, "slope": 111,
                "holes": [[4, 5], [3, 12], [4, 17], [3, 18], [5, 8], [3, 14], [5, 9], [4, 1], [5, 16],
                          [4, 13], [5, 11], [3, 4], [4, 2], [3, 10], [4, 3], [5, 6], [4, 7], [3, 15]]},
            3: {"name": "The Dunes, Matarangi", "par": 72, "rating": 72.2, "slope": 128,
                "holes": [[4, 8], [4, 6], [5, 16], [4, 10], [3, 4], [4, 2], [3, 18], [4, 12], [4, 14],
                          [5, 13], [3, 11], [4, 9], [4, 3], [5, 5], [4, 1], [4, 17], [5, 7], [3, 15]]},
        }
        for rnd, d in defaults.items():
            body = {"name": d["name"], "par": d["par"], "rating": d["rating"], "slope": d["slope"],
                    "holes": [{"par": p, "si": s} for p, s in d["holes"]]}
            r = requests.put(f"{BASE_URL}/api/courses/{rnd}", headers=headers, json=body, timeout=20)
            assert r.status_code == 200

        # Verify clean
        state = requests.get(f"{BASE_URL}/api/scores/state", timeout=20).json()
        assert state["cards"] == []
        assert state["overrides"] == []
        assert state["settings"]["method"] == "AS_ENTERED"
        assert state["settings"]["allowance"] == 100
