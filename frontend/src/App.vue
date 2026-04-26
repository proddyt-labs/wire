<script setup lang="ts">
import { onMounted } from "vue";
import { RouterView } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();

onMounted(() => {
  if (localStorage.getItem("auth_token")) {
    void auth.fetchMe();
  }
});
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <nav v-if="auth.isLoggedIn" class="border-b border-pink-900/40 px-6 py-4">
      <div class="max-w-5xl mx-auto flex items-center justify-between">
        <div class="text-lg font-mono">
          <span class="text-pink-400">«·»</span>
          <span class="ml-2 text-pink-50">wire</span>
        </div>
        <div class="flex items-center gap-3 text-sm text-pink-200/70">
          <span>{{ auth.displayName }}</span>
          <button @click="auth.logout()" class="text-red-400 hover:text-red-300">Sair</button>
        </div>
      </div>
    </nav>
    <main class="flex-1">
      <RouterView />
    </main>
  </div>
</template>
