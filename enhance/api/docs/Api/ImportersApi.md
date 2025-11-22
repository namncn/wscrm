# OpenAPI\Client\ImportersApi

All URIs are relative to http://localhost.

Method | HTTP request | Description
------------- | ------------- | -------------
[**analyzeImportMigration()**](ImportersApi.md#analyzeImportMigration) | **POST** /v2/orgs/{org_id}/import/{import_migration_id}/analyze | Analyze imported migration
[**checkImportMigrationResources()**](ImportersApi.md#checkImportMigrationResources) | **POST** /v2/orgs/{org_id}/import/{import_migration_id}/resource | Check if all resources from the imported migration could be created.
[**createImportMigration()**](ImportersApi.md#createImportMigration) | **POST** /v2/orgs/{org_id}/import/{import_migration_id} | Create a new import migration.
[**deleteImportMigration()**](ImportersApi.md#deleteImportMigration) | **DELETE** /v2/orgs/{org_id}/import/{import_migration_id} | Delete single migration
[**getImportMigration()**](ImportersApi.md#getImportMigration) | **GET** /v2/orgs/{org_id}/import/{import_migration_id} | Fetches single migration details
[**getImportMigrationData()**](ImportersApi.md#getImportMigrationData) | **GET** /v2/orgs/{org_id}/import/{import_migration_id}/analyze | Get import migration information
[**getImportMigrationLog()**](ImportersApi.md#getImportMigrationLog) | **GET** /v2/orgs/{org_id}/import/{import_migration_id}/log | Get the log for an import migration
[**getImportMigrations()**](ImportersApi.md#getImportMigrations) | **GET** /v2/orgs/{org_id}/import | List all import migrations
[**uploadImportMigration()**](ImportersApi.md#uploadImportMigration) | **POST** /v2/orgs/{org_id}/import/upload/{import_migration_kind} | Upload file for analyzing and processing.


## `analyzeImportMigration()`

```php
analyzeImportMigration($org_id, $import_migration_id)
```

Analyze imported migration

Analyze import and store results into database.

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


$apiInstance = new OpenAPI\Client\Api\ImportersApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$org_id = 'org_id_example'; // string | The id of the organization.
$import_migration_id = 'import_migration_id_example'; // string | The ID of the import migration being acted upon.

try {
    $apiInstance->analyzeImportMigration($org_id, $import_migration_id);
} catch (Exception $e) {
    echo 'Exception when calling ImportersApi->analyzeImportMigration: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **org_id** | **string**| The id of the organization. |
 **import_migration_id** | **string**| The ID of the import migration being acted upon. |

### Return type

void (empty response body)

### Authorization

[bearerAuth](../../README.md#bearerAuth), [sessionCookie](../../README.md#sessionCookie)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `checkImportMigrationResources()`

```php
checkImportMigrationResources($org_id, $import_migration_id, $importer_migration_req_body): \OpenAPI\Client\Model\ResourceCheckError
```

Check if all resources from the imported migration could be created.

Check if all resources from the imported migration could be created.  If all resources could be created, 200 is returned with an empty `ResourceCheckError`. However, if any error occurs, 200 is returned with a non-empty `ResourceCheckError`.  In case of import failure, you can rerun importing by setting forceQueue to true. Before doing so, it's required to remove any already imported resources. Otherwise, the import will fail.

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


$apiInstance = new OpenAPI\Client\Api\ImportersApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$org_id = 'org_id_example'; // string | The id of the organization.
$import_migration_id = 'import_migration_id_example'; // string | The ID of the import migration being acted upon.
$importer_migration_req_body = new \OpenAPI\Client\Model\ImporterMigrationReqBody(); // \OpenAPI\Client\Model\ImporterMigrationReqBody

try {
    $result = $apiInstance->checkImportMigrationResources($org_id, $import_migration_id, $importer_migration_req_body);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling ImportersApi->checkImportMigrationResources: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **org_id** | **string**| The id of the organization. |
 **import_migration_id** | **string**| The ID of the import migration being acted upon. |
 **importer_migration_req_body** | [**\OpenAPI\Client\Model\ImporterMigrationReqBody**](../Model/ImporterMigrationReqBody.md)|  | [optional]

### Return type

[**\OpenAPI\Client\Model\ResourceCheckError**](../Model/ResourceCheckError.md)

### Authorization

[bearerAuth](../../README.md#bearerAuth), [sessionCookie](../../README.md#sessionCookie)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `createImportMigration()`

```php
createImportMigration($org_id, $import_migration_id, $importer_migration_req_body)
```

Create a new import migration.

Create a new import migration for a given import type.

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


$apiInstance = new OpenAPI\Client\Api\ImportersApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$org_id = 'org_id_example'; // string | The id of the organization.
$import_migration_id = 'import_migration_id_example'; // string | The ID of the import migration being acted upon.
$importer_migration_req_body = new \OpenAPI\Client\Model\ImporterMigrationReqBody(); // \OpenAPI\Client\Model\ImporterMigrationReqBody

try {
    $apiInstance->createImportMigration($org_id, $import_migration_id, $importer_migration_req_body);
} catch (Exception $e) {
    echo 'Exception when calling ImportersApi->createImportMigration: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **org_id** | **string**| The id of the organization. |
 **import_migration_id** | **string**| The ID of the import migration being acted upon. |
 **importer_migration_req_body** | [**\OpenAPI\Client\Model\ImporterMigrationReqBody**](../Model/ImporterMigrationReqBody.md)|  | [optional]

### Return type

void (empty response body)

### Authorization

[bearerAuth](../../README.md#bearerAuth), [sessionCookie](../../README.md#sessionCookie)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `deleteImportMigration()`

```php
deleteImportMigration($org_id, $import_migration_id)
```

Delete single migration

Delete a single migration with the uploaded file.

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


$apiInstance = new OpenAPI\Client\Api\ImportersApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$org_id = 'org_id_example'; // string | The id of the organization.
$import_migration_id = 'import_migration_id_example'; // string | The ID of the import migration being acted upon.

try {
    $apiInstance->deleteImportMigration($org_id, $import_migration_id);
} catch (Exception $e) {
    echo 'Exception when calling ImportersApi->deleteImportMigration: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **org_id** | **string**| The id of the organization. |
 **import_migration_id** | **string**| The ID of the import migration being acted upon. |

### Return type

void (empty response body)

### Authorization

[bearerAuth](../../README.md#bearerAuth), [sessionCookie](../../README.md#sessionCookie)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `getImportMigration()`

```php
getImportMigration($org_id, $import_migration_id): \OpenAPI\Client\Model\ImportMigrationEntry
```

Fetches single migration details

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


$apiInstance = new OpenAPI\Client\Api\ImportersApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$org_id = 'org_id_example'; // string | The id of the organization.
$import_migration_id = 'import_migration_id_example'; // string | The ID of the import migration being acted upon.

try {
    $result = $apiInstance->getImportMigration($org_id, $import_migration_id);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling ImportersApi->getImportMigration: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **org_id** | **string**| The id of the organization. |
 **import_migration_id** | **string**| The ID of the import migration being acted upon. |

### Return type

[**\OpenAPI\Client\Model\ImportMigrationEntry**](../Model/ImportMigrationEntry.md)

### Authorization

[bearerAuth](../../README.md#bearerAuth), [sessionCookie](../../README.md#sessionCookie)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `getImportMigrationData()`

```php
getImportMigrationData($org_id, $import_migration_id): \OpenAPI\Client\Model\ImporterAnalyzedData
```

Get import migration information

Get analyzed informations about import.  Information contains details about domains, ftp users, databases, crontabs and mailboxes.

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


$apiInstance = new OpenAPI\Client\Api\ImportersApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$org_id = 'org_id_example'; // string | The id of the organization.
$import_migration_id = 'import_migration_id_example'; // string | The ID of the import migration being acted upon.

try {
    $result = $apiInstance->getImportMigrationData($org_id, $import_migration_id);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling ImportersApi->getImportMigrationData: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **org_id** | **string**| The id of the organization. |
 **import_migration_id** | **string**| The ID of the import migration being acted upon. |

### Return type

[**\OpenAPI\Client\Model\ImporterAnalyzedData**](../Model/ImporterAnalyzedData.md)

### Authorization

[bearerAuth](../../README.md#bearerAuth), [sessionCookie](../../README.md#sessionCookie)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `getImportMigrationLog()`

```php
getImportMigrationLog($org_id, $import_migration_id): \OpenAPI\Client\Model\ImportMigrationLogEntry[]
```

Get the log for an import migration

Fetches the import migration log for a single import migration.

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


$apiInstance = new OpenAPI\Client\Api\ImportersApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$org_id = 'org_id_example'; // string | The id of the organization.
$import_migration_id = 'import_migration_id_example'; // string | The ID of the import migration being acted upon.

try {
    $result = $apiInstance->getImportMigrationLog($org_id, $import_migration_id);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling ImportersApi->getImportMigrationLog: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **org_id** | **string**| The id of the organization. |
 **import_migration_id** | **string**| The ID of the import migration being acted upon. |

### Return type

[**\OpenAPI\Client\Model\ImportMigrationLogEntry[]**](../Model/ImportMigrationLogEntry.md)

### Authorization

[bearerAuth](../../README.md#bearerAuth), [sessionCookie](../../README.md#sessionCookie)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `getImportMigrations()`

```php
getImportMigrations($org_id): \OpenAPI\Client\Model\ImportMigrationFullListing
```

List all import migrations

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


$apiInstance = new OpenAPI\Client\Api\ImportersApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$org_id = 'org_id_example'; // string | The id of the organization.

try {
    $result = $apiInstance->getImportMigrations($org_id);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling ImportersApi->getImportMigrations: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **org_id** | **string**| The id of the organization. |

### Return type

[**\OpenAPI\Client\Model\ImportMigrationFullListing**](../Model/ImportMigrationFullListing.md)

### Authorization

[bearerAuth](../../README.md#bearerAuth), [sessionCookie](../../README.md#sessionCookie)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `uploadImportMigration()`

```php
uploadImportMigration($org_id, $import_migration_kind, $backup): \OpenAPI\Client\Model\NewResourceUuid
```

Upload file for analyzing and processing.

Uploads an import file. File must be in `tar.gz` format, and only cPanel uploads are allowed.  The max allowed size is 100 GB.

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


$apiInstance = new OpenAPI\Client\Api\ImportersApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$org_id = 'org_id_example'; // string | The id of the organization.
$import_migration_kind = 'import_migration_kind_example'; // string | The type of migration file being uploaded.
$backup = "/path/to/file.txt"; // \SplFileObject

try {
    $result = $apiInstance->uploadImportMigration($org_id, $import_migration_kind, $backup);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling ImportersApi->uploadImportMigration: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **org_id** | **string**| The id of the organization. |
 **import_migration_kind** | **string**| The type of migration file being uploaded. |
 **backup** | **\SplFileObject****\SplFileObject**|  | [optional]

### Return type

[**\OpenAPI\Client\Model\NewResourceUuid**](../Model/NewResourceUuid.md)

### Authorization

[bearerAuth](../../README.md#bearerAuth), [sessionCookie](../../README.md#sessionCookie)

### HTTP request headers

- **Content-Type**: `multipart/form-data`
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)
