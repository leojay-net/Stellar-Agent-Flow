import re
import os

fp = os.path.join("agentflow", "HOW_IT_WORKS.md")
with open(fp, "r", encoding="utf-8") as file_handle:
    content = file_handle.read()

# Replace block 1 (which now has empty spaces instead of robots and screens due to emoji stripping)
content = re.sub(r'```[\s\S]*?┌─*┐[\s\S]*?= An Agent[\s\S]*?└─*┘[\s]*?```', '''```mermaid
flowchart LR
    subgraph Canvas [The Canvas - Where everything happens]
        direction LR
        Agent1[Agent: Data Fetcher] --> Agent2[Agent: Strategist]
        Agent2 --> Agent3[Agent: Executor]
    end
```''', content, flags=re.MULTILINE)

# Replace block 2
content = re.sub(r'```[\s\S]*?THE OLD WAY[\s\S]*?YOU doing everything manually[\s\S]*?```', '''```mermaid
flowchart TD
    User([You doing everything manually])
    Lido[Lido Website]
    Price[Price Oracle Website]
    Uniswap[Uniswap Website]
    
    User -- Connections, Clicks, Copy/Paste --> Lido
    User -- Check prices --> Price
    User -- Execute Swaps --> Uniswap
```''', content, flags=re.MULTILINE)

# Replace block 3
content = re.sub(r'```[\s\S]*?Step 1: Drag "Lido Staker"[\s\S]*?Total: Under 2 minutes(.*?)```', '''```mermaid
flowchart LR
    1[1. Drag Lido Staker] --> 2[2. Drag Venice Yield]
    2 --> 3[3. Drag Uniswap V3]
    3 --> 4[4. Connect lines]
    4 --> 5((5. Run Flow))
```\n\nTotal: Under 2 minutes. And it runs automatically every time.''', content, flags=re.MULTILINE)


with open(fp, "w", encoding="utf-8") as f:
    f.write(content)

