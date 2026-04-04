/* =====================================================================
   student/Profile.js — View and edit student profile, upload resume
   ===================================================================== */
const StudentProfile = {
  name: 'StudentProfile',
  setup() {
    const profile = Vue.ref(null);
    const form    = Vue.reactive({});
    const loading  = Vue.ref(true);
    const saving   = Vue.ref(false);
    const resumeFile = Vue.ref(null);
    const uploadingResume = Vue.ref(false);
    const error    = Vue.ref('');
    const editMode = Vue.ref(false);

    const load = async () => {
      try {
        const res = await Student.getProfile();
        profile.value = res.data;
        Object.assign(form, { ...res.data });
      } catch { showToast('Error loading profile','danger'); }
      finally { loading.value = false; }
    };
    Vue.onMounted(load);

    const save = async () => {
      saving.value = true; error.value = '';
      try {
        await Student.updateProfile({ ...form });
        showToast('Profile updated!','success');
        editMode.value = false;
        load();
      } catch (e) { error.value = e.response?.data?.error || 'Error saving'; }
      finally { saving.value = false; }
    };

    const onResumeChange = (e) => { resumeFile.value = e.target.files[0]; };

    const uploadResume = async () => {
      if (!resumeFile.value) return;
      uploadingResume.value = true;
      try {
        const fd = new FormData();
        fd.append('resume', resumeFile.value);
        await Student.uploadResume(fd);
        showToast('Resume uploaded!','success');
        load();
      } catch (e) { showToast(e.response?.data?.error || 'Upload failed','danger'); }
      finally { uploadingResume.value = false; }
    };

    return { profile, form, loading, saving, uploadingResume, error, editMode, resumeFile, save, onResumeChange, uploadResume, formatDate };
  },
  template: `
    <div>
      <div class="page-header d-flex justify-content-between align-items-center">
        <div><h2>My Profile</h2><p>Manage your placement profile and resume.</p></div>
        <button v-if="!editMode" class="btn btn-outline-light btn-sm" @click="editMode=true"><i class="bi bi-pencil me-1"></i>Edit</button>
        <button v-else class="btn btn-outline-light btn-sm" @click="editMode=false"><i class="bi bi-x me-1"></i>Cancel</button>
      </div>
      <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
      <div v-else-if="profile" class="row g-3">
        <!-- Profile Card -->
        <div class="col-md-4">
          <div class="card text-center p-4">
            <div class="company-logo-placeholder mx-auto mb-3" style="width:64px;height:64px;font-size:1.8rem;border-radius:50%;">
              {{ profile.full_name?.[0]?.toUpperCase() }}
            </div>
            <h5 class="fw-700">{{ profile.full_name }}</h5>
            <div class="text-muted-custom mb-3">{{ profile.email }}</div>
            <div class="d-flex justify-content-between text-center border-top border-bottom py-3 mb-3" style="border-color:var(--dark-border)!important;">
              <div><div class="fw-700 text-primary fs-5">{{ profile.cgpa }}</div><div class="text-muted-custom small">CGPA</div></div>
              <div><div class="fw-700 fs-5">Y{{ profile.year }}</div><div class="text-muted-custom small">Year</div></div>
              <div><div class="fw-700 text-info fs-5">{{ profile.branch }}</div><div class="text-muted-custom small">Branch</div></div>
            </div>
            <div class="text-muted-custom small text-start">
              <div><i class="bi bi-hash me-1"></i><strong>USN:</strong> {{ profile.usn }}</div>
              <div v-if="profile.phone"><i class="bi bi-telephone me-1"></i>{{ profile.phone }}</div>
              <div v-if="profile.linkedin"><i class="bi bi-linkedin me-1"></i>
                <a :href="profile.linkedin" target="_blank" class="text-primary-light">LinkedIn</a>
              </div>
              <div v-if="profile.github"><i class="bi bi-github me-1"></i>
                <a :href="profile.github" target="_blank" class="text-primary-light">GitHub</a>
              </div>
            </div>
            <!-- Resume upload -->
            <div class="mt-3 pt-3 border-top" style="border-color:var(--dark-border)!important;">
              <p class="text-muted-custom small mb-2">
                <i class="bi bi-file-earmark-pdf me-1"></i>
                Resume: <strong>{{ profile.resume_filename || 'Not uploaded' }}</strong>
              </p>
              <input type="file" accept=".pdf,.doc,.docx" class="form-control form-control-sm mb-2" @change="onResumeChange">
              <button class="btn btn-sm btn-outline-primary w-100" @click="uploadResume" :disabled="!resumeFile || uploadingResume">
                <span v-if="uploadingResume" class="spinner-border spinner-border-sm me-1"></span>
                Upload Resume
              </button>
            </div>
          </div>
        </div>

        <!-- Edit Form / Display -->
        <div class="col-md-8">
          <div class="card">
            <div class="card-header py-3">{{ editMode ? 'Edit Profile' : 'Profile Details' }}</div>
            <div class="card-body">
              <div v-if="error" class="alert alert-danger">{{ error }}</div>
              <div v-if="!editMode">
                <div class="row g-3">
                  <div class="col-6"><label class="form-label">Skills</label><p>{{ profile.skills || '—' }}</p></div>
                  <div class="col-6"><label class="form-label">Address</label><p>{{ profile.address || '—' }}</p></div>
                  <div class="col-12"><label class="form-label">Member Since</label><p>{{ formatDate(profile.created_at) }}</p></div>
                </div>
              </div>
              <div v-else class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Full Name</label>
                  <input v-model="form.full_name" class="form-control">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Phone</label>
                  <input v-model="form.phone" class="form-control">
                </div>
                <div class="col-md-6">
                  <label class="form-label">CGPA</label>
                  <input v-model="form.cgpa" type="number" step="0.01" class="form-control">
                </div>
                <div class="col-md-6">
                  <label class="form-label">LinkedIn URL</label>
                  <input v-model="form.linkedin" class="form-control">
                </div>
                <div class="col-md-6">
                  <label class="form-label">GitHub URL</label>
                  <input v-model="form.github" class="form-control">
                </div>
                <div class="col-12">
                  <label class="form-label">Skills (comma-separated)</label>
                  <input v-model="form.skills" class="form-control" placeholder="Python, Java, React...">
                </div>
                <div class="col-12">
                  <label class="form-label">Address</label>
                  <textarea v-model="form.address" class="form-control" rows="2"></textarea>
                </div>
                <div class="col-12">
                  <button class="btn btn-primary" @click="save" :disabled="saving">
                    <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
