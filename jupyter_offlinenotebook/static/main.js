// TODO: Convert to typescript
define([
  'base/js/namespace',
  'base/js/events',
  'base/js/utils',
  'base/js/dialog',
  'jquery',
  './jslib/offlinenotebook'
],
  function (Jupyter, events, utils, dialog, $, offline) {

    var initialise = function () {
      $.getJSON(utils.get_body_data('baseUrl') + 'offlinenotebook/config', function (data) {
        offline.initialise(data);
        addButtons();
      });
    }

    var addButtons = function () {
      Jupyter.actions.register({
        'help': 'Download visible',
        'icon': 'fa-download',
        'handler': downloadNotebookFromBrowser
      }, 'offline-notebook-download', 'offlinenotebook');
      Jupyter.actions.register({
        'help': 'Save to browser storage',
        'icon': 'fa-cloud-download',
        'handler': localstoreSaveNotebook
      }, 'offline-notebook-save', 'offlinenotebook');
      Jupyter.actions.register({
        'help': 'Restore from browser storage',
        'icon': 'fa-cloud-upload',
        'handler': localstoreLoadNotebook
      }, 'offline-notebook-load', 'offlinenotebook');

      var repoIcons = {
        'GitHub': 'fa-github',
        'GitLab': 'fa-gitlab',
        'Git': 'fa-git'
      }
      Jupyter.actions.register({
        'help': 'Visit Binder repository',
        'icon': repoIcons[offline.repoLabel()] || 'fa-external-link',
        'handler': offline.openBinderRepo
      }, 'offline-notebook-binderrepo', 'offlinenotebook');
      Jupyter.actions.register({
        'help': 'Link to this Binder',
        'icon': 'fa-link',
        'handler': showBinderLink
      }, 'offline-notebook-binderlink', 'offlinenotebook');

      var buttons = [{
        'action': 'offlinenotebook:offline-notebook-download',
        'label': 'Download'
      }];
      if (offline.repoid()) {
        buttons.push('offlinenotebook:offline-notebook-save');
        buttons.push('offlinenotebook:offline-notebook-load');
      }
      Jupyter.toolbar.add_buttons_group(buttons);

      var binderButtons = []
      if (offline.binderRefUrl()) {
        binderButtons.push({
          'action': 'offlinenotebook:offline-notebook-binderrepo',
          'label': offline.repoLabel()
        });
      }
      if (offline.binderPersistentUrl()) {
        binderButtons.push({
          'action': 'offlinenotebook:offline-notebook-binderlink',
          'label': 'Binder'
        })
      }
      if (binderButtons) {
        Jupyter.toolbar.add_buttons_group(binderButtons);
      }
    }

    function modalDialog(title, body, displayclass, buttons) {
      if (displayclass) {
        body.addClass(displayclass);
      }
      if (!buttons) {
        buttons = {
          OK: { 'class': 'btn-primary' }
        };
      }
      dialog.modal({
        title: title,
        body: body,
        buttons: buttons
      });
    }

    function formatRepoPathforDialog(path) {
      var displayRepoid = $('<div/>').append(
        $('<span/>', {
          'text': 'repoid: '
        }).append(
          $('<b/>', {
            'text': offline.repoid()
          })
        ));
      var displayPath = $('<div/>').append(
        $('<span/>', {
          'text': 'path: '
        }).append(
          $('<b/>', {
            'text': path
          })
        ));
      return displayRepoid.append(displayPath);
    }

    function getNotebookFromBrowser() {
      return Jupyter.notebook.toJSON();
    }

    function localstoreSaveNotebook() {
      var path = Jupyter.notebook.notebook_path;
      var nb = getNotebookFromBrowser();
      var repopathDisplay = formatRepoPathforDialog(path);
      offline.saveNotebook(path, nb,
        function (key) {
          console.log('offline-notebook saved: ', key);
          modalDialog(
            'Notebook saved to browser storage',
            repopathDisplay);
        },
        function (e) {
          var body = repopathDisplay.append(
            $('<div/>', {
              'text': e
            }));
          modalDialog(
            'Local storage IndexedDB error',
            body,
            'alert alert-danger');
          throw (e);
        }
      );
    }

    function localstoreLoadNotebook() {
      var path = Jupyter.notebook.notebook_path;
      var key = 'repoid:' + offline.repoid() + ' path:' + path;
      offline.loadNotebook(path,
        function (nb) {
          var repopathDisplay = formatRepoPathforDialog(path);
          if (nb) {
            console.log('offline-notebook found ' + key);
            modalDialog(
              'This will replace your current notebook with',
              repopathDisplay,
              null,
              {
                OK: {
                  class: 'btn-primary',
                  click: function () {
                    Jupyter.notebook.fromJSON(nb);
                    console.log('offline-notebook loaded ' + key);
                  }
                },
                Cancel: {}
              }
            );
          }
          else {
            console.log('offline-notebook not found ' + key);
            modalDialog(
              'Notebook not found in browser storage',
              repopathDisplay,
              'alert alert-danger');
          }
        },
        function (e) {
          var body = $('<div/>').append(
            $('<div/>', {
              'text': key
            })).append(
              $('<div/>', {
                'text': e
              }));
          modalDialog(
            'Local storage IndexedDB error',
            body,
            'alert alert-danger');
          throw (e);
        }
      );
    }

    function downloadNotebookFromBrowser() {
      var name = Jupyter.notebook.notebook_name;
      var nb = getNotebookFromBrowser();
      offline.downloadNotebookFromBrowser(name, nb);
    }

    // https://github.com/jupyterhub/binderhub/blob/b32ad4425be3319f7a2c59cf8253e979512b955d/examples/appendix/static/custom.js#L1-L7
    function copy_link_into_clipboard(b) {
      var $temp = $("<input>");
      $(b).parent().append($temp);
      $temp.val($(b).data('url')).select();
      document.execCommand("copy");
      $temp.remove();
    }

    function showBinderLink() {
      var binderUrl = offline.binderPersistentUrl() + '?filepath=' + encodeURIComponent(Jupyter.notebook.notebook_path);
      var body = $('<div/>', {
        'style': 'display: flex;',
      }).append(
        $('<pre/>', {
          'text': binderUrl,
          'style': 'flex-grow: 1; margin: 0;'
        }));
      var button = $('<button/>', {
        'title': 'Copy binder link to clipboard',
        'data-url': binderUrl
      }).click(function () {
        copy_link_into_clipboard(this);
      })
      button.append(
        $('<i/>', {
          'class': 'fa fa-clipboard'
        }));
      body.append(button);
      modalDialog(
        'Link to this Binder',
        body);
    }

    // Run on start
    function load_ipython_extension() {
      initialise();
    }

    return {
      load_ipython_extension: load_ipython_extension
    };
  });
