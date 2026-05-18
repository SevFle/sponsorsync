# Changelog

## [Unreleased]

### Fixed
- Add missing auth guards and security headers (including CSRF protection) on dashboard page fetch calls for analytics, notification settings, and template pages

### Internal
- (integration_test) Improve integration test coverage for templates API (CRUD) and template send-preview endpoint
- (e2e_test) E2E tests for the notification system and podcast integration settings pages — both are recently implemented features