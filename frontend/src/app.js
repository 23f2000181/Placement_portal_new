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
          <div style="width:64px;height:64px;background:linear-gradient(135deg,#E8824A,#D4692E);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;box-shadow:0 8px 24px rgba(232,130,74,0.4);">
            <i class="bi bi-briefcase-fill" style="font-size:1.75rem;color:white;"></i>
          </div>
          <div style="font-family:'Outfit',sans-serif;font-size:1.4rem;font-weight:800;color:white;margin-bottom:1.5rem;">Place<span style="color:#F5A97B;">Connect</span></div>
          <div class="spinner-border" role="status" style="color:#E8824A;width:1.75rem;height:1.75rem;">
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
