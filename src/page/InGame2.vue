<script setup lang="ts">
import useLCUStore from "@/store/lcu";
import { TransitionScale } from "@morev/vue-transitions";
import NoneFlow from "@/components/gameFlow/noneFlow.vue";
import MatchmakingFlow from "@/components/gameFlow/matchmakingFlow.vue";
import InGameFlow from "@/components/gameFlow/inGameFlow.vue";
import inChampSelect from "@/components/gameFlow/inChampSelect.vue";
import noneFlowFight from "@/components/gameFlow/noneFlowFight.vue";
import inLobby from "@/components/gameFlow/inLobby.vue";

const lcuStore = useLCUStore();
</script>

<template>
	<div class="flex-1 flex flex-col justify-start">
		<div class="flex flex-col justify-center items-center w-full h-full">
			<transition-scale mode="out-in" class="flex flex-col justify-center items-center w-full h-full">
				<none-flow-fight v-if="'None' === lcuStore.gameFlowPhase" key="none-flow-fight"></none-flow-fight>
				<in-lobby v-if="lcuStore.gameFlowPhase === 'Lobby'" key="in-lobby"></in-lobby>
				<in-lobby v-if="lcuStore.gameFlowPhase === 'ChampSelect'" key="in-lobby"></in-lobby>
				<!-- <in-champ-select v-if="lcuStore.gameFlowPhase === 'ChampSelect'" key="in-champ-select"></in-champ-select> -->
				<!-- <in-game-flow
					v-if="['ChampSelect', 'GameStart', 'InProgress'].includes(lcuStore.gameFlowPhase)"
					key="in-game-flow"></in-game-flow> -->
			</transition-scale>
		</div>
	</div>
</template>

<style scoped></style>
