/* =====================================================================
   student/History.js — Placement history (selected applications)
   ===================================================================== */
const StudentHistory = {
  name: 'StudentHistory',
  setup() {
    const data = Vue.ref(null);
    const loading = Vue.ref(true);
    Vue.onMounted(async () => {
      try { const res = await Student.history(); data.value = res.data; }
      catch { showToast('Error loading history','danger'); }
      finally { loading.value = false; }
    });
    return { data, loading, formatDate };
  },
  template: `
    <div>
      <div class="page-header"><h2>Placement History</h2><p>Your confirmed placements and selections.</p></div>
      <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
      <template v-else-if="data">
        <div class="row g-3 mb-4">
          <div class="col-6 col-md-3"><div class="stat-card info">
            <i class="bi bi-file-earmark-text stat-icon text-info"></i>
            <div class="stat-value text-info">{{ data.total_applied }}</div>
            <div class="stat-label">Total Applied</div>
          </div></div>
          <div class="col-6 col-md-3"><div class="stat-card success">
            <i class="bi bi-trophy-fill stat-icon text-success"></i>
            <div class="stat-value text-success">{{ data.total_selected }}</div>
            <div class="stat-label">Selected</div>
          </div></div>
        </div>

        <div v-if="!data.placements.length" class="empty-state">
          <i class="bi bi-trophy"></i>
          <p>No placements yet. Keep applying!</p>
        </div>
        <div v-else class="row g-3">
          <div v-for="p in data.placements" :key="p.id" class="col-md-6">
            <div class="card" style="border-left:4px solid var(--success);">
              <div class="card-body">
                <div class="d-flex align-items-center gap-3">
                  <div class="company-logo-placeholder">{{ p.drive?.company_name?.[0]?.toUpperCase() || '?' }}</div>
                  <div>
                    <h6 class="fw-700 mb-0">{{ p.drive?.job_title }}</h6>
                    <div class="text-muted-custom">{{ p.drive?.company_name }}</div>
                    <div class="mt-1 d-flex gap-3 text-muted-custom" style="font-size:0.82rem;">
                      <span v-if="p.drive?.package_lpa"><i class="bi bi-currency-rupee me-1"></i>{{ p.drive.package_lpa }} LPA</span>
                      <span v-if="p.drive?.location"><i class="bi bi-geo-alt me-1"></i>{{ p.drive.location }}</span>
                      <span><i class="bi bi-calendar-check me-1"></i>{{ formatDate(p.applied_at) }}</span>
                    </div>
                  </div>
                </div>
                <div class="mt-2">
                  <span class="badge-status badge-selected"><i class="bi bi-trophy-fill me-1"></i>Selected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  `
};
