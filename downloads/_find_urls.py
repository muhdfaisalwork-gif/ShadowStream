import re
with open(r"G:\streaming app\frontend\dist\_expo\static\js\web\index-82f75ba165185a6914e6d13f1fcfbb4e.js", "r", encoding="utf-8", errors="replace") as f:
    js = f.read()

print("=== space.minimax.io URLs in bundle ===")
for m in re.finditer(r"space\.minimax\.io[^\"\\s,;)]*", js):
    print(" ", m.group(0))
print()
print("=== localhost:3000 / 7801 references ===")
for m in re.finditer(r"localhost:\d+[^\"\\s,;)]*", js):
    print(" ", m.group(0))
print()
print("=== /api/v1 endpoints ===")
for m in re.finditer(r"/api/v1/[a-zA-Z0-9/_-]+", js):
    print(" ", m.group(0))
print()
print("=== total bundle size ===")
print(" ", len(js), "chars")
