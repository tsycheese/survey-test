#!/usr/bin/env python3
"""
Convert listings environments to minted environments in LaTeX files.
"""

import re
from pathlib import Path

# Language mapping: listings -> minted (lowercase)
LANG_MAP = {
    'TypeScript': 'typescript',
    'CSS': 'css',
    'bash': 'bash',
}

def convert_file(filepath: Path) -> bool:
    content = filepath.read_text(encoding='utf-8')
    original = content

    # Pattern: \begin{minted}[linenos, caption={YYY}]{xxx}
    # Replace with: \begin{minted}[linenos]{xxx} ... \end{minted}\captionof{listing}{YYY}
    def replace_minted_block(match):
        options = match.group(1)
        lang = match.group(2)
        
        # Extract caption from options
        caption_match = re.search(r'caption=(\{[^}]*\})', options)
        if caption_match:
            caption = caption_match.group(1)
            # Remove caption from options
            options = re.sub(r',?\s*caption=\{[^}]*\}', '', options)
            options = options.strip().strip(',')
            
            if options:
                return f'\\begin{{minted}}[{options}]{{{lang}}}'
            else:
                return f'\\begin{{minted}}{{{lang}}}'
        
        return match.group(0)

    # First, fix the begin lines
    content = re.sub(
        r'\\begin\{minted\}\[(.*?)\]\{(\w+)\}',
        replace_minted_block,
        content
    )
    
    # Then, add \captionof after \end{minted} for blocks that had captions
    # We need to track which ones had captions - this is trickier
    # Let's re-read and do a block-by-block replacement
    
    content = original  # Reset
    
    # Find all lstlisting blocks and replace them properly
    def replace_lstlisting_block(match):
        full_match = match.group(0)
        begin_line = match.group(1)
        code = match.group(2)
        
        # Parse the begin line
        lang_match = re.search(r'language=(\w+)', begin_line)
        caption_match = re.search(r'caption=(\{[^}]*\})', begin_line)
        
        lang = LANG_MAP.get(lang_match.group(1), lang_match.group(1).lower()) if lang_match else 'text'
        caption = caption_match.group(1) if caption_match else None
        
        if caption:
            return f'\\begin{{minted}}[linenos]{{{lang}}}\n{code}\\end{{minted}}\n\\captionof{{listing}}{caption}'
        else:
            return f'\\begin{{minted}}[linenos]{{{lang}}}\n{code}\\end{{minted}}'
    
    # Pattern to match lstlisting blocks
    content = re.sub(
        r'\\begin\{lstlisting\}(\[[^\]]*\])\n(.*?)\\end\{lstlisting\}',
        replace_lstlisting_block,
        content,
        flags=re.DOTALL
    )

    if content != original:
        filepath.write_text(content, encoding='utf-8')
        print(f'Converted: {filepath}')
        return True
    return False


def main():
    thesis_dir = Path(__file__).parent
    tex_files = list(thesis_dir.glob('chapters/*.tex'))

    converted = 0
    for f in tex_files:
        if f.exists() and convert_file(f):
            converted += 1

    print(f'\nTotal files converted: {converted}')


if __name__ == '__main__':
    main()
