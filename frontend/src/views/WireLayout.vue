<template>
  <div class="wire-app flex h-screen overflow-hidden" style="background: var(--wr-bg)">
    <!-- Sidebar -->
    <aside class="w-60 flex-shrink-0 flex flex-col border-r border-pink-900/30">
      <!-- Brand + Home -->
      <div class="px-4 py-4 border-b border-pink-900/20 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="font-mono text-base" style="color: var(--wr-primary)">«·»</span>
          <span class="font-mono text-xs" style="color: var(--wr-muted)">wire</span>
        </div>
        <a href="https://proddyt.site" class="flex items-center gap-1 font-mono text-xs border border-blue-900/40 text-blue-400 hover:bg-blue-900/20 px-2 py-1 rounded transition-colors">
          <span>&lt;·&gt;</span><span>Home</span>
        </a>
      </div>

      <!-- Rooms -->
      <div class="flex-1 overflow-y-auto">
        <div class="px-3 pt-3 pb-1 flex items-center justify-between">
          <span class="text-xs font-medium uppercase tracking-wider text-pink-400/50">Salas</span>
          <button @click="showCreateRoom = true" class="text-pink-400/50 hover:text-pink-300 text-lg leading-none" title="Nova sala">+</button>
        </div>
        <nav class="px-2 pb-2">
          <RouterLink
            v-for="room in rooms" :key="room.id"
            :to="`/rooms/${room.id}`"
            class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors cursor-pointer"
            :class="$route.params.id === room.id ? 'bg-pink-900/30 text-pink-100' : 'text-pink-200/60 hover:bg-pink-900/20 hover:text-pink-100'"
          >
            <span class="font-mono text-pink-500/70 text-xs">#</span>
            <span class="truncate flex-1">{{ room.name }}</span>
            <span v-if="socketStore.unreadByRoom[room.id]" class="unread-badge">{{ socketStore.unreadByRoom[room.id] }}</span>
            <span v-else-if="room.myRole === 'OWNER'" class="text-xs text-pink-500/40">owner</span>
          </RouterLink>
          <div v-if="!rooms.length" class="text-xs text-pink-400/30 px-2 py-2">Nenhuma sala ainda.</div>
        </nav>

        <!-- DMs -->
        <div class="px-3 pt-2 pb-1 flex items-center justify-between border-t border-pink-900/20 mt-1">
          <span class="text-xs font-medium uppercase tracking-wider text-pink-400/50">Mensagens</span>
          <button @click="showNewDm = true" class="text-pink-400/50 hover:text-pink-300 text-lg leading-none" title="Nova mensagem direta">+</button>
        </div>
        <nav class="px-2 pb-2">
          <RouterLink
            v-for="dm in dms" :key="dm.id"
            :to="`/rooms/${dm.id}`"
            class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors cursor-pointer"
            :class="$route.params.id === dm.id ? 'bg-pink-900/30 text-pink-100' : 'text-pink-200/60 hover:bg-pink-900/20 hover:text-pink-100'"
          >
            <span class="font-mono text-pink-400/50 text-xs">@</span>
            <span class="truncate flex-1">{{ dm.name }}</span>
            <span v-if="socketStore.unreadByRoom[dm.id]" class="unread-badge">{{ socketStore.unreadByRoom[dm.id] }}</span>
          </RouterLink>
          <div v-if="!dms.length" class="text-xs text-pink-400/30 px-2 py-2">Sem DMs.</div>
        </nav>

        <!-- Pessoas + Solicitações -->
        <div class="border-t border-pink-900/20 mt-1 px-2 py-2 flex flex-col gap-0.5">
          <RouterLink to="/users"
            class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors"
            :class="$route.path === '/users' ? 'bg-pink-900/30 text-pink-100' : 'text-pink-200/60 hover:bg-pink-900/20 hover:text-pink-100'"
          >
            <span class="font-mono text-pink-400/50 text-xs">@</span>
            <span class="flex-1">Pessoas</span>
          </RouterLink>
          <RouterLink to="/requests"
            class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors"
            :class="$route.path === '/requests' ? 'bg-pink-900/30 text-pink-100' : 'text-pink-200/60 hover:bg-pink-900/20 hover:text-pink-100'"
          >
            <span class="font-mono text-pink-400/50 text-xs">«»</span>
            <span class="flex-1">Solicitações</span>
            <span v-if="socketStore.pendingRequests.length" class="unread-badge">{{ socketStore.pendingRequests.length }}</span>
          </RouterLink>
        </div>
      </div>

      <!-- User footer -->
      <div class="px-3 py-3 border-t border-pink-900/20 flex items-center gap-2">
        <div class="w-7 h-7 rounded-full bg-pink-900/60 flex items-center justify-center text-xs font-mono text-pink-300 flex-shrink-0">
          {{ auth.displayName.charAt(0).toUpperCase() }}
        </div>
        <span class="text-xs truncate flex-1" style="color: var(--wr-muted)">{{ auth.displayName }}</span>
        <button @click="auth.logout()" class="text-pink-400/50 hover:text-red-400 text-xs transition-colors">Sair</button>
      </div>
    </aside>

    <!-- Content -->
    <main class="flex-1 overflow-hidden">
      <RouterView @refresh="loadRooms" />
    </main>

    <!-- Create room modal -->
    <div v-if="showCreateRoom" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="showCreateRoom = false">
      <div class="bg-[#2a1020] border border-pink-900/50 rounded-2xl p-6 w-80 shadow-2xl">
        <h2 class="text-base font-semibold text-pink-100 mb-4">Nova sala</h2>
        <input v-model="newRoomName" type="text" placeholder="Nome da sala"
          class="w-full bg-pink-950/50 border border-pink-800/40 rounded-lg px-3 py-2 text-sm text-pink-50 placeholder-pink-400/30 focus:outline-none focus:border-pink-500 mb-3"
          @keyup.enter="createRoom" autofocus
        />
        <div class="flex gap-2">
          <button @click="showCreateRoom = false" class="flex-1 text-sm py-2 rounded-lg border border-pink-900/40 text-pink-400 hover:bg-pink-900/20 transition-colors">Cancelar</button>
          <button @click="createRoom" class="flex-1 text-sm py-2 rounded-lg bg-pink-800 hover:bg-pink-700 text-pink-50 transition-colors">Criar</button>
        </div>
      </div>
    </div>

    <!-- New DM modal -->
    <div v-if="showNewDm" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="closeDmModal">
      <div class="bg-[#2a1020] border border-pink-900/50 rounded-2xl p-6 w-80 shadow-2xl">
        <h2 class="text-base font-semibold text-pink-100 mb-3">Nova mensagem direta</h2>
        <input
          v-model="dmSearch"
          @input="onDmSearch"
          type="text"
          placeholder="Buscar usuário…"
          autofocus
          class="w-full bg-pink-950/50 border border-pink-800/40 rounded-lg px-3 py-2 text-sm text-pink-50 placeholder-pink-400/30 focus:outline-none focus:border-pink-500 mb-2"
        />
        <div class="flex flex-col gap-0.5 max-h-52 overflow-y-auto">
          <template v-if="dmSearch.length >= 2">
            <button
              v-for="u in dmResults" :key="u.id"
              @click="startDm(u.id)"
              class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-pink-900/30 transition-colors text-left"
            >
              <div class="w-7 h-7 rounded-full bg-pink-900/60 flex items-center justify-center text-xs font-mono text-pink-300">
                {{ u.username.charAt(0).toUpperCase() }}
              </div>
              <span class="text-sm text-pink-100">{{ u.username }}</span>
            </button>
            <div v-if="!dmResults.length && !dmSearching" class="text-xs text-pink-400/40 text-center py-4">Nenhum usuário encontrado.</div>
            <div v-if="dmSearching" class="text-xs text-pink-400/30 text-center py-4 font-mono">buscando…</div>
          </template>
          <div v-else class="text-xs text-pink-400/30 text-center py-4 font-mono">Digite ao menos 2 letras para buscar.</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useSocketStore } from '@/stores/socket'

interface Room { id: string; name: string; isDirect: boolean; messageCount: number; myRole: string }
interface UserItem { id: string; username: string }

const auth = useAuthStore()
const socketStore = useSocketStore()
const route = useRoute()
const router = useRouter()

const rooms = ref<Room[]>([])
const dms = ref<Room[]>([])
const showCreateRoom = ref(false)
const showNewDm = ref(false)
const newRoomName = ref('')

// DM search
const dmSearch = ref('')
const dmResults = ref<UserItem[]>([])
const dmSearching = ref(false)
let dmDebounce: ReturnType<typeof setTimeout> | null = null

function closeDmModal() {
  showNewDm.value = false
  dmSearch.value = ''
  dmResults.value = []
}

function onDmSearch() {
  if (dmDebounce) clearTimeout(dmDebounce)
  if (dmSearch.value.length < 2) { dmResults.value = []; return }
  dmSearching.value = true
  dmDebounce = setTimeout(async () => {
    try {
      const { data } = await api.get<UserItem[]>(`/users?q=${encodeURIComponent(dmSearch.value)}`)
      dmResults.value = data
    } finally {
      dmSearching.value = false
    }
  }, 300)
}

async function loadRooms() {
  const [{ data: r }, { data: d }] = await Promise.all([
    api.get<Room[]>('/rooms'),
    api.get<Room[]>('/rooms/dms'),
  ])
  rooms.value = r
  dms.value = d
}

async function createRoom() {
  if (!newRoomName.value.trim()) return
  const { data } = await api.post<{ id: string }>('/rooms', { name: newRoomName.value.trim() })
  showCreateRoom.value = false
  newRoomName.value = ''
  await loadRooms()
  router.push(`/rooms/${data.id}`)
}

async function startDm(targetUserId: string) {
  const { data } = await api.post<{ id: string }>('/rooms/dms', { targetUserId })
  closeDmModal()
  await loadRooms()
  router.push(`/rooms/${data.id}`)
}

onMounted(loadRooms)
</script>

<style scoped>
.unread-badge {
  background: var(--wr-primary, #F472B6);
  color: #1A0D12;
  font-size: 11px;
  font-weight: 600;
  border-radius: 20px;
  padding: 1px 7px;
  min-width: 18px;
  text-align: center;
  flex-shrink: 0;
}
</style>
