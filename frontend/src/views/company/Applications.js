/* =====================================================================
   company/Applications.js — View & manage applicants for a drive
   ===================================================================== */
const CompanyApplications = {
  name: 'CompanyApplications',
  setup() {
    const router = VueRouter.useRouter();
    const route  = VueRouter.useRoute();
    const driveId = route.params.id;

    const drive = Vue.ref(null);
    const apps  = Vue.ref([]);
    const loading = Vue.ref(true);
    const statusFilter = Vue.ref('');
    const selected = Vue.ref(null);
    const newStatus = Vue.ref('');
    const interviewDate = Vue.ref('');
    const notes = Vue.ref('');
    let modal = null;

    const load = async () => {
      loading.value = true;
      try {
        const res = await Company.driveApplications(driveId, { status: statusFilter.value });
        drive.value = res.data.drive;
        apps.value  = res.data.applications;
      } catch { showToast('Error loading applications','danger'); }
      finally { loading.value = false; }
    };

    Vue.onMounted(() => { load(); modal = new bootstrap.Modal(document.getElementById('appModal')); });

    const openModal = (a) => {
      selected.value = a;
      newStatus.value = a.status;
      interviewDate.value = a.interview_date ? a.interview_date.slice(0,16) : '';
      notes.value = a.company_notes || '';
      modal.show();
    };

    const updateStatus = async () => {
      try {
        await Company.updateAppStatus(selected.value.id, {
          status: newStatus.value,
          interview_date: interviewDate.value || undefined,
          notes: notes.value
        });
        showToast('Application updated!','success');
        modal.hide();
        load();
      } catch (e) { showToast(e.response?.data?.error || 'Error','danger'); }
    };

    return { drive, apps, loading, statusFilter, selected, newStatus, interviewDate, notes,
             openModal, updateStatus, load, formatDate, formatDateTime };
  },
  template: `
    <div>
      <div class="page-header d-flex align-items-start gap-3">
        <button class="btn btn-sm btn-outline-light mt-1" @click="$router.back()"><i class="bi bi-arrow-left"></i></button>
        <div>
          <h2>{{ drive?.job_title || 'Applications' }}</h2>
          <p>{{ drive?.location }} · {{ drive?.job_type }}</p>
        </div>
      </div>

      <div class="card mb-4"><div class="card-body py-3">
        <div class="d-flex gap-2 flex-wrap">
          <button v-for="s in ['', 'applied', 'shortlisted', 'selected', 'rejected']" :key="s"
            :class="['btn btn-sm', statusFilter===s ? 'btn-primary' : 'btn-outline-light']"
            @click="statusFilter=s; load()">
            {{ s || 'All' }}
          </button>
        </div>
      </div></div>

      <div class="card">
        <div class="card-header py-3 d-flex justify-content-between">
          <span>{{ apps.length }} applicant(s)</span>
        </div>
        <div class="card-body p-0">
          <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
          <div v-else-if="!apps.length" class="empty-state"><i class="bi bi-people"></i><p>No applicants yet</p></div>
          <div v-else class="table-responsive">
            <table class="table table-hover mb-0">
              <thead><tr><th>Student</th><th>USN</th><th>Branch</th><th>CGPA</th><th>Applied</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                <tr v-for="a in apps" :key="a.id">
                  <td>
                    <div class="fw-600">{{ a.student?.full_name }}</div>
                    <div class="text-muted-custom small">{{ a.student?.email }}</div>
                  </td>
                  <td><span class="badge bg-secondary">{{ a.student?.usn }}</span></td>
                  <td>{{ a.student?.branch }}</td>
                  <td><span class="fw-600">{{ a.student?.cgpa }}</span></td>
                  <td><span class="small text-muted-custom">{{ formatDate(a.applied_at) }}</span></td>
                  <td><span :class="['badge-status','badge-'+a.status]">{{ a.status }}</span></td>
                  <td>
                    <div class="d-flex gap-1">
                      <button class="btn btn-sm btn-outline-light" @click="openModal(a)"><i class="bi bi-pencil-square"></i> Update</button>
                      <a v-if="a.student?.has_resume" :href="'/api/student/profile/resume'" class="btn btn-sm btn-outline-light" target="_blank">
                        <i class="bi bi-file-earmark-pdf"></i>
                      </a>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Update Modal -->
      <div id="appModal" class="modal fade" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content" v-if="selected">
            <div class="modal-header">
              <h5 class="modal-title">Update: {{ selected.student?.full_name }}</h5>
              <button class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Application Status</label>
                <select v-model="newStatus" class="form-select">
                  <option>applied</option>
                  <option>shortlisted</option>
                  <option>selected</option>
                  <option>rejected</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label">Interview Date (optional)</label>
                <input v-model="interviewDate" type="datetime-local" class="form-control">
              </div>
              <div class="mb-3">
                <label class="form-label">Notes (optional)</label>
                <textarea v-model="notes" class="form-control" rows="2"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-primary" @click="updateStatus"><i class="bi bi-check me-1"></i>Update</button>
              <button class="btn btn-outline-light" data-bs-dismiss="modal">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
