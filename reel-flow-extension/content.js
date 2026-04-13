// content.js — Google Flow 페이지에서 자동 실행

console.log('[릴팝 Flow] content.js 로드됨');

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'inputPrompt') {
    handleInputPrompt(msg.prompt, msg.style, msg.index)
      .then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.action === 'downloadImage') {
    handleDownload(msg.index, msg.filename)
      .then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }
});

// ===== 프롬프트 입력 (Slate 에디터 전용) =====
async function handleInputPrompt(prompt, style, index) {
  // Flow는 div[role="textbox"] contenteditable Slate 에디터
  const editor = await waitForElement('div[role="textbox"][contenteditable="true"]', 8000);
  if (!editor) throw new Error('입력창을 찾을 수 없어요.');

  // 1. 에디터 클릭해서 포커스
  editor.click();
  await sleep(300);

  // 2. 전체 선택 후 삭제
  editor.focus();
  document.execCommand('selectAll', false, null);
  await sleep(200);
  document.execCommand('delete', false, null);
  await sleep(300);

  // 3. 텍스트 입력 (execCommand insertText - Slate에서 가장 안정적)
  document.execCommand('insertText', false, prompt);
  await sleep(500);

  // 4. input/change 이벤트 발생
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  editor.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(300);

  // 5. 생성 버튼 찾아서 클릭
  await sleep(500);
  const genBtn = findGenerateButton();
  if (genBtn) {
    genBtn.click();
    console.log(`[릴팝 Flow] ${index+1}번 프롬프트 생성 시작`);
  } else {
    // 엔터로 시도
    editor.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', keyCode:13, bubbles:true}));
    console.log('[릴팝 Flow] 엔터로 생성 시도');
  }
}

// ===== 생성 버튼 찾기 =====
function findGenerateButton() {
  // Flow의 전송 버튼 — 화살표 버튼 (→)
  const btns = document.querySelectorAll('button');
  for (const btn of btns) {
    const aria = btn.getAttribute('aria-label') || '';
    const text = btn.textContent.trim();
    if (aria.includes('전송') || aria.includes('Send') || aria.includes('Generate') ||
        aria.includes('생성') || text === '→' || btn.type === 'submit') {
      return btn;
    }
  }
  // SVG 화살표 버튼 찾기 (Flow 특유)
  const svgBtns = document.querySelectorAll('button svg');
  if (svgBtns.length > 0) {
    // 마지막 SVG 버튼이 보통 전송 버튼
    return svgBtns[svgBtns.length - 1].closest('button');
  }
  return null;
}

// ===== 이미지 다운로드 =====
async function handleDownload(index, filename) {
  await sleep(3000);

  // 생성된 이미지 찾기 — Flow는 img 태그로 렌더링
  const images = document.querySelectorAll('img:not([src*="icon"]):not([src*="avatar"]):not([src*="logo"])');
  const validImgs = Array.from(images).filter(img => {
    const src = img.src || '';
    const w = img.naturalWidth || img.width;
    return w > 200 && (src.startsWith('blob:') || src.startsWith('https://'));
  });

  if (validImgs.length === 0) {
    console.log('[릴팝 Flow] 이미지 없음 — 생성 완료 전일 수 있어요');
    return;
  }

  const lastImg = validImgs[validImgs.length - 1];
  console.log(`[릴팝 Flow] 다운로드: ${filename} (${lastImg.src.slice(0,60)})`);
  triggerDownload(lastImg.src, filename);
}

function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

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

