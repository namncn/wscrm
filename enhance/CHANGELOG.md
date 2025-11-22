## 1.1.4 - 2025-04-23

### Changed

- Call to createAccount no longer explicitly sets a PHP version.

## 1.1.3 - 2023-08-30

### Fixed

- Failure of SSO when the first account member was not the owner.

## 1.1.2 - 2023-05-28

### Fixed

- Resolved Semver conflict with WHMCS.

## 1.1.1 - 2023-04-27

### Changed

- SSO now uses $systemurl variable instead of relative link.

## 1.1.0 - 2023-04-24

### Added

- The client area now contains a link for single sign on which will
  automatically log the customer in to the Enhance control panel with the
  credentials of the organisation Owner.
- The module can now upgrade/downgrade subscriptions subject to resource constraints.

### Changed

- The module now uses a custom product field `enhanceSubscriptionId` in place of
  `subscriptionId` to store the subscription ID for future operations.

## 1.0.2 - 2022-05-02

### Changed

- dev dependency `friendsofphp/php-cs-fixer` removed to prevent Semver conflict
  with WHMCS.

## 1.0.1 - 2022-05-02

### Fixed

Module now removes any conflicting database entries for enhOrgId before
inserting.

## 1.0.0

Initial version.
