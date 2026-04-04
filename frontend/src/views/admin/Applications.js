/* =====================================================================
   admin/Applications.js — standalone admin applications page
   ===================================================================== */
const AdminApplications = {
  name: 'AdminApplications',
  setup() {
    const apps = Vue.ref([]);
    const loading = Vue.ref(true);
    const status = Vue.ref('');

    const load = async () => {
      loading.value = true;
      try {
        const res = await Admin.applications({ status: status.value });
        apps.value = res.data.applications;
      } catch { showToast('Failed to load applications','danger'); }
      finally { loading.value = false; }
    };
    Vue.onMounted(load);
    return { apps, loading, status, load, formatDate };
  },
  template: `
    <div>
      <div class="page-header"><h2>All Applications</h2><p>View all student applications across all drives.</p></div>
      <div class="card mb-4"><div class="card-body py-3">
        <select v-model="status" @change="load" class="form-select" style="width:200px;">
          <option value="">All Statuses</option>
          <option value="applied">Applied</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="selected">Selected</option>
          <option value="rejected">Rejected</option>
        </select>
      </div></div>
      <div class="card"><div class="card-body p-0">
        <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
        <div v-else-if="!apps.length" class="empty-state"><i class="bi bi-file-earmark-text"></i><p>No applications</p></div>
        <div v-else class="table-responsive">
          <table class="table table-hover mb-0">
            <thead><tr><th>Student</th><th>Company</th><th>Drive</th><th>Status</th><th>Applied</th></tr></thead>
            <tbody>
              <tr v-for="a in apps" :key="a.id">
                <td><div class="fw-600">{{ a.student?.full_name }}</div><div class="text-muted-custom small">{{ a.student?.usn }}</div></td>
                <td>{{ a.drive?.company_name }}</td>
                <td><div>{{ a.drive?.job_title }}</div></td>
                <td><span :class="['badge-status','badge-'+a.status]">{{ a.status }}</span></td>
                <td><span class="small text-muted-custom">{{ formatDate(a.applied_at) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div></div>
    </div>
  `
};
