/* =====================================================================
   admin/Reports.js - Reports with charts + PDF download
   ===================================================================== */
const AdminReports = {
  name: 'AdminReports',
  setup() {
    const data      = Vue.ref(null);
    const year      = Vue.ref(new Date().getFullYear());
    const month     = Vue.ref('');
    const loading   = Vue.ref(true);
    const pdfLoading = Vue.ref(false);
    const barRef    = Vue.ref(null);
    const pieRef    = Vue.ref(null);
    let barChart = null, pieChart = null;

    const load = async () => {
      loading.value = true;
      try {
        const res = await Admin.reports({ year: year.value, month: month.value || undefined });
        data.value = res.data;
      } catch { showToast('Failed to load reports','danger'); }
      finally { 
        loading.value = false; 
        Vue.nextTick(() => { setTimeout(renderCharts, 50); }); 
      }
    };

    const renderCharts = () => {
      if (!data.value) return;
      if (!barRef.value || !pieRef.value) return; // Prevent crashes if DOM is not ready
      if (barChart) barChart.destroy();
      if (pieChart) pieChart.destroy();
      const monthly = data.value.monthly_breakdown;
      const chartOpts = { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color:'#94a3b8' } } },
        scales: { x: { ticks:{color:'#94a3b8'}, grid:{color:'rgba(255,255,255,0.05)'} },
                  y: { ticks:{color:'#94a3b8'}, grid:{color:'rgba(255,255,255,0.05)'}, beginAtZero:true } }
      };
      barChart = new Chart(barRef.value, {
        type: 'line',
        data: {
          labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
          datasets: [
            { label:'Applications', data:monthly.map(m=>m.applications), borderColor:'#4f46e5', backgroundColor:'rgba(79,70,229,0.1)', fill:true, tension:0.4 },
            { label:'Selected', data:monthly.map(m=>m.selected), borderColor:'#10b981', backgroundColor:'rgba(16,185,129,0.1)', fill:true, tension:0.4 }
          ]
        }, options: chartOpts
      });
      pieChart = new Chart(pieRef.value, {
        type: 'doughnut',
        data: {
          labels: ['Applied','Shortlisted','Selected','Rejected'],
          datasets: [{ data: [
            data.value.total_applications - data.value.shortlisted - data.value.selected - data.value.rejected,
            data.value.shortlisted, data.value.selected, data.value.rejected
          ], backgroundColor:['#4f46e5','#8b5cf6','#10b981','#ef4444'], borderWidth:0 }]
        },
        options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{color:'#94a3b8'}, position:'bottom' } } }
      });
    };

    const downloadPDF = async () => {
      pdfLoading.value = true;
      try {
        const params = new URLSearchParams({ year: year.value });
        if (month.value) params.append('month', month.value);
        // Fetch PDF blob with JWT auth
        const token = localStorage.getItem('ppa_token');
        const res = await fetch(`/api/admin/reports/pdf?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          showToast(j.error || 'PDF generation failed', 'danger');
          return;
        }
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const label = month.value ? `${monthNames[month.value - 1]}_${year.value}` : year.value;
        a.href = url;
        a.download = `placement_report_${label}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('PDF downloaded!', 'success');
      } catch (e) {
        showToast('Failed to download PDF', 'danger');
      } finally {
        pdfLoading.value = false;
      }
    };

    Vue.onMounted(load);

    return { data, year, month, loading, pdfLoading, barRef, pieRef, load, downloadPDF };
  },
  template: `
    <div>
      <div class="page-header d-flex justify-content-between align-items-center">
        <div><h2>Reports &amp; Analytics</h2><p>Placement activity overview and statistics.</p></div>
      </div>
      <div class="card mb-4">
        <div class="card-body py-3">
          <div class="row g-2 align-items-end">
            <div class="col-md-2">
              <label class="form-label">Year</label>
              <select v-model="year" @change="load" class="form-select">
                <option v-for="y in [2024,2025,2026,2027]" :key="y">{{ y }}</option>
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label">Month</label>
              <select v-model="month" @change="load" class="form-select">
                <option value="">Full Year</option>
                <option v-for="(m,i) in ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']" :key="i+1" :value="i+1">{{ m }}</option>
              </select>
            </div>
            <div class="col-md-4 ms-auto d-flex gap-2 justify-content-end">
              <button class="btn btn-outline-light btn-sm" @click="load" :disabled="loading">
                <i class="bi bi-arrow-clockwise me-1"></i>Refresh
              </button>
              <button class="btn btn-danger btn-sm" @click="downloadPDF" :disabled="pdfLoading || loading">
                <span v-if="pdfLoading" class="spinner-border spinner-border-sm me-1"></span>
                <i v-else class="bi bi-file-earmark-pdf me-1"></i>
                {{ pdfLoading ? 'Generating PDF...' : 'Download PDF Report' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
      <template v-else-if="data">
        <!-- Stats -->
        <div class="row g-3 mb-4">
          <div class="col-6 col-md-3"><div class="stat-card primary">
            <i class="bi bi-briefcase-fill stat-icon text-primary"></i>
            <div class="stat-value text-primary">{{ data.drives_conducted }}</div>
            <div class="stat-label">Drives Conducted</div>
          </div></div>
          <div class="col-6 col-md-3"><div class="stat-card info">
            <i class="bi bi-file-earmark-text stat-icon text-info"></i>
            <div class="stat-value text-info">{{ data.total_applications }}</div>
            <div class="stat-label">Total Applications</div>
          </div></div>
          <div class="col-6 col-md-3"><div class="stat-card warning">
            <i class="bi bi-person-check stat-icon text-warning"></i>
            <div class="stat-value text-warning">{{ data.shortlisted }}</div>
            <div class="stat-label">Shortlisted</div>
          </div></div>
          <div class="col-6 col-md-3"><div class="stat-card success">
            <i class="bi bi-trophy-fill stat-icon text-success"></i>
            <div class="stat-value text-success">{{ data.selected }}</div>
            <div class="stat-label">Selected</div>
          </div></div>
        </div>
        <!-- Charts -->
        <div class="row g-3 mb-4">
          <div class="col-md-8">
            <div class="card"><div class="card-header py-3">Monthly Trend</div>
              <div class="card-body" style="height:280px;"><canvas ref="barRef"></canvas></div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card"><div class="card-header py-3">Application Status</div>
              <div class="card-body" style="height:280px;"><canvas ref="pieRef"></canvas></div>
            </div>
          </div>
        </div>
        <!-- Top Companies -->
        <div class="card">
          <div class="card-header py-3">Top Companies by Applications</div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table mb-0">
                <thead><tr><th>#</th><th>Company</th><th>Applications</th></tr></thead>
                <tbody>
                  <tr v-for="(c,i) in data.top_companies" :key="i">
                    <td>{{ i + 1 }}</td>
                    <td>{{ c.company }}</td>
                    <td><span class="fw-600 text-primary">{{ c.applications }}</span></td>
                  </tr>
                  <tr v-if="!data.top_companies.length"><td colspan="3" class="text-center text-muted-custom py-3">No data</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </template>
    </div>
  `
};
