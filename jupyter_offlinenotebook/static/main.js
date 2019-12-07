define([
  'base/js/namespace',
  'base/js/events',
  'base/js/utils',
  'base/js/dialog',
  './dexie',
  'jquery'
  ],
  function(Jupyter, events, utils, dialog, dexie, $) {
    var repoid = null;
    var repoLabel = null;
    var bindeRefUrl = null;
    var binderPersistentUrl = null
    var db = null;
    var dbname = 'jupyter-offlinenotebook';

    var initialise = function() {
      $.getJSON(utils.get_body_data('baseUrl') + 'offlinenotebook/config', function(data) {
        repoid = data['repoid'];
        if (repoid) {
          console.log('offline-notebook repoid: ' + repoid);
        }
        else {
          console.log('offline-notebook repoid not found, disabled');
        }
        repoLabel = data['binder_repo_label'] || 'Repo'
        console.log('offline-notebook repoLabel: ' + repoLabel);
        bindeRefUrl = data['binder_ref_url'];
        console.log('offline-notebook bindeRefUrl: ' + bindeRefUrl);
        binderPersistentUrl = data['binder_persistent_url']
        console.log('offline-notebook binderPersistentUrl: ' + binderPersistentUrl);
        addButtons();
      });
    }

    var getDb = function() {
      if (!db) {
        db = new dexie(dbname);
        // Only define indexed fields. pk: primary key
        db.version(1).stores({'offlinenotebook': 'pk,repoid,name,type'});
        console.log('offline-notebook: Opened IndexedDB');
      }
      return db;
    }

    var addButtons = function () {
      Jupyter.actions.register({
        'help': 'Download visible',
        'icon' : 'fa-download',
        'handler': downloadNotebookFromBrowser
      }, 'offline-notebook-download', 'offlinenotebook');
      Jupyter.actions.register({
        'help': 'Save to browser storage',
        'icon' : 'fa-cloud-download',
        'handler': localstoreSaveNotebook
      }, 'offline-notebook-save', 'offlinenotebook');
      Jupyter.actions.register({
        'help': 'Restore from browser storage',
        'icon' : 'fa-cloud-upload',
        'handler': localstoreLoadNotebook
      }, 'offline-notebook-load', 'offlinenotebook');

      var repoIcons = {
        'GitHub': 'fa-github',
        'GitLab': 'fa-gitlab',
        'Git': 'fa-git'
      }
      Jupyter.actions.register({
        'help': 'Visit Binder repository',
        'icon': repoIcons[repoLabel] || 'fa-external-link',
        'handler': openBinderRepo
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
      if (repoid) {
        buttons.push('offlinenotebook:offline-notebook-save');
        buttons.push('offlinenotebook:offline-notebook-load');
      }
      Jupyter.toolbar.add_buttons_group(buttons);

      var binderButtons = []
      if (bindeRefUrl) {
        binderButtons.push({
          'action': 'offlinenotebook:offline-notebook-binderrepo',
          'label': repoLabel
        });
      }
      if (binderPersistentUrl) {
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
          OK: {'class': 'btn-primary'}
        };
      }
      dialog.modal({
        title: title,
        body: body,
        buttons: buttons
      });
    }

    function formatRepoPathforDialog(repoid, path) {
      var displayRepoid = $('<div/>').append(
        $('<span/>', {
          'text': 'repoid: '
        }).append(
        $('<b/>', {
          'text': repoid
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
      var primaryKey = 'repoid:' + repoid + ' path:' + path;
      var nb = getNotebookFromBrowser();
      var repopathDisplay = formatRepoPathforDialog(repoid, path);
      getDb().offlinenotebook.put({
        'pk': primaryKey,
        'repoid': repoid,
        'name': Jupyter.notebook.notebook_name,
        'path': path,
        'format': 'json',
        'type': 'notebook',
        'content': nb
      }).then(function(key) {
        console.log('offline-notebook saved: ', key);
        modalDialog(
          'Notebook saved to browser storage',
          repopathDisplay);
      }).catch(function(e) {
        var body = repopathDisplay.append(
          $('<div/>', {
            'text': e
          }));
        modalDialog(
          'Local storage IndexedDB error',
          body,
          'alert alert-danger');
        throw(e);
      });
    }

    function localstoreLoadNotebook() {
      var path = Jupyter.notebook.notebook_path;
      var primaryKey = 'repoid:' + repoid + ' path:' + path;
      getDb().offlinenotebook.get(primaryKey).then(function(nb) {
        var repopathDisplay = formatRepoPathforDialog(repoid, path);
        if (nb) {
          console.log('offline-notebook found ' + primaryKey);
          modalDialog(
            'This will replace your current notebook with',
            repopathDisplay,
            null,
            {
              OK: {
                class: 'btn-primary',
                click: function () {
                  Jupyter.notebook.fromJSON(nb);
                  console.log('offline-notebook loaded ' + primaryKey);
                }
              },
              Cancel: {}
            }
          );
        }
        else {
          console.log('offline-notebook not found ' + primaryKey);
          modalDialog(
            'Notebook not found in browser storage',
            repopathDisplay,
            'alert alert-danger');
        }
      }).catch(function(e) {
        var body = $('<div/>').append(
          $('<div/>', {
            'text': primaryKey
          })).append(
          $('<div/>', {
            'text': e
          }));
        modalDialog(
          'Local storage IndexedDB error',
          body,
          'alert alert-danger');
        throw(e);
      });
    }

    // Download https://jsfiddle.net/koldev/cW7W5/
    function downloadNotebookFromBrowser() {
      var name = Jupyter.notebook.notebook_name;
      var nb = getNotebookFromBrowser();
      var blob = new Blob([JSON.stringify(nb)], {type: 'application/json'});
      var url = window.URL.createObjectURL(blob);
      var a = document.createElement('a');
      document.body.appendChild(a);
      a.href = url;
      a.style.display = 'none';
      a.download = name;
      console.log('offlinenotebook: ' + name, blob);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }

    function openBinderRepo() {
      var a = document.createElement('a');
      document.body.appendChild(a);
      a.href = bindeRefUrl;
      a.target = '_blank';
      a.style.display = 'none';
      a.click();
      document.body.removeChild(a);
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
      var binderUrl = binderPersistentUrl + '?filepath=' + Jupyter.notebook.notebook_path;
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
        }).click(function() {
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