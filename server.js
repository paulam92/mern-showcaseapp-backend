import express from "express";
import mongoose from "mongoose";
import session from "express-session";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";
import UserModel from "./models/User.js";

dotenv.config();

mongoose.connect(process.env.MONGOURI);

const app = express();
const PORT = 3003;

app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());
app.use(
  session({
    resave: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET || "use-env-secret728272",
  })
);

app.post("/login", (req, res) => {
  const username = req.body.username;
  // const password = req.body.password;
  let user = users.find((user) => user.username === username);
  if (!user) {
    user = users.find((user) => user.username === "anonymousUser");
  }
  req.session.user = user;
  req.session.save();
  res.json(user);
});

app.get("/currentuser", async (req, res) => {
  let user = req.session.user;
  if (!user) {
    user = await UserModel.findOne({ username: "anonymousUser" });
  }
  res.json(user);
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  const user = users.find((user) => user.username === "anonymousUser");
  res.json(user);
});

app.get("/testing", (req, res) => {
  const pw = "pau123"; // PLain text password

  const hashedPw = bcrypt.hashSync(pw);

  res.send(hashedPw);
});
app.get("/user", async (req, res) => {
  const users = await User.find();
  res.send(users);
});

app.post("/user", async (req, res) => {
  const user = await User.create(req.body);

  res.send(user);
});

app.listen(PORT, (req, res) => {
  console.log(`API listening on port http://localhost:${PORT}`);
});
