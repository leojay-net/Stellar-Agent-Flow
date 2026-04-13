# How AgentFlow Works — A Complete Guide

> Written for anyone — whether you're 15, 18, or 50. No confusing jargon. Lots of examples. If you can use Instagram, you can understand this.

---

## Table of Contents

1. [What is AgentFlow?](#1-what-is-agentflow)
2. [The Problem It Solves (With Real Scenarios)](#2-the-problem-it-solves)
3. [The Big Idea — Agents](#3-the-big-idea--agents)
4. [The Canvas — Where Everything Happens](#4-the-canvas--where-everything-happens)
5. [How to Build a Workflow (Step by Step)](#5-how-to-build-a-workflow-step-by-step)
6. [Three Ways to Use AgentFlow](#6-three-ways-to-use-agentflow)
7. [Real-World Scenarios](#7-real-world-scenarios)
8. [Agent Categories Explained](#8-agent-categories-explained)
9. [The Full Agent List](#9-the-full-agent-list)
10. [How Agents Talk to Each Other (Output Chaining)](#10-how-agents-talk-to-each-other)
11. [Agent X — Your AI Co-Pilot](#11-agent-x--your-ai-co-pilot)
12. [For Developers and Other AI Agents](#12-for-developers-and-other-ai-agents)
13. [Glossary](#13-glossary)
14. [FAQ](#14-faq)

---

## 1. What is AgentFlow?

Imagine you have a team of little robot helpers. Each robot is really good at ONE thing:

- One robot checks crypto prices 📊
- One robot stakes your ETH to earn interest 🔥
- One robot swaps tokens on a DEX 🔄
- One robot thinks about the best strategy using AI 🧠
- One robot executes transactions on the blockchain ⚡

**AgentFlow lets you drag these robots onto a canvas, connect them together, and hit "Run" — and they all work together automatically, passing information from one to the next.**

Think of it like building with LEGO blocks, but instead of building a house, you're building an automated crypto workflow.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   🧱 = An Agent (a robot that does one specific job)       │
│                                                             │
│   🧱 ──→ 🧱 ──→ 🧱 = A Pipeline (agents working together)│
│                                                             │
│   🖥️ = The Canvas (where you build your pipeline)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. The Problem It Solves

### The Old Way (Hard)

Let's say you want to do something simple in crypto — like "take my ETH, earn interest on it, and when the interest grows, swap it to USDC."

Without AgentFlow, here's what you'd have to do:

```
Step 1: Go to Lido's website, connect wallet, stake ETH          (10 minutes)
Step 2: Wait for interest to build up                             (days/weeks)
Step 3: Go to a price oracle website, check ETH price             (5 minutes)
Step 4: Open a DEX like Uniswap, set up the swap                  (10 minutes)
Step 5: Review gas fees, approve tokens, confirm swap              (10 minutes)
Step 6: Check if the swap went through                             (5 minutes)

Total: 40+ minutes of clicking around on 4 different websites
       And you have to do this EVERY TIME
```

### The AgentFlow Way (Easy)

```
Step 1: Drag "Lido Staker" onto canvas
Step 2: Drag "Venice Yield Strategist" onto canvas
Step 3: Drag "Uniswap V3 Swap" onto canvas
Step 4: Connect them with lines
Step 5: Click "Run Flow"

Total: Under 2 minutes. And it runs automatically every time.
```

### Here's a Picture of the Difference

```
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


                  THE AGENTFLOW WAY
    ┌──────────┐     ┌──────────┐     ┌──────────┐
    │  Lido    │────▶│  Venice  │────▶│ Uniswap  │
    │  Staker  │     │  AI      │     │  Swap    │
    └──────────┘     └──────────┘     └──────────┘
         │               │                │
         └───────────────┴────────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  All done!   │
                  │  Automatic!  │
                  └──────────────┘
```

---

## 3. The Big Idea — Agents

An **agent** is a small program that does one specific job. That's it. Nothing more complicated.

Here are some examples:

| Agent Name           | What It Does                                         | Real-World Comparison                                |
| -------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| **Chainlink Oracle** | Checks the current price of ETH, BTC, etc.           | Like checking the stock ticker on your phone         |
| **Lido Staker**      | Stakes your ETH to earn interest                     | Like putting money in a savings account              |
| **Uniswap V3 Swap**  | Swaps one token for another                          | Like exchanging dollars for euros at the airport     |
| **Venice Reasoner**  | AI that thinks about your data privately             | Like asking a financial advisor for advice           |
| **ENS Resolver**     | Turns names like "vitalik.eth" into wallet addresses | Like looking up someone's phone number by their name |
| **Bankr Wallet**     | Checks your wallet balance                           | Like checking your bank account balance              |
| **Base TX Executor** | Sends transactions on Base chain                     | Like hitting "Send" on a bank transfer               |

### Why "Agents" and Not Just "Apps"?

The word "agent" means the program can **act on its own**. You tell it what to do once, and it does it. You don't have to babysit it.

Also, agents can **talk to each other**. When the Price Oracle finishes checking the price, it passes that price to the next agent in line. This is called **output chaining** — more on that below.

---

## 4. The Canvas — Where Everything Happens

When you open AgentFlow, you see a big dark canvas (like a whiteboard). Here's what's on the screen:

```
┌─────────────────────────────────────────────────────────────────────┐
│ ┌─ TOOLBAR ──────────────────────────────────────────────────────┐ │
│ │  AgentFlow  │  Flow Name  │        │ Run Flow │ Chat │ Logs   │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─ SIDEBAR ─┐  ┌─ CANVAS ──────────────────────────────────────┐  │
│ │            │  │                                                │  │
│ │ Search...  │  │    ┌──────────┐       ┌──────────┐           │  │
│ │            │  │    │  Lido    │──────▶│  Venice  │           │  │
│ │ ○ All      │  │    │  Staker  │       │  AI      │           │  │
│ │ ○ DeFi     │  │    └──────────┘       └────┬─────┘           │  │
│ │ ○ AI       │  │                            │                  │  │
│ │ ○ Oracle   │  │                            ▼                  │  │
│ │ ○ Identity │  │                     ┌──────────┐              │  │
│ │ ○ Payments │  │                     │ Uniswap  │              │  │
│ │            │  │                     │  Swap    │              │  │
│ │ ┌────────┐ │  │                     └──────────┘              │  │
│ │ │ Agent  │ │  │                                                │  │
│ │ │ Cards  │ │  │                                                │  │
│ │ │ Here   │ │  │                                                │  │
│ │ └────────┘ │  │                                                │  │
│ └────────────┘  └────────────────────────────────────────────────┘  │
│                                                                     │
│ ┌─ LOG PANEL ────────────────────────────────────────────────────┐ │
│ │  Step 1: Lido Staker — Completed in 2400ms — APR 3.43%       │ │
│ │  Step 2: Venice AI — Completed in 8500ms — SWAP_TO_USDC      │ │
│ │  Step 3: Uniswap Swap — Completed in 3200ms — 2.09 USDC     │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Parts of the Screen

| Part                                  | What It Is              | What You Do With It                                    |
| ------------------------------------- | ----------------------- | ------------------------------------------------------ |
| **Toolbar** (top)                     | The menu bar            | Name your flow, run it, open chat, see logs            |
| **Sidebar** (left)                    | List of all 40+ agents  | Search, filter by category, drag agents onto canvas    |
| **Canvas** (center)                   | The big workspace       | Drag agents around, draw lines between them            |
| **Log Panel** (bottom)                | Real-time execution log | Watch your flow run step by step with live results     |
| **Inspector** (right, opens on click) | Agent settings          | Click any agent on canvas to see and edit its settings |
| **Agent X Chat** (bottom-right)       | AI chat assistant       | Talk to your agents in plain English                   |

---

## 5. How to Build a Workflow (Step by Step)

### Method 1: Drag and Drop (Visual)

**Step 1: Find the agent you want**
- Look at the sidebar on the left
- Use the search bar to find agents by name (e.g., type "Lido")
- Or click a category filter (DeFi, AI, Oracle, etc.)

**Step 2: Drag it onto the canvas**
- Click and hold an agent card in the sidebar
- Drag it to the canvas area
- Let go — the agent node appears!

**Step 3: Connect agents**
- Hover over an agent node — you'll see small dots (called "handles") on the edges
- Click a handle on Agent A and drag to a handle on Agent B
- A line (edge) appears connecting them — this means "Agent A's output goes to Agent B"

**Step 4: Set parameters (optional)**
- Click on any agent node to open the Inspector panel
- Change settings like wallet address, amount, token, etc.

**Step 5: Run it!**
- Click the **"Run Flow"** button in the toolbar
- A modal pops up showing the execution order
- Enter your wallet address and amount (optional)
- Click **"Execute Pipeline"**
- Watch the Log Panel — each agent lights up green as it completes

```
Your Pipeline Building Journey:

  Empty Canvas          Add Agents           Connect Them           Run!
  ┌──────────┐      ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │          │      │  [A]  [B]    │     │  [A]──▶[B]   │     │  [A]✅▶[B]✅ │
  │          │  ──▶ │       [C]    │ ──▶ │       ↗      │ ──▶ │       ↗      │
  │          │      │              │     │  [C]─┘       │     │  [C]✅┘      │
  └──────────┘      └──────────────┘     └──────────────┘     └──────────────┘
```

### Method 2: Ask Agent X (Chat)

Instead of dragging and dropping, you can just talk to Agent X (the AI assistant):

**Step 1:** Click the purple chat bubble icon in the toolbar

**Step 2:** Type something like:
> "Build me a DeFi yield pipeline with Lido staking, Venice AI strategy, and Uniswap swap"

**Step 3:** Watch the magic happen — Agent X will:
- Clear the canvas
- Add each agent one by one (you'll see them appear in real time!)
- Draw the connections between them
- Tell you when it's ready

**Step 4:** Say "Run the pipeline" in the chat, or click Run Flow

```
 You type:  "Build me a DeFi pipeline with Lido and Uniswap"
                              │
                              ▼
 Agent X:   "I'll build that for you!"
                              │
             ┌────────────────┼─────────────────┐
             ▼                ▼                  ▼
    Adds Lido Staker   Adds Venice AI    Adds Uniswap Swap
    to canvas (0.5s)   to canvas (0.5s)  to canvas (0.5s)
             │                │                  │
             └────────────────┼─────────────────┘
                              ▼
                   Draws connections
                              │
                              ▼
               "Pipeline ready! Say 'run'"
```

---

## 6. Three Ways to Use AgentFlow

AgentFlow gives you **three different ways** to interact with it. Use whichever feels most natural:

### Way 1: Canvas (Visual — for humans who like to see things)

- Drag and drop agents
- Draw connections with your mouse
- Click to configure settings
- Best for: **Building new workflows, visual learners, first-time users**

### Way 2: Agent X Chat (Talk — for humans who like to type)

- Open the chat panel (purple icon in toolbar)
- Type commands in plain English
- Agent X builds workflows, runs agents, answers questions
- Best for: **Quick tasks, building workflows fast, running single agents**

**Example chat commands:**
| What You Type                   | What Happens                                            |
| ------------------------------- | ------------------------------------------------------- |
| "Build me a DeFi pipeline"      | Agent X creates a full workflow on the canvas           |
| "Check the price of ETH"        | Runs the Chainlink Oracle agent and shows you the price |
| "Swap 0.001 ETH to USDC"        | Runs Uniswap V3 Swap with a real quote                  |
| "Run the pipeline"              | Executes whatever is on the canvas                      |
| "Add a price oracle to my flow" | Adds a Chainlink Oracle to the existing canvas          |
| "What agents do you have?"      | Lists all available agents by category                  |

### Way 3: API (Code — for developers and other AI agents)

- Send HTTP requests to AgentFlow's API endpoints
- Run individual agents or full pipelines programmatically
- Other AI agents can call AgentFlow as a tool
- Best for: **Developers, bots, automated systems, other AI agents**

```
Which Way Should I Use?

                    ┌───────────────────┐
                    │  Are you a human? │
                    └────────┬──────────┘
                             │
                    ┌────────▼──────────┐
              ┌─ No │  Are you an AI    │ Yes ─┐
              │     │  agent or bot?    │      │
              │     └───────────────────┘      │
              │                                │
              ▼                                ▼
    ┌──────────────────┐            ┌──────────────────┐
    │  Use the API     │            │ Do you like       │
    │  (Way 3)         │            │ clicking or       │
    │                  │            │ typing?           │
    └──────────────────┘            └────────┬─────────┘
                                             │
                               ┌─────────────┼──────────────┐
                               ▼                             ▼
                    ┌──────────────────┐          ┌──────────────────┐
                    │  Clicking?       │          │  Typing?         │
                    │  Use the Canvas  │          │  Use Agent X     │
                    │  (Way 1)         │          │  Chat (Way 2)    │
                    └──────────────────┘          └──────────────────┘
```

---

## 7. Real-World Scenarios

Here are real things you can do with AgentFlow, explained like stories:

---

### Scenario 1: "I Want to Earn Interest on My ETH"

**The story:** You have some ETH sitting in your wallet doing nothing. You want it to earn interest, like a savings account. But you also want an AI to watch over it and tell you what's happening.

**The pipeline:**

```
  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
  │ Lido Staker  │──────▶│ Lido Vault   │──────▶│ Venice Yield │
  │              │       │ Monitor      │       │ Strategist   │
  │ Stakes your  │       │ Watches your │       │ AI thinks    │
  │ ETH in Lido  │       │ stETH balance│       │ about what   │
  │ to earn stETH│       │ and reports  │       │ to do next   │
  └──────────────┘       └──────────────┘       └──────────────┘

  Step 1: Lido Staker stakes 0.1 ETH → gets stETH earning 3.43% APR
  Step 2: Vault Monitor reads your balance → "You have 0.1003 stETH ($213.64)"
  Step 3: Venice AI says → "HOLD — yield is growing steadily, no action needed"
```

**How to do it:**
- Chat method: Type "Build me a Lido yield monitoring pipeline"
- Canvas method: Drag Lido Staker → Lido Vault Monitor → Venice Yield Strategist, connect them

---

### Scenario 2: "I Want to Swap ETH to USDC But I Want AI to Decide If It's a Good Time"

**The story:** You want to convert some ETH to USDC (a stablecoin pegged to the US dollar). But you don't want to do it at a bad time — maybe gas fees are too high, or the price is dipping. You want an AI to look at everything and decide: should I swap NOW, WAIT, or SKIP it?

**The pipeline:**

```
  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
  │ Chainlink    │──────▶│ Uniswap      │──────▶│ Uniswap      │
  │ Oracle       │       │ Strategy     │       │ V3 Swap      │
  │              │       │ Advisor      │       │              │
  │ Gets the     │       │ Venice AI    │       │ Actually     │
  │ current ETH  │       │ decides:     │       │ does the     │
  │ price        │       │ EXECUTE,     │       │ swap on-     │
  │              │       │ WAIT, or     │       │ chain        │
  │              │       │ SKIP         │       │              │
  └──────────────┘       └──────────────┘       └──────────────┘

  Step 1: Chainlink says → "ETH/USD = $2,146.12"
  Step 2: Strategy AI says → "EXECUTE — gas is low, price is stable, good time to swap"
  Step 3: Uniswap quotes → "0.001 ETH = 2.09 USDC, transaction ready to sign"
```

**How to do it:**
- Chat method: Type "Create a smart swap pipeline with price check, AI strategy, and Uniswap"
- Canvas method: Drag Chainlink Oracle → Uniswap Strategy Advisor → Uniswap V3 Swap

---

### Scenario 3: "I Want to Check if Someone's Identity is Legit Before Sending Them Money"

**The story:** You're building a payment system. Before you send money to someone, you want to make sure they're a real person (identity check) and that their wallet address is correct (ENS lookup). Then you send the payment on Celo (a cheap blockchain).

**The pipeline:**

```
  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
  │ ENS Resolver │──────▶│ SELF         │──────▶│ Celo Stable  │
  │              │       │ Identity     │       │ Transfer     │
  │ Turns        │       │              │       │              │
  │ "bob.eth"    │       │ Checks if    │       │ Sends $5     │
  │ into a real  │       │ the person   │       │ cUSD to the  │
  │ wallet       │       │ is verified  │       │ verified     │
  │ address      │       │ (age, nation │       │ address      │
  │              │       │ ality, etc.) │       │              │
  └──────────────┘       └──────────────┘       └──────────────┘

  Step 1: ENS Resolver → "bob.eth = 0x1234...abcd"
  Step 2: SELF Identity → "Verified: age_over_18 ✅, nationality ✅"
  Step 3: Celo Transfer → "Sent 5.00 cUSD to 0x1234...abcd ✅"
```

---

### Scenario 4: "I'm a DAO Member and I Want Automated Voting + Grant Allocation"

**The story:** You're part of a DAO (a community-run organization). You want to automatically check what proposals are being voted on, use AI to analyze them, and allocate grants to the best projects.

**The pipeline:**

```
  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
  │ Snapshot     │──────▶│ Venice       │──────▶│ Octant Grant │
  │ Voter        │       │ Reasoner     │       │ Allocator    │
  │              │       │              │       │              │
  │ Fetches      │       │ AI analyzes  │       │ Distributes  │
  │ active DAO   │       │ each proposal│       │ grants based │
  │ proposals    │       │ and scores   │       │ on AI scores │
  │              │       │ them         │       │              │
  └──────────────┘       └──────────────┘       └──────────────┘

  Step 1: Snapshot finds 3 active proposals on governance
  Step 2: Venice AI analyzes → "Proposal A: Strong, Proposal B: Weak, Proposal C: Medium"
  Step 3: Octant allocates → "Grant weights: A=50%, B=10%, C=40%"
```

---

### Scenario 5: "I'm an AI Agent and I Want to Use AgentFlow as a Tool"

**The story:** You're an AI agent (like a GPT or Claude). You want to check a crypto price, do a swap, or run a full pipeline. You talk to AgentFlow's API.

```
  ┌──────────────────────────────────────────────┐
  │              Your AI Agent                    │
  │                                               │
  │  "I need to check the ETH price and maybe    │
  │   do a swap if it's above $2000"             │
  │                                               │
  └──────────────────┬────────────────────────────┘
                     │
                     │  POST /api/chat
                     │  { "message": "Get ETH price" }
                     │
                     ▼
  ┌──────────────────────────────────────────────┐
  │              AgentFlow                        │
  │                                               │
  │  Agent X understands your intent             │
  │  → dispatches Chainlink Oracle               │
  │  → returns: { price: $2,146.12 }            │
  │                                               │
  └──────────────────┬────────────────────────────┘
                     │
                     │  Response JSON
                     │
                     ▼
  ┌──────────────────────────────────────────────┐
  │              Your AI Agent                    │
  │                                               │
  │  "Price is $2,146 — above $2000!"            │
  │  → calls POST /api/chat                      │
  │  → "Swap 0.001 ETH to USDC"                 │
  │  → gets back a ready-to-sign transaction     │
  │                                               │
  └──────────────────────────────────────────────┘
```

---

## 8. Agent Categories Explained

All 40+ agents are organized into categories. Here's what each category means:

```
  CATEGORIES AT A GLANCE

  ┌─────────────┬─────────────┬─────────────┬─────────────┐
  │   🟢 DeFi   │   🟣 AI     │   🟡 Oracle  │   🔵 Core   │
  │ Swap, stake │ Think, plan │ Get data    │ Orchestrate │
  │ lend, earn  │ strategize  │ prices,     │ route, and  │
  │             │ privately   │ feeds       │ compose     │
  ├─────────────┼─────────────┼─────────────┼─────────────┤
  │   🩵 Identity│  🟠 Auth    │  💚 Trust    │  🔵 Chain   │
  │ ENS names,  │ MetaMask    │ Verify,     │ Send        │
  │ SELF verify │ delegation, │ ERC-8004,   │ transactions│
  │             │ Lit signing │ EigenLayer  │ on Base     │
  ├─────────────┼─────────────┼─────────────┼─────────────┤
  │  💜 Governance│  💗 Payments│  ❤️ NFT     │             │
  │ Snapshot,   │ Bankr,      │ SuperRare   │             │
  │ Octant,     │ MoonPay,    │ art and     │             │
  │ Markee      │ Celo        │ bidding     │             │
  └─────────────┴─────────────┴─────────────┴─────────────┘
```

| Category       | What It Means                                               | Example Agents                                                                |
| -------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Core**       | The backbone — manages how agents run and work together     | Orchestrator, Super Agent Composer                                            |
| **DeFi**       | Decentralized Finance — swapping, staking, lending, earning | Uniswap Swap, Lido Staker, Zyfai Solver, bond.credit                          |
| **AI**         | Artificial Intelligence — thinking, planning, strategizing  | Venice Reasoner, Venice Yield Strategist, Uniswap Strategy Advisor, Olas Mech |
| **Oracle**     | Data feeds — getting real-time info from the real world     | Chainlink Price Oracle                                                        |
| **Identity**   | Who are you? — names, addresses, verification               | ENS Resolver, SELF Identity, ENS Agent Name                                   |
| **Auth**       | Permissions — who can do what                               | MetaMask Delegation, Lit Access Control, Lit PKP Signer                       |
| **Trust**      | Can I trust this? — verification and security               | ERC-8004 Verifier, EigenCloud Exec, Olas Service, Arkhai Verifier             |
| **Chain**      | Blockchain execution — sending transactions                 | Base TX Executor                                                              |
| **Governance** | Community decisions — voting, grants, campaigns             | Snapshot Voter, Octant Impact, Octant Allocator, Markee Campaign              |
| **Payments**   | Money movement — wallets, swaps, transfers                  | Bankr Wallet, MoonPay Bridge, Celo Transfer                                   |
| **NFT**        | Digital art and collectibles                                | SuperRare Lister, SuperRare Bidder                                            |

---

## 9. The Full Agent List

Here's every agent in AgentFlow, with a one-line description of what it does:

### Core (2 agents)
| Agent                | Sponsor   | What It Does                                            |
| -------------------- | --------- | ------------------------------------------------------- |
| Orchestrator         | AgentFlow | Controls how agents run — one at a time or in parallel  |
| Super Agent Composer | AgentFlow | Bundles multiple agents into one reusable "super agent" |

### DeFi (8 agents)
| Agent               | Sponsor     | What It Does                                                              |
| ------------------- | ----------- | ------------------------------------------------------------------------- |
| Uniswap Swap        | Uniswap     | Swaps tokens using Uniswap v4 on Base                                     |
| Uniswap V3 Swap     | Uniswap     | Gets a real swap quote via Odos aggregator and builds transaction         |
| Uniswap Quoter      | Uniswap     | Gets a price quote for a token swap                                       |
| Permit2 Approver    | Uniswap     | Approves tokens for swapping without gas                                  |
| Lido Staker         | Lido        | Stakes ETH in Lido to earn interest (stETH)                               |
| Lido Yield Treasury | Lido        | Tracks yield and only sends interest to your wallet (never the principal) |
| Zyfai Solver        | Zyfai       | Finds the best execution path across all protocols                        |
| bond.credit Issuer  | bond.credit | Creates on-chain bonds (fixed income)                                     |

### AI (4 agents)
| Agent                    | Sponsor   | What It Does                                     |
| ------------------------ | --------- | ------------------------------------------------ |
| Venice Reasoner          | Venice.ai | Private AI thinking — your data is never stored  |
| Venice Yield Strategist  | Venice.ai | AI recommends what to do with your staking yield |
| Uniswap Strategy Advisor | Uniswap   | AI decides EXECUTE / WAIT / SKIP for a swap      |
| Olas Mech                | Olas      | Sends tasks to on-chain AI computation units     |

### Oracle (1 agent)
| Agent            | Sponsor   | What It Does                                |
| ---------------- | --------- | ------------------------------------------- |
| Chainlink Oracle | Chainlink | Gets live prices for ETH/USD, BTC/USD, etc. |

### Identity (3 agents)
| Agent          | Sponsor | What It Does                                               |
| -------------- | ------- | ---------------------------------------------------------- |
| ENS Resolver   | ENS     | Turns "vitalik.eth" into a wallet address                  |
| ENS Agent Name | ENS     | Gives your agent its own .eth name                         |
| SELF Identity  | SELF    | Verifies age, nationality, etc. without revealing raw data |

### Auth (5 agents)
| Agent                | Sponsor      | What It Does                                        |
| -------------------- | ------------ | --------------------------------------------------- |
| MetaMask Delegation  | MetaMask     | Lets agents act on your behalf with limits          |
| Delegation Scope     | MetaMask     | Restricts what contracts an agent can touch         |
| Sub-Delegation Chain | MetaMask     | Lets one agent give limited permissions to another  |
| Lit Access Control   | Lit Protocol | Encrypts data so only approved wallets can see it   |
| Lit PKP Signer       | Lit Protocol | Signs transactions without exposing the private key |

### Trust (4 agents)
| Agent             | Sponsor    | What It Does                                    |
| ----------------- | ---------- | ----------------------------------------------- |
| ERC-8004 Verifier | ERC-8004   | Checks an agent's trust score                   |
| EigenCloud Exec   | EigenLayer | Runs verified computations backed by EigenLayer |
| Olas Service      | Olas       | Registers autonomous agent services on-chain    |
| Arkhai Verifier   | Arkhai     | Verifies data attestations and credentials      |

### Chain (1 agent)
| Agent            | Sponsor | What It Does                              |
| ---------------- | ------- | ----------------------------------------- |
| Base TX Executor | Base    | Sends transactions on the Base blockchain |

### Governance (4 agents)
| Agent            | Sponsor  | What It Does                              |
| ---------------- | -------- | ----------------------------------------- |
| Snapshot Voter   | Snapshot | Fetches and votes on DAO proposals        |
| Octant Impact    | Octant   | Evaluates projects for public good grants |
| Octant Allocator | Octant   | Distributes grant money to projects       |
| Markee Campaign  | Markee   | Tracks referral campaign metrics          |

### Payments (7 agents)
| Agent                | Sponsor | What It Does                                        |
| -------------------- | ------- | --------------------------------------------------- |
| MoonPay Bridge       | MoonPay | Buy crypto with credit card or sell crypto for cash |
| MoonPay Swap         | MoonPay | Cross-chain token swaps and DCA                     |
| OpenWallet           | MoonPay | Creates a wallet that works on multiple chains      |
| Bankr Wallet         | Bankr   | Your agent's pre-made wallet with balances          |
| Bankr Balance        | Bankr   | Checks token balances across all chains             |
| Bankr AI Agent       | Bankr   | Natural language commands for DeFi actions          |
| Celo Transfer        | Celo    | Sends stablecoins (cUSD, cEUR) cheaply              |
| Bankr Yield Executor | Bankr   | Executes yield strategies on-chain                  |

### NFT (2 agents)
| Agent            | Sponsor   | What It Does                            |
| ---------------- | --------- | --------------------------------------- |
| SuperRare Lister | SuperRare | Browses artwork listings and sales data |
| SuperRare Bidder | SuperRare | Places bids on digital art              |

---

## 10. How Agents Talk to Each Other

This is one of the coolest parts of AgentFlow. When you connect agents in a pipeline, the **output of one agent automatically becomes the input of the next agent.** This is called **output chaining.**

### How It Works (Simple Version)

```
  Agent A runs first
       │
       │  "Hey Agent B, here's what I found: ETH = $2,146"
       │
       ▼
  Agent B receives that info and uses it
       │
       │  "Thanks! Based on that price, I recommend: EXECUTE the swap"
       │
       ▼
  Agent C receives BOTH outputs and uses them
       │
       │  "Got it! Swapping 0.001 ETH → 2.09 USDC. Transaction ready."
       │
       ▼
  Done! Each agent built on the work of the previous one.
```

### A Real Example

```
Pipeline: Chainlink Oracle → Venice AI → Uniswap Swap

  ┌─────────────────────────────────────────────────────────┐
  │  STEP 1: Chainlink Oracle                               │
  │  Input:  pricePairs = "ETH/USD"                         │
  │  Output: { price: 2146.12, pair: "ETH/USD" }           │
  └───────────────────────┬─────────────────────────────────┘
                          │
                          │  This output is passed as "_upstream"
                          │  to the next agent
                          │
  ┌───────────────────────▼─────────────────────────────────┐
  │  STEP 2: Venice AI Reasoner                              │
  │  Input:  systemPrompt = "You are a DeFi advisor"        │
  │  + _upstream = { price: 2146.12 }                       │
  │  Output: { recommendation: "EXECUTE", reason: "..." }   │
  └───────────────────────┬─────────────────────────────────┘
                          │
                          │  Both outputs flow downstream
                          │
  ┌───────────────────────▼─────────────────────────────────┐
  │  STEP 3: Uniswap V3 Swap                                │
  │  Input:  tokenIn="ETH", tokenOut="USDC", amount="0.001" │
  │  + _upstream = { recommendation: "EXECUTE", price: ... } │
  │  Output: { amountOut: "2.09", status: "tx_ready" }       │
  └─────────────────────────────────────────────────────────┘
```

### Why This Matters

Without output chaining, you'd have to manually copy results from one agent and paste them into the next. With output chaining, it's **automatic** — each agent gets all the context it needs from the agents before it.

---

## 11. Agent X — Your AI Co-Pilot

**Agent X** is the AI assistant built into AgentFlow. Think of it as a smart helper that sits in the corner of your screen and can do anything you ask.

### What Can Agent X Do?

| You Say                                 | Agent X Does                                                        |
| --------------------------------------- | ------------------------------------------------------------------- |
| "Build me a DeFi pipeline"              | Creates a full workflow on the canvas, agent by agent, in real-time |
| "Check ETH price"                       | Runs the Chainlink Oracle and shows you the result                  |
| "Swap 0.001 ETH to USDC"                | Runs Uniswap V3 Swap and gets a real quote                          |
| "Run my pipeline"                       | Executes whatever workflow is on your canvas                        |
| "What agents do you have?"              | Lists all 40+ agents organized by category                          |
| "Add a Lido Staker to my canvas"        | Places a Lido Staker node on the existing canvas                    |
| "Explain what the Venice Reasoner does" | Gives a plain English explanation of the agent                      |
| "Stake 0.01 ETH with Lido"              | Runs the Lido Staker agent directly                                 |

### How to Open Agent X

1. Look for the **purple chat bubble icon** in the toolbar (top of screen)
2. Click it — a chat panel opens in the bottom-right corner
3. Start typing!

### Agent X Can Build Workflows in Real-Time

This is the coolest feature. When you ask Agent X to build a pipeline:

1. It clears the canvas
2. It adds each agent one at a time (with a short delay so you can watch)
3. It draws the connections
4. It tells you when it's done
5. You say "run it" and it executes

You literally watch the workflow being assembled before your eyes.

---

## 12. For Developers and Other AI Agents

If you're a developer or you're building an AI agent that needs to use AgentFlow, here's how:

### Option A: Chat API (Easiest)

Send a message in plain English to the chat endpoint:

```
POST /api/chat
Content-Type: application/json

{
  "message": "Swap 0.001 ETH to USDC on Base"
}
```

You get back:
```json
{
  "reply": "I'll execute a swap for you...",
  "action": "run_agent",
  "agentId": "uniswap-v3-swap",
  "agentResult": {
    "amountOut": "2.09",
    "status": "tx_ready",
    "transaction": { ... }
  },
  "model": "Agent X"
}
```

### Option B: Direct Agent API (More Control)

Call a specific agent directly:

```
POST /api/agents/chainlink-price-oracle
Content-Type: application/json

{
  "pricePairs": "ETH/USD,BTC/USD"
}
```

You get back:
```json
{
  "ampVersion": "1.0",
  "agentId": "chainlink-price-oracle",
  "success": true,
  "result": {
    "pairs": [
      { "pair": "ETH/USD", "price": 2146.12 },
      { "pair": "BTC/USD", "price": 84231.50 }
    ]
  }
}
```

### Option C: Build a Workflow via API

Ask Agent X to build an entire workflow:

```
POST /api/chat
Content-Type: application/json

{
  "message": "Build me a yield pipeline with Lido and Venice AI"
}
```

Response includes a `flowData` blueprint:
```json
{
  "action": "build_flow",
  "flowData": {
    "flowName": "Lido Yield Pipeline",
    "agents": [
      { "id": "lido-staker" },
      { "id": "venice-yield-strategy" }
    ],
    "connections": [[0, 1]]
  }
}
```

### The AMP Message Format

All agents speak the same language — **AMP (Agent Messaging Protocol)**. This means any agent can talk to any other agent in the same format:

```json
{
  "ampVersion": "1.0",
  "flowId": "flow-abc123",
  "step": 1,
  "fromAgent": { "id": "your-agent" },
  "toAgent": { "id": "chainlink-price-oracle" },
  "payload": {
    "pricePairs": "ETH/USD"
  }
}
```

This is important because it means AgentFlow is not a closed system — **any external system can plug in** and talk to AgentFlow agents using this simple format.

---

## 13. Glossary

Words you might not know, explained simply:

| Word                  | What It Means                                                        |
| --------------------- | -------------------------------------------------------------------- |
| **Agent**             | A small program that does one specific job automatically             |
| **Canvas**            | The big workspace where you drag agents and draw connections         |
| **Pipeline**          | A sequence of connected agents that run one after another            |
| **Flow**              | Same as pipeline — a set of agents connected together                |
| **Node**              | An agent that's been placed on the canvas (the visual box)           |
| **Edge**              | The line/wire connecting two agents on the canvas                    |
| **Run Flow**          | Execute the entire pipeline from start to finish                     |
| **Output Chaining**   | When one agent's result automatically goes to the next agent         |
| **AMP**               | Agent Messaging Protocol — the standard format agents use to talk    |
| **ETH**               | Ethereum, a cryptocurrency                                           |
| **stETH**             | Staked ETH — ETH that's been staked with Lido to earn interest       |
| **USDC**              | A stablecoin worth $1 (always)                                       |
| **DEX**               | Decentralized Exchange — a place to swap tokens without a middleman  |
| **Gas**               | The fee you pay to use a blockchain                                  |
| **Wallet**            | A digital account that holds your crypto (like a bank account)       |
| **Smart Contract**    | A program that lives on the blockchain and runs automatically        |
| **DeFi**              | Decentralized Finance — banking without banks                        |
| **DAO**               | Decentralized Autonomous Organization — a community-run group        |
| **NFT**               | Non-Fungible Token — a unique digital item (like digital art)        |
| **APR**               | Annual Percentage Rate — how much interest you earn per year         |
| **Slippage**          | The difference between the expected price and actual price of a swap |
| **ENS**               | Ethereum Name Service — gives wallets human-readable names (.eth)    |
| **Base**              | A Layer 2 blockchain built on Ethereum (cheaper and faster)          |
| **Topological Order** | The smart order agents should run in based on their connections      |
| **Inspector**         | The settings panel that opens when you click an agent on the canvas  |
| **Agent X**           | The AI chat assistant built into AgentFlow                           |

---

## 14. FAQ

### "Do I need to know how to code?"
**No!** The whole point of AgentFlow is that you can build complex crypto workflows by dragging blocks and drawing lines. Or just talk to Agent X in plain English.

### "Is my data private?"
When using the **Venice AI agents**, yes — Venice.ai provides "zero retention" inference, meaning your data is never stored. Other agents make real API calls to public blockchains, which are inherently transparent.

### "Does it cost real money?"
Running flows in AgentFlow itself is free. However, if you execute real transactions on a blockchain (like staking or swapping), those transactions require gas fees paid in crypto.

### "Can I add my own custom agent?"
Yes! AgentFlow supports **community agents**. You can register a custom agent with its own HTTP endpoint and it will appear in the sidebar alongside the built-in agents.

### "What blockchains does it support?"
Primarily **Base** (an Ethereum Layer 2) and **Ethereum mainnet**. Some agents also support Polygon, Celo, Gnosis, Arbitrum, and Solana.

### "What is the difference between Uniswap Swap, Uniswap V3 Swap, and Uniswap Quoter?"
- **Uniswap Swap** — Builds swap calldata using Uniswap v4 hooks
- **Uniswap V3 Swap** — Gets a real quote via the Odos DEX aggregator and builds a ready-to-sign transaction
- **Uniswap Quoter** — Just gets a price quote (doesn't build a transaction)

### "What if an agent fails?"
The pipeline will show the error in the log panel. The failed agent turns red on the canvas. Other agents that already completed stay green. You can fix the issue and re-run.

### "Can other AI agents use AgentFlow?"
**Yes!** That's a core feature. Any AI agent (GPT, Claude, a custom bot) can call AgentFlow's `/api/chat` endpoint in plain English, or call individual agent endpoints directly. See the [SKILLS.md](SKILLS.md) file for the full integration guide.

### "How many agents can I put in a pipeline?"
There's no hard limit. You can chain 2 agents or 20 agents. The system runs them in topological order based on how you've connected them.

### "What is Agent X?"
Agent X is the AI chat assistant. It's powered by Venice.ai (with a Google Gemini fallback). It can run agents, build workflows, answer questions, and more — all through natural language.

---

## Quick Start (30 Seconds)

1. **Open AgentFlow** at `http://localhost:3000`
2. **Click the purple chat icon** in the toolbar
3. **Type:** "Build me a DeFi pipeline with Lido and Uniswap"
4. **Watch** as agents appear on the canvas in real-time
5. **Type:** "Run the pipeline"
6. **Check the log panel** at the bottom to see results

That's it. You just built and ran a multi-agent Web3 workflow. 🎉

---

*Built for the Synthesis Hackathon — targeting Lido, Bankr, Venice, Uniswap, and more.*
