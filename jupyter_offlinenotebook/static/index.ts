import {
  IDisposable,
  DisposableDelegate
} from '@phosphor/disposable';

import {
  PageConfig
} from '@jupyterlab/coreutils';

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
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
    let callback = () => {
      // https://stackoverflow.com/a/40679225
      // For debugging in brwoser console assign panel to a global var
      // eval("window.jlpanel = panel;");

      var name = panel.context.path.replace(/.*\//, '');
      var nb = panel.content.model.toJSON()
      offline.downloadNotebookFromBrowser(name, nb);
    };
    // https://jupyterlab.github.io/jupyterlab/apputils/classes/toolbarbutton.html
    // https://jupyterlab.github.io/jupyterlab/apputils/interfaces/toolbarbuttoncomponent.iprops.html
    let button = new ToolbarButton({
      className: 'downloadVisible',
      iconClassName: 'fa fa-download',
      onClick: callback,
      tooltip: 'Download visible',
      label: 'Download'
    });

    panel.toolbar.insertItem(9, 'downloadVisible', button);
    return new DisposableDelegate(() => {
      button.dispose();
    });
  }
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
