// JavaScript for the popup

document.addEventListener('DOMContentLoaded', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const currentTab = tabs[0];
        const captureButton = document.getElementById('captureButton');
        const downloadButton = document.getElementById('downloadButton');
        const formatSelect = document.getElementById('formatSelect');
        const messageDiv = document.getElementById('message');

        if (currentTab.url.includes('youtube.com/feed/history')) {
            captureButton.style.display = 'block';
            downloadButton.style.display = 'block';
            formatSelect.style.display = 'block';

            const convertToCSV = (historyData) => {
                const headers = ['videoId', 'title', 'channelName', 'channelUrl', 'duration', 'progressPercentage', 'viewCount', 'description', 'thumbnailUrl'];
                const rows = [headers];

                historyData.forEach(item => {
                    rows.push([
                        item.videoId || '',
                        (item.title || '').replace(/"/g, '""'),
                        (item.channel.name || '').replace(/"/g, '""'),
                        item.channel.url || '',
                        item.duration || '',
                        item.progress || '',
                        item.viewCount || '',
                        (item.description || '').replace(/"/g, '""'),
                        item.thumbnailUrl || ''
                    ]);
                });

                return rows.map(row => 
                    row.map(cell => `"${cell}"`).join(',')
                ).join('\n');
            };

            const captureAndProcess = (action) => {
                chrome.scripting.executeScript({
                    target: { tabId: currentTab.id },
                    function: capturePlaybackHistory
                }).then((results) => {
                    if (results[0].result) {
                        const historyData = results[0].result;
                        const format = document.getElementById('formatSelect').value;
                        let data, mimeType, fileExtension;

                        if (format === 'json') {
                            data = JSON.stringify(historyData, null, 2);
                            mimeType = 'application/json';
                            fileExtension = 'json';
                        } else {
                            data = convertToCSV(historyData);
                            mimeType = 'text/csv';
                            fileExtension = 'csv';
                        }

                        if (action === 'copy') {
                            navigator.clipboard.writeText(data)
                                .then(() => {
                                    messageDiv.textContent = `Found ${historyData.length} items. History data copied to clipboard!`;
                                    messageDiv.style.color = 'green';
                                })
                                .catch((err) => {
                                    messageDiv.textContent = `Failed to copy to clipboard: ${err.message}`;
                                    messageDiv.style.color = 'red';
                                });
                        } else if (action === 'download') {
                            const blob = new Blob([data], { type: mimeType });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            const date = new Date().toISOString().split('T')[0];
                            a.href = url;
                            a.download = `youtube-history-${date}.${fileExtension}`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                            messageDiv.textContent = `Found ${historyData.length} items. History data downloaded!`;
                            messageDiv.style.color = 'green';
                        }
                    } else {
                        messageDiv.textContent = 'Failed to capture history data.';
                        messageDiv.style.color = 'red';
                    }
                }).catch((err) => {
                    messageDiv.textContent = `Error: ${err.message}`;
                    messageDiv.style.color = 'red';
                });
            };

            captureButton.addEventListener('click', () => captureAndProcess('copy'));
            downloadButton.addEventListener('click', () => captureAndProcess('download'));
        } else {
            messageDiv.textContent = 'Please navigate to YouTube History page first.';
            messageDiv.style.color = 'orange';
        }
    });
});

function capturePlaybackHistory() {
    const historyItems = document.querySelectorAll('ytd-video-renderer');
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
                url: channelUrl || null
            },
            viewCount,
            description
        };
    });

    return historyData;
}
