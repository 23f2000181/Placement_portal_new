/* =====================================================================
   Login.js — Split-panel login page with Three.js left panel
   ===================================================================== */
const LoginView = {
  name: 'LoginView',
  setup() {
    const router = VueRouter.useRouter();
    const form   = Vue.reactive({ email: '', password: '', showPass: false });
    const error  = Vue.ref('');
    const loading = Vue.ref(false);

    Vue.onMounted(() => {
      initLoginCanvas();
    });

    function initLoginCanvas() {
      const canvas = document.getElementById('login-three-canvas');
      if (!canvas || typeof THREE === 'undefined') return;

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 500);
      camera.position.z = 22;

      // Icosahedron wireframe
      const geo1 = new THREE.IcosahedronGeometry(7, 1);
      const mat1 = new THREE.MeshBasicMaterial({ color: 0xE8824A, wireframe: true, transparent: true, opacity: 0.22 });
      const mesh1 = new THREE.Mesh(geo1, mat1);
      scene.add(mesh1);

      // Outer sphere
      const geo2 = new THREE.SphereGeometry(10, 16, 12);
      const mat2 = new THREE.MeshBasicMaterial({ color: 0xD4B896, wireframe: true, transparent: true, opacity: 0.08 });
      const mesh2 = new THREE.Mesh(geo2, mat2);
      scene.add(mesh2);

      // Stars
      const starGeo = new THREE.BufferGeometry();
      const starPos = new Float32Array(600);
      for (let i = 0; i < 600; i++) starPos[i] = (Math.random() - 0.5) * 120;
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
      const starMat = new THREE.PointsMaterial({ color: 0xF5F0E8, size: 0.15, transparent: true, opacity: 0.6 });
      scene.add(new THREE.Points(starGeo, starMat));

      const onResize = () => {
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
      };
      window.addEventListener('resize', onResize);

      let animId;
      const animate = () => {
        animId = requestAnimationFrame(animate);
        mesh1.rotation.x += 0.003;
        mesh1.rotation.y += 0.005;
        mesh2.rotation.x -= 0.001;
        mesh2.rotation.z += 0.002;
        renderer.render(scene, camera);
      };
      animate();

      Vue.getCurrentInstance()._cleanupLoginCanvas = () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', onResize);
        renderer.dispose();
      };
    }

    Vue.onUnmounted(() => {
      const inst = Vue.getCurrentInstance();
      if (inst?._cleanupLoginCanvas) inst._cleanupLoginCanvas();
    });

    const onSubmit = async () => {
      error.value = '';
      // Frontend validation
      if (!form.email.trim()) { error.value = 'Email address is required.'; return; }
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(form.email.trim())) { error.value = 'Please enter a valid email address.'; return; }
      if (!form.password) { error.value = 'Password is required.'; return; }
      if (form.password.length < 6) { error.value = 'Password must be at least 6 characters.'; return; }

      loading.value = true;
      try {
        const res = await Auth.login(form.email.trim(), form.password);
        store.login(res.data.access_token, res.data.user, res.data.profile);
        const role = res.data.user.role;
        if (role === 'admin')        router.push('/admin');
        else if (role === 'company') router.push('/company');
        else                         router.push('/student');
      } catch (e) {
        error.value = e.response?.data?.error || 'Login failed. Check your credentials.';
      } finally {
        loading.value = false;
      }
    };

    return { form, error, loading, onSubmit };
  },
  template: `
    <div class="auth-split">

      <!-- Left Panel (Three.js) -->
      <div class="auth-left">
        <canvas id="login-three-canvas" class="auth-left-canvas"></canvas>
        <div class="auth-left-content">
          <div class="auth-brand-logo">
            <i class="bi bi-briefcase-fill"></i>
          </div>
          <div class="auth-brand-name">Place<span>Connect</span></div>
          <p class="auth-tagline">
            The complete campus placement management system — 
            connecting students with their dream careers.
          </p>
          <div class="auth-feature-pills">
            <span class="auth-pill"><i class="bi bi-check-circle me-1"></i>Role-based Access</span>
            <span class="auth-pill"><i class="bi bi-check-circle me-1"></i>Live Dashboards</span>
            <span class="auth-pill"><i class="bi bi-check-circle me-1"></i>Drive Management</span>
            <span class="auth-pill"><i class="bi bi-check-circle me-1"></i>Smart Applications</span>
          </div>
        </div>
      </div>

      <!-- Right Panel (Form) -->
      <div class="auth-right">
        <div class="auth-right-header">
          <h2 class="auth-right-title">Welcome back 👋</h2>
          <p class="auth-right-sub">Sign in to your account to continue</p>
        </div>

        <div class="auth-form-container">
          <div v-if="error" class="alert alert-danger py-2 mb-3" style="font-size:0.875rem;">
            <i class="bi bi-exclamation-circle me-2"></i>{{ error }}
          </div>

          <form @submit.prevent="onSubmit">
            <div class="mb-3">
              <label class="form-label">Email Address</label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-envelope"></i></span>
                <input
                  v-model="form.email"
                  type="email"
                  class="form-control"
                  placeholder="you@example.com"
                  required
                  id="login-email"
                >
              </div>
            </div>

            <div class="mb-4">
              <label class="form-label">Password</label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-lock"></i></span>
                <input
                  v-model="form.password"
                  :type="form.showPass ? 'text' : 'password'"
                  class="form-control"
                  placeholder="Your password"
                  required
                  id="login-password"
                >
                <button
                  class="input-group-text"
                  type="button"
                  style="cursor:pointer;border-left:none;"
                  @click="form.showPass = !form.showPass"
                >
                  <i :class="form.showPass ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                </button>
              </div>
            </div>

            <button
              type="submit"
              class="btn btn-primary w-100 py-2"
              :disabled="loading"
              id="login-submit-btn"
              style="border-radius:50px;font-size:1rem;"
            >
              <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
              <i v-else class="bi bi-box-arrow-in-right me-2"></i>
              {{ loading ? 'Signing in...' : 'Sign In' }}
            </button>
          </form>

          <div class="text-center mt-4" style="color:var(--text-muted);font-size:0.875rem;">
            <span>Don't have an account?</span>
            <router-link to="/register" class="fw-700 ms-1" style="color:var(--orange);text-decoration:none;">
              Create one free
            </router-link>
          </div>

          <div class="text-center mt-3" style="font-size:0.78rem;color:var(--text-muted);">
            <i class="bi bi-shield-lock me-1"></i>
            Admin? Use your admin credentials above.
          </div>

          <div class="text-center mt-4">
            <router-link to="/" style="font-size:0.8rem;color:var(--text-muted);text-decoration:none;">
              <i class="bi bi-arrow-left me-1"></i>Back to Home
            </router-link>
          </div>
        </div>
      </div>

    </div>
  `
};
