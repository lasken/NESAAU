
async function hashPassword(password) {
  const buf = await crypto.subtle.digest(
    'SHA-256', new TextEncoder().encode(password)
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2,'0')).join('');
}

let allSubmissions = [];
let allMembers     = [];

// ============================================================
// ADMIN LOGIN / LOGOUT
// ============================================================
async function adminLogin() {
  const email    = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;
  const msg      = document.getElementById('adminLoginMsg');

  if (!email || !password) {
    showAdminMsg(msg, 'error', '⚠️ Enter email and password.');
    return;
  }
  msg.className     = 'auth-msg info';
  msg.innerHTML     = '⏳ Logging in...';
  msg.style.display = 'block';

  const hashed = await hashPassword(password);

  const { data: admin, error } = await supabase
    .from('admins')
    .select('*')
    .eq('email', email)
    .eq('password_hash', hashed)
    .single();

  if (error || !admin) {
    showAdminMsg(msg, 'error', '❌ Invalid credentials.');
    return;
  }

  localStorage.setItem('nesaau_admin', JSON.stringify(admin));
  showDashboard();
}

function adminLogout() {
  localStorage.removeItem('nesaau_admin');
  location.reload();
}

function showDashboard() {
  document.getElementById('adminLoginScreen').style.display = 'none';
  document.getElementById('adminDashboard').style.display  = 'flex';
  // Load default panel
  loadSubmissions();
}

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('nesaau_admin');
  if (saved) {
    showDashboard();
  }
});

// ============================================================
// PANEL SWITCHING — single clean function, no overrides
// ============================================================
function showPanel(name, btn) {
  document.querySelectorAll('.admin-panel')
    .forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.admin-nav-link')
    .forEach(l => l.classList.remove('active'));

  const panel = document.getElementById('panel-' + name);
  if (panel) panel.classList.add('active');
  if (btn)   btn.classList.add('active');

  if (name === 'submissions')   loadSubmissions();
  if (name === 'members')       loadMembers();
  if (name === 'stats')         loadStats();
  if (name === 'executives')    loadCurrentExecAdmin();
  if (name === 'pastadmins')    loadPastAdminAdmin();
  if (name === 'announcements') loadAdminAnnouncements();
  if (name === 'spotlight')     loadAdminSpotlight();
}

// ============================================================
// DUES SUBMISSIONS
// ============================================================
async function loadSubmissions() {
  const container = document.getElementById('submissionsList');
  if (!container) return;
  container.innerHTML = '<div class="loading-state">Loading submissions...</div>';

  const { data, error } = await supabase
    .from('dues_submissions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = `<div class="empty-state">❌ Error: ${error.message}</div>`;
    return;
  }

  allSubmissions = data || [];

  if (!allSubmissions.length) {
    container.innerHTML = '<div class="empty-state">No submissions yet. When students submit receipts, they will appear here.</div>';
    return;
  }

  renderSubmissions(allSubmissions);
}

function filterSubmissions(status, btn) {
  document.querySelectorAll('.filter-btn')
    .forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filtered = status === 'all'
    ? allSubmissions
    : allSubmissions.filter(s => s.status === status);
  renderSubmissions(filtered);
}

function renderSubmissions(list) {
  const container = document.getElementById('submissionsList');
  if (!list.length) {
    container.innerHTML = '<div class="empty-state">No submissions match this filter.</div>';
    return;
  }
  container.innerHTML = list.map(s => `
    <div class="submission-card ${s.status}" id="sub-${s.id}">
      <div class="sub-info">
        <strong>${s.full_name}</strong>
        <span>${s.matric_number} &bull; ${s.level} Level</span>
        <span class="sub-date">${new Date(s.created_at)
          .toLocaleDateString('en-NG', {
            day:'numeric', month:'short', year:'numeric'
          })}</span>
      </div>
      <div class="sub-status-badge ${s.status}">${statusLabel(s.status)}</div>
      <div class="sub-actions">
        ${s.receipt_url && s.receipt_url !== 'null'
          ? `<a href="${s.receipt_url}" target="_blank" class="btn-view-receipt">
               👁 View Receipt
             </a>`
          : `<span style="font-size:.78rem;color:var(--gray);">No receipt file</span>`
        }
        ${s.status === 'pending' ? `
          <button class="btn-approve"
            onclick="updateSubmission('${s.id}','${s.member_id}','paid')">
            ✅ Approve
          </button>
          <button class="btn-reject"
            onclick="updateSubmission('${s.id}','${s.member_id}','rejected')">
            ❌ Reject
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

async function updateSubmission(submissionId, memberId, newStatus) {
  // Update submission
  const { error: subErr } = await supabase
    .from('dues_submissions')
    .update({ status: newStatus })
    .eq('id', submissionId);

  if (subErr) { alert('Error updating submission: ' + subErr.message); return; }

  // Update member dues_status
  const { error: memErr } = await supabase
    .from('members')
    .update({ dues_status: newStatus })
    .eq('id', memberId);

  if (memErr) { alert('Error updating member: ' + memErr.message); return; }

  // Refresh
  loadSubmissions();
  loadStats();
}

function statusLabel(s) {
  if (s === 'paid')     return '✅ Approved';
  if (s === 'pending')  return '⏳ Pending';
  if (s === 'rejected') return '❌ Rejected';
  return s;
}

// ============================================================
// ALL MEMBERS
// ============================================================
async function loadMembers() {
  const tbody = document.getElementById('membersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="loading-state">Loading members...</td></tr>';

  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('full_name');

  if (error) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">❌ ${error.message}</td></tr>`;
    return;
  }

  allMembers = data || [];

  if (!allMembers.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No members registered yet.</td></tr>';
    return;
  }

  renderMembers(allMembers);
}

function filterMembers() {
  const q = document.getElementById('memberSearch').value.toLowerCase();
  const filtered = allMembers.filter(m =>
    m.full_name.toLowerCase().includes(q) ||
    m.matric_number.toLowerCase().includes(q)
  );
  renderMembers(filtered);
}

function renderMembers(list) {
  const tbody = document.getElementById('membersTableBody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No members found.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(m => `
    <tr>
      <td>${m.full_name}</td>
      <td>${m.matric_number}</td>
      <td>${m.level} Level</td>
      <td>
        <span class="status-chip ${m.dues_status}">
          ${statusLabel(m.dues_status || 'unpaid')}
        </span>
      </td>
      <td>
        <select onchange="manualUpdateStatus('${m.id}', this.value)"
                class="status-select">
          <option value="">Change status</option>
          <option value="unpaid">Unpaid</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
        </select>
      </td>
    </tr>
  `).join('');
}

async function manualUpdateStatus(memberId, newStatus) {
  if (!newStatus) return;
  await supabase
    .from('members')
    .update({ dues_status: newStatus })
    .eq('id', memberId);
  loadMembers();
  loadStats();
}

// ============================================================
// STATS
// ============================================================
async function loadStats() {
  const { data, error } = await supabase
    .from('members')
    .select('dues_status');

  if (error || !data) return;

  const total   = data.length;
  const paid    = data.filter(m => m.dues_status === 'paid').length;
  const pending = data.filter(m => m.dues_status === 'pending').length;
  const unpaid  = data.filter(m => m.dues_status === 'unpaid' || !m.dues_status).length;

  const el = id => document.getElementById(id);
  if (el('statTotal'))   el('statTotal').textContent   = total;
  if (el('statPaid'))    el('statPaid').textContent    = paid;
  if (el('statPending')) el('statPending').textContent = pending;
  if (el('statUnpaid'))  el('statUnpaid').textContent  = unpaid;
}

async function resetSession() {
  const confirmed = confirm(
    '⚠️ This will reset ALL dues to "unpaid" for the new session. Continue?'
  );
  if (!confirmed) return;
  await supabase
    .from('members')
    .update({ dues_status: 'unpaid', session: '2025/2026' });
  alert('✅ All dues reset for 2025/2026.');
  loadStats();
}

// ============================================================
// EXEC CMS (legacy — from original build)
// ============================================================
async function loadExecCms() {
  loadCurrentExecAdmin();
}

// ============================================================
// CURRENT EXECUTIVES
// ============================================================
async function loadCurrentExecAdmin() {
  const list = document.getElementById('currentExecList');
  if (!list) return;
  list.innerHTML = '<div class="loading-state">Loading executives...</div>';

  const { data, error } = await supabase
    .from('current_executives')
    .select('*')
    .order('order_index');

  if (error) {
    list.innerHTML = `<div class="empty-state">❌ ${error.message}</div>`;
    return;
  }

  if (!data || !data.length) {
    list.innerHTML = '<div class="empty-state">No executives added yet. Use the form above to add them.</div>';
    return;
  }

  list.innerHTML = data.map(ex => {
    const initials = ex.full_name
      .split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
    return `
      <div class="admin-list-item">
        <div style="display:flex;align-items:center;gap:12px;">
          ${ex.photo_url
            ? `<img src="${ex.photo_url}"
                    style="width:44px;height:44px;border-radius:50%;
                           object-fit:cover;border:2px solid var(--gold)"/>`
            : `<div style="width:44px;height:44px;border-radius:50%;
                           background:var(--blue);display:grid;
                           place-items:center;color:var(--gold);
                           font-weight:800;font-size:.85rem;">
                 ${initials}
               </div>`
          }
          <div class="admin-list-item-info">
            <strong>${ex.full_name}</strong>
            <span>${ex.role} &bull; ${ex.level} Level</span>
          </div>
        </div>
        <button class="btn-admin-delete"
                onclick="deleteCurrentExec('${ex.id}')">
          🗑 Remove
        </button>
      </div>
    `;
  }).join('');
}

async function addCurrentExec() {
  const name    = document.getElementById('newExecName').value.trim();
  const role    = document.getElementById('newExecRole').value.trim();
  const level   = document.getElementById('newExecLevel').value;
  const photoEl = document.getElementById('newExecPhoto');
  const msg     = document.getElementById('addExecMsg');

  if (!name || !role) {
    msg.className = 'admin-form-msg error';
    msg.innerHTML = '⚠️ Name and role are required.';
    return;
  }

  msg.className = 'admin-form-msg success';
  msg.innerHTML = '⏳ Adding...';

  let photo_url = null;

  if (photoEl.files && photoEl.files[0]) {
    const file     = photoEl.files[0];
    const fileName = `executives/${Date.now()}.${file.name.split('.').pop()}`;
    const { error: upErr } = await supabase.storage
      .from('exec-photos')
      .upload(fileName, file, { upsert: true });
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage
        .from('exec-photos').getPublicUrl(fileName);
      photo_url = publicUrl;
    }
  }

  const { data: countData } = await supabase
    .from('current_executives')
    .select('id', { count: 'exact' });

  const { error } = await supabase
    .from('current_executives')
    .insert({
      full_name:   name,
      role,
      level,
      photo_url,
      order_index: (countData?.length || 0) + 1
    });

  if (error) {
    msg.className = 'admin-form-msg error';
    msg.innerHTML = '❌ ' + error.message;
    return;
  }

  msg.innerHTML = '✅ Executive added!';
  document.getElementById('newExecName').value  = '';
  document.getElementById('newExecRole').value  = '';
  document.getElementById('newExecPhoto').value = '';
  loadCurrentExecAdmin();
}

async function deleteCurrentExec(id) {
  if (!confirm('Remove this executive?')) return;
  await supabase.from('current_executives').delete().eq('id', id);
  loadCurrentExecAdmin();
}

// ============================================================
// PAST ADMINISTRATIONS
// ============================================================
async function archiveCurrentExecs() {
  const adminName = document.getElementById('archiveName').value.trim();
  const year      = document.getElementById('archiveYear').value.trim();
  const msg       = document.getElementById('archiveMsg');

  if (!adminName || !year) {
    msg.className = 'admin-form-msg error';
    msg.innerHTML = '⚠️ Administration name and year are required.';
    return;
  }

  if (!confirm(`Archive current executives as "${adminName} (${year})"? This will clear the current list.`)) return;

  msg.className = 'admin-form-msg success';
  msg.innerHTML = '⏳ Archiving...';

  const { data: currentExecs } = await supabase
    .from('current_executives')
    .select('*')
    .order('order_index');

  if (!currentExecs || !currentExecs.length) {
    msg.className = 'admin-form-msg error';
    msg.innerHTML = '⚠️ No current executives to archive.';
    return;
  }

  const { data: pastAdmin, error: adminErr } = await supabase
    .from('past_administrations')
    .insert({ admin_name: adminName, session_year: year })
    .select()
    .single();

  if (adminErr) {
    msg.className = 'admin-form-msg error';
    msg.innerHTML = '❌ ' + adminErr.message;
    return;
  }

  await supabase.from('past_executives').insert(
    currentExecs.map(ex => ({
      administration_id: pastAdmin.id,
      full_name:         ex.full_name,
      role:              ex.role,
      level:             ex.level,
      photo_url:         ex.photo_url,
      order_index:       ex.order_index
    }))
  );

  // Clear current executives
  for (const ex of currentExecs) {
    await supabase.from('current_executives').delete().eq('id', ex.id);
  }

  msg.innerHTML = `✅ Archived as "${adminName} (${year})". Add new executives now.`;
  document.getElementById('archiveName').value = '';
  document.getElementById('archiveYear').value = '';
  loadCurrentExecAdmin();
  loadPastAdminAdmin();
}

async function loadPastAdminAdmin() {
  const list = document.getElementById('pastAdminAdminList');
  if (!list) return;
  list.innerHTML = '<div class="loading-state">Loading...</div>';

  const { data, error } = await supabase
    .from('past_administrations')
    .select('*')
    .order('archived_at', { ascending: false });

  if (error) {
    list.innerHTML = `<div class="empty-state">❌ ${error.message}</div>`;
    return;
  }

  if (!data || !data.length) {
    list.innerHTML = '<div class="empty-state">No past administrations archived yet.</div>';
    return;
  }

  list.innerHTML = data.map(a => `
    <div class="admin-list-item">
      <div class="admin-list-item-info">
        <strong>${a.admin_name}</strong>
        <span>${a.session_year} &bull; Archived ${
          new Date(a.archived_at).toLocaleDateString('en-NG')
        }</span>
      </div>
      <button class="btn-admin-delete" onclick="deletePastAdmin('${a.id}')">
        🗑 Delete
      </button>
    </div>
  `).join('');
}

async function deletePastAdmin(id) {
  if (!confirm('Delete this entire past administration? This cannot be undone.')) return;
  await supabase.from('past_administrations').delete().eq('id', id);
  loadPastAdminAdmin();
}

// ============================================================
// ANNOUNCEMENTS
// ============================================================
async function postAnnouncement() {
  const title     = document.getElementById('annTitle').value.trim();
  const type      = document.getElementById('annType').value;
  const desc      = document.getElementById('annDesc').value.trim();
  const eventDate = document.getElementById('annEventDate').value.trim();
  const msg       = document.getElementById('annMsg');

  if (!title || !desc) {
    msg.className = 'admin-form-msg error';
    msg.innerHTML = '⚠️ Title and description are required.';
    return;
  }

  msg.className = 'admin-form-msg success';
  msg.innerHTML = '⏳ Posting...';

  const { error } = await supabase.from('announcements').insert({
    title, type, description: desc,
    event_date: eventDate || null, active: true
  });

  if (error) {
    msg.className = 'admin-form-msg error';
    msg.innerHTML = '❌ ' + error.message;
    return;
  }

  msg.innerHTML = '✅ Posted successfully!';
  document.getElementById('annTitle').value     = '';
  document.getElementById('annDesc').value      = '';
  document.getElementById('annEventDate').value = '';
  loadAdminAnnouncements();
}

async function loadAdminAnnouncements() {
  const list = document.getElementById('annAdminList');
  if (!list) return;
  list.innerHTML = '<div class="loading-state">Loading...</div>';

  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    list.innerHTML = `<div class="empty-state">❌ ${error.message}</div>`;
    return;
  }

  if (!data || !data.length) {
    list.innerHTML = '<div class="empty-state">No announcements posted yet.</div>';
    return;
  }

  list.innerHTML = data.map(a => `
    <div class="admin-list-item">
      <div class="admin-list-item-info">
        <strong>${a.title}</strong>
        <span>${a.type} &bull; ${
          new Date(a.created_at).toLocaleDateString('en-NG')
        }</span>
      </div>
      <button class="btn-admin-delete"
              onclick="deleteAnnouncement('${a.id}')">
        🗑 Delete
      </button>
    </div>
  `).join('');
}

async function deleteAnnouncement(id) {
  if (!confirm('Delete this announcement?')) return;
  await supabase.from('announcements').delete().eq('id', id);
  loadAdminAnnouncements();
}

// ============================================================
// SPOTLIGHT
// ============================================================
async function postSpotlight() {
  const name     = document.getElementById('spName').value.trim();
  const role     = document.getElementById('spRole').value.trim();
  const week     = document.getElementById('spWeek').value.trim();
  const bio      = document.getElementById('spBio').value.trim();
  const skills   = document.getElementById('spSkills').value.trim();
  const samples  = document.getElementById('spSamples').value.trim();
  const whatsapp = document.getElementById('spWhatsapp').value.trim();
  const photoEl  = document.getElementById('spPhoto');
  const msg      = document.getElementById('spMsg');

  if (!name || !bio) {
    msg.className = 'admin-form-msg error';
    msg.innerHTML = '⚠️ Name and bio are required.';
    return;
  }

  msg.className = 'admin-form-msg success';
  msg.innerHTML = '⏳ Posting spotlight...';

  // Deactivate previous spotlights
  await supabase
    .from('personnel_spotlight')
    .update({ active: false })
    .eq('active', true);

  let photo_url = null;

  if (photoEl.files && photoEl.files[0]) {
    const file     = photoEl.files[0];
    const fileName = `spotlight/${Date.now()}.${file.name.split('.').pop()}`;
    const { error: upErr } = await supabase.storage
      .from('exec-photos')
      .upload(fileName, file, { upsert: true });
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage
        .from('exec-photos').getPublicUrl(fileName);
      photo_url = publicUrl;
    }
  }

  const { error } = await supabase.from('personnel_spotlight').insert({
    full_name: name, role, week_label: week, bio,
    skills, work_samples: samples, whatsapp,
    photo_url, active: true
  });

  if (error) {
    msg.className = 'admin-form-msg error';
    msg.innerHTML = '❌ ' + error.message;
    return;
  }

  msg.innerHTML = '✅ Spotlight is now live on the website!';
  loadAdminSpotlight();
}

async function loadAdminSpotlight() {
  const list = document.getElementById('spAdminList');
  if (!list) return;
  list.innerHTML = '<div class="loading-state">Loading...</div>';

  const { data, error } = await supabase
    .from('personnel_spotlight')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    list.innerHTML = `<div class="empty-state">❌ ${error.message}</div>`;
    return;
  }

  if (!data || !data.length) {
    list.innerHTML = '<div class="empty-state">No spotlight posted yet.</div>';
    return;
  }

  list.innerHTML = data.map(s => `
    <div class="admin-list-item">
      <div class="admin-list-item-info">
        <strong>${s.full_name} ${s.active ? '&nbsp;✅ LIVE' : ''}</strong>
        <span>${s.role || ''} &bull; ${s.week_label || ''}</span>
      </div>
      <button class="btn-admin-delete" onclick="deleteSpotlight('${s.id}')">
        🗑 Remove
      </button>
    </div>
  `).join('');
}

async function deleteSpotlight(id) {
  if (!confirm('Remove this spotlight?')) return;
  await supabase.from('personnel_spotlight').delete().eq('id', id);
  loadAdminSpotlight();
}

// ============================================================
// HELPER
// ============================================================
function showAdminMsg(el, type, text) {
  el.className     = 'auth-msg ' + type;
  el.innerHTML     = text;
  el.style.display = 'block';
}