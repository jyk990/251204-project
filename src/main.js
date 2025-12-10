import './style.css'

// 환경 변수에서 API Key 가져오기
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const API_URL = 'https://api.openai.com/v1/chat/completions';

// 전역 변수
let mbtiScores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
let currentQuestionIndex = 0;
let chatHistory = [];
let userMBTI = '';
let mbtiChart = null;

// MBTI 질문 데이터
const mbtiQuestions = [
  { question: '새로운 사람들과 만나는 파티를 즐기시나요?', type: 'E/I', options: [
    { text: '네, 매우 즐거워요!', score: { E: 1 } },
    { text: '아니요, 조용한 곳이 좋아요', score: { I: 1 } }
  ]},
  { question: '문제를 해결할 때 주로 어떻게 접근하시나요?', type: 'T/F', options: [
    { text: '논리와 객관적 사실을 중시해요', score: { T: 1 } },
    { text: '감정과 사람의 가치를 중시해요', score: { F: 1 } }
  ]},
  { question: '정보를 받아들일 때 어떤 방식을 선호하시나요?', type: 'S/N', options: [
    { text: '구체적이고 실제적인 정보를 좋아해요', score: { S: 1 } },
    { text: '추상적이고 가능성 있는 정보를 좋아해요', score: { N: 1 } }
  ]},
  { question: '일정을 세울 때 어떤 스타일인가요?', type: 'J/P', options: [
    { text: '계획을 세우고 체계적으로 진행해요', score: { J: 1 } },
    { text: '유연하게 상황에 맞춰 진행해요', score: { P: 1 } }
  ]},
  { question: '에너지를 얻는 방법은?', type: 'E/I', options: [
    { text: '사람들과 함께 있을 때', score: { E: 1 } },
    { text: '혼자만의 시간을 가질 때', score: { I: 1 } }
  ]},
  { question: '의사결정 시 가장 중요하게 생각하는 것은?', type: 'T/F', options: [
    { text: '공정성과 논리적 일관성', score: { T: 1 } },
    { text: '조화와 사람들의 감정', score: { F: 1 } }
  ]},
  { question: '새로운 아이디어를 접할 때?', type: 'S/N', options: [
    { text: '실제로 적용 가능한지 먼저 확인해요', score: { S: 1 } },
    { text: '새로운 가능성에 흥미를 느껴요', score: { N: 1 } }
  ]},
  { question: '여행 계획을 세울 때?', type: 'J/P', options: [
    { text: '상세한 일정표를 만들어요', score: { J: 1 } },
    { text: '대략적인 계획만 세우고 즉흥적으로 해요', score: { P: 1 } }
  ]},
  { question: '스트레스를 받을 때?', type: 'E/I', options: [
    { text: '다른 사람과 이야기하며 해소해요', score: { E: 1 } },
    { text: '혼자만의 시간을 가지며 회복해요', score: { I: 1 } }
  ]},
  { question: '갈등 상황에서?', type: 'T/F', options: [
    { text: '원칙과 규칙에 따라 해결하려고 해요', score: { T: 1 } },
    { text: '모두가 만족할 수 있는 방법을 찾아요', score: { F: 1 } }
  ]},
  { question: '과거와 미래 중 어느 쪽에 더 관심이 있나요?', type: 'S/N', options: [
    { text: '과거의 경험과 현재 상황', score: { S: 1 } },
    { text: '미래의 가능성과 잠재력', score: { N: 1 } }
  ]},
  { question: '일을 처리하는 방식은?', type: 'J/P', options: [
    { text: '마감일 전에 미리 완료하는 편이에요', score: { J: 1 } },
    { text: '마감일이 다가올 때 집중력이 생겨요', score: { P: 1 } }
  ]}
];

// MBTI 유형 설명
const mbtiDescriptions = {
  'INTJ': '전략가 - 상상력이 풍부하고 철두철미한 계획을 세우는 전략적 사고가',
  'INTP': '논리술사 - 지식에 대한 갈증이 넘치는 혁신적인 발명가',
  'ENTJ': '통솔자 - 대담하고 상상력이 풍부한 강력한 의지의 지도자',
  'ENTP': '변론가 - 영리하고 호기심이 많은 사고가',
  'INFJ': '옹호자 - 선의의 옹호자이자 원칙주의자',
  'INFP': '중재자 - 항상 선을 행할 준비가 되어 있는 시적이고 친절한 이타주의자',
  'ENFJ': '주인공 - 카리스마 있고 영감을 주는 지도자',
  'ENFP': '활동가 - 열정적이고 창의적인 자유로운 영혼',
  'ISTJ': '논리주의자 - 실용적이고 신중한 신뢰할 수 있는 사람',
  'ISFJ': '수호자 - 따뜻하고 배려심 많은 수호자',
  'ESTJ': '경영자 - 뛰어난 관리자이자 전통과 질서를 중시하는 사람',
  'ESFJ': '집정관 - 배려심 많고 사교적인 사람',
  'ISTP': '만능재주꾼 - 대담하고 실용적인 실험정신의 소유자',
  'ISFP': '모험가 - 유연하고 매력적인 예술가',
  'ESTP': '사업가 - 영리하고 에너지 넘치는 인식가',
  'ESFP': '연예인 - 자유로운 영혼의 연예인'
};

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  checkAPIKey();
  initializeChart();
  setupEventListeners();
});

// API Key 유효성 검사
async function checkAPIKey() {
  const statusElement = document.getElementById('apiStatus');
  const statusIcon = statusElement.querySelector('.status-icon');
  const statusText = statusElement.querySelector('.status-text');

  if (!API_KEY) {
    statusElement.className = 'api-status error';
    statusIcon.textContent = '❌';
    statusText.textContent = 'API Key가 설정되지 않았습니다. .env 파일을 확인하세요.';
    return;
  }

  try {
    // 간단한 API 호출로 키 검증
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      statusElement.className = 'api-status connected';
      statusIcon.textContent = '✅';
      statusText.textContent = 'API 연결됨';
    } else {
      throw new Error('API Key가 유효하지 않습니다.');
    }
  } catch (error) {
    statusElement.className = 'api-status error';
    statusIcon.textContent = '❌';
    statusText.textContent = 'API 연결 실패: ' + error.message;
  }
}

// 차트 초기화 (Mock Data)
function initializeChart() {
  const ctx = document.getElementById('mbtiChart');
  if (!ctx) return;

  // Mock Data - MBTI 유형별 분포
  const mockData = {
    'INTJ': 8,
    'INTP': 7,
    'ENTJ': 6,
    'ENTP': 5,
    'INFJ': 12,
    'INFP': 15,
    'ENFJ': 10,
    'ENFP': 11,
    'ISTJ': 9,
    'ISFJ': 8,
    'ESTJ': 6,
    'ESFJ': 7,
    'ISTP': 5,
    'ISFP': 6,
    'ESTP': 4,
    'ESFP': 5
  };

  const labels = Object.keys(mockData);
  const data = Object.values(mockData);
  const colors = generatePastelColors(16);

  mbtiChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#FFFFFF'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            padding: 15,
            font: {
              size: 11
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value}명 (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// 파스텔 색상 생성
function generatePastelColors(count) {
  const colors = [];
  const baseColors = [
    '#A5D6A7', '#C8E6C9', '#81C784', '#66BB6A',
    '#4CAF50', '#8BC34A', '#9CCC65', '#AED581',
    '#C5E1A5', '#DCE775', '#E6EE9C', '#F0F4C3',
    '#DCEDC8', '#C5E1A5', '#AED581', '#9CCC65'
  ];
  
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length]);
  }
  return colors;
}

// 이벤트 리스너 설정
function setupEventListeners() {
  document.getElementById('startTestBtn').addEventListener('click', startTest);
  document.getElementById('submitResultBtn').addEventListener('click', submitResult);
  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
}

// 검사 시작
function startTest() {
  document.getElementById('dashboardSection').style.display = 'none';
  document.getElementById('testSection').style.display = 'block';
  currentQuestionIndex = 0;
  mbtiScores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  showQuestion();
}

// 질문 표시
function showQuestion() {
  const question = mbtiQuestions[currentQuestionIndex];
  const questionText = document.getElementById('questionText');
  const answerOptions = document.getElementById('answerOptions');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  questionText.textContent = question.question;
  answerOptions.innerHTML = '';

  question.options.forEach((option, index) => {
    const button = document.createElement('button');
    button.className = 'answer-btn';
    button.textContent = option.text;
    button.addEventListener('click', () => selectAnswer(option.score));
    answerOptions.appendChild(button);
  });

  // 진행률 업데이트
  const progress = ((currentQuestionIndex + 1) / mbtiQuestions.length) * 100;
  progressFill.style.width = progress + '%';
  progressText.textContent = `질문 ${currentQuestionIndex + 1} / ${mbtiQuestions.length}`;
}

// 답변 선택
function selectAnswer(scores) {
  // 점수 추가
  Object.keys(scores).forEach(key => {
    mbtiScores[key] += scores[key];
  });

  currentQuestionIndex++;

  if (currentQuestionIndex < mbtiQuestions.length) {
    showQuestion();
  } else {
    showResult();
  }
}

// 결과 표시
function showResult() {
  // MBTI 유형 계산
  const e_i = mbtiScores.E >= mbtiScores.I ? 'E' : 'I';
  const s_n = mbtiScores.S >= mbtiScores.N ? 'S' : 'N';
  const t_f = mbtiScores.T >= mbtiScores.F ? 'T' : 'F';
  const j_p = mbtiScores.J >= mbtiScores.P ? 'J' : 'P';
  
  userMBTI = e_i + s_n + t_f + j_p;

  // 결과 카드 표시
  const resultCard = document.getElementById('resultCard');
  resultCard.innerHTML = `
    <h3>당신의 MBTI 유형</h3>
    <div class="mbti-type">${userMBTI}</div>
    <div class="mbti-description">${mbtiDescriptions[userMBTI] || '특별한 당신'}</div>
  `;

  // 섹션 전환
  document.getElementById('testSection').style.display = 'none';
  document.getElementById('resultSection').style.display = 'block';

  // 챗봇 초기화
  initializeChatbot();
}

// 챗봇 초기화
function initializeChatbot() {
  chatHistory = [];
  
  // System Prompt 동적 생성
  const systemPrompt = `너는 따뜻하고 공감 능력이 뛰어난 심리 상담사야. 사용자는 ${userMBTI} 유형이야. ${mbtiDescriptions[userMBTI] || '특별한 성향을 가진 사람'}이야. 이 성향에 맞춰서 따뜻하고 공감적으로 상담해줘. 사용자의 감정을 이해하고, 위로와 격려를 해주며, 실용적인 조언을 제공해줘. 항상 긍정적이고 희망적인 메시지를 전달해줘.`;

  chatHistory.push({
    role: 'system',
    content: systemPrompt
  });

  // 환영 메시지 추가
  addChatMessage('ai', `안녕하세요! ${userMBTI} 유형이시군요. ${mbtiDescriptions[userMBTI] || '특별한 성향을 가진 분'}이시네요. 오늘 어떤 이야기를 나누고 싶으신가요? 편하게 말씀해주세요. 🌿`);
}

// 채팅 메시지 추가
function addChatMessage(role, content) {
  const chatMessages = document.getElementById('chatMessages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = content;

  const time = document.createElement('div');
  time.className = 'message-time';
  time.textContent = new Date().toLocaleTimeString('ko-KR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  messageDiv.appendChild(bubble);
  messageDiv.appendChild(time);
  chatMessages.appendChild(messageDiv);

  // 스크롤을 맨 아래로
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 메시지 전송
async function sendMessage() {
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const message = chatInput.value.trim();

  if (!message) return;
  if (!API_KEY) {
    alert('API Key가 설정되지 않았습니다.');
    return;
  }

  // 입력창 비활성화
  chatInput.disabled = true;
  sendBtn.disabled = true;

  // 사용자 메시지 표시
  addChatMessage('user', message);
  chatInput.value = '';

  // chatHistory에 사용자 메시지 추가
  chatHistory.push({
    role: 'user',
    content: message
  });

  // 로딩 메시지 표시
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message ai';
  loadingDiv.id = 'loadingMessage';
  const loadingBubble = document.createElement('div');
  loadingBubble.className = 'message-bubble';
  loadingBubble.textContent = '생각 중...';
  loadingDiv.appendChild(loadingBubble);
  document.getElementById('chatMessages').appendChild(loadingDiv);

  try {
    // OpenAI API 호출
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: chatHistory,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API 요청 실패');
    }

    const data = await response.json();
    const aiMessage = data.choices[0].message.content;

    // 로딩 메시지 제거
    document.getElementById('loadingMessage').remove();

    // AI 메시지 표시
    addChatMessage('ai', aiMessage);

    // chatHistory에 AI 메시지 추가
    chatHistory.push({
      role: 'assistant',
      content: aiMessage
    });

  } catch (error) {
    // 로딩 메시지 제거
    const loadingMsg = document.getElementById('loadingMessage');
    if (loadingMsg) loadingMsg.remove();

    addChatMessage('ai', `죄송합니다. 오류가 발생했습니다: ${error.message}`);
    console.error('Chat error:', error);
  } finally {
    // 입력창 활성화
    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

// 결과 제출 (Google Forms)
function submitResult() {
  // Google Forms URL을 여기에 입력하세요
  const googleFormsUrl = 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform';
  
  // 새 창에서 열기
  window.open(googleFormsUrl, '_blank');
  
  // 또는 사용자에게 안내
  alert('Google Forms가 새 창에서 열립니다. 검사 결과를 제출해주세요!');
}
