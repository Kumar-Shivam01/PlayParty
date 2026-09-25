const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');

router.get('/video-info/:videoId', videoController.getVideoInfo);

module.exports = router;
