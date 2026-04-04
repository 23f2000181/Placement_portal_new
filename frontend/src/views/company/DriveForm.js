/* =====================================================================
   company/DriveForm.js — Create/Edit drives + list drives
   ===================================================================== */
const CompanyDrives = {
  name: 'CompanyDrives',
  setup() {
    const drives  = Vue.ref([]);
    const loading = Vue.ref(true);
    const showForm = Vue.ref(false);
    const editingId = Vue.ref(null);
    const saving  = Vue.ref(false);
    const error   = Vue.ref('');
    const profile = Vue.ref(null);

    const emptyForm = () => ({
      job_title: '', job_description: '', job_type: 'Full Time', location: '',
      package_lpa: '', min_cgpa: 0, eligible_branches: 'ALL', eligible_years: 'ALL',
      application_deadline: '', drive_date: '', interview_mode: 'Online', rounds: ''
    });
    const form = Vue.reactive(emptyForm());

    const load = async () => {
      loading.value = true;
      try {
        const [dRes, pRes] = await Promise.all([Company.drives(), Company.getProfile()]);
        drives.value = dRes.data.drives;
        profile.value = pRes.data;
      } catch { showToast('Error loading drives','danger'); }
      finally { loading.value = false; }
    };

    Vue.onMounted(load);

    const openCreate = () => {
      editingId.value = null;
      Object.assign(form, emptyForm());
      error.value = '';
      showForm.value = true;
    };

    const openEdit = (d) => {
      editingId.value = d.id;
      Object.assign(form, {
        job_title: d.job_title, job_description: d.job_description,
        job_type: d.job_type, location: d.location || '',
        package_lpa: d.package_lpa || '', min_cgpa: d.min_cgpa || 0,
        eligible_branches: d.eligible_branches, eligible_years: d.eligible_years,
        application_deadline: d.application_deadline ? d.application_deadline.slice(0, 16) : '',
        drive_date: d.drive_date ? d.drive_date.slice(0, 16) : '',
        interview_mode: d.interview_mode, rounds: d.rounds || ''
      });
      error.value = '';
      showForm.value = true;
    };

    const save = async () => {
      error.value = '';
      saving.value = true;
      try {
        const payload = { ...form };
        if (payload.package_lpa) payload.package_lpa = parseFloat(payload.package_lpa);
        if (editingId.value) {
          await Company.updateDrive(editingId.value, payload);
          showToast('Drive updated!','success');
        } else {
          await Company.createDrive(payload);
          showToast('Drive created and sent for admin approval!','success');
        }
        showForm.value = false;
        load();
      } catch (e) {
        error.value = e.response?.data?.error || 'Error saving drive';
      } finally { saving.value = false; }
    };

    const deleteDrive = async (id) => {
      if (!confirm('Delete this drive? This cannot be undone.')) return;
      await Company.deleteDrive(id);
      showToast('Drive deleted','warning');
      load();
    };

    const closeDrive = async (id) => {
      if (!confirm('Close this drive? No new applications will be accepted.')) return;
      await Company.closeDrive(id);
      showToast('Drive closed','warning');
      load();
    };

    return { drives, loading, showForm, form, editingId, saving, error, profile,
             openCreate, openEdit, save, deleteDrive, closeDrive, formatDate };
  },
  template: `
    <div>
      <div class="page-header d-flex justify-content-between align-items-center">
        <div><h2>Placement Drives</h2><p>Create and manage your recruitment drives.</p></div>
        <button v-if="!showForm && profile?.approval_status==='approved'" class="btn btn-primary" @click="openCreate">
          <i class="bi bi-plus-circle me-1"></i> New Drive
        </button>
        <button v-else-if="showForm" class="btn btn-outline-light" @click="showForm=false">
          <i class="bi bi-arrow-left me-1"></i> Back
        </button>
      </div>

      <!-- Drive Form -->
      <div v-if="showForm" class="card mb-4">
        <div class="card-header py-3">{{ editingId ? 'Edit Drive' : 'Create New Drive' }}</div>
        <div class="card-body">
          <div v-if="error" class="alert alert-danger">{{ error }}</div>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Job Title *</label>
              <input v-model="form.job_title" class="form-control" placeholder="Software Engineer" required>
            </div>
            <div class="col-md-3">
              <label class="form-label">Job Type</label>
              <select v-model="form.job_type" class="form-select">
                <option>Full Time</option><option>Internship</option><option>Part Time</option>
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label">Interview Mode</label>
              <select v-model="form.interview_mode" class="form-select">
                <option>Online</option><option>Offline</option><option>Hybrid</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label">Location</label>
              <input v-model="form.location" class="form-control" placeholder="Bangalore / Remote">
            </div>
            <div class="col-md-4">
              <label class="form-label">Package (LPA)</label>
              <input v-model="form.package_lpa" type="number" step="0.5" class="form-control" placeholder="12">
            </div>
            <div class="col-md-4">
              <label class="form-label">Minimum CGPA</label>
              <input v-model="form.min_cgpa" type="number" step="0.1" min="0" max="10" class="form-control" placeholder="7.0">
            </div>
            <div class="col-md-6">
              <label class="form-label">Eligible Branches <span class="text-muted-custom">(comma-separated or ALL)</span></label>
              <input v-model="form.eligible_branches" class="form-control" placeholder="CS,IS,EC or ALL">
            </div>
            <div class="col-md-6">
              <label class="form-label">Eligible Years <span class="text-muted-custom">(comma-separated or ALL)</span></label>
              <input v-model="form.eligible_years" class="form-control" placeholder="3,4 or ALL">
            </div>
            <div class="col-md-6">
              <label class="form-label">Application Deadline *</label>
              <input v-model="form.application_deadline" type="datetime-local" class="form-control" required>
            </div>
            <div class="col-md-6">
              <label class="form-label">Drive Date (optional)</label>
              <input v-model="form.drive_date" type="datetime-local" class="form-control">
            </div>
            <div class="col-12">
              <label class="form-label">Job Description *</label>
              <textarea v-model="form.job_description" class="form-control" rows="4" placeholder="Describe the role, responsibilities, and requirements..." required></textarea>
            </div>
            <div class="col-12">
              <label class="form-label">Interview Rounds (optional)</label>
              <input v-model="form.rounds" class="form-control" placeholder="Aptitude → Technical → HR">
            </div>
          </div>
          <div class="mt-3 d-flex gap-2">
            <button class="btn btn-primary" @click="save" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              {{ saving ? 'Saving...' : (editingId ? 'Save Changes' : 'Create Drive') }}
            </button>
            <button class="btn btn-outline-light" @click="showForm=false">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Drives list -->
      <div v-if="!showForm">
        <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
        <div v-else-if="!drives.length" class="empty-state">
          <i class="bi bi-briefcase"></i>
          <p>No drives yet. Click "New Drive" to create your first placement drive.</p>
        </div>
        <div v-else class="row g-3">
          <div v-for="d in drives" :key="d.id" class="col-md-6 col-lg-4">
            <div class="drive-card">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h6 class="fw-700 mb-0">{{ d.job_title }}</h6>
                  <span class="text-muted-custom small">{{ d.job_type }} · {{ d.location || 'Remote' }}</span>
                </div>
                <span :class="['badge-status','badge-'+d.status]">{{ d.status }}</span>
              </div>
              <div class="row g-2 mb-3 text-center" style="font-size:0.8rem;">
                <div class="col-4">
                  <div class="fw-700 text-primary">{{ d.applicant_count }}</div><div class="text-muted-custom">Applicants</div>
                </div>
                <div class="col-4">
                  <div class="fw-700">{{ d.min_cgpa || '0' }}</div><div class="text-muted-custom">Min CGPA</div>
                </div>
                <div class="col-4">
                  <div class="fw-700 text-success">{{ d.package_lpa ? d.package_lpa + ' LPA' : '—' }}</div><div class="text-muted-custom">Package</div>
                </div>
              </div>
              <div class="text-muted-custom small mb-3"><i class="bi bi-calendar3 me-1"></i>Deadline: {{ formatDate(d.application_deadline) }}</div>
              <div class="d-flex gap-2 flex-wrap">
                <router-link :to="'/company/applications/'+d.id" class="btn btn-sm btn-outline-light flex-fill">
                  <i class="bi bi-people me-1"></i>Applicants
                </router-link>
                <button v-if="d.status!=='closed'" class="btn btn-sm btn-outline-light" @click="openEdit(d)">
                  <i class="bi bi-pencil"></i>
                </button>
                <button v-if="d.status==='approved'" class="btn btn-sm btn-outline-warning" @click="closeDrive(d.id)">
                  <i class="bi bi-lock"></i>
                </button>
                <button v-if="d.status!=='approved'" class="btn btn-sm btn-outline-danger" @click="deleteDrive(d.id)">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
