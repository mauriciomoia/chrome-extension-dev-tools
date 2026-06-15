document.addEventListener('DOMContentLoaded', function () {
    // Initialize Showdown converter
    const converter = new showdown.Converter({ simpleLineBreaks: true });
    // Elementos da UI
    const taskNameSpan = document.getElementById('task-name');
    const taskStatusSpan = document.getElementById('task-status');
    const geminiResponseDiv = document.getElementById('gemini-result-container');
    const geminiOutputPre = document.getElementById('gemini-output');
    const copyResponseBtn = document.getElementById('copy-response-btn');
    const statusDocumentationDiv = document.getElementById('status-documentation');
    const evaluationTitle = document.getElementById('evaluation-title');
    const contextContentDiv = document.getElementById('context-content');
    const defaultMessageDiv = document.getElementById('default-message');
    const buttonContainer = document.querySelector('.button-container');
    const addToTaskBtn = document.getElementById('add-to-task-btn');
    const copyMdBtn = document.getElementById('copy-md-btn');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');
    const aiAlertDiv = document.getElementById('ai-responsibility-alert');

    // Botões
    const evalDescriptionBtn = document.getElementById('eval-description');
    const generateChangelogBtn = document.getElementById('generate-changelog');
    const generateManualBtn = document.getElementById('generate-manual');
    const codeReviewBtn = document.getElementById('eval-commit');
    const menuButton = document.getElementById('menu-button');
    const generationDateEl = document.getElementById('generation-date');

    // New elements for view management
    const mainView = document.getElementById('main-view');
    const menuView = document.getElementById('menu-view');
    const menuContentArea = document.getElementById('menu-content-area');
    const menuBackButton = document.getElementById('menu-back-button');

    const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1/models';

    let currentTaskDetails = null;
    let currentContextIdForStorage = null;
    let currentGeminiRawText = '';

    // --- Funções Auxiliares ---
    function stripMarkdown(text) {
        if (!text) return '';
        return text
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/__(.*?)__/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/_(.*?)_/g, '$1')
            .replace(/^#{1,6}\s+(.*)$/gm, '\n$1')
            .replace(/```[^\n]*\n/g, '')
            .replace(/```/g, '')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
            .replace(/^>\s+(.*)$/gm, '$1')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    // --- Funções de Detecção e Parse de URL ---
    function getClickUpTaskInfo(url) {
        const match = url.match(/clickup\.com\/t\/(?:\d+\/)?([a-zA-Z0-9-]+)/);
        if (!match) return null;

        const taskId = match[1];
        const teamIdMatch = url.match(/clickup\.com\/t\/(\d+)\//);

        return {
            taskId: taskId,
            teamId: teamIdMatch ? teamIdMatch[1] : null,
            isCustom: taskId.includes('-')
        };
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

    async function fetchClickUpTask(taskInfo, apiKey) {
        let url = `https://api.clickup.com/api/v2/task/${taskInfo.taskId}`;
        if (taskInfo.isCustom && taskInfo.teamId) {
            url += `?custom_task_ids=true&team_id=${taskInfo.teamId}`;
        }

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
                let errorDetails = '';
                try {
                    const errorJson = await response.json();
                    errorDetails = errorJson.err ? errorJson.err : JSON.stringify(errorJson);
                } catch (e) { }

                if (response.status === 401) {
                    throw new Error(`Acesso negado (401). Isso pode ocorrer se a chave for inválida ou se você não tiver acesso à tarefa. Detalhes: ${errorDetails}`);
                }
                throw new Error(`HTTP error! status: ${response.status} - ${errorDetails}`);
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

    async function callAIAPI(prompt, { provider, model, apiKey }, title) {
        if (evaluationTitle) {
            evaluationTitle.textContent = title;
            evaluationTitle.style.display = 'block';
        }

        if (aiAlertDiv) aiAlertDiv.style.display = 'block';

        geminiOutputPre.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px 0;">
                <svg width="40" height="40" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" stroke="#38bdf8">
                    <circle cx="25" cy="25" r="20" fill="none" stroke-width="4" stroke-linecap="round" stroke-dasharray="90, 150">
                        <animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" keyTimes="0;1" values="0 25 25;360 25 25"></animateTransform>
                    </circle>
                </svg>
                <div style="font-size: 1.1rem; font-weight: bold; color: #38bdf8; margin-top: 15px;">✨ Analisando a tarefa...</div>
            </div>`;

        geminiResponseDiv.style.display = 'block';

        try {
            let responseText;

            if (provider === 'anthropic') {
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'anthropic-dangerous-direct-browser-access': 'true'
                    },
                    body: JSON.stringify({
                        model: model,
                        max_tokens: 8096,
                        messages: [{ role: 'user', content: prompt }]
                    })
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Anthropic API error! status: ${response.status}, message: ${errorData.error?.message}`);
                }
                const data = await response.json();
                responseText = data.content[0].text;
            } else {
                const geminiUrl = `${GEMINI_BASE_URL}/${model}:generateContent`;
                const response = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': apiKey
                    },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Gemini API error! status: ${response.status}, message: ${errorData.error.message}`);
                }
                const data = await response.json();
                responseText = data.candidates[0].content.parts[0].text;
            }

            currentGeminiRawText = responseText;
            const htmlContent = converter.makeHtml(responseText);
            geminiOutputPre.innerHTML = htmlContent;

            if (aiAlertDiv) aiAlertDiv.style.display = 'none';

            let dateString = '';
            if (generationDateEl) {
                const now = new Date();
                const options = { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
                dateString = new Intl.DateTimeFormat('pt-BR', options).format(now).replace(',', '');
                generationDateEl.textContent = `Gerado em: ${dateString}`;
                generationDateEl.style.display = 'block';
            }

            if (currentContextIdForStorage) {
                const stateKey = `gemini_state_${currentContextIdForStorage}`;
                const stateObj = {};
                stateObj[stateKey] = { title, htmlContent, rawText: responseText, dateString };
                chrome.storage.local.set(stateObj);
            }
            if (currentContextIdForStorage.startsWith('clickup_')) {
                addToTaskBtn.style.display = 'block';
            } else {
                addToTaskBtn.style.display = 'none';
            }
            if (title === 'Manual / Guia de Uso') {
                generatePdfBtn.style.display = 'inline-block';
            } else {
                generatePdfBtn.style.display = 'none';
            }

            copyResponseBtn.onclick = () => { navigator.clipboard.writeText(stripMarkdown(responseText)); };
            copyMdBtn.onclick = () => { navigator.clipboard.writeText(responseText); };

        } catch (error) {
            console.error('Erro ao chamar a API de IA:', error);
            geminiOutputPre.textContent = `Erro ao gerar a resposta: ${error.message}`;
            if (aiAlertDiv) aiAlertDiv.style.display = 'none';
        }
    }

    function getAISettings(callback) {
        chrome.storage.sync.get(
            { ai_provider: 'gemini', ai_model: 'gemini-2.5-flash', gemini_api_key: '', anthropic_api_key: '' },
            function (result) {
                const provider = result.ai_provider;
                const model    = result.ai_model;
                const apiKey   = provider === 'anthropic' ? result.anthropic_api_key : result.gemini_api_key;
                const providerLabel = provider === 'anthropic' ? 'Anthropic' : 'Gemini';
                callback({ provider, model, apiKey, providerLabel });
            }
        );
    }

    // --- Lógica Principal ---
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const currentUrl = tabs[0].url;
        const clickUpTaskInfo = getClickUpTaskInfo(currentUrl);
        const githubCommitInfo = parseGitHubCommitUrl(currentUrl);

        if (clickUpTaskInfo) {
            currentContextIdForStorage = `clickup_${clickUpTaskInfo.taskId}`;

            contextContentDiv.style.display = 'block';
            defaultMessageDiv.style.display = 'none';
            buttonContainer.style.display = 'flex';
            evalDescriptionBtn.style.display = 'inline-block';
            generateChangelogBtn.style.display = 'inline-block';
            generateManualBtn.style.display = 'inline-block';
            codeReviewBtn.style.display = 'none';

            // Restaurar estado do Gemini se existir
            chrome.storage.local.get([`gemini_state_${currentContextIdForStorage}`], function (result) {
                const state = result[`gemini_state_${currentContextIdForStorage}`];
                if (state) {
                    currentGeminiRawText = state.rawText;
                    if (evaluationTitle) {
                        evaluationTitle.textContent = state.title;
                        evaluationTitle.style.display = 'block';
                    }
                    if (generationDateEl && state.dateString) {
                        generationDateEl.textContent = `Gerado em: ${state.dateString}`;
                        generationDateEl.style.display = 'block';
                    } else if (generationDateEl) {
                        generationDateEl.style.display = 'none';
                    }
                    geminiOutputPre.innerHTML = state.htmlContent;
                    geminiResponseDiv.style.display = 'block';
                    copyResponseBtn.onclick = () => {
                        navigator.clipboard.writeText(stripMarkdown(state.rawText));
                    };
                    copyMdBtn.onclick = () => {
                        navigator.clipboard.writeText(state.rawText);
                    };
                    if (currentContextIdForStorage.startsWith('clickup_')) {
                        addToTaskBtn.style.display = 'block';
                    } else {
                        addToTaskBtn.style.display = 'none';
                    }
                    if (state.title === 'Manual / Guia de Uso') {
                        generatePdfBtn.style.display = 'inline-block';
                    } else {
                        generatePdfBtn.style.display = 'none';
                    }
                }
            });

            taskNameSpan.textContent = 'Carregando...';
            taskStatusSpan.textContent = 'Carregando...';
            chrome.storage.sync.get(['clickup_api_key'], function (result) {
                if (result.clickup_api_key) {
                    fetchClickUpTask(clickUpTaskInfo, result.clickup_api_key);
                } else {
                    taskNameSpan.textContent = 'Chave de API do ClickUp não configurada.';
                    taskStatusSpan.textContent = '';
                }
            });

        } else if (githubCommitInfo) {
            currentContextIdForStorage = `github_${githubCommitInfo.owner}_${githubCommitInfo.repo}_${githubCommitInfo.sha}`;

            contextContentDiv.style.display = 'none';
            defaultMessageDiv.style.display = 'none';
            buttonContainer.style.display = 'flex';
            evalDescriptionBtn.style.display = 'none';
            generateChangelogBtn.style.display = 'none';
            generateManualBtn.style.display = 'none';
            codeReviewBtn.style.display = 'inline-block';

            // Restaurar estado do Gemini se existir
            chrome.storage.local.get([`gemini_state_${currentContextIdForStorage}`], function (result) {
                const state = result[`gemini_state_${currentContextIdForStorage}`];
                if (state) {
                    currentGeminiRawText = state.rawText;
                    if (evaluationTitle) {
                        evaluationTitle.textContent = state.title;
                        evaluationTitle.style.display = 'block';
                    }
                    if (generationDateEl && state.dateString) {
                        generationDateEl.textContent = `Gerado em: ${state.dateString}`;
                        generationDateEl.style.display = 'block';
                    } else if (generationDateEl) {
                        generationDateEl.style.display = 'none';
                    }
                    geminiOutputPre.innerHTML = state.htmlContent;
                    geminiResponseDiv.style.display = 'block';
                    copyResponseBtn.onclick = () => {
                        navigator.clipboard.writeText(stripMarkdown(state.rawText));
                    };
                    copyMdBtn.onclick = () => {
                        navigator.clipboard.writeText(state.rawText);
                    };
                    if (currentContextIdForStorage.startsWith('clickup_')) {
                        addToTaskBtn.style.display = 'block';
                    } else {
                        addToTaskBtn.style.display = 'none';
                    }
                    if (state.title === 'Manual / Guia de Uso') {
                        generatePdfBtn.style.display = 'inline-block';
                    } else {
                        generatePdfBtn.style.display = 'none';
                    }
                }
            });

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

        getAISettings(async ({ provider, model, apiKey, providerLabel }) => {
            if (!apiKey) {
                alert(`Chave de API da ${providerLabel} não configurada. Por favor, configure-a nas opções da extensão.`);
                return;
            }
            const prompt = `Aja como um Product Owner (PO) e Analista de Requisitos Sênior que faz parte do time de desenvolvimento de software da Strategi.
Analise a seguinte descrição de tarefa do ClickUp.
Regras:
1. Se a descrição atual já estiver excelente e cobrir todos os pontos necessários (História de Usuário, Critérios de Aceite e Cenários de Teste), não gere nenhuma reescrita. Responda APENAS com "A escrita já é suficientemente boa." e nada mais.
2. Caso precise de melhorias, NÃO faça sugestões ou comentários sobre o que está errado. Entregue DIRETAMENTE a descrição reescrita. Não adicione texto antes ou depois da reescrita (sem saudações ou explicações).
3. A reescrita DEVE conter obrigatoriamente as seguintes seções estruturadas:
   - História de Usuário (User Story)
   - Critérios de Aceite (Acceptance Criteria)
   - Cenários de Teste (Test Scenarios)
4. Dúvidas:
   - Se você tiver "Dúvidas Críticas" (aquelas que bloqueiam o entendimento ou o desenvolvimento), elas devem aparecer BEM AO INÍCIO da sua resposta.
   - Se houver apenas "Dúvidas Complementares" (não críticas), elas devem aparecer AO FINAL da reescrita.

Descrição da tarefa:
${currentTaskDetails.description}`;
            await callAIAPI(prompt, { provider, model, apiKey }, 'Avaliação da Descrição');
        });
    });

    generateChangelogBtn.addEventListener('click', async () => {
        if (!currentTaskDetails) {
            alert('Nenhuma tarefa encontrada.');
            return;
        }

        getAISettings(async ({ provider, model, apiKey, providerLabel }) => {
            if (!apiKey) {
                alert(`Chave de API da ${providerLabel} não configurada. Por favor, configure-a nas opções da extensão.`);
                return;
            }
            const prompt = `Aja como um Product Manager Sênior focado em comunicação com o cliente na Strategi.
Com base na seguinte tarefa do ClickUp, crie uma Nota de Versão (Changelog) clara, concisa e focada no valor entregue ao usuário.
Regras:
1. Inicie a resposta obrigatoriamente com o título "## Nota de Versão (Changelog)".
2. Seja direto, sem saudações ou introduções. Não escreva textos antes ou depois do changelog.
3. Não use jargões técnicos desnecessários; foque no benefício e no que mudou na perspectiva do usuário.
4. Se for uma correção de bug, explique o que foi resolvido. Se for uma nova funcionalidade, explique a novidade.
5. Estruture em tópicos curtos usando listas numeradas.

Nome da Tarefa: ${currentTaskDetails.name}
Status: ${currentTaskDetails.status ? currentTaskDetails.status.status : 'N/A'}
Descrição da tarefa:
${currentTaskDetails.description || 'N/A'}`;
            await callAIAPI(prompt, { provider, model, apiKey }, 'Nota de Versão (Changelog)');
        });
    });

    generateManualBtn.addEventListener('click', async () => {
        if (!currentTaskDetails) {
            alert('Nenhuma tarefa encontrada.');
            return;
        }

        getAISettings(async ({ provider, model, apiKey, providerLabel }) => {
            if (!apiKey) {
                alert(`Chave de API da ${providerLabel} não configurada. Por favor, configure-a nas opções da extensão.`);
                return;
            }

            let username = 'Usuário';
            chrome.storage.sync.get({ clickup_api_key: '' }, async (storageResult) => {
                if (storageResult.clickup_api_key) {
                    try {
                        const userResp = await fetch('https://api.clickup.com/api/v2/user', {
                            headers: { 'Authorization': storageResult.clickup_api_key }
                        });
                        if (userResp.ok) {
                            const userData = await userResp.json();
                            username = userData.user.username || 'Usuário';
                        }
                    } catch (e) {
                        console.error('Erro ao buscar usuário do ClickUp:', e);
                    }
                }

                const now = new Date();
                const options = { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
                const dateString = new Intl.DateTimeFormat('pt-BR', options).format(now).replace(',', '');

                const prompt = `Aja como um Technical Writer (Redator Técnico) Sênior do time da Strategi.
Com base na seguinte tarefa do ClickUp, crie um pequeno Manual/Guia de Uso para a funcionalidade.
Regras:
1. Inicie a resposta OBRIGATORIAMENTE com o seguinte cabeçalho exato, não mude nada:
# Manual do Usuário
Criado por ${username}, Criado em : ${dateString}

2. Seja direto, sem saudações ou texto antes/depois do manual.
3. Estruture obrigatoriamente nas seções:
   - Visão Geral (Para que serve de forma resumida)
   - Como usar (Passo a passo didático em formato de lista numerada)
   - Regras Importantes (Restrições ou comportamentos chave de negócio)
4. Use formatação limpa.

Nome da Tarefa: ${currentTaskDetails.name}
Status: ${currentTaskDetails.status ? currentTaskDetails.status.status : 'N/A'}
Descrição da tarefa:
${currentTaskDetails.description || 'N/A'}`;
                await callAIAPI(prompt, { provider, model, apiKey }, 'Manual / Guia de Uso');
            });
        });
    });

    async function getLogoDataUrl() {
        try {
            const url = chrome.runtime.getURL('images/logo_128.png');
            const response = await fetch(url);
            const blob = await response.blob();
            return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error('Erro ao carregar logo:', e);
            return null;
        }
    }

    generatePdfBtn.addEventListener('click', async () => {
        if (!currentGeminiRawText) return;

        // A4 content width: 210mm - 15mm*2 margins = 180mm ≈ 680px at 96dpi
        const PDF_WIDTH = 680;

        const logoDataUrl = await getLogoDataUrl();
        const logoHtml = logoDataUrl
            ? `<img src="${logoDataUrl}" style="height:36px;width:36px;border-radius:6px;object-fit:contain;" />`
            : '';

        const container = document.createElement('div');
        container.style.cssText = [
            `width:${PDF_WIDTH}px`,
            'box-sizing:border-box',
            'padding:24px 28px',
            'background:#ffffff',
            'color:#333',
            'font-family:Arial,sans-serif',
            'word-wrap:break-word',
            'overflow-wrap:break-word',
        ].join(';');

        container.innerHTML = `
            <style>
                * { box-sizing: border-box; }
                body { margin: 0; }
                h1 { font-size: 22px; margin-top: 0; margin-bottom: 14px; page-break-inside: avoid; }
                h2, h3, h4, h5, h6 { page-break-inside: avoid; page-break-after: avoid; margin-bottom: 8px; }
                p { margin-top: 4px; margin-bottom: 10px; line-height: 1.6; page-break-inside: avoid; }
                ul, ol { margin-top: 4px; margin-bottom: 14px; padding-left: 22px; page-break-inside: avoid; }
                li { margin-bottom: 5px; line-height: 1.6; page-break-inside: avoid; }
                table { page-break-inside: avoid; width: 100%; }
                pre, code { page-break-inside: avoid; white-space: pre-wrap; word-break: break-word; }
                strong, b { font-weight: bold; }
                em, i { font-style: italic; }
            </style>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;padding-bottom:14px;border-bottom:3px solid #f97316;">
                ${logoHtml}
                <span style="font-size:15px;font-weight:700;color:#0f172a;letter-spacing:0.02em;">Strategi</span>
            </div>
            <div>${converter.makeHtml(currentGeminiRawText)}</div>
        `;

        const opt = {
            margin: [15, 15, 15, 15],
            filename: 'Manual.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                scrollY: 0,
                windowWidth: PDF_WIDTH,
                onclone: (clonedDoc) => {
                    // Expand html+body to container width so overflow:visible
                    // allows html2canvas to capture the full element without clipping.
                    // popup.css sets body{width:350px} — we must override it here.
                    const expand = `width:${PDF_WIDTH}px;min-width:${PDF_WIDTH}px;max-width:none;overflow:visible;margin:0;padding:0;`;
                    clonedDoc.documentElement.setAttribute('style', expand);
                    clonedDoc.body.setAttribute('style', expand);
                }
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pageBreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        html2pdf().set(opt).from(container).save();
    });

    addToTaskBtn.addEventListener('click', () => {
        if (!currentTaskDetails || !currentContextIdForStorage || !currentGeminiRawText) return;

        if (currentGeminiRawText.trim() === "A escrita já é suficientemente boa.") {
            alert('A descrição já está boa, não há o que adicionar.');
            return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const currentUrl = tabs[0].url;
            const taskInfo = getClickUpTaskInfo(currentUrl);
            if (!taskInfo) return;

            chrome.storage.sync.get(['clickup_api_key'], async (result) => {
                const apiKey = result.clickup_api_key;
                if (!apiKey) {
                    alert('Chave de API do ClickUp não configurada.');
                    return;
                }

                addToTaskBtn.textContent = 'Adicionando...';
                addToTaskBtn.disabled = true;

                const originalDesc = currentTaskDetails.description || '';
                const now = new Date();
                const options = { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
                const dateString = new Intl.DateTimeFormat('pt-BR', options).format(now).replace(',', '');

                const textToAdd = `\n\n---\n[Gerado por IA - ${dateString}]\n\n${stripMarkdown(currentGeminiRawText)}`;
                const newDescription = originalDesc + textToAdd;

                let url = `https://api.clickup.com/api/v2/task/${taskInfo.taskId}`;
                if (taskInfo.isCustom && taskInfo.teamId) {
                    url += `?custom_task_ids=true&team_id=${taskInfo.teamId}`;
                }

                try {
                    const response = await fetch(url, {
                        method: 'PUT',
                        headers: {
                            'Authorization': apiKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ description: newDescription })
                    });

                    if (response.ok) {
                        addToTaskBtn.textContent = 'Adicionado com sucesso!';
                        currentTaskDetails.description = newDescription;
                        setTimeout(() => {
                            addToTaskBtn.textContent = 'Adicionar na Tarefa';
                            addToTaskBtn.disabled = false;
                        }, 2000);
                    } else {
                        const err = await response.json();
                        alert(`Erro ao adicionar: ${err.err || JSON.stringify(err)}`);
                        addToTaskBtn.textContent = 'Erro!';
                        setTimeout(() => {
                            addToTaskBtn.textContent = 'Adicionar na Tarefa';
                            addToTaskBtn.disabled = false;
                        }, 2000);
                    }
                } catch (e) {
                    console.error('Erro ao adicionar na tarefa:', e);
                    alert(`Erro: ${e.message}`);
                    addToTaskBtn.textContent = 'Erro!';
                    setTimeout(() => {
                        addToTaskBtn.textContent = 'Adicionar na Tarefa';
                        addToTaskBtn.disabled = false;
                    }, 2000);
                }
            });
        });
    });

    menuButton.addEventListener('click', async () => {
        mainView.style.display = 'none';
        menuView.style.display = 'block';

        // Fetch menu.html content
        try {
            const response = await fetch('pages/menu.html');
            const html = await response.text();
            // Extract only the content within the <main> tag
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const menuMainContent = doc.querySelector('main').innerHTML;
            menuContentArea.innerHTML = menuMainContent;

            // Execute the menu.js script
            // This assumes menu.js has a global function initializeMenu()
            // and does not rely on DOMContentLoaded
            if (typeof initializeMenu === 'function') {
                initializeMenu();
            } else {
                // If initializeMenu is not globally available, load the script dynamically
                const script = document.createElement('script');
                script.src = 'pages/menu.js';
                script.onload = () => {
                    if (typeof initializeMenu === 'function') {
                        initializeMenu();
                    } else {
                        console.error('initializeMenu function not found after loading menu.js');
                    }
                };
                document.body.appendChild(script);
            }

        } catch (error) {
            console.error('Error loading menu content:', error);
            menuContentArea.textContent = 'Falha ao carregar o menu.';
        }
    });

    menuBackButton.addEventListener('click', () => {
        menuView.style.display = 'none';
        mainView.style.display = 'block';
    });
});