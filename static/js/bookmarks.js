$.ajaxSetup({
  beforeSend: function(xhr, settings) {
    xhr.setRequestHeader('X-CSRF-Token', window.csrfToken);
  }
});
