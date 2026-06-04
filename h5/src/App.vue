<template>
  <router-view />
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/useAuthStore'

const authStore = useAuthStore()
authStore.restoreSession()
</script>
