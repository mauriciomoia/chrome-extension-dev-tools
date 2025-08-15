function save_options() {
  var clickup_api_key = document.getElementById('clickup_api_key').value;
  var github_api_key = document.getElementById('github_api_key').value;
  var gemini_api_key = document.getElementById('gemini_api_key').value;
  chrome.storage.sync.set({
    clickup_api_key: clickup_api_key,
    github_api_key: github_api_key,
    gemini_api_key: gemini_api_key
  }, function() {
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
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

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);