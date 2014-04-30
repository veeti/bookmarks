$(function() {
  $('body').on('click', '.bookmark .action-delete', function(e) {
    e.preventDefault();

    var id = $(this).data('id');
    if (confirm('Are you sure you want to delete this link?')) {
      $.post('/links/' + id + '/delete', function(result) {
        if (result) {
          $('[data-id=' + id + ']').fadeOut(1000);
        }
      });
    }

    return false;
  });
});
