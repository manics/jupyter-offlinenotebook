import json
import os
from shutil import copyfile
import subprocess
from time import sleep
from urllib.request import urlopen

from selenium import webdriver
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By

from selenium.webdriver.firefox.firefox_profile import FirefoxProfile
from selenium.webdriver.firefox.options import Options


PORT = 18888
CONFIG_URL = 'http://localhost:{}/offlinenotebook/config'.format(PORT)
JUPYTERLAB_URL = 'http://localhost:{}/lab/tree/example.ipynb'.format(PORT)
JUPYTERNOTEBOOK_URL = 'http://localhost:{}/tree/example.ipynb'.format(PORT)
EXPECTED_SIZE = 1700
EXPECTED_EMPTY_SIZE = 450
EXPECTED_NUM_CELLS = 5
HEADLESS = True


# Size of downloaded notebook varies depending on jupyter versions as
# it's exported from the browser JSON model, not the original ipynb
# Allow ± 100

def assert_expected_size(size):
    assert abs(EXPECTED_SIZE - size) < 100


def assert_empty_size(size):
    assert abs(EXPECTED_EMPTY_SIZE - size) < 100


class FirefoxTestBase:

    def setup(self):
        self.jupyter_proc = None
        self.driver = None
        self.wait = None

    def teardown(self):
        try:
            if self.driver:
                self.driver.quit()
        finally:
            if self.jupyter_proc:
                self.jupyter_proc.kill()

    def start_jupyter(self, jupyterdir, app):
        command = [
            'jupyter-{}'.format(app.lower()),
            '--no-browser',
            '--{}App.token='.format(app),
            '--port={}'.format(PORT),
        ]
        env = {
            'BINDER_LAUNCH_HOST': 'http://localhost/',
            'BINDER_REPO_URL':
                'https://github.com/manics/jupyter-offlinenotebook',
            'BINDER_PERSISTENT_REQUEST': 'v2/gh/repo',
            'BINDER_REF_URL': ('https://github.com/manics/'
                               'jupyter-offlinenotebook/tree/master'),
            'PATH': os.getenv('PATH'),
        }
        self.jupyter_proc = subprocess.Popen(command, cwd=jupyterdir, env=env)

    def initialise_firefox(self, downloaddir, url):
        profile = FirefoxProfile()
        profile.set_preference('browser.download.folderList', 2)
        profile.set_preference(
            'browser.download.manager.showWhenStarting', 'false')
        profile.set_preference('browser.download.dir', downloaddir)
        profile.set_preference(
            'browser.helperApps.neverAsk.saveToDisk', 'application/json')

        options = Options()
        options.headless = HEADLESS

        self.driver = webdriver.Firefox(
            firefox_profile=profile, options=options)
        self.wait = WebDriverWait(self.driver, 10)

        self.driver.get(url)
        print('Firefox Initialized')

    def initialise(self, tmpdir, app, url):
        jupyterdir = (tmpdir / 'jupyter').mkdir()
        downloaddir = (tmpdir / 'download').mkdir()

        copyfile('example.ipynb', str(jupyterdir / 'example.ipynb'))
        self.expected_download = str(downloaddir / 'example.ipynb')

        self.start_jupyter(str(jupyterdir), app)
        self.initialise_firefox(str(downloaddir), url)


class TestOfflineNotebook(FirefoxTestBase):

    def download_visible(self):
        self.wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[@title='Download']"))).click()
        size = os.stat(self.expected_download).st_size
        with open(self.expected_download) as f:
            nb = json.load(f)
            ncells = len(nb['cells'])
        os.remove(self.expected_download)
        return size, ncells

    def save_to_browser_storage(self):
        self.driver.find_element_by_xpath(
            "//button[@title='Save to browser storage']").click()
        dialog = self.wait.until(EC.visibility_of_element_located(
            (By.CSS_SELECTOR, 'div.modal-dialog')))

        assert dialog.find_element_by_css_selector(
            'h4.modal-title').text == (
                'Notebook saved to browser storage')
        assert dialog.find_element_by_css_selector(
            'div.modal-body').text == (
                'repoid: https://github.com/manics/jupyter-offlinenotebook\n'
                'path: example.ipynb')
        dialog.find_element_by_css_selector('button.btn-default').click()

    def restore_from_browser_storage(self):
        self.driver.find_element_by_xpath(
            "//button[@title='Restore from browser storage']").click()
        dialog = self.wait.until(EC.visibility_of_element_located(
            (By.CSS_SELECTOR, 'div.modal-dialog')))

        assert dialog.find_element_by_css_selector(
            'h4.modal-title').text == (
                'This will replace your current notebook with')
        assert dialog.find_element_by_css_selector(
            'div.modal-body').text == (
                'repoid: https://github.com/manics/jupyter-offlinenotebook\n'
                'path: example.ipynb')
        buttons = dialog.find_elements_by_css_selector('button.btn-default')
        assert buttons[0].text == 'OK'
        assert buttons[1].text == 'Cancel'
        buttons[0].click()

    def test_offline_notebook(self, tmpdir):
        # Selenium can't access IndexedDB so instead check save/load by
        # downloading the updated notebook

        self.initialise(tmpdir, 'Notebook', JUPYTERNOTEBOOK_URL)

        size, ncells = self.download_visible()
        assert_expected_size(size)
        assert ncells == EXPECTED_NUM_CELLS

        self.save_to_browser_storage()
        print('Saved to browser storage')

        # Delete some cells and download
        # element_to_be_clickable doesn't actually mean clickable
        # https://stackoverflow.com/a/51842120
        self.wait.until(EC.invisibility_of_element_located((
            By.XPATH, "//div[@class='modal-dialog']")))
        # Still doesn't work so force a pause
        sleep(0.5)
        for n in range(EXPECTED_NUM_CELLS):
            self.wait.until(EC.element_to_be_clickable((
                By.XPATH, "//button[@title='cut selected cells']")
            )).click()
        size, ncells = self.download_visible()
        assert_empty_size(size)
        assert ncells == 1

        self.restore_from_browser_storage()
        size, ncells = self.download_visible()
        assert_expected_size(size)
        assert ncells == EXPECTED_NUM_CELLS


class TestOfflineLab(FirefoxTestBase):

    def download_visible(self):
        self.wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[@title='Download visible']"))).click()
        size = os.stat(self.expected_download).st_size
        with open(self.expected_download) as f:
            nb = json.load(f)
            ncells = len(nb['cells'])
        os.remove(self.expected_download)
        return size, ncells

    def save_to_browser_storage(self):
        self.driver.find_element_by_xpath(
            "//button[@title='Save to browser storage']").click()
        dialog = self.wait.until(EC.visibility_of_element_located(
            (By.CSS_SELECTOR, 'div.jp-Dialog-content')))

        assert dialog.find_element_by_css_selector(
            'span.jp-Dialog-header').text == (
                'Notebook saved to browser storage')
        assert dialog.find_element_by_css_selector(
            'span.jp-Dialog-body').text == (
                'repoid: https://github.com/manics/jupyter-offlinenotebook '
                'path: example.ipynb')
        dialog.find_element_by_css_selector('button.jp-Dialog-button').click()

    def restore_from_browser_storage(self):
        self.driver.find_element_by_xpath(
            "//button[@title='Restore from browser storage']").click()
        dialog = self.wait.until(EC.visibility_of_element_located(
            (By.CSS_SELECTOR, 'div.jp-Dialog-content')))

        assert dialog.find_element_by_css_selector(
            'span.jp-Dialog-header').text == (
                'This will replace your current notebook with')
        assert dialog.find_element_by_css_selector(
            'span.jp-Dialog-body').text == (
                'repoid: https://github.com/manics/jupyter-offlinenotebook '
                'path: example.ipynb')
        buttons = dialog.find_elements_by_css_selector(
            'button.jp-Dialog-button')
        assert buttons[0].text == 'Cancel'
        assert buttons[1].text == 'OK'
        buttons[1].click()

    def test_offline_lab(self, tmpdir):
        # Selenium can't access IndexedDB so instead check save/load by
        # downloading the updated notebook

        self.initialise(tmpdir, 'Lab', JUPYTERLAB_URL)

        size, ncells = self.download_visible()
        assert_expected_size(size)
        assert ncells == EXPECTED_NUM_CELLS

        self.save_to_browser_storage()

        # Delete some cells and download
        for n in range(EXPECTED_NUM_CELLS):
            self.wait.until(EC.element_to_be_clickable((
                By.XPATH, "//button[@title='Cut the selected cells']")
            )).click()
        size, ncells = self.download_visible()
        assert_empty_size(size)
        assert ncells == 1

        self.restore_from_browser_storage()
        size, ncells = self.download_visible()
        assert_expected_size(size)
        assert ncells == EXPECTED_NUM_CELLS


class TestServer(FirefoxTestBase):

    def test_server_config(self, tmpdir):
        self.start_jupyter(str(tmpdir), 'Notebook')
        # Wait for server to start
        sleep(2)

        with urlopen(CONFIG_URL) as r:
            assert json.load(r) == {
                'repoid': 'https://github.com/manics/jupyter-offlinenotebook',
                'binder_repo_label': 'GitHub',
                'binder_ref_url': (
                    'https://github.com/manics/jupyter-offlinenotebook/'
                    'tree/master'),
                'binder_persistent_url': 'http://localhost/v2/gh/repo',
            }
