/* =====================================================================
   admin/Drives.js
   ===================================================================== */
const AdminDrives = {
  name: 'AdminDrives',
  setup() {
    const drives  = Vue.ref([]);
    const loading = Vue.ref(true);
    const status  = Vue.ref('pending');
    const search  = Vue.ref('');
    const selected = Vue.ref(null);
    const rejectReason = Vue.ref('');
    const actionLoading = Vue.ref(false);
    let modal = null;

    const load = async () => {
      loading.value = true;
      try {
        const res = await Admin.drives({ status: status.value, q: search.value });
        drives.value = res.data.drives;
      } catch { showToast('Failed to load drives','danger'); }
      finally { loading.value = false; }
    };

    Vue.onMounted(() => { load(); modal = new bootstrap.Modal(document.getElementById('driveModal')); });

    const openModal = (d) => { selected.value = d; rejectReason.value = ''; modal.show(); };

    const approve = async (id) => {
      actionLoading.value = true;
      try { await Admin.approveDrive(id); showToast('Drive approved!','success'); modal.hide(); load(); }
      catch (e) { showToast(e.response?.data?.error || 'Error','danger'); }
      finally { actionLoading.value = false; }
    };

    const reject = async (id) => {
      actionLoading.value = true;
      try { await Admin.rejectDrive(id, rejectReason.value); showToast('Drive rejected','warning'); modal.hide(); load(); }
      catch (e) { showToast('Error','danger'); }
      finally { actionLoading.value = false; }
    };

    let timer;
    const onSearch = () => { clearTimeout(timer); timer = setTimeout(load, 350); };

    return { drives, loading, status, search, selected, rejectReason, actionLoading,
             openModal, approve, reject, onSearch, load, formatDate };
  },
  template: `
    <div>
      <div class="page-header"><h2>Placement Drives</h2><p>Approve or reject placement drives created by companies.</p></div>
      <div class="card mb-4">
        <div class="card-body py-3">
          <div class="row g-2">
            <div class="col-md-5">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-search"></i></span>
                <input v-model="search" @input="onSearch" class="form-control" placeholder="Search drives...">
              </div>
            </div>
            <div class="col-md-3">
              <select v-model="status" @change="load" class="form-select">
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-body p-0">
          <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
          <div v-else-if="!drives.length" class="empty-state"><i class="bi bi-briefcase"></i><p>No drives found</p></div>
          <div v-else class="table-responsive">
            <table class="table table-hover mb-0">
              <thead><tr><th>Company</th><th>Job Title</th><th>Type</th><th>Package</th><th>Deadline</th><th>Applicants</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                <tr v-for="d in drives" :key="d.id">
                  <td><div class="fw-600">{{ d.company_name }}</div></td>
                  <td><div>{{ d.job_title }}</div><div class="text-muted-custom small">{{ d.location }}</div></td>
                  <td><span class="badge bg-secondary">{{ d.job_type }}</span></td>
                  <td>{{ d.package_lpa ? d.package_lpa + ' LPA' : '—' }}</td>
                  <td><span class="small">{{ formatDate(d.application_deadline) }}</span></td>
                  <td><span class="fw-600 text-info">{{ d.applicant_count }}</span></td>
                  <td><span :class="['badge-status','badge-'+d.status]">{{ d.status }}</span></td>
                  <td>
                    <div class="d-flex gap-1">
                      <button class="btn btn-sm btn-outline-light" @click="openModal(d)"><i class="bi bi-eye"></i></button>
                      <button v-if="d.status==='pending'" class="btn btn-sm btn-success" @click="approve(d.id)"><i class="bi bi-check"></i></button>
                      <button v-if="d.status==='pending'" class="btn btn-sm btn-danger" @click="openModal(d)"><i class="bi bi-x"></i></button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <!-- Modal -->
      <div id="driveModal" class="modal fade" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content" v-if="selected">
            <div class="modal-header">
              <h5 class="modal-title">{{ selected.job_title }}</h5>
              <button class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <table class="table table-sm mb-0">
                    <tr><td class="text-muted-custom">Company</td><td>{{ selected.company_name }}</td></tr>
                    <tr><td class="text-muted-custom">Job Type</td><td>{{ selected.job_type }}</td></tr>
                    <tr><td class="text-muted-custom">Location</td><td>{{ selected.location || '—' }}</td></tr>
                    <tr><td class="text-muted-custom">Package</td><td>{{ selected.package_lpa ? selected.package_lpa + ' LPA' : '—' }}</td></tr>
                    <tr><td class="text-muted-custom">Min CGPA</td><td>{{ selected.min_cgpa }}</td></tr>
                    <tr><td class="text-muted-custom">Branches</td><td>{{ selected.eligible_branches }}</td></tr>
                    <tr><td class="text-muted-custom">Years</td><td>{{ selected.eligible_years }}</td></tr>
                    <tr><td class="text-muted-custom">Deadline</td><td>{{ formatDate(selected.application_deadline) }}</td></tr>
                    <tr><td class="text-muted-custom">Drive Date</td><td>{{ formatDate(selected.drive_date) }}</td></tr>
                    <tr><td class="text-muted-custom">Interview</td><td>{{ selected.interview_mode }}</td></tr>
                  </table>
                </div>
                <div class="col-md-6">
                  <p class="text-muted-custom small mb-1">Job Description</p>
                  <p class="small" style="white-space:pre-wrap">{{ selected.job_description }}</p>
                  <p class="text-muted-custom small mb-1 mt-2">Rounds</p>
                  <p class="small">{{ selected.rounds || '—' }}</p>
                </div>
              </div>
              <div v-if="selected.status === 'pending'" class="mt-3">
                <label class="form-label">Rejection Reason (if rejecting)</label>
                <textarea v-model="rejectReason" class="form-control" rows="2"></textarea>
              </div>
            </div>
            <div class="modal-footer gap-2">
              <button v-if="selected.status==='pending'" class="btn btn-success" @click="approve(selected.id)" :disabled="actionLoading">
                <i class="bi bi-check-circle me-1"></i> Approve
              </button>
              <button v-if="selected.status==='pending'" class="btn btn-danger" @click="reject(selected.id)" :disabled="actionLoading">
                <i class="bi bi-x-circle me-1"></i> Reject
              </button>
              <button class="btn btn-outline-light" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
