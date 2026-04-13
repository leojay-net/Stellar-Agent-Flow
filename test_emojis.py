import os
import re

for root, dirs, files in os.walk('.'):
    if 'node_modules' in root or '.next' in root:
        continue
    for file in files:
        if file.endswith('.md'):
            with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                c = f.read()
            m = re.search(r'[\U00010000-\U0010ffff]|[\u2600-\u27BF]', c)
            if m:
                print(f"Emojis found in {file}")
