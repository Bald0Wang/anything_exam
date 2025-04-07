// 初始化变量
const questionFlashcards = [];
const statementFlashcards = [];
let currentQuestionType = 'questions'; // 'questions' or 'statements'

// 获取并解析文件内容的函数
async function fetchAndParseQuestions() {
    try {
        // 获取JSON文件内容
        const response = await fetch('gaojiao.json');
        if (!response.ok) {
            throw new Error('无法加载文件');
        }
        
        const data = await response.json();
        
        // 解析问答题
        if (data.question) {
            data.question.forEach(item => {
                const questionNumber = Object.keys(item)[0];
                const questionObj = item[questionNumber];
                questionFlashcards.push({
                    question: questionObj.question,
                    answer: questionObj.answer
                });
            });
        }
        
        // 解析判断题
        if (data.statements_analysis) {
            data.statements_analysis.forEach(item => {
                const statementNumber = Object.keys(item)[0];
                const statementObj = item[statementNumber];
                statementFlashcards.push({
                    question: statementObj.statement,
                    answer: statementObj.correct ? "正确" : "错误"
                });
            });
        }
        
        console.log(`成功解析 ${questionFlashcards.length} 个问答题和 ${statementFlashcards.length} 个判断题`);
        
        // 初始化应用
        init();
    } catch (error) {
        console.error('加载题目出错:', error);
        document.body.innerHTML = '<div class="error-message">加载题目失败，请确保gaojiao_data.json文件可访问</div>';
    }
}

// DOM 元素
const cardElement = document.getElementById('card');
const cardInner = cardElement.querySelector('.card-inner');
const questionElement = document.getElementById('question');
const answerElement = document.getElementById('answer');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const markBtn = document.getElementById('mark-btn');
const currentCardElement = document.getElementById('current-card');
const totalCardsElement = document.getElementById('total-cards');
const progressBarElement = document.getElementById('progress-bar');
const studiedCountElement = document.getElementById('studied-count');
const markedCountElement = document.getElementById('marked-count');
const resetProgressBtn = document.getElementById('reset-progress-btn');
const showMarkedBtn = document.getElementById('show-marked-btn');
const showAllBtn = document.getElementById('show-all-btn');
const questionsTabBtn = document.getElementById('questions-tab');
const statementsTabBtn = document.getElementById('statements-tab');

// 状态变量
let currentIndex = 0;
let viewMode = 'all'; // 'all' 或 'marked'
let progressData = {
    questions: {
        studied: [],      // 已学习题目的索引
        marked: []        // 已标记题目的索引
    },
    statements: {
        studied: [],
        marked: []
    }
};

// 初始化
function init() {
    loadProgress();
    updateTotalCount();
    updateStats();
    updateFilterButtons();
    showCard(currentIndex);
    
    // 添加事件监听器
    cardElement.addEventListener('click', flipCard);
    prevBtn.addEventListener('click', showPreviousCard);
    nextBtn.addEventListener('click', showNextCard);
    markBtn.addEventListener('click', toggleMarkCard);
    resetProgressBtn.addEventListener('click', resetProgress);
    showMarkedBtn.addEventListener('click', showMarkedCards);
    showAllBtn.addEventListener('click', showAllCards);
    questionsTabBtn.addEventListener('click', () => switchQuestionType('questions'));
    statementsTabBtn.addEventListener('click', () => switchQuestionType('statements'));
}

// 切换问题类型
function switchQuestionType(type) {
    if (currentQuestionType === type) return;
    
    currentQuestionType = type;
    currentIndex = 0;
    
    // 更新标签状态
    if (type === 'questions') {
        questionsTabBtn.classList.add('active');
        statementsTabBtn.classList.remove('active');
    } else {
        questionsTabBtn.classList.remove('active');
        statementsTabBtn.classList.add('active');
    }
    
    updateTotalCount();
    updateStats();
    showCard(currentIndex);
}

// 更新总题目数
function updateTotalCount() {
    const totalCards = currentQuestionType === 'questions' 
        ? questionFlashcards.length 
        : statementFlashcards.length;
    totalCardsElement.textContent = totalCards;
}

// 获取当前题库
function getCurrentFlashcards() {
    return currentQuestionType === 'questions' ? questionFlashcards : statementFlashcards;
}

// 获取当前进度数据
function getCurrentProgressData() {
    return progressData[currentQuestionType];
}

// 显示卡片
function showCard(index) {
    const flashcards = getCurrentFlashcards();
    const currentProgressData = getCurrentProgressData();
    
    if (viewMode === 'marked' && currentProgressData.marked.length > 0) {
        // 在标记模式下，只显示已标记的卡片
        if (!currentProgressData.marked.includes(index)) {
            index = findNextMarkedCard(index);
        }
    }
    
    // 确保索引在有效范围内
    if (index < 0) {
        index = 0;
    } else if (index >= flashcards.length) {
        index = flashcards.length - 1;
    }
    
    currentIndex = index;
    currentCardElement.textContent = index + 1;
    
    // 显示问题和答案
    questionElement.textContent = flashcards[index].question;
    answerElement.textContent = flashcards[index].answer;
    
    // 更新卡片样式
    cardElement.classList.remove('flipped');
    
    if (currentProgressData.marked.includes(index)) {
        cardElement.classList.add('marked-card');
        markBtn.classList.add('marked');
        markBtn.textContent = '取消标记';
    } else {
        cardElement.classList.remove('marked-card');
        markBtn.classList.remove('marked');
        markBtn.textContent = '标记此题';
    }
    
    // 更新按钮状态
    updateButtonStates();
    
    // 如果还没学习过，标记为已学习
    if (!currentProgressData.studied.includes(index)) {
        currentProgressData.studied.push(index);
        saveProgress();
        updateStats();
    }
}

// 翻转卡片
function flipCard() {
    cardElement.classList.toggle('flipped');
}

// 显示下一张卡片
function showNextCard() {
    const currentProgressData = getCurrentProgressData();
    
    if (viewMode === 'marked' && currentProgressData.marked.length > 0) {
        showCard(findNextMarkedCard(currentIndex));
    } else {
        showCard(currentIndex + 1);
    }
}

// 显示上一张卡片
function showPreviousCard() {
    const currentProgressData = getCurrentProgressData();
    
    if (viewMode === 'marked' && currentProgressData.marked.length > 0) {
        showCard(findPreviousMarkedCard(currentIndex));
    } else {
        showCard(currentIndex - 1);
    }
}

// 找到下一个标记的卡片
function findNextMarkedCard(currentIdx) {
    const marked = getCurrentProgressData().marked;
    if (marked.length === 0) return 0;
    
    // 寻找大于当前索引的最小标记索引
    for (let i = 0; i < marked.length; i++) {
        if (marked[i] > currentIdx) {
            return marked[i];
        }
    }
    
    // 如果没找到，返回第一个标记索引
    return marked[0];
}

// 找到上一个标记的卡片
function findPreviousMarkedCard(currentIdx) {
    const marked = getCurrentProgressData().marked;
    if (marked.length === 0) return 0;
    
    // 寻找小于当前索引的最大标记索引
    for (let i = marked.length - 1; i >= 0; i--) {
        if (marked[i] < currentIdx) {
            return marked[i];
        }
    }
    
    // 如果没找到，返回最后一个标记索引
    return marked[marked.length - 1];
}

// 标记/取消标记卡片
function toggleMarkCard() {
    const index = currentIndex;
    const currentProgressData = getCurrentProgressData();
    const markedIndex = currentProgressData.marked.indexOf(index);
    
    if (markedIndex === -1) {
        // 标记卡片
        currentProgressData.marked.push(index);
        cardElement.classList.add('marked-card');
        markBtn.classList.add('marked');
        markBtn.textContent = '取消标记';
    } else {
        // 取消标记
        currentProgressData.marked.splice(markedIndex, 1);
        cardElement.classList.remove('marked-card');
        markBtn.classList.remove('marked');
        markBtn.textContent = '标记此题';
        
        // 如果在标记模式下取消了标记，跳到下一个标记的卡片
        if (viewMode === 'marked') {
            if (currentProgressData.marked.length > 0) {
                showCard(findNextMarkedCard(index - 1));
            } else {
                viewMode = 'all';
                updateFilterButtons();
                showCard(0);
                return;
            }
        }
    }
    
    saveProgress();
    updateStats();
}

// 只显示标记的卡片
function showMarkedCards() {
    const currentProgressData = getCurrentProgressData();
    
    if (currentProgressData.marked.length === 0) {
        alert('您还没有标记任何题目！');
        return;
    }
    
    viewMode = 'marked';
    updateFilterButtons();
    showCard(findNextMarkedCard(-1));
}

// 显示所有卡片
function showAllCards() {
    viewMode = 'all';
    updateFilterButtons();
    showCard(currentIndex);
}

// 更新过滤按钮状态
function updateFilterButtons() {
    if (viewMode === 'marked') {
        showMarkedBtn.classList.add('active');
        showAllBtn.classList.remove('active');
    } else {
        showMarkedBtn.classList.remove('active');
        showAllBtn.classList.add('active');
    }
}

// 更新按钮状态
function updateButtonStates() {
    const flashcards = getCurrentFlashcards();
    const currentProgressData = getCurrentProgressData();
    
    if (viewMode === 'all') {
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === flashcards.length - 1;
    } else {
        // 在标记模式下，当只有一个标记项时禁用按钮
        prevBtn.disabled = currentProgressData.marked.length <= 1;
        nextBtn.disabled = currentProgressData.marked.length <= 1;
    }
    
    // 更新进度条
    const progress = ((currentIndex + 1) / flashcards.length) * 100;
    progressBarElement.style.width = `${progress}%`;
}

// 更新统计信息
function updateStats() {
    const currentProgressData = getCurrentProgressData();
    studiedCountElement.textContent = currentProgressData.studied.length;
    markedCountElement.textContent = currentProgressData.marked.length;
}

// 重置学习进度
function resetProgress() {
    if (confirm('确定要重置所有学习进度吗？')) {
        progressData = {
            questions: {
                studied: [],
                marked: []
            },
            statements: {
                studied: [],
                marked: []
            }
        };
        saveProgress();
        viewMode = 'all';
        updateFilterButtons();
        showCard(0);
        updateStats();
    }
}

// 保存进度到本地存储
function saveProgress() {
    localStorage.setItem('flashcardsProgress', JSON.stringify(progressData));
}

// 从本地存储加载进度
function loadProgress() {
    const savedProgress = localStorage.getItem('flashcardsProgress');
    if (savedProgress) {
        const loadedProgress = JSON.parse(savedProgress);
        
        // 确保加载的数据有所有必需的字段
        progressData = {
            questions: {
                studied: loadedProgress.questions?.studied || [],
                marked: loadedProgress.questions?.marked || []
            },
            statements: {
                studied: loadedProgress.statements?.studied || [],
                marked: loadedProgress.statements?.marked || []
            }
        };
        
        // 检查是否有任何进度
        const currentProgressData = getCurrentProgressData();
        if (currentProgressData.studied.length > 0) {
            // 从上次学习的地方继续
            currentIndex = currentProgressData.studied[currentProgressData.studied.length - 1];
            
            // 如果已经学完了所有卡片，从头开始
            if (currentIndex >= getCurrentFlashcards().length - 1) {
                currentIndex = 0;
            }
        }
    }
}

// 初始化应用
window.addEventListener('DOMContentLoaded', fetchAndParseQuestions);
