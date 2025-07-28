<script setup lang="tsx">
import lcuApi from '@/api/lcuApi.js';

const message = useMessage();

const createLobby = () => {
	lcuApi.createLobby().then(() => message.success("请求已发送！"));
};
</script>

<template>
	<div class="flex flex-col items-center">
		<div style="font-size: 100px">🍽️</div>
		<div style="font-size: 40px">等你开2把游戏</div>
		<n-button @click="createLobby">创建自定义房间</n-button>
	</div>
</template>

<style scoped></style>
