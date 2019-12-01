Jupyter Offline Notebook
========================

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/manics/jupyter-offlinenotebook/master?filepath=example.ipynb)

Save and load notebooks to browser storage, even if you've lost your connection to the server.


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

This extension can be configured in `jupyter_notebook_config.py` by setting the following properties of `c.OfflineNotebookConfig`:
- `repository_id`:
  A callable that returns the repository ID.
  This is used when storing and retrieving notebooks.
  Default is the value of the `BINDER_REPO_URL` environment variable.
- `repository_ref_url`:
  A callable that returns the repository reference URL.
  Default is the value of the `BINDER_REF_URL` environment variable.
- `binder_persistent_url`:
  A callable that returns the repository reference URL.
  Default is the values of the `BINDER_LAUNCH_HOST` and
  `BINDER_PERSISTENT_REQUEST` environment variables.



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

- Local-storage is limited by quotas imposed by the browser.
- A repository ID and path of the notebook within Jupyter Notebook are used, joined by a ` `.
  This may change in future.


Development notes
-----------------

This extension stores notebooks in browser storage using the [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), wrapped with [Dexie.js](https://dexie.org/).

One server API call is made during initialisation to obtain the storage configuration.
Everything else is done client-side so should work even if the server is disconnected.
