/* =====================================================================
   Login.js
   ===================================================================== */
const LoginView = {
  name: 'LoginView',
  setup() {
    const router = VueRouter.useRouter();
    const form   = Vue.reactive({ email: '', password: '' });
    const error  = Vue.ref('');
    const loading = Vue.ref(false);

    const onSubmit = async () => {
      error.value = '';
      loading.value = true;
      try {
        const res = await Auth.login(form.email, form.password);
        store.login(res.data.access_token, res.data.user, res.data.profile);
        const role = res.data.user.role;
        if (role === 'admin')   router.push('/admin');
        else if (role === 'company') router.push('/company');
        else router.push('/student');
      } catch (e) {
        error.value = e.response?.data?.error || 'Login failed. Check credentials.';
      } finally {
        loading.value = false;
      }
    };

    return { form, error, loading, onSubmit };
  },
  template: `
    <div class="auth-wrapper">
      <div class="auth-card">
        <div class="auth-logo">
          <div class="logo-icon"><i class="bi bi-briefcase-fill"></i></div>
          <h1>Placement Portal</h1>
          <p>Campus Recruitment Management System</p>
        </div>

        <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>

        <form @submit.prevent="onSubmit" novalidate>
          <div class="mb-3">
            <label class="form-label">Email Address</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-envelope"></i></span>
              <input v-model="form.email" type="email" class="form-control" placeholder="Enter your email" required>
            </div>
          </div>
          <div class="mb-4">
            <label class="form-label">Password</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-lock"></i></span>
              <input v-model="form.password" type="password" class="form-control" placeholder="Enter your password" required>
            </div>
          </div>
          <button type="submit" class="btn btn-primary w-100 py-2" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <hr class="my-3" style="border-color:var(--dark-border);">
        <p class="text-center mb-0" style="color:var(--text-muted);font-size:0.9rem;">
          New here?&nbsp;
          <router-link to="/register" class="text-primary-light fw-600">Create an account</router-link>
        </p>
        <p class="text-center mt-2" style="color:var(--text-muted);font-size:0.8rem;">
          <i class="bi bi-shield-lock me-1"></i> Admin? Use your admin credentials above.
        </p>
      </div>
    </div>
  `
};
