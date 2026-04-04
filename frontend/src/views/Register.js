/* =====================================================================
   Register.js — Multi-step registration for Students and Companies
   ===================================================================== */
const RegisterView = {
  name: 'RegisterView',
  setup() {
    const router = VueRouter.useRouter();
    const role   = Vue.ref('student');
    const error  = Vue.ref('');
    const loading = Vue.ref(false);

    const studentForm = Vue.reactive({
      email: '', password: '', confirmPassword: '',
      full_name: '', usn: '', branch: '', cgpa: '', year: 2,
      phone: '', linkedin: '', skills: ''
    });
    const companyForm = Vue.reactive({
      email: '', password: '', confirmPassword: '',
      company_name: '', hr_contact: '', hr_phone: '',
      website: '', industry: '', headquarters: '', description: ''
    });

    const branches = ['CS', 'IS', 'EC', 'EE', 'ME', 'CE', 'AI/ML', 'Data Science', 'Other'];
    const industries = ['Information Technology', 'Finance', 'Manufacturing', 'Healthcare', 'E-Commerce', 'Consulting', 'Other'];

    const onSubmit = async () => {
      error.value = '';
      const form = role.value === 'student' ? studentForm : companyForm;

      if (form.password !== form.confirmPassword) {
        error.value = 'Passwords do not match'; return;
      }
      if (form.password.length < 6) {
        error.value = 'Password must be at least 6 characters'; return;
      }

      loading.value = true;
      try {
        const payload = { ...form, role: role.value };
        delete payload.confirmPassword;
        if (role.value === 'student') {
          payload.cgpa = parseFloat(form.cgpa);
          payload.year = parseInt(form.year);
        }
        const res = await Auth.register(payload);
        store.login(res.data.access_token, res.data.user, res.data.profile || null);
        if (role.value === 'company') router.push('/company');
        else router.push('/student');
      } catch (e) {
        error.value = e.response?.data?.error || 'Registration failed. Please try again.';
      } finally {
        loading.value = false;
      }
    };

    return { role, error, loading, studentForm, companyForm, onSubmit, branches, industries };
  },
  template: `
    <div class="auth-wrapper" style="align-items:flex-start;padding:2rem 1rem;">
      <div class="auth-card" style="max-width:560px;">
        <div class="auth-logo">
          <div class="logo-icon"><i class="bi bi-briefcase-fill"></i></div>
          <h1>Create Account</h1>
          <p>Join the Placement Portal</p>
        </div>

        <!-- Role Selector -->
        <div class="role-selector mb-4">
          <div :class="['role-btn', role==='student' ? 'active' : '']" @click="role='student'" id="reg-role-student">
            <i class="bi bi-mortarboard-fill"></i>
            <span>Student</span>
          </div>
          <div :class="['role-btn', role==='company' ? 'active' : '']" @click="role='company'" id="reg-role-company">
            <i class="bi bi-building-fill"></i>
            <span>Company</span>
          </div>
        </div>

        <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>

        <form @submit.prevent="onSubmit" novalidate>
          <!-- Common fields -->
          <div class="row g-3 mb-3">
            <div class="col-12">
              <label class="form-label">Email</label>
              <input v-model="role==='student' ? studentForm.email : companyForm.email" type="email" class="form-control" placeholder="Email address" required>
            </div>
            <div class="col-sm-6">
              <label class="form-label">Password</label>
              <input v-model="role==='student' ? studentForm.password : companyForm.password" type="password" class="form-control" placeholder="Min. 6 chars" required>
            </div>
            <div class="col-sm-6">
              <label class="form-label">Confirm Password</label>
              <input v-model="role==='student' ? studentForm.confirmPassword : companyForm.confirmPassword" type="password" class="form-control" placeholder="Repeat password" required>
            </div>
          </div>

          <!-- Student fields -->
          <template v-if="role==='student'">
            <div class="row g-3 mb-3">
              <div class="col-sm-6">
                <label class="form-label">Full Name</label>
                <input v-model="studentForm.full_name" class="form-control" placeholder="Your full name" required>
              </div>
              <div class="col-sm-6">
                <label class="form-label">USN / Roll Number</label>
                <input v-model="studentForm.usn" class="form-control" placeholder="1SI21CS001" required>
              </div>
              <div class="col-sm-6">
                <label class="form-label">Branch</label>
                <select v-model="studentForm.branch" class="form-select" required>
                  <option value="">Select branch</option>
                  <option v-for="b in branches" :key="b">{{ b }}</option>
                </select>
              </div>
              <div class="col-sm-3">
                <label class="form-label">CGPA</label>
                <input v-model="studentForm.cgpa" type="number" step="0.01" min="0" max="10" class="form-control" placeholder="8.5" required>
              </div>
              <div class="col-sm-3">
                <label class="form-label">Year</label>
                <select v-model="studentForm.year" class="form-select" required>
                  <option :value="1">1st</option>
                  <option :value="2">2nd</option>
                  <option :value="3">3rd</option>
                  <option :value="4">4th</option>
                </select>
              </div>
              <div class="col-sm-6">
                <label class="form-label">Phone (optional)</label>
                <input v-model="studentForm.phone" class="form-control" placeholder="+91 9900000000">
              </div>
              <div class="col-sm-6">
                <label class="form-label">LinkedIn (optional)</label>
                <input v-model="studentForm.linkedin" class="form-control" placeholder="linkedin.com/in/...">
              </div>
              <div class="col-12">
                <label class="form-label">Skills (comma-separated, optional)</label>
                <input v-model="studentForm.skills" class="form-control" placeholder="Python, Java, React...">
              </div>
            </div>
          </template>

          <!-- Company fields -->
          <template v-if="role==='company'">
            <div class="row g-3 mb-3">
              <div class="col-12">
                <label class="form-label">Company Name</label>
                <input v-model="companyForm.company_name" class="form-control" placeholder="Acme Corp Ltd." required>
              </div>
              <div class="col-sm-6">
                <label class="form-label">HR Contact Name</label>
                <input v-model="companyForm.hr_contact" class="form-control" placeholder="HR Manager name">
              </div>
              <div class="col-sm-6">
                <label class="form-label">HR Phone</label>
                <input v-model="companyForm.hr_phone" class="form-control" placeholder="+91 9900000000">
              </div>
              <div class="col-sm-6">
                <label class="form-label">Industry</label>
                <select v-model="companyForm.industry" class="form-select">
                  <option value="">Select industry</option>
                  <option v-for="i in industries" :key="i">{{ i }}</option>
                </select>
              </div>
              <div class="col-sm-6">
                <label class="form-label">Headquarters</label>
                <input v-model="companyForm.headquarters" class="form-control" placeholder="Bangalore, India">
              </div>
              <div class="col-12">
                <label class="form-label">Website</label>
                <input v-model="companyForm.website" class="form-control" placeholder="https://company.com">
              </div>
              <div class="col-12">
                <label class="form-label">About Company</label>
                <textarea v-model="companyForm.description" class="form-control" rows="3" placeholder="Brief company description..."></textarea>
              </div>
            </div>
          </template>

          <button type="submit" class="btn btn-primary w-100 py-2" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            {{ loading ? 'Creating account...' : 'Create Account' }}
          </button>
        </form>

        <hr class="my-3" style="border-color:var(--dark-border);">
        <p class="text-center mb-0" style="color:var(--text-muted);font-size:0.9rem;">
          Already registered?&nbsp;
          <router-link to="/login" class="text-primary-light fw-600">Sign in</router-link>
        </p>
      </div>
    </div>
  `
};
