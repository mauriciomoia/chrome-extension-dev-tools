function initializePrompts(backToMenuCallback) { // Pass a callback for back button
    const listView = document.getElementById('list-view');
    const promptView = document.getElementById('prompt-view');
    const backButton = document.getElementById('back-button'); // Back to menu from main list view
    const promptBackButton = document.getElementById('prompt-back-button'); // Back from individual prompt view
    const promptsContainer = document.getElementById('prompts-container'); // Container for topics/subtopics/prompts list
    const promptTitleElement = document.getElementById('prompt-title'); // Title in individual prompt view
    const promptTextarea = document.getElementById('prompt-textarea');
    const copyPromptButton = document.getElementById('copy-prompt-button');

    let currentView = 'topics'; // 'topics', 'subtopics', 'prompts'
    let currentTopicData = null;
    let currentSubtopicData = null;
    let allPromptsData = [];

    // Handle back to menu from main list view
    backButton.addEventListener('click', function() {
        if (currentView === 'topics') {
            backToMenuCallback(); // Use the callback to go back to menu
        } else if (currentView === 'subtopics') {
            renderTopics(allPromptsData);
            currentView = 'topics';
        } else if (currentView === 'prompts') {
            renderSubtopics(currentTopicData);
            currentView = 'subtopics';
        }
    });

    // Handle back from individual prompt view to prompts list
    promptBackButton.addEventListener('click', function() {
        promptView.style.display = 'none';
        listView.style.display = 'block';
        renderPrompts(currentSubtopicData); // Re-render the prompts for the current subtopic
        currentView = 'prompts';
    });

    // Handle copy prompt
    copyPromptButton.addEventListener('click', function() {
        navigator.clipboard.writeText(promptTextarea.value).then(function() {
            const originalText = copyPromptButton.textContent;
            copyPromptButton.textContent = 'Copiado!';
            setTimeout(() => {
                copyPromptButton.textContent = originalText;
            }, 2000);
        }, function() {
            alert('Falha ao copiar.');
        });
    });

    // Function to render topics
    function renderTopics(data) {
        promptsContainer.innerHTML = '';
        data.forEach(topic => {
            const topicDiv = document.createElement('div');
            topicDiv.classList.add('topic-container', 'card'); // Add card class for styling

            const topicTitle = document.createElement('h2');
            topicTitle.textContent = topic.topico;
            topicTitle.style.cursor = 'pointer'; // Make it clickable
            topicTitle.addEventListener('click', () => {
                currentTopicData = topic;
                renderSubtopics(topic);
                currentView = 'subtopics';
            });
            topicDiv.appendChild(topicTitle);
            promptsContainer.appendChild(topicDiv);
        });
    }

    // Function to render subtopics
    function renderSubtopics(topic) {
        promptsContainer.innerHTML = '';
        const topicTitleHeader = document.createElement('h1'); // Display current topic
        topicTitleHeader.textContent = topic.topico;
        promptsContainer.appendChild(topicTitleHeader);

        topic.subtopicos.forEach(subtopic => {
            const subtopicDiv = document.createElement('div');
            subtopicDiv.classList.add('subtopic-container', 'card'); // Add card class for styling

            const subtopicTitle = document.createElement('h3');
            subtopicTitle.textContent = subtopic.tema;
            subtopicTitle.style.cursor = 'pointer'; // Make it clickable
            subtopicTitle.addEventListener('click', () => {
                currentSubtopicData = subtopic;
                renderPrompts(subtopic);
                currentView = 'prompts';
            });
            subtopicDiv.appendChild(subtopicTitle);
            promptsContainer.appendChild(subtopicDiv);
        });
    }

    // Function to render prompts for a given subtopic
    function renderPrompts(subtopic) {
        promptsContainer.innerHTML = '';
        const subtopicTitleHeader = document.createElement('h1'); // Display current subtopic
        subtopicTitleHeader.textContent = subtopic.tema;
        promptsContainer.appendChild(subtopicTitleHeader);

        const promptsList = document.createElement('ul');
        promptsList.classList.add('prompts-list'); // Add class for styling
        subtopic.prompts.forEach(prompt => {
            const promptItem = document.createElement('li');
            const promptLink = document.createElement('a');
            promptLink.href = '#';
            promptLink.textContent = prompt.titulo;
            promptLink.addEventListener('click', (e) => {
                e.preventDefault();
                listView.style.display = 'none';
                promptView.style.display = 'block';
                promptTitleElement.textContent = prompt.titulo;
                promptTextarea.value = prompt.prompt;
            });
            promptItem.appendChild(promptLink);
            promptsList.appendChild(promptItem);
        });
        promptsContainer.appendChild(promptsList);
    }

    // Initial load: fetch data and render topics
    fetch('prompts.json')
        .then(response => response.json())
        .then(data => {
            allPromptsData = data; // Store all data
            renderTopics(allPromptsData);
        })
        .catch(error => {
            console.error('Error loading prompts:', error);
            promptsContainer.textContent = 'Falha ao carregar prompts. Verifique o console para detalhes.';
        });
}

document.addEventListener('DOMContentLoaded', function() {
    initializePrompts(function() {
        window.location.href = '../popup.html';
    });
});