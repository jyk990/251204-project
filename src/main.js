import './style.css'

// 환경 변수
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
const OPENAI_API_URL = 'https://api.openai.com/v1';

// API Key 검증 함수
function checkAPIKey() {
  if (!API_KEY || API_KEY.trim() === '') {
    return {
      valid: false,
      message: 'API Key가 설정되지 않았습니다.\n\n.env 파일을 프로젝트 루트에 생성하고 다음 형식으로 입력하세요:\n\nVITE_OPENAI_API_KEY=sk-your-api-key-here'
    };
  }
  return { valid: true };
}

// 전역 상태
let currentStep = 1;
let formData = {
  topic: '',
  items: [],
  surveyData: {},
  iconImage: null,
  model: 'gpt-3.5-turbo' // 기본 모델
};

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  checkAndDisplayAPIKeyStatus();
  setupEventListeners();
  setupModelSelector();
  updateProgress();
  updateStepDisplay();
});

// API Key 상태 확인 및 표시
function checkAndDisplayAPIKeyStatus() {
  const keyCheck = checkAPIKey();
  if (!keyCheck.valid) {
    // 콘솔에 경고 표시
    console.warn('⚠️ API Key가 설정되지 않았습니다.');
    console.warn('📝 .env 파일을 프로젝트 루트에 생성하고 다음 형식으로 입력하세요:');
    console.warn('   VITE_OPENAI_API_KEY=sk-your-api-key-here');
    console.warn('   그 다음 개발 서버를 재시작하세요 (npm run dev)');
  } else {
    console.log('✅ API Key가 설정되었습니다.');
  }
}

// 이벤트 리스너 설정
function setupEventListeners() {
  document.getElementById('nextBtn').addEventListener('click', goToNextStep);
  document.getElementById('prevBtn').addEventListener('click', goToPrevStep);
  document.getElementById('askAIBtn').addEventListener('click', askAIForInterpretation);
}

// 다음 단계로 이동
async function goToNextStep() {
  if (validateCurrentStep()) {
    if (currentStep < 5) {
      currentStep++;
      updateStepDisplay();
      updateProgress();
      
      // 각 단계별 특별 처리
      if (currentStep === 2) {
        renderSurveyStep();
      } else if (currentStep === 3) {
        renderTable();
      } else if (currentStep === 4) {
        // 아이콘 생성이 완료될 때까지 대기
        await generateIconAndRenderGraph();
      } else if (currentStep === 5) {
        renderGraphPreview();
      }
    }
  }
}

// 이전 단계로 이동
function goToPrevStep() {
  if (currentStep > 1) {
    currentStep--;
    updateStepDisplay();
    updateProgress();
  }
}

// 현재 단계 검증
function validateCurrentStep() {
  if (currentStep === 1) {
    const topic = document.getElementById('topic').value.trim();
    const item1 = document.getElementById('item1').value.trim();
    const item2 = document.getElementById('item2').value.trim();
    const item3 = document.getElementById('item3').value.trim();
    
    if (!topic) {
      alert('주제를 입력해주세요!');
      return false;
    }
    
    if (!item1 || !item2 || !item3) {
      alert('조사 항목을 최소 3개 이상 입력해주세요!');
      return false;
    }
    
    // 데이터 저장
    formData.topic = topic;
    formData.items = [item1, item2, item3];
    const item4 = document.getElementById('item4').value.trim();
    if (item4) {
      formData.items.push(item4);
    }
    
    return true;
  } else if (currentStep === 2) {
    // 조사 데이터 검증
    let hasData = false;
    formData.items.forEach(item => {
      const count = formData.surveyData[item] || 0;
      if (count > 0) hasData = true;
    });
    
    if (!hasData) {
      alert('조사 데이터를 입력해주세요!');
      return false;
    }
    
    return true;
  }
  
  return true;
}

// 단계 표시 업데이트
function updateStepDisplay() {
  // 모든 단계 숨기기
  document.querySelectorAll('.step').forEach(step => {
    step.classList.remove('active');
  });
  
  // 현재 단계 표시
  document.getElementById(`step${currentStep}`).classList.add('active');
  
  // 진행 단계 표시 업데이트
  document.querySelectorAll('.progress-step').forEach((step, index) => {
    const stepNum = index + 1;
    step.classList.remove('active', 'completed');
    if (stepNum === currentStep) {
      step.classList.add('active');
    } else if (stepNum < currentStep) {
      step.classList.add('completed');
    }
  });
  
  // 버튼 표시/숨김
  document.getElementById('prevBtn').style.display = currentStep > 1 ? 'block' : 'none';
  document.getElementById('nextBtn').style.display = currentStep < 5 ? 'block' : 'none';
}

// 진행률 업데이트
function updateProgress() {
  const progress = ((currentStep - 1) / 4) * 100;
  document.getElementById('progressFill').style.width = progress + '%';
}

// 2단계: 조사하기 렌더링
function renderSurveyStep() {
  const container = document.getElementById('surveyContainer');
  container.innerHTML = '';
  
  formData.items.forEach(item => {
    if (!formData.surveyData[item]) {
      formData.surveyData[item] = 0;
    }
    
    const surveyItem = document.createElement('div');
    surveyItem.className = 'survey-item';
    surveyItem.innerHTML = `
      <div class="survey-item-label">${item}</div>
      <div class="survey-item-controls">
        <button class="count-btn minus" data-item="${item}">-</button>
        <input type="number" class="count-input" id="count-${item}" value="${formData.surveyData[item]}" min="0" />
        <button class="count-btn plus" data-item="${item}">+</button>
      </div>
    `;
    
    container.appendChild(surveyItem);
    
    // 버튼 이벤트
    surveyItem.querySelector('.minus').addEventListener('click', () => {
      if (formData.surveyData[item] > 0) {
        formData.surveyData[item]--;
        document.getElementById(`count-${item}`).value = formData.surveyData[item];
      }
    });
    
    surveyItem.querySelector('.plus').addEventListener('click', () => {
      formData.surveyData[item]++;
      document.getElementById(`count-${item}`).value = formData.surveyData[item];
    });
    
    // 입력창 이벤트
    const input = surveyItem.querySelector('.count-input');
    input.addEventListener('change', (e) => {
      const value = parseInt(e.target.value) || 0;
      formData.surveyData[item] = Math.max(0, value);
      e.target.value = formData.surveyData[item];
    });
  });
}

// 3단계: 표 렌더링
function renderTable() {
  const container = document.getElementById('tableContainer');
  let total = 0;
  
  let tableHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>항목</th>
          <th>인원</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  formData.items.forEach(item => {
    const count = formData.surveyData[item] || 0;
    total += count;
    tableHTML += `
      <tr>
        <td>${item}</td>
        <td>${count}명</td>
      </tr>
    `;
  });
  
  tableHTML += `
        <tr>
          <td><strong>합계</strong></td>
          <td><strong>${total}명</strong></td>
        </tr>
      </tbody>
    </table>
  `;
  
  container.innerHTML = tableHTML;
}

// 4단계: 아이콘 생성 및 그래프 렌더링
async function generateIconAndRenderGraph() {
  const loadingMessage = document.getElementById('iconLoading');
  const graphContainer = document.getElementById('graphContainer');
  
  // 로딩 표시
  loadingMessage.style.display = 'block';
  graphContainer.innerHTML = '';
  
  try {
    // 아이콘 생성 (이미 생성된 경우 재사용)
    if (!formData.iconImage) {
      await generateIcon();
    }
    
    // 그래프 렌더링
    renderGraph();
    loadingMessage.style.display = 'none';
  } catch (error) {
    loadingMessage.style.display = 'none';
    alert('아이콘 생성 중 오류가 발생했습니다: ' + error.message);
    // 오류 발생 시 기본 아이콘 사용
    renderGraphWithDefaultIcon();
  }
}

// DALL-E로 아이콘 생성
async function generateIcon() {
  const keyCheck = checkAPIKey();
  if (!keyCheck.valid) {
    throw new Error(keyCheck.message);
  }
  
  const prompt = `Simple, cute, child-friendly pixel art style icon for "${formData.topic}". Flat icon, colorful, suitable for elementary school children.`;
  
  try {
    const response = await fetch(`${OPENAI_API_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || '아이콘 생성 실패');
    }
    
    const data = await response.json();
    formData.iconImage = data.data[0].url;
  } catch (error) {
    // DALL-E 3가 없으면 2로 시도
    try {
      const response = await fetch(`${OPENAI_API_URL}/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'dall-e-2',
          prompt: prompt,
          n: 1,
          size: '256x256'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'DALL-E 2 아이콘 생성 실패');
      }
      
      const data = await response.json();
      formData.iconImage = data.data[0].url;
    } catch (e) {
      // DALL-E 2 실패 시 실제 에러를 throw
      throw e instanceof Error ? e : new Error('아이콘 생성 실패');
    }
  }
}

// 그래프 렌더링 (10개/1개 단위)
function renderGraph() {
  const container = document.getElementById('graphContainer');
  container.innerHTML = '';
  
  formData.items.forEach(item => {
    const count = formData.surveyData[item] || 0;
    const largeCount = Math.floor(count / 10);
    const smallCount = count % 10;
    
    const graphItem = document.createElement('div');
    graphItem.className = 'graph-item';
    
    const iconsContainer = document.createElement('div');
    iconsContainer.className = 'graph-item-icons';
    
    // 큰 아이콘 (10개 단위)
    for (let i = 0; i < largeCount; i++) {
      const icon = document.createElement('img');
      icon.src = formData.iconImage;
      icon.className = 'icon-large';
      icon.alt = item;
      iconsContainer.appendChild(icon);
    }
    
    // 작은 아이콘 (1개 단위)
    for (let i = 0; i < smallCount; i++) {
      const icon = document.createElement('img');
      icon.src = formData.iconImage;
      icon.className = 'icon-small';
      icon.alt = item;
      iconsContainer.appendChild(icon);
    }
    
    graphItem.innerHTML = `
      <div class="graph-item-label">${item}: ${count}명</div>
    `;
    graphItem.appendChild(iconsContainer);
    container.appendChild(graphItem);
  });
}

// 기본 아이콘으로 그래프 렌더링 (오류 시)
function renderGraphWithDefaultIcon() {
  const container = document.getElementById('graphContainer');
  container.innerHTML = '<p style="text-align: center; font-size: 20px; color: #757575;">아이콘을 불러올 수 없습니다. 조사 데이터를 확인해주세요.</p>';
  // 표는 3단계에서만 표시되므로 여기서는 렌더링하지 않음
}

// 5단계: 그래프 미리보기 렌더링
function renderGraphPreview() {
  const preview = document.getElementById('graphPreview');
  const graphContainer = document.getElementById('graphContainer');
  
  if (graphContainer.innerHTML) {
    preview.innerHTML = graphContainer.innerHTML;
  } else {
    // 그래프가 없으면 다시 생성
    generateIconAndRenderGraph()
      .then(() => {
        preview.innerHTML = document.getElementById('graphContainer').innerHTML;
      })
      .catch((error) => {
        console.error('그래프 생성 실패:', error);
        preview.innerHTML = '<p style="text-align: center; color: #757575;">그래프를 불러올 수 없습니다.</p>';
      });
  }
}

// AI 해석 요청
async function askAIForInterpretation() {
  const btn = document.getElementById('askAIBtn');
  const responseDiv = document.getElementById('aiResponse');
  
  const keyCheck = checkAPIKey();
  if (!keyCheck.valid) {
    alert(keyCheck.message);
    return;
  }
  
  // 데이터 정리
  const dataText = formData.items.map(item => {
    return `${item}: ${formData.surveyData[item] || 0}명`;
  }).join(', ');
  
  const maxItem = formData.items.reduce((max, item) => {
    return (formData.surveyData[item] || 0) > (formData.surveyData[max] || 0) ? item : max;
  }, formData.items[0]);
  
  const maxCount = formData.surveyData[maxItem] || 0;
  
  const systemPrompt = `너는 초등학교 3학년 수학 선생님이야. 그림그래프를 보고 알 수 있는 사실을 3가지만 쉽고 친절하게 설명해줘. 아이들이 이해하기 쉽게 말해줘.`;
  
  const userPrompt = `주제: ${formData.topic}
조사 결과: ${dataText}

이 그림그래프를 보고 알 수 있는 사실을 3가지만 초등학교 3학년 수준으로 쉽게 설명해줘. 예를 들어 "${maxItem}이(가) ${maxCount}명으로 가장 많습니다" 같은 형식으로 말해줘.`;

  btn.disabled = true;
  btn.textContent = '생각 중...';
  responseDiv.classList.remove('show');
  responseDiv.style.display = 'none';
  
  try {
    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: formData.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'AI 응답 실패');
    }
    
    const data = await response.json();
    const aiMessage = data.choices[0].message.content;
    
    // XSS 방지를 위해 textContent 사용 및 안전한 HTML 생성
    responseDiv.innerHTML = ''; // 기존 내용 초기화
    const paragraphs = aiMessage.split('\n').filter(line => line.trim() !== '');
    paragraphs.forEach(paragraph => {
      const p = document.createElement('p');
      p.textContent = paragraph.trim();
      responseDiv.appendChild(p);
    });
    
    responseDiv.style.display = 'block';
    responseDiv.classList.add('show');
    
  } catch (error) {
    alert('AI 응답 중 오류가 발생했습니다: ' + error.message);
    console.error('AI Error:', error);
  } finally {
    btn.disabled = false;
    btn.textContent = '🤖 AI 선생님에게 물어보기';
  }
}

// 모델 선택기 설정
function setupModelSelector() {
  const modelSelect = document.getElementById('modelSelect');
  if (modelSelect) {
    modelSelect.value = formData.model;
    modelSelect.addEventListener('change', (e) => {
      formData.model = e.target.value;
    });
  }
}

// 모델 선택 기능
function setModel(model) {
  formData.model = model;
  const modelSelect = document.getElementById('modelSelect');
  if (modelSelect) {
    modelSelect.value = model;
  }
}
