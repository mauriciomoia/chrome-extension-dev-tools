document.addEventListener('DOMContentLoaded', function () {
    // Initialize Showdown converter
    const converter = new showdown.Converter({ simpleLineBreaks: true });
    // Elementos da UI
    const taskNameSpan = document.getElementById('task-name');
    const taskStatusSpan = document.getElementById('task-status');
    const geminiResponseDiv = document.getElementById('gemini-response');
    const geminiOutputPre = document.getElementById('gemini-output');
    const copyResponseBtn = document.getElementById('copy-response-btn');
    const statusDocumentationDiv = document.getElementById('status-documentation');
    const evaluationTitle = document.getElementById('evaluation-title');
    const contextContentDiv = document.getElementById('context-content');
    const defaultMessageDiv = document.getElementById('default-message');
    const buttonContainer = document.querySelector('.button-container');

    // Botões
    const evalDescriptionBtn = document.getElementById('eval-description');
    const codeReviewBtn = document.getElementById('eval-commit');
    const publishDocsBtn = document.getElementById('publish-docs');

    const geminiUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

    let currentTaskDetails = null;

    // --- Funções de Detecção e Parse de URL ---
    function getClickUpTaskId(url) {
        const match = url.match(/clickup\.com\/t\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }

    function parseGitHubCommitUrl(url) {
        const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/commit\/([a-f0-9]+)/);
        if (!match) return null;
        return {
            owner: match[1],
            repo: match[2],
            sha: match[3]
        };
    }

    // --- Funções de API ---
    async function loadStatusDocs() {
        try {
            const response = await fetch('status-docs.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.status_documentation;
        } catch (error) {
            console.error('Erro ao carregar a documentação de status:', error);
            return [];
        }
    }

    async function fetchClickUpDocPage(workspaceId, docId, pageId, apiKey) {
        const url = `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs/${docId}/pages/${pageId}?content_format=text%2Fmd`;
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': apiKey,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.content;
        } catch (error) {
            console.error('Erro ao buscar página do Doc do ClickUp:', error);
            return null;
        }
    }

    async function fetchClickUpTask(taskId, apiKey) {
        const url = `https://api.clickup.com/api/v2/task/${taskId}`;
        const taskNameSpan = document.getElementById('task-name');
        const taskStatusSpan = document.getElementById('task-status');

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': apiKey
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            currentTaskDetails = data; // Armazena os detalhes da tarefa

            if (taskNameSpan) {
                taskNameSpan.textContent = data.name;
            }
            if (taskStatusSpan) {
                taskStatusSpan.textContent = data.status.status;
            }

            // Adicionar a lógica da documentação de status
            const statusDocs = await loadStatusDocs();
            const currentStatus = data.status.status.toUpperCase();

            const statusDoc = statusDocs.find(doc => doc.status.toUpperCase() === currentStatus);
    
            if (statusDoc) {
                statusDocumentationDiv.innerHTML = `<p></p>`;

                // Extract IDs from the link and fetch doc page content
                const docLinkMatch = statusDoc.link.match(/clickup\.com\/(\d+)\/v\/dc\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9-]+)/);
                if (docLinkMatch) {
                    const workspaceId = docLinkMatch[1];
                    const docId = docLinkMatch[2];
                    const pageId = docLinkMatch[3];

                    const docPageContent = await fetchClickUpDocPage(workspaceId, docId, pageId, apiKey);
                    if (docPageContent) {
                        const docContentHtml = `<p><strong>O que fazer nessa etapa?</strong></p><div class="doc-content-scrollable">${converter.makeHtml(docPageContent)}</div>`;
                        statusDocumentationDiv.insertAdjacentHTML('beforeend', docContentHtml);
                    }
                }

            } else {
                statusDocumentationDiv.innerHTML = '<p>Documentação de status não encontrada.</p>';
            }

        } catch (error) {
            console.error('Erro ao buscar tarefa do ClickUp:', error);
            if (taskNameSpan) {
                taskNameSpan.textContent = 'Erro ao buscar tarefa.';
            }
            if (taskStatusSpan) {
                taskStatusSpan.textContent = '';
            }
        }
    }

    async function callGeminiAPI(prompt, geminiApiKey, title) {
        if (evaluationTitle) {
            evaluationTitle.textContent = title;
            evaluationTitle.style.display = 'block';
        }
        geminiOutputPre.textContent = 'Analisando...'; // Clear previous content
        geminiResponseDiv.style.display = 'block';

        try {
            const response = await fetch(geminiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': geminiApiKey
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Gemini API error! status: ${response.status}, message: ${errorData.error.message}`);
            }

            const data = await response.json();
            const geminiResponseText = data.candidates[0].content.parts[0].text;
            geminiOutputPre.innerHTML = converter.makeHtml(geminiResponseText); // Convert Markdown to HTML
            copyResponseBtn.onclick = () => {
                navigator.clipboard.writeText(geminiResponseText);
            };

        } catch (error) {
            console.error('Erro ao chamar a API Gemini:', error);
            geminiOutputPre.textContent = `Erro: ${error.message}`;
        }
    }

    // --- Lógica Principal ---
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const currentUrl = tabs[0].url;
        const clickUpTaskId = getClickUpTaskId(currentUrl);
        const githubCommitInfo = parseGitHubCommitUrl(currentUrl);

        if (clickUpTaskId) {
            contextContentDiv.style.display = 'block';
            defaultMessageDiv.style.display = 'none';
            buttonContainer.style.display = 'flex';
            evalDescriptionBtn.style.display = 'inline-block';
            publishDocsBtn.style.display = 'inline-block';
            codeReviewBtn.style.display = 'none';

            taskNameSpan.textContent = 'Carregando...';
            taskStatusSpan.textContent = 'Carregando...';
            chrome.storage.sync.get(['clickup_api_key'], function(result) {
                if (result.clickup_api_key) {
                    fetchClickUpTask(clickUpTaskId, result.clickup_api_key);
                } else {
                    taskNameSpan.textContent = 'Chave de API do ClickUp não configurada.';
                    taskStatusSpan.textContent = '';
                }
            });

        } else if (githubCommitInfo) {
            contextContentDiv.style.display = 'none';
            defaultMessageDiv.style.display = 'none';
            buttonContainer.style.display = 'flex';
            evalDescriptionBtn.style.display = 'none';
            publishDocsBtn.style.display = 'none';
            codeReviewBtn.style.display = 'inline-block';

        } else {
            contextContentDiv.style.display = 'none';
            buttonContainer.style.display = 'none';
            defaultMessageDiv.style.display = 'block';
        }
    });

    // --- Event Listeners ---
    evalDescriptionBtn.addEventListener('click', async () => {
        if (!currentTaskDetails || !currentTaskDetails.description) {
            alert('Nenhuma descrição de tarefa encontrada para avaliar.');
            return;
        }

        chrome.storage.sync.get(['gemini_api_key'], async (result) => {
            if (result.gemini_api_key) {
                const prompt = `Avalie a seguinte descrição de tarefa do ClickUp para clareza, completude e se ela segue boas práticas de escrita de descrição de tarefas. Sugira melhorias:\n\n${currentTaskDetails.description}`;
                await callGeminiAPI(prompt, result.gemini_api_key, 'Avaliação da Descrição');
            } else {
                alert('Chave de API do Gemini não configurada. Por favor, configure-a nas opções da extensão.');
            }
        });
    });

    publishDocsBtn.addEventListener('click', async () => {
        if (!currentTaskDetails) {
            alert('Nenhuma tarefa encontrada para gerar o changelog.');
            return;
        }

        chrome.storage.sync.get(['gemini_api_key'], async (result) => {
            if (result.gemini_api_key) {
                const prompt = `Gere um changelog conciso para a seguinte tarefa do ClickUp. Inclua o nome da tarefa, status e uma breve sumarização da descrição:\n\nNome da Tarefa: ${currentTaskDetails.name}\nStatus: ${currentTaskDetails.status.status}\nDescrição: ${currentTaskDetails.description || 'N/A'}`;
                await callGeminiAPI(prompt, result.gemini_api_key, 'Geração de Changelog');
            } else {
                alert('Chave de API do Gemini não configurada. Por favor, configure-a nas opções da extensão.');
            }
        });
    });
});