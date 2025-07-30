<script setup lang="ts">
import useLCUStore from "@/store/lcu";
import { champDict } from "@@/const/lolDataConfig";
import ChampionImg from "@/components/img/championImg.vue";
import { storeToRefs } from "pinia";
import { LobbyTeamMemberInfo } from "@@/types/lcuType.js";
import { Icon } from "@vicons/utils";
import { CheckmarkCircle16Regular } from "@vicons/fluent";
import lcuApi from "@/api/lcuApi.js";

const lcuStore = useLCUStore();
const { champId, lobbyMembers, currentGameMode } = storeToRefs(lcuStore);
const tabVal = ref<"zixuan" | "huxuan">("zixuan");
const randomChampCounts = ref<2 | 3>(2);

// 计算每个队伍的成员（固定5个位置）
const team100Members = computed(() => {
	const members = lobbyMembers.value.filter(m => m.teamId === 100);
	return Array.from({ length: 5 }, (_, i) => members[i] || null);
});

const team200Members = computed(() => {
	const members = lobbyMembers.value.filter(m => m.teamId === 200);
	return Array.from({ length: 5 }, (_, i) => members[i] || null);
});


const columns = [
	{
		title: '用户名',
		key: 'userName',
		width: 200,
		render(row: any) {
			let con = row.connect ? '[已连接]' : '[未连接]'
			return con + row.userName;
		}
	},
	{
		title: '选择英雄',
		key: 'no',
		render(row: any) {
			// 使用h函数渲染ChampionImg组件，将no作为championId传递
			return h(ChampionImg, {
				style: { width: '50px' },
				championId: row.no
			});
		}
	},
	{
		title: '摇到的英雄',
		key: 'no',
		render(row: any) {
			// 使用h函数渲染ChampionImg组件，将no作为championId传递
			return h(ChampionImg, {
				style: { width: '50px' },
				championId: row.no
			});
		}
	},
]


const data = [
	{ no: 1, userName: 'user1', connect: true },
	{ no: 0, userName: 'user2', connect: true },
	{ no: 0, userName: 'user3', connect: true },
	{ no: 0, userName: 'user3', connect: true },
	{ no: 0, userName: 'user3', connect: true }
]

// 添加英雄列表数据（示例）
const championList = ref([
	{ id: 4, name: "卡牌大师" },
	{ id: 6, name: "无畏战车" },
	{ id: 7, name: "诡术妖姬" },
	{ id: 9, name: "远古恐惧" },
	{ id: 10, name: "亚索" },
	{ id: 11, name: "无极剑圣" },
	{ id: 12, name: "牛头酋长" },
	{ id: 13, name: "符文法师" },
	{ id: 14, name: "亡灵战神" },
	{ id: 15, name: "战争女神" },
	{ id: 16, name: "众星之子" },
	{ id: 17, name: "迅捷斥候" },
	// 更多英雄...
]);


// 添加选择英雄方法
const select_champion = (id: number | boolean) => {
	if (typeof id === 'number') {
		console.log(`选择了英雄ID: ${id}`);
		lcuApi.lolChampSelect(id, false);
		champId.value = id
		// 这里可以添加实际选择逻辑
	} else if (id === true) {
		console.log("确认选择");
		lcuApi.lolChampSelect(champId.value, true);
		// 这里可以添加确认逻辑
	}
};


// 计算每行5个英雄的分组
const groupedChampions = computed(() => {
	const result = [];
	for (let i = 0; i < championList.value.length; i += 5) {
		result.push(championList.value.slice(i, i + 5));
	}
	return result;
});

</script>


<template>
	<div class="flex h-full w-[95%]">
		<div class="flex flex-col transition-all flex-1">
			<div class="flex flex-row items-center gap-[40px] py-[15px] justify-between">
				<div class="flex flex-row shrink-0 items-center gap-2">
					当前选择英雄：
					<champion-img style="width: 50px" :champion-id="champId" />
					<div>
						{{ champId ? champDict[champId]?.label + " " + champDict[champId]?.title : "未选择" }}
					</div>
				</div>
				<div class="flex flex-row shrink-0 items-center gap-2">
					随机英雄个数:
					<n-tabs type="segment" v-model:value="randomChampCounts" style="width: 80%" animated>
						<n-tab name=2> 2 </n-tab>
						<n-tab name=3> 3 </n-tab>
						<!-- <n-tab name="aramBuff" v-if="currentGameMode === 'aram'">大乱斗BUFF</n-tab> -->
					</n-tabs>
				</div>
				<n-tabs type="segment" v-model:value="tabVal" style="width: 20%" animated>
					<n-tab name="zixuan"> 自选 </n-tab>
					<n-tab name="huxuan" disabled> 互选</n-tab>
					<!-- <n-tab name="aramBuff" v-if="currentGameMode === 'aram'">大乱斗BUFF</n-tab> -->
				</n-tabs>
			</div>
			<div class="flex h-[15%]"></div>
			<div class="flex flex-row">
				<div class="flex flex-col w-[50%]">
					<n-data-table size="small" :columns="columns" :data="data"
						:row-key="(member: LobbyTeamMemberInfo) => member.puuid" :bordered="false" />
				</div>
				<!-- 右侧英雄选择框 -->
				<div class="flex flex-col w-[50%] p-4 rounded-lg">
					<h3 class="text-lg font-medium mb-3">选择英雄</h3>

					<!-- 英雄网格 - 每行5个 -->
					<div v-for="(row, rowIndex) in groupedChampions" :key="rowIndex"
						class="flex flex-row justify-between mb-3">
						<div v-for="champ in row" :key="champ.id"
							class="flex flex-col items-center cursor-pointer transition-all hover:scale-105"
							@click="select_champion(champ.id)">
							<champion-img :champion-id="champ.id" style="width: 50px" />
							<span class="text-xs">{{ champ.name }}</span>
						</div>

						<!-- 填充空位使每行保持5个 -->
						<div v-for="i in 5 - row.length" :key="`empty-${i}`" class="w-[50px] opacity-0"></div>
					</div>

					<!-- 确认按钮 -->
					<n-button type="primary" class="mt-4 w-full" @click="select_champion(true)">
						确认选择
					</n-button>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
table {
	border-collapse: collapse;
}

tr:last-child {
	border-bottom: none;
}

:deep(.n-list-item__content) {
	display: flex;
	flex-flow: column;
	justify-content: flex-start;
}

:deep(.n-list-item--bordered) {
	background: transparent;
}

:deep(.n-tabs-pane-wrapper) {
	height: 100% !important;
}

:deep(.n-tab-pane) {
	height: 100% !important;
}

:deep(.n-carousel.n-carousel--bottom .n-carousel__dots) {
	bottom: 0px !important;
}

:deep(.n-radio__label) {
	margin-top: -1px;
}

.grid-row {
	display: flex;
	justify-content: space-between;
	margin-bottom: 12px;
}

.champion-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	cursor: pointer;
	transition: transform 0.2s;
}

.champion-item:hover {
	transform: scale(1.05);
}

.confirm-btn {
	margin-top: 16px;
	width: 100%;
}
</style>
