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
  <RouterView />
</template>
