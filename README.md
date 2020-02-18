# exp-kafka-listener

Simple stream-based kafka listener based on node-rdkafka.
Calculates metrics on lag and group consumption rate.

## Development

`npm run docker:up` to start dependencies.
`npm test` to run tests.

## API
Exposes a single function that returns an object used for streaming messages and consuming.
```
const kafka = require("exp-kafka-listener");
const listener = listen(options, groupId, topics);
const readStream = listener.readStream;
```

See examples below for more info.



__Options__

 * __host__: Comma-separated list of kafka hosts.
 * __username__: If set, SASL/PLAIN authentication will be used when connecting.
 * __password__: Password for SASL authentication.
 * __autoCommit__: Automatically commit messeges every 5 seconds, default false.
 * __fetchSize__: Kafka fetch size, default 500.
 * __fromOffset__: Kafka start offset, default "latest".
 * __statsInterval__: The rate at which statistics are reported (in ms), default 30000.

__Events__

The object returned from "listen" is an event emitter that emits the following events:

* __'ready'__: Emitted once the listener has successfully connected to the kafka cluster.
* __'stats'__: Emitted on a regular interval, supplies an object with the following props
  - __lag__: Total lag for consumer group
  - __messageRate__: Message consumption rate for consumer group (will be negative if
    producers are faster than consumers)
  - __error__: If an error occured when stats were calculated
  - __time__: Timestamp when stats were generated

## Examples

__Manual commits and streams__

Use this if you want as low risk as posible of losing messages during crashes/restarts.
Back-pressure is handled by node js streams so the fetch rate is adjusted to the consumption rate, keeping
the number of in-flight messages low.

```js
const kafka = require("exp-kafka-listener");
const through = require("through2");
const {pipeline} = require("stream");

const kafkaOptions = {
  host: "mykafkahost-1:9200,mykafkahost-2:9200",
  autoCommit: false
}

const listener = kafka.listen("my-group-id", ["my-topic"]);

const msgHandler = through.obj((msg, _encoding, next) => {
  const payload = msg.value;
  someAsyncOperation(payload, (err)) => {
    next(err, msg);
  });
});

const commitHandler = through.obj((msg, _encoding, next) => {
  listener.commit(msg);
  next();
});

pipeline(listener.readStream, msgHandler, commitHandler, (err) {
  throw err || "Stream ended"; // Stream should never end.
});

```

__Autocommit and streams__

Use this if you don't care about losing a few in-flight messages during restarts.
Messages will be automatically committed every five seconds.
Back-pressure is handled by node js streams so the fetch rate is adjusted to the consumtion rate.
Therefore the number of in-flight messages is usually low.

```js
const kafka = require("exp-kafka-listener");
const through = require("through2");
const {pipeline} = require("stream");

const kafkaOptions = {
  host: "mykafkahost-1:9200,mykafkahost-2:9200",
  autoCommit: true
}

const listener = kafka.listen("my-group-id", ["my-topic"]);

const msgHandler = through.obj((msg, _encoding, next) => {
  const payload = msg.value;
  someAsyncOperation(payload, (err)) => {
    next(err, next);
  });
});

pipeline(listener.readStream, msgHandler, (err) {
  throw err || "Stream ended"; // Stream should never end.
});
```

### Autocommit scenario ignoring backpressure

The simplest and fastest of consuming messages. However, backpressure is not dealt with so if
consumption is slow many messages left hanging in-flight and likely not
redelivered in case of crashes/restarts.

```js
const kafka = require("exp-kafka-listener");

const kafkaOptions = {
  host: "mykafkahost-1:9200,mykafkahost-2:9200",
  autoCommit: true
}

const listener = kafka.listen("my-group-id", ["my-topic"]);
listener.readStream.on("data", (msg) => {
  // .. go to town
});

```

## Further reading

Node js streams:
node-rdkafka




