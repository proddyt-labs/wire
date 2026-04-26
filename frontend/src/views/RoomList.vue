<template>
  <div class="max-w-2xl mx-auto px-6 py-10">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-semibold text-pink-50">Salas</h1>
      <button @click="showCreate = true" class="text-sm px-3 py-1.5 rounded-lg border border-pink-800/60 text-pink-300 hover:bg-pink-900/30 transition-colors">
        + Nova sala
      </button>
    </div>

    <div v-if="loading" class="text-pink-300/50 text-sm">Carregando...</div>
    <div v-else-if="!rooms.length" class="text-pink-300/50 text-sm">Nenhuma sala. Crie uma para começar.</div>

    <div v-else class="flex flex-col gap-2">
      <RouterLink
        v-for="room in rooms" :key="room.id"
        :to="`/rooms/${room.id}`"
        class="block px-4 py-3 rounded-xl border border-pink-900/30 bg-pink-950/20 hover:bg-pink-900/30 transition-colors"
      >
        <div class="flex items-center justify-between">
          <span class="font-medium text-pink-100">{{ room.name }}</span>
          <span class="text-xs text-pink-400/60">{{ room.messageCount }} msgs</span>
        </div>
      </RouterLink>
    </div>

    <!-- Create modal -->
    <div v-if="showCreate" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="showCreate = false">
      <div class="bg-[#2a1020] border border-pink-900/40 rounded-2xl p-6 w-80">
        <h2 class="text-base font-semibold text-pink-100 mb-4">Nova sala</h2>
        <input
          v-model="newName" type="text" placeholder="Nome da sala"
          class="w-full bg-pink-950/40 border border-pink-800/40 rounded-lg px-3 py-2 text-sm text-pink-50 placeholder-pink-400/40 focus:outline-none focus:border-pink-500 mb-3"
          @keyup.enter="create"
        />
        <div v-if="createError" class="text-red-400 text-xs mb-2">{{ createError }}</div>
        <div class="flex gap-2">
          <button @click="showCreate = false" class="flex-1 text-sm py-1.5 rounded-lg border border-pink-900/40 text-pink-400 hover:bg-pink-900/20 transition-colors">Cancelar</button>
          <button @click="create" :disabled="creating" class="flex-1 text-sm py-1.5 rounded-lg bg-pink-700 hover:bg-pink-600 text-white transition-colors disabled:opacity-50">
            {{ creating ? '...' : 'Criar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { api } from '@/lib/api'

interface Room { id: string; name: string; messageCount: number }

const rooms = ref<Room[]>([])
const loading = ref(true)
const showCreate = ref(false)
const newName = ref('')
const creating = ref(false)
const createError = ref('')
const router = useRouter()

async function load() {
  loading.value = true
  try {
    const { data } = await api.get<Room[]>('/rooms')
    rooms.value = data
  } finally {
    loading.value = false
  }
}

async function create() {
  if (!newName.value.trim()) return
  creating.value = true
  createError.value = ''
  try {
    const { data } = await api.post<{ id: string }>('/rooms', { name: newName.value.trim() })
    showCreate.value = false
    newName.value = ''
    router.push(`/rooms/${data.id}`)
  } catch (e: any) {
    createError.value = e.response?.data?.error ?? 'Erro ao criar sala'
  } finally {
    creating.value = false
  }
}

onMounted(load)
</script>
