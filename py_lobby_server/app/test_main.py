from fastapi.testclient import TestClient
from app.main import app

def test_websocket():
    user_home = TestClient(app)
    user_100_1 = TestClient(app)
    with user_home.websocket_connect("/ws/user_home") as websocket, user_100_1.websocket_connect("ws/100_1") as ws_100_1:
        websocket.send_json({
            "type": "select",
            "datas": {"party_id": "a", "my_team": 100, "my_champs": [1, 2, 3, 4, 5]}
        })
        ws_100_1.send_json({
            "type": "select",
            "datas": {"party_id": "a", "my_team": 100, "my_champs": [5, 6, 8, 9, 10]}
        })
        data = websocket.receive_json()
        assert data == {"msg": "Hello WebSocket"}