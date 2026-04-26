import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore, buildAuthorizeUrl } from "@/stores/auth";
import Home from "@/views/Home.vue";
import AuthCallback from "@/views/AuthCallback.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/auth/callback", name: "callback", component: AuthCallback, meta: { guest: true } },
    { path: "/", name: "home", component: Home, meta: { requiresAuth: true } },
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
