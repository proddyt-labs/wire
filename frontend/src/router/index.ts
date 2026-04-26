import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore, buildAuthorizeUrl } from "@/stores/auth";
import AuthCallback from "@/views/AuthCallback.vue";
import RoomList from "@/views/RoomList.vue";
import RoomView from "@/views/RoomView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/auth/callback", name: "callback", component: AuthCallback, meta: { guest: true } },
    { path: "/", name: "rooms", component: RoomList, meta: { requiresAuth: true } },
    { path: "/rooms/:id", name: "room", component: RoomView, meta: { requiresAuth: true } },
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
