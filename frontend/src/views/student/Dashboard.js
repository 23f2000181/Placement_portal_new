/* =====================================================================
   student/Dashboard.js — Browse approved drives
   ===================================================================== */
const StudentDashboard = {
  name: 'StudentDashboard',
  setup() {
    const drives = Vue.ref([]);
    const loading = Vue.ref(true);
    const search = Vue.ref('');
    const eligibleOnly = Vue.ref(false);
    const minPkg = Vue.ref('');

    const load = async () => {
      loading.value = true;
      try {
        const res = await Student.drives({ q: search.value, eligible_only: eligibleOnly.value, min_package: minPkg.value || undefined });
        drives.value = res.data.drives;
      } catch { showToast('Error loading drives','danger'); }
      finally { loading.value = false; }
    };

    Vue.onMounted(load);

    let timer;
    const onSearch = () => { clearTimeout(timer); timer = setTimeout(load, 400); };

    const apply = async (driveId) => {
      try {
        await Student.apply(driveId, {});
        showToast('Application submitted!','success');
        load();
      } catch (e) { showToast(e.response?.data?.error || 'Error applying','danger'); }
    };

    return { drives, loading, search, eligibleOnly, minPkg, load, onSearch, apply, formatDate, daysFromNow, store };
  },
  template: `
    <div>
      <div class="page-header">
        <h2>Browse Placement Drives</h2>
        <p>Find and apply for placement drives that match your profile.</p>
      </div>

      <!-- Filters -->
      <div class="card mb-4">
        <div class="card-body py-3">
          <div class="row g-2 align-items-center">
            <div class="col-md-5">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-search"></i></span>
                <input v-model="search" @input="onSearch" class="form-control" placeholder="Search drives, companies...">
              </div>
            </div>
            <div class="col-md-2">
              <input v-model="minPkg" @change="load" type="number" class="form-control" placeholder="Min LPA">
            </div>
            <div class="col-md-3">
              <div class="form-check form-switch mb-0">
                <input v-model="eligibleOnly" @change="load" class="form-check-input" type="checkbox" id="eligibleSwitch">
                <label class="form-check-label" for="eligibleSwitch">Show eligible only</label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
      <div v-else-if="!drives.length" class="empty-state"><i class="bi bi-briefcase"></i><p>No drives found matching your filters.</p></div>
      <div v-else class="row g-3">
        <div v-for="d in drives" :key="d.id" class="col-md-6 col-lg-4">
          <div :class="['drive-card', !d.is_eligible ? 'ineligible' : '']">
            <div class="d-flex align-items-start gap-2 mb-2">
              <div class="company-logo-placeholder">{{ (d.company_name || '?')[0].toUpperCase() }}</div>
              <div class="flex-grow-1 overflow-hidden">
                <h6 class="fw-700 mb-0 text-truncate">{{ d.job_title }}</h6>
                <div class="text-muted-custom small">{{ d.company_name }}</div>
              </div>
              <span class="badge bg-secondary flex-shrink-0">{{ d.job_type }}</span>
            </div>

            <div class="row g-2 text-center my-2" style="font-size:0.8rem;">
              <div class="col-4">
                <div class="fw-700 text-success">{{ d.package_lpa ? d.package_lpa + ' LPA' : '—' }}</div>
                <div class="text-muted-custom">Package</div>
              </div>
              <div class="col-4">
                <div class="fw-700">{{ d.min_cgpa || '0' }}+</div>
                <div class="text-muted-custom">Min CGPA</div>
              </div>
              <div class="col-4">
                <div class="fw-700 text-info">{{ d.applicant_count }}</div>
                <div class="text-muted-custom">Applied</div>
              </div>
            </div>

            <div class="mb-2 text-muted-custom small">
              <i class="bi bi-geo-alt me-1"></i>{{ d.location || 'Remote' }}
              &nbsp;&nbsp;<i class="bi bi-calendar3 me-1"></i>Deadline: {{ formatDate(d.application_deadline) }}
              <span v-if="daysFromNow(d.application_deadline) !== null"
                    :class="['ms-1', daysFromNow(d.application_deadline) <= 3 ? 'text-danger' : 'text-muted-custom']">
                ({{ daysFromNow(d.application_deadline) > 0 ? daysFromNow(d.application_deadline) + 'd left' : 'Expired' }})
              </span>
            </div>

            <div v-if="!d.is_eligible" class="alert alert-danger py-1 px-2 mb-2" style="font-size:0.77rem;">
              <i class="bi bi-exclamation-circle me-1"></i>{{ d.eligibility_reasons[0] }}
            </div>

            <div class="d-flex gap-2">
              <router-link :to="'/student/drives/' + d.id" class="btn btn-sm btn-outline-light flex-fill">
                <i class="bi bi-eye me-1"></i>Details
              </router-link>
              <button v-if="d.already_applied" class="btn btn-sm btn-outline-success flex-fill" disabled>
                <i class="bi bi-check-circle me-1"></i>Applied
              </button>
              <button v-else-if="d.is_eligible" class="btn btn-sm btn-primary flex-fill" @click="apply(d.id)">
                <i class="bi bi-send me-1"></i>Apply
              </button>
              <button v-else class="btn btn-sm btn-outline-secondary flex-fill" disabled>Not Eligible</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
