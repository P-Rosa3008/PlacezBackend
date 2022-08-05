const express = require("express");

const { check } = require("express-validator");

const placesControllers = require("../controllers/places-controller");
const fileUpload = require("../middleware/file-upload");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.get("/", placesControllers.getPlaces);

router.get("/jsonToExcel", placesControllers.getPlacesToExcel);

router.get("/:placeId", placesControllers.getPlaceById);

router.get("/:userId/places", placesControllers.getPlacesByUserID);

router.use(checkAuth);

router.post("/", fileUpload.any("image"), [], placesControllers.createPlace);

router.patch(
  "/images/:placeId",
  fileUpload.any("image"),
  placesControllers.addImage
);

router.patch(
  "/:placeId",
  [check("title").not().isEmpty(), check("type")],
  placesControllers.updatePlace
);

router.delete("/:pid", placesControllers.deletePlace);

module.exports = router;
