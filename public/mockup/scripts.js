document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('user-input').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

const questions = [
    "What is your name?",
    "How old are you?",
    "What is your favorite color?",
    "Do you have any pets?"
];

let currentQuestionIndex = 0;

function initializeChat() {
    if (currentQuestionIndex < questions.length) {
        addMessage('bot', questions[currentQuestionIndex]);
        enableInput();
    }
}

function sendMessage() {
    const userInput = document.getElementById('user-input');
    const message = userInput.value.trim();
    if (message) {
        addMessage('user', message);
        userInput.value = '';
        disableInput();
        setTimeout(() => {
            currentQuestionIndex++;
            if (currentQuestionIndex < questions.length) {
                addMessage('bot', questions[currentQuestionIndex]);
                enableInput();
            } else {
                addMessage('bot', 'Thank you for completing the survey!');
            }
        }, 500);
    }
}

function addMessage(sender, message) {
    const chatBox = document.getElementById('chat-box');
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');
    if (sender === 'user') {
        messageElement.classList.add('user-message');
    } else {
        messageElement.classList.add('bot-message');
    }
    messageElement.textContent = message;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function enableInput() {
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
}

function disableInput() {
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    userInput.disabled = true;
    sendBtn.disabled = true;
}

window.onload = initializeChat;
