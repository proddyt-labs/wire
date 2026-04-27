<template>
  <RouterView />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSocketStore } from '@/stores/socket'

const auth = useAuthStore()
const socketStore = useSocketStore()

onMounted(async () => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    await auth.fetchMe()
    socketStore.connect(token)
  }
})
</script>
