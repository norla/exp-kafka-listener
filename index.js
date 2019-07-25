/* eslint-disable dot-notation */
"use strict";

const kafka = require("node-rdkafka");
const debuglog = require("util").debuglog("xpr-kafka-listener");
const {EventEmitter} = require("events");

function calculateLag(stats, topicName) {
  const topic = stats.topics[topicName] || {};
  const partitions = topic.partitions || {};
  return Object.values(partitions)
    .map((p) => Math.max(p.hi_offset - p.committed_offset, 0))
    .reduce((a, b) => a + b, 0);
}

function listen(kafkaConfig, groupId, topics) {
  const api = new EventEmitter();

  const consumerConf = {
    "metadata.broker.list": kafkaConfig.host,
    "client.id": "gam-mrss-feed",
    "enable.auto.commit": !!kafkaConfig.autocommit,
    "statistics.interval.ms": 30000,
    "rebalance_cb": true,
    "group.id": groupId
  };

  if (process.env.NODE_DEBUG && process.env.NODE_DEBUG.includes("xpr-kafka-listener")) {
    consumerConf.debug = "consumer,cgrp,topic"
  }

  if (kafkaConfig.username) {
    consumerConf["security.protocol"] = "sasl_plaintext";
    consumerConf["sasl.mechanism"] = "PLAIN";
    consumerConf["sasl.username"] = kafkaConfig.username;
    consumerConf["sasl.password"] = kafkaConfig.password;
  }

  const topicConfig = { "auto.offset.reset": kafkaConfig.fromOffset || "earliest" };
  debuglog("Starting Kafka listener using conf: ", kafkaConfig);

  const kafkaReader = kafka.KafkaConsumer.createReadStream(consumerConf, topicConfig, {
    topics: topics,
    fetchSize: kafkaConfig.fetchSize || 500
  });

  kafkaReader.consumer.on("ready", () => api.emit("ready"));
  kafkaReader.consumer.on("event.error", (e) => api.emit("error", e));
  kafkaReader.consumer.on("event.log", (e) => debuglog("rdkafka log", e));
  kafkaReader.consumer.on("event", (e) => debuglog("rdkafka event", e));
  kafkaReader.consumer.on("rebalance", (e, toppars) => debuglog("kafka rebalance", e, toppars));

  const stats = {};
  function statsHandler({ message }) {
    try {
      const statsData = JSON.parse(message);
      const lag = calculateLag(statsData, topics);
      Object.assign(stats, {
        time: Date.now(),
        error: null,
        lag,
        messageRatePerSecond: stats.time && (1000 * (stats.lag - lag) / (Date.now() - stats.time))
      });
    } catch (lagError) {
      debuglog("Error calculating lag:", lagError);
      stats.error = lagError.message || lagError;
    }
  }
  kafkaReader.consumer.on("event.stats", statsHandler);

  return Object.assign(api, {
    readStream: kafkaReader,
    commit: (msg) => kafkaReader.consumer.commitMessage(msg),
    stats
  });
}

module.exports = {
  listen
};
