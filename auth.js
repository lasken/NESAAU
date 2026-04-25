
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

function switchAuthTab(tab, btn) {
  document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('authLogin').classList.add('hidden');
  document.getElementById('authRegister').classList.add('hidden');
  document.getElementById('auth' + (tab === 'login' ? 'Login' : 'Register'))
    .classList.remove('hidden');
}

async function hashPassword(password) {
  const msgBuffer  = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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

const phone  = document.getElementById('regPhone')
                   ? document.getElementById('regPhone').value.trim()
                   : '';
  const hashed = await hashPassword(password);

  const { error } = await supabase.from('members').insert({
    full_name:     name,
    matric_number: matric,
    level:         level,
    password_hash: hashed,
    dues_status:   'unpaid',
    session:       '2025/2026',
    phone_number:  phone || null
  });

  if (error) {
    if (error.code === '23505') {
      return showAuthMsg(msg, 'error', '❌ Matric number already registered. Please login.');
    }
    return showAuthMsg(msg, 'error', '❌ Registration failed: ' + error.message);
  }

  showAuthMsg(msg, 'success', '✅ Account created! Logging you in...');

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

function logoutStudent() {
  localStorage.removeItem('nesaau_member');
  window._nesaauMember = null;

  document.getElementById('navBrand').style.display       = 'flex';
  document.getElementById('navStudentInfo').style.display = 'none';

  document.getElementById('navStudentAvatar').textContent = '--';
  document.getElementById('navStudentName').textContent   = '';
  document.getElementById('navStudentSub').textContent    = '';

  document.getElementById('navLoginBtn').style.display   = 'inline-block';
  document.getElementById('navDuesBtn').style.display    = 'inline-block';
  document.getElementById('navMyDuesBtn').style.display  = 'none';
  document.getElementById('navLogoutBtn').style.display  = 'none';

  const announceBar = document.querySelector('.announce-bar');
  if (announceBar) announceBar.style.display = 'block';

  const studentBar = document.getElementById('studentBar');
  if (studentBar) studentBar.style.display = 'none';

  document.getElementById('duesLoginGate').style.display  = 'flex';
  document.getElementById('duesPortalWrap').style.display = 'none';

  closeToast();
  updateSidebarAuth(null);
  resetDues();
  updateDownloadButtons('unpaid');
}

function applySession(member) {
  const announceBar = document.querySelector('.announce-bar');
  if (announceBar) announceBar.style.display = 'none';

  const studentBar = document.getElementById('studentBar');
  if (studentBar) studentBar.style.display = 'none';

  document.getElementById('navBrand').style.display       = 'none';
  document.getElementById('navStudentInfo').style.display = 'flex';

  const initials = member.full_name
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('navStudentAvatar').textContent = initials;
  document.getElementById('navStudentName').textContent   = member.full_name;
  document.getElementById('navStudentSub').textContent    = member.matric_number + ' · ' + member.level + ' Level';

  document.getElementById('navLoginBtn').style.display        = 'none';
  document.getElementById('navDuesBtn').style.display         = 'none';
  document.getElementById('navMyDuesBtn').style.display       = 'inline-block';
  document.getElementById('navLogoutBtn').style.display       = 'inline-block';

  const sbPhone = document.getElementById('sbUpdatePhoneLink');
  if (sbPhone) sbPhone.style.display = 'flex';

  document.getElementById('duesLoginGate').style.display  = 'none';
  document.getElementById('duesPortalWrap').style.display = 'block';

  document.getElementById('matricInput').value = member.matric_number;
  document.getElementById('nameInput').value   = member.full_name;
  document.getElementById('levelSel').value    = member.level;

  updateSidebarAuth(member);

  window._nesaauMember = member;

  setTimeout(() => showDuesToast(member.dues_status), 900);
  if (member.dues_status === 'paid' || member.dues_status === 'pending') {
    setTimeout(() => showDuesStateOnLoad(member.dues_status), 100);
  }
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
  updateDownloadButtons('unpaid');
}

function showDuesToast(status) {
  const toast = document.getElementById('toastPopup');
  const icon  = document.getElementById('toastIcon');
  const msg   = document.getElementById('toastMsg');

  if (!toast) return;

  toast.className = 'toast-popup ' + status;

if (status === 'paid') {
    icon.innerHTML  = '<i class="fa-solid fa-circle-check"></i>';
    msg.textContent = 'Dues Paid — 2025/2026 Session';
  } else if (status === 'pending') {
    icon.innerHTML  = '<i class="fa-solid fa-clock"></i>';
    msg.textContent = 'Payment received — awaiting confirmation';
  } else {
    icon.innerHTML  = '<i class="fa-solid fa-circle-xmark"></i>';
    msg.textContent = 'Dues not yet paid for 2025/2026';
  }

  setTimeout(() => toast.classList.add('show'), 50);
  setTimeout(() => closeToast(), 5500);
}

function closeToast() {
  const toast = document.getElementById('toastPopup');
  if (toast) toast.classList.remove('show');
}

function loadStudentSession() {
  const saved = localStorage.getItem('nesaau_member');

  if (!saved) {
    document.getElementById('duesLoginGate').style.display  = 'flex';
    document.getElementById('duesPortalWrap').style.display = 'none';
    return;
  }

  const member = JSON.parse(saved);

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

      if (data.dues_status === 'pending' || data.dues_status === 'paid') {
        showDuesStateOnLoad(data.dues_status);
      }
    });
}

function showDuesStateOnLoad(status) {
  const step1 = document.getElementById('duesStep1');
  const step2 = document.getElementById('duesStep2');
  const step3 = document.getElementById('duesStep3');
  const s1    = document.getElementById('stepItem1');
  const s2    = document.getElementById('stepItem2');
  const s3    = document.getElementById('stepItem3');
  const member = window._nesaauMember;

  if (status === 'pending') {
    if (step1) step1.classList.add('hidden');
    if (step2) step2.classList.add('hidden');
    if (s1)  { s1.classList.remove('active'); s1.classList.add('done'); }
    if (s2)  { s2.classList.remove('active'); s2.classList.add('done'); }
    if (s3)    s3.classList.add('active');
    if (step3) {
      step3.classList.remove('hidden');
      step3.innerHTML = `
        <div class="dues-pending-state">
          <div class="dps-icon">&#9203;</div>
          <h3>Payment Under Review</h3>
          <p>Your receipt was received and is being verified
             by our Treasurer.</p>
          <p>You will have full access once confirmed —
             usually within <strong>24–48 hours</strong>.</p>
          <a href="tel:+2348159718496" class="dps-contact">
            &#128222; Contact Treasurer
          </a>
        </div>
      `;
    }
  }

  if (status === 'paid') {
    const stepsBar = document.querySelector('.steps-bar');
    if (stepsBar) stepsBar.style.display = 'none';

    if (step1) step1.classList.add('hidden');
    if (step2) step2.classList.add('hidden');
    if (step3) {
      step3.classList.remove('hidden');
      step3.innerHTML = getPaidMemberCard(member);
    }

    const benefitsSidebar = document.querySelector('.dues-benefits');
    if (benefitsSidebar) {
      benefitsSidebar.innerHTML = getPaidBenefitsSidebar(member);
    }
  }
}

function getPaidMemberCard(member) {
  const name     = member ? member.full_name : 'Member';
  const matric   = member ? member.matric_number : '';
  const level    = member ? member.level : '';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

  const now       = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextDue   = nextMonth.toLocaleDateString('en-NG', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  const daysLeft  = Math.ceil((nextMonth - now) / (1000 * 60 * 60 * 24));

  const currentMonth = now.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });

  return `
    <div class="paid-member-card">

      <!-- Gold shimmer header -->
      <div class="pmc-header">
        <div class="pmc-header-bg"></div>
        <div class="pmc-badge-wrap">
          <div class="pmc-verified-ring">
            <div class="pmc-avatar">${initials}</div>
            <div class="pmc-checkmark">
              <i class="fa-solid fa-check"></i>
            </div>
          </div>
        </div>
        <div class="pmc-header-text">
          <div class="pmc-status-pill">
            <i class="fa-solid fa-circle-check"></i> Verified Member
          </div>
        </div>
      </div>

      <!-- Main content -->
      <div class="pmc-body">
        <div class="pmc-congrats-text">
          <span class="pmc-wave">&#127881;</span>
          <h2>Congratulations, ${name.split(' ')[0]}!</h2>
          <p class="pmc-tagline">You are a fully verified dues-paying member of NESAAU for the <strong>2025/2026</strong> session.</p>
        </div>

        <!-- Member ID Card -->
        <div class="pmc-id-card">
          <div class="pmc-id-left">
            <div class="pmc-id-avatar">${initials}</div>
          </div>
          <div class="pmc-id-right">
            <div class="pmc-id-name">${name}</div>
            <div class="pmc-id-detail">${matric} &nbsp;&bull;&nbsp; ${level} Level</div>
            <div class="pmc-id-session">2025/2026 Academic Session</div>
          </div>
          <div class="pmc-id-stamp">
            <i class="fa-solid fa-circle-check"></i>
            <span>PAID</span>
          </div>
        </div>

        <!-- Next due countdown -->
        <div class="pmc-month-badge">
          <i class="fa-solid fa-calendar-day"></i>
          <span>Paid for <strong>${currentMonth}</strong></span>
        </div>

        <div class="pmc-next-due">
          <div class="pmc-next-due-left">
            <i class="fa-solid fa-calendar-check"></i>
            <div>
              <strong>Next Dues Due</strong>
              <span>${nextDue}</span>
            </div>
          </div>
          <div class="pmc-days-pill">
            <strong>${daysLeft}</strong>
            <span>days left</span>
          </div>
        </div>

        <!-- Access unlocked banner -->
        <div class="pmc-access-banner">
          <i class="fa-solid fa-unlock"></i>
          <span>All member benefits are now <strong>fully unlocked</strong></span>
        </div>

        <!-- Quick access buttons -->
        <div class="pmc-quick-btns">
          <a href="#academics" class="pmc-quick-btn">
            <i class="fa-solid fa-book-open"></i>
            <span>Past Questions</span>
          </a>
          <a href="#executives" class="pmc-quick-btn">
            <i class="fa-solid fa-users"></i>
            <span>Executives</span>
          </a>
          <a href="#announcements" class="pmc-quick-btn">
            <i class="fa-solid fa-bullhorn"></i>
            <span>Announcements</span>
          </a>
          <a href="#community" class="pmc-quick-btn">
            <i class="fa-solid fa-comments"></i>
            <span>Community</span>
          </a>
        </div>
      </div>

    </div>
  `;
}

function getPaidBenefitsSidebar(member) {
  const name = member ? member.full_name.split(' ')[0] : 'Member';
  return `
    <div class="paid-benefits-sidebar">
      <div class="pbs-header">
        <i class="fa-solid fa-crown"></i>
        <h4>Premium Member</h4>
        <p>Welcome to the inner circle, ${name}.</p>
      </div>
      <div class="pbs-perks">
        <div class="pbs-perk active">
          <i class="fa-solid fa-circle-check"></i>
          <span>All past questions &amp; notes</span>
        </div>
        <div class="pbs-perk active">
          <i class="fa-solid fa-circle-check"></i>
          <span>Voting rights at assembly</span>
        </div>
        <div class="pbs-perk active">
          <i class="fa-solid fa-circle-check"></i>
          <span>Exam clearance endorsed</span>
        </div>
        <div class="pbs-perk active">
          <i class="fa-solid fa-circle-check"></i>
          <span>Events &amp; seminar access</span>
        </div>
        <div class="pbs-perk active">
          <i class="fa-solid fa-circle-check"></i>
          <span>Welfare support</span>
        </div>
        <div class="pbs-perk active">
          <i class="fa-solid fa-circle-check"></i>
          <span>WhatsApp group access</span>
        </div>
        <div class="pbs-perk active">
          <i class="fa-solid fa-circle-check"></i>
          <span>Membership certificate</span>
        </div>
      </div>
      <div class="pbs-footer">
        <i class="fa-solid fa-shield-halved"></i>
        <span>Your membership is protected &amp; verified by NESAAU</span>
      </div>
    </div>
  `;
}
function showAuthMsg(el, type, text) {
  el.className = 'auth-msg ' + type;
  el.innerHTML = text;
}

document.addEventListener('DOMContentLoaded', loadStudentSession);

function updateSidebarAuth(member) {
  const sbLogin    = document.getElementById('sbLoginLink');
  const sbDues     = document.getElementById('sbDuesLink');
  const sbInfo     = document.getElementById('sbStudentInfo');
  const sbMyDues   = document.getElementById('sbMyDuesLink');
  const sbLogout   = document.getElementById('sbLogoutLink');
  const sbAvatar   = document.getElementById('sbStudentAvatar');
  const sbName     = document.getElementById('sbStudentName');
  const sbMatric   = document.getElementById('sbStudentMatric');
  const sbPill     = document.getElementById('sbDuesPill');
  const sbPhone  = document.getElementById('sbProfileLink');

  if (!sbLogin) return;

  if (member) {
    sbLogin.style.display  = 'none';
    sbDues.style.display   = 'none';
    sbInfo.style.display   = 'flex';
    sbMyDues.style.display = 'flex';
    sbLogout.style.display = 'flex';

    const initials = member.full_name
      .split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
    sbAvatar.textContent = initials;
    sbName.textContent   = member.full_name;
    sbMatric.textContent = member.matric_number + ' · ' + member.level + ' Level';

    if (sbPill) {
      if (member.dues_status === 'paid') {
        sbPill.innerHTML = '<i class="fa-solid fa-circle-check"></i> Dues Paid';
        sbPill.className   = 'sb-dues-pill paid';
      } else if (member.dues_status === 'pending') {
        sbPill.innerHTML = '<i class="fa-solid fa-clock"></i> Under Review';
        sbPill.className   = 'sb-dues-pill pending';
      } else {
        sbPill.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Dues Not Paid';
        sbPill.className   = 'sb-dues-pill unpaid';
      }
    }
  } else {
    sbLogin.style.display  = 'flex';
    sbDues.style.display   = 'flex';
    sbInfo.style.display   = 'none';
    sbMyDues.style.display = 'none';
    sbLogout.style.display = 'none';
  }
}

function openPhoneModal() {
  const modal   = document.getElementById('phoneModal');
  const overlay = document.getElementById('phoneModalOverlay');
  const member  = window._nesaauMember;

  if (!modal) return;

  if (member && member.phone_number) {
    const display = document.getElementById('currentPhoneDisplay');
    const numEl   = document.getElementById('currentPhoneNum');
    if (display) display.style.display = 'block';
    if (numEl)   numEl.textContent     = member.phone_number;
    const input = document.getElementById('phoneUpdateInput');
    if (input) input.value = member.phone_number;
  }

  modal.style.display   = 'flex';
  modal.style.flexDirection = 'column';
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  const msg = document.getElementById('phoneUpdateMsg');
  if (msg) { msg.className = 'auth-msg'; msg.innerHTML = ''; }
}

function closePhoneModal() {
  const modal   = document.getElementById('phoneModal');
  const overlay = document.getElementById('phoneModalOverlay');
  if (modal)   modal.style.display = 'none';
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}

async function savePhoneNumber() {
  const input  = document.getElementById('phoneUpdateInput');
  const msg    = document.getElementById('phoneUpdateMsg');
  const member = window._nesaauMember;

  if (!input || !member) return;

  const phone = input.value.trim();

  if (!phone) {
    showAuthMsg(msg, 'error', '⚠️ Please enter your WhatsApp number.');
    return;
  }

  if (phone.replace(/\D/g, '').length < 10) {
    showAuthMsg(msg, 'error', '⚠️ Please enter a valid phone number.');
    return;
  }

  showAuthMsg(msg, 'info', '⏳ Saving...');

  const { error } = await supabase
    .from('members')
    .update({ phone_number: phone })
    .eq('id', member.id);

  if (error) {
    showAuthMsg(msg, 'error', '❌ Failed to save: ' + error.message);
    return;
  }

  const updated = { ...member, phone_number: phone };
  localStorage.setItem('nesaau_member', JSON.stringify(updated));
  window._nesaauMember = updated;

  const display = document.getElementById('currentPhoneDisplay');
  const numEl   = document.getElementById('currentPhoneNum');
  if (display) display.style.display = 'block';
  if (numEl)   numEl.textContent     = phone;

  showAuthMsg(msg, 'success', '✅ Number saved! You will now receive WhatsApp notifications.');

  setTimeout(() => closePhoneModal(), 2000);
}
function openProfileModal() {
  const modal   = document.getElementById('profileModal');
  const overlay = document.getElementById('profileModalOverlay');
  const member  = window._nesaauMember;
  if (!modal || !member) return;

  document.getElementById('pmFullName').textContent = member.full_name  || '—';
  document.getElementById('pmMatric').textContent   = member.matric_number || '—';
  document.getElementById('pmLevel').textContent    = (member.level || '—') + ' Level';

  const initials = member.full_name
    .split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('pmInitials').textContent = initials;

  if (member.photo_url) {
    const img = document.getElementById('pmPhotoImg');
    img.src = member.photo_url;
    img.style.display = 'block';
    document.getElementById('pmInitials').style.display = 'none';
  } else {
    document.getElementById('pmPhotoImg').style.display    = 'none';
    document.getElementById('pmInitials').style.display    = 'grid';
  }

  const phoneInput = document.getElementById('pmPhone');
  if (phoneInput) phoneInput.value = member.phone_number || '';

  const duesEl = document.getElementById('pmDuesStatus');
  if (duesEl) {
    if (member.dues_status === 'paid') {
      duesEl.innerHTML  = '<i class="fa-solid fa-circle-check"></i> Paid — 2025/2026';
      duesEl.style.color  = '#16a34a';
    } else if (member.dues_status === 'pending') {
      duesEl.innerHTML  = '<i class="fa-solid fa-clock"></i> Under Review';
      duesEl.style.color  = '#b45309';
    } else {
      duesEl.innerHTML  = '<i class="fa-solid fa-circle-xmark"></i> Not Paid';
      duesEl.style.color  = '#dc2626';
    }
  }

  const msg = document.getElementById('pmMsg');
  if (msg) { msg.className = 'auth-msg'; msg.innerHTML = ''; }

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeProfileModal() {
  const modal   = document.getElementById('profileModal');
  const overlay = document.getElementById('profileModalOverlay');
  if (modal)   { modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); }
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}

function previewProfilePhoto(input) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = document.getElementById('pmPhotoImg');
    img.src = e.target.result;
    img.style.display = 'block';
    document.getElementById('pmInitials').style.display = 'none';
  };
  reader.readAsDataURL(input.files[0]);
}

async function saveProfile() {
  const msg    = document.getElementById('pmMsg');
  const member = window._nesaauMember;
  const phone  = document.getElementById('pmPhone').value.trim();
  const photoInput = document.getElementById('pmPhotoInput');

  if (!member) return;

  showAuthMsg(msg, 'info', '⏳ Saving...');

  let updates = {};
  let navAvatarUpdate = null;

  if (phone) {
    if (phone.replace(/\D/g,'').length < 10) {
      showAuthMsg(msg, 'error', '⚠️ Enter a valid phone number (at least 10 digits).');
      return;
    }
    updates.phone_number = phone;
  }

  if (photoInput.files && photoInput.files[0]) {
    const file     = photoInput.files[0];
    const safeName = member.matric_number.replace(/\//g, '-').replace(/\s/g, '');
    const ext      = file.name.split('.').pop();
    const fileName = `profiles/${safeName}-${Date.now()}.${ext}`;

    const { data: upData, error: upErr } = await supabase.storage
      .from('exec-photos')
      .upload(fileName, file, { upsert: true });

    if (upErr) {
      console.warn('Photo upload failed:', upErr.message);
    } else {
      const { data: urlData } = supabase.storage
        .from('exec-photos')
        .getPublicUrl(fileName);
      if (urlData?.publicUrl) {
        updates.photo_url = urlData.publicUrl;
        navAvatarUpdate   = urlData.publicUrl;
      }
    }
  }

  if (!Object.keys(updates).length) {
    showAuthMsg(msg, 'error', '⚠️ No changes to save.');
    return;
  }

  const { error } = await supabase
    .from('members')
    .update(updates)
    .eq('id', member.id);

  if (error) {
    showAuthMsg(msg, 'error', '❌ Failed: ' + error.message);
    return;
  }

  const updated = { ...member, ...updates };
  localStorage.setItem('nesaau_member', JSON.stringify(updated));
  window._nesaauMember = updated;

  if (navAvatarUpdate) {
    const navAvatar = document.getElementById('navStudentAvatar');
    if (navAvatar) {
      navAvatar.style.padding    = '0';
      navAvatar.style.background = 'none';
      navAvatar.innerHTML =
        `<img src="${navAvatarUpdate}" alt="Profile"
              style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`;
    }

    const sbAvatar = document.getElementById('sbStudentAvatar');
    if (sbAvatar) {
      sbAvatar.innerHTML =
        `<img src="${navAvatarUpdate}" alt="Profile"
              style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`;
    }

    const pmImg = document.getElementById('pmPhotoImg');
    const pmInit = document.getElementById('pmInitials');
    if (pmImg) {
      pmImg.src = navAvatarUpdate;
      pmImg.style.display = 'block';
    }
    if (pmInit) pmInit.style.display = 'none';
  }

  showAuthMsg(msg, 'success', '✅ Profile updated successfully!');
  setTimeout(() => closeProfileModal(), 1800);
}
