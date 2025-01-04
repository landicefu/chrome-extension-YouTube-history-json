// JavaScript for the popup

document.addEventListener('DOMContentLoaded', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = new URL(tabs[0].url);
        const descriptionElement = document.getElementById('description');
        const captureButton = document.getElementById('captureButton');
        const messageElement = document.getElementById('message');

        if (url.hostname === 'www.youtube.com' && url.pathname === '/feed/history') {
            descriptionElement.innerText = 'This is a long description of how the plugin works...';
            captureButton.style.display = 'block';
            messageElement.style.display = 'none';
        } else {
            chrome.tabs.create({ url: 'https://www.youtube.com/feed/history' });
        }
    });
});
