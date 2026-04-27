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

// Connect socket synchronously in setup so socket.value is available before children mount
const token = localStorage.getItem('auth_token')
if (token) {
  socketStore.connect(token)
}

onMounted(async () => {
  if (token) {
    await auth.fetchMe()
  }
})
</script>
