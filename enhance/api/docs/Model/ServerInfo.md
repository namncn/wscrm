# # ServerInfo

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** |  |
**group_id** | **string** |  |
**is_control_panel** | **bool** |  |
**is_configured** | **bool** |  |
**friendly_name** | **string** |  |
**hostname** | **string** |  |
**ips** | [**\OpenAPI\Client\Model\ServerIp[]**](ServerIp.md) |  |
**disks** | [**\OpenAPI\Client\Model\Disk[]**](Disk.md) |  | [optional]
**os_usage** | **int** |  | [optional]
**status** | [**\OpenAPI\Client\Model\NetworkStatus**](NetworkStatus.md) |  | [optional]
**roles** | [**\OpenAPI\Client\Model\RolesSummary**](RolesSummary.md) |  |
**created_at** | **string** |  |
**controld_version** | **string** |  | [optional]
**dedicated_subscription** | [**\OpenAPI\Client\Model\DedicatedSubscriptionInfo**](DedicatedSubscriptionInfo.md) |  | [optional]

[[Back to Model list]](../../README.md#models) [[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
