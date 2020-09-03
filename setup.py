"""
jupyter_offlinenotebook setup
"""
import json
import os

from jupyter_packaging import (
    create_cmdclass,
    install_npm,
    ensure_targets,
    combine_commands,
)
import setuptools

HERE = os.path.abspath(os.path.dirname(__file__))

# The name of the project
name = "jupyter_offlinenotebook"
jsname = "jupyter-offlinenotebook"


def get_version():
    with open("package.json") as f:
        return json.load(f)["version"]


# Representative files that should exist after a successful build
jstargets = [
    os.path.join(HERE, "lib", "index.js"),
    os.path.join(HERE, name, "static", "jslib", "offlinenotebook.js"),
]

# package_data_spec = {
#     name: [
#         "*"
#     ]
# }

data_files_spec = [
    (f"share/jupyter/nbextensions/{jsname}", f"{name}/static", "*.*"),
    (f"share/jupyter/nbextensions/{jsname}/jslib", f"{name}/static/jslib", "*.*"),
    # (f'share/jupyter/labextensions/{jsname}',
    #   f'{name}/static', '*.*'),
    # ("etc/jupyter/jupyter_server_config.d",
    (
        "etc/jupyter/jupyter_notebook_config.d",
        f"{name}/etc",
        "offlinenotebook_serverextension.json",
    ),
    (
        "etc/jupyter/nbconfig/notebook.d",
        f"{name}/etc",
        "offlinenotebook_nbextension.json",
    ),
]

cmdclass = create_cmdclass(
    "jsdeps",
    # package_data_spec=package_data_spec,
    data_files_spec=data_files_spec,
)

cmdclass["jsdeps"] = combine_commands(
    install_npm(HERE, build_cmd="build:all", npm=["jlpm"]),
    ensure_targets(jstargets),
)

setup_args = dict(
    name=name,
    version=get_version(),
    author="Simon Li",
    packages=[
        "jupyter_offlinenotebook",
    ],
    url="https://github.com/manics/jupyter-offlinenotebook",
    license="BSD-3-Clause",
    description="Save and load notebooks to local-storage",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    cmdclass=cmdclass,
    install_requires=[
        "notebook",
    ],
    python_requires=">=3.6",
    zip_safe=False,
    include_package_data=True,
    platforms="Linux, Mac OS X, Windows",
    keywords=["Jupyter", "JupyterLab"],
    classifiers=[
        "License :: OSI Approved :: BSD License",
        "Programming Language :: Python",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Framework :: Jupyter",
    ],
)


if __name__ == "__main__":
    setuptools.setup(**setup_args)
