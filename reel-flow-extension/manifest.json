// content.js — Google Flow 페이지에서 자동 실행

console.log('[릴팝 Flow] content.js 로드됨');

// popup.js로부터 메시지 수신
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'inputPrompt') {
    handleInputPrompt(msg.prompt, msg.style, msg.index)
      .then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true; // 비동기 응답
  }

  if (msg.action === 'downloadImage') {
    handleDownload(msg.index, msg.filename)
      .then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }
});

// ===== 프롬프트 입력 =====
async function handleInputPrompt(prompt, style, index) {
  // 1. 텍스트 입력창 찾기 (Flow 페이지 구조에 맞게)
  const textarea = await waitForElement('textarea, [contenteditable="true"], input[type="text"]', 8000);
  if (!textarea) throw new Error('입력창을 찾을 수 없어요. Flow 페이지를 확인해주세요.');

  // 2. 기존 내용 지우고 새 프롬프트 입력
  textarea.focus();
  textarea.select?.();

  // contenteditable 또는 textarea 모두 처리
  if (textarea.tagName === 'TEXTAREA' || textarea.tagName === 'INPUT') {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
      || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    nativeInputValueSetter?.call(textarea, '');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(300);
    nativeInputValueSetter?.call(textarea, prompt);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    // contenteditable
    textarea.innerHTML = '';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(300);
    textarea.textContent = prompt;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  await sleep(500);

  // 3. 스타일 선택 (선택사항)
  if (style) {
    await selectStyle(style);
  }

  // 4. 생성 버튼 클릭
  await sleep(300);
  const genBtn = findGenerateButton();
  if (genBtn) {
    genBtn.click();
    console.log(`[릴팝 Flow] 생성 버튼 클릭 (${index+1}번 프롬프트)`);
  } else {
    // 엔터로 시도
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    console.log('[릴팝 Flow] 엔터로 생성 시도');
  }
}

// ===== 스타일 선택 =====
async function selectStyle(styleName) {
  try {
    // 스타일 버튼/드롭다운 찾기
    const styleButtons = document.querySelectorAll('button, [role="option"], [role="button"]');
    for (const btn of styleButtons) {
      if (btn.textContent.includes(styleName)) {
        btn.click();
        await sleep(500);
        return;
      }
    }
  } catch(e) {
    console.log('[릴팝 Flow] 스타일 선택 실패 (무시하고 계속):', e.message);
  }
}

// ===== 생성 버튼 찾기 =====
function findGenerateButton() {
  const candidates = document.querySelectorAll('button');
  const keywords = ['생성', 'Generate', '만들기', 'Create', 'Run', '실행'];
  for (const btn of candidates) {
    const text = btn.textContent.trim();
    if (keywords.some(k => text.includes(k))) return btn;
  }
  // 마지막 submit 버튼
  const submitBtns = document.querySelectorAll('button[type="submit"]');
  if (submitBtns.length > 0) return submitBtns[submitBtns.length - 1];
  return null;
}

// ===== 이미지 다운로드 =====
async function handleDownload(index, filename) {
  // 생성된 이미지 찾기
  await sleep(2000); // 이미지 로드 대기

  const images = document.querySelectorAll('img[src*="blob"], img[src*="data:"], canvas');
  if (images.length === 0) {
    console.log('[릴팝 Flow] 다운로드할 이미지를 찾지 못함');
    return;
  }

  // 가장 최근에 생성된 이미지 (마지막 이미지)
  const lastImg = images[images.length - 1];

  if (lastImg.tagName === 'CANVAS') {
    // canvas → blob → 다운로드
    lastImg.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      triggerDownload(url, filename);
    }, 'image/jpeg', 0.95);
  } else {
    // img src 다운로드
    triggerDownload(lastImg.src, filename);
  }
}

function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  console.log(`[릴팝 Flow] 다운로드: ${filename}`);
}

// ===== 유틸 =====
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) { resolve(el); return; }

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) { observer.disconnect(); resolve(el); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
