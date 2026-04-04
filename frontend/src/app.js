/* =====================================================================
   app.js — Vue app entry point
   ===================================================================== */
const { createApp } = Vue;

store.init(); // Load from localStorage

const app = createApp({
  setup() {
    const loading = Vue.ref(true);
    Vue.onMounted(async () => {
      if (store.isAuthenticated) {
        try {
          const res = await Auth.me();
          store.login(store.token, res.data.user, res.data.profile);
        } catch {
          store.logout();
        }
      }
      loading.value = false;
    });
    return { loading };
  },
  template: `
    <div>
      <div v-if="loading" class="loading-screen">
        <div class="loading-content">
          <div class="logo-icon mb-3"><i class="bi bi-briefcase-fill"></i></div>
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
      <router-view v-else></router-view>
    </div>
  `
});

app.use(router);
app.mount('#app');
