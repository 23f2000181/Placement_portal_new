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

    // Computed proxy so v-model always points to the active role's form
    const currentForm = Vue.computed(() => role.value === 'student' ? studentForm : companyForm);

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const validateForm = () => {
      const form = currentForm.value;
      if (!form.email.trim())              return 'Email address is required.';
      if (!emailRe.test(form.email.trim())) return 'Please enter a valid email address.';
      if (!form.password)                  return 'Password is required.';
      if (form.password.length < 6)        return 'Password must be at least 6 characters.';
      if (form.password !== form.confirmPassword) return 'Passwords do not match.';

      if (role.value === 'student') {
        if (!studentForm.full_name.trim())  return 'Full name is required.';
        if (!studentForm.usn.trim())        return 'USN / Roll Number is required.';
        if (!/^[A-Za-z0-9]+$/.test(studentForm.usn.trim())) return 'USN should contain only letters and numbers.';
        if (!studentForm.branch)            return 'Please select your branch.';
        const cgpa = parseFloat(studentForm.cgpa);
        if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) return 'CGPA must be a number between 0.0 and 10.0.';
        if (studentForm.phone && !/^\+?[\d\s\-]{7,15}$/.test(studentForm.phone))
          return 'Please enter a valid phone number.';
      } else {
        if (!companyForm.company_name.trim()) return 'Company name is required.';
        if (companyForm.website && !/^https?:\/\//i.test(companyForm.website))
          return 'Website must start with http:// or https://';
      }
      return null;
    };

    const onSubmit = async () => {
      error.value = '';
      const validationError = validateForm();
      if (validationError) { error.value = validationError; return; }

      loading.value = true;
      try {
        const payload = { ...currentForm.value, role: role.value };
        delete payload.confirmPassword;
        if (role.value === 'student') {
          payload.cgpa = parseFloat(studentForm.cgpa);
          payload.year = parseInt(studentForm.year);
          payload.email = studentForm.email.trim().toLowerCase();
          payload.usn = studentForm.usn.trim().toUpperCase();
        } else {
          payload.email = companyForm.email.trim().toLowerCase();
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

    return { role, error, loading, currentForm, studentForm, companyForm, onSubmit, branches, industries };
  },
  template: `
    <div style="min-height:100vh;background:var(--cream);display:flex;align-items:flex-start;justify-content:center;padding:2rem 1rem;">
      <div class="auth-card" style="max-width:580px;">
        <div class="auth-logo">
          <div style="width:52px;height:52px;background:linear-gradient(135deg,var(--orange),var(--orange-dark));border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 0.75rem;box-shadow:0 4px 16px rgba(232,130,74,0.35);">
            <i class="bi bi-briefcase-fill" style="font-size:1.4rem;color:white;"></i>
          </div>
          <h1 style="font-family:'Outfit',sans-serif;font-weight:800;font-size:1.6rem;color:var(--text-main);">Create Account</h1>
          <p style="color:var(--text-muted);">Join PlaceConnect today</p>
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

        <div v-if="error" class="alert alert-danger py-2">
          <i class="bi bi-exclamation-circle me-2"></i>{{ error }}
        </div>

        <form @submit.prevent="onSubmit">
          <!-- Common fields -->
          <div class="row g-3 mb-3">
            <div class="col-12">
              <label class="form-label">Email <span class="text-danger">*</span></label>
              <input v-model="currentForm.email" type="email" class="form-control" placeholder="Email address" required>
            </div>
            <div class="col-sm-6">
              <label class="form-label">Password <span class="text-danger">*</span></label>
              <input v-model="currentForm.password" type="password" class="form-control" placeholder="Min. 6 chars" required minlength="6">
            </div>
            <div class="col-sm-6">
              <label class="form-label">Confirm Password <span class="text-danger">*</span></label>
              <input v-model="currentForm.confirmPassword" type="password" class="form-control" placeholder="Repeat password" required minlength="6">
            </div>
          </div>

          <!-- Student fields -->
          <template v-if="role==='student'">
            <div class="row g-3 mb-3">
              <div class="col-sm-6">
                <label class="form-label">Full Name <span class="text-danger">*</span></label>
                <input v-model="studentForm.full_name" class="form-control" placeholder="Your full name" required>
              </div>
              <div class="col-sm-6">
                <label class="form-label">USN / Roll Number <span class="text-danger">*</span></label>
                <input v-model="studentForm.usn" class="form-control" placeholder="1SI21CS001" required pattern="[A-Za-z0-9]+">
              </div>
              <div class="col-sm-6">
                <label class="form-label">Branch <span class="text-danger">*</span></label>
                <select v-model="studentForm.branch" class="form-select" required>
                  <option value="">Select branch</option>
                  <option v-for="b in branches" :key="b">{{ b }}</option>
                </select>
              </div>
              <div class="col-sm-3">
                <label class="form-label">CGPA <span class="text-danger">*</span></label>
                <input v-model="studentForm.cgpa" type="number" step="0.01" min="0" max="10" class="form-control" placeholder="8.5" required>
              </div>
              <div class="col-sm-3">
                <label class="form-label">Year <span class="text-danger">*</span></label>
                <select v-model="studentForm.year" class="form-select" required>
                  <option :value="1">1st</option>
                  <option :value="2">2nd</option>
                  <option :value="3">3rd</option>
                  <option :value="4">4th</option>
                </select>
              </div>
              <div class="col-sm-6">
                <label class="form-label">Phone <span class="text-muted-custom small">(optional)</span></label>
                <input v-model="studentForm.phone" class="form-control" placeholder="+91 9900000000">
              </div>
              <div class="col-sm-6">
                <label class="form-label">LinkedIn <span class="text-muted-custom small">(optional)</span></label>
                <input v-model="studentForm.linkedin" class="form-control" placeholder="linkedin.com/in/...">
              </div>
              <div class="col-12">
                <label class="form-label">Skills <span class="text-muted-custom small">(comma-separated, optional)</span></label>
                <input v-model="studentForm.skills" class="form-control" placeholder="Python, Java, React...">
              </div>
            </div>
          </template>

          <!-- Company fields -->
          <template v-if="role==='company'">
            <div class="row g-3 mb-3">
              <div class="col-12">
                <label class="form-label">Company Name <span class="text-danger">*</span></label>
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
                <input v-model="companyForm.website" type="url" class="form-control" placeholder="https://company.com">
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

        <hr class="my-3" style="border-color:var(--surface-border);">
        <p class="text-center mb-0" style="color:var(--text-muted);font-size:0.9rem;">
          Already registered?&nbsp;
          <router-link to="/login" style="color:var(--orange);font-weight:700;text-decoration:none;">Sign in</router-link>
        </p>
        <div class="text-center mt-3">
          <router-link to="/" style="font-size:0.8rem;color:var(--text-muted);text-decoration:none;">
            <i class="bi bi-arrow-left me-1"></i>Back to Home
          </router-link>
        </div>
      </div>
    </div>
  `
};
