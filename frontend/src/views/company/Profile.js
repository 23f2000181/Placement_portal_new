/* =====================================================================
   company/Profile.js — Stubs: this route is handled as /company dashboard
   ===================================================================== */
const CompanyProfileView = {
  name: 'CompanyProfileView',
  setup() {
    const profile = Vue.ref(null);
    const form    = Vue.reactive({});
    const loading  = Vue.ref(true);
    const saving   = Vue.ref(false);
    const editMode = Vue.ref(false);
    const error    = Vue.ref('');

    const load = async () => {
      try {
        const res = await Company.getProfile();
        profile.value = res.data;
        Object.assign(form, res.data);
      } catch { showToast('Error loading profile','danger'); }
      finally { loading.value = false; }
    };

    Vue.onMounted(load);

    const save = async () => {
      saving.value = true; error.value = '';
      try {
        await Company.updateProfile({ ...form });
        showToast('Profile updated!','success');
        editMode.value = false; load();
      } catch (e) { error.value = e.response?.data?.error || 'Error'; }
      finally { saving.value = false; }
    };

    return { profile, form, loading, saving, editMode, error, save, formatDate };
  },
  template: `
    <div>
      <div class="page-header d-flex justify-content-between align-items-center">
        <div><h2>Company Profile</h2></div>
        <button v-if="!editMode" class="btn btn-outline-light btn-sm" @click="editMode=true"><i class="bi bi-pencil me-1"></i>Edit</button>
        <button v-else class="btn btn-outline-light btn-sm" @click="editMode=false">Cancel</button>
      </div>
      <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
      <div v-else-if="profile" class="row g-3">
        <div class="col-md-4">
          <div class="card p-4 text-center">
            <div class="company-logo-placeholder mx-auto mb-3" style="width:64px;height:64px;font-size:1.8rem;border-radius:12px;">
              {{ profile.company_name?.[0]?.toUpperCase() }}
            </div>
            <h5 class="fw-700">{{ profile.company_name }}</h5>
            <div class="text-muted-custom">{{ profile.industry }}</div>
            <div class="mt-2"><span :class="['badge-status','badge-'+profile.approval_status]">{{ profile.approval_status }}</span></div>
            <div class="mt-3 text-start text-muted-custom small">
              <div v-if="profile.website"><i class="bi bi-globe me-1"></i><a :href="profile.website" target="_blank" class="text-primary-light">{{ profile.website }}</a></div>
              <div v-if="profile.headquarters"><i class="bi bi-geo-alt me-1"></i>{{ profile.headquarters }}</div>
              <div v-if="profile.hr_contact"><i class="bi bi-person me-1"></i>{{ profile.hr_contact }}</div>
              <div v-if="profile.hr_phone"><i class="bi bi-telephone me-1"></i>{{ profile.hr_phone }}</div>
            </div>
          </div>
        </div>
        <div class="col-md-8">
          <div class="card">
            <div class="card-header py-3">{{ editMode ? 'Edit Profile' : 'Company Details' }}</div>
            <div class="card-body">
              <div v-if="error" class="alert alert-danger">{{ error }}</div>
              <div v-if="!editMode">
                <p class="text-muted-custom small mb-1">About</p>
                <p>{{ profile.description || 'No description.' }}</p>
              </div>
              <div v-else class="row g-3">
                <div class="col-md-6"><label class="form-label">Company Name</label><input v-model="form.company_name" class="form-control"></div>
                <div class="col-md-6"><label class="form-label">Industry</label><input v-model="form.industry" class="form-control"></div>
                <div class="col-md-6"><label class="form-label">HR Contact</label><input v-model="form.hr_contact" class="form-control"></div>
                <div class="col-md-6"><label class="form-label">HR Phone</label><input v-model="form.hr_phone" class="form-control"></div>
                <div class="col-md-6"><label class="form-label">Website</label><input v-model="form.website" class="form-control"></div>
                <div class="col-md-6"><label class="form-label">Headquarters</label><input v-model="form.headquarters" class="form-control"></div>
                <div class="col-12"><label class="form-label">Description</label><textarea v-model="form.description" class="form-control" rows="3"></textarea></div>
                <div class="col-12"><button class="btn btn-primary" @click="save" :disabled="saving">Save</button></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
