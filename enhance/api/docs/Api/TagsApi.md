# OpenAPI\Client\TagsApi

All URIs are relative to http://localhost.

Method | HTTP request | Description
------------- | ------------- | -------------
[**createTag()**](TagsApi.md#createTag) | **POST** /orgs/{org_id}/tags | Create tag
[**getTags()**](TagsApi.md#getTags) | **GET** /orgs/{org_id}/tags | Get tags


## `createTag()`

```php
createTag($org_id, $new_tag): \OpenAPI\Client\Model\NewResourceId
```

Create tag

Creates a new tag for the organization. Session holder must be at least a `SuperAdmin` in this org or a parent org.

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


$apiInstance = new OpenAPI\Client\Api\TagsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$org_id = 'org_id_example'; // string | The id of the organization.
$new_tag = new \OpenAPI\Client\Model\NewTag(); // \OpenAPI\Client\Model\NewTag | New tag details

try {
    $result = $apiInstance->createTag($org_id, $new_tag);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling TagsApi->createTag: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **org_id** | **string**| The id of the organization. |
 **new_tag** | [**\OpenAPI\Client\Model\NewTag**](../Model/NewTag.md)| New tag details |

### Return type

[**\OpenAPI\Client\Model\NewResourceId**](../Model/NewResourceId.md)

### Authorization

[bearerAuth](../../README.md#bearerAuth), [sessionCookie](../../README.md#sessionCookie)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `getTags()`

```php
getTags($org_id): \OpenAPI\Client\Model\TagsFullListing
```

Get tags

Returns all tags belonging to the organization. Session holder must be at least a `SuperAdmin` in this org or a parent org.

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


$apiInstance = new OpenAPI\Client\Api\TagsApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);
$org_id = 'org_id_example'; // string | The id of the organization.

try {
    $result = $apiInstance->getTags($org_id);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling TagsApi->getTags: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **org_id** | **string**| The id of the organization. |

### Return type

[**\OpenAPI\Client\Model\TagsFullListing**](../Model/TagsFullListing.md)

### Authorization

[bearerAuth](../../README.md#bearerAuth), [sessionCookie](../../README.md#sessionCookie)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)
