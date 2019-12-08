JupyterLab Offline Notebook extension
=====================================

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/manics/jupyter-offlinenotebook/lab?urlpath=%2Flab%2Ftree%2Fexample.ipynb)

Currently this only supports the `Download` button.


Installation
------------

    jupyter labextension install jupyter-offlinenotebook


Development
-----------

    jlpm
    jupyter labextension link


Publishing
----------

    jlpm login
    jlpm publish --access public
