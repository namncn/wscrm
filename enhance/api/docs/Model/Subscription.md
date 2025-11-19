# # Subscription

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **int** |  |
**plan_id** | **int** |  |
**plan_name** | **string** |  |
**subscriber_id** | **string** |  |
**vendor_id** | **string** |  |
**status** | [**\OpenAPI\Client\Model\Status**](Status.md) |  |
**suspended_by** | **string** |  | [optional]
**resources** | [**\OpenAPI\Client\Model\UsedResource[]**](UsedResource.md) | A list of used resources. |
**allowances** | [**\OpenAPI\Client\Model\Allowance[]**](Allowance.md) |  |
**selections** | [**\OpenAPI\Client\Model\Selection[]**](Selection.md) |  |
**dedicated_servers** | [**\OpenAPI\Client\Model\SubscriptionDedicatedServersInfo**](SubscriptionDedicatedServersInfo.md) |  | [optional]
**plan_type** | [**\OpenAPI\Client\Model\PlanType**](PlanType.md) |  |

[[Back to Model list]](../../README.md#models) [[Back to API list]](../../README.md#endpoints) [[Back to README]](../../README.md)
