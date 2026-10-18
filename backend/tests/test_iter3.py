"""Iteration 3 backend tests: round venues/dates + handicap persistence."""
import os
import pytest
import requests

BASE = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE}/api"
PIN = "1926"

EXPECTED = {
    1: ("Tairua", "Thursday 5th Nov"),
    2: ("Mercury Bay", "Friday 6th Nov"),
    3: ("The Dunes Matarangi", "Saturday 7th Nov"),
}


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/admin/login", json={"pin": PIN}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def players():
    r = requests.get(f"{API}/players", timeout=15)
    assert r.status_code == 200
    return r.json()


class TestRoundVenuesDates:
    def test_rounds_have_expected_venues_and_dates(self):
        r = requests.get(f"{API}/rounds", timeout=15)
        assert r.status_code == 200
        rounds = {rd["round"]: rd for rd in r.json()}
        for num, (venue, date) in EXPECTED.items():
            assert rounds[num]["venue"] == venue, f"R{num} venue was {rounds[num]['venue']}"
            assert rounds[num]["date"] == date, f"R{num} date was {rounds[num]['date']}"


class TestHandicapSelfUpdate:
    def test_player_model_has_handicap_field(self, players):
        for p in players:
            assert "handicap" in p

    def test_self_update_handicap(self, players):
        pid = players[0]["id"]
        original = players[0].get("handicap", "")
        r = requests.patch(
            f"{API}/players/{pid}/self",
            json={"player_id": pid, "handicap": "12.4"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json()["handicap"] == "12.4"
        all_p = requests.get(f"{API}/players").json()
        assert next(p for p in all_p if p["id"] == pid)["handicap"] == "12.4"
        # cleanup
        requests.patch(f"{API}/players/{pid}/self", json={"player_id": pid, "handicap": original})


class TestHandicapAdminUpdate:
    def test_admin_update_handicap(self, admin_token, players):
        pid = players[1]["id"]
        original = players[1].get("handicap", "")
        h = {"Authorization": f"Bearer {admin_token}"}
        r = requests.patch(f"{API}/players/{pid}", json={"handicap": "7.8"}, headers=h, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["handicap"] == "7.8"
        all_p = requests.get(f"{API}/players").json()
        assert next(p for p in all_p if p["id"] == pid)["handicap"] == "7.8"
        # cleanup
        requests.patch(f"{API}/players/{pid}", json={"handicap": original}, headers=h)

    def test_admin_patch_requires_auth(self, players):
        pid = players[0]["id"]
        r = requests.patch(f"{API}/players/{pid}", json={"handicap": "99"}, timeout=15)
        assert r.status_code == 401
