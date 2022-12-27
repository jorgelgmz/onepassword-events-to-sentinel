![1Password](https://upload.wikimedia.org/wikipedia/commons/4/4b/1Password-logo.svg '1Password')

# 1Password Events to Microsoft Sentinel

## Description:

Gets 1Password Vault and Secrets event activity via an Azure Function and sends it to an Azure Logic App HTTP event trigger. This triggers a workflow, which parses the JSON response and sends it to an Azure Log Analytics workspace. Microsoft Sentinel queries the Azure Log Analytics workspace and uses it for SecOp workflows, including, enhanced logging and alerting.

## How it works

- A `TimerTrigger` is used to invoke an [Azure Function](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer?tabs=in-process&pivots=programming-language-javascript) using the [cron expression](https://en.wikipedia.org/wiki/Cron#CRON_expression) of `0 */5 * * * *` (every 5 minutes)- see the [functions.json](./onepassword-events-to-sentinel/function.json).
- The Azure Function calls the [1Password Events API](https://support.1password.com/events-api-reference/#item-usage) endpoint: `POST /api/v1/itemusages`.
- The 1Password Events API returns Vault and Secrets event activity in `JSON` response in chunks of 100.
- The 1Password Events API also includes a `cursor` value indicating the last position captured in the event and activity logs.
- The `cursor` is saved to an Azure Key Vault as a secret and updated after every sucessful API call using the [`@azure/keyvault-secrets`](https://www.npmjs.com/package/@azure/keyvault-secrets) npm package.
- The Azure Function uses a [Managed Identity](https://docs.microsoft.com/en-us/azure/app-service/overview-managed-identity?tabs=portal%2Cjavascript) to successully retrieve and update secrets from Azure Key Vault using the [`@azure/identity`](https://www.npmjs.com/package/@azure/identity) npm package.
- Other secrets, including `Azure Logic App API Endpoint`, `Azure Logic APP API Key`, and `1Password Events API` are retrieved as environmental variables from Azure Functions > Configuration > Application Settings.
- This is done for simplicity, but the values are protected, encrypted, and reference in Azure Key Vault using the syntax `@Microsoft.KeyVault(SecretUri=https://<key-vault-name>.vault.azure.net/secrets/<secret-name>/<secret-version>)` based on the permissions of the Managed Identity.
- The 1Password Events are sent to an [Azure Logic App HTTP trigger](https://docs.microsoft.com/en-us/azure/logic-apps/logic-apps-http-endpoint), which leverages both a Shared Access Signature in the URI string and authenticates with an `API token`.
- The Azure Logic HTTP trigger starts a workflow, which parses the `JSON` response and ships it to an Azure Log Analytics workspace.
- This allows Microsoft Sentinel to query the 1Password Events and Activity logs stored in the Azure Log Analytics workspace for SecOp workflows, including, enhanced logging and alerting.

## Requirements

- At least Node.js 16.x

## Architecture

<img src="/img/1Password Events to Sentinel Architecture.png" alt="1Password Events to Sentinel Architecture" Title="1Password Events to Sentinel Architecture"/>
