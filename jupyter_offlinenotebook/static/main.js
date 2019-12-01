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
    var bindeRefUrl = null;
    var binderPersistentUrl = null
    var db = null;

    var initialise = function() {
      $.getJSON(utils.get_body_data('baseUrl') + 'offlinenotebook/config', function(data) {
        repoid = data['repoid'];
        if (repoid) {
          console.log('local-storage repoid: ' + repoid);
          db = setupDb('jupyter-offlinenotebook');
        }
        else {
          console.log('local-storage repoid not found, disabled');
        }
        bindeRefUrl = data['binder_ref_url'];
        console.log('local-storage bindeRefUrl: ' + bindeRefUrl);
        binderPersistentUrl = data['binder_persistent_url']
        console.log('local-storage binderPersistentUrl: ' + binderPersistentUrl);
        addButtons();
      });
    }

    var setupDb = function(dbname) {
      var db = new dexie(dbname);
      // Only define indexed fields. pk: primary key
      db.version(1).stores({'offlinenotebook': 'pk,repoid,name,type'})
      return db;
    }

    var addButtons = function() {
      var downloadAction = Jupyter.actions.register({
        'help': 'Download visible',
        'icon' : 'fa-medkit',
        'handler': downloadNotebookFromBrowser
      }, 'offline-notebook-download', 'offlinenotebook');
      var saveAction = Jupyter.actions.register({
        'help': 'Save to local-storage',
        'icon' : 'fa-download',
        'handler': localstoreSaveNotebook
      }, 'offline-notebook-save', 'offlinenotebook');
      var loadAction = Jupyter.actions.register({
        'help': 'Load from local-storage',
        'icon' : 'fa-upload',
        'handler': localstoreLoadNotebook
      }, 'offline-notebook-load', 'offlinenotebook');

      var showRepoAction = Jupyter.actions.register({
        'help': 'Visit Binder repository',
        'icon' : 'fa-external-link',
        'handler': openBinderRepo
      }, 'offline-notebook-binderrepo', 'offlinenotebook');
      var showBinderAction = Jupyter.actions.register({
        'help': 'Link to this Binder',
        'icon' : 'fa-external-link',
        'handler': showBinderLink
      }, 'offline-notebook-binderlink', 'offlinenotebook');

      var buttons = [
        downloadAction
      ];
      if (repoid) {
        buttons.push(saveAction);
        buttons.push(loadAction);
      }
      Jupyter.toolbar.add_buttons_group(buttons);

      var binderButtons = []
      if (bindeRefUrl) {
        binderButtons.push({
          'action': showRepoAction,
          'label': 'Repo'
        });
      }
      if (binderPersistentUrl) {
        binderButtons.push({
          'action': showBinderAction,
          'label': 'Binder'
        })
      }
      if (binderButtons) {
        Jupyter.toolbar.add_buttons_group(binderButtons);
      }
    }

    function modalDialog(title, text, displayclass, body) {
      if (!body) {
        body = $('<div/>');
      }
      if (text) {
        body.text(text);
      }
      if (displayclass) {
        body.addClass(displayclass);
      }
      dialog.modal({
        title: title,
        body: body,
        buttons: {
          OK: {'class': 'btn-primary'}
        }
      });
    }

    function getNotebookFromBrowser() {
      return Jupyter.notebook.toJSON();
    }

    function localstoreSaveNotebook() {
      var path = Jupyter.notebook.notebook_path;
      var primaryKey = 'repoid:' + repoid + ' path:' + path;
      var nb = getNotebookFromBrowser();
      db.offlinenotebook.put({
        'pk': primaryKey,
        'repoid': repoid,
        'name': Jupyter.notebook.notebook_name,
        'path': path,
        'format': 'json',
        'type': 'notebook',
        'content': nb
      }).then(function(key) {
        console.log('local-storage saved: ', key);
        modalDialog('Notebook saved to local-storage', key);
      }).catch(function(e) {
        var body = $('<div/>').append(
          $('<div/>', {
            'text': primaryKey
          })).append(
          $('<div/>', {
            'text': e
          }));
        modalDialog('Local storage IndexedDB error', null, 'alert alert-danger', body);
        throw(e);
      });
    }

    function localstoreLoadNotebook() {
      var path = Jupyter.notebook.notebook_path;
      var primaryKey = 'repoid:' + repoid + ' path:' + path;
      db.offlinenotebook.get(primaryKey).then(function(nb) {
        if (nb) {
          Jupyter.notebook.fromJSON(nb);
          console.log('local-storage loaded ' + primaryKey);
          modalDialog('Loaded notebook from local-storage', primaryKey);
        }
        else {
          console.log('local-storage not found ' + primaryKey);
          modalDialog('Notebook not found in local-storage', primaryKey, 'alert alert-danger');
        }
      }).catch(function(e) {
        var body = $('<div/>').append(
          $('<div/>', {
            'text': primaryKey
          })).append(
          $('<div/>', {
            'text': e
          }));
        modalDialog('Local storage IndexedDB error', null, 'alert alert-danger', body);
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
      modalDialog('Link to this Binder', null, null, body);
    }

    // Run on start
    function load_ipython_extension() {
      initialise();
    }

    return {
      load_ipython_extension: load_ipython_extension
    };
});