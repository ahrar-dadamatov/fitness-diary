import os
import re

directory = r"c:\Users\Админ\fitness-diary\app\(tabs)"
files = ['ai.tsx', 'explore.tsx', 'index.tsx', 'measurements.tsx', 'programs.tsx']

for file_name in files:
    path = os.path.join(directory, file_name)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace paddingTop that hardcodes ios 48 and 24
    content = re.sub(
        r"paddingTop:\s*Platform\.OS === 'ios' \? \d+ : \d+,?",
        r"paddingTop: 16,",
        content
    )
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

print("paddingTop updated.")
