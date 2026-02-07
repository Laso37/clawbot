# Server Security Hardening Reference

**Server:** Hostinger VPS
**OS:** Ubuntu 24.04.3 LTS (Noble Numbat)
**Date applied:** 2026-02-07

---

## Changes Made

### 1. Non-root sudo user (`deployer`)

- Created user `deployer` with passwordless sudo
- SSH authorized_keys copied from root
- Home: `/home/deployer`
- Config: `/etc/sudoers.d/deployer`

```
ssh deployer@<your-server-ip>
sudo -i   # to get root shell
```

### 2. SSH Hardening

- **Config file:** `/etc/ssh/sshd_config.d/01-hardening.conf`
- Removed conflicting drop-ins: `50-cloud-init.conf`, `60-cloudimg-settings.conf`
- Commented out `PermitRootLogin yes` in `/etc/ssh/sshd_config`

| Setting | Value |
|---|---|
| PermitRootLogin | prohibit-password (key-only) |
| PasswordAuthentication | no |
| PubkeyAuthentication | yes |
| MaxAuthTries | 3 |
| MaxSessions | 5 |
| LoginGraceTime | 60s |
| X11Forwarding | no |
| AllowTcpForwarding | no |
| AllowAgentForwarding | no |
| ClientAliveInterval | 300s (5 min idle timeout) |
| ClientAliveCountMax | 2 |
| Ciphers | chacha20-poly1305, aes256-gcm, aes128-gcm |
| MACs | hmac-sha2-512-etm, hmac-sha2-256-etm |
| LogLevel | VERBOSE |

### 3. UFW Firewall

- **Default policy:** deny incoming, allow outgoing
- **Allowed ports:**

| Port | Protocol | Purpose |
|---|---|---|
| 22 | TCP | SSH |
| 80 | TCP | HTTP (redirects to HTTPS) |
| 443 | TCP | HTTPS |

> **Note:** Only Traefik publishes ports 80/443 to the host. All other services (Authelia, OpenClaw, Dashboard, Ollama) are internal to the Docker network and accessed exclusively through Traefik reverse proxy.

To add a new port later:
```bash
ufw allow <port>/tcp comment 'Description'
```

To remove a port:
```bash
ufw status numbered
ufw delete <rule-number>
```

### 4. Fail2Ban

- **Config file:** `/etc/fail2ban/jail.local`
- **Ban action:** ufw (integrates with firewall)

| Jail | MaxRetry | BanTime | FindTime |
|---|---|---|---|
| sshd | 3 | 1 hour | 10 min |
| recidive | 3 | 1 week | 24 hours |

Useful commands:
```bash
fail2ban-client status              # list jails
fail2ban-client status sshd         # show banned IPs
fail2ban-client set sshd unbanip <IP>  # unban an IP
```

### 5. Automatic Security Updates

- **Config file:** `/etc/apt/apt.conf.d/51-custom-unattended`
- Security patches auto-installed
- Old kernels and unused dependencies auto-removed
- **Auto-reboot at 03:00** if a kernel update requires it

### 6. Kernel & Network Hardening

- **Config file:** `/etc/sysctl.d/99-hardening.conf`

| Setting | Value | Purpose |
|---|---|---|
| rp_filter | 1 | IP spoofing protection |
| tcp_syncookies | 1 | SYN flood protection |
| accept_redirects | 0 | Block ICMP redirect attacks |
| send_redirects | 0 | Don't send ICMP redirects |
| accept_source_route | 0 | Block source-routed packets |
| icmp_echo_ignore_broadcasts | 1 | Ignore broadcast pings |
| log_martians | 1 | Log suspicious packets |
| ip_forward | 1 | Kept ON for Docker |
| dmesg_restrict | 1 | Only root can read dmesg |
| kptr_restrict | 2 | Hide kernel pointers |
| yama.ptrace_scope | 2 | Restrict process tracing |

### 7. Docker Security

- **Config file:** `/etc/docker/daemon.json`

```json
{
  "iptables": true,
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" },
  "no-new-privileges": true
}
```

- `iptables: true` — Docker manages its own iptables rules for container networking. Since only Traefik publishes ports (80/443), this is safe — no other containers are directly accessible from outside.

### 8. Cleanup

- Removed old kernel packages (`linux-headers-6.8.0-94`, etc.)
- Removed conflicting SSH drop-in configs

---

## ⚠️ Cautions & Gotchas

### SSH

- **Don't lose your SSH key.** Password auth is disabled. If you lose your key, you'll need Hostinger's VNC console to recover access.
- **AllowTcpForwarding is off.** If you need SSH tunneling (e.g., for database access), temporarily set `AllowTcpForwarding yes` in `/etc/ssh/sshd_config.d/01-hardening.conf` and restart SSH.
- **VS Code Remote SSH** needs `AllowTcpForwarding` — this is already enabled for `root` and `deployer` via a `Match` block at the bottom of `/etc/ssh/sshd_config.d/01-hardening.conf`:
  ```
  Match User root,deployer
      AllowTcpForwarding yes
  ```

### Docker + UFW

- **`"iptables": true`** lets Docker manage its own firewall rules for published ports. This is safe because only Traefik publishes ports (80/443) — all other services are internal.
- **Container-to-container networking** on the same Docker bridge works normally.
- **Container outbound** (pulling images, API calls) works normally.
- **If you add `-p <port>:<port>` to another service**, that port becomes publicly accessible even without a UFW rule. Keep all traffic behind Traefik.

### Fail2Ban

- **Don't ban yourself.** If you fail SSH login 3 times, you'll be locked out for 1 hour. Use Hostinger VNC to unban:
  ```bash
  fail2ban-client set sshd unbanip <your-ip>
  ```
- **Add your static IP to the ignore list** if you have one. Edit `/etc/fail2ban/jail.local`:
  ```
  ignoreip = 127.0.0.1/8 ::1 <your-static-ip>
  ```

### Auto-Reboot

- **The server will auto-reboot at 03:00** if a kernel update requires it. This means brief downtime. If you run critical 24/7 services, consider changing `Automatic-Reboot` to `false` in `/etc/apt/apt.conf.d/51-custom-unattended` and rebooting manually during maintenance windows.

### Hostinger Monarx Agent

- Monarx security agent is pre-installed by Hostinger (pid 2910, ports 127.0.0.1:1721 and 127.0.0.1:65529).
- **Don't remove it** — it provides malware scanning. It's bound to localhost only so it's not externally exposed.

---

## Config Files Reference

| Purpose | File Path |
|---|---|
| SSH hardening | `/etc/ssh/sshd_config.d/01-hardening.conf` |
| SSH main config | `/etc/ssh/sshd_config` |
| Firewall | `ufw status numbered` (no single file) |
| Fail2Ban | `/etc/fail2ban/jail.local` |
| Auto-updates | `/etc/apt/apt.conf.d/51-custom-unattended` |
| Sysctl hardening | `/etc/sysctl.d/99-hardening.conf` |
| Docker daemon | `/etc/docker/daemon.json` |
| Deployer sudo | `/etc/sudoers.d/deployer` |

## Quick Health Check

```bash
# Run this anytime to verify everything is working
echo "=== UFW ===" && ufw status verbose \
&& echo "=== Fail2Ban ===" && fail2ban-client status \
&& echo "=== SSH ===" && sshd -t && echo "SSH config OK" \
&& echo "=== Docker ===" && docker ps \
&& echo "=== Listening Ports ===" && ss -tulnp
```
