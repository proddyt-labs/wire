<template>
  <div class="flex flex-col h-screen">
    <!-- Header -->
    <div class="border-b border-pink-900/30 px-6 py-3 flex items-center gap-3">
      <RouterLink to="/" class="text-pink-400/60 hover:text-pink-300 text-sm transition-colors">← salas</RouterLink>
      <span class="text-pink-100 font-medium">{{ roomName }}</span>
    </div>

    <!-- Messages -->
    <div ref="messagesEl" class="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
      <div v-if="loading" class="text-pink-400/50 text-sm">Carregando...</div>
      <div v-else-if="!messages.length" class="text-pink-400/50 text-sm text-center mt-10">Nenhuma mensagem. Seja o primeiro a falar!</div>

      <div
        v-for="msg in messages" :key="msg.id"
        class="flex flex-col gap-0.5"
        :class="msg.author === auth.displayName ? 'items-end' : 'items-start'"
      >
        <span class="text-xs text-pink-400/50">{{ msg.author }}</span>
        <div
          class="px-4 py-2 rounded-2xl text-sm max-w-xs"
          :class="msg.author === auth.displayName
            ? 'bg-pink-700/60 text-pink-50 rounded-br-sm'
            : 'bg-pink-950/40 border border-pink-900/30 text-pink-100 rounded-bl-sm'"
        >
          {{ msg.content }}
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="border-t border-pink-900/30 px-6 py-4">
      <form @submit.prevent="send" class="flex gap-3">
        <input
          v-model="draft" type="text" placeholder="Mensagem..."
          class="flex-1 bg-pink-950/40 border border-pink-800/40 rounded-xl px-4 py-2 text-sm text-pink-50 placeholder-pink-400/40 focus:outline-none focus:border-pink-500"
        />
        <button type="submit" :disabled="!draft.trim() || sending" class="px-4 py-2 rounded-xl bg-pink-700 hover:bg-pink-600 text-white text-sm disabled:opacity-40 transition-colors">
          Enviar
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

interface Message { id: string; content: string; author: string; createdAt: string }

const route = useRoute()
const auth = useAuthStore()
const roomId = route.params.id as string
const roomName = ref('')
const messages = ref<Message[]>([])
const loading = ref(true)
const draft = ref('')
const sending = ref(false)
const messagesEl = ref<HTMLElement>()

async function load() {
  loading.value = true
  try {
    const { data } = await api.get<Message[]>(`/rooms/${roomId}/messages`)
    messages.value = data
    await nextTick()
    scrollBottom()
  } finally {
    loading.value = false
  }
}

async function send() {
  if (!draft.value.trim() || sending.value) return
  sending.value = true
  try {
    const { data } = await api.post<Message>(`/rooms/${roomId}/messages`, { content: draft.value.trim() })
    messages.value.push(data)
    draft.value = ''
    await nextTick()
    scrollBottom()
  } finally {
    sending.value = false
  }
}

function scrollBottom() {
  if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
}

onMounted(async () => {
  const { data: rooms } = await api.get<{ id: string; name: string }[]>('/rooms')
  const room = rooms.find((r) => r.id === roomId)
  roomName.value = room?.name ?? 'Sala'
  await load()
})
</script>
