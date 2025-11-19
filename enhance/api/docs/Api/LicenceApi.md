# OpenAPI\Client\LicenceApi

All URIs are relative to http://localhost.

Method | HTTP request | Description
------------- | ------------- | -------------
[**getLicenceInfo()**](LicenceApi.md#getLicenceInfo) | **GET** /licence | Get current licence status
[**refreshLicence()**](LicenceApi.md#refreshLicence) | **PUT** /licence | Updates licence key if provided, and refresh licence status by calling home servers. NOTE: calling without any licence_key body, only refreshes the current licence status


## `getLicenceInfo()`

```php
getLicenceInfo(): \OpenAPI\Client\Model\LicenceInfo
```

Get current licence status

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');



$apiInstance = new OpenAPI\Client\Api\LicenceApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client()
);

try {
    $result = $apiInstance->getLicenceInfo();
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling LicenceApi->getLicenceInfo: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**\OpenAPI\Client\Model\LicenceInfo**](../Model/LicenceInfo.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)

## `refreshLicence()`

```php
refreshLicence($licence_key): \OpenAPI\Client\Model\LicenceInfo
```

Updates licence key if provided, and refresh licence status by calling home servers. NOTE: calling without any licence_key body, only refreshes the current licence status

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');



$apiInstance = new OpenAPI\Client\Api\LicenceApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client()
);
$licence_key = new \OpenAPI\Client\Model\LicenceKey(); // \OpenAPI\Client\Model\LicenceKey

try {
    $result = $apiInstance->refreshLicence($licence_key);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling LicenceApi->refreshLicence: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **licence_key** | [**\OpenAPI\Client\Model\LicenceKey**](../Model/LicenceKey.md)|  | [optional]

### Return type

[**\OpenAPI\Client\Model\LicenceInfo**](../Model/LicenceInfo.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)
