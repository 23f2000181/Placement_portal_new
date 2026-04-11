/* =====================================================================
   admin/Students.js
   ===================================================================== */
const AdminStudents = {
  name: 'AdminStudents',
  setup() {
    const students = Vue.ref([]);
    const loading  = Vue.ref(true);
    const search   = Vue.ref('');
    const branch   = Vue.ref('');
    const year     = Vue.ref('');
    const selected = Vue.ref(null);
    let modal = null;

    const load = async () => {
      loading.value = true;
      try {
        const res = await Admin.students({ q: search.value, branch: branch.value, year: year.value });
        students.value = res.data.students;
      } catch { showToast('Failed to load students','danger'); }
      finally { loading.value = false; }
    };

    Vue.onMounted(() => { load(); modal = new bootstrap.Modal(document.getElementById('studentModal')); });

    const openModal = async (s) => {
      const res = await Admin.getStudent(s.id);
      selected.value = res.data;
      modal.show();
    };

    const toggleBlacklist = async (id, current) => {
      const action = current ? 'unblacklist' : 'blacklist';
      await Admin.blacklistStudent(id, action);
      showToast(action === 'blacklist' ? 'Student blacklisted' : 'Student un-blacklisted', 'warning');
      load();
      if (selected.value?.id === id) modal.hide();
    };

    const deleteStudent = async (s) => {
      if (!confirm(`Permanently delete "${s.full_name || s.usn}" and ALL their data? This cannot be undone.`)) return;
      try {
        await Admin.deleteStudent(s.id);
        showToast('Student permanently deleted', 'danger');
        modal.hide();
        load();
      } catch (e) { showToast(e.response?.data?.error || 'Delete failed', 'danger'); }
    };

    let timer;
    const onSearch = () => { clearTimeout(timer); timer = setTimeout(load, 350); };

    return { students, loading, search, branch, year, selected, openModal, toggleBlacklist, deleteStudent, onSearch, load, formatDate };
  },
  template: `
    <div>
      <div class="page-header">
        <h2>Students</h2><p>Manage student accounts and view placement activity.</p>
      </div>
      <div class="card mb-4">
        <div class="card-body py-3">
          <div class="row g-2">
            <div class="col-md-5">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-search"></i></span>
                <input v-model="search" @input="onSearch" class="form-control" placeholder="Search by name or USN...">
              </div>
            </div>
            <div class="col-md-3">
              <input v-model="branch" @change="load" class="form-control" placeholder="Filter by branch">
            </div>
            <div class="col-md-2">
              <select v-model="year" @change="load" class="form-select">
                <option value="">All Years</option>
                <option value="1">1st Year</option><option value="2">2nd Year</option>
                <option value="3">3rd Year</option><option value="4">4th Year</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-body p-0">
          <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
          <div v-else-if="!students.length" class="empty-state"><i class="bi bi-people"></i><p>No students found</p></div>
          <div v-else class="table-responsive">
            <table class="table table-hover mb-0">
              <thead><tr><th>Student</th><th>USN</th><th>Branch</th><th>CGPA</th><th>Year</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                <tr v-for="s in students" :key="s.id">
                  <td><div class="fw-600">{{ s.full_name }}</div><div class="text-muted-custom small">{{ s.email }}</div></td>
                  <td><span class="badge bg-secondary">{{ s.usn }}</span></td>
                  <td>{{ s.branch }}</td>
                  <td><span class="fw-600">{{ s.cgpa }}</span></td>
                  <td>Y{{ s.year }}</td>
                  <td>
                    <span v-if="s.is_blacklisted" class="badge-status badge-rejected">Blacklisted</span>
                    <span v-else-if="!s.is_active" class="badge-status badge-closed">Inactive</span>
                    <span v-else class="badge-status badge-approved">Active</span>
                  </td>
                  <td>
                    <div class="d-flex gap-1">
                      <button class="btn btn-sm btn-outline-light" @click="openModal(s)"><i class="bi bi-eye"></i></button>
                      <button :class="['btn btn-sm', s.is_blacklisted ? 'btn-outline-success' : 'btn-outline-warning']"
                              @click="toggleBlacklist(s.id, s.is_blacklisted)" :title="s.is_blacklisted ? 'Un-blacklist' : 'Blacklist'">
                        <i :class="['bi', s.is_blacklisted ? 'bi-unlock' : 'bi-slash-circle']"></i>
                      </button>
                      <button class="btn btn-sm btn-outline-danger" @click="deleteStudent(s)" title="Permanently delete">
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
      <!-- Modal -->
      <div id="studentModal" class="modal fade" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content" v-if="selected">
            <div class="modal-header">
              <h5 class="modal-title">{{ selected.full_name }} <span class="badge bg-secondary ms-2">{{ selected.usn }}</span></h5>
              <button class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <table class="table table-sm mb-0">
                    <tr><td class="text-muted-custom">Email</td><td>{{ selected.email }}</td></tr>
                    <tr><td class="text-muted-custom">Branch</td><td>{{ selected.branch }}</td></tr>
                    <tr><td class="text-muted-custom">CGPA</td><td>{{ selected.cgpa }}</td></tr>
                    <tr><td class="text-muted-custom">Year</td><td>{{ selected.year }}</td></tr>
                    <tr><td class="text-muted-custom">Phone</td><td>{{ selected.phone || '—' }}</td></tr>
                    <tr><td class="text-muted-custom">Skills</td><td>{{ selected.skills || '—' }}</td></tr>
                  </table>
                </div>
                <div class="col-md-6">
                  <p class="fw-600 mb-2">Applications ({{ selected.applications?.length || 0 }})</p>
                  <div style="max-height:200px;overflow-y:auto;">
                    <div v-for="a in selected.applications" :key="a.id" class="d-flex justify-content-between border-bottom py-1" style="border-color:var(--dark-border)!important;">
                      <span class="small">{{ a.drive?.job_title }} @ {{ a.drive?.company_name }}</span>
                      <span :class="['badge-status','badge-'+a.status]" style="font-size:0.7rem;">{{ a.status }}</span>
                    </div>
                    <p v-if="!selected.applications?.length" class="text-muted-custom small">No applications yet</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button :class="['btn', selected.is_blacklisted ? 'btn-outline-success' : 'btn-warning']"
                      @click="toggleBlacklist(selected.id, selected.is_blacklisted)">
                <i :class="['bi me-1', selected.is_blacklisted ? 'bi-unlock' : 'bi-slash-circle']"></i>
                {{ selected.is_blacklisted ? 'Un-blacklist' : 'Blacklist' }}
              </button>
              <button class="btn btn-danger" @click="deleteStudent(selected)">
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
