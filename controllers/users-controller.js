const { v4: uuidv4 } = require("uuid");
const HttpError = require("../models/http-error");
const { validationResult } = require("express-validator");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const getUserLogged = async (req, res, next) => {
  const username = req.params.username;
  let user;
  try {
    user = await User.findOne({ username: username });
  } catch (err) {
    const error = new HttpError("Something went wrong", 500);
    return next(error);
  }

  res.json({ user: user });
};

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    const error = new HttpError("Fetching users failed, try again", 500);
    return next(error);
  }
  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Invalid Inputs", 422));
  }

  const { firstName, lastName, username, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne(
      { username: username } || { email: email }
    );
  } catch (err) {
    const error = new HttpError("Sign up failed", 422);
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError("User exists already, try logging in instead!");
    return next(error);
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError("Could not create useer please try again", 500);
    return next(error);
  }

  const createdUser = new User({
    firstName,
    lastName,
    username,
    email,
    password: hashedPassword,
    places: [],
    avatar: "",
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError("Sign up failed, please try again", 500);
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      "supersecret_dont_share",
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError("Sign up failed, please try again", 500);
    return next(error);
  }

  res.status(201).json({
    userId: createdUser.id,
    email: createdUser.email,
    username: createdUser.username,
    firstName: createdUser.firstName,
    lastName: createdUser.lastName,
    token: token,
  });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError("Login failed", 422);
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError(
      "Invalid credentials, could not log you in",
      401
    );
    return next(error);
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError(
      "Could not log you in, please check your credentials and try again",
      500
    );
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError(
      "Invalid credentials, could not log you inn",
      500
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      {
        userId: existingUser.id,
        email: existingUser.mail,
      },
      "supersecret_dont_share",
      { expiresIn: "6h" }
    );
  } catch (err) {
    const error = new HttpError("Loggin failed, please try again", 500);
    return next(error);
  }

  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    username: existingUser.username,
    firstName: existingUser.firstName,
    lastName: existingUser.lastName,
    avatar: existingUser.avatar,
    token: token,
  });
};

const addProfileImage = async (req, res, next) => {
  const username = req.params.username;

  let user;
  try {
    user = await User.findOne({ username: username });
    console.log(user);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find user",
      500
    );
    return next(error);
  }

  console.log("USERONE" + user);

  const userProfileImage = req.files[0].path;
  // userProfileImage.push(req.files[0].path);

  user.avatar = userProfileImage;

  console.log("USERTWO" + user);

  try {
    await user.save();
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Could not add avatar image something went wrong",
      500
    );
    return next(error);
  }

  res.status(200).json({ user: user.toObject({ getters: true }) });
};

exports.getUserLogged = getUserLogged;
exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
exports.addProfileImage = addProfileImage;
