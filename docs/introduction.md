# Introduction

FlareLens is an open-source Cloudflare budget guard designed for anyone that wants to catch abnormal usage before it turns into an operational issue or an expensive surprise.

Cloudflare's generous free tiers and powerful paid features are excellent, but unexpected spikes in traffic or misconfigured workers can lead to unforeseen costs. FlareLens acts as an early warning system, connecting to your Cloudflare account to monitor traffic, detect anomalies, and alert you before your bill escalates.

## Core Mission

The mission of FlareLens is to provide **visibility and control** over Cloudflare usage. We believe that no one should ever be surprised by their infrastructure bill.

## Key Features

- **Automated Monitoring:** Connects to Cloudflare's GraphQL and REST APIs to pull real-time usage data.
- **Anomaly Detection:** Uses baseline calculations to identify when traffic patterns deviate from the norm.
- **Smart Alerting:** Delivers notifications through Slack, Discord, PagerDuty, and email.
- **Root Cause Attribution:** Helps identify which zone, worker, or resource is driving the increased usage.
- **Response Workflows:** Provides actionable steps and controlled response mechanisms to mitigate spikes.

## Who is FlareLens for?

- **Developers & Engineers:** Who need to monitor infrastructure costs and performance.
- **Site Reliability:** Those who want early warnings for potential DDoS attacks or misconfigurations.
- **Startups & Individual Projects:** Those who need to keep a close eye on their Cloudflare spend as they scale.
- **Open Source Projects:** Those who want to protect their infrastructure from abuse.

## How it Works (High Level)

1. **Connect:** You provide a scoped Cloudflare API token.
2. **Analyze:** FlareLens periodically polls Cloudflare for traffic and usage metrics.
3. **Detect:** Our engine calculates baselines and flags any significant deviations as anomalies.
4. **Notify:** When an anomaly is detected, FlareLens sends an alert to your configured channels.
5. **Respond:** You use the FlareLens dashboard to investigate and take action.
