document.addEventListener('DOMContentLoaded', function() {
    const taskNameSpan = document.getElementById('task-name');
    const taskStatusSpan = document.getElementById('task-status');
    const geminiResponseDiv = document.getElementById('gemini-response');
    const geminiOutputPre = document.getElementById('gemini-output');
    const copyResponseBtn = document.getElementById('copy-response-btn');
    const taskRelatedContentDiv = document.getElementById('task-related-content');
    const statusDocumentationDiv = document.getElementById('status-documentation');
    const geminiUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

    let currentTaskDetails = null;

    async function loadStatusDocumentation() {
        try {
            const response = await fetch(chrome.runtime.getURL('status-docs.json'));
            if (!response.ok) {
                console.error('Failed to load status-docs.json');
                if (statusDocumentationDiv) statusDocumentationDiv.innerHTML = '<p>Erro ao carregar o arquivo de documentação.</p>';
                return null;
            }
            const data = await response.json();
            return data.status_documentation;
        } catch (error) {
            console.error('Error loading status-docs.json:', error);
            if (statusDocumentationDiv) statusDocumentationDiv.innerHTML = '<p>Erro ao carregar o arquivo de documentação.</p>';
            return null;
        }
    }

    async function fetchDocContent(docUrl, apiKey) {
        const urlParts = docUrl.split('/');
        const workspaceId = urlParts[3];
        const docId = urlParts[6];
        const pageId = urlParts[7];

        if (!workspaceId || !docId || !pageId) {
            return '<p>Erro ao extrair informações do link da documentação.</p>';
        }

        const apiUrl = `https://api.clickup.com/api/v3/workspaces/${workspaceId}/docs/${docId}/pages/${pageId}?content_format=text/plain`;

        try {
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': apiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                return `<p>Erro ao buscar documentação (Status: ${response.status}).</p>`;
            }

            const data = await response.json();

            if (data && data.content) {
                return `<pre style="white-space: pre-wrap; word-wrap: break-word;">${data.content}</pre>`;
            } else {
                return '<p>Documento não encontrado ou sem conteúdo.</p>';
            }

        } catch (error) {
            console.error('Error fetching doc content:', error);
            return '<p>Erro de rede ao buscar documentação.</p>';
        }
    }

    async function displayStatusDocumentation(status, documentation, apiKey) {
        if (!documentation || !status || !statusDocumentationDiv) {
            if (statusDocumentationDiv) statusDocumentationDiv.innerHTML = '';
            return;
        }

        const statusDoc = documentation.find(doc => doc.status.toUpperCase() === status.toUpperCase());

        if (statusDoc) {
            statusDocumentationDiv.innerHTML = `
                <hr>
                <h4>Documentação da Etapa</h4>
                <p><strong>Etapa ${statusDoc.step}: ${statusDoc.status}</strong></p>
                <p>Carregando documentação...</p>
            `;
            
            const docContent = await fetchDocContent(statusDoc.link, apiKey);
            
            statusDocumentationDiv.innerHTML = `
                <hr>
                <h4>Documentação da Etapa</h4>
                <p><strong>Etapa ${statusDoc.step}: ${statusDoc.status}</strong></p>
                <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ccc; padding: 5px; border-radius: 3px;">${docContent}</div>
            `;

        } else {
            statusDocumentationDiv.innerHTML = '<hr><h4>Documentação da Etapa</h4><p>Nenhuma documentação encontrada para este status.</p>';
        }
    }

    function getClickUpTaskId(url) {
        const match = url.match(/clickup\.com\/t\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }

    async function fetchClickUpTask(taskId, apiKey) {
        if (!apiKey) {
            taskNameSpan.textContent = 'Chave de API não configurada.';
            taskStatusSpan.textContent = 'Por favor, configure sua Chave de API do ClickUp em Opções.';
            return;
        }
        if (!taskId) {
            return;
        }

        try {
            const response = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
                headers: {
                    'Authorization': apiKey
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    taskNameSpan.textContent = 'Erro de Autenticação';
                    taskStatusSpan.textContent = 'Chave de API do ClickUp inválida.';
                } else if (response.status === 404) {
                    taskNameSpan.textContent = 'Tarefa Não Encontrada';
                    taskStatusSpan.textContent = 'Não foi possível encontrar a tarefa do ClickUp.';
                } else {
                    taskNameSpan.textContent = 'Erro ao buscar tarefa';
                    taskStatusSpan.textContent = `Status: ${response.status}`;
                }
                return;
            }

            const data = await response.json();
            currentTaskDetails = data;
            taskNameSpan.textContent = data.name;
            const taskStatus = data.status.status;
            taskStatusSpan.textContent = taskStatus;

            const documentation = await loadStatusDocumentation();
            await displayStatusDocumentation(taskStatus, documentation, apiKey);

        } catch (error) {
            taskNameSpan.textContent = 'Erro de Rede';
            taskStatusSpan.textContent = 'Não foi possível conectar à API do ClickUp.';
            console.error('Error fetching ClickUp task:', error);
        }
    }

    async function evaluateDescriptionWithGemini(taskName, taskDescription, geminiApiKey) {
        if (!geminiApiKey) {
            geminiOutputPre.textContent = 'Chave de API não configurada. Por favor, configure-a em opções.';
            geminiResponseDiv.style.display = 'block';
            return;
        }
        if (!taskName && !taskDescription) {
            geminiOutputPre.textContent = 'Nenhuma descrição de tarefa disponível para avaliar.';
            geminiResponseDiv.style.display = 'block';
            return;
        }

        geminiOutputPre.textContent = 'Avaliando descrição...';
        geminiResponseDiv.style.display = 'block';

        const prompt = `Avalie a seguinte história de usuário/épico. Comece a resposta com uma nota de 0 a 10 para a escrita, seguida de sugestões de melhoria no texto. Seja direto na resposta, sem comentários extras.\n\nTítulo: ${taskName}\n\nDescrição:\n${taskDescription || 'Nenhuma descrição fornecida.'}`;

        try {
            const response = await fetch(`${geminiUrl}?key=${geminiApiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 4096,
                    },
                    safetySettings: [
                        {
                            category: "HARM_CATEGORY_HARASSMENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_HATE_SPEECH",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        }
                    ]
                })
            });

            if (!response.ok) {
                geminiOutputPre.textContent = `Erro do serviço de avaliação: ${response.status} - ${response.statusText}`;
                return;
            }

            const data = await response.json();
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
                geminiOutputPre.textContent = data.candidates[0].content.parts[0].text;
            } else {
                geminiOutputPre.textContent = 'Nenhuma resposta válida do serviço de avaliação.';
            }
        } catch (error) {
            geminiOutputPre.textContent = 'Erro de rede ao conectar ao serviço de avaliação.';
            console.error('Error calling evaluation service:', error);
        }
    }

    async function generateChangelogWithGemini(taskName, taskDescription, geminiApiKey) {
        if (!geminiApiKey) {
            geminiOutputPre.textContent = 'Chave de API não configurada. Por favor, configure-a em opções.';
            geminiResponseDiv.style.display = 'block';
            return;
        }
        if (!taskName) {
            geminiOutputPre.textContent = 'Nenhuma tarefa disponível para gerar changelog.';
            geminiResponseDiv.style.display = 'block';
            return;
        }

        geminiOutputPre.textContent = 'Gerando changelog...';
        geminiResponseDiv.style.display = 'block';

        const prompt = `Gere um item de changelog conciso e direto para a seguinte tarefa. Inclua o título da tarefa e um resumo da descrição, se disponível. O formato deve ser adequado para um changelog de software.\n\nTítulo: ${taskName}\n\nDescrição:\n${taskDescription || 'Nenhuma descrição fornecida.'}`;

        try {
            const response = await fetch(`${geminiUrl}?key=${geminiApiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 4096,
                    },
                    safetySettings: [
                        {
                            category: "HARM_CATEGORY_HARASSMENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_HATE_SPEECH",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        }
                    ]
                })
            });

            if (!response.ok) {
                geminiOutputPre.textContent = `Erro do serviço de geração de changelog: ${response.status} - ${response.statusText}`;
                return;
            }

            const data = await response.json();
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
                geminiOutputPre.textContent = data.candidates[0].content.parts[0].text;
            } else {
                geminiOutputPre.textContent = 'Nenhuma resposta válida do serviço de geração de changelog.';
            }
        } catch (error) {
            geminiOutputPre.textContent = 'Erro de rede ao conectar ao serviço de geração de changelog.';
            console.error('Error calling changelog generation service:', error);
        }
    }

    // Get current active tab URL and fetch task details
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const currentUrl = tabs[0].url;
        const taskId = getClickUpTaskId(currentUrl);

        if (!taskId) {
            taskRelatedContentDiv.style.display = 'none';
            taskNameSpan.textContent = 'Não é uma página de tarefa do ClickUp.';
            taskStatusSpan.textContent = ''; // Clear status
        } else {
            taskRelatedContentDiv.style.display = 'block'; // Ensure it's visible if it's a task page
            chrome.storage.sync.get(['clickup_api_key'], function(result) {
                const clickupApiKey = result.clickup_api_key;
                fetchClickUpTask(taskId, clickupApiKey);
            });
        }
    });

    // Button event listeners
    document.getElementById('eval-description').addEventListener('click', function() {
        if (currentTaskDetails) {
            chrome.storage.sync.get(['gemini_api_key'], function(result) {
                const geminiApiKey = result.gemini_api_key;
                evaluateDescriptionWithGemini(currentTaskDetails.name, currentTaskDetails.description, geminiApiKey);
            });
        } else {
            geminiOutputPre.textContent = 'Por favor, carregue uma tarefa do ClickUp primeiro.';
            geminiResponseDiv.style.display = 'block';
        }
    });

    document.getElementById('eval-commit').addEventListener('click', function() {
        if (currentTaskDetails) {
            chrome.storage.sync.get(['gemini_api_key'], function(result) {
                const geminiApiKey = result.gemini_api_key;
                generateChangelogWithGemini(currentTaskDetails.name, currentTaskDetails.description, geminiApiKey);
            });
        } else {
            geminiOutputPre.textContent = 'Por favor, carregue uma tarefa do ClickUp primeiro.';
            geminiResponseDiv.style.display = 'block';
        }
    });

    // Copy response to clipboard
    copyResponseBtn.addEventListener('click', function() {
        const textToCopy = geminiOutputPre.textContent; 
        navigator.clipboard.writeText(textToCopy).then(function() {
            const originalText = copyResponseBtn.textContent;
            copyResponseBtn.textContent = 'Copiado!';
            setTimeout(() => {
                copyResponseBtn.textContent = originalText;
            }, 1500);
        }).catch(function(err) {
            console.error('Could not copy text: ', err);
            alert('Falha ao copiar texto.');
        });
    });

    document.getElementById('publish-docs').addEventListener('click', function() {
        alert('Publicar Documentação clicado!');
    });
});