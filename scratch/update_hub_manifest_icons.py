import json

p = '/var/www/dayumi.site/dl/hub/manifest.json'
with open(p, 'r', encoding='utf-8') as f:
    d = json.load(f)

d['version'] = '0.4.1'
d['files'] = {
    'win': {
        'name': 'Dayumi-Hub-Setup-0.4.1.exe',
        'size': 116152428,
        'sha256': 'c14d52c05839273fd0d02f0364fe1d9d331c39417553eb26b8709e9bfd51652a'
    }
}
d['notes'] = 'Dayumi Hub v0.4.1 — Nouveau logo cristal violet officiel & launcher unifié'

with open(p, 'w', encoding='utf-8') as f:
    json.dump(d, f, indent=2)

print('Updated hub manifest to 0.4.1')

