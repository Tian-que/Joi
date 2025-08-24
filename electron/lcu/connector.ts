import { getAuthInfo } from "../util/authUtil";
import { createWebSocketConnection, Credentials, LeagueWebSocket } from "../lib/league-connect";
import ProcessChecker, { checkProcessExistByName } from "../util/processChecker";
import { retryWrapper, sendToWebContent } from "../util/util";
import LCUEventHandlers from "./processEvent";
import { Handle } from "../const/const";
import { getCurrentSummoner } from "./lcuRequest";
import logger from "../lib/logger";
import { setting } from "../config";
import { LobbyTeamMemberInfo, SummonerInfo } from "../types/lcuType";
import { LobbyServerWebSocket, createLobbyWebSocketConnection } from "../lib/ws-lobby";

let credentials: Credentials | null;
let ws: LeagueWebSocket | null;
let processChecker: ProcessChecker | null;
let wsIsConnecting = false;

// 内战服务端
let lobbyws: LobbyServerWebSocket | null
let lobbywsIsConnecting = false;

const createLobbyWebSocketConnectionRetry = retryWrapper(createLobbyWebSocketConnection, 4, 1500);


//重试包装
const createWebSocketConnectionRetry = retryWrapper(createWebSocketConnection, 4, 1500);

export function getCredentials() {
	if (!credentials) {
		throw new Error("未连接上英雄联盟客户端，LCU api不可用！请先登录英雄联盟客户端。");
	}
	return credentials;
}

export function getLeagueWebSocket() {
	if (!ws) {
		throw new Error("LeagueWebSocket not connected!");
	}
	return ws;
}

//监听客户端是否运行, 运行就进行连接
export function startGuardTask() {
	if (processChecker) {
		processChecker.stop();
		processChecker = null;
	}
	processChecker = new ProcessChecker("LeagueClient.exe", 4000);
	processChecker.on("running", async () => {
		let data: SummonerInfo
		if (!ws && !wsIsConnecting) {
			wsIsConnecting = true;
			//等待1.5s检测下进程再尝试连接，因为lcu客户端退出先关闭ws连接，但是进程还未推出
			await new Promise((resolve) => setTimeout(resolve, 1500));
			if (!(await checkProcessExistByName("LeagueClient.exe"))) {
				wsIsConnecting = false;
				return;
			}
			logger.info("guardTask", "LeagueClient is running, try connect");
			sendToWebContent(Handle.connecting);
			try {
				await initLeagueWebSocket();
				//这里尝试获取当前召唤师信息，获取成功了才算连接成功；因为可能客户端还未完成登录过程,比如说一区排队的情况
				data = await retryWrapper(getCurrentSummoner, 60, 5000)();
				sendToWebContent(Handle.connected);
				logger.info("guardTask", "connected to LeagueClient");
				// 游戏客户端连接完毕后，连接客户端
			} catch (e) {
				ws?.close();
				logger.error("guardTask", e instanceof Error ? e.message : e);
				sendToWebContent(Handle.disconnect);
			}
			wsIsConnecting = false;
		}
		if (ws && !lobbyws && !lobbywsIsConnecting) {
			lobbywsIsConnecting = true;
			//等待1.5s检测下进程再尝试连接，因为lcu客户端退出先关闭ws连接，但是进程还未推出
			await new Promise((resolve) => setTimeout(resolve, 1500));
			logger.info("guardTask", "LeagueClient is running, try connect lobby ws");
			// sendToWebContent(Handle.connecting);
			try {
				data = await retryWrapper(getCurrentSummoner, 60, 5000)();
				await initLobbyLeagueWebSocket(data.puuid);
				// sendToWebContent(Handle.connected);
				logger.info("guardTask", "connected to lobby ws");
				// 游戏客户端连接完毕后，连接客户端
			} catch (e) {
				lobbyws?.close();
				logger.error("guardTask", e instanceof Error ? e.message : e);
				// sendToWebContent(Handle.disconnect);
			}
			lobbywsIsConnecting = false;
		}
	});
	processChecker.on("stopped", () => {
		logger.debug("guardTask", "LeagueClient exit");
		ws = null;
		lobbyws = null;
		credentials = null;
		sendToWebContent(Handle.disconnect);
	});
	processChecker.start(true);
	return processChecker;
}

export async function initLeagueWebSocket() {
	if (ws) {
		return;
	}
	credentials = await getAuthInfo();
  	if (!setting.model.lolClientPath) {
		setting.model.lolClientPath = credentials.commandLine?.replace(
			"LeagueClient/LeagueClientUx.exe",
			"TCLS/client.exe"
		);
		setting.updateSetting(setting.model);
	}
	//使用重试包装的版本，客户端刚启动的时候可能没法直接连上，因为lcu客户端可能还未初始化ws
	ws = await createWebSocketConnectionRetry(credentials);
	// ws = await createLobbyWebSocketConnectionRetry();
	ws.onclose = () => {
		sendToWebContent(Handle.disconnect);
		ws.subscriptions.clear();
		ws = null;
	};
	wsSubscribe(ws);
}

export async function initLobbyLeagueWebSocket(puuid: string) {
	if (lobbyws) {
		return;
	}
	lobbyws = await createLobbyWebSocketConnectionRetry(puuid);
	lobbyws.onclose = () => {
		// sendToWebContent(Handle.lobbyDisconnect);
		lobbyws.subscriptions.clear();
		lobbyws = null;
	};
	wsLobbySubscribe(lobbyws);
}

//ws连接并监听事件
function wsSubscribe(ws: LeagueWebSocket) {
	ws.subscribe("/lol-gameflow/v1/gameflow-phase", async (data) => {
		logger.info("gameflow-phase", data);
		sendToWebContent(Handle.gameFlowPhase, data);
		Object.values(LCUEventHandlers).forEach((handler) => handler(data));
	});
	ws.subscribe("/lol-lobby/v2/lobby", async (data) => {
		// 房间信息，有值变更 -> 更新房主信息 -> 更新房间id -> 更新队伍信息(如果是房主则推送)
		// 房间信息，空值 -> 如果是房主，推送注销房间
		logger.info("datas", data);
		sendToWebContent(Handle.lobby, data);
	});
}

//ws连接并监听事件
function wsLobbySubscribe(ws: LobbyServerWebSocket) {
	// ws.subscribe("/lol-gameflow/v1/gameflow-phase", async (data) => {
	// 	logger.info("gameflow-phase", data);
	// 	sendToWebContent(Handle.gameFlowPhase, data);
	// 	Object.values(LCUEventHandlers).forEach((handler) => handler(data));
	// });
	ws.subscribe("/ChampSelect", async (data) => {
		// 房间信息，有值变更 -> 更新房主信息 -> 更新房间id -> 更新队伍信息(如果是房主则推送)
		// 房间信息，空值 -> 如果是房主，推送注销房间
		logger.info("datas", data);
		let a = 0;
		sendToWebContent(Handle.lobbyChampSelect, data);
		// sendToWebContent(Handle.lobby, data);
	});
}

