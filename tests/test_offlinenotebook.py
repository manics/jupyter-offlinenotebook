import json
import os
import pytest
from shutil import copyfile
import subprocess
from time import sleep
from urllib.request import urlopen

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By

from selenium.webdriver.firefox.firefox_profile import FirefoxProfile
from selenium.webdriver.firefox.options import Options


PORT = 18888
CONFIG_URL = "http://localhost:{}/offlinenotebook/config".format(PORT)
JUPYTERLAB_URL = "http://localhost:{}/lab/tree/example.ipynb".format(PORT)
JUPYTERNOTEBOOK_URL = "http://localhost:{}/tree/example.ipynb".format(PORT)
EXPECTED_SIZE = 1700
EXPECTED_EMPTY_SIZE = 450
EXPECTED_NUM_CELLS = 5
HEADLESS = True
# If 'firefox' is a script selenium may not work, if this happens set this to
# the binary e.g. '/usr/lib64/firefox/firefox'
FIREFOX_BIN = None
TIMEOUT = 10


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
        self.major_version = None
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
        # Use unique JupyterLab dirs to avoid unexpected interactions
        # https://jupyterlab.readthedocs.io/en/stable/user/directories.html
        settings_dir = jupyterdir / "settings"
        settings_dir.mkdir()
        workspaces_dir = jupyterdir / "workspaces"
        workspaces_dir.mkdir()

        version = subprocess.check_output(
            ["jupyter-{}".format(app.lower()), "--version"]
        )
        self.major_version = int(version.split(b".", 1)[0])
        command = [
            "jupyter-{}".format(app.lower()),
            "--no-browser",
            "--{}App.token=".format(app),
            "--port={}".format(PORT),
        ]
        env = {
            "BINDER_LAUNCH_HOST": "http://localhost/",
            "BINDER_REPO_URL": "https://github.com/manics/jupyter-offlinenotebook",
            "BINDER_PERSISTENT_REQUEST": "v2/gh/repo",
            "BINDER_REF_URL": (
                "https://github.com/manics/jupyter-offlinenotebook/tree/main"
            ),
            "PATH": os.getenv("PATH"),
            "JUPYTERLAB_SETTINGS_DIR": str(settings_dir),
            "JUPYTERLAB_WORKSPACES_DIR": str(workspaces_dir),
        }
        self.jupyter_proc = subprocess.Popen(command, cwd=str(jupyterdir), env=env)

    def initialise_firefox(self, downloaddir, url):
        profile = FirefoxProfile()
        profile.set_preference("browser.download.folderList", 2)
        profile.set_preference("browser.download.manager.showWhenStarting", "false")
        profile.set_preference("browser.download.dir", downloaddir)
        profile.set_preference(
            "browser.helperApps.neverAsk.saveToDisk", "application/x-ipynb+json"
        )

        options = Options()
        # Comment this out to see the browser window
        options.headless = HEADLESS

        kwargs = {"firefox_profile": profile, "options": options}
        if FIREFOX_BIN:
            kwargs["firefox_binary"] = FIREFOX_BIN
        self.driver = webdriver.Firefox(**kwargs)
        self.wait = WebDriverWait(self.driver, TIMEOUT)

        self.driver.get(url)
        print("Firefox Initialized")

    def initialise(self, tmpdir, app, url):
        jupyterdir = (tmpdir / "jupyter").mkdir()
        downloaddir = (tmpdir / "download").mkdir()

        copyfile("example.ipynb", str(jupyterdir / "example.ipynb"))
        copyfile(
            "offline-notebook-buttons.png",
            str(jupyterdir / "offline-notebook-buttons.png"),
        )
        self.expected_download = str(downloaddir / "example.ipynb")

        self.start_jupyter(jupyterdir, app)
        self.initialise_firefox(str(downloaddir), url)


class TestOfflineNotebook(FirefoxTestBase):
    def download_visible(self):
        self.wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[@title='Download visible']")
            )
        ).click()
        size = os.stat(self.expected_download).st_size
        with open(self.expected_download) as f:
            nb = json.load(f)
            ncells = len(nb["cells"])
        os.remove(self.expected_download)
        return size, ncells

    def save_to_browser_storage(self):
        self.driver.find_element_by_xpath(
            "//button[@title='Save to browser storage']"
        ).click()
        dialog = self.wait.until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, "div.modal-dialog"))
        )

        assert dialog.find_element_by_css_selector("h4.modal-title").text == (
            "Notebook saved to browser storage"
        )
        assert dialog.find_element_by_css_selector("div.modal-body").text == (
            "repoid: https://github.com/manics/jupyter-offlinenotebook\n"
            "path: example.ipynb"
        )
        dialog.find_element_by_css_selector("button.btn-default").click()

    def restore_from_browser_storage(self):
        self.driver.find_element_by_xpath(
            "//button[@title='Restore from browser storage']"
        ).click()
        dialog = self.wait.until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, "div.modal-dialog"))
        )

        assert dialog.find_element_by_css_selector("h4.modal-title").text == (
            "This will replace your current notebook with"
        )
        assert dialog.find_element_by_css_selector("div.modal-body").text == (
            "repoid: https://github.com/manics/jupyter-offlinenotebook\n"
            "path: example.ipynb"
        )
        buttons = dialog.find_elements_by_css_selector("button.btn-default")
        assert buttons[0].text == "OK"
        assert buttons[1].text == "Cancel"
        buttons[0].click()

    def wait_for_modal_dialog(self):
        # element_to_be_clickable doesn't actually mean clickable
        # so need to make sure the modal dialog has cleared
        # https://stackoverflow.com/a/51842120
        self.wait.until(
            EC.invisibility_of_element_located(
                (By.XPATH, "//div[@class='modal-dialog']")
            )
        )

    @pytest.mark.flaky(max_runs=3)
    def test_offline_notebook(self, tmpdir):
        # Selenium can't access IndexedDB so instead check save/load by
        # downloading the updated notebook

        self.initialise(tmpdir, "Notebook", JUPYTERNOTEBOOK_URL)

        size, ncells = self.download_visible()
        assert_expected_size(size)
        assert ncells == EXPECTED_NUM_CELLS

        self.save_to_browser_storage()
        print("Saved to browser storage")

        # Delete some cells and download
        # element_to_be_clickable doesn't actually mean clickable
        self.wait_for_modal_dialog()
        # Still doesn't work so force a pause
        sleep(0.5)
        for n in range(EXPECTED_NUM_CELLS):
            self.wait.until(
                EC.element_to_be_clickable(
                    (By.XPATH, "//button[@title='cut selected cells']")
                )
            ).click()
        size, ncells = self.download_visible()
        assert_empty_size(size)
        assert ncells == 1

        self.restore_from_browser_storage()

        # download_visible uses element_to_be_clickable but that doesn't
        # actually mean clickable
        self.wait_for_modal_dialog()
        size, ncells = self.download_visible()
        assert_expected_size(size)
        assert ncells == EXPECTED_NUM_CELLS


class TestOfflineLab(FirefoxTestBase):
    def download_visible(self):
        self.wait.until(
            EC.invisibility_of_element((By.XPATH, "//div[@class='modal-backdrop']"))
        )
        self.wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[@title='Download visible']")
            )
        ).click()

        # Allow time for the downloaded file to be saved
        sleep(2)
        size = os.stat(self.expected_download).st_size
        assert size
        with open(self.expected_download) as f:
            nb = json.load(f)
            ncells = len(nb["cells"])
        os.remove(self.expected_download)
        return size, ncells

    def save_to_browser_storage(self):
        self.driver.find_element_by_xpath(
            "//button[@title='Save to browser storage']"
        ).click()
        dialog = self.wait.until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, "div.jp-Dialog-content"))
        )

        if self.major_version == 2:
            el = "span"
        else:
            el = "div"
        assert dialog.find_element_by_css_selector(f"{el}.jp-Dialog-header").text == (
            "Notebook saved to browser storage"
        )
        assert dialog.find_element_by_css_selector("span.jp-Dialog-body").text == (
            "repoid: https://github.com/manics/jupyter-offlinenotebook "
            "path: example.ipynb"
        )
        dialog.find_element_by_css_selector("button.jp-Dialog-button").click()

    def restore_from_browser_storage(self):
        self.driver.find_element_by_xpath(
            "//button[@title='Restore from browser storage']"
        ).click()
        dialog = self.wait.until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, "div.jp-Dialog-content"))
        )

        if self.major_version == 2:
            el = "span"
        else:
            el = "div"
        assert dialog.find_element_by_css_selector(f"{el}.jp-Dialog-header").text == (
            "This will replace your current notebook with"
        )
        assert dialog.find_element_by_css_selector("span.jp-Dialog-body").text == (
            "repoid: https://github.com/manics/jupyter-offlinenotebook "
            "path: example.ipynb"
        )
        buttons = dialog.find_elements_by_css_selector("button.jp-Dialog-button")
        assert buttons[0].text == "Cancel"
        assert buttons[1].text == "OK"
        buttons[1].click()

    @pytest.mark.flaky(max_runs=3)
    def test_offline_lab(self, tmpdir):
        # Selenium can't access IndexedDB so instead check save/load by
        # downloading the updated notebook

        self.initialise(tmpdir, "Lab", JUPYTERLAB_URL)
        assert self.major_version in (2, 3)

        # Wait for the loading logo to appear, then disappear
        try:
            self.wait.until(
                EC.visibility_of_element_located((By.XPATH, "//div[@id='main-logo']"))
            )
        except TimeoutException:
            # Maybe JupyterLab loaded too quickly for selenium to see the logo?
            pass

        self.wait.until(
            EC.invisibility_of_element((By.XPATH, "//div[@id='main-logo']"))
        )

        size, ncells = self.download_visible()
        assert_expected_size(size)
        assert ncells == EXPECTED_NUM_CELLS

        self.save_to_browser_storage()

        # Delete some cells and download
        for n in range(EXPECTED_NUM_CELLS):
            self.wait.until(
                EC.element_to_be_clickable(
                    (By.XPATH, "//button[@title='Cut the selected cells']")
                )
            ).click()
        size, ncells = self.download_visible()
        assert_empty_size(size)
        assert ncells == 1

        self.restore_from_browser_storage()
        size, ncells = self.download_visible()
        assert_expected_size(size)
        assert ncells == EXPECTED_NUM_CELLS


class TestServer(FirefoxTestBase):
    def test_server_config(self, tmpdir):
        self.start_jupyter(tmpdir, "Notebook")
        # Wait for server to start
        sleep(2)

        with urlopen(CONFIG_URL) as r:
            assert json.load(r) == {
                "repoid": "https://github.com/manics/jupyter-offlinenotebook",
                "binder_repo_label": "GitHub",
                "binder_ref_url": (
                    "https://github.com/manics/jupyter-offlinenotebook/tree/main"
                ),
                "binder_persistent_url": "http://localhost/v2/gh/repo",
            }
