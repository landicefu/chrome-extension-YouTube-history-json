// JavaScript for the popup

document.addEventListener('DOMContentLoaded', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const currentTab = tabs[0];
        const captureButton = document.getElementById('captureButton');
        const messageDiv = document.getElementById('message');

        if (currentTab.url.includes('youtube.com/feed/history')) {
            captureButton.style.display = 'block';
            captureButton.addEventListener('click', () => {
                chrome.scripting.executeScript({
                    target: { tabId: currentTab.id },
                    function: capturePlaybackHistory
                }).then((results) => {
                    if (results[0].result) {
                        const historyData = results[0].result;
                        navigator.clipboard.writeText(JSON.stringify(historyData, null, 2))
                            .then(() => {
                                messageDiv.textContent = 'History data copied to clipboard!';
                                messageDiv.style.color = 'green';
                            })
                            .catch((err) => {
                                messageDiv.textContent = `Failed to copy to clipboard: ${err.message}`;
                                messageDiv.style.color = 'red';
                            });
                    } else {
                        messageDiv.textContent = 'Failed to capture history data.';
                        messageDiv.style.color = 'red';
                    }
                }).catch((err) => {
                    messageDiv.textContent = `Error: ${err.message}`;
                    messageDiv.style.color = 'red';
                });
            });
        } else {
            messageDiv.textContent = 'Please navigate to YouTube History page first.';
            messageDiv.style.color = 'orange';
        }
    });
});

function capturePlaybackHistory() {
    const historyContainer = document.querySelector('#contents');
    if (!historyContainer) {
        console.error('History container not found');
        return;
    }

    const historyItems = historyContainer.querySelectorAll('ytd-video-renderer');
    const historyData = Array.from(historyItems).map(item => {
        // Extract video ID from href
        const videoLink = item.querySelector('#thumbnail').href;
        const videoId = new URLSearchParams(videoLink.split('?')[1]).get('v');
        
        // Get timestamp if available
        const timestamp = videoLink.split('&t=')[1]?.replace('s', '') || null;

        // Get duration
        const durationText = item.querySelector('.badge-shape-wiz__text')?.textContent.trim();

        // Get progress percentage
        const progressBar = item.querySelector('#progress');
        const progressPercentage = progressBar ? 
            Number.parseInt(progressBar.style.width) : 0;

        // Get thumbnail URL
        const thumbnailImg = item.querySelector('img.yt-core-image');
        const thumbnailUrl = thumbnailImg ? thumbnailImg.src : null;

        // Get title
        const titleElement = item.querySelector('#video-title');
        const title = titleElement?.textContent.trim();

        // Get channel info
        const channelElement = item.querySelector('#channel-name yt-formatted-string a');
        const channelName = channelElement?.textContent.trim();
        const channelUrl = channelElement?.href;

        // Get view count
        const viewCountElement = item.querySelector('.inline-metadata-item');
        const viewCount = viewCountElement?.textContent.trim();

        // Get description
        const description = item.querySelector('#description-text')?.textContent.trim();

        return {
            videoId,
            title,
            url: `https://www.youtube.com/watch?v=${videoId}${timestamp ? `&t=${timestamp}` : ''}`,
            timestamp: timestamp ? Number.parseInt(timestamp) : null,
            duration: durationText,
            progress: progressPercentage,
            thumbnailUrl,
            channel: {
                name: channelName,
                url: channelUrl ? `https://www.youtube.com${channelUrl}` : null
            },
            viewCount,
            description
        };
    });

    return historyData;
}
