# OpenAPI\Client\MigrationsApi

All URIs are relative to http://localhost.

Method | HTTP request | Description
------------- | ------------- | -------------
[**createMigration()**](MigrationsApi.md#createMigration) | **POST** /migrations | Create website role migration
[**getMigration()**](MigrationsApi.md#getMigration) | **GET** /migrations/{migrationId} | Get a single migration
[**getMigrationLog()**](MigrationsApi.md#getMigrationLog) | **GET** /migrations/{migrationId}/log | Get the log for a migration
[**getMigrations()**](MigrationsApi.md#getMigrations) | **GET** /migrations | Get website role migrations


## `createMigration()`

```php
createMigration($new_migration_details): \OpenAPI\Client\Model\NewResourceUuid
```

Create website role migration

Create a new role website migration from one server to another.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearerAuth
$config = OpenAPI\Client\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');

// Configure API key authorization: sessionCookie
$config = OpenAPI\Client\Configuration::getDefaultConfiguration()->setApiKey('id0', 'YOUR_API_KEY');
// Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
// $config = OpenAPI\Client\Configuration::getDefaultConfiguration()->setApiKeyPrefix('id0', 'Bearer');


$apiInstance = new OpenAPI\Client\Api\MigrationsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$new_migration_details = new \OpenAPI\Client\Model\NewMigrationDetails(); // \OpenAPI\Client\Model\NewMigrationDetails | Migration details.

try {
    $result = $apiInstance->createMigration($new_migration_details);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling MigrationsApi->createMigration: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **new_migration_details** | [**\OpenAPI\Client\Model\NewMigrationDetails**](../Model/NewMigrationDetails.md)| Migration details. |

### Return type

[**\OpenAPI\Client\Model\NewResourceUuid**](../Model/NewResourceUuid.md)

### Authorization

[bearerAuth](../../README.md#bearerAuth), [sessionCookie](../../README.md#sessionCookie)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `getMigration()`

```php
getMigration($migration_id): \OpenAPI\Client\Model\MigrationDetails
```

Get a single migration

Fetches the details of a single server migration.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearerAuth
$config = OpenAPI\Client\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');

// Configure API key authorization: sessionCookie
$config = OpenAPI\Client\Configuration::getDefaultConfiguration()->setApiKey('id0', 'YOUR_API_KEY');
// Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
// $config = OpenAPI\Client\Configuration::getDefaultConfiguration()->setApiKeyPrefix('id0', 'Bearer');


$apiInstance = new OpenAPI\Client\Api\MigrationsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$migration_id = 'migration_id_example'; // string | The ID of the migration being acted upon.

try {
    $result = $apiInstance->getMigration($migration_id);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling MigrationsApi->getMigration: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **migration_id** | **string**| The ID of the migration being acted upon. |

### Return type

[**\OpenAPI\Client\Model\MigrationDetails**](../Model/MigrationDetails.md)

### Authorization

[bearerAuth](../../README.md#bearerAuth), [sessionCookie](../../README.md#sessionCookie)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `getMigrationLog()`

```php
getMigrationLog($migration_id): \OpenAPI\Client\Model\MigrationLog[]
```

Get the log for a migration

Fetches the migration log for a single server migration.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearerAuth
$config = OpenAPI\Client\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');

// Configure API key authorization: sessionCookie
$config = OpenAPI\Client\Configuration::getDefaultConfiguration()->setApiKey('id0', 'YOUR_API_KEY');
// Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
// $config = OpenAPI\Client\Configuration::getDefaultConfiguration()->setApiKeyPrefix('id0', 'Bearer');


$apiInstance = new OpenAPI\Client\Api\MigrationsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$migration_id = 'migration_id_example'; // string | The ID of the migration being acted upon.

try {
    $result = $apiInstance->getMigrationLog($migration_id);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling MigrationsApi->getMigrationLog: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **migration_id** | **string**| The ID of the migration being acted upon. |

### Return type

[**\OpenAPI\Client\Model\MigrationLog[]**](../Model/MigrationLog.md)

### Authorization

[bearerAuth](../../README.md#bearerAuth), [sessionCookie](../../README.md#sessionCookie)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `getMigrations()`

```php
getMigrations($offset, $limit, $sort_order, $sort_by, $search_domain, $migration_status): \OpenAPI\Client\Model\MigrationsListing
```

Get website role migrations

Lists all server migrations, whether pending, in progress, failed or completed.

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');


// Configure Bearer authorization: bearerAuth
$config = OpenAPI\Client\Configuration::getDefaultConfiguration()->setAccessToken('YOUR_ACCESS_TOKEN');

// Configure API key authorization: sessionCookie
$config = OpenAPI\Client\Configuration::getDefaultConfiguration()->setApiKey('id0', 'YOUR_API_KEY');
// Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
// $config = OpenAPI\Client\Configuration::getDefaultConfiguration()->setApiKeyPrefix('id0', 'Bearer');


$apiInstance = new OpenAPI\Client\Api\MigrationsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$offset = 56; // int | The offset from which to return items.
$limit = 56; // int | The maximum number of items to return.
$sort_order = 'sort_order_example'; // string | The direction in which to sort. Possible values are 'asc' and 'desc', defaulting to 'asc'.
$sort_by = 'sort_by_example'; // string | The field by which to sort.
$search_domain = 'search_domain_example'; // string | Look for a specific domain in the result set.
$migration_status = new \OpenAPI\Client\Model\\OpenAPI\Client\Model\MigrationStatus(); // \OpenAPI\Client\Model\MigrationStatus | Filter by a particular migration status

try {
    $result = $apiInstance->getMigrations($offset, $limit, $sort_order, $sort_by, $search_domain, $migration_status);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling MigrationsApi->getMigrations: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **offset** | **int**| The offset from which to return items. | [optional]
 **limit** | **int**| The maximum number of items to return. | [optional]
 **sort_order** | **string**| The direction in which to sort. Possible values are &#39;asc&#39; and &#39;desc&#39;, defaulting to &#39;asc&#39;. | [optional]
 **sort_by** | **string**| The field by which to sort. | [optional]
 **search_domain** | **string**| Look for a specific domain in the result set. | [optional]
 **migration_status** | [**\OpenAPI\Client\Model\MigrationStatus**](../Model/.md)| Filter by a particular migration status | [optional]

### Return type

[**\OpenAPI\Client\Model\MigrationsListing**](../Model/MigrationsListing.md)

### Authorization

[bearerAuth](../../README.md#bearerAuth), [sessionCookie](../../README.md#sessionCookie)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)
