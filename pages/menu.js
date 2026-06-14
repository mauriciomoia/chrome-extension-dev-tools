function initializeMenu() {
    console.log('menu.js loaded and initialized');
    // No need for DOMContentLoaded here, as it will be called after content is loaded
    const settingsButton = document.getElementById('settings-button');
    if (settingsButton) {
        settingsButton.addEventListener('click', function() {
            window.location.href = 'pages/options.html';
        });
    }



    const faqButton = document.getElementById('faq-button');
    if (faqButton) {
        faqButton.addEventListener('click', function() {
            chrome.tabs.create({ url: 'https://app.clickup.com/3102749/v/dc/2yp0x-38553/2yp0x-25673' });
        });
    }
}