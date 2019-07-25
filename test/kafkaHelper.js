const kafka = require("node-rdkafka");

const client = kafka.AdminClient.create({
  "metadata.broker.list": "localhost:9092"
});

let producer;

function init(done) {
  producer = new kafka.Producer({
    "metadata.broker.list": "localhost:9092"
  });
  producer.connect();
  producer.on("event.error", (err) => { throw err });
  producer.once("ready", () => done());

}

function createTopic(cb) {
  const topic = `xpr-kafka-listener-test-${randomString(6)}`;
  client.createTopic({
    topic,
    num_partitions: 1,
    replication_factor: 1
  }, function(err, data) {
    console.log(err, data);
    cb(err, topic);
  });
}

function deleteTopic(topic, done) {
  client.deleteTopic(topic, 5000, done)
}

function randomString(len) {
  return [...Array(len)].map( _ =>(Math.random()*36|0).toString(36)).join("")
}

function send(topic, msg) {
  producer.produce(topic, null, Buffer.from(msg));
}

module.exports = {
  createTopic,
  randomString,
  deleteTopic,
  send,
  init
}