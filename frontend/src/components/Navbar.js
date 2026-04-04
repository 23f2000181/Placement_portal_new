/* =====================================================================
   Navbar.js — Top navigation bar + toast
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
      return map[route.path] || props.title || 'Placement Portal';
    });

    return { toast, pageTitle, store };
  },
  template: `
    <header class="top-navbar">
      <div class="d-flex align-items-center gap-3">
        <button class="btn btn-sm btn-outline-light d-md-none" @click="$emit('toggleSidebar')">
          <i class="bi bi-list"></i>
        </button>
        <h5 class="navbar-brand-text mb-0">{{ pageTitle }}</h5>
      </div>
      <div class="d-flex align-items-center gap-3">
        <span class="badge bg-primary text-uppercase" style="font-size:0.7rem;">
          <i :class="['bi', store.isAdmin ? 'bi-shield-check' : store.isCompany ? 'bi-building' : 'bi-mortarboard']" class="me-1"></i>
          {{ store.user?.role }}
        </span>
      </div>
    </header>

    <!-- Global Toast -->
    <teleport to="body">
      <transition name="fade">
        <div v-if="toast.show"
          :class="['alert', 'alert-' + toast.type, 'position-fixed']"
          style="bottom:1.5rem;right:1.5rem;z-index:9999;min-width:280px;box-shadow:0 8px 24px rgba(0,0,0,0.4);">
          <i :class="['bi me-2', toast.type==='success' ? 'bi-check-circle' : toast.type==='danger' ? 'bi-x-circle' : 'bi-info-circle']"></i>
          {{ toast.msg }}
        </div>
      </transition>
    </teleport>
  `
};
