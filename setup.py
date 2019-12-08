from setuptools import setup
from glob import glob

setup(
    name='jupyter-offlinenotebook',
    version='0.0.9',
    author='Simon Li',
    author_email='spli@dundee.ac.uk',
    packages=[
        'jupyter_offlinenotebook',
    ],
    url='https://github.com/manics/jupyter-offlinenotebook',
    license='MIT',
    description='Save and load notebooks to local-storage',
    long_description=open('README.md').read(),
    long_description_content_type='text/markdown',
    install_requires=[
        'notebook',
    ],
    data_files=[
        ('share/jupyter/nbextensions/jupyter-offlinenotebook',
            glob('jupyter_offlinenotebook/static/*.js') +
            glob('jupyter_offlinenotebook/static/*.js.map')),
        ('etc/jupyter/jupyter_notebook_config.d', [
            'jupyter_offlinenotebook/etc/offlinenotebook_serverextension.json'
            ]),
        ('etc/jupyter/nbconfig/notebook.d', [
            'jupyter_offlinenotebook/etc/offlinenotebook_nbextension.json']),
    ],
    zip_safe=False,
    include_package_data=True,
)
