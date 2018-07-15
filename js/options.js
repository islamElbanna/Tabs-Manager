// Saves options to chrome.storage
function save_options() {
  var thumbnail_size = document.getElementById('thumbnail-size').value;
  chrome.storage.sync.set({
    favoriteThumbnailSize: thumbnail_size
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    status.style.display = "block";
    setTimeout(function() {
      status.textContent = '';
      status.style.display = "none";
    }, 1500);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get({
    favoriteThumbnailSize: 'medium-thumbnail',
  }, function(items) {
    document.getElementById('thumbnail-size').value = items.favoriteThumbnailSize;
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
