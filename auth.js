// ============================================================
// NESAAU — auth.js
// Matric-only login, no email, no Supabase Auth
// ============================================================

// --- Open/close modal ---
function openAuthModal() {
  document.getElementById('authModal').classList.add('open');
  document.getElementById('authModalOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeAuthModal() {
  document.getElementById('authModal').classList.remove('open');
  document.getElementById('authModalOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

// --- Switch login/register tab ---
function switchAuthTab(tab, btn) {
  document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('authLogin').classList.add('hidden');
  document.getElementById('authRegister').classList.add('hidden');
  document.getElementById('auth' + (tab === 'login' ? 'Login' : 'Register'))
    .classList.remove('hidden');
}

// --- Hash function ---
async function hashPassword(password) {
  const msgBuffer  = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Register ---
async function registerStudent() {
  const name     = document.getElementById('regName').value.trim();
  const matric   = document.getElementById('regMatric').value.trim().toUpperCase();
  const level    = document.getElementById('regLevel').value;
  const password = document.getElementById('regPassword').value;
  const msg      = document.getElementById('registerMsg');

  if (!name || !matric || !level || !password) {
    return showAuthMsg(msg, 'error', '⚠️ Please fill in all fields.');
  }
  if (password.length < 6) {
    return showAuthMsg(msg, 'error', '⚠️ Password must be at least 6 characters.');
  }

  showAuthMsg(msg, 'info', '⏳ Creating your account...');

  const hashed = await hashPassword(password);

  const { error } = await supabase.from('members').insert({
    full_name:     name,
    matric_number: matric,
    level:         level,
    password_hash: hashed,
    dues_status:   'unpaid',
    session:       '2025/2026'
  });

  if (error) {
    if (error.code === '23505') {
      return showAuthMsg(msg, 'error', '❌ Matric number already registered. Please login.');
    }
    return showAuthMsg(msg, 'error', '❌ Registration failed: ' + error.message);
  }

  showAuthMsg(msg, 'success', '✅ Account created! Logging you in...');

  // Auto login after register
  setTimeout(async () => {
    const { data: member } = await supabase
      .from('members')
      .select('*')
      .eq('matric_number', matric)
      .single();

    if (member) {
      localStorage.setItem('nesaau_member', JSON.stringify(member));
      window._nesaauMember = member;
      closeAuthModal();
      applySession(member);
    }
  }, 800);
}

// --- Login ---
async function loginStudent() {
  const matric   = document.getElementById('loginMatric').value.trim().toUpperCase();
  const password = document.getElementById('loginPassword').value;
  const msg      = document.getElementById('loginMsg');

  if (!matric || !password) {
    return showAuthMsg(msg, 'error', '⚠️ Enter your matric number and password.');
  }

  showAuthMsg(msg, 'info', '⏳ Logging you in...');

  const hashed = await hashPassword(password);

  const { data: member, error } = await supabase
    .from('members')
    .select('*')
    .eq('matric_number', matric)
    .eq('password_hash', hashed)
    .single();

  if (error || !member) {
    return showAuthMsg(msg, 'error', '❌ Incorrect matric number or password.');
  }

  localStorage.setItem('nesaau_member', JSON.stringify(member));
  window._nesaauMember = member;
  closeAuthModal();
  applySession(member);
}

// --- Logout ---
function logoutStudent() {
  localStorage.removeItem('nesaau_member');
  window._nesaauMember = null;

  // Restore logo, hide student info
  document.getElementById('navBrand').style.display       = 'flex';
  document.getElementById('navStudentInfo').style.display = 'none';

  // Clear student info fields
  document.getElementById('navStudentAvatar').textContent = '--';
  document.getElementById('navStudentName').textContent   = '';
  document.getElementById('navStudentSub').textContent    = '';

  // Restore nav buttons
  document.getElementById('navLoginBtn').style.display   = 'inline-block';
  document.getElementById('navDuesBtn').style.display    = 'inline-block';
  document.getElementById('navMyDuesBtn').style.display  = 'none';
  document.getElementById('navLogoutBtn').style.display  = 'none';

  // Restore announcement bar
  const announceBar = document.querySelector('.announce-bar');
  if (announceBar) announceBar.style.display = 'block';

  // Hide student bar (legacy — kept safe)
  const studentBar = document.getElementById('studentBar');
  if (studentBar) studentBar.style.display = 'none';

  // Reset dues section
  document.getElementById('duesLoginGate').style.display  = 'flex';
  document.getElementById('duesPortalWrap').style.display = 'none';

  closeToast();
  resetDues();
  updateDownloadButtons('unpaid');
}

// --- Apply session to UI (dynamic — works for ANY logged-in user) ---
function applySession(member) {
  // Hide announcement bar
  const announceBar = document.querySelector('.announce-bar');
  if (announceBar) announceBar.style.display = 'none';

  // Hide old student bar entirely
  const studentBar = document.getElementById('studentBar');
  if (studentBar) studentBar.style.display = 'none';

  // Hide logo, show student info in navbar
  document.getElementById('navBrand').style.display       = 'none';
  document.getElementById('navStudentInfo').style.display = 'flex';

  // Fill with this user's details dynamically
  const initials = member.full_name
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('navStudentAvatar').textContent = initials;
  document.getElementById('navStudentName').textContent   = member.full_name;
  document.getElementById('navStudentSub').textContent    = member.matric_number + ' · ' + member.level + ' Level';

  // Swap nav buttons
  document.getElementById('navLoginBtn').style.display   = 'none';
  document.getElementById('navDuesBtn').style.display    = 'none';
  document.getElementById('navMyDuesBtn').style.display  = 'inline-block';
  document.getElementById('navLogoutBtn').style.display  = 'inline-block';

  // Show dues portal, hide gate
  document.getElementById('duesLoginGate').style.display  = 'none';
  document.getElementById('duesPortalWrap').style.display = 'block';

  // Pre-fill dues form with this user's data
  document.getElementById('matricInput').value = member.matric_number;
  document.getElementById('nameInput').value   = member.full_name;
  document.getElementById('levelSel').value    = member.level;
// Update sidebar student info for mobile
  updateSidebarAuth(member);
  window._nesaauMember = member;

  // Show dues status toast after short delay
  setTimeout(() => showDuesToast(member.dues_status), 900);
  // Update download button visuals based on dues status
  updateDownloadButtons(member.dues_status);
}

function updateDownloadButtons(status) {
  const dlBtns = document.querySelectorAll('.res-dl');
  dlBtns.forEach(btn => {
    if (status === 'paid') {
      btn.classList.remove('locked');
      btn.title = '';
    } else {
      btn.classList.add('locked');
      btn.title = status === 'unpaid'
        ? 'Pay your dues to download'
        : 'Login to download';
    }
  });
  // Lock all download buttons on logout
  updateDownloadButtons('unpaid');
}

// --- Toast notification ---
function showDuesToast(status) {
  const toast = document.getElementById('toastPopup');
  const icon  = document.getElementById('toastIcon');
  const msg   = document.getElementById('toastMsg');

  if (!toast) return;

  toast.className = 'toast-popup ' + status;

  if (status === 'paid') {
    icon.textContent = '✅';
    msg.textContent  = 'Dues Paid — 2025/2026 Session';
  } else if (status === 'pending') {
    icon.textContent = '⏳';
    msg.textContent  = 'Payment received — awaiting confirmation';
  } else {
    icon.textContent = '❌';
    msg.textContent  = 'Dues not yet paid for 2025/2026';
  }

  // Slide in
  setTimeout(() => toast.classList.add('show'), 50);
  // Auto dismiss after 5.5 seconds
  setTimeout(() => closeToast(), 5500);
}

function closeToast() {
  const toast = document.getElementById('toastPopup');
  if (toast) toast.classList.remove('show');
}

// --- Load session on page load ---
function loadStudentSession() {
  const saved = localStorage.getItem('nesaau_member');

  if (!saved) {
    document.getElementById('duesLoginGate').style.display  = 'flex';
    document.getElementById('duesPortalWrap').style.display = 'none';
    return;
  }

  const member = JSON.parse(saved);

  // Always re-fetch fresh status from DB
  supabase
    .from('members')
    .select('*')
    .eq('matric_number', member.matric_number)
    .single()
    .then(({ data }) => {
      if (!data) {
        localStorage.removeItem('nesaau_member');
        document.getElementById('duesLoginGate').style.display  = 'flex';
        document.getElementById('duesPortalWrap').style.display = 'none';
        return;
      }
      localStorage.setItem('nesaau_member', JSON.stringify(data));
      window._nesaauMember = data;
      applySession(data);

      // If dues is pending or paid, skip to the right dues state
      if (data.dues_status === 'pending' || data.dues_status === 'paid') {
        showDuesStateOnLoad(data.dues_status);
      }
    });
}

function showDuesStateOnLoad(status) {
  // Keep the portal visible but show correct step
  if (status === 'pending') {
    // Show a "payment under review" message instead of the form
    const step1 = document.getElementById('duesStep1');
    const step2 = document.getElementById('duesStep2');
    const step3 = document.getElementById('duesStep3');
    if (step1) step1.classList.add('hidden');
    if (step2) step2.classList.add('hidden');
    if (step3) {
      step3.classList.remove('hidden');
      step3.innerHTML = `
        <div class="success-ani">&#9203;</div>
        <h3>Payment Under Review</h3>
        <p>Your receipt was received and is being verified by our Treasurer.</p>
        <p>You will have full access once your payment is confirmed — 
           usually within <strong>24–48 hours</strong>.</p>
        <p style="font-size:.8rem;color:var(--gray);margin-top:8px;">
          Questions? Contact the Treasurer: 
          <a href="tel:+2348159718496" style="color:var(--gold)">+234 815 971 8496</a>
        </p>
      `;
    }
    // Update steps bar
    const s1 = document.getElementById('stepItem1');
    const s2 = document.getElementById('stepItem2');
    const s3 = document.getElementById('stepItem3');
    if (s1) { s1.classList.remove('active'); s1.classList.add('done'); }
    if (s2) { s2.classList.remove('active'); s2.classList.add('done'); }
    if (s3) s3.classList.add('active');
  }

  if (status === 'paid') {
    // Show a paid confirmation
    const step1 = document.getElementById('duesStep1');
    const step2 = document.getElementById('duesStep2');
    const step3 = document.getElementById('duesStep3');
    if (step1) step1.classList.add('hidden');
    if (step2) step2.classList.add('hidden');
    if (step3) {
      step3.classList.remove('hidden');
      step3.innerHTML = `
        <div class="success-ani">&#9989;</div>
        <h3>Dues Fully Paid!</h3>
        <p>You are a verified dues-paying NESAAU member for the 
           <strong>2024/2025</strong> session.</p>
        <p>All member benefits are now unlocked including past questions, 
           exam clearance endorsement, and event access.</p>
      `;
    }
  }
}
// --- Helper ---
function showAuthMsg(el, type, text) {
  el.className = 'auth-msg ' + type;
  el.innerHTML = text;
}

// --- Run on page load ---
document.addEventListener('DOMContentLoaded', loadStudentSession);
