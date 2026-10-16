---
name: agent-reach
description: |
  Agent Reach — Give your AI agent eyes to see the entire internet. Read & search Twitter, Reddit, YouTube, GitHub, Bilibili, XiaoHongShu — one CLI, zero API fees.
  92K+ stars, Python-based capability layer that routes to best-in-class backends for each platform.
  Install: `pip install git+https://github.com/Panniantong/Agent-Reach.git`
  Then: `agent-reach install --env=auto --system`
  Usage: `agent-reach doctor` to verify, then ask Agent to use channels like web, youtube, twitter, github, bilibili, etc.
---

# Agent Reach Skill

## Overview
Agent Reach is a capability layer (not a tool wrapper) that gives AI agents unified access to 15+ platforms:
- **Zero-config**: web (Jina Reader), YouTube (yt-dlp), GitHub (gh CLI), RSS (feedparser), V2EX, 雪球
- **Auto-config via MCP**: Exa semantic search (free)
- **Login-required**: Twitter, Reddit, Bilibili, Facebook, Instagram, XiaoHongShu, LinkedIn, Boss直聘, 小宇宙播客

## Installation

```bash
# Install the package
pip install git+https://github.com/Panniantong/Agent-Reach.git

# Install with system dependencies and MCP registration
agent-reach install --env=auto --system

# Verify all channels
agent-reach doctor
```

## Channel Usage

Each channel exposes a simple CLI that the Agent can call directly:

```bash
# Web - read any URL
agent-reach web "https://example.com"

# YouTube - get transcript
agent-reach youtube "https://youtube.com/watch?v=..." --subtitles

# YouTube - search
agent-reach youtube search "LLM framework comparison" --max-results 5

# GitHub - repo info
agent-reach github repo "owner/repo"

# GitHub - search
agent-reach github search "vector database python" --max-results 10

# Twitter - read tweet
agent-reach twitter "https://twitter.com/user/status/..."

# Twitter - search (requires login config)
agent-reach twitter search "AI agents" --max-results 20

# Bilibili - search
agent-reach bilibili search "AI 教程" --max-results 10

# Bilibili - get video info
agent-reach bilibili "https://bilibili.com/video/BV..."

# Reddit - search (requires login)
agent-reach reddit search "LLM agents" --max-results 10

# GitHub - get file content
agent-reach github file "owner/repo" "path/to/file.py"

# RSS - parse feed
agent-reach rss "https://example.com/feed.xml"

# Exa semantic search (via MCP)
agent-reach exa search "latest LLM frameworks 2026" --max-results 10

# XiaoHongShu (requires login)
agent-reach xiaohongshu search "护肤推荐" --max-results 10

# LinkedIn (requires login)
agent-reach linkedin search "AI engineer" --max-results 10

# RSS
agent-reach rss "https://feeds.feedburner.com/TechCrunch"

# V2EX
agent-reach v2ex hot
agent-reach v2ex node "python"

# 雪球
agent-reach xueqiu stock "AAPL"
agent-reach xueqiu search "AI概念股"

# 小宇宙播客 (requires login)
agent-reach xiaoyuzhou search "AI播客" --max-results 10
```

## Login Configuration (for gated platforms)

```bash
# Twitter
agent-reach configure twitter --cookie-editor

# Reddit (requires OpenCLI + browser session)
agent-reach configure reddit

# Bilibili
agent-reach configure bilibili

# XiaoHongShu
agent-reach configure xiaohongshu --cookie-editor

# Facebook/Instagram (requires OpenCLI + Chrome session)
agent-reach configure facebook
agent-reach configure instagram

# LinkedIn
agent-reach configure linkedin

# Boss直聘
agent-reach configure boss

# 小宇宙播客
agent-reach configure xiaoyuzhou
```

## Health Check

```bash
# Full diagnostic
agent-reach doctor

# Output shows:
# - Which backend is active for each channel
# - Whether login is configured
# - Any missing dependencies
# - Fix suggestions
```

## Integration with Agent Workflows

The Agent can call these commands directly. Example workflows:

### Research Task
```
User: "Research the latest AI agent frameworks on GitHub, Twitter, and YouTube"
Agent:
1. agent-reach github search "AI agent framework" --max-results 10
2. agent-reach twitter search "AI agent framework" --max-results 20
3. agent-reach youtube search "AI agent framework tutorial" --max-results 5
4. Synthesize findings
```

### Competitor Analysis
```
User: "Find what people are saying about competitor X on Reddit and Twitter"
Agent:
1. agent-reach reddit search "competitor X" --max-results 20
3. agent-reach twitter search "competitor X" --max-results 20
4. Sentiment analysis
```

### Content Monitoring
```
User: "Summarize this YouTube video and extract key points"
Agent:
1. agent-reach youtube "https://youtube.com/watch?v=..." --subtitles
2. Process transcript
3. Extract key points
```

## Configuration Files

- `~/.agent-reach/config.yaml` — Main config (channels, backends, login status)
- `~/.agent-reach/cookies/` — Platform cookies (600 permissions)
- `~/.agent-reach/mcp/` — MCP server configs

## Updating

```bash
# Update package and re-run install
pip install --upgrade git+https://github.com/Panniantong/Agent-Reach.git
agent-reach install --env=auto --system
```

## Uninstall

```bash
agent-reach uninstall [--keep-config] [--dry-run]
```

## Key Features

- **Zero API fees**: Uses free tiers, CLI tools, browser sessions
- **Auto-failover**: Each channel has primary + backup backends
- **Self-diagnosis**: `agent-reach doctor` tells you exactly what works
- **No wrapper overhead**: Agent calls CLIs directly
- **Privacy-first**: Cookies/tokens stay local (600 perms), no telemetry
- **Continuous updates**: Backends auto-swap when platforms change APIs

## Platform Support Matrix

| Platform | Zero-Config | Login Required | Backends |
|----------|-------------|----------------|----------|
| Web | ✅ Jina Reader | — | Jina Reader |
| YouTube | ✅ yt-dlp | — | yt-dlp |
| GitHub | ✅ gh CLI | Private repos | gh CLI |
| RSS | ✅ feedparser | — | feedparser |
| Exa Search | ✅ MCP | — | Exa via mcporter |
| Twitter | — | ✅ Cookie | twitter-cli → OpenCLI |
| Reddit | — | ✅ OpenCLI | OpenCLI → rdt-cli |
| Bilibili | ✅ bili-cli | Subtitles | bili-cli → OpenCLI |
| XiaoHongShu | — | ✅ Cookie | OpenCLI → xhs-mcp |
| Facebook | — | ✅ OpenCLI | OpenCLI (browser session) |
| Instagram | — | ✅ OpenCLI | OpenCLI (browser session) |
| LinkedIn | — | ✅ MCP | mcp-server-linkedin |
| V2EX | ✅ | — | V2EX API |
| 雪球 | ✅ | — | 雪球 API |
| 小宇宙 | — | ✅ Login | Whisper + login |
| Boss直聘 | — | ✅ Chrome | CDP + manual login |
| V2EX | ✅ | — | V2EX API |

## Quick Reference

```bash
# One-liner for Agent to install
帮我安装 Agent Reach：https://raw.githubusercontent.com/Panniantong/Agent-Reach/main/docs/install.md

# One-liner to update
帮我更新 Agent Reach：https://raw.githubusercontent.com/Panniantong/Agent-Reach/main/docs/update.md
```