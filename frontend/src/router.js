/* =====================================================================
   router.js — Vue Router 4 configuration (hash history for stability)
   ===================================================================== */
const { createRouter, createWebHashHistory } = VueRouter;

// Layout wrapper for authenticated pages (sidebar + navbar)
const AppLayout = {
  name: 'AppLayout',
  components: { AppSidebar: SidebarComponent, AppNavbar: NavbarComponent },
  setup() {
    const sidebarOpen = Vue.ref(false);
    return { sidebarOpen };
  },
  template: `
    <div class="app-layout">
      <AppSidebar :open="sidebarOpen" @close="sidebarOpen=false" />
      <div class="content-wrapper">
        <AppNavbar @toggleSidebar="sidebarOpen=!sidebarOpen" />
        <div class="page-content">
          <router-view />
        </div>
      </div>
      <!-- Sidebar overlay on mobile -->
      <div v-if="sidebarOpen" class="position-fixed top-0 start-0 w-100 h-100 d-md-none"
           style="z-index:150;background:rgba(28,25,23,0.55);" @click="sidebarOpen=false"></div>
    </div>
  `
};

const routes = [
  // Public landing page
  { path: '/', component: LandingView, meta: { public: true, allowAuthenticated: true } },

  { path: '/login',    component: LoginView,    meta: { public: true } },
  { path: '/register', component: RegisterView, meta: { public: true } },

  // Admin routes
  {
    path: '/admin', component: AppLayout,
    meta: { role: 'admin' },
    children: [
      { path: '',             component: AdminDashboard },
      { path: 'companies',    component: AdminCompanies },
      { path: 'students',     component: AdminStudents },
      { path: 'drives',       component: AdminDrives },
      { path: 'applications', component: AdminApplications },
      { path: 'reports',      component: AdminReports }
    ]
  },

  // Company routes
  {
    path: '/company', component: AppLayout,
    meta: { role: 'company' },
    children: [
      { path: '',                       component: CompanyDashboard },
      { path: 'drives',                 component: CompanyDrives },
      { path: 'profile',                component: CompanyProfileView },
      { path: 'applications/:id',       component: CompanyApplications, props: true }
    ]
  },

  // Student routes
  {
    path: '/student', component: AppLayout,
    meta: { role: 'student' },
    children: [
      { path: '',            component: StudentDashboard },
      { path: 'drives',      component: StudentDashboard },
      { path: 'drives/:id',  component: StudentDriveDetail, props: true },
      { path: 'applications',component: StudentApplications },
      { path: 'history',     component: StudentHistory },
      { path: 'profile',     component: StudentProfile }
    ]
  },

  // Catch-all → landing
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
});

// Navigation guard
router.beforeEach((to, from, next) => {
  store.init(); // Ensure store is initialized

  if (to.meta.public) {
    // Landing page: always allow. Login/register: redirect to dashboard if already logged in.
    if (store.isAuthenticated && !to.meta.allowAuthenticated) {
      if (store.isAdmin)   return next('/admin');
      if (store.isCompany) return next('/company');
      return next('/student');
    }
    return next();
  }

  if (!store.isAuthenticated) {
    return next('/login');
  }

  if (to.meta.role && store.user?.role !== to.meta.role) {
    return next('/');
  }

  next();
});
