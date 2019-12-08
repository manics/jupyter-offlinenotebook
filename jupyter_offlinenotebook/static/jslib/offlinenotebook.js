define([
  './dexie'
],
  function offline(dexie) {

    var repoid = null;
    var repoLabel = null;
    var binderRefUrl = null;
    var binderPersistentUrl = null
    var db = null;
    var dbname = 'jupyter-offlinenotebook';

    function initialise(data) {
      repoid = data['repoid'];
      if (repoid) {
        console.log('offline-notebook repoid: ' + repoid);
      }
      else {
        console.log('offline-notebook repoid not found, disabled');
      }
      repoLabel = data['binder_repo_label'] || 'Repo'
      console.log('offline-notebook repoLabel: ' + repoLabel);
      binderRefUrl = data['binder_ref_url'];
      console.log('offline-notebook binderRefUrl: ' + binderRefUrl);
      binderPersistentUrl = data['binder_persistent_url']
      console.log('offline-notebook binderPersistentUrl: ' + binderPersistentUrl);
    }

    function getDb() {
      if (!db) {
        db = new dexie(dbname);
        // Only define indexed fields. pk: primary key
        db.version(1).stores({ 'offlinenotebook': 'pk,repoid,name,type' });
        console.log('offline-notebook: Opened IndexedDB');
      }
      return db;
    }

    function saveNotebook(path, nb, success, error) {
      var primaryKey = 'repoid:' + repoid + ' path:' + path;
      getDb().offlinenotebook.put({
        'pk': primaryKey,
        'repoid': repoid,
        'name': path.replace(/.*\//, ''),
        'path': path,
        'format': 'json',
        'type': 'notebook',
        'content': nb
      }).then(
        success
      ).catch(
        error
      );
    }

    function loadNotebook(path, success, error) {
      var primaryKey = 'repoid:' + repoid + ' path:' + path;
      getDb().offlinenotebook.get(primaryKey).then(
        success
      ).catch(
        error
      );
    }

    // Download https://jsfiddle.net/koldev/cW7W5/
    function downloadNotebookFromBrowser(name, nb) {
      var blob = new Blob([JSON.stringify(nb)], { type: 'application/json' });
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
      a.href = binderRefUrl;
      a.target = '_blank';
      a.style.display = 'none';
      a.click();
      document.body.removeChild(a);
    }

    function getRepoid() {
      return repoid;
    }

    function getRepoLabel() {
      return repoLabel;
    }

    function getBinderRefUrl() {
      return binderRefUrl;
    }

    function getBinderPersistentUrl() {
      return binderPersistentUrl;
    }

    return {
      'initialise': initialise,
      'saveNotebook': saveNotebook,
      'loadNotebook': loadNotebook,
      'downloadNotebookFromBrowser': downloadNotebookFromBrowser,
      'openBinderRepo': openBinderRepo,

      'repoid': getRepoid,
      'repoLabel': getRepoLabel,
      'binderRefUrl': getBinderRefUrl,
      'binderPersistentUrl': getBinderPersistentUrl
    };
  }
)
