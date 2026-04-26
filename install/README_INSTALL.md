# Botomatic Install

Botomatic includes cross-platform install helpers and a doctor command so the control plane can be installed and understood in under five minutes.

## Linux

Run:

```bash
./install/install-linux.sh
```

The Linux installer:
- detects Linux or Chromebook/Linux environment
- checks Node, npm, and Git
- runs `npm install`
- creates `~/.local/bin/botomatic`
- creates `~/.local/share/applications/botomatic.desktop`
- runs the doctor command
- prints the final launch command

## macOS

Run:

```bash
./install/install-macos.sh
```

This creates a `.command` launcher under `install/` and opens the Botomatic URL.

## Windows

Run in PowerShell:

```powershell
.\install\install-windows.ps1
```

This installs dependencies, creates a launcher batch file, creates a desktop shortcut, and opens the Botomatic URL.

## Repair

```bash
./install/repair-install.sh
```

## Uninstall

```bash
./install/uninstall.sh
```

## Doctor

```bash
./install/doctor.sh
```

or

```bash
npm run doctor
```

## Easy start

```bash
npm run start:easy
```

This runs doctor, installs dependencies if needed, starts the control plane, and opens `http://localhost:3000`.