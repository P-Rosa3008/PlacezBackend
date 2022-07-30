const HttpError = require("../models/http-error");
const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");
const Place = require("../models/place");
const User = require("../models/user");
const mongoose = require("mongoose");

const getPlaces = async (req, res, next) => {
  let places;
  try {
    places = await Place.find();
  } catch (err) {
    const error = new HttpError("Fetching places failed, try again", 500);
    return next(error);
  }
  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  });
};

const getPlacesToExcel = async (req, res, next) => {
  let places;
  try {
    places = await Place.find();
  } catch (err) {
    const error = new HttpError("Fetching places failed, try again", 500);
    return next(error);
  }
  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  });
};

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.placeId;
  let place;

  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong could not find a place",
      500
    );
    return next(error);
  }

  if (!place) {
    return next(
      new HttpError("Could not find a place for the provided Id (next)", 404)
    );
  }

  res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserID = async (req, res, next) => {
  const userId = req.params.userId;
  let places;

  try {
    places = await Place.find({ creator: userId });
  } catch (err) {
    const error = new HttpError(
      "Could not find any place with this UserId",
      500
    );
    return next(error);
  }

  if (!places || places.length === 0) {
    return next(
      new HttpError(
        "Could not find a place for the provided UserId (next)",
        404
      )
    );
  }

  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(new HttpError("Invalid Inputs", 422));
  }

  const {
    title,
    type,
    description,
    advancedOptions,
    // rating,
    coordinates,
    region,
    country,
    creator,
  } = req.body;

  const date = new Date();
  const dateFormatted =
    ("00" + date.getDate()).slice(-2) +
    "/" +
    ("00" + (date.getMonth() + 1)).slice(-2) +
    "/" +
    date.getFullYear() +
    " " +
    ("00" + date.getHours()).slice(-2) +
    ":" +
    ("00" + date.getMinutes()).slice(-2) +
    ":" +
    ("00" + date.getSeconds()).slice(-2);

  const createdPlace = new Place({
    title: title,
    type: type,
    description: description,
    advancedOptions: JSON.parse(advancedOptions),
    // rating: rating,
    // description,
    location: JSON.parse(coordinates),
    region: region,
    country: country,
    // address,
    creator: req.userData.userId,
    image: req.files.length > 0 ? req.files[0].path : null,
    date: dateFormatted,
  });

  let userById;

  try {
    userById = await User.findById(req.userData.userId);
  } catch (err) {
    const error = new HttpError("Could not find userById", 500);
    return next(error);
  }

  if (!userById) {
    const error = new HttpError("Could not find userById", 404);
    return next(error);
  }

  console.log(userById);

  // console.log(createdPlace.creator);

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    // await createdPlace.save({ session: sess });
    // await userById.places.push(createdPlace);
    // await userById.save({ session: sess });
    // console.log("here");
    // await sess.commitTransaction();

    await createdPlace.save();
    userById.places.push(createdPlace);
    userById.updateOne({ $push: { places: createdPlace } }, function (err) {
      console.log(err);
    });
    await sess.commitTransaction();
  } catch (err) {
    console.log(err);
    const error = new HttpError("Creating place failed", 500);
    return next(error);
  }

  console.log(createdPlace);
  res.status(201).json({ place: createdPlace });
};

const addImage = async (req, res, next) => {
  const placeId = req.params.placeId;

  let place;
  try {
    place = await Place.findById(placeId);
    console.log(place);
  } catch (err) {
    console.log(err);
    const error = new HttpError("Something went wrong, could not update", 500);
    return next(error);
  }

  const placeImages = [...place.image];
  placeImages.push(req.files[0].path);

  place.image = placeImages;

  try {
    await place.save();
  } catch (err) {
    const error = new HttpError(
      "Could not add place image something went wrong",
      500
    );
    return next(error);
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Invalid Inputs", 422));
  }

  const { title, type } = req.body;
  console.log(req.body);
  const placeId = req.params.placeId;

  let place;
  try {
    place = await Place.findById(placeId);
    console.log(place);
  } catch (err) {
    const error = new HttpError("Something went wrong, could not update", 500);
    return next(error);
  }

  if (place.creator.toString() !== req.userData.userId) {
    const error = new HttpError("You can't edit this place", 401);
    return next(error);
  }

  place.title = title;
  place.type = type;

  try {
    await place.save();
  } catch (err) {
    const error = new HttpError(
      "Could not update place something went wrong",
      500
    );
    return next(error);
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId).populate("creator");
  } catch (err) {
    const error = new HttpError("Could not find a place with this Id", 500);
    return next(error);
  }

  if (!place) {
    const error = new HttpError("Could not find a place for this Id", 404);
    return next(error);
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    await place.remove({ session: session });
    place.creator.places.pull(place);
    await place.creator.save({ session: session });
    await session.commitTransaction();
  } catch (err) {
    const error = new HttpError("Could not delete the place", 500);
    return next(error);
  }

  res.status(200).json({ message: "Deleted place" });
};

exports.getPlaces = getPlaces;
exports.getPlacesToExcel = getPlacesToExcel;
exports.getPlaceById = getPlaceById;
exports.getPlacesByUserID = getPlacesByUserID;
exports.createPlace = createPlace;
exports.addImage = addImage;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
