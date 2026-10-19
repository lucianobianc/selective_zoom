"""Real temporary-addon tests; requires Firefox, geckodriver and selenium.

Run from the checkout after npm run build. No browser API mocks are used.
"""
import functools
import http.server
import os
from pathlib import Path
import shutil
import tempfile
import threading
import unittest

from selenium import webdriver
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.actions.action_builder import ActionBuilder
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.support.ui import WebDriverWait

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        if "csp=1" in self.path:
            self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'")
        super().end_headers()

    def log_message(self, *_args):
        pass


class FirefoxExtensionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.servers = []
        cls.driver = None
        cls.logs = tempfile.TemporaryDirectory(prefix="selective-zoom-tests-")
        cls.addClassCleanup(cls.logs.cleanup)
        for _ in range(2):
            server = http.server.ThreadingHTTPServer(
                ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT)))
            cls.addClassCleanup(server.server_close)
            cls.addClassCleanup(server.shutdown)
            threading.Thread(target=server.serve_forever, daemon=True).start()
            cls.servers.append(server)
        cls.urls = [f"http://127.0.0.1:{server.server_port}/tests/fixtures/comments.html" for server in cls.servers]
        options = Options()
        options.binary_location = os.environ.get("FIREFOX_BINARY") or shutil.which("firefox") or shutil.which("firefox-esr")
        if not options.binary_location:
            raise RuntimeError("Set FIREFOX_BINARY or install Firefox.")
        options.add_argument("-headless")
        # Needed only for automated interaction with the real toolbar button.
        options.add_argument("-remote-allow-system-access")
        options.accept_insecure_certs = False
        service = Service(os.environ.get("GECKODRIVER") or shutil.which("geckodriver"),
                          log_output=str(Path(cls.logs.name) / "geckodriver.log"))
        cls.driver = webdriver.Firefox(options=options, service=service)
        cls.addClassCleanup(cls.driver.quit)
        cls.driver.set_window_size(1280, 900)
        cls.wait = WebDriverWait(cls.driver, 15)
        package = Path(os.environ.get("EXTENSION_ZIP", ROOT / "web-ext-artifacts/selective_zoom-0.1.0.zip"))
        if not package.is_file():
            raise RuntimeError("Run npm run build before testing the packaged extension.")
        addon = cls.driver.install_addon(str(package), temporary=True)
        if addon != "selective-zoom@lucianobianc":
            raise AssertionError(f"Unexpected addon ID: {addon}")
        print(f"\nTesting packaged extension in Firefox {cls.driver.capabilities['browserVersion']}", flush=True)

    def navigate(self, url=None):
        self.driver.get(url or self.urls[0])
        self.wait.until(lambda d: d.find_elements(By.CSS_SELECTOR, "[data-selective-zoom=saved-style]"))

    def panel(self):
        hosts = self.driver.find_elements(By.CSS_SELECTOR, "[data-selective-zoom=panel]")
        return hosts[0].shadow_root if hosts else None

    def control(self, name):
        return self.panel().find_element(By.ID, name)

    def toggle(self):
        self.driver.set_context("chrome")
        try:
            self.driver.execute_script("""
                const { CustomizableUI } = ChromeUtils.importESModule('resource:///modules/CustomizableUI.sys.mjs');
                const id = 'selective-zoom_lucianobianc-browser-action';
                CustomizableUI.addWidgetToArea(id, CustomizableUI.AREA_NAVBAR);
                document.getElementById(id).querySelector('toolbarbutton').click();
            """)
        finally:
            self.driver.set_context("content")
        self.wait.until(lambda _d: self.panel() is not None)

    def size(self, selector):
        return self.driver.find_element(By.CSS_SELECTOR, selector).value_of_css_property("font-size")

    def wait_size(self, selector, expected):
        self.wait.until(lambda _d: self.size(selector) == f"{expected}px")

    def edit(self, selector, size):
        self.driver.find_element(By.CSS_SELECTOR, selector).click()
        self.wait.until(lambda _d: self.control("size").is_displayed())
        # Native keystrokes exercise input listeners; no direct calls into extension code.
        field = self.control("size")
        field.clear()
        field.send_keys(str(size))
        self.wait_size(selector, size)

    def save(self):
        self.control("save").click()
        self.wait.until(lambda _d: self.panel() is None)

    def escape(self):
        ActionChains(self.driver).send_keys(Keys.ESCAPE).perform()
        self.wait.until(lambda _d: self.panel() is None)

    def test_01_complete_lifecycle_and_origin_isolation(self):
        self.navigate()
        first_tab = self.driver.current_window_handle
        self.toggle()
        self.driver.find_element(By.CSS_SELECTOR, ".test-link").click()
        self.assertNotIn("#navigated", self.driver.current_url)
        self.escape()
        self.toggle()
        self.edit(".comment-text", 30)
        self.assertTrue(self.control("save").is_enabled())
        self.control("cancel").click()
        self.wait_size(".comment-text", 16)
        self.driver.refresh()
        self.wait_size(".comment-text", 16)
        self.toggle()
        self.edit(".comment-text", 26)
        self.assertIn("3 elemento(s)", self.control("status").text)
        self.save()
        self.driver.refresh()
        self.wait_size(".comment-text", 26)
        self.driver.find_element(By.ID, "add-comment").click()
        self.wait_size(".comment:last-child .comment-text", 26)
        self.assertEqual(self.size("h1"), "32px")
        self.toggle()
        self.edit(".caption", 20)
        self.save()
        self.driver.switch_to.new_window("tab")
        second_tab = self.driver.current_window_handle
        self.navigate()
        self.wait_size(".comment-text", 26)
        self.wait_size(".caption", 20)
        self.driver.switch_to.new_window("tab")
        self.navigate(self.urls[1])
        self.wait_size(".comment-text", 16)
        self.wait_size(".caption", 12)
        self.driver.close()
        self.driver.switch_to.window(first_tab)
        self.toggle()
        self.control("list-button").click()
        self.wait.until(lambda _d: len(self.control("rules").find_elements(By.TAG_NAME, "li")) == 2)
        self.panel().find_element(By.CSS_SELECTOR, '[aria-label="Remover regra p.comment-text"]').click()
        self.wait_size(".comment-text", 16)
        self.wait_size(".caption", 20)
        self.driver.switch_to.window(second_tab)
        self.wait_size(".comment-text", 16)  # Actual browser.storage.onChanged in another tab.
        self.wait_size(".caption", 20)
        self.driver.close()
        self.driver.switch_to.window(first_tab)
        self.panel().find_element(By.CSS_SELECTOR, '[aria-label="Remover regra p.caption"]').click()
        self.wait_size(".caption", 12)
        self.wait.until(lambda _d: "Nenhuma regra" in self.control("status").text)
        self.escape()

    def test_02_sensitive_controls_and_keyboard(self):
        self.navigate()
        self.toggle()
        self.driver.find_element(By.CSS_SELECTOR, "input").click()
        self.assertFalse(self.control("editor").is_displayed())
        ActionChains(self.driver).send_keys(Keys.ARROW_DOWN, Keys.ARROW_DOWN, Keys.ENTER).perform()
        self.wait.until(lambda _d: self.control("editor").is_displayed())
        self.assertIn("3 elemento(s)", self.control("status").text)
        self.control("size").clear()
        self.control("size").send_keys("28")
        self.wait_size(".comment-text", 28)
        self.escape()
        self.wait_size(".comment-text", 16)

    def test_03_unsafe_match_and_invalid_size(self):
        self.navigate()
        self.driver.execute_script("const p=document.createElement('p');p.className='css-a1b2c3';p.textContent='Texto sem seletor estável';document.body.append(p)")
        self.toggle()
        self.driver.find_element(By.CSS_SELECTOR, ".css-a1b2c3").click()
        self.assertIn("Não foi possível", self.control("status").text)
        self.control("reselect").click()
        self.edit(".comment-text", 24)
        self.control("size").clear()
        self.control("size").send_keys("129")
        self.assertFalse(self.control("save").is_enabled())
        self.assertIn("6 e 128", self.control("error").text)
        self.escape()
        self.wait_size(".comment-text", 16)

    def test_04_strict_page_csp(self):
        self.navigate(self.urls[0] + "?csp=1")
        self.toggle()
        self.edit(".comment-text", 24)
        self.save()
        self.driver.refresh()
        self.wait_size(".comment-text", 24)
        self.toggle()
        self.control("list-button").click()
        self.wait.until(lambda _d: len(self.control("rules").find_elements(By.TAG_NAME, "li")) == 1)
        self.panel().find_element(By.CSS_SELECTOR, '[aria-label="Remover regra p.comment-text"]').click()
        self.wait_size(".comment-text", 16)
        self.escape()

    def test_05_native_context_menu_and_dark_page(self):
        self.navigate()
        self.driver.execute_script("document.documentElement.style.colorScheme='dark';document.body.style.color='#e4e6eb';document.body.style.background='#242526'")
        # Also allow the native context menu while selection mode is active.
        self.toggle()
        target = self.driver.find_elements(By.CSS_SELECTOR, '.comment-text')[1]
        ActionChains(self.driver).context_click(target).perform()
        self.driver.set_context('chrome')
        try:
            self.wait.until(lambda d: d.execute_script("return document.getElementById('contentAreaContextMenu').state === 'open'"))
            menu = self.wait.until(lambda d: d.find_element(By.CSS_SELECTOR, 'menuitem[label="Selective Zoom"]'))
            self.driver.execute_script("arguments[0].doCommand();document.getElementById('contentAreaContextMenu').hidePopup()", menu)
        finally:
            self.driver.set_context('content')
        self.wait.until(lambda _d: self.panel() and self.control('editor').is_displayed())
        self.assertIn('3 elemento(s)', self.control('status').text)
        color = self.driver.execute_script("return getComputedStyle(document.querySelector('[data-selective-zoom=panel]').shadowRoot.querySelector('h2')).color")
        self.assertEqual(color, 'rgb(23, 37, 84)')
        self.control('size').clear()
        self.control('size').send_keys('27')
        self.wait_size('.comment-text', 27)
        self.escape()
        self.wait_size('.comment-text', 16)

    def test_06_scoped_social_text_fixtures(self):
        # Representative structures, not authenticated live-site sessions.
        self.navigate(self.urls[0].replace('comments.html', 'social-text.html'))
        self.toggle()
        self.edit('ytd-comment-view-model [id="content-text"] span', 29)
        self.assertIn('2 elemento(s)', self.control('status').text)
        self.wait_size('#video-title', 16)
        self.wait_size('ytd-comment-view-model a', 16)
        self.save()
        self.driver.refresh()
        self.wait_size('ytd-comment-view-model [id="content-text"] span', 29)
        self.wait_size('#video-title', 16)
        self.toggle()
        self.control('list-button').click()
        self.wait.until(lambda _d: len(self.control('rules').find_elements(By.TAG_NAME, 'li')) == 1)
        self.control('rules').find_element(By.TAG_NAME, 'button').click()
        self.wait_size('ytd-comment-view-model [id="content-text"] span', 16)
        self.escape()
        self.toggle()
        self.edit('[data-ad-rendering-role="comment_message"] span', 28)
        self.assertIn('2 elemento(s)', self.control('status').text)
        self.wait_size('[data-ad-rendering-role="story_message"] span', 16)
        self.wait_size('div[role="article"] a', 16)
        self.escape()
        self.toggle()
        self.edit('.unmarked-comments div[dir="auto"] span', 27)
        self.assertIn('2 elemento(s)', self.control('status').text)
        self.wait_size('.unmarked-comments header span', 16)
        self.wait_size('p.x193iq5w', 16)
        self.escape()

    def test_07_layered_pointer_target(self):
        self.navigate(self.urls[0].replace('comments.html', 'social-text.html'))
        original_button_size = self.size('.layer-hit button')
        self.toggle()
        point = self.driver.execute_script("""
            const range=document.createRange();range.selectNodeContents(document.querySelector('.layered-text'));
            const rect=range.getBoundingClientRect();return {x:rect.left+20,y:rect.top+rect.height/2};
        """)
        actions = ActionBuilder(self.driver)
        actions.pointer_action.move_to_location(int(point['x']), int(point['y']))
        actions.pointer_action.click()
        actions.perform()
        self.wait.until(lambda _d: self.control('editor').is_displayed())
        self.assertIn('2 elemento(s)', self.control('status').text)
        self.control('size').clear()
        self.control('size').send_keys('30')
        self.wait_size('.layered-text', 30)
        self.assertEqual(self.size('.layer-hit button'), original_button_size)
        self.escape()


if __name__ == "__main__":
    unittest.main(verbosity=2)
