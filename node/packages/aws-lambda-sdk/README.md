# @serverless/aws-lambda-sdk

## AWS Lambda dedicated tracing utility

Instruments AWS Lambda functions and propagates traces to the [Serverless Console](https://www.serverless.com/console/docs)

### Setup

#### 1. Register with [Serverless Console](https://console.serverless.com/)

#### 2. Instrument functions with the SDK in one of the following ways:

##### (A) Attach internal extension layer

Resolve Layer ARN with following steps

- Search for latest release of `@serverless/aws-lambda-sdk` at https://github.com/serverless/console/releases
- In attached `sls-sdk-node.json` asset, find ARN of a layer in a region in which function is deployed

1. Attach layer to the function
2. Configure following environment variables for the function environment:
   - `SLS_ORG_ID`: _(id of your organization in Serverless Console)_
   - `AWS_LAMBDA_EXEC_WRAPPER`: `/opt/sls-sdk-node/exec-wrapper.sh`
3. If needed Serverless SDK can be accessed at `serverlessSdk` global variable

##### (B) Instrument function manually

1. Ensure `@serverless/aws-lambda-sdk` dependency installed for the function

2. Decorate function handler:

_CJS:_

```javascript
const instrument = require('@serverless/aws-lambda-sdk/instrument');

module.exports.handler = instrument(
  (event, context, callback) => {
    /* Original handler logic */
  },
  options // Optional, see documentation below
);
```

_ESM:_

```javascript
import instrument from '@serverless/aws-lambda-sdk/instrument';

export const handler = instrument(
  (event, context, callback) => {
    /* Original handler logic  */
  },
  options // Optional, see documentation below
);
```

3. If needed Serveless SDK can be loaded by requiring (or importing) `@serverless/aws-lambda-sdk`

#### Configuration options.

Extension can be configured either via environment variables, or in case of manual instrumentation by passing the options object to `instrument` function;

If given setting is set via both environment variable and property in options object, the environment variable takes precedence.

##### `SLS_ORG_ID` (or `options.orgId`)

Required setting. Id of your organization in Serverless Console.

##### `SLS_DISABLE_HTTP_MONITORING` (or `options.disableHttpMonitoring`)

Disable tracing of HTTP and HTTPS requests

##### `SLS_DISABLE_REQUEST_RESPONSE_MONITORING` (or `options.disableRequestResponseMonitoring`)

(Dev mode only) Disable monitoring requests and reponses (function, AWS SDK requests and HTTP(S) requests)

##### `SLS_DISABLE_AWS_SDK_MONITORING` (or `options.disableAwsSdkMonitoring`)

Disable automated AWS SDK monitoring

##### `SLS_DISABLE_EXPRESS_MONITORING` (or `options.disableExpressMonitoring`)

Disable automated express monitoring

##### `SLS_TRACE_MAX_CAPTURED_BODY_SIZE_KB` (or `options.traceMaxCapturedBodySizeKb`)

In dev mode, HTTP request and response bodies are stored as tags. To avoid performance issues, bodies that extend 10 000KB in size are not exposed. This default can be overridden with this settin

### Outcome

SDK automatically creates the trace that covers internal process of function invocation and initialization.

For details check:

- [AWS Lambda SDK main trace spans](docs/sdk-trace.md).
- [AWS Lambda SDK internal flow traces](docs/monitoring.md)
- [Serverless SDK interface](docs/sdk.md)
