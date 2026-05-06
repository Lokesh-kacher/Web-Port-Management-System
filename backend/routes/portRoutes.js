const express = require("express");
const mongoose = require("mongoose");
const net = require("net");
const Port = require("../models/Port");
const PortHistory = require("../models/PortHistory");

const router = express.Router();

const parsePort = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return null;
  }
  return parsed;
};

const resolvePortName = (entry) => {
  if (entry?.name && String(entry.name).trim()) {
    return String(entry.name).trim();
  }

  if (entry?.hostname && String(entry.hostname).trim()) {
    return String(entry.hostname).trim();
  }

  if (entry?.url && String(entry.url).trim()) {
    return String(entry.url).trim();
  }

  return `Port ${entry?.port ?? ""}`.trim();
};

const checkPortActivity = (portNumber, host = "127.0.0.1") =>
  new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    const finish = (status) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve(status);
    };

    socket.setTimeout(1200);
    socket.once("connect", () => finish("active"));
    socket.once("timeout", () => finish("inactive"));
    socket.once("error", () => finish("inactive"));
    socket.connect(portNumber, host);
  });

router.get("/all", async (req, res) => {
  try {
    const ports = await Port.find().sort({ createdAt: -1 });
    res.json(ports);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch ports" });
  }
});

router.post("/add", async (req, res) => {
  try {
    const { name, port } = req.body;
    const parsedPort = parsePort(port);

    if (!name || !parsedPort) {
      return res.status(400).json({ error: "Name and valid port are required" });
    }

    const exists = await Port.findOne({ port: parsedPort });
    if (exists) {
      return res.status(409).json({ error: "Port number already exists" });
    }

    const newPort = await Port.create({ name: name.trim(), port: parsedPort });

    await PortHistory.create({
      action: "add",
      portId: newPort._id,
      name: newPort.name,
      port: newPort.port,
    });

    res.status(201).json(newPort);
  } catch (error) {
    res.status(500).json({ error: "Failed to add port" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid port id" });
    }

    const { name, port } = req.body;
    const parsedPort = parsePort(port);

    if (!name || !parsedPort) {
      return res.status(400).json({ error: "Name and valid port are required" });
    }

    const duplicate = await Port.findOne({ _id: { $ne: req.params.id }, port: parsedPort });
    if (duplicate) {
      return res.status(409).json({ error: "Port number already exists" });
    }

    const updated = await Port.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), port: parsedPort },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Port not found" });
    }

    await PortHistory.create({
      action: "edit",
      portId: updated._id,
      name: updated.name,
      port: updated.port,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update port" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid port id" });
    }

    const deleted = await Port.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Port not found" });
    }

    await PortHistory.create({
      action: "delete",
      portId: deleted._id,
      name: resolvePortName(deleted),
      port: deleted.port,
    });

    res.json({ message: "Port deleted successfully" });
  } catch (error) {
    console.error("Delete port failed:", error.message);
    res.status(500).json({ error: "Failed to delete port" });
  }
});

router.get("/:id/status", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid port id" });
    }

    const portDoc = await Port.findById(req.params.id);
    if (!portDoc) {
      return res.status(404).json({ error: "Port not found" });
    }

    const status = await checkPortActivity(portDoc.port);
    portDoc.isActive = status;
    portDoc.lastCheckedAt = new Date();
    await portDoc.save();

    res.json(portDoc);
  } catch (error) {
    res.status(500).json({ error: "Failed to check port status" });
  }
});

router.get("/history", async (req, res) => {
  try {
    const history = await PortHistory.find().sort({ createdAt: -1 }).limit(100);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

router.get("/history/stats", async (req, res) => {
  try {
    const stats = await PortHistory.aggregate([
      {
        $group: {
          _id: "$port",
          count: { $sum: 1 },
          names: { $addToSet: "$name" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          port: "$_id",
          count: 1,
          names: 1,
        },
      },
    ]);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch port analytics" });
  }
});

module.exports = router;
