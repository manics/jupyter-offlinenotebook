import pytest


def pytest_addoption(parser):
    parser.addoption(
        "--browser",
        action="store",
        default="firefox",
        help="browser to run tests on",
        choices=("firefox", "chrome"),
    )


@pytest.fixture
def browser(request):
    return request.config.getoption("--browser")
