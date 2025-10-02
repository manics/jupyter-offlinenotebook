import json
import os
import pytest
from shutil import copyfile
import subprocess
from time import sleep
from urllib.request import urlopen
from urllib.error import URLError

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By

from selenium.webdriver.firefox.firefox_profile import FirefoxProfile
from selenium.webdriver.firefox.options import Options


PORT = 18888
CONFIG_URL = f"http://localhost:{PORT}/offlinenotebook/config"
JUPYTER_URL = {
    "lab": f"http://localhost:{PORT}/lab/tree/example.ipynb",
    "notebook": f"http://localhost:{PORT}/tree/example.ipynb",
}
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
    def setup_method(self):
        self.jupyter_proc = None
        self.major_version = None
        self.driver = None
        self.wait = None

    def teardown_method(self):
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

        version = subprocess.check_output([f"jupyter-{app}", "--version"])
        self.major_version = int(version.split(b".", 1)[0])
        command = [
            f"jupyter-{app}",
            "--no-browser",
            "--ServerApp.token=",
            f"--port={PORT}",
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

        # Wait for Jupyter to start
        for n in range(10):
            sleep(1)
            try:
                with urlopen(f"http://localhost:{PORT}", timeout=2) as _:
                    pass
            except URLError:
                continue
        print(f"jupyter-{app} started")

    def initialise_firefox(self, downloaddir, url):
        profile = FirefoxProfile()
        profile.set_preference("browser.download.folderList", 2)
        profile.set_preference("browser.download.manager.showWhenStarting", "false")
        profile.set_preference("browser.download.alwaysOpenPanel", False)
        profile.set_preference("browser.download.dir", downloaddir)
        profile.set_preference(
            "browser.helperApps.neverAsk.saveToDisk", "application/x-ipynb+json"
        )

        options = Options()
        # Comment this out to see the browser window
        options.headless = HEADLESS

        options.profile = profile
        if FIREFOX_BIN:
            options.binary_location = FIREFOX_BIN
        self.driver = webdriver.Firefox(options=options)
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


class TestOfflineLab(FirefoxTestBase):
    def download_visible(self):
        self.wait.until(
            EC.invisibility_of_element((By.XPATH, "//div[@class='modal-backdrop']"))
        )
        self.wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, f"//{self.toolbar_button}[@title='Download visible']")
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
        self.driver.find_element(
            By.XPATH, f"//{self.toolbar_button}[@title='Save to browser storage']"
        ).click()
        dialog = self.wait.until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, "div.jp-Dialog-content"))
        )

        assert dialog.find_element(By.CSS_SELECTOR, "div.jp-Dialog-header").text == (
            "Notebook saved to browser storage"
        )
        assert dialog.find_element(By.CSS_SELECTOR, "span.jp-Dialog-body").text == (
            "repoid: https://github.com/manics/jupyter-offlinenotebook "
            "path: example.ipynb"
        )
        dialog.find_element(By.CSS_SELECTOR, "button.jp-Dialog-button").click()

    def restore_from_browser_storage(self):
        self.driver.find_element(
            By.XPATH, f"//{self.toolbar_button}[@title='Restore from browser storage']"
        ).click()
        dialog = self.wait.until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, "div.jp-Dialog-content"))
        )

        assert dialog.find_element(By.CSS_SELECTOR, "div.jp-Dialog-header").text == (
            "This will replace your current notebook with"
        )
        assert dialog.find_element(By.CSS_SELECTOR, "span.jp-Dialog-body").text == (
            "repoid: https://github.com/manics/jupyter-offlinenotebook "
            "path: example.ipynb"
        )
        buttons = dialog.find_elements(By.CSS_SELECTOR, "button.jp-Dialog-button")
        assert buttons[0].text == "Cancel"
        assert buttons[1].text == "OK"
        buttons[1].click()

    @pytest.mark.flaky(max_runs=3)
    # Notebook 7 is based on JupyterLab
    @pytest.mark.parametrize("app", ["lab", "notebook"])
    def test_offline_lab(self, tmpdir, app):
        # Selenium can't access IndexedDB so instead check save/load by
        # downloading the updated notebook

        self.initialise(tmpdir, app, JUPYTER_URL[app])
        self.toolbar_button = "jp-button"

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
                    # Cut the selected cells
                    # Cut the selected cells (X)
                    # Cut this cell
                    (
                        By.XPATH,
                        f"//{self.toolbar_button}[starts-with(@title, 'Cut ')]",
                    )
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
        self.start_jupyter(tmpdir, "server")

        with urlopen(CONFIG_URL) as r:
            assert json.load(r) == {
                "repoid": "https://github.com/manics/jupyter-offlinenotebook",
                "binder_repo_label": "GitHub",
                "binder_ref_url": (
                    "https://github.com/manics/jupyter-offlinenotebook/tree/main"
                ),
                "binder_persistent_url": "http://localhost/v2/gh/repo",
            }
