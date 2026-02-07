# OpenClaw Workspace & Skills Guide

How to customize your OpenClaw agent, add capabilities, and get the most out of it.

---

## Workspace Files

The workspace is the agent's home directory. OpenClaw loads specific files at session start to shape the agent's behavior. Your workspace lives at `openclaw/workspace/` (mapped to `~/.openclaw/workspace` inside the container).

### File Map

| File | Purpose | When Loaded | Status |
|---|---|---|---|
| `SOUL.md` | Persona, tone, boundaries | Every session | ✅ exists |
| `USER.md` | Who the user is, preferences | Every session | ✅ exists |
| `AGENTS.md` | Operating instructions — how to use memory, priorities, rules | Every session | ❌ missing |
| `IDENTITY.md` | Agent name, vibe, emoji (created during bootstrap) | Every session | ❌ missing |
| `TOOLS.md` | Notes about available local tools & conventions (guidance only) | Every session | ❌ missing |
| `HEARTBEAT.md` | Tiny checklist for heartbeat runs | Each heartbeat | ❌ missing |
| `BOOT.md` | Startup checklist on gateway restart | Gateway restart | ❌ missing |
| `BOOTSTRAP.md` | One-time first-run ritual (delete after) | First run only | ❌ missing |
| `MEMORY.md` | Curated long-term memory | Main session only | ❌ missing |
| `memory/YYYY-MM-DD.md` | Daily memory logs | Session start | auto-created |

### What Each File Does

**`AGENTS.md`** — The most important missing file. This is where you tell the agent *how to operate*: what to prioritize, how to handle memory, what workflows to follow. Think of `SOUL.md` as *whPo* the agent is and `AGENTS.md` as *how* it should work.

**`TOOLS.md`** — Document what local tools are available (docker, git, curl, node, python, etc.). This doesn't grant or restrict access — it's guidance so the agent knows what it *can* use. Actual tool access is controlled by `tools.allow`/`tools.deny` in `openclaw.json`.

**`HEARTBEAT.md`** — Your agent runs a heartbeat every hour (configured in `openclaw.json`). This file tells it what to check. Keep it very short — heartbeats use the free local Ollama model with a 300-character max acknowledgment.

**`BOOT.md`** — Runs once on gateway restart. Example uses: send a "back online" notification, check for missed messages, verify services are running.

**`IDENTITY.md`** — Short file giving the agent a name and personality. Gets created during the bootstrap ritual or you can write it yourself.

---

## Skills — Giving OpenClaw Real Power

Skills teach the agent how to use tools. Each skill is a folder containing a `SKILL.md` file with YAML frontmatter and instructions. This is how you go from a chatbot to an agent that can actually *do things*.

### Where Skills Live

Skills load from three locations (highest precedence wins):

1. **`<workspace>/skills/`** — per-agent, you control these (highest priority)
2. **`~/.openclaw/skills/`** — shared across all agents on the machine
3. **Bundled skills** — shipped with OpenClaw (lowest priority)

If the same skill name exists in multiple locations, workspace wins.

### Getting Skills from ClawHub

[ClawHub](https://clawhub.com) is the public skills registry. Browse it for ready-made skills.

```bash
# Install a skill into your workspace
clawhub install <skill-slug>

# Update all installed skills
clawhub update --all

# Sync (scan + publish updates for your own skills)
clawhub sync --all
```

By default, `clawhub install` puts skills into `./skills/` under your current directory. OpenClaw picks them up on the next session.

### Writing Your Own Skill

Create a folder under `<workspace>/skills/<your-skill-name>/` with a `SKILL.md` file:

```
workspace/
  skills/
    my-deploy-tool/
      SKILL.md
      deploy.sh        # optional helper scripts
    my-search/
      SKILL.md
```

#### Minimal `SKILL.md`

````markdown
---
name: my-deploy-tool
description: Deploy services using docker compose
---

## Instructions

When the user asks you to deploy or restart services, run:

```bash
cd {baseDir}/../../ && docker compose up -d --build
```

Always confirm which services will be affected before deploying.
Report the output of `docker compose ps` after deployment.
````

#### `SKILL.md` with Gating (require specific tools/env vars)

````markdown
---
name: server-health
description: Check server health and resource usage
metadata: {"openclaw": {"requires": {"bins": ["docker", "curl"]}, "os": ["linux"]}}
---

## Instructions

When the user asks about server health, run these checks:

1. `docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"`
2. `df -h /`
3. `free -m`
4. `uptime`

Summarize the results concisely.
````

### Frontmatter Reference

| Key | Default | Description |
|---|---|---|
| `name` | required | Skill identifier |
| `description` | required | What the skill does (shown to the agent) |
| `user-invocable` | `true` | Expose as a slash command |
| `disable-model-invocation` | `false` | Exclude from model prompt (still usable via slash command) |
| `command-dispatch` | — | Set to `tool` to bypass the model and dispatch directly |
| `command-tool` | — | Tool name for direct dispatch |
| `metadata` | — | JSON object for gating (see below) |

### Gating Options (under `metadata.openclaw`)

| Key | Description |
|---|---|
| `requires.bins` | List of binaries that must exist on `PATH` |
| `requires.anyBins` | At least one of these must exist |
| `requires.env` | Environment variables that must be set |
| `requires.config` | `openclaw.json` paths that must be truthy |
| `os` | Limit to platforms: `darwin`, `linux`, `win32` |
| `always: true` | Skip all gates, always load |
| `primaryEnv` | Env var name for the `apiKey` shortcut in config |

### Enabling Skills in `openclaw.json`

Skills that need API keys or custom config are toggled in `openclaw.json`:

```jsonc
{
  "skills": {
    "entries": {
      "nano-banana-pro": {
        "enabled": true,
        "apiKey": "YOUR_GEMINI_KEY",
        "env": {
          "GEMINI_API_KEY": "YOUR_GEMINI_KEY"
        }
      },
      "some-unused-skill": {
        "enabled": false
      }
    }
  }
}
```

### Token Cost of Skills

Each eligible skill adds ~97 characters + the length of its name, description, and location to the system prompt. With many skills, this can add up. Disable skills you don't use to save tokens.

---

## Practical Skill Ideas for This Setup

Given our stack (Docker, Traefik, Authelia, Next.js dashboard, Ollama), useful custom skills could include:

| Skill | What It Would Do |
|---|---|
| `docker-status` | Check running containers, restart failed ones |
| `traefik-check` | Verify routing rules, check for certificate issues |
| `backup` | Trigger workspace/config backups |
| `deploy` | Rebuild and restart services via `docker compose` |
| `log-reader` | Tail and summarize container logs |
| `server-health` | Disk, memory, CPU, uptime checks |
| `dashboard-dev` | Run linting, type-checking, or builds on the Next.js dashboard |

---

## Quick Reference: What Controls What

| Want to... | Where to configure |
|---|---|
| Change agent personality | `workspace/SOUL.md` |
| Change user preferences | `workspace/USER.md` |
| Set operating instructions | `workspace/AGENTS.md` |
| Document available tools | `workspace/TOOLS.md` |
| Add tool capabilities | `workspace/skills/<name>/SKILL.md` |
| Allow/deny specific tools | `openclaw.json` → `tools.allow` / `tools.deny` |
| Configure heartbeat | `openclaw.json` → `agents.defaults.heartbeat` |
| Set model routing | `openclaw.json` → `agents.defaults.models` |
| Add API keys for skills | `openclaw.json` → `skills.entries.<name>.apiKey` |

---

## Further Reading

- [Agent Workspace docs](https://docs.openclaw.ai/concepts/agent-workspace) — full workspace file reference
- [Skills docs](https://docs.openclaw.ai/tools/skills) — skill format, gating, config
- [ClawHub](https://clawhub.com) — browse and install community skills
- [Multi-Agent Routing](https://docs.openclaw.ai/concepts/multi-agent) — multiple agents with isolated workspaces
- [Sandboxing](https://docs.openclaw.ai/gateway/sandboxing) — isolate agent tool access
- [Token Optimization Guide](OpenClaw%20Token%20Optimization%20Guide.md) — reduce API costs by 97%
