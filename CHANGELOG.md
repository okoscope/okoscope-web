# Changelog

All notable changes to Okoscope Web are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Application Activity once again presents exact DNS inventory identities in its main list while
  its non-interactive overview groups related resolver questions so repeated Kubernetes search
  variants do not hide other frequently observed destinations.

### Added

- Application Activity now distinguishes process creation, executable execution, and leader
  termination, and presents bounded named-thread lifecycle aggregates with explicit baseline,
  overflow, truncation, and observation-gap evidence.

### Changed

- Moved application-wide thread activity into its own **Threads** category so it is no longer
  visually nested between an inventory category summary and that category's detailed results.
- Historical mixed process-exit evidence is labeled legacy/unclassified instead of asserting
  leader termination, and non-leader thread exits no longer appear as stopped processes when the
  backend reports classified lifecycle evidence.

## [0.3.7] - 2026-09-18

### Fixed

- Restored selecting and clearing logical DNS destinations from the Application Activity
  distribution while keeping the aggregate Other bucket non-interactive.

## [0.3.6] - 2026-09-18

### Changed

- Present Application inventory domains as logical DNS destinations with expandable exact DNS
  resolution variants, while preserving raw evidence and policy identities.

## [0.3.3] - 2026-09-17

### Fixed

- Kept Application resource-chart release markers and zero-value milestone labels inside the
  plotting area so they no longer overlap axis labels.

## [0.3.2] - 2026-09-17

### Changed

- Simplified the Application observation-health summary by removing the credential last-used
  timestamp while retaining credential usage details in the credentials table.

## [0.3.1] - 2026-09-15

### Fixed

- Kept capability-name tooltips visible above the horizontally scrollable agent capability row.

### Changed

- Grouped Application inventory destinations, domains, system calls, and file activity by
  canonical behavior across process threads, retained each raw occurrence's process command in
  details, and made matching policies thread-independent within their placement scope.
- Replaced collapsed agent capability labels with an always-visible icon row that shows the full
  supported capability set, dims inactive capabilities, and provides localized accessible
  tooltips.

## [0.2.3] - 2026-09-14

### Fixed

- Kept runtime-group event names distinct by moving status and policy badges to a dedicated row
  and replacing repeated inbound event labels with compact ACCEPT and LISTEN indicators.
- Displayed the exact process identity in lifecycle termination headings and activity
  visualizations while retaining the evidence source indicator.
- Replaced textual kernel and Kubernetes source suffixes in lifecycle activity summaries with
  compact cyan source icons and keyboard-accessible tooltips.
- Kept organization invitation and project creation buttons compact and aligned with their
  adjacent fields on wider screens.
- Limited Application health diagnostics to losses and delivery outcomes assigned to the selected
  workload, removed node-wide counters from Application pages, and removed compatibility UI for
  agents that omit the now-required scoped diagnostic snapshot.

## [0.2.2] - 2026-09-14

### Fixed

- Rendered missing heartbeat intervals as solid yellow outlined segments matching the received
  interval geometry and shortened the legend label.

## [0.2.1] - 2026-09-09

### Added

- Application observation-health summaries with server-derived freshness,
  reporting-node counts, and actionable reasons when evidence is absent.
- Agent health cards with advertised capabilities, Application-stream state,
  accepted-event evidence, and explicitly node-wide diagnostics.
- Accessible heartbeat timelines for 1-hour, 6-hour, and 24-hour ranges with
  received, missing, unavailable, diagnostic-increase, and reset markers.
- Complete English and Russian presentation for health states, capabilities,
  diagnostics, coverage, and recommended actions.

### Changed

- Application agent data refreshes every 30 seconds while retaining the prior
  successful result during background failures.
- Agent freshness now follows the server-provided bound instead of a
  client-owned inactivity threshold.

[Unreleased]: https://github.com/okoscope/okoscope-web/compare/v0.3.7...HEAD
[0.3.7]: https://github.com/okoscope/okoscope-web/compare/v0.3.6...v0.3.7
[0.3.6]: https://github.com/okoscope/okoscope-web/compare/v0.3.5...v0.3.6
[0.3.3]: https://github.com/okoscope/okoscope-web/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/okoscope/okoscope-web/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/okoscope/okoscope-web/compare/v0.2.3...v0.3.1
[0.2.3]: https://github.com/okoscope/okoscope-web/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/okoscope/okoscope-web/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/okoscope/okoscope-web/compare/v0.2.0...v0.2.1
