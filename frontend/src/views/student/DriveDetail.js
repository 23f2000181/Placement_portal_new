/* =====================================================================
   student/DriveDetail.js — Drive details + apply + my applications list
   ===================================================================== */
const StudentDriveDetail = {
  name: 'StudentDriveDetail',
  setup() {
    const route  = VueRouter.useRoute();
    const router = VueRouter.useRouter();
    const driveId = route.params.id;
    const drive  = Vue.ref(null);
    const loading = Vue.ref(true);
    const applying = Vue.ref(false);
    const myApps = Vue.ref([]);
    const loadingApps = Vue.ref(true);

    const load = async () => {
      try { const res = await Student.getDrive(driveId); drive.value = res.data; }
      catch { showToast('Drive not found','danger'); router.back(); }
      finally { loading.value = false; }
    };

    const loadApps = async () => {
      try { const res = await Student.myApplications(); myApps.value = res.data.applications.slice(0,5); }
      finally { loadingApps.value = false; }
    };

    Vue.onMounted(() => { load(); loadApps(); });

    const apply = async () => {
      applying.value = true;
      try {
        await Student.apply(driveId, {});
        showToast('Application submitted successfully!','success');
        load();
      } catch (e) { showToast(e.response?.data?.error || 'Application failed','danger'); }
      finally { applying.value = false; }
    };

    return { drive, loading, applying, myApps, loadingApps, apply, formatDate, daysFromNow };
  },
  template: `
    <div>
      <div class="page-header d-flex align-items-start gap-3">
        <button class="btn btn-sm btn-outline-light mt-1" @click="$router.back()"><i class="bi bi-arrow-left"></i></button>
        <div><h2>{{ drive?.job_title || 'Drive Details' }}</h2><p>{{ drive?.company_name }}</p></div>
      </div>

      <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
      <div v-else-if="drive" class="row g-3">
        <div class="col-md-8">
          <div class="card mb-3">
            <div class="card-body">
              <div class="d-flex align-items-start gap-3 mb-4">
                <div class="company-logo-placeholder" style="width:56px;height:56px;font-size:1.5rem;">
                  {{ drive.company_name?.[0]?.toUpperCase() }}
                </div>
                <div>
                  <h4 class="fw-800 mb-0">{{ drive.job_title }}</h4>
                  <div class="text-muted-custom">{{ drive.company_name }}</div>
                  <div class="d-flex gap-2 mt-2 flex-wrap">
                    <span class="badge bg-secondary">{{ drive.job_type }}</span>
                    <span class="badge bg-secondary"><i class="bi bi-geo-alt me-1"></i>{{ drive.location || 'Remote' }}</span>
                    <span class="badge bg-secondary"><i class="bi bi-laptop me-1"></i>{{ drive.interview_mode }}</span>
                  </div>
                </div>
              </div>

              <div class="row g-3 mb-4">
                <div class="col-4 text-center">
                  <div class="stat-card success p-3">
                    <div class="fw-800 fs-4 text-success">{{ drive.package_lpa ? drive.package_lpa + ' LPA' : '—' }}</div>
                    <div class="text-muted-custom small">Package</div>
                  </div>
                </div>
                <div class="col-4 text-center">
                  <div class="stat-card info p-3">
                    <div class="fw-800 fs-4 text-info">{{ drive.applicant_count }}</div>
                    <div class="text-muted-custom small">Applicants</div>
                  </div>
                </div>
                <div class="col-4 text-center">
                  <div class="stat-card warning p-3">
                    <div class="fw-800 fs-4 text-warning">{{ drive.min_cgpa || '0' }}+</div>
                    <div class="text-muted-custom small">Min CGPA</div>
                  </div>
                </div>
              </div>

              <h6 class="fw-700 mb-2">Job Description</h6>
              <p style="white-space:pre-wrap;line-height:1.7;" class="text-light">{{ drive.job_description }}</p>

              <div v-if="drive.rounds" class="mt-3">
                <h6 class="fw-700 mb-2">Interview Rounds</h6>
                <p class="text-light">{{ drive.rounds }}</p>
              </div>

              <div class="row g-2 mt-3 text-sm">
                <div class="col-md-6">
                  <div class="p-3 rounded" style="background:rgba(255,255,255,0.03);border:1px solid var(--dark-border);">
                    <p class="text-muted-custom small mb-1">Eligible Branches</p>
                    <p class="fw-600 mb-0">{{ drive.eligible_branches === 'ALL' ? 'All Branches' : drive.eligible_branches }}</p>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="p-3 rounded" style="background:rgba(255,255,255,0.03);border:1px solid var(--dark-border);">
                    <p class="text-muted-custom small mb-1">Eligible Years</p>
                    <p class="fw-600 mb-0">{{ drive.eligible_years === 'ALL' ? 'All Years' : 'Year ' + drive.eligible_years }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="col-md-4">
          <div class="card mb-3">
            <div class="card-body">
              <div class="mb-3">
                <div class="text-muted-custom small mb-1">Application Deadline</div>
                <div class="fw-700">{{ formatDate(drive.application_deadline) }}</div>
                <div v-if="daysFromNow(drive.application_deadline) !== null"
                     :class="['small mt-1', daysFromNow(drive.application_deadline) <= 3 ? 'text-danger' : 'text-muted-custom']">
                  {{ daysFromNow(drive.application_deadline) > 0 ? daysFromNow(drive.application_deadline) + ' days remaining' : 'Deadline passed' }}
                </div>
              </div>
              <div class="mb-3" v-if="drive.drive_date">
                <div class="text-muted-custom small mb-1">Drive Date</div>
                <div class="fw-700">{{ formatDate(drive.drive_date) }}</div>
              </div>

              <div v-if="!drive.is_eligible" class="alert alert-danger py-2 mb-3">
                <i class="bi bi-exclamation-triangle me-1"></i>
                You are not eligible for this drive.
                <ul class="mb-0 mt-1 ps-3" style="font-size:0.85rem;">
                  <li v-for="r in drive.eligibility_reasons" :key="r">{{ r }}</li>
                </ul>
              </div>

              <div v-else-if="drive.application">
                <div class="alert alert-success py-2">
                  <i class="bi bi-check-circle me-1"></i> Already Applied
                  <span :class="['badge-status ms-2 badge-'+drive.application.status]">{{ drive.application.status }}</span>
                </div>
              </div>
              <div v-else>
                <button class="btn btn-primary w-100 py-2" @click="apply" :disabled="applying">
                  <span v-if="applying" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="bi bi-send me-1"></i>
                  {{ applying ? 'Submitting...' : 'Apply Now' }}
                </button>
              </div>

              <div class="mt-3" v-if="drive.company_website">
                <a :href="drive.company_website" target="_blank" class="btn btn-outline-light w-100 btn-sm">
                  <i class="bi bi-globe me-1"></i> Company Website
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};

/* =====================================================================
   student/Applications.js — My applications list
   ===================================================================== */
const StudentApplications = {
  name: 'StudentApplications',
  setup() {
    const apps = Vue.ref([]);
    const loading = Vue.ref(true);
    const exporting = Vue.ref(false);
    const exportTaskId = Vue.ref(null);
    const exportProgress = Vue.ref(0);

    const load = async () => {
      try { const res = await Student.myApplications(); apps.value = res.data.applications; }
      catch { showToast('Error loading applications','danger'); }
      finally { loading.value = false; }
    };
    Vue.onMounted(load);

    const triggerExport = async () => {
      exporting.value = true;
      exportProgress.value = 10;
      try {
        // Always attempt the sync path first via fetch() so it works without Celery
        const token = localStorage.getItem('ppa_token');
        const res = await fetch('/api/student/applications/export', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          showToast(j.error || 'Export failed', 'danger');
          return;
        }

        const contentType = res.headers.get('Content-Type') || '';
        
        if (contentType.includes('text/csv') || contentType.includes('octet-stream')) {
          // Sync CSV returned directly — download it
          exportProgress.value = 100;
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'my_applications.csv';
          a.click();
          URL.revokeObjectURL(url);
          showToast('CSV downloaded!', 'success');
        } else {
          // Celery async task — poll for completion
          const data = await res.json();
          if (data.task_id) {
            exportTaskId.value = data.task_id;
            exportProgress.value = 30;
            pollExport();
          } else {
            showToast('Export started', 'info');
          }
        }
      } catch (e) {
        showToast('Export failed: ' + (e.message || 'Unknown error'), 'danger');
      } finally {
        if (!exportTaskId.value) exporting.value = false;
      }
    };

    const pollExport = async () => {
      if (!exportTaskId.value) return;
      const taskId = exportTaskId.value; // capture before clearing
      try {
        const res = await Student.exportStatus(taskId);
        if (res.data.ready) {
          exportProgress.value = 100;
          showToast('Export ready! Downloading...', 'success');
          // Fetch the file with auth headers (plain a.click() won't include JWT)
          const token = localStorage.getItem('ppa_token');
          const dlRes = await fetch(`/api/student/export/download/${taskId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (dlRes.ok) {
            const blob = await dlRes.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'my_applications.csv';
            a.click();
            URL.revokeObjectURL(url);
          } else {
            showToast('Download failed — try again', 'danger');
          }
          exporting.value = false;
          exportTaskId.value = null;
        } else {
          exportProgress.value = res.data.result?.current || 60;
          setTimeout(pollExport, 1500);
        }
      } catch { exporting.value = false; exportTaskId.value = null; }
    };

    return { apps, loading, exporting, exportProgress, load, triggerExport, formatDate, formatDateTime };
  },
  template: `
    <div>
      <div class="page-header d-flex justify-content-between align-items-center">
        <div><h2>My Applications</h2><p>Track the status of all your placement applications.</p></div>
        <button class="btn btn-outline-light btn-sm" @click="triggerExport" :disabled="exporting">
          <span v-if="exporting" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-download me-1"></i>
          {{ exporting ? 'Exporting...' : 'Export CSV' }}
        </button>
      </div>
      <div v-if="exporting" class="mb-3">
        <div class="progress"><div class="progress-bar" :style="'width:'+exportProgress+'%'"></div></div>
        <div class="text-muted-custom small mt-1">Preparing your CSV export...</div>
      </div>
      <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
      <div v-else-if="!apps.length" class="empty-state">
        <i class="bi bi-file-earmark-text"></i>
        <p>No applications yet. <router-link to="/student">Browse drives</router-link> to apply.</p>
      </div>
      <div v-else class="row g-3">
        <div v-for="a in apps" :key="a.id" class="col-12">
          <div class="card">
            <div class="card-body">
              <div class="d-flex align-items-start gap-3">
                <div class="company-logo-placeholder" style="flex-shrink:0;">
                  {{ a.drive?.company_name?.[0]?.toUpperCase() || '?' }}
                </div>
                <div class="flex-grow-1">
                  <div class="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 class="fw-700 mb-0">{{ a.drive?.job_title }}</h6>
                      <div class="text-muted-custom small">{{ a.drive?.company_name }} · {{ a.drive?.location || 'Remote' }}</div>
                    </div>
                    <span :class="['badge-status','badge-'+a.status]">{{ a.status }}</span>
                  </div>
                  <div class="row g-2 mt-2 text-muted-custom" style="font-size:0.82rem;">
                    <div class="col-auto"><i class="bi bi-calendar3 me-1"></i>Applied: {{ formatDate(a.applied_at) }}</div>
                    <div class="col-auto" v-if="a.interview_date"><i class="bi bi-camera-video me-1"></i>Interview: {{ formatDate(a.interview_date) }}</div>
                    <div class="col-auto" v-if="a.drive?.package_lpa"><i class="bi bi-currency-rupee me-1"></i>{{ a.drive.package_lpa }} LPA</div>
                  </div>
                  <div v-if="a.company_notes" class="mt-2 p-2 rounded" style="background:rgba(255,255,255,0.04);font-size:0.85rem;">
                    <i class="bi bi-chat-text me-1 text-info"></i><em>{{ a.company_notes }}</em>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
