from setuptools import setup

setup(
    name='jupyter-offlinenotebook',
    version='0.0.2',
    author='Simon Li',
    author_email='spli@dundee.ac.uk',
    packages=[
        'jupyter_offlinenotebook',
    ],
    url='https://github.com/manics/jupyter-offlinenotebook',
    license='MIT',
    package_data={
        'jupyter_offlinenotebook': ['jupyter_offlinenotebook/static/main.js'],
    },
    description='Save and load notebooks to local-storage',
    long_description=open('README.md').read(),
    long_description_content_type='text/markdown',
    install_requires=[
        'notebook',
    ],
    data_files=[(
            'share/jupyter/nbextensions/jupyter-offlinenotebook', [
                'jupyter_offlinenotebook/static/main.js'
            ]),
        ('etc/jupyter/nbconfig/notebook.d', ['jupyter_offlinenotebook.json'])
    ],
    zip_safe=False,
    include_package_data=True,
)
