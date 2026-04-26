import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore, buildAuthorizeUrl } from "@/stores/auth";
import AuthCallback from "@/views/AuthCallback.vue";
import WireLayout from "@/views/WireLayout.vue";
import RoomView from "@/views/RoomView.vue";

const EmptyRoom = { template: '<div class="flex h-screen items-center justify-center"><p class="font-mono text-pink-400/30 text-sm">Selecione uma sala ou inicie uma conversa.</p></div>' };

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/auth/callback", name: "callback", component: AuthCallback, meta: { guest: true } },
    {
      path: "/",
      component: WireLayout,
      meta: { requiresAuth: true },
      children: [
        { path: "", name: "home", component: EmptyRoom },
        { path: "rooms/:id", name: "room", component: RoomView },
      ],
    },
  ],
});

router.beforeEach((to) => {
  if (to.meta.guest) return true;
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    window.location.href = buildAuthorizeUrl();
    return false;
  }
  return true;
});

export default router;
