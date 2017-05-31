mod.define('Ajax', function() {
  var
    ajax = function() {
      var
        options,
        request = new XMLHttpRequest();

      if (typeof(arguments[0]) == 'string') {
        options = arguments[1];
        options.url = arguments[0];
      } else {
        options = arguments[0];
      }

      request.onload = function(e) {
        var
          xhr = e.target,
          data = xhr.responseText,
          status = xhr.status,
          statusText = xhr.statusText;

        if (status >= 200 && status < 300) {
          switch (options.responseType) {
          case 'json':
            data = JSON.parse(data);
            break;
          }
          options.success && options.success(data, statusText, xhr);
        } else if (status >= 400) {
          options.error && options.error(xhr, statusText);
        }

        options.complete && options.complete(xhr, statusText);
      };

      request.open(
        options.method || 'GET',
        options.url,
        (options.async != undefined) ? options.async : true
      );

      options.beforeSend && options.beforeSend(request);
      request.send();
    };

  return {
    ajax: ajax,
    get: function(url, success) {
      return ajax({
        url: url,
        success: success
      });
    },
    post: function(url, success) {
      return ajax({
        method: 'POST',
        url: url,
        success: success
      });
    },
    getJSON: function(url, success) {
      return ajax({
        url: url,
        responseType: 'json',
        success: success
      });
    }
  };
});
