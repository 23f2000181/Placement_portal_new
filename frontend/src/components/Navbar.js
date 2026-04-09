/* =====================================================================
   Navbar.js — Top navigation bar + toast notification
   ===================================================================== */
const NavbarComponent = {
  name: 'AppNavbar',
  props: { title: { type: String, default: '' } },
  emits: ['toggleSidebar'],
  setup(props, { emit }) {
    const route = VueRouter.useRoute();

    const pageTitle = Vue.computed(() => {
      const map = {
        '/admin': 'Dashboard', '/admin/companies': 'Companies',
        '/admin/students': 'Students', '/admin/drives': 'Placement Drives',
        '/admin/applications': 'All Applications', '/admin/reports': 'Reports',
        '/company': 'Dashboard', '/company/drives': 'My Drives',
        '/company/profile': 'Company Profile',
        '/student': 'Dashboard', '/student/drives': 'Browse Drives',
        '/student/applications': 'My Applications',
        '/student/history': 'Placement History', '/student/profile': 'My Profile'
      };
      return map[route.path] || props.title || 'PlaceConnect';
    });

    const toastStyle = Vue.computed(() => {
      const base = 'bottom:1.5rem;right:1.5rem;z-index:9999;min-width:280px;color:white;border:none;box-shadow:0 8px 24px rgba(0,0,0,0.2);backdrop-filter:blur(8px);font-family:Outfit,sans-serif;font-weight:600;border-radius:12px;';
      if (toast.type === 'success') return base + 'background:rgba(22,163,74,0.95);';
      if (toast.type === 'danger')  return base + 'background:rgba(220,38,38,0.95);';
      return base + 'background:rgba(232,130,74,0.95);';
    });

    const toastIcon = Vue.computed(() => {
      if (toast.type === 'success') return 'bi-check-circle-fill';
      if (toast.type === 'danger')  return 'bi-x-circle-fill';
      return 'bi-info-circle-fill';
    });

    const getRoleIcon = () => {
      if (store.isAdmin)   return 'bi-shield-fill-check';
      if (store.isCompany) return 'bi-building-fill';
      return 'bi-mortarboard-fill';
    };

    return { toast, pageTitle, store, getRoleIcon, toastStyle, toastIcon };
  },
  template: `
    <header class="top-navbar">
      <div class="d-flex align-items-center gap-3">
        <button
          class="btn btn-sm d-md-none"
          style="background:var(--surface-raised);border:1px solid var(--surface-border);color:var(--text-sub);border-radius:8px;padding:0.35rem 0.6rem;"
          @click="$emit('toggleSidebar')"
        >
          <i class="bi bi-list" style="font-size:1.1rem;"></i>
        </button>
        <h5 class="navbar-brand-text mb-0">{{ pageTitle }}</h5>
      </div>

      <div class="d-flex align-items-center gap-2">
        <span class="navbar-role-badge">
          <i :class="['bi', getRoleIcon(), 'me-1']"></i>
          {{ store.user?.role }}
        </span>
      </div>
    </header>

    <!-- Global Toast -->
    <teleport to="body">
      <transition name="fade">
        <div
          v-if="toast.show"
          class="position-fixed alert"
          :style="toastStyle"
        >
          <i :class="['bi me-2', toastIcon]"></i>
          {{ toast.msg }}
        </div>
      </transition>
    </teleport>
  `
};
