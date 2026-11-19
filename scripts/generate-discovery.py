"""Generate crawlable discovery pages; editor shells retain the existing Blazor runtime."""
from pathlib import Path
from html import escape as e
import json
import re
import sys
from xml.etree.ElementTree import Element, SubElement, ElementTree

REPO = Path(__file__).resolve().parent.parent
CATALOG = REPO / 'AITest/Apps/catalog.json'
ORIGIN = 'https://n8dagr822.github.io'

def generate(root, base, shell):
    apps = json.loads(CATALOG.read_text(encoding='utf-8'))
    slugs = [a['Slug'] for a in apps]
    if len(slugs) != len(set(slugs)) or any(not re.fullmatch(r'[a-z0-9-]+', s) for s in slugs):
        raise ValueError('Catalog slugs must be unique URL segments.')
    urls = []
    footer = '<footer class="directory-footer"><a href="about/">About AICraft</a><a href="contact/">Contact &amp; feedback</a><a href="privacy/">Privacy</a><a href="terms/">Terms</a><a href="licenses/AICraft-LICENSE-MIT.txt">AICraft license</a><a href="licenses/AICraft-THIRD-PARTY-SOURCES.txt">Third-party sources &amp; terms</a><a href="https://github.com/N8DaGr822/AICraft">GitHub source</a></footer>'
    def page(route, title, description, content, schema=None, script=''):
        canonical = ORIGIN + base + route
        metadata = json.dumps(schema or {'@context':'https://schema.org','@type':'WebPage','name':title,'url':canonical}, ensure_ascii=True).replace('<','\\u003c')
        html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base href="{e(base)}"><title>{e(title)}</title><meta name="description" content="{e(description)}"><link rel="canonical" href="{e(canonical)}"><meta property="og:type" content="website"><meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(description)}"><meta property="og:url" content="{e(canonical)}"><meta property="og:site_name" content="AICraft"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="{e(title)}"><meta name="twitter:description" content="{e(description)}"><link rel="icon" href="favicon.png"><link rel="stylesheet" href="css/discovery.css"><script type="application/ld+json">{metadata}</script></head><body class="discovery"><div class="directory-shell"><a class="skip-link" href="{e(route)}#main-content">Skip to content</a><header class="directory-header"><a class="directory-brand" href="{e(base)}">AICraft<span aria-hidden="true"> /</span></a><a href="apps/">Explore applications</a><a href="{e(base)}#how-it-works">How it works</a></header><main id="main-content" tabindex="-1">{content}</main>{footer}</div>{script}</body></html>'''
        target = root / route / 'index.html'
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(html, encoding='utf-8')
        urls.append(canonical)
    def card(a):
        return f'<article class="directory-card" data-category="{e(a["Category"])}" data-search="{e(a["Name"]+" "+a["Description"]+" "+a["ComparableSoftware"])}" data-date="{e(a["DateAdded"] or "")}"><span class="eyebrow">{e(a["Category"])}</span><h3><a href="applications/{a["Slug"]}/">{e(a["Name"])}</a></h3><p>{e(a["Description"])}</p><p>Free to use · Added {e(a["DateAdded"] or "date not recorded")}</p><a href="{a["Route"]}/">Launch application →</a></article>'
    categories = sorted({a['Category'] for a in apps})
    hero = '<section class="directory-hero"><p class="eyebrow">AICRAFT / YOUR BROWSER IS YOUR WORKSPACE</p><h1>Powerful software.<br>Free to use.<br><span>Right in your browser.</span></h1><p>Discover and use browser-based alternatives to popular desktop applications. No installation for the browser tools. Optional bank connections require separately configured services.</p><a class="directory-button" href="apps/#applications">Explore Applications</a><a href="#how-it-works">How It Works</a></section>'
    featured = '<section><h2>Start with a focused tool</h2><p>Featured by the project maintainer. Read the limits before you launch.</p><div class="directory-grid">'+''.join(card(a) for a in apps if a['Featured'])+'</div></section>'
    recent = '<section><h2>Recently added</h2><p>Catalog registration dates from repository history.</p><div class="directory-grid">' + ''.join(card(a) for a in sorted(sorted((a for a in apps if a['DateAdded']), key=lambda a: a['Name']), key=lambda a: a['DateAdded'], reverse=True)[:3]) + '</div></section>'
    options = ''.join(f'<option>{e(c)}</option>' for c in categories)
    directory = '<section id="applications"><h2>Find your next tool</h2><div class="directory-filters"><label>Search applications<input id="search" type="search" placeholder="Try photo, PDF, or spreadsheet"></label><label>Category<select id="category"><option value="">All categories</option>'+options+'</select></label><label>Sort<select id="sort"><option value="name">Name A–Z</option><option value="category">Category</option><option value="recent">Recently added</option></select></label></div><p id="results" role="status">'+str(len(apps))+' applications. Sort by name, category or date added.</p><div class="directory-grid" id="catalog">'+''.join(card(a) for a in sorted(apps,key=lambda a:a['Name']))+'</div><p id="empty" hidden>No matching applications. Try another search or category.</p></section>'
    how = '<section id="how-it-works"><h2>From idea to open app</h2><ol class="directory-steps"><li><h3>Find an application</h3><p>Compare features, licensing, and limitations.</p></li><li><h3>Open it in your browser</h3><p>Only the selected editor loads its engine.</p></li><li><h3>Start creating</h3><p>Try a small project. Save or export before leaving.</p></li></ol><p>Independent tools and integrations. Comparable products are references to workflows, not promises of full feature parity or affiliation.</p></section>'
    script = '<script src="js/discovery.js" defer></script>'
    page('', 'AICraft · Free browser-based creative tools', 'Discover free browser-based tools for photos, PDFs, documents, spreadsheets and more. Compare features and limitations, then open an app.', hero+featured+recent+directory+how, script=script)
    page('apps/', 'Explore free browser applications · AICraft', 'Search AICraft applications by category, features and comparable desktop software. Free access with no installation.', '<h1>Explore applications</h1>'+directory+how, script=script)
    for a in apps:
        features = ''.join('<li>'+e(f)+'</li>' for f in a['Features'])
        workflow = a['Workflow'] or 'Open the lab, try the controls with a small sample, and download the result before leaving.'
        body = f'''<section class="directory-hero"><p class="eyebrow">{e(a['Category'])}</p><h1>{e(a['Name'])}</h1><p>{e(a['Description'])}</p><a class="directory-button" href="{a['Route']}/">Launch Application</a><p>{e(a['Access'])}</p></section><section class="workflow-preview" aria-label="Workflow preview"><h2>Workflow preview</h2><p>{e(workflow)}</p><p>This is a workflow description, not a screenshot of the editor.</p></section><section><h2>Available functionality</h2><ul>{features}</ul><h2>Comparable workflows</h2><p>{e(a['ComparableSoftware'])}. Independently hosted; no affiliation with the publisher of the comparable software is implied.</p><h2>Know the limitations</h2><p>{e(a['Limitations'])}</p><h2>Files and privacy</h2><p>{e(a['DataHandling'])}</p><h2>Licensing and access</h2><p>{e(a['License'])}</p><p><a href="{e(a['LicenseUrl'])}">Read upstream notices</a> · <a href="{e(a['SourceUrl'])}">Upstream source</a></p><p>{e(a['Runtime'])}{(' · Version '+e(a['Version'])) if a['Version'] else ''}</p><h2>Help improve this application</h2><p><a href="https://github.com/N8DaGr822/AICraft/issues">Report a problem or suggest an improvement</a>. Include your browser, application name and steps to reproduce. Do not attach private documents.</p></section>'''
        schema = {'@context':'https://schema.org','@type':'SoftwareApplication','name':a['Name'],'applicationCategory':a['Category'],'operatingSystem':'Web browser','description':a['Description'],'url':ORIGIN+base+'applications/'+a['Slug']+'/', 'offers':{'@type':'Offer','price':'0','priceCurrency':'USD'}}
        page('applications/'+a['Slug']+'/', a['Name']+' · Free browser application | AICraft', a['Description']+' Explore features, licensing and limitations before launching.', body, schema)
    policies = {
        'about':('About AICraft','AICraft brings focused browser labs, upstream creative editors, and bookkeeping and tax interfaces into one directory. Compare their practical limits and open the workflow you need.',[
            ('What the project provides','AICraft supplies the directory, browser hosts and custom integrations. Photo lab opens the full PhotoCraft editor; the lightweight photo workflow remains available at /photo/basic. PDF and vector labs provide focused editing workflows. Ledger Reborn and Tax Reborn keep separate browser-local records.'),
            ('Independent hosting and attribution','AICraft is independent. Upstream projects are credited on each application page, with source and license links. Original AICraft code is MIT-licensed, copyright 2026 Nathen Lentz. Third-party software, assets and branding retain their own terms. Hosting or comparing an application does not imply endorsement, affiliation or desktop feature parity.'),
            ('Project contact','The project source and public issue tracker are hosted on GitHub. Use the feedback link below for bugs, application requests and corrections to these descriptions.')]),
        'contact':('Contact and feedback','Use the project issue tracker to report bugs, request applications or suggest improvements.',[
            ('Make a report useful','Include the application, browser and version, steps to reproduce, and the expected and actual result. A small synthetic example is useful when a problem depends on a file.'),
            ('Keep private information out of reports','GitHub issues are public and require a GitHub account to submit. Do not post private documents, ledger backups, tax returns, bank exports, credentials or personal records. Remove names, account details and unrelated tabs from screenshots. The issue tracker is a public feedback channel, not a private support inbox.')]),
        'privacy':('Privacy and data handling','Data handling differs between browser-local editors and the optional connected-bank service. Read the relevant application page before opening sensitive files.',[
            ('Browser tools and saved work','The lightweight photo, PDF and vector labs process their work in browser workers without uploading it. Photo lab opens the upstream PhotoCraft editor; save or export documents before leaving because it has no browser autosave or crash recovery. Other upstream editors control their own saving and storage. Browser data is device-specific and can be cleared or evicted; keep downloaded backups.'),
            ('Local bookkeeping and tax records','Ledger stores its books in browser IndexedDB and downloads its Python runtime from jsDelivr when opened. My Company shares its book with the quick Ledger view; Synthetic Test Company is separate. Tax Reborn runs in offline mode with local saved returns, independent of Ledger. Local books and tax returns are not uploaded to or synchronized with the bank service.'),
            ('Optional connected-bank service','The bank feed opens on a separate Azure website and is restricted to configured, authorized Microsoft accounts. Microsoft handles sign-in and Plaid handles bank linking. The service stores a Microsoft account identifier, bank account information, synchronized transactions and encrypted provider access tokens in Azure SQL. You can download selected transactions as JSON and manually import that file into local Ledger for review; importing does not post accounting entries automatically.'),
            ('Disconnecting and deleting data','Disconnect removes the bank connection and its live feed records from the service. Database backups retain data according to the configured Azure retention settings. Disconnect does not remove downloaded bank exports, local Ledger records or saved backups. Those copies remain on your device until you remove them. Signing out alone does not delete the saved bank feed.'),
            ('Hosting, third parties and shared storage','GitHub Pages receives requests for this website. jsDelivr receives requests for the Ledger runtime. The bank site serves its bundled Microsoft sign-in library from its own origin; Microsoft and Plaid receive requests when their services are used. The AICraft directory adds no analytics or advertising code. The upstream editors have not had a complete runtime network/privacy audit; optional downloads may contact other providers. Embedded editors share this site’s origin and are not isolated from its browser storage. The bank site is hosted separately.')]),
        'terms':('Terms of use','AICraft provides free access to experimental browser tools. Review each application’s limitations and upstream licenses before use.',[
            ('Using the tools','Save backups and verify exported results; availability, accuracy and desktop compatibility are not guaranteed. You remain responsible for the files you use and the rights needed to use them. Browser storage is not a backup service.'),
            ('Bookkeeping, tax and bank access','Ledger does not execute payments or file taxes. Tax Reborn is an experimental tax year 2025 preparation interface with no electronic filing; it does not share data with Ledger. The optional bank feed requires configured services and an authorized account; Microsoft, Plaid and hosting services have their own terms and may involve provider costs.'),
            ('Software and attribution','Original AICraft code is licensed under MIT, copyright 2026 Nathen Lentz. Third-party components, fonts, other assets and branding retain their separate licenses and notices. Source availability and permitted use differ by component; these disclosures do not replace the applicable license terms.')])
    }
    for slug,(title,intro,sections) in policies.items():
        detail = ''.join('<section><h2>'+e(heading)+'</h2><p>'+e(text)+'</p></section>' for heading,text in sections)
        page(slug+'/', title+' · AICraft', intro, '<h1>'+e(title)+'</h1><p>'+e(intro)+'</p>'+detail+'<p><a href="https://github.com/N8DaGr822/AICraft/issues">Project issues and feedback</a> · <a href="https://github.com/N8DaGr822/AICraft/blob/main/THIRD-PARTY-NOTICES.md">Third-party notices</a></p>')
    # GitHub Pages: Physical editor entry points return HTTP 200 without changing runtime ownership.
    for route in [a['Route'] for a in apps] + ['counter', 'weather', 'photo', 'photo/basic']:
        target = root / route / 'index.html'
        target.parent.mkdir(parents=True, exist_ok=True)
        editor_shell = shell.replace('</head>', '<meta name="robots" content="noindex,follow"></head>')
        target.write_text(editor_shell, encoding='utf-8')
    sitemap = Element('urlset', xmlns='http://www.sitemaps.org/schemas/sitemap/0.9')
    for url in urls:
        SubElement(SubElement(sitemap, 'url'), 'loc').text = url
    ElementTree(sitemap).write(root/'sitemap.xml', encoding='utf-8', xml_declaration=True)
    (root/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: '+ORIGIN+base+'sitemap.xml\n', encoding='utf-8')

if __name__ == '__main__':
    root = Path(sys.argv[1])
    generate(root, sys.argv[2], (root/'index.html').read_text(encoding='utf-8'))
