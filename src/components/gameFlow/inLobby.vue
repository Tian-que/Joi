<script setup lang="ts">
import useLCUStore from "@/store/lcu";
import { champDict } from "@@/const/lolDataConfig";
import ChampionImg from "@/components/img/championImg.vue";
import { storeToRefs } from "pinia";

const lcuStore = useLCUStore();
const { champId, lobbyMembers} = storeToRefs(lcuStore);


// 计算每个队伍的成员（固定5个位置）
const team100Members = computed(() => {
    const members = lobbyMembers.value.filter(m => m.teamId === 100);
    return Array.from({ length: 5 }, (_, i) => members[i] || null);
});

const team200Members = computed(() => {
    const members = lobbyMembers.value.filter(m => m.teamId === 200);
    Array.from({ length: 5 }, (_, i) => members[i] || null);
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
			</div>
			<div class="flex flex-row">
				<div style="margin-bottom: 16px" class="flex w-[50%]">
					<div class="flex w-[50%]" v-for="member in lobbyMembers" >
						<li v-if="member.teamId === 200">
						{{ member.summonerName }}
						</li>
					</div>
				</div>
				<div style="margin-bottom: 16px" class="flex w-[50%]">
					<div class="flex w-[50%]" v-for="member in lobbyMembers">
						<li v-if="member.teamId === 200">
						{{ member.summonerName }}
						</li>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
:deep(.n-card__content) {
	display: flex;
	flex-flow: column;
	justify-content: flex-start;
}

:deep(.n-card--bordered) {
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
</style>
