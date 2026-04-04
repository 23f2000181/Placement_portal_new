/* =====================================================================
   company/Dashboard.js
   ===================================================================== */
const CompanyDashboard = {
  name: 'CompanyDashboard',
  setup() {
    const data = Vue.ref(null);
    const loading = Vue.ref(true);

    const load = async () => {
      try { const res = await Company.dashboard(); data.value = res.data; }
      catch { showToast('Failed to load dashboard','danger'); }
      finally { loading.value = false; }
    };
    Vue.onMounted(load);

    return { data, loading, formatDate };
  },
  template: `
    <div>
      <div class="page-header d-flex justify-content-between align-items-start">
        <div>
          <h2>{{ data?.company?.company_name || 'Company Dashboard' }}</h2>
          <p v-if="data?.company?.approval_status !== 'approved'" class="text-warning">
            <i class="bi bi-clock me-1"></i>Your registration is <strong>{{ data?.company?.approval_status }}</strong>. Wait for admin approval to create drives.
          </p>
          <p v-else class="text-success"><i class="bi bi-check-circle me-1"></i>Approved — you can create placement drives.</p>
        </div>
        <router-link v-if="data?.company?.approval_status==='approved'" to="/company/drives" class="btn btn-primary btn-sm">
          <i class="bi bi-plus-circle me-1"></i> New Drive
        </router-link>
      </div>
      <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
      <template v-else-if="data">
        <div class="row g-3 mb-4">
          <div class="col-6 col-md-3"><div class="stat-card info">
            <i class="bi bi-briefcase-fill stat-icon text-info"></i>
            <div class="stat-value text-info">{{ data.total_drives }}</div>
            <div class="stat-label">Total Drives</div>
          </div></div>
          <div class="col-6 col-md-3"><div class="stat-card primary">
            <i class="bi bi-people-fill stat-icon text-primary"></i>
            <div class="stat-value text-primary">{{ data.total_applicants }}</div>
            <div class="stat-label">Total Applicants</div>
          </div></div>
        </div>
        <!-- Drives list -->
        <div class="card">
          <div class="card-header py-3 d-flex justify-content-between align-items-center">
            <span>My Placement Drives</span>
            <router-link to="/company/drives" class="small text-primary-light">Manage</router-link>
          </div>
          <div class="card-body p-0">
            <div v-if="!data.drives.length" class="empty-state py-4">
              <i class="bi bi-briefcase"></i>
              <p>No drives yet. <router-link to="/company/drives">Create your first drive.</router-link></p>
            </div>
            <div v-else class="table-responsive">
              <table class="table table-hover mb-0">
                <thead><tr><th>Title</th><th>Deadline</th><th>Applicants</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  <tr v-for="d in data.drives" :key="d.id">
                    <td><div class="fw-600">{{ d.job_title }}</div><div class="text-muted-custom small">{{ d.location }}</div></td>
                    <td>{{ formatDate(d.application_deadline) }}</td>
                    <td class="fw-600 text-info">{{ d.applicant_count }}</td>
                    <td><span :class="['badge-status','badge-'+d.status]">{{ d.status }}</span></td>
                    <td>
                      <router-link :to="'/company/applications/' + d.id" class="btn btn-sm btn-outline-light">
                        <i class="bi bi-people me-1"></i> View
                      </router-link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </template>
    </div>
  `
};
