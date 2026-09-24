import os
import re

directory = r"c:\Users\Админ\fitness-diary\app\(tabs)"
files = ['ai.tsx', 'explore.tsx', 'index.tsx', 'measurements.tsx', 'programs.tsx']

for file_name in files:
    path = os.path.join(directory, file_name)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add import for useSafeAreaInsets if not present
    if 'useSafeAreaInsets' not in content:
        import_match = re.search(r"import .*?;", content)
        if import_match:
            insert_pos = content.find('\n', import_match.start()) + 1
            content = content[:insert_pos] + "import { useSafeAreaInsets } from 'react-native-safe-area-context';\n" + content[insert_pos:]
    
    # Add const insets = useSafeAreaInsets(); inside the default function
    func_match = re.search(r"export default function \w+\(\)\s*\{", content)
    if func_match and 'const insets =' not in content:
        insert_pos = func_match.end() + 1
        content = content[:insert_pos] + "  const insets = useSafeAreaInsets();\n" + content[insert_pos:]
    
    # Replace paddingTop in styles
    content = re.sub(
        r"paddingTop:\s*Platform\.OS === 'ios' \? \d+ : \d+,",
        r"paddingTop: Math.max(insets.top, 24),\n    width: '100%',\n    maxWidth: 800,\n    alignSelf: 'center',",
        content
    )
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Styles updated.")
