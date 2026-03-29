from playwright.sync_api import sync_playwright
from pathlib import Path

html_path = Path(__file__).parent / 'platform-response.html'
pdf_path = Path(__file__).parent / 'BeMore-Platform-Response.pdf'

print(f'Reading {html_path.name}...')

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto(f'file:///{html_path.resolve().as_posix()}', wait_until='networkidle')
    page.wait_for_timeout(3000)
    page.pdf(
        path=str(pdf_path),
        format='A4',
        margin={'top': '15px', 'bottom': '15px', 'left': '15px', 'right': '15px'},
        print_background=True,
    )
    browser.close()

size_mb = pdf_path.stat().st_size / (1024 * 1024)
print(f'PDF exported: {pdf_path} ({size_mb:.1f} MB)')
