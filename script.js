/* ============================================================
   NESAAU — script.js
   ============================================================ */

// ---------- SIDEBAR ----------
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar').setAttribute('aria-hidden', 'false');
  document.getElementById('overlay').classList.add('active');
  document.getElementById('hamburger').setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar').setAttribute('aria-hidden', 'true');
  document.getElementById('overlay').classList.remove('active');
  document.getElementById('hamburger').setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}
// Close sidebar with Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeSidebar();
});

// ---------- STICKY NAVBAR SCROLL ----------
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', function() {
  if (window.scrollY > 60) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
  updateActiveNavLink();
});

// ---------- ACTIVE NAV LINK ON SCROLL ----------
function updateActiveNavLink() {
  const sections = ['home','about','president','executives','academics','constitution','dues'];
  const navLinks = document.querySelectorAll('.nav-link');
  let current = '';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (window.scrollY >= el.offsetTop - 120) current = id;
  });
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === '#' + current) link.classList.add('active');
  });
}

// ---------- ACADEMICS TABS ----------
function switchTab(tabId, btn) {
  // Hide all panels
  document.querySelectorAll('.resource-panel').forEach(p => p.classList.remove('active'));
  // Deactivate all buttons
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  // Show selected
  const panel = document.getElementById(tabId);
  if (panel) panel.classList.add('active');
  if (btn) btn.classList.add('active');
}

// ---------- CONSTITUTION TOGGLE ----------
function toggleConstitution() {
  const reader = document.getElementById('constReader');
  reader.classList.toggle('open');
  if (reader.classList.contains('open')) {
    reader.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ---------- DUES PORTAL ----------
function verifyStudent() {
  const matric = document.getElementById('matricInput').value.trim();
  const name   = document.getElementById('nameInput').value.trim();
  const level  = document.getElementById('levelSel').value;
  const msg    = document.getElementById('verifyMsg');

  // Reset
  msg.className = 'verify-msg';
  msg.style.display = 'none';

  if (!matric || !name || !level) {
    showMsg(msg, 'error', '⚠️ Please fill in all fields before proceeding.');
    return;
  }
  // Basic matric format check
  const matricPattern = /^\d{2}\/\d{3,5}$/i;
  if (!matricPattern.test(matric.replace(/\s/g,''))) {
    showMsg(msg, 'error', '❌ Invalid matric format. Expected: YY/NNNN');
    return;
  }

  // Simulate verification (replace with real API call)
  showMsg(msg, 'success', '⏳ Verifying your details...');
  setTimeout(() => {
    // Store for step 2
    window._nesaauStudent = { matric, name, level };
    showStep2(matric, name, level);
  }, 1400);
}

function showStep2(matric, name, level) {
  // Update steps
  document.getElementById('stepItem1').classList.remove('active');
  document.getElementById('stepItem1').classList.add('done');
  document.getElementById('stepItem2').classList.add('active');

  // Fill verified bar
  const bar = document.getElementById('verifiedBar');
  bar.style.display = 'block';
  bar.innerHTML = `✅ Verified: <strong>${name}</strong> &nbsp;|&nbsp; ${matric} &nbsp;|&nbsp; ${level} Level`;

  document.getElementById('duesStep1').classList.add('hidden');
  document.getElementById('duesStep2').classList.remove('hidden');
  document.getElementById('duesStep2').scrollIntoView({ behavior:'smooth', block:'start' });
}

function backToStep1() {
  document.getElementById('stepItem1').classList.add('active');
  document.getElementById('stepItem1').classList.remove('done');
  document.getElementById('stepItem2').classList.remove('active');
  document.getElementById('duesStep2').classList.add('hidden');
  document.getElementById('duesStep1').classList.remove('hidden');
  document.getElementById('verifyMsg').style.display = 'none';
  document.getElementById('verifyMsg').className = 'verify-msg';
}

function submitPayment() {
  const receipt = document.getElementById('receiptFile');
  const msg     = document.getElementById('payMsg');

  if (!receipt.files || !receipt.files[0]) {
    showMsg(msg, 'error', '⚠️ Please upload your payment receipt before submitting.');
    return;
  }

  showMsg(msg, 'success', '⏳ Uploading receipt...');
  setTimeout(() => {
    document.getElementById('stepItem2').classList.remove('active');
    document.getElementById('stepItem2').classList.add('done');
    document.getElementById('stepItem3').classList.add('active');
    document.getElementById('duesStep2').classList.add('hidden');
    document.getElementById('duesStep3').classList.remove('hidden');
    document.getElementById('duesStep3').scrollIntoView({ behavior:'smooth', block:'start' });
  }, 1600);
}

function resetDues() {
  // Reset all steps
  ['stepItem1','stepItem2','stepItem3'].forEach(id => {
    document.getElementById(id).classList.remove('active','done');
  });
  document.getElementById('stepItem1').classList.add('active');
  document.getElementById('duesStep3').classList.add('hidden');
  document.getElementById('duesStep2').classList.add('hidden');
  document.getElementById('duesStep1').classList.remove('hidden');
  document.getElementById('matricInput').value = '';
  document.getElementById('nameInput').value   = '';
  document.getElementById('levelSel').value    = '';
  document.getElementById('verifyMsg').style.display = 'none';
  document.getElementById('verifiedBar').style.display = 'none';
  window._nesaauStudent = null;
}

function copyAcct() {
  navigator.clipboard.writeText('0123456789').then(() => {
    const btn = document.querySelector('.copy-btn');
    const orig = btn.textContent;
    btn.textContent = '✓ Copied';
    btn.style.background = '#22c55e';
    setTimeout(() => { btn.textContent = orig; btn.style.background = ''; }, 1800);
  });
}

// ---------- HELPER ----------
function showMsg(el, type, text) {
  el.className = 'verify-msg ' + type;
  el.innerHTML = text;
  el.style.display = 'block';
}

// ---------- SMOOTH ANCHOR SCROLL ----------
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 72; // navbar height
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ---------- SCROLL REVEAL (lightweight) ----------
const revealEls = document.querySelectorAll(
  '.exec-card, .res-row, .pillar, .about-grid, .pres-card, .const-card, .section-title'
);
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.animation = 'fadeUp .6s ease forwards';
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
revealEls.forEach(el => {
  el.style.opacity = '0';
  observer.observe(el);
});

// ============================================================
// NESAAU ADDITION — Download Gate
// Checks login + dues status before allowing download
// ============================================================
function handleDownload(event, filePath) {
  event.preventDefault();

  const member = window._nesaauMember;

  // Not logged in
  if (!member) {
    showDownloadToast('login');
    openAuthModal();
    return;
  }

  // Logged in but dues not paid
  if (member.dues_status !== 'paid') {
    showDownloadToast('unpaid');
    return;
  }

  // No real file yet
  if (!filePath || filePath === '#') {
    showDownloadToast('unavailable');
    return;
  }

  // All checks passed — trigger download
  const link = document.createElement('a');
  link.href     = filePath;
  link.download = filePath.split('/').pop();
  link.target   = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showDownloadToast('success');
}

function showDownloadToast(type) {
  const toast = document.getElementById('toastPopup');
  const icon  = document.getElementById('toastIcon');
  const msg   = document.getElementById('toastMsg');

  if (!toast) return;

  // Clear existing classes
  toast.className = 'toast-popup';

  const types = {
    login: {
      icon: '🔐',
      text: 'Please login to download materials',
      cls:  'unpaid'
    },
    unpaid: {
      icon: '💳',
      text: 'Pay your dues to access downloadable materials',
      cls:  'unpaid'
    },
    unavailable: {
      icon: '⏳',
      text: 'This file is not yet available. Check back soon.',
      cls:  'pending'
    },
    success: {
      icon: '✅',
      text: 'Download started successfully!',
      cls:  'paid'
    }
  };

  const t = types[type] || types.unavailable;
  icon.textContent = t.icon;
  msg.textContent  = t.text;
  toast.classList.add(t.cls);

  // Slide in
  setTimeout(() => toast.classList.add('show'), 50);

  // Auto dismiss
  setTimeout(() => closeToast(), 4500);
}

// ============================================================
// NESAAU ADDITION — Community Request Form
// Builds a WhatsApp message and opens wa.me link
// Change EXCO_WHATSAPP to the PRO or president's number
// ============================================================

// ⬇ PUT THE EXCO'S WHATSAPP NUMBER HERE (with country code, no + or spaces)
const EXCO_WHATSAPP = '2348159718496';

let selectedUrgency = '';

function setUrgency(level, btn) {
  selectedUrgency = level;
  document.querySelectorAll('.urgency-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// Show/hide collaboration field based on request type
document.addEventListener('DOMContentLoaded', function() {
  const typeSelect = document.getElementById('commType');
  if (typeSelect) {
    typeSelect.addEventListener('change', function() {
      const collabField = document.getElementById('commCollabField');
      if (this.value === 'Collaboration Request') {
        collabField.style.display = 'flex';
      } else {
        collabField.style.display = 'none';
        document.getElementById('commCollab').value = '';
      }
    });
  }
});

function sendToWhatsApp() {
  const name    = document.getElementById('commName').value.trim();
  const matric  = document.getElementById('commMatric').value.trim();
  const type    = document.getElementById('commType').value;
  const message = document.getElementById('commMessage').value.trim();
  const collab  = document.getElementById('commCollab')
                    ? document.getElementById('commCollab').value.trim()
                    : '';

  // Validation
  if (!name) {
    showCommunityError('Please enter your full name.');
    return;
  }
  if (!type) {
    showCommunityError('Please select a request type.');
    return;
  }
  if (!message || message.length < 10) {
    showCommunityError('Please write a message of at least 10 characters.');
    return;
  }

  // Build the WhatsApp message
  let waMessage = `*NESAAU Community Request*\n`;
  waMessage += `━━━━━━━━━━━━━━━━━━━━━\n`;
  waMessage += `*From:* ${name}\n`;
  if (matric) waMessage += `*Matric:* ${matric}\n`;
  waMessage += `*Type:* ${type}\n`;
  if (collab) waMessage += `*Collaboration With:* ${collab}\n`;
  if (selectedUrgency) waMessage += `*Urgency:* ${selectedUrgency}\n`;
  waMessage += `━━━━━━━━━━━━━━━━━━━━━\n`;
  waMessage += `*Message:*\n${message}\n`;
  waMessage += `━━━━━━━━━━━━━━━━━━━━━\n`;
  waMessage += `_Sent via NESAAU Website_`;

  // Encode and open WhatsApp
  const encoded = encodeURIComponent(waMessage);
  const waURL   = `https://wa.me/${EXCO_WHATSAPP}?text=${encoded}`;
  window.open(waURL, '_blank');

  // Clear form after opening WhatsApp
  setTimeout(() => {
    document.getElementById('commName').value    = '';
    document.getElementById('commMatric').value  = '';
    document.getElementById('commType').value    = '';
    document.getElementById('commMessage').value = '';
    document.getElementById('commCollabField').style.display = 'none';
    selectedUrgency = '';
    document.querySelectorAll('.urgency-btn').forEach(b => b.classList.remove('active'));
  }, 1000);
}

function showCommunityError(msg) {
  const toast = document.getElementById('toastPopup');
  const icon  = document.getElementById('toastIcon');
  const text  = document.getElementById('toastMsg');
  if (!toast) { alert(msg); return; }
  toast.className  = 'toast-popup unpaid';
  icon.textContent = '⚠️';
  text.textContent = msg;
  setTimeout(() => toast.classList.add('show'), 50);
  setTimeout(() => closeToast(), 4000);
}

// ============================================================
// NESAAU ADDITION — Announcements + Personnel Spotlight
// Both fetched from Supabase, rendered dynamically
// ============================================================

let allAnnouncements = [];

// --- Load announcements on page load ---
async function loadAnnouncements() {
  const grid  = document.getElementById('annGrid');
  const empty = document.getElementById('annEmpty');
  if (!grid) return;

  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error || !data || !data.length) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }

  allAnnouncements = data;
  renderAnnouncements(data);
}

function renderAnnouncements(list) {
  const grid  = document.getElementById('annGrid');
  const empty = document.getElementById('annEmpty');

  if (!list.length) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }

  if (empty) empty.style.display = 'none';

  const typeIcons = {
    Seminar:  '&#127891;',
    Election: '&#128229;',
    Meeting:  '&#128101;',
    Welfare:  '&#10084;&#65039;',
    General:  '&#128226;'
  };

  grid.innerHTML = list.map(ann => `
    <div class="ann-card">
      <div class="ann-card-top">
        <span class="ann-type-badge ${ann.type || 'General'}">
          ${typeIcons[ann.type] || '&#128226;'} ${ann.type || 'General'}
        </span>
        <span class="ann-date">
          &#128197; ${new Date(ann.created_at).toLocaleDateString('en-NG', {
            day: 'numeric', month: 'short', year: 'numeric'
          })}
        </span>
      </div>
      <h3>${ann.title}</h3>
      <p>${ann.description || ''}</p>
      ${ann.event_date ? `
        <div class="ann-event-date">
          &#128197; Event Date: <strong>${ann.event_date}</strong>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function filterAnnouncements(type, btn) {
  document.querySelectorAll('.ann-filter-btn')
    .forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const filtered = type === 'all'
    ? allAnnouncements
    : allAnnouncements.filter(a => a.type === type);

  renderAnnouncements(filtered);
}

// --- Load personnel spotlight ---
async function loadSpotlight() {
  const wrap = document.getElementById('spotlightWrap');
  if (!wrap) return;

  const { data, error } = await supabase
    .from('personnel_spotlight')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    wrap.innerHTML = `
      <div class="spotlight-empty">
        <div class="empty-icon-wrapper">
          <i class="fa-solid fa-user"></i>
        </div>
        <h3>No Spotlight This Week</h3>
        <p>Check back soon, the admin will post the Personnel of the Week shortly.</p>
      </div>`;
    return;
  }

  // Parse skills and work samples (stored as comma-separated strings)
  const skills  = data.skills
    ? data.skills.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  const samples = data.work_samples
    ? data.work_samples.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const initials = data.full_name
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const waLink = data.whatsapp
    ? `https://wa.me/${data.whatsapp.replace(/\D/g, '')}`
    : null;

  wrap.innerHTML = `
    <div class="spotlight-card">
      <div class="spotlight-left">
        <div class="spotlight-week-label">
          &#11088; ${data.week_label || 'Personnel of the Week'}
        </div>
        <div class="spotlight-photo-wrap">
          ${data.photo_url
            ? `<img src="${data.photo_url}" alt="${data.full_name}" onerror="this.parentNode.innerHTML='<div class=spotlight-photo-placeholder>${initials}</div>'"/>`
            : `<div class="spotlight-photo-placeholder">${initials}</div>`
          }
        </div>
        <div class="spotlight-name">${data.full_name}</div>
        <div class="spotlight-role">${data.role || 'NESAAU Member'}</div>
        ${waLink ? `
        <a href="${waLink}" target="_blank" class="spotlight-connect-btn">
          <i class="fa-brands fa-whatsapp"></i> Connect on WhatsApp
        </a>
        ` : ''}
      </div>
      <div class="spotlight-right">
        <div>
          <div class="spotlight-bio-label">About</div>
          <p class="spotlight-bio">${data.bio || ''}</p>
        </div>
        ${skills.length ? `
          <div class="spotlight-skills-wrap">
            <div class="spotlight-bio-label">Skills &amp; Expertise</div>
            <div class="spotlight-skill-tags">
              ${skills.map(s => `<span class="skill-tag">&#9889; ${s}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        ${samples.length ? `
          <div class="spotlight-work-wrap">
            <div class="spotlight-bio-label">Work &amp; Portfolio</div>
            <div class="spotlight-work-links">
              ${samples.map((s, i) => {
                const isUrl = s.startsWith('http');
                return isUrl
                  ? `<a href="${s}" target="_blank" class="work-link">&#127760; View Work ${i + 1}</a>`
                  : `<span class="work-link">&#127912; ${s}</span>`;
              }).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// Run both on page load
document.addEventListener('DOMContentLoaded', function() {
  loadAnnouncements();
  loadSpotlight();
});

// ============================================================
// NESAAU ADDITION — Past Administrations
// ============================================================

let pastAdminsLoaded = false;

function togglePastAdmins() {
  const panel  = document.getElementById('pastAdminPanel');
  const arrow  = document.getElementById('pastArrow');
  const link   = document.getElementById('pastToggleBtn');
  const isOpen = panel.style.display !== 'none';

  if (isOpen) {
    panel.style.display = 'none';
    arrow.classList.remove('open');
    link.innerHTML = '&#128197; View Past Administrations <span class="past-toggle-arrow" id="pastArrow">&#8599;</span>';
  } else {
    panel.style.display = 'block';
    link.innerHTML = '&#128197; Hide Past Administrations <span class="past-toggle-arrow open" id="pastArrow">&#8598;</span>';
    if (!pastAdminsLoaded) {
      loadPastAdmins();
      pastAdminsLoaded = true;
    }
  }
}

async function loadPastAdmins() {
  const list = document.getElementById('pastAdminList');
  if (!list) return;

  const { data: admins, error } = await supabase
    .from('past_administrations')
    .select('*')
    .order('archived_at', { ascending: false });

  if (error || !admins || !admins.length) {
    list.innerHTML = '<div class="past-empty">No past administrations recorded yet.</div>';
    return;
  }

  // Fetch all past executives
  const { data: execs } = await supabase
    .from('past_executives')
    .select('*')
    .order('order_index');

  list.innerHTML = admins.map((admin, i) => {
    const adminExecs = execs
      ? execs.filter(e => e.administration_id === admin.id)
      : [];

    return `
      <div class="past-admin-card">
        <div class="past-admin-card-header"
             onclick="togglePastCard('pastCard${i}', 'pastCardArrow${i}')">
          <div class="past-admin-header-left">
            <div class="past-admin-icon">&#127891;</div>
            <div>
              <h3>${admin.admin_name}</h3>
              <span>${admin.session_year} &bull; ${adminExecs.length} Executive${adminExecs.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <span class="past-admin-arrow" id="pastCardArrow${i}">&#9660;</span>
        </div>
        <div class="past-admin-card-body" id="pastCard${i}">
          ${adminExecs.length ? `
            <div class="past-exec-grid">
              ${adminExecs.map(ex => {
                const initials = ex.full_name
                  .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                return `
                  <div class="past-exec-item">
                    ${ex.photo_url
                      ? `<img src="${ex.photo_url}" alt="${ex.full_name}" class="past-exec-img"
                              onerror="this.outerHTML='<div class=past-exec-placeholder>${initials}</div>'"/>`
                      : `<div class="past-exec-placeholder">${initials}</div>`
                    }
                    <div class="past-exec-info">
                      <strong>${ex.full_name}</strong>
                      <span>${ex.role}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : '<div class="past-empty">No executives recorded for this administration.</div>'}
        </div>
      </div>
    `;
  }).join('');
}

function togglePastCard(bodyId, arrowId) {
  const body  = document.getElementById(bodyId);
  const arrow = document.getElementById(arrowId);
  body.classList.toggle('open');
  arrow.classList.toggle('open');
}
