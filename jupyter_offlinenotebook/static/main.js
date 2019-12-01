define([
  'base/js/namespace',
  'base/js/events',
  'base/js/utils',
  'base/js/dialog',
  'jquery'
  ],
  function(Jupyter, events, utils, dialog, $) {
    var repoid = null;
    var bindeRefUrl = null;
    var binderPersistentUrl = null

    var initialise = function() {
      $.getJSON(utils.get_body_data('baseUrl') + 'offlinenotebookconfig', function(data) {
        repoid = data['repoid'];
        if (repoid) {
          console.log('local-storage repoid: ' + repoid);
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

    var addButtons = function() {
      var downloadAction = Jupyter.actions.register({
        'help': 'Download (size limited)',
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
          'label': 'Link to Binder'
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
      var path = repoid + ' ' + Jupyter.notebook.notebook_path;
      var nb = getNotebookFromBrowser();
      localStorage.setItem(path, JSON.stringify(nb));
      console.log("local-storage saved: " + path);
      modalDialog('Notebook saved to local-storage', path);
    }

    function localstoreLoadNotebook() {
      var name = Jupyter.notebook.notebook_name;
      var path = repoid + ' ' + Jupyter.notebook.notebook_path;
      var nb = localStorage.getItem(path);
      if (nb) {
        var wrappednb = {
          "content": JSON.parse(nb),
          "name": name,
          "path": Jupyter.notebook.notebook_path,
          "format": "json",
          "type": "notebook"
        };
        Jupyter.notebook.fromJSON(wrappednb);
        console.log("local-storage loaded " + path);
        modalDialog('Loaded notebook from local-storage', path);
      }
      else {
        console.log("local-storage not found: " + path);
        modalDialog('Notebook not found in local-storage', path, 'alert alert-danger');
      }
    }

    // Download (size limited) https://stackoverflow.com/a/18197341
    function downloadNotebookFromBrowser() {
      var name = Jupyter.notebook.notebook_name;
      var nb = getNotebookFromBrowser();
      var element = document.createElement("a");
      element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(JSON.stringify(nb)));
      element.setAttribute("download", name);
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();  
      document.body.removeChild(element);
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

    function showBinderLink() {
      var body = $('<div/>').append(
        $('<a>',{
          'href': binderPersistentUrl,
          'target': '_blank',
          'text': binderPersistentUrl,
          'title': 'Link to this Binder'
        }));
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