# O1 computer provider architecture

O1 should separate the computer-control protocol from the infrastructure that hosts the computer.

## Recommended production split

| Layer | Provider role | O1 responsibility |
| --- | --- | --- |
| Browser computer | Browserbase-class browser sessions | Browser lifecycle, CDP connection, screenshots, action trace, policy gates |
| Persistent general computer | Hetzner Cloud VM | Per-user workspace lifecycle, isolation, persistent disk, desktop/terminal gateway |
| Ephemeral execution sandbox | Modal Sandbox-class workload | Disposable code execution, risky build/test jobs, short-lived agents |
| Local development | Docker computer | Fast local development and deterministic smoke tests |

The model must never receive provider credentials. O1 owns a provider-neutral ComputerProvider interface and issues scoped actions through the policy/permission layer.

## Why Hetzner

Hetzner Cloud is a good fit for persistent computers because the workload is a normal Linux server/VM lifecycle rather than an LLM-specific runtime. Use it for long-lived per-user or pooled worker machines, persistent workspaces, and optional graphical desktops. The June 2026 Hetzner pricing update lists ARM CAX and x86 CPX/CCX cloud servers with hourly and monthly rates, making a pooled VM architecture practical for persistent workloads.

## Why Browserbase

For browser-only tasks, a full VM is unnecessary. A managed browser session gives O1 CDP/Playwright control, recordings/live view, and session isolation without paying for a complete desktop VM.

## Why Modal-style sandboxes

For disposable agent execution, use a sandbox primitive with explicit CPU/memory/time/network controls. The sandbox should be destroyed or recycled after the job and must not contain the user's long-lived credentials.

## O1 control loop

Model -> Mission Governor -> Permission/Policy -> Computer Provider -> Screenshot/DOM/Terminal Observation -> Model

Every write path must emit a durable action receipt. Every external side effect is subject to the selected permission mode. Browser-only tasks should stay on the browser provider; full desktop tasks should request a general computer; disposable builds should prefer a sandbox.

This document defines the target provider boundary; it does not claim that Hetzner, Browserbase, or Modal adapters are already wired into production O1.