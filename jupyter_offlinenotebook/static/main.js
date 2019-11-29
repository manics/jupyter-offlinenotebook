define([
  'base/js/namespace',
  'base/js/events',
  'base/js/utils',
  'jquery'
  ],
  function(Jupyter, events, utils, $) {
    var repoid = null;

    var initialise = function() {
      $.getJSON(utils.get_body_data('baseUrl') + 'offlinenotebookconfig', function(data) {
        repoid = data['repoid'];
        if (repoid) {
          console.log("local-storage repoid: " + repoid);
          addButtons(true);
        }
        else {
          console.log('local-storage repoid not found, disabled')
          addButtons(false);
        }
      });
    }

    var addButtons = function(storageEnabled) {
      var buttons = [Jupyter.keyboard_manager.actions.register({
        'help': 'Download (size limited)',
        'icon' : 'fa-medkit',
        'handler': downloadNotebookFromBrowser
      }, 'offline-notebook-download', 'Download from browser')];
      if (storageEnabled) {
        buttons.push(
          Jupyter.keyboard_manager.actions.register({
            'help': 'Save to local-storage',
            'icon' : 'fa-download',
            'handler': localstoreSaveNotebook
          }, 'offline-notebook-save', 'Save to local-storage')
        );
        buttons.push(
          Jupyter.keyboard_manager.actions.register ({
            'help': 'Load from local-storage',
            'icon' : 'fa-upload',
            'handler': localstoreLoadNotebook
          }, 'offline-notebook-load', 'Load from local-storage')
        );
      }
      Jupyter.toolbar.add_buttons_group(buttons);
    }

    function getNotebookFromBrowser() {
      return Jupyter.notebook.toJSON();
    }

    function localstoreSaveNotebook() {
      var path = repoid + ' ' + Jupyter.notebook.notebook_path;
      var nb = getNotebookFromBrowser();
      localStorage.setItem(path, JSON.stringify(nb));
      console.log("local-storage saved: " + path)
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
          console.log("local-storage loaded " + path)
      }
      else {
          console.log("local-storage not found: " + path)
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

    // Run on start
    function load_ipython_extension() {
      initialise();
    }

    return {
      load_ipython_extension: load_ipython_extension
    };
});