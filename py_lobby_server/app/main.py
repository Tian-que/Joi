import random
from typing import List, Optional
from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.testclient import TestClient
from pydantic import BaseModel


app = FastAPI()

html = open("index.html", encoding='utf-8').read()


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, LobbyWebSocket] = {}

    def register(self, ws: "LobbyWebSocket"):
        self.active_connections[ws.client_id] = ws

    def disconnect(self, ws: "LobbyWebSocket"):
        self.active_connections.pop(ws.client_id)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: dict):
        for connection in self.active_connections.values():
            await connection.ws.send_json(message)

    async def send_msg_users(self, users: List[str], msg: dict):
        for user_id in users:
            if user_lobby_ws := self.active_connections.get(user_id):
                await user_lobby_ws.ws.send_json(msg)

    def check(self, client_id: str):
        return client_id in self.active_connections
    
    def get_ws(self, client_id) -> Optional["LobbyWebSocket"]:
        return self.active_connections.get(client_id)


manager = ConnectionManager()

class Party:
    def __init__(self, party_id: str) -> None:
        self.party_id = party_id
        self.team100members = {}
        self.team200members = {}
        self.team100champs = []
        self.team200champs = []

    def champ_select(self, user_id: str, req: "ChampSelectRequest"):
        if req.my_team == 100:
            team_members = self.team100members
            team_champs = self.team100champs
        else:
            team_members = self.team200members
            team_champs = self.team200champs

        if user_id in self.team100members:
            return {
                "team_champs": team_champs,
                "team_members": team_members,
                "change": False
            }
        champs = [i for i in req.my_champs if i not in team_champs]
        random_champs = random.sample(champs, 3)
        random_champs.sort()
        team_members[user_id] = random_champs
        team_champs.extend(random_champs)
        team_champs.sort()
        return {
            "team_champs": team_champs,
            "team_members": team_members,
            "change": True
        }


class PartyManager:
    def __init__(self) -> None:
        self.partys: dict[str, Party] = {}

    def create_lobby(self, datas: dict):
        pass

    def champ_select(self, user_id: str, req: "ChampSelectRequest"):
        if req.party_id in self.partys:
            party = self.partys[req.party_id]
        else:
            party = Party(party_id=req.party_id)
            self.partys[req.party_id] = party
        
        return party.champ_select(user_id, req)

patry_manager = PartyManager()

class LobbyWebSocket:

    def __init__(self, ws: WebSocket, client_id: str, manager: ConnectionManager):
        self.ws = ws
        self.client_id = client_id
        self.manager = manager
    
    async def accept(self):
        self.manager.register(self)
        await self.ws.accept()

    async def receive(self):
        return await self.ws.receive_json()
    
    async def send_to_self(self, message: dict):
        await self.ws.send_json(message)
    
    async def broadcast(self, message: dict):
        await self.manager.broadcast(message)
    
    def disconnect(self):
        self.manager.disconnect(self)

    async def champ_select(self, req: "ChampSelectRequest"):
        data = patry_manager.champ_select(user_id = self.client_id, req = req)
        change = data.pop("change")
        msg = {
            "uri": "/ChampSelect",
            "data": data
        }
        # 客户端处理多消息 取最大值
        if change:
            await self.manager.send_msg_users(users=[i for i in data.get("team_members", {}).keys()], msg=msg)



@app.get("/")
async def get():
    return HTMLResponse(html)

@app.get("/check/{client_id}")
async def _(client_id: str) -> dict:
    return {"client_id": client_id, "status": manager.check(client_id)}

class ChampSelectRequest(BaseModel):
    party_id: str
    my_team: int
    my_champs: List[int]

@app.post("/select/{client_id}")
async def _(client_id: str, req: ChampSelectRequest) -> dict:
    if ws := manager.get_ws(client_id):
        await ws.champ_select(req)
    return {}


def make_lobby_ws(ws: WebSocket, client_id: str) -> LobbyWebSocket:
    return LobbyWebSocket(ws, client_id, manager)


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(lobby_ws: LobbyWebSocket = Depends(make_lobby_ws)):
    await lobby_ws.accept()
    try:
        while True:
            data = await lobby_ws.receive()
            if data.get("command") == "in_lobbt":
                patry_manager.create_lobby(data['datas'])
            elif data.get("type") == "select":
                req = ChampSelectRequest(**data.get("datas", {}))
                await lobby_ws.champ_select(req)
    except WebSocketDisconnect:
        lobby_ws.disconnect()
        await lobby_ws.broadcast({"user": lobby_ws.client_id, "action": "leave"})

