/* =====================================================================
   admin/Dashboard.js
   ===================================================================== */
const AdminDashboard = {
  name: 'AdminDashboard',
  setup() {
    const stats = Vue.ref(null);
    const loading = Vue.ref(true);
    const chartRef = Vue.ref(null);
    let myChart = null;

    const load = async () => {
      try {
        const res = await Admin.dashboard();
        stats.value = res.data;
        Vue.nextTick(() => renderChart());
      } catch (e) {
        showToast('Failed to load dashboard', 'danger');
      } finally {
        loading.value = false;
      }
    };

    const renderChart = async () => {
      if (!chartRef.value || !stats.value) return;
      if (myChart) myChart.destroy();
      const reports = await Admin.reports({ year: new Date().getFullYear() });
      const monthly = reports.data.monthly_breakdown;
      myChart = new Chart(chartRef.value, {
        type: 'bar',
        data: {
          labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
          datasets: [
            { label: 'Applications', data: monthly.map(m => m.applications), backgroundColor: 'rgba(79,70,229,0.7)', borderRadius: 6 },
            { label: 'Selected', data: monthly.map(m => m.selected), backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 6 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#94a3b8' } } },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
          }
        }
      });
    };

    Vue.onMounted(load);

    return { stats, loading, chartRef, formatDateTime };
  },
  template: `
    <div>
      <div class="page-header d-flex justify-content-between align-items-start">
        <div>
          <h2>Admin Dashboard</h2>
          <p>Welcome back! Here's what's happening on the portal.</p>
        </div>
        <router-link to="/admin/reports" class="btn btn-outline-light btn-sm">
          <i class="bi bi-bar-chart-line me-1"></i> Full Reports
        </router-link>
      </div>

      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary"></div>
      </div>

      <template v-else-if="stats">
        <!-- Stats Row -->
        <div class="row g-3 mb-4">
          <div class="col-6 col-md-3">
            <div class="stat-card primary">
              <i class="bi bi-people-fill stat-icon text-primary"></i>
              <div class="stat-value text-primary">{{ stats.total_students }}</div>
              <div class="stat-label">Total Students</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stat-card success">
              <i class="bi bi-building-fill stat-icon text-success"></i>
              <div class="stat-value text-success">{{ stats.total_companies }}</div>
              <div class="stat-label">Approved Companies</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stat-card info">
              <i class="bi bi-briefcase-fill stat-icon text-info"></i>
              <div class="stat-value text-info">{{ stats.total_drives }}</div>
              <div class="stat-label">Active Drives</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stat-card warning">
              <i class="bi bi-trophy-fill stat-icon text-warning"></i>
              <div class="stat-value text-warning">{{ stats.selected_students }}</div>
              <div class="stat-label">Students Selected</div>
            </div>
          </div>
        </div>

        <!-- Pending alerts -->
        <div class="row g-3 mb-4" v-if="stats.pending_companies > 0 || stats.pending_drives > 0">
          <div class="col-md-6" v-if="stats.pending_companies > 0">
            <div class="alert alert-warning d-flex align-items-center gap-2 mb-0">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <span><strong>{{ stats.pending_companies }}</strong> company registration(s) pending approval.</span>
              <router-link to="/admin/companies" class="btn btn-warning btn-sm ms-auto">Review</router-link>
            </div>
          </div>
          <div class="col-md-6" v-if="stats.pending_drives > 0">
            <div class="alert alert-info d-flex align-items-center gap-2 mb-0">
              <i class="bi bi-info-circle-fill"></i>
              <span><strong>{{ stats.pending_drives }}</strong> placement drive(s) pending approval.</span>
              <router-link to="/admin/drives" class="btn btn-info btn-sm ms-auto">Review</router-link>
            </div>
          </div>
        </div>

        <!-- Chart + Recent activity -->
        <div class="row g-3">
          <div class="col-md-8">
            <div class="card">
              <div class="card-header py-3">Applications & Placements This Year</div>
              <div class="card-body" style="height:260px;">
                <canvas ref="chartRef"></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card h-100">
              <div class="card-header py-3 d-flex justify-content-between">
                <span>Recent Applications</span>
                <router-link to="/admin/applications" class="small text-primary-light">View all</router-link>
              </div>
              <div class="card-body p-0" style="overflow-y:auto;max-height:260px;">
                <div v-for="a in stats.recent_applications" :key="a.id" class="border-bottom p-3" style="border-color:var(--dark-border)!important;">
                  <div class="fw-600 small">{{ a.student?.full_name || 'N/A' }}</div>
                  <div class="text-muted-custom small">{{ a.drive?.company_name }} — {{ a.drive?.job_title }}</div>
                  <div class="mt-1">
                    <span :class="['badge-status badge-' + a.status]">{{ a.status }}</span>
                  </div>
                </div>
                <div v-if="!stats.recent_applications.length" class="empty-state py-3">
                  <p class="small">No applications yet</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  `
};
