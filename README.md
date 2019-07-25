# xpr-kafka-listener

Simple stream-based kafka listener based on node-rdkafka.
Focus on minimizing data loss over high throughput.

## API

## Configration options

## Examples

### No message loss and backpressure: Manual commits and streams

Use this if you want to be sure that all messages are processed before being committed.
Any in-flight messages will be re-sent in case of a process crash/restart. Back-pressure
is handled by node js streams so the fetch rate is adjusted to the consumtion rate.

```
const kafka = require("exp-kafka-listener");
const through = require("through2");
const {pipeline} = require("stream");

const kafkaOptions = {
  host: "mykafkahost-1:9200,mykafkahost-2:9200",
  autoCommit: false
}

const listener = kafka.listen("my-group-id", "my-topic");

const msgHandler = through.obj((msg, _encoding, done) => {
  const payload = msg.value;
  someAsyncOperation(payload, (err)) => {
    done(err);
    this.push(msg);
  });
});

const commitHandler = through.obj((msg, _encoding, done) => {
  listener.commit(msg);
  done();
});

pipeline(listener.readStream, msgHandler, commitHandler, (err) {
  throw err || "Stream ended"; // Stream should never end.
});

```

### Potentially some message loss and backpressure: Autocommit and streams

Use this if you don't care about losing in-flight messages during restarts.
Messages will be automaticallt committed every five seconds.
Back-pressure is handled by node js streams so the fetch rate is adjusted to the consumtion rate.
Therefore the number of in-flight messages are usually low.


```
const kafka = require("exp-kafka-listener");
const through = require("through2");
const {pipeline} = require("stream");

const kafkaOptions = {
  host: "mykafkahost-1:9200,mykafkahost-2:9200",
  autoCommit: true
}

const listener = kafka.listen("my-group-id", "my-topic");

const msgHandler = through.obj((msg, _encoding, done) => {
  const payload = msg.value;
  someAsyncOperation(payload, (err)) => {
    done(err);
    this.push(msg);
  });
});

pipeline(listener.readStream, msgHandler, (err) {
  throw err || "Stream ended"; // Stream should never end.
});
```

### Autocommit scenario ignoring beckpressure

The simplest and fastest of consuming messages. Backpressure is not dealt with so if
consumtion is slow lots of messages are be left hanging in-flight and likely not
redelivered in case of crashes/restarts.

```
const kafka = require("exp-kafka-listener");

const kafkaOptions = {
  host: "mykafkahost-1:9200,mykafkahost-2:9200",
  autoCommit: true
}

const listener = kafka.listen("my-group-id", "my-topic");
listener.readStream.on("data", (msg) => {
  // .. go to town
});

```

## Further reading

Streams
node-rdkafka




