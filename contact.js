/* 개인정보는 브라우저 저장소에 보관하지 않습니다. /api/inquiries로만 전송합니다. */
(() => {
  const form = document.querySelector('#contact-form');
  if (!form) return;
  const button = form.querySelector('button[type="submit"]');
  const status = document.querySelector('#contact-status');
  const counter = document.querySelector('#contact-count');
  const successDialog = document.querySelector('#contact-success-dialog');
  successDialog?.addEventListener('close', () => button.focus({ preventScroll: true }));
  let requestId = crypto.randomUUID();
  let submitting = false;
  form.addEventListener('input', () => {
    requestId = crypto.randomUUID();
    counter.textContent = form.elements.message.value.length.toLocaleString() + ' / 5,000';
    if (!submitting) { status.textContent = ''; status.removeAttribute('data-state'); }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting || !form.reportValidity()) return;
    const controls = [...form.querySelectorAll('input,textarea,button')];
    let saved = false;
    const body = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      subject: form.elements.subject.value.trim(),
      message: form.elements.message.value.trim(),
      website: form.elements.website.value,
      consent: form.elements.consent.checked,
      request_id: requestId
    };
    submitting = true;
    form.setAttribute('aria-busy', 'true');
    controls.forEach(control => { control.disabled = true; });
    button.textContent = '보내는 중…';
    status.dataset.state = 'pending';
    status.textContent = '문의 내용을 저장하고 있습니다.';
    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true || !result.receipt) throw new Error(result.error || '저장을 완료하지 못했습니다. 잠시 후 다시 보내주세요.');
      form.reset();
      counter.textContent = '0 / 5,000';
      requestId = crypto.randomUUID();
      status.dataset.state = 'success';
      status.textContent = '문의가 접수되었습니다. 접수번호: ' + result.receipt.slice(0, 8).toUpperCase() + ' · 남겨주신 이메일로 답변드릴 수 있도록 저장했습니다.';
      saved = true;
    } catch (error) {
      status.dataset.state = 'error';
      status.textContent = error.name === 'TimeoutError' || error.name === 'AbortError' ? '응답이 늦어지고 있습니다. 입력 내용은 유지됩니다. 다시 보내기를 눌러주세요.' : error.message;
    } finally {
      submitting = false;
      controls.forEach(control => { control.disabled = false; });
      form.removeAttribute('aria-busy');
      button.textContent = '문의 보내기 ↗';
    }
    if (saved) {
      if (successDialog && typeof successDialog.showModal === 'function') {
        successDialog.showModal();
      } else {
        window.alert('문의 보냈습니다.\n24시간 내로 확인 후 답변드리겠습니다.');
      }
    }
  });
})();
