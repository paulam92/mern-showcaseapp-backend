import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import UserModel from "./models/User.js";
import bcrypt from "bcrypt";

dotenv.config();
mongoose.connect(process.env.MONGOURI);

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

app.set("trust proxy", 1);
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      maxAge: 60 * 60 * 24,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
);

const userIsInGroup = (user, accessGroup) => {
  const accessGroupArray = user.accessGroups.split(",").map((m) => m.trim());
  return accessGroupArray.includes(accessGroup);
};

app.post("/login", async (req, res) => {
  const username = req.body.username;
  // const password = req.body.password;
  let user = await UserModel.findOne({ username });
  if (!user) {
    user = await UserModel.findOne({ username: "anonymousUser" });
  }
  req.session.user = user;
  req.session.save();
  res.json({user});
});

app.post("/signup", async (req, res) => {
  const frontUser = req.body.user;
  if (
    frontUser.username.trim() === "" ||
    frontUser.password1.trim() === "" ||
    frontUser.password1 !== frontUser.password2
  ) {
    res.sendStatus(403);
  } else {
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(frontUser.password1, salt);
    const dbuser = await UserModel.create({
      username: frontUser.username,
      firstName: frontUser.firstName,
      lastName: frontUser.lastName,
      email: frontUser.email,
      hash,
      accessGroups: "loggedInUsers,notYetApprovedUsers",
    });
    req.session.user = dbuser;
    req.session.save();
    res.json(dbuser);
  }
});

app.get("/currentuser", async (req, res) => {
  console.log("hello");
  let user = req.session.user;
  if (!user) {
    user = await UserModel.findOne({ username: "anonymousUser" });
  }
  res.json({
    user,
  });
});

app.post("/approveuser", async (req, res) => {
  const id = req.body.id;
  let user = req.session.user;
  if (!user) {
    res.sendStatus(403);
  } else {
    if (!userIsInGroup(user, "admins")) {
      res.sendStatus(403);
    } else {
      const updateResult = await UserModel.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(id) },
        { $set: { accessGroups: "loggedInUsers,members" } },
        { new: true }
      );
      res.json({
        result: updateResult,
      });
    }
  }
});

app.get("/notyetapprovedusers", async (req, res) => {
  const users = await UserModel.find({
    accessGroups: { $regex: "notYetApprovedUsers", $options: "i" },
  });
  res.json({
    users,
  });
});

app.get("/logout", async (req, res) => {
  req.session.destroy();
  const user = await UserModel.findOne({ username: "anonymousUser" });
  res.json({
    user,
  });
});

app.listen(PORT, (req, res) => {
  console.log(`API listening on port http://localhost:${PORT}`);
});
