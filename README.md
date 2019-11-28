Jupyter Offline Notebook
========================

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/manics/jupyter-offlinenotebook/master?filepath=example.ipynb)

Save and load notebooks to local-storage, even if you've lost your connection to the server.


Installation
------------

    pip install jupyter-offlinenotebook

This should automatically enable the extension. If it is not listed in `jupyter nbextension list` or `jupyter serverextension list` install and enable it:

    jupyter nbextension install --py jupyter_offlinenotebook --sys-prefix
    jupyter nbextension enable --py jupyter_offlinenotebook --sys-prefix

    jupyter serverextension install --py jupyter_offlinenotebook --sys-prefix
    jupyter serverextension enable --py jupyter_offlinenotebook --sys-prefix


Configuration
-------------

By default this extension will obtain a repository identifier from an environment variable `BINDER_REPO_URL`.
You can change the name of the environment variable by setting `c.OfflineNotebookConfig.repoid_variable` in `jupyter_notebook_config.py`.


Usage
-----

![Offline notebook buttons](./offline-notebook-buttons.png)

There are three new icons to:
- download the in-memory (browser) state of the notebook
- save the in-memory state of the notebook to local-storage
- load a notebook from local-storage

Saving and loading uses the repository ID and the path of the current notebook.
If you don't see the buttons check the Javascritp console log, it may mean no repository ID was found.

See [example.ipynb](./example.ipynb)


**WARNING**
-----------

This extension is still in development.
It is only tested on Firefox.
Breaking changes may occur in future.

There are [several major limitations](https://github.com/manics/jupyter-offlinenotebook/issues) including:

- There are no error messages, you must open the Javascript console to check whether save/load has worked.
- The size of downloaded notebooks is limited by the browser.
- A repository ID and path of the notebook within Jupyter Notebook are used, joined by a ` `.
  This may change in future.
