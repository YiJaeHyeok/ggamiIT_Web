const test = require('node:test');
const assert = require('node:assert/strict');
const {createHmac, randomUUID} = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const handler = require('../api/inquiries');
const secret = 'unit-test-only-'.repeat(4);
const data = () => ({request_id:randomUUID(),name:'테스트',email:'sender@example.com',subject:'홈페이지 문의',message:'알림 기능을 검증하는 가상의 문의입니다.',consent:true});
const request = body => ({method:'POST',headers:{origin:'https://nova-it-study.vercel.app','content-type':'application/json'},body,socket:{remoteAddress:randomUUID()}});
const response = () => ({setHeader(){},end(value){this.body=JSON.parse(value);}});
const envelope = (inquiry, timestamp=Date.now()) => {
  const payload=JSON.stringify(inquiry);
  return {timestamp,payload,signature:createHmac('sha256',secret).update(`${timestamp}.${payload}`).digest('hex')};
};
function receiver(options={}) {
  const props = new Map([['NOVA_NOTIFICATION_SECRET',secret],['NOVA_NOTIFICATION_TO',options.recipient === undefined ? 'operator@example.com' : options.recipient]]);
  const sent=[];
  const context={
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k)||null,setProperty:(k,v)=>props.set(k,v),setProperties:values=>Object.entries(values).forEach(([k,v])=>props.set(k,v)),getProperties:()=>Object.fromEntries(props),deleteProperty:k=>props.delete(k)})},
    LockService:{getScriptLock:()=>({tryLock:()=>options.lock!==false,releaseLock(){}})},
    Utilities:{Charset:{UTF_8:'UTF-8'},computeHmacSha256Signature:(text,key)=>Array.from(createHmac('sha256',key).update(text).digest()).map(b=>b>127?b-256:b),getUuid:randomUUID},
    MailApp:{getRemainingDailyQuota:()=>options.quota??100,sendEmail:mail=>{if(options.fail)throw Error('simulated');sent.push(mail);}},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this;}})},
    console:{log(){},warn(){},error(){}}
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../google-apps-script/Code.gs'),'utf8'),context);
  return {props,sent,configure:()=>context.configureNovaNotifications(),post:value=>JSON.parse(context.doPost({postData:{contents:JSON.stringify(value)}}).text)};
}

test('saved inquiry sends signed whitelisted payload; mail failure cannot undo storage; duplicate DB result never emails unsaved content', async()=>{
  const names=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','INQUIRY_NOTIFICATION_URL','INQUIRY_NOTIFICATION_SECRET'];
  const saved=Object.fromEntries(names.map(n=>[n,process.env[n]])), oldFetch=global.fetch;
  Object.assign(process.env,{SUPABASE_URL:'https://exampleproject.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test-key',INQUIRY_NOTIFICATION_URL:'https://script.google.com/macros/s/test-deployment/exec',INQUIRY_NOTIFICATION_SECRET:secret});
  try {
    let calls=[], dbStatus=201, failMail=false;
    const google=receiver();
    global.fetch=async(url,options)=>{
      calls.push({url,options});
      if(url.includes('supabase.co'))return {ok:dbStatus===201,status:dbStatus,json:async()=>({code:'23505',message:'inquiries_request_id_key'})};
      if(failMail)throw Error('private error');
      const body=JSON.parse(options.body);
      assert.equal(body.signature,createHmac('sha256',secret).update(`${body.timestamp}.${body.payload}`).digest('hex'));
      const contents=JSON.parse(body.payload);
      assert.equal(contents.email,'sender@example.com');
      assert.equal(contents.to,undefined);
      assert.equal(contents.status,undefined);
      assert.equal(contents.consent,undefined);
      return {ok:true,json:async()=>google.post(body)};
    };
    const body={...data(),to:'attacker@example.com',status:'closed'};
    let res=response();await handler(request(body),res);
    assert.equal(res.statusCode,201);assert.equal(calls.length,2,'DB success must invoke notifier');
    assert.ok(calls[0].url.includes('supabase.co'));assert.ok(calls[1].url.startsWith('https://script.google.com/'));
    assert.equal(google.sent.length,1);assert.equal(google.sent[0].to,'operator@example.com');
    dbStatus=409;calls=[];res=response();await handler(request({...body,subject:'실제로 저장되지 않은 변경 내용'}),res);
    assert.equal(res.statusCode,201);assert.equal(google.sent.length,1);
    assert.equal(calls.length,1,'unverified duplicate content must never reach the mail receiver');
    dbStatus=503;calls=[];res=response();await handler(request(data()),res);
    assert.equal(res.statusCode,503);assert.equal(calls.length,1,'failed storage must never send mail');
    dbStatus=201;failMail=true;res=response();await handler(request(data()),res);
    assert.equal(res.statusCode,201);assert.equal(res.body.ok,true);assert.equal(JSON.stringify(res.body).includes('private'),false);
  } finally {global.fetch=oldFetch;for(const n of names)if(saved[n]===undefined)delete process.env[n];else process.env[n]=saved[n];}
});

test('receiver rejects unsigned, modified, old, future, malformed and invalid-field requests without sending',()=>{
  const google=receiver();
  const good=envelope(data());
  const invalid=[{}, {...good,signature:'a'.repeat(64)}, {...good,payload:good.payload+' '}, envelope(data(),Date.now()-6*60_000),envelope(data(),Date.now()+2*60_000),envelope({...data(),email:'bad'}),envelope({...data(),request_id:'bad'}),envelope({...data(),subject:'\r\nInjected header'}),envelope({...data(),message:'x'.repeat(5001)}),envelope({...data(),message:'\0invalid body'})];
  for(const body of invalid)assert.equal(google.post(body).ok,false);
  assert.equal(google.sent.length,0);
});

test('receiver fixes recipient and reply-to, renders plain text, suppresses duplicates and prunes old receipts',()=>{
  const google=receiver(), inquiry={...data(),message:'<img src=x onerror=alert(1)> 가상의 문의 내용',to:'attacker@example.com'};
  google.props.set('nova_sent:'+randomUUID(),String(Date.now()-31*86400_000));
  assert.equal(google.post(envelope(inquiry)).ok,true);
  assert.equal(google.sent.length,1);assert.equal(google.sent[0].to,'operator@example.com');
  assert.equal(google.sent[0].replyTo,'sender@example.com');assert.equal(google.sent[0].htmlBody,undefined);
  assert.ok(google.sent[0].body.includes(inquiry.message));
  assert.equal(google.post(envelope(inquiry)).duplicate,true);assert.equal(google.sent.length,1);
  assert.equal([...google.props.keys()].filter(k=>k.startsWith('nova_sent:')).length,1);
});

test('quota, lock contention and send failure remain retryable without sent marker',()=>{
  for(const option of [{quota:0},{lock:false},{fail:true}]){
    const google=receiver(option), inquiry=data();
    assert.equal(google.post(envelope(inquiry)).ok,false);
    assert.equal(google.props.has('nova_sent:'+inquiry.request_id),false);
  }
});

test('notifier accepts the NOVA secret name shared with Google properties and saved in Vercel',async()=>{
  const google=receiver();
  const env={INQUIRY_NOTIFICATION_URL:'https://script.google.com/macros/s/test-deployment/exec',NOVA_NOTIFICATION_SECRET:secret};
  const result=await handler.notifyInquiry(data(),{env,fetcher:async(url,options)=>({ok:true,json:async()=>google.post(JSON.parse(options.body))})});
  assert.equal(result.status,'sent');
  assert.equal(google.sent.length,1);
  assert.equal(google.sent[0].to,'operator@example.com');
});

test('notifier is disabled without complete configuration and rejects non-Google endpoints',async()=>{
  assert.equal(typeof handler.notifyInquiry,'function');
  let called=false;
  const fetcher=async()=>{called=true;throw Error('must not fetch');};
  assert.equal((await handler.notifyInquiry(data(),{env:{},fetcher})).status,'disabled');
  for(const url of ['http://script.google.com/macros/s/id/exec','https://script.google.com.evil.test/macros/s/id/exec','https://script.google.com/macros/s/id/dev','https://script.google.com/macros/s/id/exec?token=bad']){
    assert.equal((await handler.notifyInquiry(data(),{env:{INQUIRY_NOTIFICATION_URL:url,INQUIRY_NOTIFICATION_SECRET:secret},fetcher})).status,'invalid-config');
  }
  assert.equal(called,false);
});


test('receiver uses only the owner-configured recipient and rejects missing or invalid settings',()=>{
  const google=receiver({recipient:'owner@example.org'});
  google.configure();
  assert.equal(google.props.get('NOVA_NOTIFICATION_TO'),'owner@example.org');
  assert.equal(google.post(envelope({...data(),to:'attacker@example.com'})).ok,true);
  assert.equal(google.sent[0].to,'owner@example.org');
  for(const recipient of ['', 'bad', 'owner@example.org\r\nBcc: other@example.com']){
    const invalid=receiver({recipient});
    assert.equal(invalid.post(envelope(data())).ok,false);
    assert.throws(()=>invalid.configure());
    assert.equal(invalid.sent.length,0);
  }
});
