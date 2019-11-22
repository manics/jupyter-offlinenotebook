Jupyter Offline Notebook
========================

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/manics/jupyter-notebookparams/master?urlpath=notebooks%2Fexample.ipynb%3Fa%3D1%26b%3D%22whatever%22%26autorun%3Dtrue)

Save and load notebooks to local-storage, even if you've lost your connection to the server.


Installation
------------

    pip install jupyter-offlinenotebook

This should automatically enable the extension. If it is not listed in `jupyter nbextension list` install and enable it:

    jupyter nbextension install --py jupyter_offlinenotebook --sys-prefix
    jupyter nbextension enable --py jupyter_offlinenotebook --sys-prefix


Usage
-----

![Offline notebook buttons](./offline-notebook-buttons.png)

There are three new icons to:
- download the in-memory (browser) state of the notebook
- save the in-memory state of the notebook to local-storage
- load a notebook from local-storage

Saving and loading uses the path of the current notebook

See [example.ipynb](./example.ipynb)


**WARNING**
-----------

This extension is still in development. It is only tested on Firefox.

- There are no error messages, you must open the Javascript console to check whether save/load has worked.
- The size of downloaded notebooks is limited by the browser.
- Only the path of the notebook within Jupyter Notebook is used.
  If you have multiple notebook environments on the same domain the notebooks may have the same path.
