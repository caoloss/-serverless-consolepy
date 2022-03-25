'use strict';

const { expect } = require('chai');
const { EventEmitter } = require('events');
const unlink = require('fs2/unlink');
const evilDns = require('evil-dns');
const log = require('log').get('test');
const requireUncached = require('ncjsm/require-uncached');
const overwriteStdoutWrite = require('process-utils/override-stdout-write');
const getExtensionServerMock = require('../utils/get-extension-server-mock');
const normalizeOtelAttributes = require('../utils/normalize-otel-attributes');
const { SAVE_FILE, SENT_FILE } = require('../../opt/otel-extension/external/helper');
const { default: fetch } = require('node-fetch');
const { OTEL_SERVER_PORT } = require('../../opt/otel-extension/lib/helper');

const port = 9001;

describe('external', () => {
  before(async () => {
    evilDns.add('sandbox', '127.0.0.1');
    process.env.AWS_LAMBDA_RUNTIME_API = `127.0.0.1:${port}`;
    process.env.SLS_OTEL_REPORT_TYPE = 'json';
    process.env.SLS_TEST_PRINT_LOG_EVENT = true;
    await Promise.all([unlink(SAVE_FILE, { loose: true }), unlink(SENT_FILE, { loose: true })]);
  });

  it('should handle plain success invocation', async () => {
    const requestId = 'bf8bcf52-ff05-4f30-85cc-8a8bb1a27ae0';
    process.env.DO_NOT_WAIT = true;
    const emitter = new EventEmitter();
    const { server, listenerEmitter } = getExtensionServerMock(emitter, { requestId });

    server.listen(port);
    let stdoutData = '';
    const extensionProcess = overwriteStdoutWrite(
      (data) => (stdoutData += data),
      async () => requireUncached(() => require('../../opt/otel-extension/external'))
    );

    await new Promise((resolve) => listenerEmitter.once('listener', resolve));
    emitter.emit('event', { eventType: 'INVOKE', requestId });

    emitter.emit('logs', [
      {
        time: '2022-02-14T15:31:24.674Z',
        type: 'platform.start',
        record: {
          requestId,
          version: '$LATEST',
        },
      },
      {
        time: '2022-02-14T15:31:24.676Z',
        type: 'platform.extension',
        record: {
          name: 'otel-extension',
          state: 'Ready',
          events: ['INVOKE', 'SHUTDOWN'],
        },
      },
    ]);
    // Emit init logs
    await new Promise((resolve) => listenerEmitter.once('listener', resolve));
    emitter.emit('event', { eventType: 'SHUTDOWN', requestId });
    await fetch(`http://localhost:${OTEL_SERVER_PORT}`, {
      method: 'post',
      body: JSON.stringify({
        recordType: 'eventData',
        record: {
          eventData: {
            [requestId]: {
              functionName: 'testFunction',
              computeCustomEnvArch: 'x86',
              computeRegion: 'us-east-1',
              eventCustomApiId: requestId,
            },
          },
          span: {
            traceId: 'trace-123',
            spanId: 'span-123',
          },
        },
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    await fetch(`http://localhost:${OTEL_SERVER_PORT}`, {
      method: 'post',
      body: JSON.stringify({
        recordType: 'telemetryData',
        record: `2022-02-14T13:01:30.307Z\t${requestId}\tINFO\t⚡.H4sIAAAAAAAAA+1VXW/bNhT9K4Owx0omqW8VARa0HhAsCwrbKwoUhXFFXqVaJdIjKc9Zkf8+UnJsx3WxPOxpGPx27+HRued++GvQDJLbVsmg+hoY1NuWYyShx6AKLBobKotdiDuL0jhUaAbO0Zjglct22KPVD5ERX6IO5P0A9/6ZVAJ//xaxJ1UblIfEN6AtajOKCWhEIuryvFODiDZabVuB2iXgT3MMd2AbpfspvO6grwUcshrvJ67BhAiuFs/XAJiXFTgij4J+vL1ezZcrl3BiPCTatCKoaHEM4A75YKHuDhbOtqBn3ptZ3cqZd+bkPVd9D1I8wfQgbdvjrJUCd9Ho4Bly3bXyMusP32NwLzeDxTeDsaq/1r4Q0LJyblWTW9XBnKosWUwpyUieltXTXFT/YNIedvcSR/diFpf68pSbSpgaGk0So2miIppEtIjoeVU/7yW8v9CqPfBX7JV+WLZ/eWLKCpfBrZvDieDDSgPHG9+IhVL2ioYZI5AyyEOaQ55mjFJOiqxmRcJYIiAWr9+Bdu+vWJ3HApuSZhwha5LXS+g3HYorcq7yVt0vrUbo904xwtiMsBlNZh/3ej9BWfAkiUmDSZM0aQkEayLijIjSaYjFOedcbq81/+zYdlnyVNPqYeP45dB1z4pc4B+Da85YZd0UNW9SFjYNScOkiUlYpJyHBRR1TYHlgCf6b8wb1YmlBW2DyuoBn/G+VT208vsfXLluzjfKq5wgxhOtxh7TLEmKJM6Kgia5eyzF83hJWEpdXGvlNr+Bzrhvf7Z248TYwcly61QxQh7dGfEtNP6IaTRq0ByXG5Au8PEY+f/E/QdPnOt9K40by96ZDv4O3La1Brfth/5fzvtp2Jfw07OOzc7wofM9PPh+dItEzF8jJ8AcPmUPlyTNKcckY0DdbGOJKU+LTKRJztIySak3yT8bsaKJgYumrktWCEj8eXpR+760o7XLd9d3619u7t6ul/PF+/kiOFmy32S7uwOp/LidbluW0oz4Jd8v3QXcuH15SeIRB9bqtnbnYFyycXCmWZjMeOFJGd/5mfp3/4WmZQDOlRuPif+UJpiuRmTGs7HmJ3djCrmSHh8/jb/HvwF/juUcEwkAAA==`,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    emitter.emit('logs', [
      {
        time: '2022-02-14T15:31:26.713Z',
        type: 'function',
        record: `2022-02-14T13:01:30.307Z\t${requestId}\tINFO\tHi mom`,
      },
      {
        time: '2022-02-14T15:31:26.713Z',
        type: 'platform.runtimeDone',
        record: {
          requestId,
          status: 'success',
        },
      },
      {
        time: '2022-02-14T15:31:26.742Z',
        type: 'platform.end',
        record: {
          requestId,
        },
      },
      {
        time: '2022-02-14T15:31:26.742Z',
        type: 'platform.report',
        record: {
          requestId,
          metrics: {
            durationMs: 2064.05,
            billedDurationMs: 2065,
            memorySizeMB: 128,
            maxMemoryUsedMB: 67,
            initDurationMs: 238.12,
          },
        },
      },
    ]);

    await extensionProcess;
    delete process.env.DO_NOT_WAIT;
    server.close();

    log.debug('report string %s', stdoutData);
    const reportData = stdoutData
      .split('\n')
      .filter(Boolean)
      .map((string) => JSON.parse(string));
    log.debug('report data %o', reportData);
    const [[metricsReport], [tracesReport], [logReport]] = reportData;

    const resourceMetrics = normalizeOtelAttributes(
      metricsReport.resourceMetrics[0].resource.attributes
    );
    expect(resourceMetrics['faas.name']).to.equal('test-otel-extension-success');
    const resourceSpans = normalizeOtelAttributes(
      tracesReport.resourceSpans[0].resource.attributes
    );
    expect(resourceSpans['faas.name']).to.equal('test-otel-extension-success');

    expect(logReport.Body).to.equal(`2022-02-14T13:01:30.307Z\t${requestId}\tINFO\tHi mom`);
    expect(logReport.Attributes['faas.name']).to.equal('testFunction');
    expect(logReport.Resource['faas.arch']).to.equal('x86');
  });
});