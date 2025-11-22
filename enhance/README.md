# Enhance cPanel module 1.1.4

This is the bare minimum functionality to allow for creation, suspension and
termination of hosting subscriptions on Enhance from WHMCS.

## Installation

- Unzip this archive into the directory `modules/servers/enhance`. It must be
  called `enhance`, another directory name will not work.
- As the user under which WHMCS runs (do not do this as root!), cd into the
  `api` directory and run `composer install`. This will install the necessary
  dependencies.
- If composer is not installed globally, you can install it in the same
  directory by following the instructions on the [Composer
  website](https://getcomposer.org/download/). Then you can run `php
composer.phar install` to install the dependencies.

## Upgrading

- To upgrade the module to the latest version, simply remove the module directory from `modules/servers/enhance` and unzip the new version into the same directory.
- cd into the `api` directory and run `composer install`.
- If updating from < `1.1.0` the `subscriptionId` custom field is now
  `enhanceSubscriptionId`. You may want to update existing subscriptions.

## Configuration

- Create a `SuperAdmin` access token via the Enhance control panel. Make a note
  of the access token and the `orgId`.
- In WHMCS, in the `servers` section click `add server`.
- `Name` can be anything you like.
- `Hostname` should be your control panel domain (without http/https).
- `Username` should be your Enhance `orgId`.
- `Access Hash` should be the access token you generated earlier.
- It is only necessary to add your control panel server - server placement
  within your cluster is configured within Enhance itself.

## Multiple subscriptions

When the first subscription is created for a WHMCS client, a custom field is
created under the client called `enhOrgId` which stores the organisation under
which the first subscription was created. If the customer buys a separate
hosting package, this will be created under the same organisation so the client
only needs to log in once.

## Website creation on subscription creation

The module attempts to create the website for the customer under their new
subscription. If this fails, WHMCS will treat the provisioning as failed
however the organisation, login and subscription will have been created.

## Bugs

Please report any bugs to support@enhance.com. This module is very new and has
had limited development time. Further functionality is coming soon.
