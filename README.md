<p align="center">
  <img src="https://img.shields.io/badge/FIBO-Hackathon-ff6b35?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgcnk9IjIiPjwvcmVjdD48Y2lyY2xlIGN4PSI5IiBjeT0iOSIgcj0iMiI+PC9jaXJjbGU+PHBhdGggZD0ibTIxIDE1LTMuMDg2LTMuMDg2YTIgMiAwIDAgMC0yLjgyOCAwTDYgMjEiPjwvcGF0aD48L3N2Zz4=&logoColor=white" alt="FIBO Hackathon"/>
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js 15"/>
  <img src="https://img.shields.io/badge/AI-Agents-7c3aed?style=for-the-badge&logo=openai&logoColor=white" alt="AI Agents"/>
</p>

<h1 align="center">🎨 FrameForge</h1>

<p align="center">
  <strong>AI-Powered Visual Narrative Creator</strong><br/>
  Transform your stories into stunning comics, manga, and storyboards with consistent character generation
</p>

<p align="center">
  <a href="#-the-problem">Problem</a> •
  <a href="#-the-solution">Solution</a> •
  <a href="#-key-features">Features</a> •
  <a href="#-how-it-works">How It Works</a> •
  <a href="#-getting-started">Get Started</a> •
  <a href="#-demo">Demo</a>
</p>

---

## 🎯 FIBO Hackathon Submission

**Categories:** `Best JSON-Native or Agentic Workflow` • `Best New User Experience`

FrameForge demonstrates FIBO's revolutionary JSON-native control through a **multi-agent AI system** that generates **visually consistent** comics and storyboards. By leveraging FIBO's structured prompts, we solve the fundamental challenge of AI image generation: **character and scene consistency across multiple panels**.

---

## 🔴 The Problem

Creating visual narratives (comics, manga, storyboards) with AI is **frustrating**:

- ❌ **Inconsistent characters** - Every panel generates a different-looking person
- ❌ **Lost visual identity** - Art styles drift between generations
- ❌ **Manual prompt engineering** - Hours spent tweaking prompts for each panel
- ❌ **No production workflow** - Can't scale or automate the creative process

> *"I generated 50 images and my main character looks like 50 different people."*  
> — Every AI artist ever

---

## ✅ The Solution

FrameForge uses **FIBO's JSON-native structured prompts** to maintain visual consistency:

```
┌─────────────────────────────────────────────────────────────────┐
│                    🧠 Multi-Agent System                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   📖 Story Input                                                │
│        ↓                                                        │
│   🎬 Comic Planner Agent                                        │
│        ↓ (page descriptions)                                    │
│   📋 Page Planner Agent                                         │
│        ↓ (panel plans + character/location IDs)                 │
│   🎨 Image Generator Agent ←── Original FIBO Structured Prompts │
│        ↓                       (character visual DNA)           │
│   🖼️ Consistent Panels                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### The Magic: Structured Prompt Merging

When you create a character in FrameForge, we store their **complete FIBO structured prompt** - their visual DNA:

```json
{
  "objects": [{
    "description": "Lucia, a 16-year-old Peruvian girl",
    "shape_and_color": "light tan skin, black hair, dark brown eyes",
    "clothing": "red chullo beanie with llama patterns, cream sweater",
    "texture": "smooth skin, soft knitted fabric"
  }],
  "artistic_style": "anime-inspired, clean linework",
  "lighting": { "conditions": "soft diffused", "shadows": "minimal" }
}
```

For each panel, the **Image Generator Agent**:
1. **Retrieves** original character/location structured prompts by ID
2. **Merges** them while preserving visual details (colors, textures, clothing)
3. **Adapts** only dynamic elements (pose, expression, position in frame)
4. **Generates** a consistent image via FIBO

**Result:** Your characters look the **same** across 100 panels! 🎯

---

## ⚡ Key Features

### 🤖 Intelligent Agent Pipeline

| Agent | Role | Output |
|-------|------|--------|
| **Comic Planner** | Structures story into pages | Page descriptions, panel counts, mood |
| **Page Planner** | Designs panel compositions | Scene descriptions, character actions, camera angles |
| **Image Generator** | Creates consistent visuals | FIBO structured prompts → Images |

### 🎨 Visual Consistency Engine

- **Character DNA Storage**: Full FIBO structured prompts saved per character
- **Location Memory**: Environments maintain consistent atmosphere and details
- **Style Locking**: Art style, medium, and lighting persist across all panels
- **Seed Tracking**: Original seeds stored for reproducibility

### 🖼️ Professional Comic Editor

- **Grid-based panel layout** with drag-to-resize
- **Multi-page support** with thumbnail navigation
- **Layer system** for images, text, and speech bubbles
- **Export to PNG/PDF** at multiple DPI settings

### 📊 Production-Ready Logging

Detailed agent logs show exactly what prompts are sent to FIBO:

```
════════════════════════════════════════════════════════════
═              🤖 AGENT: IMAGE GENERATOR                   ═
════════════════════════════════════════════════════════════

>>> START OF FULL PROMPT <<<

## CHARACTER: Lucía (ID: abd26626-...)
### 🎯 ORIGINAL FIBO STRUCTURED PROMPT:
{
  "objects": [{ "shape_and_color": "light tan skin, black hair..." }],
  "artistic_style": "anime-inspired..."
}

## SCENE: Walking through the Christmas plaza
## CAMERA: wide establishing shot

>>> MERGED OUTPUT TO FIBO <<<
{ ... consistent structured prompt ... }
```

---

## 🔧 How It Works

### 1. Project Setup
Define your visual world:
- **Characters**: Name, description, reference image → FIBO generates and stores their structured prompt
- **Locations**: Setting descriptions → Consistent background generation
- **Art Style**: Manga, comic, graphic novel, etc.

### 2. Story Generation
Describe your story, and our agents plan everything:
```
"A Peruvian family celebrates Christmas in Lima"
     ↓
Comic Planner: 3 pages, festive mood
     ↓
Page Planner: Panel 1 - Wide shot of plaza, Lucía and Diego walking...
     ↓
Image Generator: Merge character prompts + scene = Consistent image
```

### 3. Edit & Export
- Resize panels with intuitive controls
- Add speech bubbles and text
- Export publication-ready files

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Azure OpenAI API access (or OpenAI API)
- Bria FIBO API key

### Installation

```bash
# Clone the repository
git clone https://github.com/Abel1011/FrameForge.git
cd FrameForge

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
```

### Environment Variables

```env
# Azure OpenAI (or use standard OpenAI)
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_VERSION=2025-04-01-preview

# Bria FIBO
FIBO_API_KEY=your_fibo_api_key
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 🎬 Demo

### Creating a Comic in 3 Steps

**Step 1: Define Your Characters**
> Upload a reference or let FIBO generate one. The structured prompt is saved for consistency.

**Step 2: Describe Your Story**
> "Lucía and Diego explore a Christmas market in Lima, meeting their grandmother"

**Step 3: Generate & Edit**
> AI agents create panels with consistent characters. Tweak layouts and add dialogue.

---

## 🏗️ Architecture

```
frameforge/
├── app/
│   ├── api/
│   │   ├── generate-page/      # Main generation endpoint
│   │   ├── generate-settings/  # Character/location creation
│   │   └── generate-image/     # Single image generation
│   ├── lib/
│   │   ├── agents/
│   │   │   ├── orchestrator.js       # Agent coordination
│   │   │   ├── comicPlannerAgent.js  # Story → Pages
│   │   │   ├── pagePlannerAgent.js   # Page → Panels
│   │   │   ├── imageGeneratorAgent.js # Panel → FIBO Image
│   │   │   └── logger.js             # Detailed prompt logging
│   │   ├── fibo.js             # FIBO API integration
│   │   └── storage.js          # Project persistence
│   ├── components/
│   │   ├── GridEditor.js       # Panel layout editor
│   │   ├── ProjectSetupWizard.js # Character/location setup
│   │   └── ...
│   └── project/[id]/page.js    # Main editor view
```

---

## 🎯 Why FIBO?

FrameForge specifically leverages FIBO's unique capabilities:

| FIBO Feature | FrameForge Usage |
|--------------|------------------|
| **JSON-native prompts** | Store and merge character visual DNA |
| **Deterministic control** | Same lighting, style, composition across panels |
| **Structured objects** | Individual character details preserved in `objects[]` |
| **Professional parameters** | Camera angles, FOV match panel shot types |
| **VLM Bridge** | Natural descriptions → Structured prompts via LLM |
| **Licensed content** | Safe for commercial comic production |

### FIBO Structured Prompt Flow

```
Character Creation:
┌──────────────────┐    ┌─────────────────┐    ┌──────────────────────┐
│ "A 16-year-old   │───►│ FIBO VLM Bridge │───►│ Structured Prompt    │
│  Peruvian girl   │    │                 │    │ {objects, lighting,  │
│  with black hair"│    │                 │    │  aesthetics, ...}    │
└──────────────────┘    └─────────────────┘    └──────────┬───────────┘
                                                          │
                                                    STORED IN DB
                                                          │
Panel Generation:                                         ▼
┌──────────────────┐    ┌─────────────────┐    ┌──────────────────────┐
│ Scene: "Walking  │───►│ Merge original  │───►│ Consistent image     │
│  in plaza"       │    │ + scene context │    │ with same character! │
└──────────────────┘    └─────────────────┘    └──────────────────────┘
```

---

## 🛣️ Roadmap

- [ ] **ComfyUI Integration** - Use FrameForge as a workflow node
- [ ] **Real-time collaboration** - Multiple artists on one project
- [ ] **Animation export** - Panel-to-panel transitions
- [ ] **Custom ControlNets** - Pose consistency between panels
- [ ] **HDR/16-bit support** - Professional color workflows

---

## 🙏 Acknowledgments

- **[Bria AI](https://bria.ai/)** - For FIBO and the incredible structured prompt system
- **[OpenAI Agents SDK](https://github.com/openai/openai-agents-js)** - Multi-agent orchestration
- **[Next.js](https://nextjs.org/)** - React framework
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details

---

<p align="center">
  <strong>🎨 FrameForge: Where AI meets visual storytelling</strong><br/>
  <em>Powered by Bria FIBO • Built for creators</em>
</p>
