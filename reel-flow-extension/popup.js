// popup.js — 릴팝 Flow 자동화

let prompts = [];
let isRunning = false;
let currentIdx = 0;

// ===== 초기화 =====
document.addEventListener('DOMContentLoaded', () => {
  loadPrompts();
});

function loadPrompts() {
  chrome.storage.local.get(['flowPrompts', 'flowChannel'], (data) => {
    prompts = data.flowPrompts || [];
    const channel = data.flowChannel || '알 수 없음';

    if (prompts.length === 0) {
      document.getElementById('noPrompts').style.display = 'block';
      document.getElementById('mainArea').style.display = 'none';
      return;
    }

    document.getElementById('noPrompts').style.display = 'none';
    document.getElementById('mainArea').style.display = 'block';
    document.getElementById('channelName').textContent = channel;
    document.getElementById('promptCount').textContent = prompts.length;
    updateProgress(0, prompts.length);
    addLog(`✅ ${channel} 프롬프트 ${prompts.length}개 로드됨`, 'ok');
  });
}

function updateProgress(current, total) {
  document.getElementById('progressText').textContent = `${current} / ${total}`;
  const pct = total > 0 ? (current / total * 100) : 0;
  document.getElementById('progressFill').style.width = pct + '%';
}

function addLog(msg, type = '') {
  const box = document.getElementById('logBox');
  const line = document.createElement('div');
  line.className = type;
  line.textContent = msg;
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

// ===== 시작 =====
async function startFlow() {
  if (prompts.length === 0) { addLog('프롬프트가 없어요.', 'err'); return; }

  // Flow 탭 확인
  const tabs = await chrome.tabs.query({ url: 'https://labs.google/fx/ko/tools/flow*' });
  if (tabs.length === 0) {
    addLog('⚠️ Flow 탭이 없어요. Flow를 먼저 열어주세요.', 'err');
    chrome.tabs.create({ url: 'https://labs.google/fx/ko/tools/flow' });
    return;
  }

  isRunning = true;
  document.getElementById('startBtn').style.display = 'none';
  document.getElementById('stopBtn').style.display = 'block';

  const waitTime = parseInt(document.getElementById('waitTime').value) * 1000;
  const style = document.getElementById('styleSelect').value;
  const flowTab = tabs[0];

  addLog(`▶ 자동화 시작 — ${prompts.length}개 프롬프트`, 'info');

  for (let i = currentIdx; i < prompts.length; i++) {
    if (!isRunning) { addLog('■ 중지됨', 'err'); break; }

    const p = prompts[i];
    addLog(`[${i+1}/${prompts.length}] ${p.scene}`);

    // content.js에 메시지 전송
    try {
      await chrome.tabs.sendMessage(flowTab.id, {
        action: 'inputPrompt',
        prompt: p.prompt,
        style: style,
        index: i
      });

      addLog(`  ⏳ 이미지 생성 대기 중... (${waitTime/1000}초)`, 'info');
      await sleep(waitTime);

      // 다운로드 요청
      await chrome.tabs.sendMessage(flowTab.id, {
        action: 'downloadImage',
        index: i,
        filename: `${String(i+1).padStart(2,'0')}_${p.scene.slice(0,15)}.jpg`
      });

      currentIdx = i + 1;
      updateProgress(currentIdx, prompts.length);
      addLog(`  ✅ 완료!`, 'ok');

      // 다음 프롬프트 전 2초 대기
      await sleep(2000);

    } catch(e) {
      addLog(`  ❌ 오류: ${e.message}`, 'err');
      addLog('  → Flow 탭을 확인해주세요.', 'err');
    }
  }

  if (isRunning && currentIdx >= prompts.length) {
    addLog(`🎉 모든 이미지 생성 완료! (${prompts.length}개)`, 'ok');
    addLog('📁 다운로드 폴더에서 확인하세요.', 'info');
    isRunning = false;
  }

  document.getElementById('startBtn').style.display = 'block';
  document.getElementById('stopBtn').style.display = 'none';
}

function stopFlow() {
  isRunning = false;
  document.getElementById('startBtn').style.display = 'block';
  document.getElementById('stopBtn').style.display = 'none';
  addLog('■ 중지됨 — 재시작하면 이어서 진행해요.', 'err');
}

function clearPrompts() {
  if (!confirm('프롬프트를 초기화할까요?')) return;
  chrome.storage.local.remove(['flowPrompts', 'flowChannel'], () => {
    prompts = [];
    currentIdx = 0;
    document.getElementById('noPrompts').style.display = 'block';
    document.getElementById('mainArea').style.display = 'none';
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
