import sys
from pathlib import Path

p = Path('G:/streaming app/frontend/src/screens/AnimeScreen.js')
text = p.read_text(encoding='utf-8')
lines = text.split('\n')
for i, line in enumerate(lines[235:240], start=236):
    print(f'{i}: {line!r}')
