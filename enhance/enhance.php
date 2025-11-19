<?php
require 'api/vendor/autoload.php';
use WHMCS\Config\Setting;
use WHMCS\Database\Capsule;

function enhance_MetaData()
{
    return array(
        'DisplayName' => 'Enhance',
        'APIVersion' => '1.1',
        'DefaultNonSSLPort' => '80',
        'DefaultSSLPort' => '443',
    );
}

function enhance_ConfigOptions()
{
    return [
        "username" => [
            "FriendlyName" => "Enhance package ID",
            "Type" => "text",
            "Size" => "5",
            "Description" => "Obtain this from the URL when visiting the packages page in your Enhance admin panel",
        ],
    ];
}

function client_custom_field_id()
{
    $id = Capsule::table("tblcustomfields")
        ->where("fieldname", "enhOrgId")
        ->where("type", "client")
        ->select('id')
        ->first()
        ->id;

    if (is_numeric($id)) {
        return $id;
    } else {
        Capsule::table("tblcustomfields")
            ->insert(
                array("fieldname" => "enhOrgId",
                    "fieldtype" => "text",
                    "adminonly" => "on",
                    "description" => "The Enhance organisation under which this customer's subscriptions will be placed",
                    "type" => "client",
                )
            );

        $id = Capsule::connection()->getPdo()->lastInsertId();
        return $id;
    }
}

function fetch_or_create_org($api, $clientsdetails, $params)
{
    $fieldId = client_custom_field_id();

    $orgId = Capsule::table("tblcustomfieldsvalues")
        ->where("fieldid", $fieldId)
        ->where("relid", $clientsdetails['id'])
        ->select('value')
        ->first()
        ->value;

    if ($orgId != "") {
        return $orgId;
    } else {
        $orgId = createCustomer($api, $clientsdetails, $params);
        if (strlen($orgId) < 10) {
            throw new Exception("Org ID appears too short");
        }
        Capsule::table("tblcustomfieldsvalues")
            ->where("fieldid", $fieldId)
            ->where("relid", $clientsdetails['id'])
            ->delete();

        Capsule::table("tblcustomfieldsvalues")
            ->insert(array(
                "fieldid" => $fieldId,
                "relid" => $clientsdetails['id'],
                "value" => $orgId,
            )
            );

        return $orgId;
    }
}

function fetch_org($api, $clientsdetails, $params)
{
    $fieldId = client_custom_field_id();

    $orgId = Capsule::table("tblcustomfieldsvalues")
        ->where("fieldid", $fieldId)
        ->where("relid", $clientsdetails['id'])
        ->select('value')
        ->first()
        ->value;

    if ($orgId == "") {
        throw new Exception("Unable to find client organisation");
    }

    return $orgId;
}

function createCustomer($api, $clientsdetails, $params)
{
    $new_customer = new \OpenAPI\Client\Model\NewCustomer;
    $name = "Customer from WHMCS";

    if ($clientsdetails['companyname'] && $clientsdetails['companyname'] != "") {
        $name = $clientsdetails['companyname'];
    } else {
        $name = $clientsdetails['fullname'];
    }
    $new_customer->setName($name);
    $org = $api['customersClient']->createCustomer($params['serverusername'], $new_customer);

    $new_login = new \OpenAPI\Client\Model\LoginInfo;

    $new_login->setEmail($clientsdetails['email']);
    $new_login->setName($name);
    $new_login->setPassword($params['password']);

    $login = $api['loginsClient']->createLogin($org['id'], $new_login);

    $new_member = new \OpenAPI\Client\Model\NewMember;
    $new_member->setLoginId($login['id']);
    $new_member->setRoles([\OpenAPI\Client\Model\Role::OWNER]);

    $member = $api['membersClient']->createMember($org['id'], $new_member);
    return $org['id'];
}

function get_api_client($params)
{
    $config = OpenAPI\Client\Configuration::getDefaultConfiguration()
        ->setAccessToken($params['serveraccesshash'])
        ->setHost("https://" . $params['serverhostname'] . "/api");

    $customersClient = new OpenAPI\Client\Api\CustomersApi(new GuzzleHttp\Client(), $config);
    $subscriptionsClient = new OpenAPI\Client\Api\SubscriptionsApi(new GuzzleHttp\Client(), $config);
    $loginsClient = new OpenAPI\Client\Api\LoginsApi(new GuzzleHttp\Client(), $config);
    $membersClient = new OpenAPI\Client\Api\MembersApi(new GuzzleHttp\Client(), $config);
    $orgsClient = new OpenAPI\Client\Api\OrgsApi(new GuzzleHttp\Client(), $config);
    $websitesClient = new OpenAPI\Client\Api\WebsitesApi(new GuzzleHttp\Client(), $config);

    return array(
        "customersClient" => $customersClient,
        "subscriptionsClient" => $subscriptionsClient,
        "loginsClient" => $loginsClient,
        "membersClient" => $membersClient,
        "orgsClient" => $orgsClient,
        "websitesClient" => $websitesClient,
    );
}

function enhance_createAccount(array $params)
{
    $api = get_api_client($params);
    try {
        $clientsdetails = $params['clientsdetails'];

        $existing_sub = $params['model']->serviceProperties->get('enhanceSubscriptionId');
        if (is_numeric($existing_sub)) {
            return "Already provisioned";
        }

        $orgId = fetch_or_create_org($api, $clientsdetails, $params);

        $new_subscription = new \OpenAPI\Client\Model\NewSubscription;
        $new_subscription->setPlanId(intval($params['configoption1']));
        $subscription = $api['subscriptionsClient']->createCustomerSubscription($params['serverusername'], $orgId, $new_subscription);

        $params['model']->serviceProperties->save(['enhanceSubscriptionId' => $subscription['id']]);
        $params['model']->serviceProperties->save(['username' => $clientsdetails['email']]);

        // create the website for the customer

        $new_website = new \OpenAPI\Client\Model\NewWebsite;
        $new_website->setSubscriptionId($subscription['id']);
        $new_website->setDomain($params['domain']);
        $website = $api['websitesClient']->createWebsite($orgId, $new_website);

        $update_website = new \OpenAPI\Client\Model\UpdateWebsite;
        $update_website->setPhpVersion(\OpenAPI\Client\Model\PhpVersion::PHP74);

        // $api['websitesClient']->updateWebsite($orgId, $website['id'], $update_website);

        return true;
    } catch (Exception $e) {
        return $e->getMessage();
    }
}

function enhance_suspendAccount(array $params)
{
    $api = get_api_client($params);
    $clientsdetails = $params['clientsdetails'];

    try {
        $existing_sub = $params['model']->serviceProperties->get('enhanceSubscriptionId');

        if (!is_numeric($existing_sub)) {
            throw new Exception("Subscription not found");
        }

        $orgId = fetch_or_create_org($api, $clientsdetails, $params);

        $update_subscription = new \OpenAPI\Client\Model\UpdateSubscription;
        $update_subscription->setIsSuspended(true);

        $api['subscriptionsClient']->updateSubscription($orgId, $existing_sub, $update_subscription);

        return true;
    } catch (Exception $e) {
        return $e->getMessage();
    }
}

function enhance_unsuspendAccount(array $params)
{
    $api = get_api_client($params);
    $clientsdetails = $params['clientsdetails'];

    try {
        $existing_sub = $params['model']->serviceProperties->get('enhanceSubscriptionId');

        if (!is_numeric($existing_sub)) {
            throw new Exception("Subscription not found");
        }

        $orgId = fetch_or_create_org($api, $clientsdetails, $params);

        $update_subscription = new \OpenAPI\Client\Model\UpdateSubscription;
        $update_subscription->setIsSuspended(false);

        $api['subscriptionsClient']->updateSubscription($orgId, $existing_sub, $update_subscription);

        return true;
    } catch (Exception $e) {
        return $e->getMessage();
    }
}

function enhance_terminateAccount(array $params)
{
    $api = get_api_client($params);
    $clientsdetails = $params['clientsdetails'];

    try {
        $existing_sub = $params['model']->serviceProperties->get('enhanceSubscriptionId');

        if (!is_numeric($existing_sub)) {
            throw new Exception("Subscription not found");
        }

        $orgId = fetch_or_create_org($api, $clientsdetails, $params);

        // this is a soft deletion
        $api['subscriptionsClient']->deleteSubscription($orgId, $existing_sub, "false");

        return true;
    } catch (Exception $e) {
        return $e->getMessage();
    }
}

function enhance_ServiceSingleSignOn(array $params)
{

    $api = get_api_client($params);
    $clientsdetails = $params['clientsdetails'];

    $orgId = fetch_org($api, $clientsdetails, $params);

    $members = $api['membersClient']->getMembers($orgId)->getItems();

    $owners = array_filter($members, function ($member) {
        $roles = $member->getRoles();
        return is_numeric(array_search("Owner", $roles));
    });

    $owner = array_pop($owners);

    if (!$owner) {
        throw new Exception("Unable to locate organisation owner for SSO");
    }

    $ownerId = $owner->getId();

    $link = $api['membersClient']->getOrgMemberLogin($orgId, $ownerId);

    return array(
        'success' => true,
        'redirectTo' => trim($link, '"'),
    );
}

function enhance_ClientArea($params)
{
    $systemurl = Setting::getValue('SystemURL');
    return '<a href="' . $systemurl . '/clientarea.php?action=productdetails&id=' . $params['serviceid'] . '&dosinglesignon=1">Log in to panel</a>';
}

function enhance_ChangePackage($params)
{
    $api = get_api_client($params);
    $clientsdetails = $params['clientsdetails'];

    $orgId = fetch_org($api, $clientsdetails, $params);
    $subscriptionId = $params['model']->serviceProperties->get('enhanceSubscriptionId');

    $api['subscriptionsClient']->updateSubscription($orgId, $subscriptionId, array("planId" => intval($params['configoption1'])));
    return "success";
}
