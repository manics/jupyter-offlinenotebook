#!/bin/sh
export BINDER_LAUNCH_HOST=http://localhost
export BINDER_REPO_URL=https://github.com/manics/jupyter-offlinenotebook
export BINDER_PERSISTENT_REQUEST=v2/gh/repo
export BINDER_REF_URL=https://github.com/manics/jupyter-offlinenotebook/tree/master

exec jupyter-lab --debug --no-browser --LabApp.token= --port=18888