const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const portRoutes = require("./routes/portRoutes");
const authRoutes = require("./routes/authRoutes");
const authMiddleware = require("./middleware/auth");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api", authMiddleware, portRoutes);

app.get("/", (req, res) => {
  res.send("API working");
});

mongoose.connect("mongodb://127.0.0.1:27017/webportDB")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

app.listen(5000, () => {
  console.log("Server running on port 5000");
});