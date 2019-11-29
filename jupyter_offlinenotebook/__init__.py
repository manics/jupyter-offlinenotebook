import json
from notebook.utils import url_path_join
from notebook.base.handlers import IPythonHandler
import os
from tornado import web
from traitlets import Unicode
from traitlets.config import Configurable


class OfflineNotebookHandler(IPythonHandler):

    @web.authenticated
    async def get(self):
        """
        Return the BinderHub repository information

        This should be called once at the start, since the extension is meant
        to work if the user subsequently goes offline
        """
        config = self.settings['offline_notebook_config']
        repoid = os.getenv(config.repoid_variable)
        self.log.debug('OfflineNotebook repoid: %s=%s',
                       config.repoid_variable, repoid)

        binder_ref_url = os.getenv('BINDER_REF_URL')

        binder_launch = os.environ.get('BINDER_LAUNCH_HOST')
        binder_persistent_request = os.environ.get('BINDER_PERSISTENT_REQUEST')
        if binder_launch and binder_persistent_request:
            binder_persistent_url = binder_launch + binder_persistent_request
        else:
            binder_persistent_url = None

        self.set_header('Content-Type', 'application/json')
        self.write(json.dumps({
            'repoid': repoid,
            'binder_ref_url': binder_ref_url,
            'binder_persistent_url': binder_persistent_url,
        }))


class OfflineNotebookConfig(Configurable):
    """
    Holds server-side configuration
    """
    repoid_variable = Unicode(
        default_value='BINDER_REPO_URL',
        help="""
        Name of the environment variable containing the repository identifier.
        This is used when storing and retrieving notebooks.
        E.g. BINDER_REPO_URL BINDER_REF_URL
        """
    ).tag(config=True)


def _jupyter_server_extension_paths():
    """
    Jupyter server extension
    """
    return [{'module': 'jupyter_offlinenotebook'}]


def _jupyter_nbextension_paths():
    """
    Jupyter notebook extension
    """
    return [dict(
        section="notebook",
        src="./static",
        dest="jupyter-offlinenotebook",
        require="jupyter-offlinenotebook/main")]


def load_jupyter_server_extension(nbapp):
    """
    Called during notebook start
    """
    nbapp.web_app.settings['offline_notebook_config'] = OfflineNotebookConfig(
        parent=nbapp)
    route_pattern = url_path_join(
        nbapp.web_app.settings['base_url'], '/offlinenotebookconfig')
    nbapp.web_app.add_handlers('.*', [(route_pattern, OfflineNotebookHandler)])
