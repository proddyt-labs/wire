<template>
  <div class="flex flex-col h-screen">
    <div class="border-b border-pink-900/30 px-5 py-3 flex items-center gap-2 flex-shrink-0">
      <span class="font-mono text-pink-500/60 text-sm">«·»</span>
      <span class="text-pink-100 font-medium">Solicitações</span>
      <span v-if="requests.length" class="ml-1 text-xs bg-pink-800/60 text-pink-200 rounded-full px-2 py-0.5">{{ requests.length }}</span>
    </div>

    <div class="flex-1 overflow-y-auto px-5 py-4">
      <div v-if="loading" class="text-pink-400/30 text-sm text-center mt-10">Carregando...</div>
      <div v-else-if="!requests.length" class="text-pink-400/30 text-sm text-center mt-10">
        Nenhuma solicitação pendente.
      </div>
      <div v-else class="flex flex-col gap-2">
        <div
          v-for="r in requests" :key="r.id"
          class="flex items-center gap-3 px-4 py-3 rounded-xl bg-pink-950/30 border border-pink-900/20"
        >
          <div class="w-9 h-9 rounded-full bg-pink-900/60 flex items-center justify-center text-sm font-mono text-pink-300 flex-shrink-0">
            {{ r.fromUser.username.charAt(0).toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-pink-100 text-sm font-medium">{{ r.fromUser.username }}</p>
            <p class="text-pink-400/50 text-xs font-mono">{{ new Date(r.createdAt).toLocaleDateString('pt-BR') }}</p>
          </div>
          <div class="flex gap-2">
            <button
              @click="respond(r.id, 'accepted')"
              :disabled="responding === r.id"
              class="text-xs px-3 py-1.5 rounded-lg bg-pink-800 hover:bg-pink-700 text-pink-50 transition-colors disabled:opacity-50"
            >Aceitar</button>
            <button
              @click="respond(r.id, 'rejected')"
              :disabled="responding === r.id"
              class="text-xs px-3 py-1.5 rounded-lg border border-pink-800/50 text-pink-400 hover:bg-pink-900/30 transition-colors disabled:opacity-50"
            >Recusar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/lib/api'

interface RequestItem {
  id: string
  fromUser: { id: string; username: string }
  status: string
  createdAt: string
}

const requests = ref<RequestItem[]>([])
const loading = ref(true)
const responding = ref<string | null>(null)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get<RequestItem[]>('/requests')
    requests.value = data
  } finally {
    loading.value = false
  }
}

async function respond(id: string, status: 'accepted' | 'rejected') {
  responding.value = id
  try {
    await api.patch(`/requests/${id}`, { status })
    requests.value = requests.value.filter(r => r.id !== id)
  } catch (e: any) {
    alert(e.response?.data?.error ?? e.message)
  } finally {
    responding.value = null
  }
}

onMounted(load)
</script>
