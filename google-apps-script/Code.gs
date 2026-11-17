/* NOVA inquiry mail bridge. Keep this project private; deploy only its signed endpoint. */

function configureNovaNotifications() {
  var properties = PropertiesService.getScriptProperties();
  if (!novaRecipient_(properties.getProperty('NOVA_NOTIFICATION_TO'))) {
    throw new Error('스크립트 속성 NOVA_NOTIFICATION_TO에 알림을 받을 이메일을 먼저 설정하세요.');
  }
  if (!properties.getProperty('NOVA_NOTIFICATION_SECRET')) {
    properties.setProperty('NOVA_NOTIFICATION_SECRET',
      (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''));
  }
  // Requests Google's send_mail permission, without sending a test email.
  var remaining = MailApp.getRemainingDailyQuota();
  console.log('NOVA 설정 저장 완료. 오늘 남은 수신자 한도: ' + remaining);
  console.log('프로젝트 설정 > 스크립트 속성에서 비밀값을 확인하세요. 채팅이나 공개 코드에 붙이지 마세요.');
}

function doGet() {
  return novaReply_({ ok: true, service: 'NOVA inquiry notifications', accepts: 'signed POST only' });
}

function doPost(event) {
  var lock;
  try {
    var raw = event && event.postData && event.postData.contents;
    if (typeof raw !== 'string' || raw.length > 20000) return novaReply_({ ok: false, error: 'invalid-request' });
    var envelope = JSON.parse(raw);
    var properties = PropertiesService.getScriptProperties();
    var secret = properties.getProperty('NOVA_NOTIFICATION_SECRET');
    var recipient = properties.getProperty('NOVA_NOTIFICATION_TO');
    if (!secret || secret.length < 32 || !novaRecipient_(recipient)) {
      return novaReply_({ ok: false, error: 'not-configured' });
    }
    var now = Date.now();
    if (!Number.isSafeInteger(envelope.timestamp) || now - envelope.timestamp > 300000 || envelope.timestamp - now > 60000 ||
        typeof envelope.payload !== 'string' || envelope.payload.length > 15000 ||
        typeof envelope.signature !== 'string' || !/^[a-f0-9]{64}$/.test(envelope.signature)) {
      return novaReply_({ ok: false, error: 'invalid-request' });
    }
    var signature = Utilities.computeHmacSha256Signature(
      String(envelope.timestamp) + '.' + envelope.payload, secret, Utilities.Charset.UTF_8
    ).map(function (byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join('');
    if (!novaEqual_(signature, envelope.signature)) return novaReply_({ ok: false, error: 'unauthorized' });
    var inquiry = JSON.parse(envelope.payload);
    if (!novaValid_(inquiry)) return novaReply_({ ok: false, error: 'invalid-inquiry' });

    lock = LockService.getScriptLock();
    if (!lock.tryLock(1000)) { lock = null; return novaReply_({ ok: false, error: 'busy' }); }
    var marker = 'nova_sent:' + inquiry.request_id;
    if (properties.getProperty(marker)) return novaReply_({ ok: true, duplicate: true });
    if (MailApp.getRemainingDailyQuota() < 1) return novaReply_({ ok: false, error: 'daily-quota' });

    MailApp.sendEmail({
      to: recipient,
      replyTo: inquiry.email,
      name: 'NOVA 문의 알림',
      subject: '[NOVA 새 문의] ' + inquiry.subject,
      body: [
        'NOVA IT 학습 사이트에 새 문의가 접수되었습니다.', '',
        '접수 번호: ' + inquiry.request_id,
        '이름: ' + (inquiry.name || '(미입력)'),
        '이메일: ' + inquiry.email,
        '제목: ' + inquiry.subject, '', '문의 내용:', inquiry.message, '',
        '사이트: https://nova-it-study.vercel.app/',
        '이 메일에 답장하면 문의자가 남긴 이메일 주소로 전송됩니다.'
      ].join('\n')
    });
    properties.setProperty(marker, String(now));
    // Bound properties storage; duplicate suppression is retained for 30 days.
    if (now - Number(properties.getProperty('nova_last_prune') || 0) > 86400000) {
      var all = properties.getProperties();
      Object.keys(all).forEach(function (key) {
        if (key.indexOf('nova_sent:') === 0 && now - Number(all[key]) > 30 * 86400000) properties.deleteProperty(key);
      });
      properties.setProperty('nova_last_prune', String(now));
    }
    return novaReply_({ ok: true });
  } catch (error) {
    // Return no private content or exception details to callers.
    return novaReply_({ ok: false, error: 'delivery-failed' });
  } finally {
    if (lock) lock.releaseLock();
  }
}

function novaEqual_(left, right) {
  if (left.length !== right.length) return false;
  var difference = 0;
  for (var i = 0; i < left.length; i++) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return difference === 0;
}

function novaRecipient_(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(value);
}

function novaValid_(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (typeof value.request_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.request_id)) return false;
  if (typeof value.email !== 'string' || value.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) return false;
  if (typeof value.name !== 'string' || value.name.length > 80 || /[\r\n\0]/.test(value.name)) return false;
  if (typeof value.subject !== 'string' || value.subject.length < 2 || value.subject.length > 120 || /[\r\n\0]/.test(value.subject)) return false;
  return typeof value.message === 'string' && value.message.length >= 10 && value.message.length <= 5000 && !value.message.includes('\0');
}

function novaReply_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
