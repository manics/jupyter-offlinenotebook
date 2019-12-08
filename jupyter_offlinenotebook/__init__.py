import json
from notebook.utils import url_path_join
from notebook.base.handlers import IPythonHandler
import os
from tornado import web
from traitlets import TraitType
from traitlets.config import Configurable


class Callable(TraitType):
    """
    A trait which is callable.
    Classes are callable, as are instances
    with a __call__() method.
    """

    info_text = 'a callable'

    def validate(self, obj, value):
        if callable(value):
            return value
        else:
            self.error(obj, value)


class OfflineNotebookHandler(IPythonHandler):

    @web.authenticated
    async def get(self):
        """
        Return the BinderHub repository information

        This should be called once at the start, since the extension is meant
        to work if the user subsequently goes offline
        """
        config = self.settings['offline_notebook_config']
        jcfg = json.dumps({
            'repoid': config.repository_id(),
            'binder_repo_label': config.repository_label(),
            'binder_ref_url': config.repository_ref_url(),
            'binder_persistent_url': config.binder_persistent_url(),
        })
        self.log.debug('OfflineNotebook config:%s ', jcfg)
        self.set_header('Content-Type', 'application/json')
        self.write(jcfg)


def _repo_label_from_binder_request():
    try:
        repotype = os.getenv('BINDER_PERSISTENT_REQUEST', '').split('/')[1]
    except IndexError:
        return ''
    if repotype == 'gh':
        return 'GitHub'
    if repotype == 'gl':
        return 'GitLab'
    return repotype.capitalize()


class OfflineNotebookConfig(Configurable):
    """
    Holds server-side configuration
    """

    repository_id = Callable(
        default_value=lambda: os.getenv('BINDER_REPO_URL', ''),
        help="""
        A callable that returns the repository ID.
        This is used when storing and retrieving notebooks.
        Default is the value of the `BINDER_REPO_URL` environment variable.
        """
    ).tag(config=True)

    repository_label = Callable(
        default_value=_repo_label_from_binder_request,
        help="""
        A callable that returns the repository label.
        Default is to parse the `BINDER_PERSISTENT_REQUEST` environment
        variable.
        """
    ).tag(config=True)

    repository_ref_url = Callable(
        default_value=lambda: os.getenv('BINDER_REF_URL', ''),
        help="""
        A callable that returns the persistent Binder URL.
        Default is the value of the `BINDER_REF_URL` environment variable.
        """
    ).tag(config=True)

    binder_persistent_url = Callable(
        default_value=lambda: (os.getenv('BINDER_LAUNCH_HOST', '') +
                               os.getenv('BINDER_PERSISTENT_REQUEST', '')),
        help="""
        A callable that returns the repository reference URL.
        Default is the values of the `BINDER_LAUNCH_HOST` and
        `BINDER_PERSISTENT_REQUEST` environment variables.
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
        nbapp.web_app.settings['base_url'], '/offlinenotebook/config')
    nbapp.web_app.add_handlers('.*', [(route_pattern, OfflineNotebookHandler)])
