import {
  IDisposable,
  DisposableDelegate
} from '@lumino/disposable';

import {
  Widget
} from '@lumino/widgets';

import {
  PageConfig
} from '@jupyterlab/coreutils';

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  showDialog,
  showErrorMessage,
  Dialog,
  ToolbarButton
} from '@jupyterlab/apputils';

import {
  DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  NotebookPanel,
  INotebookModel
} from '@jupyterlab/notebook';

import * as offline from "./offlinenotebook";

import $ from "jquery";
import { PartialJSONValue } from '@lumino/coreutils';


/**
 * The CSS class for a Toolbar icon.
 */
const CSS_ICON_CLASS = 'jp-OfflineNotebookToolbarIcon';

/**
 * The plugin registration information.
 */
const extension: JupyterFrontEndPlugin<void> = {
  activate,
  id: 'offlinenotebook:offlineNotebookButtons',
  autoStart: true
};


/**
 * A notebook widget extension that adds a button to the toolbar.
 */
export
  class OfflineNotebookButtons implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel> {
  /**
   * Create a new extension object.
   */
  createNew(panel: NotebookPanel, context: DocumentRegistry.IContext<INotebookModel>): IDisposable {
    // https://stackoverflow.com/a/40679225
    // For debugging in browser console assign panel to a global var
    // eval("window.jlpanel = panel;");

    // https://jupyterlab.github.io/jupyterlab/apputils/classes/toolbarbutton.html
    // https://jupyterlab.github.io/jupyterlab/apputils/interfaces/toolbarbuttoncomponent.iprops.html

    let buttons: Array<[string, ToolbarButton]> = [];
    buttons.push(['downloadVisible', new ToolbarButton({
      className: 'downloadVisible',
      iconClass: 'fas fa-download ' + CSS_ICON_CLASS,
      onClick: () => {
        downloadNotebookFromBrowser(panel);
      },
      tooltip: 'Download visible',
      label: 'Download'
    })]);

    if (offline.repoid()) {
      buttons.push(['saveToBrowser', new ToolbarButton({
        className: 'saveToBrowser',
        iconClass: 'fas fa-cloud-download-alt ' + CSS_ICON_CLASS,
        onClick: () => {
          localstoreSaveNotebook(panel);
        },
        tooltip: 'Save to browser storage'
      })]);
      buttons.push(['loadFromBrowser', new ToolbarButton({
        className: 'loadFromBrowser',
        iconClass: 'fas fa-cloud-upload-alt ' + CSS_ICON_CLASS,
        onClick: () => {
          localstoreLoadNotebook(panel);
        },
        tooltip: 'Restore from browser storage'
      })]);
    }

    interface StringStringMap {
      [index: string]: string;
    }
    if (offline.binderRefUrl()) {
      let repoIcons: StringStringMap = {
        'GitHub': 'fab fa-github',
        'GitLab': 'fab fa-gitlab',
        'Git': 'fab fa-git'
      }

      buttons.push(['openRepo', new ToolbarButton({
        className: 'openRepo',
        iconClass: (repoIcons[offline.repoLabel()] || 'fas fa-external-link-alt') + ' ' + CSS_ICON_CLASS,
        onClick: offline.openBinderRepo,
        tooltip: 'Visit Binder repository',
        label: offline.repoLabel()
      })]);
    }
    if (offline.binderPersistentUrl()) {
      buttons.push(['linkToBinder', new ToolbarButton({
        className: 'linkToBinder',
        iconClass: 'fas fa-link ' + CSS_ICON_CLASS,
        onClick: () => {
          showBinderLink(panel);
        },
        tooltip: 'Link to this Binder',
        label: 'Binder'
      })]);
    }

    buttons.reverse();
    buttons.forEach(item => {
      panel.toolbar.insertItem(9, item[0], item[1]);
    })
    return new DisposableDelegate(() => {
      buttons.forEach(item => {
        item[1].dispose();
      })
    });
  }
}

function formatRepoPathforDialog(path: string): string {
  return 'repoid: ' + offline.repoid() + ' path: ' + path;
}

// function getNotebookFromBrowser(): null {
//   return Jupyter.notebook.toJSON();
// }

function localstoreSaveNotebook(panel: NotebookPanel) {
  var path = panel.context.path;
  var nb = panel.content.model?.toJSON();
  if (!nb) {
    var e = 'Content model is null';
    showErrorMessage('Local storage error', e);
    throw (e);
  }
  var repopathDisplay = formatRepoPathforDialog(path);
  offline.saveNotebook(path, nb,
    function (key: string) {
      console.log('offline-notebook saved: ', key);
      return showDialog({
        title: 'Notebook saved to browser storage',
        body: repopathDisplay,
        buttons: [Dialog.okButton()]
      });
    },
    (e: any) => {
      showErrorMessage('Local storage IndexedDB error', e);
      throw (e);
    }
  );
}

// Workround error in nb['contents']
// Element implicitly has an 'any' type because expression of type '"contents"' can't be used to index type 'string | number | true | JSONObject | JSONArray'.
// Property 'contents' does not exist on type 'string | number | true | JSONObject | JSONArray'.ts(7053)
// https://dev.to/kingdaro/indexing-objects-in-typescript-1cgi
function hasKey<O>(obj: O, key: keyof any): key is keyof O {
  return key in obj;
}

function localstoreLoadNotebook(panel: NotebookPanel) {
  var path = panel.context.path;
  var repopathDisplay = formatRepoPathforDialog(path);
  var key = 'repoid:' + offline.repoid() + ' path:' + path;
  offline.loadNotebook(path,
    (nb: PartialJSONValue) => {
      if (nb) {
        console.log('offline-notebook found ' + key);
        return showDialog({
          title: 'This will replace your current notebook with',
          body: repopathDisplay,
          buttons: [Dialog.cancelButton(), Dialog.warnButton({ label: 'OK' })]
        }).then(result => {
          const contentsKey = 'content';
          if (result.button.accept && !panel.context.isDisposed) {
            if (hasKey(nb, contentsKey)) {
              panel.context.model.fromJSON(nb[contentsKey]);
            }
            else {
              showErrorMessage('Invalid notebook', '"content" not found');
            }
          }
        })
      }
      else {
        console.log('offline-notebook not found ' + key);
        showErrorMessage(
          'Notebook not found in browser storage', key);
      }
    },
    (e: any) => {
      showErrorMessage('Local storage IndexedDB error', e);
      throw (e);
    }
  );
}

function downloadNotebookFromBrowser(panel: NotebookPanel) {
  var name = panel.context.path.replace(/.*\//, '');
  var nb = panel.content.model?.toJSON();
  if (!nb) {
    var e = 'Content model is null';
    showErrorMessage('Local storage error', e);
    throw (e);
  }
  offline.downloadNotebookFromBrowser(name, nb);
}

class CopyShareURLWidget extends Widget {
  constructor(
    binderUrl: string
  ) {
    super({ node: createCopyShareURLNode(binderUrl) });
  }
}

// https://github.com/jupyterhub/binderhub/blob/b32ad4425be3319f7a2c59cf8253e979512b955d/examples/appendix/static/custom.js#L1-L7
function copy_link_into_clipboard(b: JQuery<HTMLElement>) {
  var $temp = $("<input>");
  $(b).parent().append($temp);
  $temp.val($(b).data('url')).select();
  document.execCommand("copy");
  $temp.remove();
}

function createCopyShareURLNode(binderUrl: string): HTMLElement {
  var body = $('<div/>', {
    'style': 'flex-direction: row;',
    'data-url': binderUrl
  }).append(
    $('<pre/>', {
      'text': binderUrl,
      'style': 'margin: 0; white-space: pre-wrap; word-break: break-all;'
    }));
  var button = $('<button/>', {
    'title': 'Copy binder link to clipboard',
    'data-url': binderUrl
  }).click(function () {
    copy_link_into_clipboard(button);
  })
  button.append(
    $('<i/>', {
      'class': 'fas fa-clipboard'
    }));
  body.append(button);
  // Unwrap JQuery object
  return body.get(0);
}

// TODO: Format link and copy it
function showBinderLink(panel: NotebookPanel) {
  var path = panel.context.path;
  var binderUrl = offline.binderPersistentUrl() + '?urlpath=' + encodeURIComponent('lab/tree/' + path);
  // Note adding a copy button here doesn't work, perhaps because the event goes
  // through too many steps (firefox only allows "copy" on certain actions)
  return showDialog({
    title: 'Share Binder link',
    body: new CopyShareURLWidget(binderUrl),
    buttons: [Dialog.okButton()]
  });
}



/**
 * Activate the extension.
 */
function activate(app: JupyterFrontEnd) {
  console.log('Activating jupyter-offlinenotebook JupyterLab extension');
  const baseUrl = PageConfig.getBaseUrl();
  $.getJSON(baseUrl + 'offlinenotebook/config', function (data) {
    offline.initialise(data);
    // addButtons();
  });
  app.docRegistry.addWidgetExtension('Notebook', new OfflineNotebookButtons());
};


/**
 * Export the extension as default.
 */
export default extension;
