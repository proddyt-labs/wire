<template>
  <div class="flex flex-col h-screen">
    <div class="border-b border-pink-900/30 px-5 py-3 flex items-center gap-2 flex-shrink-0">
      <span class="font-mono text-pink-500/60 text-sm">@</span>
      <span class="text-pink-100 font-medium">Usuários</span>
    </div>

    <div class="flex-1 overflow-y-auto px-5 py-4">
      <div v-if="loading" class="text-pink-400/30 text-sm text-center mt-10">Carregando...</div>
      <div v-else-if="!users.length" class="text-pink-400/30 text-sm text-center mt-10">
        Nenhum usuário nos seus grupos ainda.
      </div>
      <div v-else class="flex flex-col gap-2">
        <div
          v-for="u in users" :key="u.id"
          class="flex items-center gap-3 px-4 py-3 rounded-xl bg-pink-950/30 border border-pink-900/20"
        >
          <div class="w-9 h-9 rounded-full bg-pink-900/60 flex items-center justify-center text-sm font-mono text-pink-300 flex-shrink-0">
            {{ u.username.charAt(0).toUpperCase() }}
          </div>
          <span class="text-pink-100 text-sm flex-1">{{ u.username }}</span>
          <button
            v-if="u.canChat"
            @click="startDm(u.id)"
            :disabled="starting === u.id"
            class="text-xs px-3 py-1.5 rounded-lg bg-pink-800 hover:bg-pink-700 text-pink-50 transition-colors disabled:opacity-50"
          >
            {{ starting === u.id ? '...' : 'Conversar' }}
          </button>
          <button
            v-else
            @click="sendRequest(u.id)"
            :disabled="requested.has(u.id)"
            class="text-xs px-3 py-1.5 rounded-lg border border-pink-800/50 text-pink-400 hover:bg-pink-900/30 transition-colors disabled:opacity-40"
          >
            {{ requested.has(u.id) ? 'Solicitado ✓' : 'Solicitar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/lib/api'

interface UserItem { id: string; username: string; canChat: boolean }

const router = useRouter()
const users = ref<UserItem[]>([])
const loading = ref(true)
const starting = ref<string | null>(null)
const requested = ref(new Set<string>())

async function load() {
  loading.value = true
  try {
    const { data } = await api.get<UserItem[]>('/users')
    users.value = data
  } finally {
    loading.value = false
  }
}

async function startDm(targetUserId: string) {
  starting.value = targetUserId
  try {
    const { data } = await api.post<{ id: string }>('/rooms/dms', { targetUserId })
    router.push(`/rooms/${data.id}`)
  } catch (e: any) {
    alert(e.response?.data?.error ?? e.message)
  } finally {
    starting.value = null
  }
}

async function sendRequest(toUserId: string) {
  try {
    await api.post('/requests', { toUserId })
    requested.value = new Set([...requested.value, toUserId])
  } catch (e: any) {
    alert(e.response?.data?.error ?? e.message)
  }
}

onMounted(load)
</script>
