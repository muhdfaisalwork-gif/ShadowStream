import json

# 1. frontend/src/config/version.js
v_path = 'frontend/src/config/version.js'
with open(v_path, 'r', encoding='utf-8') as f:
    text = f.read()
text = text.replace("CURRENT_VERSION = '2.4.44'", "CURRENT_VERSION = '2.4.45'")
text = text.replace("CURRENT_CODE = 284", "CURRENT_CODE = 285")
with open(v_path, 'w', encoding='utf-8') as f:
    f.write(text)
print("[OK] frontend/src/config/version.js")

# 2. frontend/public/version.json
vj_path = 'frontend/public/version.json'
with open(vj_path, 'r', encoding='utf-8') as f:
    vj = json.load(f)
vj['version'] = '2.4.45'
vj['versionCode'] = 285
vj['releaseNotes'] = 'v2.4.45: Direct 1080p high-speed playback integration for curated Islamic & Religious History films and TV series (The Message, Prophet Joseph, Omar, Saint Mary, Bilal, The Kingdom of Solomon, Muhammad The Last Prophet, Men of Anjolos), eliminated infinite provider buffering, resilient edge stream resolution, and complete multi-lingual dub support.'
with open(vj_path, 'w', encoding='utf-8') as f:
    json.dump(vj, f, indent=2)
print("[OK] frontend/public/version.json")

# 3. frontend/public/sw.js
sw_path = 'frontend/public/sw.js'
with open(sw_path, 'r', encoding='utf-8') as f:
    sw = f.read()
sw = sw.replace("const VERSION = 'v53';", "const VERSION = 'v54';")
with open(sw_path, 'w', encoding='utf-8') as f:
    f.write(sw)
print("[OK] frontend/public/sw.js")

# 4. frontend/app.json
app_path = 'frontend/app.json'
with open(app_path, 'r', encoding='utf-8') as f:
    app_data = json.load(f)
app_data['expo']['version'] = '2.4.45'
app_data['expo']['android']['versionCode'] = 285
app_data['expo']['ios']['buildNumber'] = '285'
with open(app_path, 'w', encoding='utf-8') as f:
    json.dump(app_data, f, indent=2)
print("[OK] frontend/app.json")

# 5. packaging/windows/app/package.json
for p in ['packaging/windows/app/package.json', 'packaging/windows/app/resources/app/package.json']:
    try:
        with open(p, 'r', encoding='utf-8') as f:
            pj = json.load(f)
        pj['version'] = '2.4.45'
        with open(p, 'w', encoding='utf-8') as f:
            json.dump(pj, f, indent=2)
        print(f"[OK] {p}")
    except Exception as e:
        print(f"[SKIP] {p}: {e}")

# 6. scraper/build_android_apk.py
bld_path = 'scraper/build_android_apk.py'
with open(bld_path, 'r', encoding='utf-8') as f:
    bld = f.read()
bld = bld.replace('VERSION_NAME = "2.4.44"', 'VERSION_NAME = "2.4.45"')
bld = bld.replace('VERSION_CODE = 283', 'VERSION_CODE = 285')
bld = bld.replace('VERSION_CODE = 284', 'VERSION_CODE = 285')
with open(bld_path, 'w', encoding='utf-8') as f:
    f.write(bld)
print("[OK] scraper/build_android_apk.py")

# 7. scripts/test_player_lifecycle.js
test_path = 'scripts/test_player_lifecycle.js'
with open(test_path, 'r', encoding='utf-8') as f:
    t_text = f.read()
t_text = t_text.replace("CURRENT_VERSION = '2.4.44'", "CURRENT_VERSION = '2.4.45'")
t_text = t_text.replace("CURRENT_CODE = 284", "CURRENT_CODE = 285")
t_text = t_text.replace('version: "2.4.44"', 'version: "2.4.45"')
t_text = t_text.replace('versionCode: 284', 'versionCode: 285')
t_text = t_text.replace("const VERSION = 'v53'", "const VERSION = 'v54'")
t_text = t_text.replace("v2.4.44 (code 284, SW v53)", "v2.4.45 (code 285, SW v54)")
with open(test_path, 'w', encoding='utf-8') as f:
    f.write(t_text)
print("[OK] scripts/test_player_lifecycle.js")
