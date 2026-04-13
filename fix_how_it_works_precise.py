import os
import re

file_path = os.path.join(os.getcwd(), 'agentflow', 'HOW_IT_WORKS.md')

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Clean emojis properly
text = re.sub(r'[\U00010000-\U0010ffff]', '', text)
text = re.sub(r'[\u2600-\u27BF]', '', text)

# 2. Replace Block 1 (The Canvas Diagram)
old_block_1 = """```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    = An Agent (a robot that does one specific job)       │
│                                                             │
│    ──  ──  = A Pipeline (agents working together)│
│                                                             │
│    = The Canvas (where you build your pipeline)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```"""
# The emojis might have been stripped from the text above. So let's match the stripped string:
old_block_1_stripped = """```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    = An Agent (a robot that does one specific job)       │
│                                                             │
│    ──  ──  = A Pipeline (agents working together)│
│                                                             │
│    = The Canvas (where you build your pipeline)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```"""
# Wait, if I just replace BEFORE stripping emojis, it's exact!

with open(file_path, "r", encoding="utf-8") as f:
    text_orig = f.read()

# Block 1
block1 = """```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   🧱 = An Agent (a robot that does one specific job)       │
│                                                             │
│   🧱 ──→ 🧱 ──→ 🧱 = A Pipeline (agents working together)│
│                                                             │
│   🖥️ = The Canvas (where you build your pipeline)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```"""
mermaid1 = """```mermaid
flowchart LR
    subgraph Canvas [The Canvas - Where you build your pipeline]
        direction LR
        Agent1[Agent: Data Fetcher] --> Agent2[Agent: Strategist]
        Agent2 --> Agent3[Agent: Executor]
    end
```"""
text_orig = text_orig.replace(block1, mermaid1)

# Block 2
block2 = """```
                    THE OLD WAY
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │  Lido    │  │  Price   │  │ Uniswap  │
    │ Website  │  │  Website │  │ Website  │
    └────┬─────┘  └────┬─────┘  └────┬─────┘
         │             │             │
         ▼             ▼             ▼
    ┌──────────────────────────────────────┐
    │    YOU doing everything manually     │
    │    clicking, copying, pasting...     │
    └──────────────────────────────────────┘
```"""
mermaid2 = """```mermaid
flowchart TD
    User([You doing everything manually])
    Lido[Lido Website]
    Price[Price Oracle Website]
    Uniswap[Uniswap Website]
    
    User -- Connections, Clicks, Copy/Paste --> Lido
    User -- Check prices --> Price
    User -- Execute Swaps --> Uniswap
```"""
text_orig = text_orig.replace(block2, mermaid2)

# Block 3
block3 = """```
Step 1: Drag "Lido Staker" onto canvas
Step 2: Drag "Venice Yield Strategist" onto canvas
Step 3: Drag "Uniswap V3 Swap" onto canvas
Step 4: Connect them with lines
Step 5: Click "Run Flow"

Total: Under 2 minutes. And it runs automatically every time.
```"""
mermaid3 = """```mermaid
flowchart LR
    1[1. Drag Lido Staker] --> 2[2. Drag Venice Yield]
    2 --> 3[3. Drag Uniswap V3]
    3 --> 4[4. Connect lines]
    4 --> 5((5. Run Flow))
```\n\nTotal: Under 2 minutes. And it runs automatically every time."""
text_orig = text_orig.replace(block3, mermaid3)

# Block 4
block4 = """```
Your Pipeline Building Journey:

  Empty Canvas          Add Agents           Connect Them           Run!
  ┌──────────┐      ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │          │      │  [A]  [B]    │     │  [A]──▶[B]   │     │  [A]▶[B] │
  │          │  ──▶ │       [C]    │ ──▶ │       ↗      │ ──▶ │       ↗      │
  │          │      │              │     │  [C]─┘       │     │  [C]─┘      │
  └──────────┘      └──────────────┘     └──────────────┘     └──────────────┘
```"""
mermaid4 = """```mermaid
flowchart LR
    subgraph S1 [Empty Canvas]
        Empty
    end
    subgraph S2 [Add Agents]
        A
        B
        C
    end
    subgraph S3 [Connect Them]
        A2[A] --> B2[B]
        C2[C] --> B2
    end
    subgraph S4 [Run!]
        A3[A] -.-> B3[B]
        C3[C] -.-> B3
    end
    S1 --> S2 --> S3 --> S4
```"""
text_orig = text_orig.replace(block4, mermaid4)

# Block 5 - Agent X Chat
# In HOW_IT_WORKS.md, section 11 is "## 11. Agent X — Your AI Co-Pilot"
chat_section = """## 11. Agent X — Your AI Co-Pilot (Explained with Chats)

Instead of manually dragging and connecting agents, you can simply chat with Agent X. Agent X uses LLMs to understand your intent and automatically configures nodes and connections on the canvas.

### Chat Example Workflow

**User:**
"I want to take my ETH, earn interest on it using Lido, and when it grows, swap it to USDC on Uniswap."

**Agent X:**
"I can help with that. I'm building a pipeline for you right now. 
1. Added a Lido Staker agent to earn interest on your ETH. 
2. Added a Yield Strategist to monitor the accumulated interest. 
3. Added a Uniswap V3 agent to swap the yielded ETH for USDC. 
Connecting them now. Please review the pipeline on the canvas."

*(Agent X automatically updates the canvas with the correctly linked nodes)*

```mermaid
flowchart LR
    User([User]) -- "Natural Language Request" --> AgentX{Agent X AI}
    AgentX -- "Generates Pipeline" --> Canvas[(AgentFlow Canvas)]
    Canvas --> Lido[Lido Staker Node]
    Canvas --> Strat[Venice Strategy Node]
    Canvas --> Uni[Uniswap V3 Node]
    Lido --> Strat
    Strat --> Uni
```

**User:**
"Can we also add a price check before swapping?"

**Agent X:**
"Sure thing. I have inserted a Price Oracle node between the Strategist and Uniswap. The swap will now only execute if the price condition is met."

*(The canvas updates immediately, adding a new node without breaking the flow)*
"""

text_orig = re.sub(r'## 11\. Agent X.*?## 12\.', chat_section + '\n\n## 12.', text_orig, flags=re.DOTALL)

# Now strip emojis
text_cleaned = re.sub(r'[\U00010000-\U0010ffff]', '', text_orig)
text_cleaned = re.sub(r'[\u2600-\u27BF]', '', text_cleaned)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text_cleaned)

print("HOW_IT_WORKS.md successfully rewritten exactly.")
