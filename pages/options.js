const MODELS = {
    gemini: [
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Rápido)' },
        { value: 'gemini-2.5-pro',   label: 'Gemini 2.5 Pro (Avançado)' },
        { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    ],
    anthropic: [
        { value: 'claude-sonnet-4-6',          label: 'Claude Sonnet 4.6 (Balanceado)' },
        { value: 'claude-haiku-4-5-20251001',   label: 'Claude Haiku 4.5 (Rápido)' },
        { value: 'claude-opus-4-8',             label: 'Claude Opus 4.8 (Avançado)' },
    ],
};

function populateModels(provider, selectedModel) {
    const modelSelect = document.getElementById('ai_model');
    modelSelect.innerHTML = '';
    (MODELS[provider] || MODELS.gemini).forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.value;
        opt.textContent = m.label;
        if (m.value === selectedModel) opt.selected = true;
        modelSelect.appendChild(opt);
    });
}

function updateProviderUI(provider) {
    document.getElementById('gemini_key_group').style.display    = provider === 'gemini'    ? 'block' : 'none';
    document.getElementById('anthropic_key_group').style.display = provider === 'anthropic' ? 'block' : 'none';
}

async function validateClickUpKey(key) {
    if (!key) return true;
    try {
        const response = await fetch('https://api.clickup.com/api/v2/user', {
            method: 'GET',
            headers: { 'Authorization': key }
        });
        return response.ok;
    } catch (e) {
        return false;
    }
}

async function validateGeminiKey(key) {
    if (!key) return true;
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash?key=${key}`);
        return response.ok;
    } catch (e) {
        return false;
    }
}

async function validateAnthropicKey(key) {
    if (!key) return true;
    try {
        const response = await fetch('https://api.anthropic.com/v1/models', {
            headers: {
                'x-api-key': key,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            }
        });
        return response.ok;
    } catch (e) {
        return false;
    }
}

async function save_options() {
    const clickup_api_key  = document.getElementById('clickup_api_key').value.trim();
    const github_api_key   = document.getElementById('github_api_key').value.trim();
    const ai_provider      = document.getElementById('ai_provider').value;
    const ai_model         = document.getElementById('ai_model').value;
    const gemini_api_key   = document.getElementById('gemini_api_key').value.trim();
    const anthropic_api_key = document.getElementById('anthropic_api_key').value.trim();
    const status           = document.getElementById('status');
    const saveBtn          = document.getElementById('save');

    saveBtn.disabled = true;
    saveBtn.textContent = 'Validando...';
    status.style.color = '#f8fafc';
    status.textContent = 'Verificando chaves de API...';

    const isClickUpValid = await validateClickUpKey(clickup_api_key);
    let isAIValid = true;
    let aiErrorMsg = '';

    if (ai_provider === 'anthropic') {
        isAIValid = await validateAnthropicKey(anthropic_api_key);
        if (!isAIValid) aiErrorMsg = 'Anthropic API Key inválida.';
    } else {
        isAIValid = await validateGeminiKey(gemini_api_key);
        if (!isAIValid) aiErrorMsg = 'Gemini API Key inválida.';
    }

    if (!isClickUpValid || !isAIValid) {
        let errorMsg = '';
        if (!isClickUpValid) errorMsg += 'ClickUp API Key inválida. ';
        errorMsg += aiErrorMsg;
        status.style.color = '#ef4444';
        status.textContent = errorMsg;
        saveBtn.disabled = false;
        saveBtn.textContent = 'Salvar';
        return;
    }

    chrome.storage.sync.set({
        clickup_api_key,
        github_api_key,
        ai_provider,
        ai_model,
        gemini_api_key,
        anthropic_api_key,
    }, function () {
        status.style.color = '#10b981';
        status.textContent = 'Configurações validadas e salvas com sucesso!';
        saveBtn.disabled = false;
        saveBtn.textContent = 'Salvar';
        setTimeout(() => { status.textContent = ''; }, 3000);
    });
}

function restore_options() {
    chrome.storage.sync.get({
        clickup_api_key: '',
        github_api_key: '',
        ai_provider: 'gemini',
        ai_model: 'gemini-2.5-flash',
        gemini_api_key: '',
        anthropic_api_key: '',
    }, function (items) {
        document.getElementById('clickup_api_key').value  = items.clickup_api_key;
        document.getElementById('github_api_key').value   = items.github_api_key;
        document.getElementById('ai_provider').value      = items.ai_provider;
        document.getElementById('gemini_api_key').value   = items.gemini_api_key;
        document.getElementById('anthropic_api_key').value = items.anthropic_api_key;

        populateModels(items.ai_provider, items.ai_model);
        updateProviderUI(items.ai_provider);
    });
}

document.addEventListener('DOMContentLoaded', function () {
    restore_options();

    document.getElementById('ai_provider').addEventListener('change', function () {
        const provider = this.value;
        populateModels(provider, null);
        updateProviderUI(provider);
    });

    document.getElementById('back-button').addEventListener('click', function () {
        window.location.href = '../popup.html';
    });
});

document.getElementById('save').addEventListener('click', save_options);
