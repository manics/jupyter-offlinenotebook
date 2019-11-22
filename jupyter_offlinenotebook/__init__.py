# Jupyter Extension points
def _jupyter_nbextension_paths():
    return [dict(
        section="notebook",
        src="./static",
        dest="jupyter-offlinenotebook",
        require="jupyter-offlinenotebook/main")]
