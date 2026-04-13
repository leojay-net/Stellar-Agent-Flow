import re

with open('agentflow/HOW_IT_WORKS.md', 'r') as f:
    text = f.read()

# 1. Clean the old ascii logic if it's there
text = re.sub(r'```\n┌─.*?\n```', '''```mermaid
flowchart LR
    subgraph Canvas [The Canvas - Where everything happens]
        direction LR
        Agent1[Agent: Data Fetcher] --> Agent2[Agent: Strategist]
        Agent2 --> Agent3[Agent: Executor]
    end
```''', text, flags=re.DOTALL)

text = re.sub(r'```\n                    THE OLD WAY.*?\n```', '''```mermaid
flowchart TD
    User([You doing everything manually])
    Lido[Lido Website]
    Price[Price Oracle Website]
    Uniswap[Uniswap Website]
    
    User -- Connections, Clicks, Copy/Paste --> Lido
    User -- Check prices --> Price
    User -- Execute Swaps --> Uniswap
```''', text, flags=re.DOTALL)

text = re.sub(r'```\nStep 1: Drag "Lido.*?\n```', '''```mermaid
flowchart LR
    1[1. Drag Lido Staker] --> 2[2. Drag Venice Yield]
    2 --> 3[3. Drag Uniswap V3]
    3 --> 4[4. Connect lines]
    4 --> 5((5. Run Flow))
```''', text, flags=re.DOTALL)

# Add Agent X
if "11. Agent X - Your AI Co-Pilot (Explained with Chats)" not in text:
    chat_section = """## 11. Agent X - Your AI Co-Pilot (Explained with Chats)

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
    # Replace section 11
    text = re.sub(r'## 11\. Agent X.*?## 12\.', chat_section + "\n\n## 12.", text, flags=re.DOTALL)

with open('agentflow/HOW_IT_WORKS.md', 'w') as f:
    f.write(text)
