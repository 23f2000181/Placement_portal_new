/* =====================================================================
   store.js — Reactive auth store (no Vuex, uses Vue 3 reactivity)
   ===================================================================== */
const store = Vue.reactive({
  user: null,
  profile: null,
  token: null,

  get isAuthenticated() { return !!this.token; },
  get isAdmin()   { return this.user?.role === 'admin'; },
  get isCompany() { return this.user?.role === 'company'; },
  get isStudent() { return this.user?.role === 'student'; },

  init() {
    const token = localStorage.getItem('ppa_token');
    const user  = localStorage.getItem('ppa_user');
    const profile = localStorage.getItem('ppa_profile');
    if (token && user) {
      this.token = token;
      try { this.user = JSON.parse(user); } catch (_) {}
      try { this.profile = profile ? JSON.parse(profile) : null; } catch (_) {}
    }
  },

  login(token, user, profile = null) {
    this.token   = token;
    this.user    = user;
    this.profile = profile;
    localStorage.setItem('ppa_token', token);
    localStorage.setItem('ppa_user', JSON.stringify(user));
    if (profile) localStorage.setItem('ppa_profile', JSON.stringify(profile));
  },

  logout() {
    this.token   = null;
    this.user    = null;
    this.profile = null;
    localStorage.removeItem('ppa_token');
    localStorage.removeItem('ppa_user');
    localStorage.removeItem('ppa_profile');
  },

  updateProfile(profile) {
    this.profile = profile;
    localStorage.setItem('ppa_profile', JSON.stringify(profile));
  }
});

// Helper: format date
const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Helper: format datetime
const formatDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Helper: days from now
const daysFromNow = (iso) => {
  if (!iso) return null;
  const diff = new Date(iso) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// Global toast notification
const toast = Vue.reactive({ show: false, msg: '', type: 'success' });
const showToast = (msg, type = 'success', duration = 3500) => {
  toast.show = true;
  toast.msg = msg;
  toast.type = type;
  setTimeout(() => { toast.show = false; }, duration);
};
