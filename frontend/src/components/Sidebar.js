/* =====================================================================
   Sidebar.js — Left sidebar component
   ===================================================================== */
const SidebarComponent = {
  name: 'AppSidebar',
  props: { open: Boolean },
  emits: ['close'],
  setup() {
    const router = VueRouter.useRouter();
    const route  = VueRouter.useRoute();

    const adminLinks = [
      { to: '/admin', icon: 'bi-speedometer2', label: 'Dashboard' },
      { to: '/admin/companies', icon: 'bi-building', label: 'Companies' },
      { to: '/admin/students', icon: 'bi-people', label: 'Students' },
      { to: '/admin/drives', icon: 'bi-briefcase', label: 'Placement Drives' },
      { to: '/admin/applications', icon: 'bi-file-earmark-text', label: 'Applications' },
      { to: '/admin/reports', icon: 'bi-bar-chart-line', label: 'Reports' }
    ];
    const companyLinks = [
      { to: '/company', icon: 'bi-speedometer2', label: 'Dashboard' },
      { to: '/company/drives', icon: 'bi-briefcase-fill', label: 'My Drives' },
      { to: '/company/profile', icon: 'bi-building-gear', label: 'Company Profile' }
    ];
    const studentLinks = [
      { to: '/student', icon: 'bi-speedometer2', label: 'Dashboard' },
      { to: '/student/drives', icon: 'bi-briefcase', label: 'Browse Drives' },
      { to: '/student/applications', icon: 'bi-file-earmark-check', label: 'My Applications' },
      { to: '/student/history', icon: 'bi-trophy', label: 'Placement History' },
      { to: '/student/profile', icon: 'bi-person-circle', label: 'Profile' }
    ];

    const links = Vue.computed(() => {
      if (store.isAdmin)   return adminLinks;
      if (store.isCompany) return companyLinks;
      if (store.isStudent) return studentLinks;
      return [];
    });

    const isActive = (to) => {
      if (to === '/admin' || to === '/company' || to === '/student') {
        return route.path === to;
      }
      return route.path.startsWith(to);
    };

    const logout = () => {
      store.logout();
      router.push('/login');
    };

    const getRoleIcon = () => {
      if (store.isAdmin)   return 'bi-shield-fill-check';
      if (store.isCompany) return 'bi-building-fill';
      return 'bi-mortarboard-fill';
    };

    const getRoleLabel = () => {
      if (store.isAdmin)   return 'Administrator';
      if (store.isCompany) return store.profile?.company_name || 'Company';
      return store.profile?.full_name || 'Student';
    };

    return { links, isActive, logout, store, getRoleIcon, getRoleLabel };
  },
  template: `
    <nav class="sidebar" :class="{ open }">
      <div class="sidebar-header">
        <router-link to="/" class="sidebar-logo d-flex align-items-center gap-2">
          <i class="bi bi-briefcase-fill"></i>
          Placement<span>Portal</span>
        </router-link>
        <div class="mt-2 d-flex align-items-center gap-2">
          <i :class="['bi', getRoleIcon()]" style="font-size:1rem;color:rgba(255,255,255,0.7)"></i>
          <span style="font-size:0.8rem;color:rgba(255,255,255,0.8);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ getRoleLabel() }}</span>
        </div>
      </div>

      <div class="sidebar-nav">
        <div class="nav-section-title">Navigation</div>
        <router-link
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="nav-link"
          :class="{ active: isActive(link.to) }"
          @click="$emit('close')"
        >
          <i :class="['bi', link.icon]"></i>
          {{ link.label }}
        </router-link>
      </div>

      <div class="sidebar-footer">
        <div class="mb-2" style="font-size:0.8rem;color:var(--text-muted);">
          {{ store.user?.email }}
        </div>
        <button class="btn btn-sm btn-outline-danger w-100" @click="logout">
          <i class="bi bi-box-arrow-right me-1"></i> Logout
        </button>
      </div>
    </nav>
  `
};
