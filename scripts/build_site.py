from pathlib import Path
from urllib.parse import urljoin
from html import escape
import json
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
CONFIG_FILE = ROOT / "config" / "site.json"

START = "<!-- SEO:START -->"
END = "<!-- SEO:END -->"


def load_config():
    return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))


def normalize_site_url(value):
    return str(value or "").strip().rstrip("/")


def absolute_url(site_url, path):
    if not site_url:
        return ""

    return urljoin(site_url + "/", str(path).lstrip("/"))


def seo_block(config, page):
    site_url = normalize_site_url(config.get("siteUrl"))
    locale = config.get("locale", "de_DE")
    site_name = config["siteName"]

    title = page["title"]
    description = page.get("description", "")
    indexable = bool(page.get("index", True))
    favicon = config.get("favicon", {})

    canonical = absolute_url(site_url, page["path"])
    og_image = absolute_url(site_url, config["defaultOgImage"])

    lines = [
        START,
        f'  <meta name="robots" content="{"index,follow" if indexable else "noindex,follow"}">',
    ]

    if description:
        lines.append(
            f'  <meta name="description" content="{escape(description, quote=True)}">'
        )

    if favicon:
        lines.extend([
            "",
            f'  <link rel="icon" href="{escape(favicon["ico"], quote=True)}" sizes="any">',
            f'  <link rel="icon" type="image/png" sizes="32x32" href="{escape(favicon["png32"], quote=True)}">',
            f'  <link rel="icon" type="image/png" sizes="16x16" href="{escape(favicon["png16"], quote=True)}">',
            f'  <link rel="apple-touch-icon" href="{escape(favicon["appleTouch"], quote=True)}">',
        ])

    lines.extend([
        "",
        '  <meta property="og:type" content="website">',
        f'  <meta property="og:site_name" content="{escape(site_name, quote=True)}">',
        f'  <meta property="og:locale" content="{escape(locale, quote=True)}">',
        f'  <meta property="og:title" content="{escape(title, quote=True)}">',
    ])

    if description:
        lines.append(
            f'  <meta property="og:description" content="{escape(description, quote=True)}">'
        )

    if canonical:
        lines.extend([
            f'  <link rel="canonical" href="{escape(canonical, quote=True)}">',
            f'  <meta property="og:url" content="{escape(canonical, quote=True)}">',
        ])

    if og_image:
        lines.append(
            f'  <meta property="og:image" content="{escape(og_image, quote=True)}">'
        )

    lines.append(END)

    return "\n".join(lines)


def update_html(config, filename, page):
    path = ROOT / filename

    if not path.exists():
        raise RuntimeError(f"HTML file not found: {filename}")

    html = path.read_text(encoding="utf-8")

    title = escape(page["title"])

    # Keep exactly one title.
    if re.search(r"<title>.*?</title>", html, flags=re.I | re.S):
        html = re.sub(
            r"<title>.*?</title>",
            f"<title>{title}</title>",
            html,
            count=1,
            flags=re.I | re.S,
        )
    else:
        html = html.replace(
            "</head>",
            f"  <title>{title}</title>\n</head>",
            1,
        )

    # Remove old generated block.
    html = re.sub(
        rf"\s*{re.escape(START)}.*?{re.escape(END)}\s*",
        "\n",
        html,
        flags=re.S,
    )

    # Remove metadata now controlled centrally.
    html = re.sub(
        r'\s*<meta\s+name=["\']robots["\'][^>]*>\s*',
        "\n",
        html,
        flags=re.I,
    )

    html = re.sub(
        r'\s*<meta\s+name=["\']description["\'][^>]*>\s*',
        "\n",
        html,
        flags=re.I | re.S,
    )

    html = re.sub(
        r'\s*<link\s+rel=["\']canonical["\'][^>]*>\s*',
        "\n",
        html,
        flags=re.I,
    )

    html = re.sub(
        r'\s*<meta\s+property=["\']og:[^"\']+["\'][^>]*>\s*',
        "\n",
        html,
        flags=re.I,
    )

    block = seo_block(config, page)

    # Put generated SEO immediately before first stylesheet.
    stylesheet = re.search(
        r'\s*<link\s+rel=["\']stylesheet["\']',
        html,
        flags=re.I,
    )

    if stylesheet:
        pos = stylesheet.start()
        html = html[:pos].rstrip() + "\n\n  " + block + "\n\n" + html[pos:].lstrip()
    else:
        html = html.replace(
            "</head>",
            f"\n  {block}\n</head>",
            1,
        )

    path.write_text(html, encoding="utf-8")


def generate_robots(config):
    site_url = normalize_site_url(config.get("siteUrl"))

    lines = [
        "User-agent: *",
        "Allow: /",
    ]

    if site_url:
        lines.extend([
            "",
            f"Sitemap: {site_url}/sitemap.xml",
        ])

    (ROOT / "robots.txt").write_text(
        "\n".join(lines) + "\n",
        encoding="utf-8",
    )


def generate_sitemap(config):
    site_url = normalize_site_url(config.get("siteUrl"))

    if not site_url:
        sitemap = (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            '</urlset>\n'
        )

        (ROOT / "sitemap.xml").write_text(
            sitemap,
            encoding="utf-8",
        )
        return

    urls = []

    for page in config["pages"].values():
        if not page.get("index", True):
            continue

        url = absolute_url(site_url, page["path"])
        urls.append(
            "  <url>\n"
            f"    <loc>{escape(url)}</loc>\n"
            "  </url>"
        )

    sitemap = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls)
        + "\n</urlset>\n"
    )

    (ROOT / "sitemap.xml").write_text(
        sitemap,
        encoding="utf-8",
    )


def main():
    config = load_config()

    for filename, page in config["pages"].items():
        update_html(config, filename, page)

    generate_robots(config)
    generate_sitemap(config)

    site_url = normalize_site_url(config.get("siteUrl"))

    print("Production metadata generated.")
    print(f"siteUrl: {site_url or '[not configured yet]'}")
    print("HTML pages:", len(config["pages"]))
    print("robots.txt: generated")
    print("sitemap.xml: generated")

    if not site_url:
        print()
        print("NOTE:")
        print("Production domain is not configured yet.")
        print("Canonical, og:url and absolute og:image will be added")
        print("automatically after siteUrl is configured.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
