const supabase = window._sb;

async function submitPayment() {
  const receipt = document.getElementById('receiptFile');
  const msg     = document.getElementById('payMsg');

  if (!receipt.files || !receipt.files[0]) {
    showMsg(msg, 'error', '⚠️ Please upload your payment receipt before submitting.');
    return;
  }

  const member = window._nesaauMember;
  if (!member) {
    showMsg(msg, 'error', '❌ Session expired. Please logout and login again.');
    return;
  }

  showMsg(msg, 'success', '⏳ Uploading your receipt... please wait.');

  const file      = receipt.files[0];
  const safeName  = member.matric_number.replace(/\//g, '-').replace(/\s/g, '');
  const ext       = file.name.split('.').pop();
  const fileName  = `receipts/${safeName}-${Date.now()}.${ext}`;

  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('dues-receipts')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    console.warn('Storage upload failed:', uploadError.message);
    await saveSubmission(member, null, msg);
    return;
  }

  const { data: urlData } = supabase
    .storage
    .from('dues-receipts')
    .getPublicUrl(fileName);

  const publicUrl = urlData?.publicUrl || null;
  await saveSubmission(member, publicUrl, msg);
}

async function saveSubmission(member, receiptUrl, msg) {
  const { error: insertError } = await supabase
    .from('dues_submissions')
    .insert({
      member_id:     member.id,
      full_name:     member.full_name,
      matric_number: member.matric_number,
      level:         member.level,
      session:       '2025/2026',
      receipt_url:   receiptUrl,
      status:        'pending'
    });

  if (insertError) {
    showMsg(msg, 'error', '❌ Submission failed: ' + insertError.message);
    return;
  }

  await supabase
    .from('members')
    .update({ dues_status: 'pending' })
    .eq('id', member.id);

  const updatedMember = { ...member, dues_status: 'pending' };
  localStorage.setItem('nesaau_member', JSON.stringify(updatedMember));
  window._nesaauMember = updatedMember;

  notifyFinSecWhatsApp(member);

  document.getElementById('stepItem2').classList.remove('active');
  document.getElementById('stepItem2').classList.add('done');
  document.getElementById('stepItem3').classList.add('active');
  document.getElementById('duesStep2').classList.add('hidden');
  document.getElementById('duesStep3').classList.remove('hidden');
  document.getElementById('duesStep3')
    .scrollIntoView({ behavior: 'smooth', block: 'start' });

  const pill = document.getElementById('duesStatusPill');
if (member.dues_status === 'paid') {
    pill.innerHTML = '<i class="fa-solid fa-circle-check"></i> Dues Paid — 2025/2026';
    pill.className = 'dues-status-pill paid';
  } else if (member.dues_status === 'pending') {
    pill.innerHTML = '<i class="fa-solid fa-clock"></i> Payment Under Review';
    pill.className = 'dues-status-pill pending';
  } else {
    pill.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Dues Not Paid';
    pill.className = 'dues-status-pill unpaid';
  }
}


const FIN_SEC_WHATSAPP = '2348159718496';

function notifyFinSecWhatsApp(member) {
  const now = new Date().toLocaleString('en-NG', {
    day:    'numeric',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit'
  });

  let message = `💳 *NESAAU DUES SUBMISSION*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `*Name:*    ${member.full_name}\n`;
  message += `*Matric:*  ${member.matric_number}\n`;
  message += `*Level:*   ${member.level} Level\n`;
  message += `*Session:* 2025/2026\n`;
  message += `*Time:*    ${now}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `Receipt has been uploaded to the portal.\n`;
  message += `Please verify and confirm payment.\n\n`;
  message += `🔗 Admin Panel: ${window.location.origin}/admin.html\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `_Sent automatically via NESAAU Website_`;

  const url = `https://wa.me/${FIN_SEC_WHATSAPP}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}
