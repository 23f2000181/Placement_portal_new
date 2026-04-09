/* =====================================================================
   Landing.js — Public landing page with Three.js hero animation
   Fixed: dynamic Three.js loading, canvas sizing, resize handlers, cleanup
   ===================================================================== */

const LandingView = {
  name: 'LandingView',
  setup() {
    const router = VueRouter.useRouter();
    const navScrolled = Vue.ref(false);

    const handleScroll = () => { navScrolled.value = window.scrollY > 40; };

    // ── Helper: dynamically load Three.js if not present ────────────────
    const loadThree = () => {
      return new Promise((resolve, reject) => {
        if (typeof THREE !== 'undefined') return resolve();
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = () => resolve();
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
      });
    };

    // ── Three.js Hero Background (FIXED: uses container size, not window) ──
    function initHeroCanvas() {
      const canvas = document.getElementById('hero-canvas');
      if (!canvas) return null;
      const container = canvas.parentElement;
      if (!container) return null;

      // Get actual dimensions from parent container
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) return null;

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
      camera.position.z = 28;

      // Floating particles
      const count = 220;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 90;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 55;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 45;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xE8824A, size: 0.4, transparent: true, opacity: 0.65, sizeAttenuation: true
      });
      const points = new THREE.Points(geo, mat);
      scene.add(points);

      // Sparse connecting lines
      const lineMat = new THREE.LineBasicMaterial({ color: 0xC4956A, transparent: true, opacity: 0.15 });
      for (let i = 0; i < 35; i++) {
        const lGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3((Math.random() - 0.5) * 80, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 35),
          new THREE.Vector3((Math.random() - 0.5) * 80, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 35),
        ]);
        scene.add(new THREE.Line(lGeo, lineMat));
      }

      // Mouse parallax
      let mx = 0, my = 0;
      const onMove = (e) => {
        mx = (e.clientX / window.innerWidth - 0.5) * 2;
        my = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      window.addEventListener('mousemove', onMove);

      // Resize handler: update renderer size based on container, not window
      const onResize = () => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        if (newWidth === 0 || newHeight === 0) return;
        renderer.setSize(newWidth, newHeight);
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
      };
      window.addEventListener('resize', onResize);

      let animId;
      const animate = () => {
        animId = requestAnimationFrame(animate);
        const t = Date.now() * 0.0004;
        points.rotation.y = t * 0.15 + mx * 0.08;
        points.rotation.x = t * 0.08 + my * 0.05;
        renderer.render(scene, camera);
      };
      animate();

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('resize', onResize);
        renderer.dispose();
        geo.dispose();
        mat.dispose();
        lineMat.dispose();
      };
    }

    // ── Three.js CTA Background (FIXED: uses container size) ─────────────
    function initCtaCanvas() {
      const canvas = document.getElementById('cta-canvas');
      if (!canvas) return null;
      const container = canvas.parentElement;
      if (!container) return null;

      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) return null;

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 500);
      camera.position.z = 18;

      const kGeo = new THREE.TorusKnotGeometry(6, 1.5, 120, 16);
      const kMat = new THREE.MeshBasicMaterial({ color: 0xE8824A, wireframe: true, transparent: true, opacity: 0.2 });
      const knot = new THREE.Mesh(kGeo, kMat);
      scene.add(knot);

      let animId2;
      const animate2 = () => {
        animId2 = requestAnimationFrame(animate2);
        knot.rotation.x += 0.003;
        knot.rotation.y += 0.005;
        renderer.render(scene, camera);
      };
      animate2();

      const onResize2 = () => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        if (newWidth === 0 || newHeight === 0) return;
        renderer.setSize(newWidth, newHeight);
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
      };
      window.addEventListener('resize', onResize2);

      return () => {
        cancelAnimationFrame(animId2);
        window.removeEventListener('resize', onResize2);
        renderer.dispose();
        kGeo.dispose();
        kMat.dispose();
      };
    }

    // Store cleanup fns
    let cleanupHero = null;
    let cleanupCta = null;

    Vue.onMounted(async () => {
      window.addEventListener('scroll', handleScroll);
      // Ensure Three.js is loaded before initializing canvases
      try {
        await loadThree();
        // Small delay to guarantee DOM elements have final dimensions
        setTimeout(() => {
          cleanupHero = initHeroCanvas();
          cleanupCta = initCtaCanvas();
        }, 80);
      } catch (err) {
        console.error('Three.js failed to load:', err);
      }
    });

    Vue.onUnmounted(() => {
      window.removeEventListener('scroll', handleScroll);
      if (cleanupHero) cleanupHero();
      if (cleanupCta) cleanupCta();
    });

    const goLogin = () => router.push('/login');
    const goRegister = () => router.push('/register');

    const features = [
      { icon: 'bi-mortarboard-fill', title: 'Student Dashboard', desc: 'Browse active drives, track your applications, view eligibility, and manage your complete placement profile.' },
      { icon: 'bi-building-fill', title: 'Company Portal', desc: 'Post placement drives, set eligibility criteria, review applications, and shortlist candidates effortlessly.' },
      { icon: 'bi-shield-fill-check', title: 'Admin Control', desc: 'Approve companies & drives, manage students, generate analytics reports, and ensure a fair process.' },
      { icon: 'bi-bar-chart-fill', title: 'Live Analytics', desc: 'Real-time dashboards with placement statistics, department-wise breakdowns, and exportable reports.' },
      { icon: 'bi-file-earmark-check-fill', title: 'Smart Applications', desc: 'One-click apply with resume, automatic eligibility checks, and real-time status updates.' },
      { icon: 'bi-bell-fill', title: 'Role-Based Access', desc: 'Three-tier secure access: Admin, Company, and Student — each with their own tailored experience.' },
    ];

    const roles = [
      { icon: 'bi-shield-fill-check', title: 'Admin', desc: 'Manage the entire placement process, approve drives, track placements.', color: '#1C1917', bg: 'rgba(28,25,23,0.08)', link: '/login' },
      { icon: 'bi-building-fill', title: 'Company', desc: 'Post drives, review applicants, and hire top talent from campus.', color: '#E8824A', bg: 'rgba(232,130,74,0.1)', link: '/register' },
      { icon: 'bi-mortarboard-fill', title: 'Student', desc: 'Explore opportunities, apply to drives, and track your placement journey.', color: '#0891b2', bg: 'rgba(8,145,178,0.1)', link: '/register' },
    ];

    return { navScrolled, goLogin, goRegister, features, roles };
  },

  template: `
    <div class="landing-page">

      <!-- Navbar -->
      <nav class="landing-nav" :class="{ scrolled: navScrolled }">
        <a class="landing-logo" href="#">
          <div class="landing-logo-badge"><i class="bi bi-briefcase-fill"></i></div>
          Place<span>Connect</span>
        </a>
        <div class="landing-nav-links">
          <button class="btn btn-outline-secondary btn-sm" style="border-radius:20px;padding:0.4rem 1.1rem;" @click="goLogin" id="nav-login-btn">
            Sign In
          </button>
          <button class="btn btn-primary btn-sm" style="border-radius:20px;padding:0.4rem 1.25rem;" @click="goRegister" id="nav-register-btn">
            Get Started
          </button>
        </div>
      </nav>

      <!-- Hero Section -->
      <section class="landing-hero">
        <canvas id="hero-canvas" class="hero-canvas"></canvas>
        <div class="hero-content">
          <div class="hero-tag">
            <i class="bi bi-stars"></i>
            Campus Placement, Reimagined
          </div>
          <h1 class="hero-title">
            Your Career<br>
            Starts <span class="accent">Right Here</span>
          </h1>
          <p class="hero-subtitle">
            PlaceConnect bridges students with top companies through a seamless,
            transparent, and intelligent campus recruitment platform.
          </p>
          <div class="hero-cta">
            <button class="btn btn-primary px-4 py-2" style="border-radius:50px;font-size:1rem;" @click="goRegister" id="hero-get-started-btn">
              <i class="bi bi-rocket-takeoff me-2"></i>Get Started Free
            </button>
            <button class="btn btn-outline-secondary px-4 py-2" style="border-radius:50px;font-size:1rem;" @click="goLogin" id="hero-login-btn">
              <i class="bi bi-box-arrow-in-right me-2"></i>Sign In
            </button>
          </div>
        </div>
        <div class="hero-scroll-indicator">
          <span>Scroll</span>
          <i class="bi bi-chevron-down"></i>
        </div>
      </section>

      <!-- Stats Strip -->
      <section class="stats-strip">
        <div class="container">
          <div class="row g-4">
            <div class="col-6 col-md-3">
              <div class="stat-item"><div class="num">500+</div><div class="lbl">Students Placed</div></div>
            </div>
            <div class="col-6 col-md-3">
              <div class="stat-item"><div class="num">120+</div><div class="lbl">Partner Companies</div></div>
            </div>
            <div class="col-6 col-md-3">
              <div class="stat-item"><div class="num">98%</div><div class="lbl">Satisfaction Rate</div></div>
            </div>
            <div class="col-6 col-md-3">
              <div class="stat-item"><div class="num">&#8377;12L</div><div class="lbl">Avg. Package</div></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="features-section">
        <div class="container">
          <div class="text-center mb-5">
            <div class="section-tag">What We Offer</div>
            <h2 class="section-title">Everything you need<br>in one platform</h2>
          </div>
          <div class="row g-4">
            <div class="col-md-6 col-lg-4" v-for="f in features" :key="f.title">
              <div class="feature-card">
                <div class="feature-icon"><i :class="['bi', f.icon]"></i></div>
                <div class="feature-title">{{ f.title }}</div>
                <p class="feature-desc">{{ f.desc }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Roles Section -->
      <section class="roles-section">
        <div class="container">
          <div class="text-center mb-5">
            <div class="section-tag">Choose Your Role</div>
            <h2 class="section-title">Built for everyone<br>in the placement cycle</h2>
          </div>
          <div class="row g-4 justify-content-center">
            <div class="col-md-4" v-for="r in roles" :key="r.title">
              <div class="role-card" @click="$router.push(r.link)">
                <div class="role-card-icon" :style="{ background: r.bg }">
                  <i :class="['bi', r.icon]" :style="{ color: r.color, fontSize: '2rem' }"></i>
                </div>
                <div class="role-card-title">{{ r.title }}</div>
                <p class="role-card-desc">{{ r.desc }}</p>
                <button class="btn btn-primary btn-sm" style="border-radius:20px;">
                  <i class="bi bi-arrow-right me-1"></i>{{ r.title === 'Admin' ? 'Sign In' : 'Register' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="cta-section">
        <canvas id="cta-canvas" class="cta-canvas"></canvas>
        <div class="cta-content">
          <div class="section-tag" style="background:rgba(232,130,74,0.15);border-color:rgba(232,130,74,0.3);color:var(--orange-light);">
            Ready to start?
          </div>
          <h2 class="cta-title">Launch your<br>placement journey today</h2>
          <p class="cta-subtitle">
            Join hundreds of students and companies already using PlaceConnect
            for streamlined campus recruitment.
          </p>
          <div class="d-flex gap-3 justify-content-center flex-wrap">
            <button class="btn btn-primary px-5 py-3" style="border-radius:50px;font-size:1rem;font-weight:700;" @click="goRegister" id="cta-register-btn">
              <i class="bi bi-rocket-takeoff me-2"></i>Create Free Account
            </button>
            <button class="btn" style="border-radius:50px;font-size:1rem;font-weight:700;border:2px solid rgba(255,255,255,0.25);color:rgba(255,255,255,0.85);padding:0.75rem 2rem;" @click="goLogin" id="cta-login-btn">
              <i class="bi bi-box-arrow-in-right me-2"></i>Sign In
            </button>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="landing-footer">
        <p class="mb-0">
          <span style="color:var(--orange);">PlaceConnect</span> &mdash; Campus Placement Management System &nbsp;&middot;&nbsp; Built with Vue 3 + Flask + SQLite
        </p>
      </footer>

    </div>
  `
};