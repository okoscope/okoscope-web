# Changelog

All notable changes to Okoscope Web are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Kept organization invitation and project creation buttons compact and aligned with their
  adjacent fields on wider screens.
- Limited Application health diagnostics to losses and delivery outcomes assigned to the selected
  workload, removed node-wide counters from Application pages, and made unavailable scoped
  diagnostics explicit during older-agent upgrades.

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

[Unreleased]: https://github.com/okoscope/okoscope-web/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/okoscope/okoscope-web/compare/v0.2.0...v0.2.1
