async function validateClickUpKey(key) {
    if (!key) return true; // Se estiver vazio, consideramos válido para permitir salvar vazio (ou podemos forçar preenchimento)
    try {
        const response = await fetch('https://api.clickup.com/api/v2/user', {
            method: 'GET',
            headers: { 'Authorization': key }
        });
        return response.ok; // Retorna true se 200 OK
    } catch (e) {
        return false;
    }
}

async function validateGeminiKey(key) {
    if (!key) return true; // Permitir salvar vazio
    try {
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash?key=${key}`;
        const response = await fetch(url);
        return response.ok;
    } catch (e) {
        return false;
    }
}

async function save_options() {
    var clickup_api_key = document.getElementById('clickup_api_key').value.trim();
    var github_api_key = document.getElementById('github_api_key').value.trim();
    var gemini_api_key = document.getElementById('gemini_api_key').value.trim();
    var status = document.getElementById('status');
    var saveBtn = document.getElementById('save');

    saveBtn.disabled = true;
    saveBtn.textContent = 'Validando...';
    status.style.color = '#f8fafc'; // Neutral color for processing
    status.textContent = 'Verificando chaves de API...';

    const isClickUpValid = await validateClickUpKey(clickup_api_key);
    const isGeminiValid = await validateGeminiKey(gemini_api_key);

    if (!isClickUpValid || !isGeminiValid) {
        let errorMsg = '';
        if (!isClickUpValid) errorMsg += 'ClickUp API Key inválida. ';
        if (!isGeminiValid) errorMsg += 'Gemini API Key inválida.';
        
        status.style.color = '#ef4444'; // Red 500
        status.textContent = errorMsg;
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
        return; // Não salva as chaves se alguma estiver inválida
    }

    chrome.storage.sync.set({
        clickup_api_key: clickup_api_key,
        github_api_key: github_api_key,
        gemini_api_key: gemini_api_key
    }, function() {
        status.style.color = '#10b981'; // Emerald 500
        status.textContent = 'Configurações validadas e salvas com sucesso!';
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
        setTimeout(function() {
            status.textContent = '';
        }, 3000);
    });
}

function restore_options() {
    chrome.storage.sync.get({
        clickup_api_key: '',
        github_api_key: '',
        gemini_api_key: ''
    }, function(items) {
        document.getElementById('clickup_api_key').value = items.clickup_api_key;
        document.getElementById('github_api_key').value = items.github_api_key;
        document.getElementById('gemini_api_key').value = items.gemini_api_key;
    });
}

document.addEventListener('DOMContentLoaded', function() {
    restore_options();
    document.getElementById('back-button').addEventListener('click', function() {
        window.location.href = '../popup.html';
    });
});

document.getElementById('save').addEventListener('click', save_options);