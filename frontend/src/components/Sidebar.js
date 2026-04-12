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
    const showInstall = Vue.ref(false);
    let deferredPrompt = null;

    const adminLinks = [
      { to: '/admin',              icon: 'bi-speedometer2',        label: 'Dashboard' },
      { to: '/admin/companies',    icon: 'bi-building',            label: 'Companies' },
      { to: '/admin/students',     icon: 'bi-people',              label: 'Students' },
      { to: '/admin/drives',       icon: 'bi-briefcase',           label: 'Placement Drives' },
      { to: '/admin/applications', icon: 'bi-file-earmark-text',   label: 'Applications' },
      { to: '/admin/reports',      icon: 'bi-bar-chart-line',      label: 'Reports' }
    ];
    const companyLinks = [
      { to: '/company',         icon: 'bi-speedometer2',      label: 'Dashboard' },
      { to: '/company/drives',  icon: 'bi-briefcase-fill',    label: 'My Drives' },
      { to: '/company/profile', icon: 'bi-building-gear',     label: 'Company Profile' }
    ];
    const studentLinks = [
      { to: '/student',              icon: 'bi-speedometer2',          label: 'Dashboard' },
      { to: '/student/drives',       icon: 'bi-briefcase',             label: 'Browse Drives' },
      { to: '/student/applications', icon: 'bi-file-earmark-check',    label: 'My Applications' },
      { to: '/student/history',      icon: 'bi-trophy',                label: 'Placement History' },
      { to: '/student/profile',      icon: 'bi-person-circle',         label: 'Profile' }
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

    const getRoleTag = () => {
      if (store.isAdmin)   return 'Admin';
      if (store.isCompany) return 'Company';
      return 'Student';
    };

    const getInitials = () => {
      const label = getRoleLabel();
      return label.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    };

    // PWA install prompt
    Vue.onMounted(() => {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstall.value = true;
      });
      window.addEventListener('appinstalled', () => {
        showInstall.value = false;
        deferredPrompt = null;
      });
    });

    const installApp = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') showInstall.value = false;
      deferredPrompt = null;
    };

    return { links, isActive, logout, store, getRoleIcon, getRoleLabel, getRoleTag, getInitials, showInstall, installApp };
  },
  template: `
    <nav class="sidebar" :class="{ open }">

      <!-- Header -->
      <div class="sidebar-header">
        <router-link to="/" class="sidebar-logo" @click="$emit('close')">
          <div class="logo-badge">
            <i class="bi bi-briefcase-fill"></i>
          </div>
          <div class="logo-text">Place<span>Connect</span></div>
        </router-link>

        <div class="sidebar-user-info mt-3">
          <div class="sidebar-avatar">{{ getInitials() }}</div>
          <div style="overflow:hidden;">
            <div class="sidebar-user-name">{{ getRoleLabel() }}</div>
            <div class="sidebar-user-role">{{ getRoleTag() }}</div>
          </div>
        </div>
      </div>

      <!-- Nav Links -->
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

      <!-- Footer -->
      <div class="sidebar-footer">
        <div class="sidebar-email">{{ store.user?.email }}</div>
        <!-- PWA Install -->
        <button v-if="showInstall" @click="installApp" class="btn btn-sm w-100 mb-2"
          style="background:rgba(79,70,229,0.12);color:#818cf8;border:1px solid rgba(79,70,229,0.3);border-radius:8px;font-family:'Outfit',sans-serif;font-weight:600;">
          <i class="bi bi-phone-fill me-2"></i>Add to Desktop
        </button>
        <button class="btn btn-sm w-100" @click="logout" style="background:rgba(220,38,38,0.1);color:#f87171;border:1px solid rgba(220,38,38,0.25);border-radius:8px;font-family:'Outfit',sans-serif;font-weight:600;">
          <i class="bi bi-box-arrow-right me-2"></i>Logout
        </button>
      </div>

    </nav>
  `
};
