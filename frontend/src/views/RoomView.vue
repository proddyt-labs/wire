<template>
  <div class="flex flex-col h-screen">
    <!-- Room header -->
    <div class="border-b border-pink-900/30 px-5 py-3 flex items-center justify-between flex-shrink-0">
      <div class="flex items-center gap-2">
        <span class="font-mono text-pink-500/60 text-sm">{{ roomInfo?.isDirect ? '@' : '#' }}</span>
        <span class="text-pink-100 font-medium">{{ roomInfo?.name ?? '...' }}</span>
        <span v-if="roomInfo?.members" class="text-xs text-pink-400/40 font-mono">{{ roomInfo.members.length }} membros</span>
      </div>
      <button
        v-if="roomInfo?.myRole === 'OWNER'"
        @click="showSettings = true"
        class="text-xs px-2.5 py-1 rounded-lg border border-pink-900/40 text-pink-400/60 hover:text-pink-300 hover:border-pink-700/50 transition-colors"
      >
        ⚙ Gerenciar
      </button>
    </div>

    <!-- Messages -->
    <div ref="messagesEl" class="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-1">
      <div v-if="loading" class="text-pink-400/30 text-sm text-center mt-10">Carregando...</div>
      <div v-else-if="!messages.length" class="text-pink-400/30 text-sm text-center mt-10">
        Nenhuma mensagem ainda. Diga olá!
      </div>

      <template v-for="(msg, i) in messages" :key="msg.id">
        <!-- Date separator -->
        <div v-if="i === 0 || !sameDay(messages[i-1].createdAt, msg.createdAt)"
          class="text-center text-xs text-pink-400/30 font-mono my-3">
          {{ formatDate(msg.createdAt) }}
        </div>
        <!-- Show author if different from prev -->
        <div :class="['flex flex-col', isMe(msg) ? 'items-end' : 'items-start', !showAuthor(i) ? 'mt-0' : 'mt-3']">
          <span v-if="showAuthor(i)" class="text-xs font-mono mb-1 px-1" :class="isMe(msg) ? 'text-pink-400/60' : 'text-pink-300/70'">
            {{ msg.author }}
          </span>
          <div
            class="max-w-xs lg:max-w-md px-3 py-2 rounded-2xl text-sm leading-relaxed"
            :class="isMe(msg)
              ? 'bg-pink-800/50 text-pink-50 rounded-br-sm'
              : 'bg-pink-950/60 border border-pink-900/30 text-pink-100 rounded-bl-sm'"
          >
            {{ msg.content }}
          </div>
          <span class="text-xs text-pink-400/25 font-mono px-1 mt-0.5">{{ formatTime(msg.createdAt) }}</span>
        </div>
      </template>
      <div ref="anchor" />
    </div>

    <!-- Input -->
    <div class="border-t border-pink-900/30 px-5 py-4 flex-shrink-0">
      <form @submit.prevent="send" class="flex gap-3 items-end">
        <input
          v-model="draft" type="text"
          :placeholder="canWrite ? `Mensagem para #${roomInfo?.name ?? '...'}` : 'Somente leitura'"
          :disabled="!canWrite"
          class="flex-1 bg-pink-950/40 border border-pink-800/30 rounded-xl px-4 py-2.5 text-sm text-pink-50 placeholder-pink-400/30 focus:outline-none focus:border-pink-600/60 disabled:opacity-40 transition-colors"
        />
        <button type="submit" :disabled="!draft.trim() || !canWrite || sending"
          class="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          :class="draft.trim() && canWrite ? 'bg-pink-700 hover:bg-pink-600 text-pink-50' : 'bg-pink-950/40 text-pink-400/30 cursor-not-allowed'"
        >
          Enviar
        </button>
      </form>
    </div>
  </div>

  <!-- Room settings modal -->
  <div v-if="showSettings && roomInfo" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="showSettings = false">
    <div class="bg-[#2a1020] border border-pink-900/50 rounded-2xl w-96 shadow-2xl overflow-hidden">
      <div class="px-6 py-4 border-b border-pink-900/30 flex items-center justify-between">
        <h2 class="font-semibold text-pink-100">Gerenciar sala</h2>
        <button @click="showSettings = false" class="text-pink-400/50 hover:text-pink-300 text-lg">✕</button>
      </div>

      <!-- Rename -->
      <div class="px-6 py-4 border-b border-pink-900/20">
        <p class="text-xs uppercase tracking-wider text-pink-400/50 mb-2">Nome da sala</p>
        <div class="flex gap-2">
          <input v-model="editName" type="text"
            class="flex-1 bg-pink-950/50 border border-pink-800/40 rounded-lg px-3 py-1.5 text-sm text-pink-50 focus:outline-none focus:border-pink-500"
          />
          <button @click="renameRoom" class="text-xs px-3 py-1.5 rounded-lg bg-pink-800/50 hover:bg-pink-700/50 text-pink-200 transition-colors">Salvar</button>
        </div>
      </div>

      <!-- Members -->
      <div class="px-6 py-4 max-h-64 overflow-y-auto">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs uppercase tracking-wider text-pink-400/50">Membros</p>
          <button @click="showAddMember = !showAddMember" class="text-xs text-pink-400/60 hover:text-pink-300 transition-colors">+ Adicionar</button>
        </div>

        <!-- Add member -->
        <div v-if="showAddMember" class="mb-3 flex gap-2">
          <select v-model="memberToAdd" class="flex-1 bg-pink-950/50 border border-pink-800/40 rounded-lg px-2 py-1.5 text-xs text-pink-50 focus:outline-none">
            <option value="">Selecionar usuário...</option>
            <option v-for="u in nonMembers" :key="u.id" :value="u.id">{{ u.username }}</option>
          </select>
          <button @click="addMember" :disabled="!memberToAdd" class="text-xs px-3 py-1.5 rounded-lg bg-pink-800/50 hover:bg-pink-700/50 text-pink-200 disabled:opacity-40 transition-colors">Add</button>
        </div>

        <div v-for="m in roomInfo.members" :key="m.userId" class="flex items-center gap-3 py-2 border-b border-pink-900/20 last:border-0">
          <div class="w-6 h-6 rounded-full bg-pink-900/60 flex items-center justify-center text-xs font-mono text-pink-300 flex-shrink-0">
            {{ m.username.charAt(0).toUpperCase() }}
          </div>
          <span class="text-sm text-pink-100 flex-1">{{ m.username }}</span>
          <span class="text-xs font-mono text-pink-400/40">{{ m.role.toLowerCase() }}</span>
          <div v-if="m.userId !== auth.user?.id" class="flex items-center gap-1.5">
            <button
              @click="toggleCanWrite(m.userId, !m.canWrite)"
              :title="m.canWrite ? 'Tornar somente leitura' : 'Permitir escrever'"
              class="text-xs px-1.5 py-0.5 rounded border transition-colors"
              :class="m.canWrite ? 'border-green-800/50 text-green-400/60 hover:bg-green-900/20' : 'border-amber-800/50 text-amber-400/60 hover:bg-amber-900/20'"
            >{{ m.canWrite ? '✎' : '🔒' }}</button>
            <button @click="removeMember(m.userId)" class="text-xs text-red-400/50 hover:text-red-400 transition-colors" title="Remover">✕</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

interface Message { id: string; content: string; author: string; createdAt: string }
interface Member { userId: string; username: string; role: string; canWrite: boolean }
interface RoomInfo { id: string; name: string; isDirect: boolean; myRole: string; members: Member[] }

const emit = defineEmits(['refresh'])
const route = useRoute()
const auth = useAuthStore()
const roomId = computed(() => route.params.id as string)

const messages = ref<Message[]>([])
const roomInfo = ref<RoomInfo | null>(null)
const loading = ref(true)
const draft = ref('')
const sending = ref(false)
const messagesEl = ref<HTMLElement>()
const anchor = ref<HTMLElement>()
const showSettings = ref(false)
const editName = ref('')
const showAddMember = ref(false)
const memberToAdd = ref('')
const allUsers = ref<{ id: string; username: string }[]>([])

const canWrite = computed(() => {
  const me = roomInfo.value?.members.find(m => m.userId === auth.user?.id)
  return me?.canWrite ?? true
})

const nonMembers = computed(() => {
  const memberIds = new Set(roomInfo.value?.members.map(m => m.userId) ?? [])
  return allUsers.value.filter(u => !memberIds.has(u.id))
})

async function loadAll() {
  loading.value = true
  try {
    const [{ data: msgs }, { data: info }] = await Promise.all([
      api.get<Message[]>(`/rooms/${roomId.value}/messages`),
      api.get<RoomInfo>(`/rooms/${roomId.value}`),
    ])
    messages.value = msgs
    roomInfo.value = info
    editName.value = info.name
    await nextTick()
    anchor.value?.scrollIntoView()
  } finally {
    loading.value = false
  }
}

async function send() {
  if (!draft.value.trim() || sending.value) return
  sending.value = true
  try {
    const { data } = await api.post<Message>(`/rooms/${roomId.value}/messages`, { content: draft.value.trim() })
    messages.value.push(data)
    draft.value = ''
    await nextTick()
    anchor.value?.scrollIntoView({ behavior: 'smooth' })
  } finally {
    sending.value = false
  }
}

async function renameRoom() {
  if (!editName.value.trim()) return
  await api.patch(`/rooms/${roomId.value}`, { name: editName.value.trim() })
  if (roomInfo.value) roomInfo.value.name = editName.value.trim()
  emit('refresh')
}

async function addMember() {
  if (!memberToAdd.value) return
  await api.post(`/rooms/${roomId.value}/members`, { userId: memberToAdd.value })
  memberToAdd.value = ''
  showAddMember.value = false
  const { data } = await api.get<RoomInfo>(`/rooms/${roomId.value}`)
  roomInfo.value = data
}

async function toggleCanWrite(userId: string, canWrite: boolean) {
  await api.patch(`/rooms/${roomId.value}/members/${userId}`, { canWrite })
  const m = roomInfo.value?.members.find(m => m.userId === userId)
  if (m) m.canWrite = canWrite
}

async function removeMember(userId: string) {
  await api.delete(`/rooms/${roomId.value}/members/${userId}`)
  if (roomInfo.value) {
    roomInfo.value.members = roomInfo.value.members.filter(m => m.userId !== userId)
  }
}

function isMe(msg: Message) { return msg.author === auth.displayName }
function showAuthor(i: number) {
  if (i === 0) return true
  return messages.value[i - 1].author !== messages.value[i].author
}
function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

watch(roomId, loadAll)
onMounted(async () => {
  await loadAll()
  const { data } = await api.get<{ id: string; username: string }[]>('/users')
  allUsers.value = data
})
</script>
