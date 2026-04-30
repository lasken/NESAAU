
function toggleAdminSidebar() {
  const sidebar  = document.getElementById('adminSidebar');
  const overlay  = document.getElementById('adminSidebarOverlay');
  const isOpen   = sidebar.classList.contains('mobile-open');
  if (isOpen) {
    closeAdminSidebar();
  } else {
    sidebar.classList.add('mobile-open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeAdminSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('adminSidebarOverlay');
  sidebar.classList.remove('mobile-open');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}
async function hashPassword(password) {
  const buf = await crypto.subtle.digest(
    'SHA-256', new TextEncoder().encode(password)
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2,'0')).join('');
}

let allSubmissions = [];
let allMembers     = [];

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
  loadSubmissions();
}

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('nesaau_admin');
  if (saved) {
    showDashboard();
  }
});

function showPanel(name, btn) {
  function showPanel(name, btn) {
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.admin-nav-link').forEach(l => l.classList.remove('active'));

  const panel = document.getElementById('panel-' + name);
  
  if (panel) {
    panel.classList.add('active');
  } else {
    console.error("Could not find panel with ID: panel-" + name);
  }

  if (btn) btn.classList.add('active');

  if (window.innerWidth < 768) closeAdminSidebar();

  if (name === 'members') loadMembers();
  if (name === 'stats') loadStats();
}
  closeAdminSidebar();
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
            <i class="fa-solid fa-circle-check"></i> Approve
          </button>
          <button class="btn-reject"
            onclick="updateSubmission('${s.id}','${s.member_id}','rejected')">
            <i class="fa-solid fa-circle-xmark"></i> Reject
          </button>
        ` : ''}
        ${s.status === 'paid' ? `
          <button class="btn-notify-student"
            onclick="notifyStudentWhatsApp('${s.member_id}','${s.full_name}')">
            <i class="fa-brands fa-whatsapp"></i> Notify Student
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

async function updateSubmission(submissionId, memberId, newStatus) {
  const { error: subErr } = await supabase
    .from('dues_submissions')
    .update({ status: newStatus })
    .eq('id', submissionId);

  if (subErr) { alert('Error updating submission: ' + subErr.message); return; }

  const { error: memErr } = await supabase
    .from('members')
    .update({ dues_status: newStatus })
    .eq('id', memberId);

  if (memErr) { alert('Error updating member: ' + memErr.message); return; }

  loadSubmissions();
  loadStats();
}

function statusLabel(s) {
  if (s === 'paid')     return '✅ Approved';
  if (s === 'pending')  return '⏳ Pending';
  if (s === 'rejected') return '❌ Rejected';
  return s;
}

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

async function loadExecCms() {
  loadCurrentExecAdmin();
}

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

function showAdminMsg(el, type, text) {
  el.className     = 'auth-msg ' + type;
  el.innerHTML     = text;
  el.style.display = 'block';
}

async function notifyStudentWhatsApp(memberId, studentName) {
  const { data: member, error } = await supabase
    .from('members')
    .select('full_name, matric_number, phone_number')
    .eq('id', memberId)
    .single();

  if (error || !member) {
    alert('Could not fetch student details.');
    return;
  }

  if (!member.phone_number) {
    const manual = prompt(
      `${member.full_name} has no WhatsApp number saved.\nEnter their number manually (with country code, no +):`
    );
    if (!manual) return;
    member.phone_number = manual.trim();
  }

  let phone = member.phone_number.replace(/\D/g, '');
  if (phone.startsWith('0')) {
    phone = '234' + phone.slice(1); 
  }

  let message = `✅ *NESAAU DUES PAYMENT CONFIRMED*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `Hi *${member.full_name}*,\n\n`;
  message += `Your dues payment for the *2025/2026* academic session has been verified and confirmed. ✅\n\n`;
  message += `You now have *FULL member access:*\n`;
  message += `• Past questions & notes unlocked\n`;
  message += `• Exam clearance endorsed\n`;
  message += `• All NESAAU events accessible\n`;
  message += `• Departmental WhatsApp group access\n\n`;
  message += `Thank you for being a responsible NESAAU member! 🎓\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `— *NESAAU Financial Secretary*\n`;
  message += `_${new Date().toLocaleDateString('en-NG', { day:'numeric', month:'long', year:'numeric' })}_`;

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

document.addEventListener('DOMContentLoaded', () => {
  const fybImageInput = document.getElementById('fybImage');
  if (fybImageInput) {
    fybImageInput.addEventListener('change', function() {
      const file = this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        const wrap = document.getElementById('fybPreviewWrap');
        const prev = document.getElementById('fybPreviewImg');
        prev.src = e.target.result;
        wrap.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });
  }
});

async function loadFybAdmin() {
  await loadFybCurrent();
  await loadFybPast();
}

async function loadFybCurrent() {
  const wrap = document.getElementById('fybAdminCurrent');
  if (!wrap) return;

  const { data } = await supabase
    .from('fyb_students')
    .select('*')
    .eq('status', 'current')
    .order('position', { ascending: true });

  if (!data || !data.length) {
    wrap.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      No current FYB students. Upload the first one below.
    </div>`;
    return;
  }

  const maxPos = Math.max(...data.map(s => s.position));

  wrap.innerHTML = data.map(s => `
    <div class="fyb-admin-card ${s.position === maxPos ? 'is-oldest' : ''}">
      <img src="${s.image_url}" alt="${s.name}"/>
      <div class="fyb-admin-card-body">
        <div>
          <strong>${s.name}</strong>
          ${s.position === maxPos
            ? `<span class="fyb-oldest-tag">
                 <i class="fa-solid fa-arrow-right"></i> Next archived
               </span>`
            : ''
          }
        </div>
        <div class="fyb-admin-pos">${s.position}</div>
      </div>
    </div>
  `).join('');
}

async function loadFybPast() {
  const list = document.getElementById('fybPastList');
  if (!list) return;

  const { data } = await supabase
    .from('fyb_students')
    .select('*')
    .eq('status', 'past')
    .order('posted_at', { ascending: false });

  if (!data || !data.length) {
    list.innerHTML = `<div class="empty-state">
      Archive is empty. Past students appear here as new ones are added.
    </div>`;
    return;
  }

  list.innerHTML = data.map(s => `
    <div class="fyb-admin-archive-item">
      <img src="${s.image_url}" alt="${s.name}"/>
      <div class="fyb-admin-archive-label">${s.name}</div>
      <button class="fyb-del-btn"
              onclick="deleteFybStudent('${s.id}')"
              title="Remove from archive">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `).join('');
}

async function postFybStudent() {
  const name    = document.getElementById('fybName').value.trim();
  const imgEl   = document.getElementById('fybImage');
  const msg     = document.getElementById('fybMsg');

  if (!name) {
    msg.className = 'admin-form-msg error';
    msg.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Student name is required.';
    return;
  }
  if (!imgEl.files || !imgEl.files[0]) {
    msg.className = 'admin-form-msg error';
    msg.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Please select the FYB poster image.';
    return;
  }

  msg.className = 'admin-form-msg success';
  msg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading image...';

  const file     = imgEl.files[0];
  const ext      = file.name.split('.').pop().toLowerCase();
  const fileName = `fyb/${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('exec-photos')
    .upload(fileName, file, { upsert: true, contentType: file.type });

  if (upErr) {
    msg.className = 'admin-form-msg error';
    msg.innerHTML = '<i class="fa-solid fa-xmark"></i> Image upload failed: ' + upErr.message;
    return;
  }

  const { data: urlData } = supabase.storage
    .from('exec-photos').getPublicUrl(fileName);
  const image_url = urlData.publicUrl + '?t=' + Date.now();

  msg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating rotation...';

  const { data: current } = await supabase
    .from('fyb_students')
    .select('*')
    .eq('status', 'current')
    .order('position', { ascending: true });

  if (current && current.length >= 3) {
    const oldest = current.reduce((a,b) => a.position > b.position ? a : b);
    await supabase
      .from('fyb_students')
      .update({ status: 'past', position: 0 })
      .eq('id', oldest.id);
  }

  if (current) {
    for (const s of current) {
      if (s.status === 'current') {
        await supabase
          .from('fyb_students')
          .update({ position: s.position + 1 })
          .eq('id', s.id);
      }
    }
  }

  const { error: insErr } = await supabase
    .from('fyb_students')
    .insert({
      name,
      image_url,
      status:    'current',
      position:  1,
      posted_at: new Date().toISOString()
    });

  if (insErr) {
    msg.className = 'admin-form-msg error';
    msg.innerHTML = '<i class="fa-solid fa-xmark"></i> Failed to save: ' + insErr.message;
    return;
  }

  msg.innerHTML = '<i class="fa-solid fa-circle-check"></i> FYB student posted! Site updated live.';

  document.getElementById('fybName').value = '';
  document.getElementById('fybImage').value = '';
  document.getElementById('fybPreviewWrap').style.display = 'none';

  await loadFybAdmin();
}

async function deleteFybStudent(id) {
  if (!confirm('Remove this student from the archive permanently?')) return;
  await supabase.from('fyb_students').delete().eq('id', id);
  loadFybPast();
}
