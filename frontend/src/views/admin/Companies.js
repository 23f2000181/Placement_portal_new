/* =====================================================================
   admin/Companies.js
   ===================================================================== */
const AdminCompanies = {
  name: 'AdminCompanies',
  setup() {
    const companies = Vue.ref([]);
    const loading   = Vue.ref(true);
    const search    = Vue.ref('');
    const status    = Vue.ref('');
    const industry  = Vue.ref('');
    const selected  = Vue.ref(null);
    const rejectReason = Vue.ref('');
    const actionLoading = Vue.ref(false);
    let modal = null;

    const load = async () => {
      loading.value = true;
      try {
        const res = await Admin.companies({ q: search.value, status: status.value, industry: industry.value });
        companies.value = res.data.companies;
      } catch (e) {
        showToast('Failed to load companies', 'danger');
      } finally { loading.value = false; }
    };

    Vue.onMounted(() => {
      load();
      modal = new bootstrap.Modal(document.getElementById('companyModal'));
    });

    const openModal = (c) => { selected.value = c; rejectReason.value = c.rejection_reason || ''; modal.show(); };

    const approve = async (id) => {
      actionLoading.value = true;
      try {
        await Admin.approveCompany(id);
        showToast('Company approved!', 'success');
        modal.hide();
        load();
      } catch (e) { showToast(e.response?.data?.error || 'Error', 'danger'); }
      finally { actionLoading.value = false; }
    };

    const reject = async (id) => {
      actionLoading.value = true;
      try {
        await Admin.rejectCompany(id, rejectReason.value);
        showToast('Company rejected', 'warning');
        modal.hide();
        load();
      } catch (e) { showToast(e.response?.data?.error || 'Error', 'danger'); }
      finally { actionLoading.value = false; }
    };

    const blacklist = async (id, action) => {
      try {
        await Admin.blacklistCompany(id, action);
        showToast(action === 'blacklist' ? 'Company blacklisted' : 'Company un-blacklisted', 'warning');
        load();
      } catch (e) { showToast('Error', 'danger'); }
    };

    const deleteCompany = async (c) => {
      if (!confirm(`Permanently delete "${c.company_name}" and ALL their data? This cannot be undone.`)) return;
      try {
        await Admin.deleteCompany(c.id);
        showToast('Company permanently deleted', 'danger');
        modal.hide();
        load();
      } catch (e) { showToast(e.response?.data?.error || 'Delete failed', 'danger'); }
    };

    let searchTimer;
    const onSearch = () => { clearTimeout(searchTimer); searchTimer = setTimeout(load, 350); };

    return { companies, loading, search, status, industry, selected, rejectReason, actionLoading,
             openModal, approve, reject, blacklist, deleteCompany, onSearch, load, formatDate };
  },
  template: `
    <div>
      <div class="page-header d-flex justify-content-between align-items-center">
        <div><h2>Companies</h2><p>Manage company registrations and approvals.</p></div>
      </div>

      <!-- Filters -->
      <div class="card mb-4">
        <div class="card-body py-3">
          <div class="row g-2">
            <div class="col-md-5">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-search"></i></span>
                <input v-model="search" @input="onSearch" class="form-control" placeholder="Search companies...">
              </div>
            </div>
            <div class="col-md-3">
              <input v-model="industry" @input="onSearch" class="form-control" placeholder="Filter by industry">
            </div>
            <div class="col-md-3">
              <select v-model="status" @change="load" class="form-select">
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="card">
        <div class="card-body p-0">
          <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
          <div v-else-if="!companies.length" class="empty-state">
            <i class="bi bi-building"></i><p>No companies found</p>
          </div>
          <div v-else class="table-responsive">
            <table class="table table-hover mb-0">
              <thead><tr>
                <th>Company</th><th>Industry</th><th>HR Contact</th>
                <th>Status</th><th>Drives</th><th>Registered</th><th>Actions</th>
              </tr></thead>
              <tbody>
                <tr v-for="c in companies" :key="c.id">
                  <td>
                    <div class="fw-600">{{ c.company_name }}</div>
                    <div class="text-muted-custom small">{{ c.email }}</div>
                  </td>
                  <td><span class="small">{{ c.industry || '—' }}</span></td>
                  <td><span class="small">{{ c.hr_contact || '—' }}</span></td>
                  <td>
                    <span :class="['badge-status', 'badge-' + c.approval_status]">{{ c.approval_status }}</span>
                    <span v-if="c.is_blacklisted" class="badge-status badge-rejected ms-1">Blacklisted</span>
                  </td>
                  <td><span class="text-muted-custom">{{ c.total_drives }}</span></td>
                  <td><span class="text-muted-custom small">{{ formatDate(c.created_at) }}</span></td>
                  <td>
                    <div class="d-flex gap-1">
                      <button class="btn btn-sm btn-outline-light" @click="openModal(c)" :id="'view-company-' + c.id">
                        <i class="bi bi-eye"></i>
                      </button>
                      <button v-if="c.is_blacklisted" class="btn btn-sm btn-outline-success" @click="blacklist(c.id, 'unblacklist')" title="Un-blacklist">
                        <i class="bi bi-unlock"></i>
                      </button>
                      <button v-else class="btn btn-sm btn-outline-warning" @click="blacklist(c.id, 'blacklist')" title="Blacklist">
                        <i class="bi bi-slash-circle"></i>
                      </button>
                      <button class="btn btn-sm btn-outline-danger" @click="deleteCompany(c)" title="Permanently delete">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Detail Modal -->
      <div id="companyModal" class="modal fade" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content" v-if="selected">
            <div class="modal-header">
              <h5 class="modal-title">{{ selected.company_name }}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <table class="table table-sm mb-0">
                    <tr><td class="text-muted-custom">Email</td><td>{{ selected.email }}</td></tr>
                    <tr><td class="text-muted-custom">HR Contact</td><td>{{ selected.hr_contact || '—' }}</td></tr>
                    <tr><td class="text-muted-custom">HR Phone</td><td>{{ selected.hr_phone || '—' }}</td></tr>
                    <tr><td class="text-muted-custom">Website</td><td><a :href="selected.website" target="_blank">{{ selected.website || '—' }}</a></td></tr>
                    <tr><td class="text-muted-custom">Industry</td><td>{{ selected.industry || '—' }}</td></tr>
                    <tr><td class="text-muted-custom">HQ</td><td>{{ selected.headquarters || '—' }}</td></tr>
                    <tr><td class="text-muted-custom">Drives</td><td>{{ selected.total_drives }}</td></tr>
                    <tr><td class="text-muted-custom">Registered</td><td>{{ formatDate(selected.created_at) }}</td></tr>
                  </table>
                </div>
                <div class="col-md-6">
                  <p class="text-muted-custom small mb-1">Description</p>
                  <p class="small">{{ selected.description || 'No description provided.' }}</p>
                </div>
              </div>
              <div v-if="selected.approval_status !== 'approved'" class="mt-3">
                <label class="form-label">Rejection Reason {{ selected.approval_status === 'rejected' ? '(current)' : '(if rejecting)' }}</label>
                <textarea v-model="rejectReason" class="form-control" rows="2" placeholder="Provide a reason..."></textarea>
              </div>
            </div>
            <div class="modal-footer gap-2">
              <button v-if="selected.approval_status !== 'approved'" class="btn btn-success" @click="approve(selected.id)" :disabled="actionLoading">
                <span v-if="actionLoading" class="spinner-border spinner-border-sm me-1"></span>
                <i v-else class="bi bi-check-circle me-1"></i> Approve
              </button>
              <button v-if="selected.approval_status !== 'rejected'" class="btn btn-warning" @click="reject(selected.id)" :disabled="actionLoading">
                <i class="bi bi-x-circle me-1"></i> Reject
              </button>
              <button class="btn btn-danger" @click="deleteCompany(selected)">
                <i class="bi bi-trash me-1"></i> Delete Permanently
              </button>
              <button class="btn btn-outline-light" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
