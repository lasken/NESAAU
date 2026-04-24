// ============================================================
// NESAAU — dues.js
// ============================================================
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

  // --- Upload to Supabase Storage ---
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('dues-receipts')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    // If storage fails, still save the submission without the URL
    // so the exco knows someone paid even if photo upload failed
    console.warn('Storage upload failed:', uploadError.message);
    await saveSubmission(member, null, msg);
    return;
  }

  // --- Get public URL ---
  const { data: urlData } = supabase
    .storage
    .from('dues-receipts')
    .getPublicUrl(fileName);

  const publicUrl = urlData?.publicUrl || null;
  await saveSubmission(member, publicUrl, msg);
}

async function saveSubmission(member, receiptUrl, msg) {
  // --- Save submission to database ---
  const { error: insertError } = await supabase
    .from('dues_submissions')
    .insert({
      member_id:     member.id,
      full_name:     member.full_name,
      matric_number: member.matric_number,
      level:         member.level,
      session:       '2024/2025',
      receipt_url:   receiptUrl,
      status:        'pending'
    });

  if (insertError) {
    showMsg(msg, 'error', '❌ Submission failed: ' + insertError.message);
    return;
  }

  // --- Update member status to pending ---
  await supabase
    .from('members')
    .update({ dues_status: 'pending' })
    .eq('id', member.id);

  // --- Update localStorage with new status ---
  const updatedMember = { ...member, dues_status: 'pending' };
  localStorage.setItem('nesaau_member', JSON.stringify(updatedMember));
  window._nesaauMember = updatedMember;

  // --- Show step 3 ---
  document.getElementById('stepItem2').classList.remove('active');
  document.getElementById('stepItem2').classList.add('done');
  document.getElementById('stepItem3').classList.add('active');
  document.getElementById('duesStep2').classList.add('hidden');
  document.getElementById('duesStep3').classList.remove('hidden');
  document.getElementById('duesStep3')
    .scrollIntoView({ behavior: 'smooth', block: 'start' });

  // --- Update toast ---
  const pill = document.getElementById('duesStatusPill');
  if (pill) {
    pill.textContent = '⏳ Payment Under Review';
    pill.className   = 'dues-status-pill pending';
  }

  // --- Update nav student info toast ---
  showDuesToast('pending');
}