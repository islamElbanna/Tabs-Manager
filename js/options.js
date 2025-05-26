
// Save options to chrome.storage
function saveOptions() {
    const thumbnailSize = document.getElementById('thumbnail-size').value;
    chrome.storage.sync.set({ favoriteThumbnailSize: thumbnailSize }, () => {
        const status = document.getElementById('status');
        status.textContent = 'Options saved.';
        status.style.display = 'block';
        setTimeout(() => {
            status.textContent = '';
            status.style.display = 'none';
        }, 1500);
    });
}

// Restore select box state using stored preferences
function restoreOptions() {
    chrome.storage.sync.get({ favoriteThumbnailSize: 'medium-thumbnail' }, items => {
        document.getElementById('thumbnail-size').value = items.favoriteThumbnailSize;
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);